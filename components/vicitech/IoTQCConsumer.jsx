"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, Cpu, Gauge, LoaderCircle, Radio, Search, ShieldCheck, Thermometer, Timer, Wifi } from "lucide-react";
import { getQcTrackingRecord, listMyOrders } from "@/lib/supabase";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const SERIAL_PATTERN = /^VICI-[A-Z]{3}-\d{4}-\d{4}$/;
const ORDER_PATTERN = /^VT-PO-\d{4}-\d{4}$/;

function getProgress(record) {
  if (!record || typeof record !== "object") return 0;
  if (record.shipping_status === "Shipped") return 100;
  if (record.stress_test_status === "Complete" || record.status === "Pass") return 82;
  if (record.stress_test_status === "Running" || record.status === "In Progress") {
    return Math.min(75, 35 + (Number(record.burnin_hours || 0) / 4) * 40);
  }
  return 18;
}

function Stat({ icon: Icon, label, value, detail, color = "text-accent-primary", level }) {
  const gaugeLevel = Number.isFinite(level) ? Math.max(0, Math.min(100, level)) : null;
  return (
    <div className="rounded-2xl border border-default bg-surface p-4 shadow-sm transition-colors duration-200">
      <div className="flex items-center justify-between text-sm text-secondary">
        {label}<Icon className={`h-4 w-4 ${color}`} />
      </div>
      <p className="mt-3 text-2xl font-semibold tabular-nums text-primary">{value}</p>
      {gaugeLevel !== null && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-subtle" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(gaugeLevel)} aria-label={`${label} gauge`}>
          <div
            className="h-full w-full origin-left rounded-full bg-accent-primary transition-transform duration-300 motion-reduce:transition-none"
            style={{ transform: `scaleX(${gaugeLevel / 100})` }}
          />
        </div>
      )}
      <p className="mt-1 text-xs text-secondary">{detail}</p>
    </div>
  );
}

