"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, Cpu, LoaderCircle, Radio, ShieldCheck, Thermometer, Terminal, Wifi } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

function formatTime(value = new Date()) {
  return new Intl.DateTimeFormat("en-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(value);
}

function MetricCard({ icon: Icon, label, value, level }) {
  const gaugeLevel = Number.isFinite(level) ? Math.max(0, Math.min(100, level)) : null;
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
      <span className="flex items-center gap-2 text-xs text-zinc-500"><Icon className="h-3.5 w-3.5" /> {label}</span>
      <p className="mt-2 text-lg font-semibold">{value}</p>
      {gaugeLevel !== null && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(gaugeLevel)} aria-label={`${label} gauge`}>
          <div className="h-full rounded-full bg-emerald-600 dark:bg-emerald-400 transition-all" style={{ width: `${gaugeLevel}%` }} />
        </div>
      )}
    </div>
  );
}

export default function AdminIotQcPage() {
  const [units, setUnits] = useState([]);
  const [orders, setOrders] = useState([]);
  const [selectedSerial, setSelectedSerial] = useState("");
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [activeAction, setActiveAction] = useState("");

  const selectedUnit = useMemo(
    () => units.find((unit) => unit.serial_number === selectedSerial) || null,
    [selectedSerial, units],
  );

  const addLog = useCallback((message, payload) => {
    setLogs((current) => [
      { id: `${Date.now()}-${Math.random()}`, time: formatTime(), message, payload },
      ...current,
    ].slice(0, 40));
  }, []);

  const loadUnits = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/iot-qc", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load QC units.");
      const nextUnits = Array.isArray(result.units)
        ? result.units.filter((unit) => unit && typeof unit === "object" && typeof unit.serial_number === "string")
        : [];
      setOrders(Array.isArray(result.orders) ? result.orders : []);
      setUnits(nextUnits);
      setSelectedSerial((current) => (
        nextUnits.some((unit) => unit.serial_number === current)
          ? current
          : nextUnits[0]?.serial_number || ""
      ));
      if (nextUnits.length) {
        addLog("Admin session authorized; QC unit registry loaded.", { units: nextUnits.length });
      }
      if (Array.isArray(result.telemetry)) {
        result.telemetry
          .filter((entry) => entry && typeof entry.serial_number === "string")
          .slice(0, 20)
          .reverse()
          .forEach((entry) => addLog(
            entry.source === "admin_simulation" ? "Stored simulated telemetry loaded." : "Stored ESP32 telemetry loaded.",
            entry,
          ));
      }
    } catch (loadError) {
      setError(loadError.message || "Could not load QC units.");
    } finally {
      setIsLoading(false);
    }
  }, [addLog]);

  useEffect(() => {
    loadUnits();
  }, [loadUnits]);

  useEffect(() => {
    let client;
    try {
      client = getSupabaseBrowserClient();
    } catch (subscriptionError) {
      setError(subscriptionError.message);
      return undefined;
    }

    const channel = client
      .channel("admin-iot-qc-telemetry")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "telemetry_logs",
      }, ({ new: telemetry }) => {
        if (!telemetry || typeof telemetry.serial_number !== "string") return;
        setUnits((current) => current.map((unit) => (
          unit.serial_number === telemetry.serial_number
            ? {
              ...unit,
              telemetry,
              cpu_temp_c: telemetry.cpu_temp_c,
              gpu_temp_c: telemetry.gpu_temp_c,
              stability_score: telemetry.stability_score,
              stress_test_status: telemetry.stress_test_status,
              burnin_hours: telemetry.burnin_hours,
            }
            : unit
        )));
        addLog(telemetry.source === "admin_simulation" ? "Simulated ESP32 payload received." : "Live ESP32 telemetry received.", telemetry);
      })
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setError("Realtime telemetry subscription failed. Refresh to retry.");
        }
      });

    return () => {
      client.removeChannel(channel);
    };
  }, [addLog]);

  const registerOrder = async (order) => {
    setActiveAction(`register:${order.id}`);
    setError("");
    try {
      const response = await fetch("/api/admin/iot-qc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "register_unit", order_id: order.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not register this order for QC.");
      if (!result.unit?.serial_number) throw new Error("QC registration returned no unit serial.");
      setUnits((current) => [
        result.unit,
        ...current.filter((unit) => unit.serial_number !== result.unit.serial_number),
      ]);
      setSelectedSerial(result.unit.serial_number);
      setOrders((current) => current.map((item) => (
        item.id === order.id ? { ...item, serial_number: result.unit.serial_number } : item
      )));
      addLog("Order registered for QC.", { order_number: order.order_number, serial_number: result.unit.serial_number });
    } catch (registerError) {
      setError(registerError.message || "Could not register this order for QC.");
    } finally {
      setActiveAction("");
    }
  };

  const runAction = async (action, label) => {
    if (!selectedUnit) return;
    setActiveAction(action);
    setError("");
    try {
      const response = await fetch("/api/admin/iot-qc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, serial_number: selectedUnit.serial_number }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `${label} failed.`);
      if (!result.unit || typeof result.unit !== "object" || typeof result.unit.serial_number !== "string") {
        throw new Error(`${label} returned an invalid QC unit response.`);
      }

      setUnits((current) => current.map((unit) => (
        unit.serial_number === result.unit.serial_number ? result.unit : unit
      )));
      addLog(`${label} completed.`, {
        serial_number: result.unit.serial_number,
        cpu_temp_c: result.unit.cpu_temp_c,
        gpu_temp_c: result.unit.gpu_temp_c,
        stability_score: result.unit.stability_score,
        stress_test_status: result.unit.stress_test_status,
        burnin_hours: result.unit.burnin_hours,
        shipping_status: result.unit.shipping_status,
        certificate_id: result.unit.certificate_id,
      });
    } catch (actionError) {
      setError(actionError.message || `${label} failed.`);
      addLog(`${label} failed.`, { error: actionError.message });
    } finally {
      setActiveAction("");
    }
  };

  const hasCompletedBurnIn = Number(selectedUnit?.burnin_hours || 0) >= 4;
  const isPassed = selectedUnit?.status === "Pass" && Boolean(selectedUnit?.certificate_id);
  const progress = selectedUnit?.shipping_status === "Shipped"
    ? 100
    : isPassed
      ? 82
      : Math.min(75, 35 + (Number(selectedUnit?.burnin_hours || 0) / 4) * 40);

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">
            <ShieldCheck className="h-4 w-4" /> Admin operations · restricted
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">IoT QC control portal</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Run authorized stress tests, inspect ESP32 payloads and issue shipping clearance. Every operation is verified server-side against the trusted admin role.
          </p>
        </div>
        <button type="button" onClick={loadUnits} disabled={isLoading} className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:border-emerald-600/40 dark:hover:border-emerald-400/40 disabled:opacity-50">
          {isLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
          Refresh units
        </button>
      </header>

      {error && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-800 dark:text-red-200">{error}</p>}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]">
        <div className="space-y-5">
          <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 p-4">
            <h2 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">Recent orders · {orders.length}</h2>
            {orders.length ? (
              <ul className="max-h-48 space-y-2 overflow-y-auto">
                {orders.map((order) => (
                  <li key={order.id} className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-xs text-cyan-700 dark:text-cyan-300">{order.order_number || order.id}</p>
                      <p className="truncate text-sm text-zinc-700 dark:text-zinc-300">{order.product_name}</p>
                    </div>
                    {order.serial_number ? (
                      <span className="shrink-0 text-xs text-emerald-700 dark:text-emerald-300">{order.serial_number}</span>
                    ) : (
                      <button type="button" disabled={Boolean(activeAction)} onClick={() => registerOrder(order)} className="shrink-0 rounded-md border border-emerald-600/30 dark:border-emerald-400/30 px-2.5 py-1.5 text-xs text-cyan-800 dark:text-cyan-200 hover:bg-cyan-500/10 dark:hover:bg-emerald-500/10 disabled:opacity-50">
                        {activeAction === `register:${order.id}` ? "Registering…" : "Register QC"}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-zinc-500">No customer orders are available.</p>}
          </section>

          <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 p-4">
            <label htmlFor="admin-qc-unit" className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">QC unit</label>
            {isLoading ? (
              <p className="flex items-center gap-2 py-2 text-sm text-zinc-500"><LoaderCircle className="h-4 w-4 animate-spin" /> Loading QC unit registry…</p>
            ) : units.length ? (
              <select id="admin-qc-unit" value={selectedSerial} onChange={(event) => setSelectedSerial(event.target.value)} className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-3 font-mono text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-emerald-600/50 dark:focus:border-emerald-400/50">
                {units.map((unit) => <option key={unit.serial_number} value={unit.serial_number}>{unit.serial_number} · {unit.device_name}</option>)}
              </select>
            ) : (
              <p className="text-sm text-zinc-500">No QC units are available. Apply the latest `supabase/schema.sql` and seed or register a unit first.</p>
            )}
          </section>

          {selectedUnit && (
            <>
              {(() => {
                const telemetry = selectedUnit.telemetry || {};
                return (
              <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 p-5">
                <p className="text-xs uppercase tracking-[0.15em] text-zinc-500">{selectedUnit.order_id || "QC unit"}</p>
                <h2 className="mt-1 text-xl font-semibold">{selectedUnit.device_name}</h2>
                <p className="mt-1 font-mono text-sm text-zinc-600 dark:text-zinc-400">{selectedUnit.serial_number}</p>
                <div className="mt-5 flex justify-between text-xs text-zinc-600 dark:text-zinc-400"><span>Assembly / QC / dispatch</span><span>{Math.round(progress)}%</span></div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all" style={{ width: `${progress}%` }} />
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <MetricCard icon={Cpu} label="CPU" value={telemetry.cpu_temp_c == null ? "—" : `${telemetry.cpu_temp_c} °C`} level={telemetry.cpu_temp_c == null ? null : Number(telemetry.cpu_temp_c) / 120 * 100} />
                  <MetricCard icon={Thermometer} label="GPU" value={telemetry.gpu_temp_c == null ? "—" : `${telemetry.gpu_temp_c} °C`} level={telemetry.gpu_temp_c == null ? null : Number(telemetry.gpu_temp_c) / 120 * 100} />
                  <MetricCard icon={Activity} label="Fan speed" value={telemetry.fan_rpm == null ? "—" : `${telemetry.fan_rpm} RPM`} level={telemetry.fan_rpm == null ? null : Number(telemetry.fan_rpm) / 2500 * 100} />
                  <MetricCard icon={Activity} label="Voltage stability" value={telemetry.voltage_stability == null ? "—" : `${telemetry.voltage_stability}%`} level={telemetry.voltage_stability == null ? null : Number(telemetry.voltage_stability)} />
                </div>
                <div className="mt-4">
                  <div className="mb-2 flex justify-between text-xs text-zinc-500"><span>Stress-test progress</span><span>{telemetry.burnin_hours ?? selectedUnit.burnin_hours ?? 0}/4 burn-in hours</span></div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"><div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400" style={{ width: `${Math.min(100, (Number(telemetry.burnin_hours ?? selectedUnit.burnin_hours ?? 0) / 4) * 100)}%` }} /></div>
                </div>
                <p className="mt-4 text-xs text-zinc-500">
                  {selectedUnit.stress_test_status || selectedUnit.status} · {selectedUnit.burnin_hours || 0}/4 burn-in hours · {selectedUnit.shipping_status || "In Production"}
                </p>
                <p className="mt-2 text-xs text-zinc-600">
                  {telemetry.source === "admin_simulation" ? "Simulated payload · not a physical sensor reading" : telemetry.source === "esp32" ? "Live ESP32 sensor reading" : "Waiting for telemetry"}
                </p>
                {selectedUnit.certificate_id && <p className="mt-2 font-mono text-xs text-emerald-700 dark:text-emerald-300">Certificate: {selectedUnit.certificate_id}</p>}
              </section>
                );
              })()}

              <section aria-label="QC control actions" className="grid gap-3 sm:grid-cols-2">
                <button type="button" disabled={Boolean(activeAction)} onClick={() => runAction("start_test", "Start Stress Test")} className="rounded-lg bg-emerald-600 dark:bg-emerald-400 px-4 py-3 text-sm font-semibold text-white dark:text-zinc-950 hover:bg-emerald-500 dark:hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50">
                  {activeAction === "start_test" ? "Starting…" : "Start Stress Test"}
                </button>
                <button type="button" disabled={Boolean(activeAction)} onClick={() => runAction("simulate_payload", "Simulate ESP32 Payload")} className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-700 px-4 py-3 text-sm font-medium text-zinc-800 dark:text-zinc-200 hover:border-emerald-600/40 dark:hover:border-emerald-400/40 disabled:cursor-not-allowed disabled:opacity-50">
                  {activeAction === "simulate_payload" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4 text-cyan-700 dark:text-cyan-300" />}
                  Simulate ESP32 Payload
                </button>
                <button type="button" disabled={Boolean(activeAction) || !hasCompletedBurnIn} onClick={() => runAction("pass_qc", "Pass QC & Generate Certificate")} className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-800 dark:text-emerald-200 hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-40">
                  {activeAction === "pass_qc" ? "Generating…" : "Pass QC & Generate Certificate"}
                </button>
                <button type="button" disabled={Boolean(activeAction) || !isPassed || selectedUnit.shipping_status === "Shipped"} onClick={() => runAction("mark_shipped", "Mark Unit as Shipped")} className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-800 dark:text-amber-200 hover:bg-amber-500/15 disabled:cursor-not-allowed disabled:opacity-40">
                  {activeAction === "mark_shipped" ? "Updating…" : "Mark Unit as Shipped"}
                </button>
              </section>
              <p className="text-xs text-zinc-600">QC pass requires four burn-in hours. Shipping is enabled only after a certificate is generated.</p>
            </>
          )}
        </div>

        <section className="min-h-80 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-[#090d12]">
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-4 py-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200"><Terminal className="h-4 w-4 text-emerald-700 dark:text-emerald-300" /> ESP32 telemetry terminal</h2>
            <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-emerald-700 dark:text-emerald-300"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> Secure</span>
          </div>
          <div className="max-h-[620px] space-y-3 overflow-y-auto p-4 font-mono text-xs">
            {logs.length ? logs.map((entry) => (
              <div key={entry.id} className="border-l border-zinc-200 dark:border-zinc-700 pl-3">
                <p className="text-zinc-500"><span className="text-emerald-700 dark:text-emerald-400">[{entry.time}]</span> {entry.message}</p>
                {entry.payload && <pre className="mt-1 whitespace-pre-wrap break-all text-cyan-800/80 dark:text-cyan-100/80">{JSON.stringify(entry.payload, null, 2)}</pre>}
              </div>
            )) : (
              <p className="flex items-center gap-2 text-zinc-500"><Wifi className="h-4 w-4" /> Awaiting authenticated telemetry operations…</p>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
