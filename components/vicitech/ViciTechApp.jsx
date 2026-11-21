"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Component, Suspense, memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  LayoutDashboard, Cpu, Sliders, RefreshCw, Activity, MessageSquare, ShieldCheck, Layers, Zap,
  Gauge, Swords, User, Building2, GraduationCap, ArrowRight, CheckCircle2, ShoppingBag, Pause, Play,
} from "lucide-react";

function ModuleLoadingSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Memuat modul ViciTech"
      className="mx-auto max-w-shell space-y-4 px-4 py-10 sm:px-6"
    >
      <div className="h-8 w-56 animate-pulse rounded-lg bg-subtle" />
      <div className="h-4 w-96 max-w-full animate-pulse rounded-md bg-subtle" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="h-44 animate-pulse rounded-xl border border-default bg-surface" />
        <div className="h-44 animate-pulse rounded-xl border border-default bg-surface" />
        <div className="h-44 animate-pulse rounded-xl border border-default bg-surface" />
      </div>
    </div>
  );
}

const HardwareLibrary = dynamic(() => import("./modules/HardwareLibrary"), {
  loading: () => <ModuleLoadingSkeleton />,
});
const UpgradeAnalyzer = dynamic(() => import("./modules/UpgradeAnalyzer"), {
  loading: () => <ModuleLoadingSkeleton />,
});
const PresetBuilder = dynamic(() => import("./modules/PresetBuilder"), {
  loading: () => <ModuleLoadingSkeleton />,
});
const TradeInPortal = dynamic(() => import("./modules/TradeInPortal"), {
  loading: () => <ModuleLoadingSkeleton />,
});
const IotQcEngine = dynamic(() => import("./modules/IotQcEngine"), {
  loading: () => <ModuleLoadingSkeleton />,
});
const BottleneckAnalyzer = dynamic(() => import("./modules/BottleneckAnalyzer"), {
  loading: () => <ModuleLoadingSkeleton />,
});
const VersusArena = dynamic(() => import("./modules/VersusArena"), {
  loading: () => <ModuleLoadingSkeleton />,
});
const AccountDashboard = dynamic(() => import("./modules/AccountDashboard"), {
  loading: () => <ModuleLoadingSkeleton />,
});
const CommunityHub = dynamic(() => import("./modules/CommunityHub"), {
  loading: () => <ModuleLoadingSkeleton />,
});
const CyberSuite = dynamic(() => import("./CyberSuite"), {
  ssr: false,
  loading: () => (
    <div className="mx-auto max-w-shell px-4 py-8 sm:px-6" aria-hidden="true">
      <div className="h-56 animate-pulse rounded-2xl border border-default bg-surface" />
    </div>
  ),
});
const WorkspaceCommandPalette = dynamic(() => import("./WorkspaceCommandPalette"), {
  ssr: false,
});
import { EditorialShowcase } from "@/components/features/editorial-showcase/editorial-showcase";
import {
  MARKET_FILTERS,
  MARKET_PREVIEW_ITEMS,
} from "@/components/features/route-preview/route-preview-content";
import { RoutePreviewExplorer } from "@/components/features/route-preview/route-preview-drawer";
import { supabase } from "@/lib/supabase";
import { forceResetAuthSession, getSupabaseBrowserClient, isSupabaseAuthConfigured } from "@/lib/supabase/client";
import { fetchOrEnsureUserProfile, isExpiredOrInvalidTokenError } from "@/lib/supabase/profile";
import { PENDING_CHECKOUT_STORAGE_KEY, useCheckout } from "@/context/CheckoutContext";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { usePageVisibility } from "@/hooks/use-page-visibility";

/*
  ViciTech workspace container. Wrapped by the single global Navbar in app/layout.tsx.
  Visited modules stay mounted with [hidden] { display: none !important; } for keep-alive state.

  Module map                           Component
  market    > ready                    Marketplace All / Ready Stock showcase
            > catalog                  HardwareLibrary      (phones, laptops, PCs, accessories)
            > upgrade                  UpgradeAnalyzer      (max RAM, NVMe slots, upgrade planner)
  builder                              PresetBuilder        (B2S / B2B / B2C configurator with live price, wattage, and JIT 5% buffer)
  tradein                              TradeInPortal        (buyback form and certified refurbished gallery)
  qc                                   IotQcEngine          (serial lookup, telemetry, 15-point QC, certificate)
  bottleneck                           BottleneckAnalyzer   (CPU + GPU + RAM + workload pairing and rebalancing)
  versus                               VersusArena          (head-to-head comparison and verdict)
  account                              AccountDashboard     (orders, trade-ins, presets, certificates vault, settings)
  community                            CommunityHub         (build showcases, guides and Q&A feed)
*/

/* ───────────────────────── Navigation model ───────────────────────── */

const MODULES = [
  {
    id: "market",
    label: "Market & Hardware Library",
    short: "Market",
    sub: "Rakitan siap pakai, katalog spesifikasi & analisis potensi upgrade",
    blurb: "Jelajahi paket rakitan terkurasi atau bandingkan spesifikasi teknis dan batas upgrade RAM/NVMe.",
    icon: ShoppingBag,
    views: [
      ["ready", "All / Ready Stock", ShoppingBag],
      ["catalog", "Hardware Library & Specs", Layers],
      ["upgrade", "Max Upgrade Analyzer", Zap],
    ],
  },
  { id: "builder", label: "Smart Preset Builder", short: "Preset Builder", sub: "Konfigurator rakitan untuk B2S, B2B, dan B2C", blurb: "Mulai dari preset teruji, ganti komponen, dan pantau estimasi daya serta harga lengkap dengan JIT buffer.", icon: Sliders },
  { id: "tradein", label: "Circular Trade-In & Buyback", short: "Trade-In", sub: "Tukar tambah aset IT dan etalase unit refurbished", blurb: "Hitung nilai buyback perangkat lama dan pilih unit refurbished bersertifikat QC.", icon: RefreshCw },
  { id: "qc", label: "IoT QC & Telemetry Engine", short: "IoT QC", sub: "Telemetri burn-in dan sertifikat QC digital", blurb: "Masukkan nomor seri untuk memeriksa log suhu burn-in, 15 titik inspeksi, dan sertifikat unit.", icon: Activity },
  { id: "bottleneck", label: "AI Bottleneck Analyzer", short: "Bottleneck AI", sub: "Kalkulasi keseimbangan CPU, GPU, RAM, dan beban kerja", blurb: "Temukan komponen yang menahan performa, estimasi FPS, dan saran penyeimbangan rakitan.", icon: Gauge },
  { id: "versus", label: "Versus Arena", short: "Versus Arena", sub: "Perbandingan spesifikasi dua perangkat berdampingan", blurb: "Bandingkan dua PC, laptop, atau smartphone secara langsung berdasarkan spesifikasi dan nilai pakai.", icon: Swords },
  { id: "account", label: "Account Dashboard", short: "Account", sub: "Pesanan, brankas sertifikat QC, preset, dan profil", blurb: "Lacak status pesanan, pengajuan trade-in, arsip sertifikat QC, serta pengaturan akun.", icon: User },
  { id: "community", label: "Community & Knowledge Hub", short: "Community", sub: "Showcase rakitan, panduan lab, dan forum tanya jawab", blurb: "Bagikan rakitan PC, pelajari panduan instalasi lab sekolah, dan diskusikan solusi teknis.", icon: MessageSquare },
];
const HOME = { id: "home", label: "Home", short: "Home", sub: "Ecosystem overview", icon: LayoutDashboard };
const NAV = [HOME, ...MODULES];
const BY_ID = Object.fromEntries(NAV.map((m) => [m.id, m]));
const DEFAULT_VIEWS = { market: "ready" };
const validView = (id, v) => BY_ID[id]?.views?.some(([k]) => k === v);

