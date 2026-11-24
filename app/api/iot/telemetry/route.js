import { createClient } from "@supabase/supabase-js";
import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const JSON_HEADERS = { "Cache-Control": "no-store" };
const TELEMETRY_LOG_COLUMNS =
  "id, serial_number, order_id, cpu_temp_c, gpu_temp_c, fan_rpm, voltage_stability, stability_score, stress_test_status, burnin_hours, source, created_at";

function respond(body, status) {
  return NextResponse.json(body, { status, headers: JSON_HEADERS });
}

function isValidToken(request) {
  const expected = process.env.IOT_INGEST_TOKEN;
  const authorization = request.headers.get("authorization") || "";
  const supplied = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!expected || !supplied) return false;
  const expectedBytes = Buffer.from(expected);
  const suppliedBytes = Buffer.from(supplied);
  return expectedBytes.length === suppliedBytes.length && timingSafeEqual(expectedBytes, suppliedBytes);
}

function isFiniteInRange(value, min, max) {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

export async function POST(request) {
  if (!isValidToken(request)) return respond({ error: "Unauthorized telemetry device." }, 401);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return respond({ error: "Telemetry ingestion is not configured." }, 503);

  let payload;
  try {
    payload = await request.json();
  } catch {
    return respond({ error: "Request body must be valid JSON." }, 400);
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return respond({ error: "Telemetry payload must be a JSON object." }, 400);
  }

  const serial = typeof payload?.serial_number === "string" ? payload.serial_number.trim().toUpperCase() : "";
  if (!/^VICI-[A-Z]{3}-\d{4}-\d{4}$/.test(serial)) return respond({ error: "A valid QC serial number is required." }, 400);
  if (!isFiniteInRange(payload.cpu_temp_c, 0, 120) || !isFiniteInRange(payload.gpu_temp_c, 0, 120)) {
    return respond({ error: "CPU and GPU temperatures must be numeric readings between 0 and 120 °C." }, 400);
  }
  if (!Number.isInteger(payload.fan_rpm) || payload.fan_rpm < 0 || payload.fan_rpm > 10000) {
    return respond({ error: "Fan speed must be an integer between 0 and 10,000 RPM." }, 400);
  }
  if (!isFiniteInRange(payload.voltage_stability, 0, 100) || !isFiniteInRange(payload.stability_score, 0, 100)) {
    return respond({ error: "Voltage stability and stability score must be between 0 and 100." }, 400);
  }
  if (!["Running", "Complete", "Failed"].includes(payload.stress_test_status)) {
    return respond({ error: "Stress-test status must be Running, Complete, or Failed." }, 400);
  }
  if (!Number.isInteger(payload.burnin_hours) || payload.burnin_hours < 0 || payload.burnin_hours > 4) {
    return respond({ error: "Burn-in hours must be an integer between 0 and 4." }, 400);
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const { data: unit, error: unitError } = await supabase
      .from("qc_logs")
      .select("serial_number, order_id, status, stress_test_status, burnin_hours, shipping_status")
      .eq("serial_number", serial)
      .maybeSingle();
    if (unitError) {
      console.error("[ViciTech OS] Telemetry unit lookup failed:", unitError);
      return respond({ error: "Could not verify the QC unit." }, 500);
    }
    if (!unit) return respond({ error: "The QC unit is not registered." }, 404);
    if (["Dikirim", "Shipped"].includes(unit.shipping_status)) return respond({ error: "Telemetry is closed for shipped units." }, 409);
    if (unit.stress_test_status !== "Running") return respond({ error: "Start the stress test before sending telemetry." }, 409);
    if (payload.burnin_hours < Number(unit.burnin_hours || 0)) {
      return respond({ error: "Burn-in progress cannot move backwards." }, 409);
    }

    const telemetry = {
      serial_number: serial,
      order_id: unit.order_id,
      cpu_temp_c: payload.cpu_temp_c,
      gpu_temp_c: payload.gpu_temp_c,
      fan_rpm: payload.fan_rpm,
      voltage_stability: payload.voltage_stability,
      stability_score: payload.stability_score,
      stress_test_status: payload.stress_test_status,
      burnin_hours: payload.burnin_hours,
      source: "esp32",
    };

    const { data: telemetryEntry, error: insertError } = await supabase
      .from("telemetry_logs")
      .insert(telemetry)
      .select(TELEMETRY_LOG_COLUMNS)
      .single();
    if (insertError) {
      console.error("[ViciTech OS] Telemetry insert failed:", insertError);
      return respond({ error: "Telemetry could not be recorded." }, 500);
    }

    const { error: updateError } = await supabase
      .from("qc_logs")
      .update({
        cpu_temp_c: payload.cpu_temp_c,
        gpu_temp_c: payload.gpu_temp_c,
        stability_score: payload.stability_score,
        stress_test_status: payload.stress_test_status,
        burnin_hours: payload.burnin_hours,
        status: payload.stress_test_status === "Failed" ? "Fail" : "In Progress",
        updated_at: new Date().toISOString(),
      })
      .eq("serial_number", serial);
    if (updateError) {
      console.error("[ViciTech OS] QC summary update after telemetry failed:", updateError);
      return respond({ error: "Telemetry was recorded, but the QC summary could not be updated." }, 500);
    }

    if (unit.order_id) {
      const orderStatus = payload.stress_test_status === "Failed"
        ? "QC Failed"
        : payload.stress_test_status === "Complete"
          ? "Awaiting QC Review"
          : "IoT Stress-Testing";
      const { error: orderError } = await supabase
        .from("orders")
        .update({ status: orderStatus })
        .eq("order_number", unit.order_id);
      if (orderError) {
        console.error("[ViciTech OS] Order status update after telemetry failed:", orderError);
        return respond({ error: "Telemetry was recorded, but the order status could not be synchronized." }, 500);
      }
    }

    return respond({ telemetry: telemetryEntry }, 201);
  } catch (error) {
    console.error("[ViciTech OS] Telemetry ingestion failed:", error);
    return respond({ error: "Telemetry ingestion failed unexpectedly." }, 500);
  }
}
