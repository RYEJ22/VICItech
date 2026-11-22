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
  { label: "Mesin Telemetri", value: "IoT QC", icon: Cpu },
  { label: "Penyimpanan Laporan", value: "Supabase", icon: ShieldCheck },
  { label: "Mode Inspeksi", value: "Pelacakan Pesanan", icon: Radio },
];

export default function QCPanelDashboard() {
  const [clock, setClock] = useState("00:00:00");
  const [initialSerial, setInitialSerial] = useState("");

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

  return (
    <main className="qc-dashboard min-h-[calc(100vh-4rem)] bg-canvas px-4 py-8 text-primary transition-colors sm:px-6 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="mt-1 grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-accent-primary text-white shadow-sm">
              <Activity className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-hover">ViciTech · Kontrol Kualitas</p>
              <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-primary sm:text-4xl">Panel Diagnostik IoT QC</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-secondary">
                Periksa kesehatan perangkat, pantau progres pesanan, dan verifikasi data IoT QC dalam satu ruang kerja.
              </p>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-accent-primary/25 bg-surface px-3.5 py-2 text-xs font-medium text-accent-hover shadow-sm">
            <Radio className="h-3.5 w-3.5 text-accent-primary" aria-hidden="true" />
            Profil sensor simulasi
          </div>
        </header>

        <section className="mb-6 grid gap-3 sm:grid-cols-3" aria-label="Status ruang kerja">
          {SYSTEM_STATS.map(({ label, value, icon: Icon }) => (
            <SpotlightCard key={label} className="flex items-center justify-between p-5">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-secondary">{label}</p>
                <p className="mt-2 text-sm font-semibold tracking-wide text-primary">{value}</p>
              </div>
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent-subtle text-accent-primary">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
            </SpotlightCard>
          ))}
        </section>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
          <div className="min-w-0">
            <section id="qc-panel-tracking" aria-label="Pelacakan pesanan" className="[&_h2]:font-serif">
              <IoTQCConsumer initialSerial={initialSerial} />
            </section>
          </div>

          <aside className="space-y-4">
            <SpotlightCard className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-secondary">Waktu Lokal</p>
                <span className="h-1.5 w-1.5 rounded-full bg-accent-primary" aria-hidden="true" />
              </div>
              <p className="mt-3 font-serif text-3xl font-semibold tabular-nums tracking-tight text-primary">{clock}</p>
              <p className="mt-1 text-[10px] text-secondary">Waktu perangkat Anda</p>
            </SpotlightCard>
            <SpotlightCard className="p-5">
              <div className="flex items-center gap-2 text-accent-hover">
                <Radio className="h-4 w-4 text-accent-primary" aria-hidden="true" />
                <h2 className="text-xs font-semibold">Lingkungan Uji</h2>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-secondary">
                Panel ini menjalankan profil diagnostik simulasi. Laporan ditandai sebagai simulasi dan bukan pembacaan sensor fisik.
              </p>
            </SpotlightCard>
            <div className="rounded-xl border border-default bg-surface px-4 py-3 text-xs leading-6 text-secondary">
              <p><span className="font-medium text-primary">Node</span> · VT-QC-SIM-01</p>
              <p><span className="font-medium text-primary">Status</span> · Siap</p>
              <p><span className="font-medium text-primary">Jam</span> · Lokal</p>
            </div>
          </aside>
        </div>

        <footer className="mt-8 flex flex-wrap items-center justify-between gap-2 border-t border-default pt-4 text-xs text-secondary">
          <span>ViciTech · Ruang kerja diagnostik</span>
          <span>Mode telemetri: simulasi</span>
        </footer>
      </div>
    </main>
  );
}