function normalizeModuleTarget(id, viewOrData) {
  if (id === "library") {
    const nextView = viewOrData === "upgrade" ? "upgrade" : "catalog";
    return ["market", nextView];
  }
  if (id === "account" && viewOrData === "community") {
    return ["community", undefined];
  }
  return [id, viewOrData];
}

function QueryParamSync({ onSync }) {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");
  const view = searchParams.get("view");
  useEffect(() => {
    onSync(tab, view);
  }, [tab, view, onSync]);
  return null;
}

const ROLES = {
  b2c: { label: "B2C Member / Creator", icon: User, greeting: "Bandingkan komponen, susun rakitan, dan bagikan hasilnya ke komunitas.", rec: ["bottleneck", "versus", "community"] },
  b2b: { label: "B2B Enterprise Admin", icon: Building2, greeting: "Kelola pengadaan perangkat organisasi, verifikasi sertifikat QC, dan pantau pesanan unit.", rec: ["qc", "tradein", "account"] },
  b2s: { label: "B2S School / CBT Lab Admin", icon: GraduationCap, greeting: "Siapkan perangkat lab sekolah dan ujian CBT lengkap dengan jaminan QC terverifikasi.", rec: ["builder", "tradein", "qc"] },
};

const ACTIONS = [
  { label: "Compare two GPUs", module: "market", view: "catalog", keys: "gpu graphics card rtx compare specs" },
  { label: "Check max RAM and NVMe slots of a laptop", module: "market", view: "upgrade", keys: "upgrade ram nvme slot max laptop pc" },
  { label: "Start the CBT Labkom preset", module: "builder", keys: "cbt lab school b2s preset" },
  { label: "Build an enterprise workstation", module: "builder", keys: "office b2b workstation" },
  { label: "Get a trade-in valuation", module: "tradein", keys: "sell buyback estimate value" },
  { label: "Look up a serial number", module: "qc", keys: "serial qr telemetry certificate" },
  { label: "Find my CPU and GPU bottleneck", module: "bottleneck", keys: "bottleneck fps pairing cpu gpu ram" },
  { label: "Compare two laptops head to head", module: "versus", keys: "versus compare laptop phone verdict" },
  { label: "Ask the community a question", module: "community", keys: "question help post forum showcase" },
  { label: "Download a QC certificate", module: "account", keys: "certificate vault order invoice settings api" },
];
const COMMANDS = [
  ...NAV.map((m) => ({ label: m.id === "home" ? "Go to Home" : `Open ${m.label}`, hint: m.sub, module: m.id, keys: `${m.label} ${m.sub}` })),
  ...ACTIONS.map((a) => ({ ...a, hint: BY_ID[a.module].label })),
];
const SERIAL_RE = /^VICI-[A-Z]{3}-\d{4}-\d{4}$/;

const EVENT_TYPES = {
  qc: { icon: ShieldCheck, target: ["qc"] },
  order: { icon: Sliders, target: ["builder"] },
  tradein: { icon: RefreshCw, target: ["tradein"] },
  price: { icon: Layers, target: ["market", "catalog"] },
  upgrade: { icon: Zap, target: ["market", "upgrade"] },
  bottleneck: { icon: Gauge, target: ["bottleneck"] },
  versus: { icon: Swords, target: ["versus"] },
  community: { icon: MessageSquare, target: ["community"] },
};
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const GENERATORS = [
  () => ["qc", `New QC Pass: VICI-${pick(["SRV", "LTP", "DSK"])}-2026-${1000 + Math.floor(Math.random() * 9000)}`],
  () => ["order", `Preset Order Submitted for ${pick(["CBT Lab Tasikmalaya", "Office Fleet Bandung", "Student Builder Jakarta"])}`],
  () => ["tradein", `Trade-In valuation requested: ${pick([6, 12, 40, 85])} ${pick(["laptops", "desktops", "monitors"])}`],
  () => { const v = Math.random() * 5 - 3; return ["price", `Price Index updated: ${pick(["RTX 4060", "Ryzen 7 7800X3D", "Core i5-12400"])} ${v > 0 ? "+" : ""}${v.toFixed(1)}%`]; },
  () => ["upgrade", `Upgrade check: ${pick(["ThinkPad T14", "OptiPlex 7090 SFF", "EliteBook 840 G9"])} can reach ${pick([32, 48, 64])} GB RAM`],
  () => ["bottleneck", `Bottleneck scan: ${pick(["i5-12400F + RTX 4070", "Ryzen 5 7600 + RTX 4060", "i3-12100F + RX 6600"])} at ${pick(["1080p", "1440p"])}`],
  () => ["versus", `Versus Arena: ${pick(["Galaxy S24 Ultra vs Xiaomi 14T Pro", "ThinkPad T14 vs Latitude 7440", "B2C rig vs Esports rig"])}`],
  () => ["community", `New build showcase posted by ${pick(["Bagas", "Nadia", "Dewi"])}`],
];
const seedEvents = () =>
  [["qc", "New QC Pass: VICI-SRV-2026-9042", 8], ["order", "Preset Order Submitted for CBT Lab Tasikmalaya", 41], ["bottleneck", "Bottleneck scan: i5-12400F + RTX 4060 at 1080p", 80], ["upgrade", "Upgrade check: ThinkPad T14 can reach 48 GB RAM", 120], ["tradein", "Trade-In valuation requested: 40 laptops", 190]]
    .map(([type, text, elapsedSec], i) => ({ id: i, type, text, elapsedSec }));

