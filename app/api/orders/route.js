import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { randomInt } from "node:crypto";
import { calculateOrderPricing } from "@/lib/preset-order-catalog";

export const dynamic = "force-dynamic";

function jsonError(message, status) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return jsonError("Order service is not configured.", 503);

  const cookieStore = cookies();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
    },
  });

  try {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) return jsonError("Sign in before placing an order.", 401);

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonError("Request body must be valid JSON.", 400);
    }

    const role = String(body?.role || "").toLowerCase();
    const quantity = Number(body?.quantity);
    const productName = typeof body?.product_name === "string" ? body.product_name.trim() : "";
    if (!["b2c", "b2b", "b2s"].includes(role)) return jsonError("Select a valid account type.", 400);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 500) return jsonError("Quantity must be between 1 and 500.", 400);
    if (!productName || productName.length > 120) return jsonError("A valid product name is required.", 400);

    let pricing;
    try {
      pricing = calculateOrderPricing(body.components, quantity);
    } catch (validationError) {
      return jsonError(validationError.message, 400);
    }
    if (Number(body?.total_price) !== pricing.totalPrice) {
      return jsonError("Build pricing changed. Refresh the builder and submit again.", 409);
    }
    if (Number(body?.bottleneck_score) !== pricing.bottleneckScore) {
      return jsonError("Build balance score is invalid. Refresh the builder and submit again.", 400);
    }

    let orderNumber;
    let savedOrder;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      orderNumber = `VT-PO-${new Date().getFullYear()}-${String(randomInt(0, 10000)).padStart(4, "0")}`;
      const { data, error } = await supabase
        .from("orders")
        .insert({
          order_number: orderNumber,
          user_id: authData.user.id,
          user_role: role,
          product_name: productName,
          base_price: pricing.basePrice,
          jit_buffer: pricing.jitBuffer,
          total_price: pricing.totalPrice,
          order_summary: {
            quantity: pricing.quantity,
            unit_price: pricing.unitPrice,
            discount_percent: pricing.discountPercent,
            discount: pricing.discount,
            components: pricing.components,
            bottleneck_score: pricing.bottleneckScore,
          },
          status: "IoT Stress-Test Pending",
        })
        .select("id, order_number, user_id, user_role, product_name, total_price, status, created_at, order_summary")
        .single();

      if (!error) {
        savedOrder = data;
        break;
      }
      if (error.code !== "23505" || attempt === 4) {
        console.error("[ViciTech OS] Order creation failed:", error);
        return jsonError(error.code === "23505" ? "Could not allocate a unique order number. Please try again." : "Could not save your order.", 500);
      }
    }

    return NextResponse.json({ order: savedOrder, order_number: savedOrder.order_number }, { status: 201 });
  } catch (error) {
    console.error("[ViciTech OS] Order request failed:", error);
    return jsonError("Order request could not be completed.", 500);
  }
}
