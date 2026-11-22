"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Radio } from "lucide-react";

const IoTQCConsumer = dynamic(() => import("./IoTQCConsumer"), {
  loading: () => (
    <div
      role="status"
      aria-live="polite"
      aria-label="Memuat engine telemetri IoT QC"
      className="space-y-4 rounded-2xl border border-[#E4E4E7] bg-[#FFFFFF] p-6"
    >
      <div className="h-6 w-48 animate-pulse rounded-md bg-[#F3F1ED]" />
      <div className="h-11 w-full animate-pulse rounded-xl bg-[#F3F1ED]" />
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="h-24 animate-pulse rounded-xl bg-[#F3F1ED]" />
        <div className="h-24 animate-pulse rounded-xl bg-[#F3F1ED]" />
        <div className="h-24 animate-pulse rounded-xl bg-[#F3F1ED]" />
      </div>
    </div>
  ),
});

export default function QCPanelDashboard() {
  const [clock, setClock] = useState("00:00:00");
  const [initialSerial, setInitialSerial] = useState("");
  const [telemetrySource, setTelemetrySource] = useState("idle");

  useEffect(() => {
    const updateClock = () => setClock(new Date().toLocaleTimeString("id-ID", { hour12: false }));
    updateClock();
    const intervalId = window.setInterval(updateClock, 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const order = new URLSearchParams(window.location.search).get("order");
    if (order) {
      setInitialSerial(order);
    }
  }, []);

  const sourceMeta =
    telemetrySource === "esp32"
      ? {
          badgeClass: "vt-badge-live",
          badgeLabel: "Live ESP32",
          description: "Pembacaan suhu, kipas, dan voltase langsung dari sensor smart bench ESP32.",
          footerLabel: "Live ESP32",
          statusLabel: "Aktif (Sensor Fisik)",
        }
      : telemetrySource === "admin_simulation"
        ? {
            badgeClass: "vt-badge-simulated",
            badgeLabel: "Simulasi Admin",
            description: "Data berasal dari profil simulasi admin dan dipisahkan dari sensor fisik.",
            footerLabel: "Simulasi Admin",
            statusLabel: "Simulasi Terkontrol",
          }
        : {
            badgeClass: "vt-badge-sample",
            badgeLabel: "Menunggu Data Serial",
            description: "Masukkan nomor seri unit atau pesanan untuk melacak telemetri IoT QC secara transparan.",
            footerLabel: "Menunggu pencarian serial",
            statusLabel: "Siap Melacak",
          };

  return (
    <main className="qc-dashboard min-h-[calc(100vh-4.5rem)] bg-canvas px-4 py-12 text-primary sm:px-6 md:py-16">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10 flex flex-wrap items-end justify-between gap-6 border-b border-[#E4E4E7] pb-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#EA580C]">
              IoT QC 15-Titik · Pelacakan Serial
            </p>
            <h1 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-[#18181B] sm:text-4xl lg:text-5xl">
              Panel Diagnostik IoT QC
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#71717A] sm:text-base">
              Verifikasi kesehatan perangkat, progres burn-in, dan sumber data sensor secara transparan.
            </p>
          </div>
          <span className={sourceMeta.badgeClass}>{sourceMeta.badgeLabel}</span>
        </header>

        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-10">
          <div className="min-w-0">
            <section id="qc-panel-tracking" aria-label="Pelacakan pesanan" className="[&_h2]:font-serif">
              <IoTQCConsumer
                embedded
                initialSerial={initialSerial}
                onTelemetrySourceChange={setTelemetrySource}
              />
            </section>
          </div>

          <aside className="rounded-2xl border border-[#E4E4E7] bg-[#FFFFFF] divide-y divide-[#E4E4E7] lg:sticky lg:top-24">
            <div className="p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#71717A]">Waktu Lokal</p>
              <p className="mt-2 font-serif text-3xl font-semibold tabular-nums tracking-tight text-[#18181B]">{clock}</p>
            </div>

            <div className="p-5">
              <div className="flex items-center gap-2 text-[#18181B]">
                <Radio className="h-4 w-4 text-[#EA580C]" strokeWidth={1.75} aria-hidden="true" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[#71717A]">Sumber Data</h2>
              </div>
              <p className="mt-2 text-sm font-semibold text-[#18181B]">{sourceMeta.statusLabel}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-[#71717A]">
                {sourceMeta.description}
              </p>
            </div>

            <div className="p-5 text-xs leading-6 text-[#71717A]">
              <p>Penyimpanan · <span className="font-medium text-[#18181B]">Supabase Realtime</span></p>
              <p>Mode · <span className="font-medium text-[#18181B]">{sourceMeta.footerLabel}</span></p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