// Surface, motion and focus styles live in app/globals.css so the server and the client render
// identical markup (an inline <style> tag here caused a hydration mismatch).
const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/60 focus-visible:ring-offset-2 focus-visible:ring-offset-paper";

/* ───────────────────────── Feedback toast ───────────────────────── */

function ToastHost({ toast, onDone }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onDone, 4000);
    return () => clearTimeout(t);
  }, [toast, onDone]);
  if (!toast) return null;
  return (
    <div role="status" className="vt-in vt-metal fixed bottom-4 right-4 z-[80] flex max-w-sm items-start gap-2.5 rounded-2xl p-4 text-sm text-ink">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-signal" aria-hidden="true" />
      <span className="font-medium leading-snug">{toast.msg}</span>
    </div>
  );
}

/* ───────────────────────── Home dashboard ───────────────────────── */

function DataSourceLink({ badgeClass, badgeLabel, title, detail, onClick }) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={`flex min-h-11 w-full items-start justify-between gap-3 rounded-xl border border-default bg-surface p-3.5 text-left transition hover:border-accent-primary/40 hover:bg-subtle ${focusRing}`}
      >
        <span className="min-w-0 flex-1">
          <span className={badgeClass}>{badgeLabel}</span>
          <span className="mt-2 block text-sm font-semibold text-primary">{title}</span>
          <span className="mt-0.5 block text-xs leading-relaxed text-secondary">{detail}</span>
        </span>
        <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-secondary" strokeWidth={1.75} aria-hidden="true" />
      </button>
    </li>
  );
}