export default function IoTQCConsumer({ initialSerial }) {
  const [query, setQuery] = useState(typeof initialSerial === "string" ? initialSerial.trim().toUpperCase() : "");
  const [record, setRecord] = useState(null);
  const [telemetry, setTelemetry] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [userId, setUserId] = useState("");
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState("");

  const refreshOrders = useCallback(async (nextUserId) => {
    setUserId(nextUserId || "");
    setOrdersError("");
    if (!nextUserId) {
      setOrders([]);
      setOrdersLoading(false);
      return;
    }

    setOrdersLoading(true);
    try {
      const result = await listMyOrders({ userId: nextUserId });
      setOrders(Array.isArray(result) ? result : []);
    } catch (loadError) {
      setOrdersError(loadError.message || "Could not load your orders.");
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    let client;
    try {
      client = getSupabaseBrowserClient();
    } catch (clientError) {
      setOrdersError(clientError.message);
      setOrdersLoading(false);
      return undefined;
    }

    client.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return;
      if (sessionError) {
        setOrdersError(`Could not check your session: ${sessionError.message}`);
        setOrdersLoading(false);
        return;
      }
      refreshOrders(data.session?.user?.id || "");
    }).catch((sessionError) => {
      if (active) {
        setOrdersError(sessionError.message || "Could not check your session.");
        setOrdersLoading(false);
      }
    });

    const { data: authListener } = client.auth.onAuthStateChange((_event, session) => {
      if (active) refreshOrders(session?.user?.id || "");
    });
    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, [refreshOrders]);

  const lookup = useCallback(async (value) => {
    const normalized = String(value ?? "").trim().toUpperCase();
    setQuery(normalized);
    if (!SERIAL_PATTERN.test(normalized) && !ORDER_PATTERN.test(normalized)) {
      setError("Enter a valid ViciTech serial number or order ID (for example VT-PO-2026-0412).");
      setRecord(null);
      setTelemetry(null);
      setStatus("idle");
      return;
    }

    setError("");
    setTelemetry(null);
    setStatus("loading");
    try {
      const result = await getQcTrackingRecord(normalized);
      if (result && typeof result === "object") {
        setRecord(result);
        setStatus("ready");
        return;
      }

      const ownedOrder = orders.find((order) => (
        order?.order_number?.toUpperCase() === normalized ||
        order?.serial_number?.toUpperCase() === normalized
      ));
      if (ownedOrder) {
        setRecord({
          order_id: ownedOrder.order_number,
          serial_number: ownedOrder.serial_number || "",
          device_name: ownedOrder.product_name,
          status: ownedOrder.status || "IoT Stress-Test Pending",
          stress_test_status: "Pending",
          shipping_status: ownedOrder.status || "In Production",
          burnin_hours: 0,
          source: "order",
        });
        setStatus("ready");
        return;
      }

      setRecord(null);
      setStatus("notfound");
    } catch (lookupError) {
      console.error("[ViciTech OS] Public QC tracking lookup failed:", lookupError);
      setError(lookupError.message || "Tracking information could not be loaded.");
      setRecord(null);
      setStatus("error");
    }
  }, [orders]);

  useEffect(() => {
    if (initialSerial) lookup(initialSerial);
  }, [initialSerial, lookup]);

  useEffect(() => {
    const serial = record?.serial_number;
    if (!serial) return undefined;

    let active = true;
    let client;
    try {
      client = getSupabaseBrowserClient();
    } catch (subscriptionError) {
      setError(subscriptionError.message);
      return undefined;
    }

    const channel = client
      .channel(`customer-telemetry-${serial}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "telemetry_logs",
        filter: `serial_number=eq.${serial}`,
      }, ({ new: entry }) => {
        if (active && entry && entry.serial_number === serial) {
          setTelemetry(entry);
          setRecord((current) => current ? {
            ...current,
            burnin_hours: entry.burnin_hours,
            stress_test_status: entry.stress_test_status,
            status: entry.stress_test_status === "Failed" ? "Fail" : current.status,
          } : current);
        }
      })
      .subscribe((subscriptionStatus) => {
        if (subscriptionStatus === "CHANNEL_ERROR" || subscriptionStatus === "TIMED_OUT") {
          setError("Live telemetry is unavailable. Tracking status is still shown; refresh to retry.");
        }
      });

    client
      .from("telemetry_logs")
      .select("id, serial_number, order_id, cpu_temp_c, gpu_temp_c, fan_rpm, voltage_stability, stability_score, stress_test_status, burnin_hours, source, created_at")
      .eq("serial_number", serial)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data, error: telemetryError }) => {
        if (!active) return;
        if (telemetryError) {
          setError(`Could not load telemetry: ${telemetryError.message}`);
          return;
        }
        if (data) {
          setTelemetry((current) => current || data);
          setRecord((current) => current ? {
            ...current,
            burnin_hours: data.burnin_hours,
            stress_test_status: data.stress_test_status,
            status: data.stress_test_status === "Failed" ? "Fail" : current.status,
          } : current);
        }
      })
      .catch((telemetryError) => {
        if (active) setError(telemetryError.message || "Could not load telemetry.");
      });

    return () => {
      active = false;
      client.removeChannel(channel);
    };
  }, [record?.serial_number]);

  const progress = getProgress(record);
  const testLabel = record?.stress_test_status || record?.status || "Awaiting assembly";
  const burninHours = Number(telemetry?.burnin_hours ?? record?.burnin_hours ?? 0);

  return (
    <div className="space-y-5 text-primary">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-accent-hover">
              <ShieldCheck className="h-4 w-4 text-accent-primary" /> Customer tracking
            </p>
            <h2 className="mt-2 font-serif text-2xl font-semibold tracking-tight text-primary sm:text-3xl">Rig assembly &amp; QC status</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-secondary">
              Track your order and the latest reported sensor readings. This view is read-only.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-accent-primary/25 bg-accent-subtle px-3 py-2 text-xs font-medium text-accent-hover">
            <Wifi className="h-3.5 w-3.5 text-accent-primary" /> Read-only status
          </span>
        </header>

        {userId && (
          <section className="rounded-3xl border border-default bg-surface p-5 shadow-sm transition-colors duration-200">
            <h3 className="text-sm font-medium text-primary">Your orders</h3>
            {ordersLoading ? (
              <p role="status" className="mt-3 flex items-center gap-2 text-sm text-secondary"><LoaderCircle className="h-4 w-4 animate-spin text-accent-primary" /> Loading your orders…</p>
            ) : ordersError ? (
              <p role="alert" className="mt-3 text-sm text-status-danger">{ordersError}</p>
            ) : orders.length ? (
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {orders.map((order) => (
                  <li key={order.id}>
                    <button type="button" onClick={() => lookup(order.order_number || order.serial_number)} className="w-full rounded-lg border border-default p-3 text-left transition-colors hover:border-status-live/50">
                      <span className="block font-mono text-xs text-status-live">{order.order_number || "Order pending ID"}</span>
                      <span className="mt-1 block truncate text-sm text-primary">{order.product_name}</span>
                      <span className="mt-1 block text-xs text-secondary">{order.status || "Processing"}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : <p className="mt-2 text-sm text-secondary">No orders are linked to your account yet.</p>}
          </section>
        )}

        <form
          onSubmit={(event) => {
            event.preventDefault();
            lookup(query);
          }}
          className="rounded-3xl border border-default bg-surface p-5 shadow-sm transition-colors duration-200 sm:p-6"
        >
          <label htmlFor="qc-tracking-query" className="mb-2 block text-sm font-medium text-primary">Serial number or order ID</label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary" />
              <input
                id="qc-tracking-query"
                value={query}
                onChange={(event) => setQuery(event.target.value.toUpperCase())}
                placeholder="VT-PO-2026-0412 or VICI-SRV-2026-9042"
                autoComplete="off"
                className="w-full rounded-xl border border-default bg-canvas py-3 pl-10 pr-3 font-mono text-sm text-primary outline-none transition-colors placeholder:text-secondary/65 focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20"
              />
            </div>
            <button type="submit" disabled={status === "loading"} className="min-h-11 rounded-full bg-accent-cta px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-cta-hover disabled:opacity-60">
              {status === "loading" ? "Checking…" : "Track rig"}
            </button>
          </div>
          {error && <p role="alert" className="mt-3 text-sm text-status-danger">{error}</p>}
        </form>

        {status === "loading" && (
          <p role="status" className="mt-5 flex items-center gap-2 text-sm text-secondary">
            <LoaderCircle className="h-4 w-4 animate-spin text-status-live" /> Loading tracking status…
          </p>
        )}
        {status === "notfound" && <p role="status" className="mt-5 rounded-xl border border-default bg-surface p-5 text-sm text-primary">No order or public QC record was found for that ID.</p>}

        {status === "ready" && record && typeof record === "object" && (
          <section aria-label="Rig tracking status" className="mt-6 space-y-5">
            <div className="rounded-3xl border border-default bg-surface p-6 shadow-sm transition-colors duration-200">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-secondary">{record.order_id || "Order tracking"}</p>
                  <h2 className="mt-1 text-xl font-semibold text-primary">{record.device_name || "ViciTech custom rig"}</h2>
                  <p className="mt-1 font-mono text-sm text-secondary">{record.serial_number || "QC serial pending"}</p>
                </div>
                <span className="vt-badge-live">
                  {record.shipping_status || testLabel}
                </span>
              </div>
              <div className="mt-6">
                <div className="mb-2 flex justify-between text-xs text-secondary">
                  <span>Assembly and stress-test progress</span><span className="tabular-nums">{Math.round(progress)}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-subtle" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Assembly and stress-test progress">
                  <div
                    className="h-full w-full origin-left rounded-full bg-accent-primary transition-transform duration-300 motion-reduce:transition-none"
                    style={{ transform: `scaleX(${Math.max(0, Math.min(100, progress)) / 100})` }}
                  />
                </div>
                <div className="mt-2 flex justify-between text-[11px] text-secondary"><span>Assembly</span><span>Stress test</span><span>Dispatch</span></div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <Stat icon={Cpu} label="CPU temperature" value={telemetry?.cpu_temp_c == null ? "—" : `${Number(telemetry.cpu_temp_c).toFixed(1)} °C`} detail="Latest sensor payload" level={telemetry?.cpu_temp_c == null ? null : Number(telemetry.cpu_temp_c) / 120 * 100} />
              <Stat icon={Thermometer} label="GPU temperature" value={telemetry?.gpu_temp_c == null ? "—" : `${Number(telemetry.gpu_temp_c).toFixed(1)} °C`} detail="Latest sensor payload" color="text-status-sample" level={telemetry?.gpu_temp_c == null ? null : Number(telemetry.gpu_temp_c) / 120 * 100} />
              <Stat icon={Gauge} label="Fan speed" value={telemetry?.fan_rpm == null ? "—" : `${telemetry.fan_rpm} RPM`} detail="Latest sensor payload" color="text-status-simulated" level={telemetry?.fan_rpm == null ? null : Number(telemetry.fan_rpm) / 2500 * 100} />
              <Stat icon={Activity} label="Voltage stability" value={telemetry?.voltage_stability == null ? "—" : `${telemetry.voltage_stability}%`} detail="Latest sensor payload" color="text-status-live" level={telemetry?.voltage_stability == null ? null : Number(telemetry.voltage_stability)} />
              <Stat icon={Timer} label="Stress-test status" value={telemetry?.stress_test_status || testLabel} detail={`${burninHours} / 4 burn-in hours`} />
            </div>

            <div className="rounded-2xl border border-default bg-surface p-4 text-xs leading-relaxed text-secondary shadow-sm">
              <Radio className="mr-2 inline h-4 w-4 text-accent-primary" />
              {telemetry
                ? `${telemetry.source === "admin_simulation" ? "Admin-simulated payload" : "Reported telemetry"} · ${new Date(telemetry.created_at).toLocaleString()}`
                : "Waiting for a telemetry payload. No sensor readings are fabricated or shown as live data."}
              {" "}Control actions are restricted to authorized QC administrators.
            </div>
          </section>
        )}
    </div>
  );
}
