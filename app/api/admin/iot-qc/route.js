import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { randomInt } from "node:crypto";
import { verifyAdminRole } from "@/lib/supabase/admin-auth";

export const dynamic = "force-dynamic";

const SERIAL_PATTERN = /^VICI-[A-Z]{3}-\d{4}-\d{4}$/;

async function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return { response: NextResponse.json({ error: "Supabase is not configured." }, { status: 503 }) };
  }

  const cookieStore = cookies();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return { response: NextResponse.json({ error: "Sign in with an admin account." }, { status: 401 }) };
  }
  const { isAdmin, error: roleError } = await verifyAdminRole(supabase, data.user);
  if (roleError) {
    console.error("[ViciTech OS] Could not verify admin profile role:", roleError);
    return { response: NextResponse.json({ error: "Could not verify admin access." }, { status: 500 }) };
  }
  if (!isAdmin) {
    return { response: NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 403 }) };
  }

  return { supabase };
}

export async function GET() {
  try {
    const { supabase, response } = await getAdminClient();
    if (response) return response;

    const { data, error } = await supabase
      .from("qc_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(25);
    if (error) {
      return NextResponse.json({ error: `Could not load QC units: ${error.message}` }, { status: 500 });
    }

    const serials = (data || []).map((unit) => unit.serial_number).filter(Boolean);
    const [telemetryResult, ordersResult] = await Promise.all([
      serials.length
        ? supabase.from("telemetry_logs").select("*").in("serial_number", serials).order("created_at", { ascending: false }).limit(200)
        : Promise.resolve({ data: [], error: null }),
      supabase.from("orders").select("id, order_number, serial_number, product_name, total_price, status, created_at").order("created_at", { ascending: false }).limit(100),
    ]);
    if (telemetryResult.error) {
      return NextResponse.json({ error: `Could not load telemetry: ${telemetryResult.error.message}` }, { status: 500 });
    }
    if (ordersResult.error) {
      return NextResponse.json({ error: `Could not load orders: ${ordersResult.error.message}` }, { status: 500 });
    }
    const latestBySerial = new Map();
    for (const entry of telemetryResult.data || []) {
      if (!latestBySerial.has(entry.serial_number)) latestBySerial.set(entry.serial_number, entry);
    }
    const units = (data || []).map((unit) => ({ ...unit, telemetry: latestBySerial.get(unit.serial_number) || null }));
    return NextResponse.json({ units, orders: ordersResult.data || [], telemetry: telemetryResult.data || [] });
  } catch (error) {
    console.error("[ViciTech OS] Admin QC list failed:", error);
    return NextResponse.json({ error: "Could not load QC units." }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { supabase, response } = await getAdminClient();
    if (response) return response;

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
    }

    const action = body?.action;
    if (action === "register_unit") {
      const orderId = String(body?.order_id || "").trim();
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(orderId)) {
        return NextResponse.json({ error: "Select a valid order to register." }, { status: 400 });
      }
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("id, order_number, serial_number, product_name")
        .eq("id", orderId)
        .maybeSingle();
      if (orderError || !order) {
        return NextResponse.json({ error: "Could not load the selected order." }, { status: 404 });
      }
      const { data: existingUnit, error: existingError } = await supabase
        .from("qc_logs")
        .select("*")
        .eq("order_id", order.order_number)
        .maybeSingle();
      if (existingError) {
        return NextResponse.json({ error: `Could not check the QC registry: ${existingError.message}` }, { status: 500 });
      }

      let unit = existingUnit;
      if (!unit) {
        for (let attempt = 0; attempt < 5; attempt += 1) {
          const serial = `VICI-SRV-${new Date().getFullYear()}-${String(randomInt(0, 10000)).padStart(4, "0")}`;
          const { data, error } = await supabase
            .from("qc_logs")
            .insert({
              serial_number: serial,
              order_id: order.order_number,
              device_name: order.product_name,
              status: "In Progress",
              stress_test_status: "Pending",
              shipping_status: "In Production",
            })
            .select("*")
            .single();
          if (!error) {
            unit = data;
            break;
          }
          if (error.code !== "23505" || attempt === 4) {
            return NextResponse.json({ error: `Could not register the QC unit: ${error.message}` }, { status: 500 });
          }
        }
      }

      const { error: orderUpdateError } = await supabase
        .from("orders")
        .update({ serial_number: unit.serial_number, status: "In Production" })
        .eq("id", order.id);
      if (orderUpdateError) {
        return NextResponse.json({ error: `QC unit was registered but the order could not be linked: ${orderUpdateError.message}` }, { status: 500 });
      }
      return NextResponse.json({ unit: { ...unit, telemetry: null }, order_id: order.id, action });
    }

    const serial = String(body?.serial_number || "").trim().toUpperCase();
    if (!SERIAL_PATTERN.test(serial)) return NextResponse.json({ error: "Select a valid unit serial number." }, { status: 400 });
    if (!["start_test", "simulate_payload", "pass_qc", "mark_shipped"].includes(action)) {
      return NextResponse.json({ error: "Unsupported QC operation." }, { status: 400 });
    }

    const { data: current, error: lookupError } = await supabase
      .from("qc_logs")
      .select("*")
      .eq("serial_number", serial)
      .maybeSingle();
    if (lookupError) {
      return NextResponse.json({ error: `Could not load QC unit: ${lookupError.message}` }, { status: 500 });
    }
    if (action === "mark_shipped" && (!current || current.status !== "Pass" || !current.certificate_id)) {
      return NextResponse.json(
        { error: "Pass QC and generate a certificate before marking this unit as shipped." },
        { status: 409 },
      );
    }

    const now = new Date().toISOString();
    const base = current || {
      serial_number: serial,
      device_name: "ViciTech assembled unit",
      status: "In Progress",
      burnin_hours: 0,
      score: null,
      stress_test_status: "Pending",
      shipping_status: "In Production",
    };
    if (action === "start_test" && base.shipping_status === "Shipped") {
      return NextResponse.json({ error: "A shipped unit cannot start another stress test." }, { status: 409 });
    }
    if (action === "simulate_payload" && base.stress_test_status !== "Running") {
      return NextResponse.json({ error: "Start the stress test before simulating a telemetry payload." }, { status: 409 });
    }
    if (action === "pass_qc" && Number(base.burnin_hours || 0) < 4) {
      return NextResponse.json({ error: "Complete four burn-in hours before passing QC." }, { status: 409 });
    }
    let update;

    if (action === "start_test") {
      update = {
        ...base,
        status: "In Progress",
        stress_test_status: "Running",
        shipping_status: "In QC",
        burnin_hours: 0,
        score: null,
        certificate_id: null,
        shipped_at: null,
        updated_at: now,
      };
    } else if (action === "simulate_payload") {
      update = {
        ...base,
        cpu_temp_c: Number((55 + Math.random() * 18).toFixed(1)),
        gpu_temp_c: Number((62 + Math.random() * 20).toFixed(1)),
        stability_score: Number((95 + Math.random() * 4.9).toFixed(1)),
        stress_test_status: base.stress_test_status === "Pending" ? "Running" : base.stress_test_status,
        burnin_hours: Math.min(4, Number(base.burnin_hours || 0) + 1),
        updated_at: now,
      };
    } else if (action === "pass_qc") {
      const score = Math.round(Number(base.stability_score ?? 98));
      update = {
        ...base,
        status: "Pass",
        stress_test_status: "Complete",
        shipping_status: "Ready to ship",
        burnin_hours: 4,
        score,
        stability_score: score,
        certificate_id: base.certificate_id || `VT-CERT-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
        updated_at: now,
      };
    } else {
      update = {
        ...base,
        shipping_status: "Shipped",
        shipped_at: now,
        updated_at: now,
      };
    }

    const { data: unit, error } = await supabase
      .from("qc_logs")
      .upsert(update, { onConflict: "serial_number" })
      .select("*")
      .single();
    if (error) {
      return NextResponse.json({ error: `QC operation failed: ${error.message}` }, { status: 500 });
    }

    if (action === "simulate_payload") {
      const telemetry = {
        serial_number: serial,
        order_id: unit.order_id,
        cpu_temp_c: unit.cpu_temp_c,
        gpu_temp_c: unit.gpu_temp_c,
        fan_rpm: randomInt(900, 2201),
        voltage_stability: Number((97 + Math.random() * 2.9).toFixed(1)),
        stability_score: unit.stability_score,
        stress_test_status: unit.stress_test_status,
        burnin_hours: unit.burnin_hours,
        source: "admin_simulation",
      };
      const { data: telemetryEntry, error: telemetryError } = await supabase
        .from("telemetry_logs")
        .insert(telemetry)
        .select("*")
        .single();
      if (telemetryError) {
        return NextResponse.json({ error: `QC state updated but telemetry could not be recorded: ${telemetryError.message}` }, { status: 500 });
      }
      if (unit.order_id) {
        const { error: orderUpdateError } = await supabase
          .from("orders")
          .update({ status: "IoT Stress-Testing" })
          .eq("order_number", unit.order_id);
        if (orderUpdateError) {
          return NextResponse.json({ error: `Telemetry was recorded but order status could not be synchronized: ${orderUpdateError.message}` }, { status: 500 });
        }
      }
      return NextResponse.json({ unit: { ...unit, telemetry: telemetryEntry }, telemetry: telemetryEntry, action });
    }

    if (unit.order_id) {
      const orderStatus = action === "pass_qc"
        ? "Ready to ship"
        : action === "mark_shipped"
          ? "Shipped"
          : "IoT Stress-Testing";
      const { error: orderUpdateError } = await supabase
        .from("orders")
        .update({ status: orderStatus })
        .eq("order_number", unit.order_id);
      if (orderUpdateError) {
        return NextResponse.json({ error: `QC state updated but order status could not be synchronized: ${orderUpdateError.message}` }, { status: 500 });
      }
    }

    return NextResponse.json({ unit: { ...unit, telemetry: null }, action });
  } catch (error) {
    console.error("[ViciTech OS] Admin QC operation failed:", error);
    return NextResponse.json({ error: "QC operation failed unexpectedly." }, { status: 500 });
  }
}