function ActivityFeed({ onNavigate }) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const isPageVisible = usePageVisibility();
  const [events, setEvents] = useState(seedEvents);
  const [userPaused, setUserPaused] = useState(false);
  const [hoverPaused, setHoverPaused] = useState(false);
  const uid = useRef(100);
  const isRunning = !prefersReducedMotion && !userPaused && !hoverPaused && isPageVisible;

  useEffect(() => {
    if (!isRunning) return undefined;
    const id = window.setInterval(() => {
      const [type, text] = pick(GENERATORS)();
      setEvents((list) =>
        [
          { id: ++uid.current, type, text, elapsedSec: 0 },
          ...list.map((item) => ({ ...item, elapsedSec: item.elapsedSec + 4 })),
        ].slice(0, 7)
      );
    }, 4000);
    return () => window.clearInterval(id);
  }, [isRunning]);

  const ago = (s) => (s < 5 ? "just now" : s < 60 ? `${s}s ago` : `${Math.floor(s / 60)} min ago`);
  return (
    <section
      aria-labelledby="feed-title"
      className="rounded-xl border border-default bg-surface p-6 shadow-sm"
      onMouseEnter={() => setHoverPaused(true)}
      onMouseLeave={() => setHoverPaused(false)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="feed-title" className="flex items-center gap-2 font-serif text-lg font-semibold text-primary">
              <Zap className="h-4 w-4 text-accent-primary" strokeWidth={1.75} aria-hidden="true" /> Aliran aktivitas
            </h2>
            <span className="vt-badge-sample">{!isRunning ? "Dijeda · Contoh" : "Contoh"}</span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-secondary">
            Simulasi aktivitas di browser sebagai ilustrasi alur kerja, bukan data transaksi pelanggan langsung.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setUserPaused((current) => !current)}
          aria-pressed={userPaused}
          aria-label={userPaused ? "Putar aliran aktivitas" : "Jeda aliran aktivitas"}
          title={userPaused ? "Putar aliran aktivitas" : "Jeda aliran aktivitas"}
          className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-default bg-subtle text-primary transition-colors hover:bg-canvas ${focusRing}`}
        >
          {userPaused || prefersReducedMotion ? (
            <Play className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
          ) : (
            <Pause className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
          )}
        </button>
      </div>
      <ul className="mt-4 divide-y divide-default">
        {events.map((e) => {
          const t = EVENT_TYPES[e.type] || EVENT_TYPES.price;
          const Icon = t.icon;
          return (
            <li key={e.id} className="vt-in">
              <button
                type="button"
                onClick={() => onNavigate(...t.target)}
                className={`flex min-h-11 w-full items-start gap-3 py-3 text-left transition-colors hover:text-accent-primary ${focusRing}`}
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
                <span className="min-w-0 flex-1 text-sm leading-snug text-primary">{e.text}</span>
                <span className="tabular-nums shrink-0 font-mono text-xs text-secondary">{ago(e.elapsedSec)}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function HomeDashboard({ role, onRoleChange, onNavigate }) {
  const r = ROLES[role] || ROLES.b2c;
  const featuredModules = MODULES.filter((m) => r.rec?.includes(m.id));
  const otherModules = MODULES.filter((m) => !r.rec?.includes(m.id));
  const primaryTarget = r.rec?.[0] || "builder";
  const primaryModule = BY_ID[primaryTarget] || BY_ID.builder;

  const dataTransparency = [
    {
      badgeClass: "vt-badge-live",
      badgeLabel: "Live ESP32 Telemetry",
      title: "IoT QC & Burn-In Sensor",
      detail: "Pembacaan suhu CPU/GPU, voltase, dan stabilitas aktual dari smart bench.",
      go: ["qc"],
    },
    {
      badgeClass: "vt-badge-simulated",
      badgeLabel: "Simulated QC Profile",
      title: "Profil Simulasi Admin",
      detail: "Skenario uji terkalibrasi yang dipisahkan secara eksplisit dari sensor fisik.",
      go: ["qc"],
    },
    {
      badgeClass: "vt-badge-sample",
      badgeLabel: "Sample Catalog",
      title: "Library Hardware & Trade-In",
      detail: "Spesifikasi acuan, estimasi harga, dan simulasi upgrade untuk riset awal.",
      go: ["market", "catalog"],
    },
  ];
  const quick = [
    ["Cek batas maksimal upgrade", "market", "upgrade"],
    ["Hitung bottleneck CPU & GPU", "bottleneck"],
    ["Cek nomor seri QC", "qc"],
    ["Lihat rakitan komunitas", "community"],
  ];
  return (
    <>
      <section className="border-b border-default pb-12" aria-labelledby="home-title">
        <div className="mx-auto grid max-w-shell gap-10 px-4 py-12 sm:px-6 lg:grid-cols-5 lg:items-center lg:py-16">
          <div className="lg:col-span-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="vt-badge-sample">{r.label}</span>
              <span className="text-xs font-medium text-secondary">Ruang Kerja Circular IT</span>
            </div>
            <h1 id="home-title" className="vt-display mt-5 max-w-2xl text-4xl text-primary [text-wrap:balance] sm:text-5xl lg:text-6xl">
              Satu ruang kerja untuk riset, rakit, dan verifikasi perangkat keras.
            </h1>
            <p className="mt-5 max-w-[68ch] text-base leading-relaxed text-secondary">
              {r.greeting} Tukar tambah, rakit preset, periksa telemetri QC, dan bandingkan spesifikasi dalam satu ekosistem.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Workspace role">
              {Object.entries(ROLES).map(([roleKey, meta]) => {
                const selected = role === roleKey;
                const RoleIcon = meta.icon;
                return (
                  <button
                    key={roleKey}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => onRoleChange?.(roleKey)}
                    className={`inline-flex min-h-11 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium transition ${focusRing} ${
                      selected
                        ? "bg-primary font-semibold text-surface"
                        : "border border-default bg-surface text-secondary hover:bg-subtle hover:text-primary"
                    }`}
                  >
                    <RoleIcon className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                    <span>{meta.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onNavigate(primaryTarget)}
                className={`inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent-primary px-5 py-2.5 text-sm font-semibold text-primary transition hover:bg-accent-hover hover:text-accent-foreground ${focusRing}`}
              >
                <span>Buka {primaryModule.short}</span>
                <ArrowRight className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate("market", "catalog")}
                className={`inline-flex min-h-11 items-center gap-2 rounded-lg border border-default bg-surface px-4 py-2.5 text-sm font-medium text-primary transition hover:bg-subtle ${focusRing}`}
              >
                <span>Jelajahi Market &amp; Library</span>
              </button>
            </div>
          </div>
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-default bg-canvas p-4 sm:p-5">
              <p className="text-xs font-semibold text-primary">Transparansi Sumber Data</p>
              <ul className="mt-3 grid gap-2.5" aria-label="Sumber data dan verifikasi">
                {dataTransparency.map((item) => (
                  <DataSourceLink key={item.badgeLabel} {...item} onClick={() => onNavigate(...item.go)} />
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-shell gap-8 px-4 py-12 sm:px-6 lg:grid-cols-3">
        <section aria-labelledby="launch-title" className="space-y-8 lg:col-span-2">
          <div>
            <h2 id="launch-title" className="font-serif text-2xl font-semibold tracking-tight text-primary [text-wrap:balance]">
              Prioritas untuk peran Anda
            </h2>
            <div className="mt-4 flex flex-wrap gap-2" aria-label="Quick actions">
              {quick.map(([label, ...go]) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => onNavigate(...go)}
                  className={`inline-flex min-h-11 items-center rounded-full border border-default bg-surface px-4 py-2 text-xs font-medium text-primary transition hover:border-accent-primary/40 hover:bg-accent-subtle ${focusRing}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {featuredModules.map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onNavigate(m.id)}
                    className={`group flex min-h-11 flex-col justify-between rounded-xl border border-default bg-accent-subtle p-5 text-left transition hover:border-accent-primary/50 ${focusRing}`}
                  >
                    <div>
                      <span className="flex items-center justify-between gap-2">
                        <span className="grid h-10 w-10 place-items-center rounded-lg bg-surface text-accent-primary shadow-sm transition group-hover:bg-accent-primary group-hover:text-primary">
                          <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
                        </span>
                        <span className="rounded-md bg-surface px-2 py-0.5 text-[11px] font-semibold text-primary">
                          Direkomendasikan
                        </span>
                      </span>
                      <span className="mt-4 block font-serif text-lg font-semibold leading-snug text-primary">
                        {m.short}
                      </span>
                      <span className="mt-1.5 block text-xs leading-relaxed text-secondary">
                        {m.blurb}
                      </span>
                    </div>
                    <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-primary group-hover:text-accent-primary">
                      Buka modul <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" strokeWidth={1.75} aria-hidden="true" />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="font-serif text-lg font-semibold tracking-tight text-primary">
              Direktori modul lainnya
            </h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {otherModules.map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onNavigate(m.id)}
                    className={`group flex min-h-11 items-start gap-3.5 rounded-xl border border-default bg-surface p-4 text-left transition hover:border-accent-primary/40 hover:bg-subtle ${focusRing}`}
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-subtle text-accent-primary transition group-hover:bg-accent-primary group-hover:text-primary">
                      <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-primary">{m.label}</span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-secondary">{m.sub}</span>
                    </span>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-secondary transition-transform group-hover:translate-x-0.5 group-hover:text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          </div>
        </section>
        <div className="lg:sticky lg:top-28 lg:self-start"><ActivityFeed onNavigate={onNavigate} /></div>
      </div>
      <EditorialShowcase onNavigate={onNavigate} />
      <CyberSuite />
    </>
  );
}

/* ───────────────────────── Module container ───────────────────────── */

// Hides a module's own header/footer (the shell provides them) and keeps it mounted when inactive
function Chromeless({ active = true, children }) {
  return <div hidden={!active} className="vt-module vt-in [&>div]:min-h-0 [&>div>header]:hidden [&>div>footer]:hidden">{children}</div>;
}

