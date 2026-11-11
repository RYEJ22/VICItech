"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, Cpu, Radio, ShieldCheck, Wrench, Zap } from "lucide-react";
import { CyberToast, type CyberToastMessage } from "./CyberUI";
import SpotlightCard from "./SpotlightCard";
import { DiagnosticPanel, HardwareBuilder } from "./CyberSuite";
import IoTQCConsumer from "./IoTQCConsumer";

type DashboardSegment = "diagnostics" | "tracking" | "builder";

const SYSTEM_STATS = [
  { label: "TEST PROFILES", value: "04", icon: Cpu },
  { label: "REPORT EXPORT", value: "READY", icon: ShieldCheck },
  { label: "POWER BUS", value: "STABLE", icon: Zap },
];

export default function QCPanelDashboard() {
  const [toast, setToast] = useState<CyberToastMessage | null>(null);
  const [clock, setClock] = useState("00:00:00");
  const [activeSegment, setActiveSegment] = useState<DashboardSegment>("diagnostics");
  const [initialSerial, setInitialSerial] = useState("");

  useEffect(() => {
    const updateClock = () => setClock(new Date().toLocaleTimeString("en-GB", { hour12: false }));
    updateClock();
    const intervalId = window.setInterval(updateClock, 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const order = new URLSearchParams(window.location.search).get("order");
    if (order) {
      setInitialSerial(order);
      setActiveSegment("tracking");
    }
  }, []);

  const notify = useCallback((message: string, tone: CyberToastMessage["tone"] = "info") => {
    setToast({ message, tone });
  }, []);
  const dismissToast = useCallback(() => setToast(null), []);

  return (
    <main className="cyber-suite-theme qc-dashboard min-h-[calc(100vh-4rem)] bg-zinc-50 px-4 py-8 text-zinc-900 transition-colors dark:bg-zinc-950 dark:text-zinc-100 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl border border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">ViciTech OS / Quality Control</p>
              <h1 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">IoT Diagnostics Panel</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 font-mono text-[10px] text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 sm:flex">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <Radio className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              SENSOR LINK · SIMULATED
            </div>
          </div>
        </header>

        <section className="mb-5 grid gap-3 sm:grid-cols-3" aria-label="System status">
          {SYSTEM_STATS.map(({ label, value, icon: Icon }) => (
            <SpotlightCard key={label} className="flex items-center justify-between rounded-xl p-4">
              <div>
                <p className="font-mono text-[9px] tracking-[0.16em] text-zinc-500">{label}</p>
                <p className="mt-1 font-mono text-sm font-semibold text-zinc-800 dark:text-zinc-200">{value}</p>
              </div>
              <Icon className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
            </SpotlightCard>
          ))}
        </section>

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_15rem]">
          <div className="min-w-0">
            <div role="tablist" aria-label="Quality control workspace" className="mb-4 grid grid-cols-3 gap-1 rounded-xl border border-zinc-200 bg-white p-1 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              {([
                { id: "diagnostics", label: "Diagnostics", icon: Activity },
                { id: "tracking", label: "Order tracking", icon: Radio },
                { id: "builder", label: "Hardware builder", icon: Wrench },
              ] satisfies Array<{ id: DashboardSegment; label: string; icon: typeof Activity }>).map(({ id, label, icon: Icon }) => {
                const selected = activeSegment === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    id={`qc-tab-${id}`}
                    aria-selected={selected}
                    aria-controls={`qc-panel-${id}`}
                    onClick={() => setActiveSegment(id)}
                    className={`inline-flex min-w-0 items-center justify-center gap-2 rounded-lg px-2 py-2.5 text-xs font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 sm:px-3 sm:text-sm ${
                      selected
                        ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                        : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{label}</span>
                  </button>
                );
              })}
            </div>
            <section id="qc-panel-diagnostics" role="tabpanel" aria-labelledby="qc-tab-diagnostics" hidden={activeSegment !== "diagnostics"}>
              <DiagnosticPanel notify={notify} />
            </section>
            <section id="qc-panel-tracking" role="tabpanel" aria-labelledby="qc-tab-tracking" hidden={activeSegment !== "tracking"}>
              <IoTQCConsumer initialSerial={initialSerial} />
            </section>
            <section id="qc-panel-builder" role="tabpanel" aria-labelledby="qc-tab-builder" hidden={activeSegment !== "builder"}>
              <HardwareBuilder />
            </section>
          </div>
          <aside className="space-y-4">
            <SpotlightCard className="p-4">
              <div className="flex items-center justify-between">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">System clock</p>
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              </div>
              <p className="mt-3 font-mono text-2xl tabular-nums text-zinc-900 dark:text-zinc-100">{clock}</p>
              <p className="mt-1 font-mono text-[9px] text-zinc-500">LOCAL TELEMETRY SESSION</p>
            </SpotlightCard>
            <SpotlightCard className="p-4">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                <Radio className="h-4 w-4" />
                <h2 className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em]">Test environment</h2>
              </div>
              <p className="mt-2 text-xs leading-5 text-zinc-600 dark:text-zinc-400">This panel runs simulated diagnostic profiles. Results are labeled and stored as simulated reports, not physical device telemetry.</p>
            </SpotlightCard>
            <div className="px-1 font-mono text-[9px] leading-5 text-zinc-500">
              <p>NODE: VT-QC-SIM-01</p>
              <p>STATUS: READY</p>
              <p>UTC OFFSET: LOCAL</p>
            </div>
          </aside>
        </div>
        <footer className="mt-8 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200 pt-4 font-mono text-[9px] text-zinc-500 dark:border-zinc-800">
          <span>VICITECH OS · DIAGNOSTIC WORKSPACE</span>
          <span>TELEMETRY MODE: SIMULATED</span>
        </footer>
      </div>
      <CyberToast toast={toast} onDismiss={dismissToast} />
    </main>
  );
}
