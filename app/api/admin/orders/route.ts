import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { AdminOrderStats, OrderStatus } from "@/lib/admin/orders";
import { verifyAdminRole } from "@/lib/supabase/admin-auth";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;
const STATS_PAGE_SIZE = 1000;
const ADMIN_ORDER_COLUMNS =
  "id, user_id, order_type, items, total_price, customer_info, status, created_at, order_number, user_role, product_name, base_price, jit_buffer, order_summary, serial_number";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type AdminClientResult =
  | { supabase: SupabaseClient; response?: never }
  | { supabase?: never; response: NextResponse };

function isOrderStatus(value: unknown): value is OrderStatus {
  return value === "pending_qc"
    || value === "qc_in_progress"
    || value === "completed"
    || value === "cancelled";
}

async function getOrderStats(supabase: SupabaseClient): Promise<AdminOrderStats> {
  const { data: rpcRows, error: rpcError } = await supabase.rpc("get_admin_order_stats");
  if (!rpcError && Array.isArray(rpcRows) && rpcRows.length > 0) {
    const first = rpcRows[0] as {
      total_orders?: number | string | null;
      total_revenue?: number | string | null;
      pending_qc_count?: number | string | null;
    };
    return {
      totalOrders: Number(first.total_orders) || 0,
      totalRevenue: Number(first.total_revenue) || 0,
      pendingQcCount: Number(first.pending_qc_count) || 0,
    };
  }

  let total = 0;
  let revenueCents = 0;
  let pendingQcCount = 0;

  for (let start = 0; ; start += STATS_PAGE_SIZE) {
    const { data, error, count } = await supabase
      .from("orders")
      .select("total_price, status", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(start, start + STATS_PAGE_SIZE - 1);

    if (error) throw error;

    const rows = data || [];
    if (start === 0) total = count || 0;
    for (const order of rows) {
      const normalizedStatus = String(order.status || "").trim().toLowerCase();
      if (!["cancelled", "canceled", "dibatalkan", "batal"].includes(normalizedStatus)) {
        revenueCents += Math.round((Number(order.total_price) || 0) * 100);
      }
      if (order.status === "pending_qc") pendingQcCount += 1;
    }

    if (rows.length < STATS_PAGE_SIZE || start + rows.length >= total) break;
  }

  return { totalOrders: total, totalRevenue: revenueCents / 100, pendingQcCount };
}

async function getAdminClient(): Promise<AdminClientResult> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      return { response: NextResponse.json({ error: "Supabase is not configured." }, { status: 503 }) };
    }

    const cookieStore = cookies();
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        }),
      },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { response: NextResponse.json({ error: "Sign in with an admin account." }, { status: 401 }) };
    }

    const { isAdmin, error: roleError } = await verifyAdminRole(supabase, user);
    if (roleError) {
      console.error("[ViciTech OS] Could not verify admin profile role:", roleError);
      return { response: NextResponse.json({ error: "Could not verify admin access." }, { status: 500 }) };
    }
    if (!isAdmin) {
      return { response: NextResponse.json({ error: "Access denied: Admin privileges required." }, { status: 403 }) };
    }

    return { supabase };
  } catch (error: unknown) {
    console.error("[ViciTech OS] Admin orders authorization failed:", error);
    return { response: NextResponse.json({ error: "Could not verify admin access." }, { status: 500 }) };
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { supabase, response } = await getAdminClient();
  if (response) return response;

  try {
    const requestedPage = Number(request.nextUrl.searchParams.get("page") || 0);
    const maxPage = Math.floor(Number.MAX_SAFE_INTEGER / PAGE_SIZE);
    const page = Number.isSafeInteger(requestedPage) && requestedPage >= 0
      ? Math.min(requestedPage, maxPage)
      : 0;
    const start = page * PAGE_SIZE;
    const [{ data, error, count }, stats] = await Promise.all([
      supabase
        .from("orders")
        .select(ADMIN_ORDER_COLUMNS, { count: "exact" })
        .order("created_at", { ascending: false })
        .range(start, start + PAGE_SIZE - 1),
      getOrderStats(supabase),
    ]);

    if (error) {
      console.error("[ViciTech OS] Admin orders query failed:", error);
      return NextResponse.json({ error: "Could not load orders." }, { status: 500 });
    }

    return NextResponse.json({
      orders: data || [],
      total: count || 0,
      stats,
      page,
      pageSize: PAGE_SIZE,
    });
  } catch (error: unknown) {
    console.error("[ViciTech OS] Admin orders query failed:", error);
    return NextResponse.json({ error: "Could not load orders." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const { supabase, response } = await getAdminClient();
  if (response) return response;

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return NextResponse.json({ error: "Request body must be a JSON object." }, { status: 400 });
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const orderId = typeof body.orderId === "string" ? body.orderId : "";
  const status = body.status;
  if (!UUID_PATTERN.test(orderId)) {
    return NextResponse.json({ error: "A valid order ID is required." }, { status: 400 });
  }
  if (!isOrderStatus(status)) {
    return NextResponse.json({ error: "Select a valid order status." }, { status: 400 });
  }

  try {
    const { data, error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", orderId)
      .select("id, status")
      .maybeSingle();

    if (error) {
      console.error("[ViciTech OS] Admin order status update failed:", error);
      return NextResponse.json({ error: "Could not update order status." }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "Order not found or could not be updated." }, { status: 404 });
    }

    const stats = await getOrderStats(supabase);
    return NextResponse.json({ order: data, stats });
  } catch (error: unknown) {
    console.error("[ViciTech OS] Admin order status update failed:", error);
    return NextResponse.json({ error: "Could not update order status." }, { status: 500 });
  }
}