function SubTabs({ label, items, value, onChange }) {
  return (
    <div className="mx-auto max-w-shell px-4 pt-8 sm:px-6">
      <div role="tablist" aria-label={label} className="inline-flex flex-wrap gap-1 rounded-full bg-white/70 p-1.5 shadow-sm">
        {items.map(([id, text, Icon]) => {
          const on = value === id;
          return (
            <button key={id} type="button" role="tab" aria-selected={on} onClick={() => onChange(id)} className={`flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-sm transition-colors duration-200 ${focusRing} ${on ? "bg-signal text-white font-medium" : "text-pewter hover:bg-white hover:text-ink"}`}>
              <Icon className="h-4 w-4" aria-hidden="true" /> {text}
            </button>
          );
        })}
      </div>
    </div>
  );
}

class ModuleErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("[ViciTech OS] Module render failed:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <section role="alert" className="vt-card mx-auto my-8 max-w-3xl rounded-2xl p-6 text-ink">
          <h2 className="text-lg font-semibold">This module could not be displayed</h2>
          <p className="mt-2 text-sm leading-relaxed text-pewter">The rest of ViciTech is still available. Retry the module or choose another section.</p>
          <button type="button" onClick={() => this.setState({ hasError: false })} className="vt-btn vt-btn-primary mt-4">
            Retry module
          </button>
        </section>
      );
    }

    return this.props.children;
  }
}

const ModuleSlot = memo(function ModuleSlot({ Comp, active, extra }) {
  if (typeof Comp !== "function") {
    return (
      <section role="alert" className="vt-card mx-auto my-8 max-w-3xl rounded-2xl p-6 text-ink">
        <h2 className="text-lg font-semibold">This module is unavailable</h2>
        <p className="mt-2 text-sm leading-relaxed text-pewter">Its component is not configured. Choose another section or check the module imports.</p>
      </section>
    );
  }

  return (
    <ModuleErrorBoundary>
      <Chromeless active={active}><Comp {...(extra || {})} /></Chromeless>
    </ModuleErrorBoundary>
  );
});

const MarketModule = memo(function MarketModule({
  C,
  view,
  onView,
  deviceId,
  onDevice,
  onNavigate,
  onOpenBuilder,
}) {
  const isLibraryView = view === "catalog" || view === "upgrade";

  return (
    <div>
      <section className="border-b border-default bg-surface">
        <div className="mx-auto max-w-shell px-4 py-6 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="vt-badge-sample">Market &amp; Hardware Library</span>
              <h1 className="mt-2 font-serif text-2xl font-semibold tracking-tight text-primary [text-wrap:balance] sm:text-3xl">
                {isLibraryView
                  ? "Hardware Library, Specs & Upgrade Potential"
                  : "Curated Market & Ready-Stock Ecosystem"}
              </h1>
            </div>

            {/* Unified Segmented Switcher */}
            <div
              role="tablist"
              aria-label="Market mode switcher"
              className="inline-flex flex-wrap gap-1 rounded-xl border border-default bg-subtle p-1"
            >
              <button
                type="button"
                role="tab"
                aria-selected={!isLibraryView}
                onClick={() => onView("ready")}
                className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-4 py-2 text-sm transition-colors ${focusRing} ${
                  !isLibraryView
                    ? "bg-accent-primary font-semibold text-primary shadow-sm"
                    : "font-medium text-secondary hover:bg-surface hover:text-primary"
                }`}
              >
                <ShoppingBag className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                <span>All / Ready Stock</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={isLibraryView}
                onClick={() => onView("catalog")}
                className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-4 py-2 text-sm transition-colors ${focusRing} ${
                  isLibraryView
                    ? "bg-accent-primary font-semibold text-primary shadow-sm"
                    : "font-medium text-secondary hover:bg-surface hover:text-primary"
                }`}
              >
                <Layers className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                <span>Hardware Library &amp; Specs</span>
              </button>
            </div>
          </div>

          {isLibraryView && (
            <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Hardware library tools">
              <button
                type="button"
                role="tab"
                aria-selected={view === "catalog"}
                onClick={() => onView("catalog")}
                className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition ${focusRing} ${
                  view === "catalog"
                    ? "bg-primary text-surface"
                    : "border border-default bg-canvas text-secondary hover:bg-subtle hover:text-primary"
                }`}
              >
                <Layers className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                <span>Catalog &amp; Compare Specs</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={view === "upgrade"}
                onClick={() => onView("upgrade")}
                className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition ${focusRing} ${
                  view === "upgrade"
                    ? "bg-primary text-surface"
                    : "border border-default bg-canvas text-secondary hover:bg-subtle hover:text-primary"
                }`}
              >
                <Zap className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                <span>Max Upgrade Analyzer</span>
              </button>
            </div>
          )}
        </div>
      </section>

      {view === "ready" && (
        <div className="mx-auto max-w-shell space-y-8 px-4 py-8 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-default bg-surface p-5 shadow-sm">
            <p className="max-w-[68ch] text-sm leading-relaxed text-secondary">
              Pilih paket rakitan siap pakai, unit refurbished QC-pass, atau buka tab{" "}
              <strong className="font-semibold text-primary">Hardware Library &amp; Specs</strong> untuk
              membandingkan spesifikasi lengkap CPU, GPU, laptop, dan smartphone.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onView("catalog")}
                className={`inline-flex min-h-11 items-center gap-2 rounded-lg border border-default bg-subtle px-4 py-2 text-sm font-medium text-primary transition hover:bg-canvas ${focusRing}`}
              >
                <Layers className="h-4 w-4 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
                <span>Buka Library &amp; Specs</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate("builder")}
                className={`inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent-primary px-4 py-2 text-sm font-semibold text-primary transition hover:bg-accent-hover hover:text-accent-foreground ${focusRing}`}
              >
                <Sliders className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                <span>Buka Preset Builder</span>
              </button>
            </div>
          </div>

          <RoutePreviewExplorer
            kind="market"
            filters={MARKET_FILTERS}
            items={MARKET_PREVIEW_ITEMS}
            badgeText="Ready Stock · Sample"
            drawerTitle="Etalase Market & Filter Kategori"
            drawerDescription="Jelajahi paket rakitan terkurasi atau pindah ke tab Hardware Library & Specs untuk melihat perbandingan teknis hingga 4 perangkat."
            searchPlaceholder="Cari preset PC, ThinkPad QC, smartphone, atau komponen…"
          />
        </div>
      )}

      <Chromeless active={view === "catalog"}>
        <C.catalog
          onOpenBuilder={onOpenBuilder}
          onCheckUpgrade={(id) => {
            onDevice(id);
            onView("upgrade");
          }}
        />
      </Chromeless>
      <Chromeless active={view === "upgrade"}>
        <C.upgrade deviceId={deviceId} onDeviceChange={onDevice} onNavigate={onNavigate} />
      </Chromeless>
    </div>
  );
});

