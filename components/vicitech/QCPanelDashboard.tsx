"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Activity, Cpu, Radio, ShieldCheck } from "lucide-react";
import SpotlightCard from "./SpotlightCard";

const IoTQCConsumer = dynamic(() => import("./IoTQCConsumer"), {
  loading: () => (
    <div
      role="status"
      aria-live="polite"
      aria-label="Memuat engine telemetri IoT QC"
      className="space-y-4 rounded-xl border border-default bg-surface p-6"
    >
      <div className="h-6 w-48 animate-pulse rounded-md bg-subtle" />
      <div className="h-11 w-full animate-pulse rounded-xl bg-subtle" />
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="h-24 animate-pulse rounded-xl bg-subtle" />
        <div className="h-24 animate-pulse rounded-xl bg-subtle" />
        <div className="h-24 animate-pulse rounded-xl bg-subtle" />
      </div>
    </div>
  ),
});

const SYSTEM_STATS = [
  { label: "Mesin Telemetri", value: "IoT QC 15-Titik", icon: Cpu },
  { label: "Penyimpanan Laporan", value: "Supabase Realtime", icon: ShieldCheck },
  { label: "Mode Inspeksi", value: "Pelacakan Serial & Order", icon: Radio },
];

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
          description: "Menampilkan pembacaan suhu, kipas, dan voltase langsung dari sensor smart bench ESP32.",
          footerLabel: "Live ESP32",
          statusLabel: "Aktif (Sensor Fisik)",
        }
      : telemetrySource === "admin_simulation"
        ? {
            badgeClass: "vt-badge-simulated",
            badgeLabel: "Simulated / Demo",
            description: "Data yang tampil saat ini berasal dari profil uji simulasi admin (Demo) dan dipisahkan secara eksplisit dari sensor fisik ESP32.",
            footerLabel: "Simulated / Demo",
            statusLabel: "Simulasi / Demo Terkontrol",
          }
        : {
            badgeClass: "vt-badge-sample",
            badgeLabel: "Menunggu Data Serial",
            description: "Masukkan nomor seri unit atau nomor pesanan untuk melihat profil Simulated / Demo maupun telemetri sensor fisik ESP32 terverifikasi.",
            footerLabel: "Menunggu pencarian serial",
            statusLabel: "Siap Melacak",
          };

  return (
    <main className="qc-dashboard min-h-[calc(100vh-4rem)] bg-canvas px-4 pb-24 pt-8 text-primary transition-colors sm:px-6 sm:pb-24 sm:pt-10 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="mt-1 grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-accent-primary text-white shadow-card">
              <Activity className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-primary">
                ViciTech · Kontrol Kualitas
              </p>
              <h1 className="mt-2 font-sans text-3xl font-extrabold tracking-tight text-primary [text-wrap:balance] sm:text-4xl">
                Panel Diagnostik IoT QC
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-secondary">
                Periksa kesehatan perangkat, pantau progres pesanan, dan verifikasi sumber data IoT QC secara transparan.
              </p>
            </div>
          </div>
          <span className={sourceMeta.badgeClass}>{sourceMeta.badgeLabel}</span>
        </header>

        <section className="mb-6 grid gap-3 sm:grid-cols-3" aria-label="Status ruang kerja">
          {SYSTEM_STATS.map(({ label, value, icon: Icon }) => (
            <SpotlightCard key={label} className="flex items-center justify-between p-5">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-secondary">{label}</p>
                <p className="mt-2 text-sm font-semibold tracking-wide text-primary">{value}</p>
              </div>
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-accent-subtle text-accent-primary">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
            </SpotlightCard>
          ))}
        </section>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
          <div className="min-w-0">
            <section id="qc-panel-tracking" aria-label="Pelacakan pesanan" className="[&_h2]:font-sans">
              <IoTQCConsumer
                initialSerial={initialSerial}
                onTelemetrySourceChange={setTelemetrySource}
              />
            </section>
          </div>

          <aside className="space-y-4">
            <div className="vt-obsidian-panel rounded-xl p-5">
              <div className="flex items-center justify-between">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#A1A1AA]">
                  Waktu Telemetri
                </p>
                <span className="h-2 w-2 rounded-full bg-accent-primary" aria-hidden="true" />
              </div>
              <p className="mt-3 font-mono text-3xl font-bold tabular-nums tracking-tight text-[#FAFAFA]">
                {clock}
              </p>
              <p className="mt-1 text-[11px] text-[#A1A1AA]">Sinkron waktu perangkat Anda</p>
            </div>
            <SpotlightCard className="p-5">
              <div className="flex items-center gap-2 text-accent-cta">
                <Radio className="h-4 w-4 text-accent-primary" aria-hidden="true" />
                <h2 className="tracking-tight text-xs font-bold">Sumber Data Aktif</h2>
              </div>
              <div className="mt-2">
                <span className={sourceMeta.badgeClass}>{sourceMeta.badgeLabel}</span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-secondary">
                {sourceMeta.description}
              </p>
            </SpotlightCard>
            <div className="rounded-xl border border-default bg-surface px-4 py-3 text-xs leading-6 text-secondary">
              <p><span className="font-medium text-primary">Status</span> · {sourceMeta.statusLabel}</p>
              <p><span className="font-medium text-primary">Sumber</span> · {sourceMeta.footerLabel}</p>
              <p><span className="font-medium text-primary">Jam</span> · Lokal</p>
            </div>
          </aside>
        </div>

        <footer className="mt-8 flex flex-wrap items-center justify-between gap-2 border-t border-default pt-4 text-xs text-secondary">
          <span>ViciTech · Panel Diagnostik IoT QC</span>
          <span>Mode telemetri: {sourceMeta.footerLabel}</span>
        </footer>
      </div>
    </main>
  );
}
