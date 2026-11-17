"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, Cpu, Radio, ShieldCheck, Wrench } from "lucide-react";
import { CyberToast, type CyberToastMessage } from "./CyberUI";
import SpotlightCard from "./SpotlightCard";
import { DiagnosticPanel, HardwareBuilder } from "./CyberSuite";
import IoTQCConsumer from "./IoTQCConsumer";

type DashboardSegment = "diagnostics" | "tracking" | "builder";

const SYSTEM_STATS = [
  { label: "Test profiles", value: "04", icon: Cpu },
  { label: "Report storage", value: "Supabase", icon: ShieldCheck },
  { label: "Telemetry source", value: "Simulated", icon: Radio },
];

const SEGMENTS: Array<{ id: DashboardSegment; label: string; icon: typeof Activity }> = [
  { id: "diagnostics", label: "Diagnostics", icon: Activity },
  { id: "tracking", label: "Order tracking", icon: Radio },
  { id: "builder", label: "Hardware builder", icon: Wrench },
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
    <main className="qc-dashboard min-h-[calc(100vh-4rem)] bg-[#F6F5F2] px-4 py-8 text-[#141518] transition-colors sm:px-6 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="mt-1 grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#FF5500] text-white shadow-[0_8px_20px_rgba(255,85,0,0.16)]">
              <Activity className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#C94300]">ViciTech · Quality control</p>
              <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">IoT Diagnostics Panel</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#5A606A]">
                Inspect device health, follow order progress, and configure hardware in one workspace.
              </p>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#FF5500]/20 bg-white px-3.5 py-2 text-xs font-medium text-[#8B3100] shadow-sm">
            <Radio className="h-3.5 w-3.5 text-[#FF5500]" aria-hidden="true" />
            Simulated sensor profiles
          </div>
        </header>

        <section className="mb-6 grid gap-3 sm:grid-cols-3" aria-label="Workspace status">
          {SYSTEM_STATS.map(({ label, value, icon: Icon }) => (
            <SpotlightCard key={label} className="flex items-center justify-between rounded-2xl p-5">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#777C83]">{label}</p>
                <p className={`mt-2 text-sm font-semibold tracking-wide ${value === "Simulated" ? "text-[#C94300]" : "text-[#30343A]"}`}>{value}</p>
              </div>
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#FF5500]/[0.07] text-[#FF5500]">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
            </SpotlightCard>
          ))}
        </section>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
          <div className="min-w-0">
            <div role="tablist" aria-label="Quality control workspace" className="mb-5 grid grid-cols-3 gap-1 rounded-2xl border border-black/[0.06] bg-white/85 p-1.5 shadow-[0_8px_24px_rgba(20,21,24,0.035)]">
              {SEGMENTS.map(({ id, label, icon: Icon }) => {
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
                    className={`inline-flex min-w-0 items-center justify-center gap-2 rounded-xl px-2 py-3 text-xs font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5500]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white sm:px-3 sm:text-sm ${
                      selected
                        ? "bg-[#FF5500]/[0.07] font-semibold text-[#A83A00]"
                        : "text-[#5A606A] hover:bg-[#F6F5F2] hover:text-[#141518]"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{label}</span>
                  </button>
                );
              })}
            </div>
            <section id="qc-panel-diagnostics" role="tabpanel" aria-labelledby="qc-tab-diagnostics" hidden={activeSegment !== "diagnostics"} className="[&_h2]:font-serif">
              <DiagnosticPanel notify={notify} />
            </section>
            <section id="qc-panel-tracking" role="tabpanel" aria-labelledby="qc-tab-tracking" hidden={activeSegment !== "tracking"} className="[&_h2]:font-serif">
              <IoTQCConsumer initialSerial={initialSerial} />
            </section>
            <section id="qc-panel-builder" role="tabpanel" aria-labelledby="qc-tab-builder" hidden={activeSegment !== "builder"} className="[&_h2]:font-serif">
              <HardwareBuilder />
            </section>
          </div>

          <aside className="space-y-4">
            <SpotlightCard className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#777C83]">Local time</p>
                <span className="h-1.5 w-1.5 rounded-full bg-[#FF5500]" aria-hidden="true" />
              </div>
              <p className="mt-3 font-serif text-3xl font-semibold tabular-nums tracking-tight text-[#141518]">{clock}</p>
              <p className="mt-1 text-[10px] text-[#777C83]">Your device time</p>
            </SpotlightCard>
            <SpotlightCard className="p-5">
              <div className="flex items-center gap-2 text-[#A83A00]">
                <Radio className="h-4 w-4" aria-hidden="true" />
                <h2 className="text-xs font-semibold">Test environment</h2>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-[#5A606A]">
                This panel runs simulated diagnostic profiles. Reports are labeled as simulated and do not represent physical sensor readings.
              </p>
            </SpotlightCard>
            <div className="rounded-2xl border border-black/[0.06] bg-white/70 px-4 py-3 text-xs leading-6 text-[#777C83]">
              <p><span className="font-medium text-[#5A606A]">Node</span> · VT-QC-SIM-01</p>
              <p><span className="font-medium text-[#5A606A]">Status</span> · Ready</p>
              <p><span className="font-medium text-[#5A606A]">Clock</span> · Local</p>
            </div>
          </aside>
        </div>

        <footer className="mt-8 flex flex-wrap items-center justify-between gap-2 border-t border-black/[0.06] pt-4 text-xs text-[#777C83]">
          <span>ViciTech · Diagnostic workspace</span>
          <span>Telemetry mode: simulated</span>
        </footer>
      </div>
      <CyberToast toast={toast} onDismiss={dismissToast} />
    </main>
  );
}