/* ───────────────────────── Footer ───────────────────────── */

function Footer({ onNavigate }) {
  const stack = [["Next.js", Layers], ["Supabase", Zap], ["Tailwind CSS", Sliders], ["ESP32 telemetry", Activity]];
  const link = `rounded text-sm text-pewter transition-colors duration-200 hover:text-ink ${focusRing}`;
  return (
    <footer className="mt-20 border-t border-black/[0.08]">
      <div className="mx-auto grid max-w-shell gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <p className="flex items-center gap-2 text-base font-semibold text-ink">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-signal text-white"><Cpu className="h-4 w-4" aria-hidden="true" /></span> ViciTech
          </p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-pewter">
            Hardware research, trade-ins, verified quality control and lifecycle tracking in one circular IT ecosystem.
          </p>
          <ul className="mt-5 flex flex-wrap gap-2" aria-label="Tech stack">
            {stack.map(([name, Icon]) => (
              <li key={name} className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 text-xs text-pewter shadow-sm">
                <Icon className="h-3.5 w-3.5 text-signal" aria-hidden="true" /> {name}
              </li>
            ))}
          </ul>
        </div>
        <nav aria-label="Modules">
          <p className="vt-eyebrow">Modules</p>
          <ul className="mt-3 space-y-2">
            {MODULES.map((m) => <li key={m.id}><button type="button" onClick={() => onNavigate(m.id)} className={link}>{m.short}</button></li>)}
          </ul>
        </nav>
        <div>
          <p className="vt-eyebrow flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-signal" aria-hidden="true" /> Standards</p>
          <ul className="mt-3 space-y-2">
            {["NIST 800-88 data sanitization", "15-point QC protocol", "JIT dynamic buffer policy", "Refurbished grading"].map((t) => (
              <li key={t} className="text-sm leading-relaxed text-pewter">{t}</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-black/[0.06]">
        <div className="mx-auto flex max-w-shell flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-faint sm:px-6">
          <p>© {new Date().getFullYear()} ViciTech. All rights reserved.</p>
          <p>Catalog prices, specs and scores are sample data.</p>
        </div>
      </div>
    </footer>
  );
}

/* ───────────────────────── Shell ───────────────────────── */

const DEFAULT_COMPONENTS = {
  catalog: HardwareLibrary, upgrade: UpgradeAnalyzer, builder: PresetBuilder, tradein: TradeInPortal, qc: IotQcEngine,
  bottleneck: BottleneckAnalyzer, versus: VersusArena, account: AccountDashboard, community: CommunityHub,
};
const MODULE_IDS = ["builder", "tradein", "qc", "bottleneck", "versus", "account", "community", "profile", "messages"];

export default function ViciTechApp({
  components = undefined,
  initialRole = "b2c",
  initialModule = "home",
  initialView = "",
  initialSerial = null,
  initialProfileUsername = "",
  initialMessageUsername = "",
  homeUrl = undefined,
  onSignOut = undefined,
}) {
  const { triggerCheckout } = useCheckout();
  const C = useMemo(() => ({ ...DEFAULT_COMPONENTS, ...components }), [components]);
  const [resolvedInitialModule] = normalizeModuleTarget(initialModule, initialView);
  const resolvedInitialMarketView =
    initialModule === "library"
      ? validView("market", initialView) ? initialView : "catalog"
      : validView("market", initialView) ? initialView : "ready";

  const [active, setActive] = useState(resolvedInitialModule);
  const [views, setViews] = useState(() => ({ ...DEFAULT_VIEWS, market: resolvedInitialMarketView }));
  const [visited, setVisited] = useState(() => new Set(["home", resolvedInitialModule]));
  const [role, setRole] = useState(initialRole);
  const [authState, setAuthState] = useState({ user: null, profile: null, session: null, isLoading: true });
  const [upgradeDevice, setUpgradeDevice] = useState("t14");
  const [builderConfig, setBuilderConfig] = useState(null);
  const [qcSerial, setQcSerial] = useState(initialSerial);
  const [palette, setPalette] = useState(false);
  const [toast, setToast] = useState(null);

  const notify = useCallback((msg) => setToast({ msg, n: Date.now() }), []);
  const updateAuthState = useCallback((nextAuthState) => {
    const resolvedProfile = nextAuthState?.profile ?? null;
    const baseUser = nextAuthState?.user ?? null;
    setAuthState({
      ...nextAuthState,
      profile: resolvedProfile,
      user: baseUser ? { ...baseUser, profile: resolvedProfile } : null,
    });
  }, []);
  const clearToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    if (!isSupabaseAuthConfigured) {
      setAuthState({ user: null, profile: null, session: null, isLoading: false });
      return undefined;
    }

    let client;
    try {
      client = getSupabaseBrowserClient();
    } catch {
      setAuthState({ user: null, profile: null, session: null, isLoading: false });
      return undefined;
    }
    if (!client) {
      setAuthState({ user: null, profile: null, session: null, isLoading: false });
      return undefined;
    }

    let cancelled = false;
    const syncSession = async (session) => {
      if (cancelled) return;
      if (!session?.user) {
        setAuthState({ user: null, profile: null, session: null, isLoading: false });
        return;
      }
      try {
        const { profile: resolvedProfile, error: profileError } =
          await fetchOrEnsureUserProfile(client, session.user);
        if (cancelled) return;
        if (profileError && isExpiredOrInvalidTokenError(profileError)) {
          await forceResetAuthSession(client);
          if (!cancelled) {
            setAuthState({ user: null, profile: null, session: null, isLoading: false });
          }
          return;
        }
        updateAuthState({
          user: session.user,
          profile: resolvedProfile ?? null,
          session,
          isLoading: false,
        });
      } catch (error) {
        if (cancelled) return;
        if (isExpiredOrInvalidTokenError(error)) {
          await forceResetAuthSession(client);
          setAuthState({ user: null, profile: null, session: null, isLoading: false });
          return;
        }
        updateAuthState({ user: session.user, profile: null, session, isLoading: false });
      }
    };

    client.auth.getSession().then(({ data }) => syncSession(data?.session ?? null));
    const { data: subscriptionData } = client.auth.onAuthStateChange((_event, nextSession) => {
      syncSession(nextSession ?? null);
    });

    return () => {
      cancelled = true;
      subscriptionData?.subscription?.unsubscribe();
    };
  }, [updateAuthState]);

  useEffect(() => {
    const handleAuthBroadcast = (event) => {
      if (event instanceof CustomEvent && event.detail) {
        updateAuthState(event.detail);
      }
    };
    window.addEventListener("vicitech:auth-state", handleAuthBroadcast);
    return () => window.removeEventListener("vicitech:auth-state", handleAuthBroadcast);
  }, [updateAuthState]);

  useEffect(() => {
    const handleOrderCreated = (event) => {
      if (event.detail?.id) {
        notify(`Order ${event.detail.id} was placed and saved to your ViciTech account.`);
      }
    };
    window.addEventListener("vicitech:order_created", handleOrderCreated);
    return () => window.removeEventListener("vicitech:order_created", handleOrderCreated);
  }, [notify]);

  const handleSignOut = useCallback(async () => {
    if (!supabase) {
      notify("Supabase authentication is not configured.");
      return;
    }

    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        notify(`Sign out failed: ${error.message}`);
        return;
      }
      await forceResetAuthSession(supabase);
    } catch (error) {
      notify(`Sign out failed: ${error.message}`);
      return;
    }

    try {
      await onSignOut?.();
    } catch (error) {
      notify(`Signed out, but the follow-up action failed: ${error.message}`);
      return;
    }
    notify("You have been signed out.");
  }, [notify, onSignOut]);

  useEffect(() => {
    try {
      const saved = window.sessionStorage.getItem(PENDING_CHECKOUT_STORAGE_KEY);
      if (!saved) return;
      const summary = JSON.parse(saved);
      if (!summary?.productName || !summary?.pricing || !Array.isArray(summary.items) || !summary?.specs) {
        window.sessionStorage.removeItem(PENDING_CHECKOUT_STORAGE_KEY);
        notify("The pending checkout could not be restored. Please start checkout again.");
        return;
      }
      triggerCheckout(summary);
    } catch (error) {
      window.sessionStorage.removeItem(PENDING_CHECKOUT_STORAGE_KEY);
      notify(`The pending checkout could not be restored: ${error.message}`);
    }
  }, [notify, triggerCheckout]);

  const show = useCallback((id, view) => {
    setActive(id);
    if (view) setViews((v) => ({ ...v, [id]: view }));
    setVisited((v) => (v.has(id) ? v : new Set(v).add(id)));
  }, []);

  const navigate = useCallback((rawId, rawViewOrData) => {
    let [id, viewOrData] = normalizeModuleTarget(rawId, rawViewOrData);

    if (id === "home" && homeUrl && window.location.pathname !== homeUrl) {
      window.location.assign(homeUrl);
      return;
    }

    // Direct serial lookup hand-off to IoT QC Engine
    if (id === "qc" && typeof viewOrData === "string" && SERIAL_RE.test(viewOrData.trim().toUpperCase())) {
      const serial = viewOrData.trim().toUpperCase();
      setQcSerial(serial);
      notify(`Inspecting serial ${serial} in IoT QC Engine.`);
      viewOrData = undefined;
    }

    // Custom configuration or hardware parts hand-off to Preset Builder
    if (id === "builder" && viewOrData && typeof viewOrData === "object") {
      setBuilderConfig(viewOrData);
      if (viewOrData.name) {
        notify(`Preset "${viewOrData.name}" loaded into Preset Builder.`);
      } else if (viewOrData.items?.length) {
        notify(`${viewOrData.items.length} items sent to Preset Builder.`);
      } else {
        notify("Hardware configuration transferred to Preset Builder.");
      }
      viewOrData = undefined;
    }

    const v = validView(id, viewOrData) ? viewOrData : undefined;
    show(id, v);
    setPalette(false);
    const hash = `#${id}${v ? `/${v}` : ""}`;
    if (window.location.hash !== hash) window.history.pushState(null, "", hash);
    window.dispatchEvent(new CustomEvent("vicitech:module-change", { detail: { module: id, view: v } }));
    window.scrollTo(0, 0);
  }, [show, notify, homeUrl]);

  const handleQuerySync = useCallback((tab, view) => {
    if (window.location.hash) return;
    if (tab) {
      const [normId, normView] = normalizeModuleTarget(tab, view);
      if (BY_ID[normId]) {
        show(normId, validView(normId, normView) ? normView : undefined);
        return;
      }
    }
    if (resolvedInitialModule === "market") {
      const marketView = view === "library" ? "catalog" : view;
      if (validView("market", marketView)) {
        show("market", marketView);
      }
    }
  }, [show, resolvedInitialModule]);

  // The URL hash mirrors the active view (deep links and the back button)
  useEffect(() => {
    const read = () => {
      if (["qc", "profile", "messages"].includes(resolvedInitialModule)) {
        show(resolvedInitialModule);
        if (window.location.hash) {
          window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}`);
        }
        return;
      }
      const rawHash = window.location.hash.slice(1);
      if (!rawHash) {
        if (typeof window !== "undefined") {
          const params = new URLSearchParams(window.location.search);
          const tab = params.get("tab");
          const view = params.get("view");
          if (tab) {
            const [normId, normView] = normalizeModuleTarget(tab, view);
            if (BY_ID[normId]) {
              show(normId, validView(normId, normView) ? normView : undefined);
              return;
            }
          }
          if (resolvedInitialModule === "market") {
            const marketView = view === "library" ? "catalog" : view;
            show("market", validView("market", marketView) ? marketView : resolvedInitialMarketView);
            return;
          }
        }
        if (resolvedInitialModule === "home") show("home");
        else if (BY_ID[resolvedInitialModule]) show(resolvedInitialModule);
        return;
      }
      const [rawId, rawView] = rawHash.split("/");
      const [id, view] = normalizeModuleTarget(rawId, rawView);
      if (!BY_ID[id]) return show("home");
      show(id, validView(id, view) ? view : undefined);
    };
    read();
    window.addEventListener("hashchange", read);
    window.addEventListener("popstate", read);
    return () => {
      window.removeEventListener("hashchange", read);
      window.removeEventListener("popstate", read);
    };
  }, [show, resolvedInitialModule, resolvedInitialMarketView]);

  useEffect(() => {
    if (BY_ID[active]) {
      document.title = `${BY_ID[active].label} | ViciTech OS`;
    }
    window.dispatchEvent(new CustomEvent("vicitech:module-change", { detail: { module: active, view: views[active] } }));
  }, [active, views]);

  // Global Navbar events: Cmd/Ctrl+K command palette + in-app module navigation
  useEffect(() => {
    const handleOpenPalette = (event) => {
      event.preventDefault();
      setPalette((v) => !v);
    };
    const handleNavigateModule = (event) => {
      if (event instanceof CustomEvent && event.detail?.module) {
        navigate(event.detail.module, event.detail.view);
      }
    };
    window.addEventListener("vicitech:open-command-palette", handleOpenPalette);
    window.addEventListener("vicitech:navigate-module", handleNavigateModule);
    return () => {
      window.removeEventListener("vicitech:open-command-palette", handleOpenPalette);
      window.removeEventListener("vicitech:navigate-module", handleNavigateModule);
    };
  }, [navigate]);

  const closePalette = useCallback(() => setPalette(false), []);
  const handlePaletteSelect = useCallback((it) => navigate(it.module, it.view), [navigate]);
  const marketView = useCallback((v) => navigate("market", v), [navigate]);
  const handleMarketOpenBuilder = useCallback((items) => {
    setBuilderConfig({ items });
    notify("Selected hardware sent to Preset Builder.");
    navigate("builder");
  }, [navigate, notify]);

  // Cross-module prop hand-offs
  const extras = useMemo(() => ({
    builder: {
      role,
      userId: authState.user?.id,
      importedConfig: builderConfig,
      onNavigate: navigate,
      onOpenEngine: (serial) => {
        if (serial) setQcSerial(serial);
        navigate("qc", serial);
      },
    },
    tradein: {
      onNavigate: navigate,
      onOpenBuilder: (items) => {
        if (items) setBuilderConfig({ items });
        navigate("builder");
      },
      onOpenEngine: () => navigate("qc"),
    },
    qc: {
      initialSerial: qcSerial,
      onNavigate: navigate,
      onOpenBuilder: () => navigate("builder"),
      onOpenTradeIn: () => navigate("tradein"),
    },
    bottleneck: {
      onSwapToPreset: (parts) => {
        setBuilderConfig(parts);
        notify("Rebalanced configuration sent to Preset Builder.");
        navigate("builder");
      },
    },
    versus: {
      onDeployToPreset: (item) => {
        setBuilderConfig({ items: [item] });
        notify(`${item.name} queued for Preset Builder.`);
        navigate("builder");
      },
      onRequestQuote: (item) => notify(`Quote request created for ${item.name}.`),
    },
    account: {
      role,
      user: authState.user,
      isAuthLoading: authState.isLoading,
      onRoleChange: setRole,
      onNavigate: navigate,
      onReconfigure: (preset) => {
        setBuilderConfig({ preset });
        notify(`Preset "${preset.name}" loaded into Preset Builder.`);
        navigate("builder");
      },
      onSignOut: handleSignOut,
    },
    community: {
      onNavigate: navigate,
      user: authState.user,
    },
    profile: {
      username: initialProfileUsername,
      user: authState.user,
      isAuthLoading: authState.isLoading,
    },
    messages: {
      user: authState.user,
      isAuthLoading: authState.isLoading,
      initialUsername: initialMessageUsername,
    },
  }), [role, authState, builderConfig, qcSerial, navigate, notify, handleSignOut, initialProfileUsername, initialMessageUsername]);

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-primary font-sans antialiased">
      <Suspense fallback={null}>
        <QueryParamSync onSync={handleQuerySync} />
      </Suspense>

      <main className="flex-1">
        {active === "home" && (
          <div className="vt-in">
            <HomeDashboard role={role} onRoleChange={setRole} onNavigate={navigate} />
          </div>
        )}

        {(active === "tradein" || active === "qc") && resolvedInitialModule !== "qc" && (
          <div className="border-b border-default bg-surface">
            <div className="mx-auto flex max-w-shell flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
              <div>
                <p className="text-xs font-semibold text-primary">Trade-In &amp; IoT QC Workspace</p>
                <p className="text-xs text-secondary">Beralih antara estimasi buyback sirkular dan engine inspeksi serial IoT.</p>
              </div>
              <div role="tablist" aria-label="Trade-In and QC switcher" className="inline-flex flex-wrap gap-1 rounded-xl border border-default bg-subtle p-1">
                <button
                  type="button"
                  role="tab"
                  aria-selected={active === "tradein"}
                  onClick={() => navigate("tradein")}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-4 py-2 text-xs transition-colors ${focusRing} ${
                    active === "tradein"
                      ? "bg-accent-primary font-semibold text-primary shadow-sm"
                      : "font-medium text-secondary hover:bg-surface hover:text-primary"
                  }`}
                >
                  <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                  <span>Circular Trade-In &amp; Buyback</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={active === "qc"}
                  onClick={() => navigate("qc")}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-4 py-2 text-xs transition-colors ${focusRing} ${
                    active === "qc"
                      ? "bg-accent-primary font-semibold text-primary shadow-sm"
                      : "font-medium text-secondary hover:bg-surface hover:text-primary"
                  }`}
                >
                  <Activity className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                  <span>IoT QC &amp; Telemetry Engine</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {visited.has("market") && (
          <div hidden={active !== "market"}>
            <MarketModule
              C={C}
              view={views.market}
              onView={marketView}
              deviceId={upgradeDevice}
              onDevice={setUpgradeDevice}
              onNavigate={navigate}
              onOpenBuilder={handleMarketOpenBuilder}
            />
          </div>
        )}
        {MODULE_IDS.filter((id) => visited.has(id)).map((id) => (
          <ModuleSlot key={id} Comp={C[id]} active={active === id} extra={extras[id]} />
        ))}
      </main>

      <Footer onNavigate={navigate} />
      {palette && (
        <WorkspaceCommandPalette
          onClose={closePalette}
          onSelect={handlePaletteSelect}
          commands={COMMANDS}
          byId={BY_ID}
          serialRe={SERIAL_RE}
        />
      )}
      <ToastHost toast={toast} onDone={clearToast} />
    </div>
  );
}
