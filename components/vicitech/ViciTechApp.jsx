"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Component, Suspense, memo, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  LayoutDashboard, Cpu, Sliders, RefreshCw, Activity, MessageSquare, Package, ShieldCheck, Layers, Zap,
  Gauge, Swords, User, Building2, GraduationCap, ArrowRight, CheckCircle2, ShoppingBag,
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
const WorkspaceCommandPalette = dynamic(() => import("./WorkspaceCommandPalette"), {
  ssr: false,
});
import { MarketStorefront } from "@/components/features/market/market-storefront";
import { supabase } from "@/lib/supabase";
import { forceResetAuthSession, getSupabaseBrowserClient, isSupabaseAuthConfigured } from "@/lib/supabase/client";
import { fetchOrEnsureUserProfile, isExpiredOrInvalidTokenError } from "@/lib/supabase/profile";
import { PENDING_CHECKOUT_STORAGE_KEY, useCheckout } from "@/context/CheckoutContext";

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
      ["ready", "Semua / Siap Kirim", ShoppingBag],
      ["catalog", "Hardware Library & Spesifikasi", Layers],
      ["upgrade", "Analisis Upgrade Maksimal", Zap],
    ],
  },
  { id: "builder", label: "Smart Preset Builder", short: "Preset Builder", sub: "Konfigurator rakitan untuk B2S, B2B, dan B2C", blurb: "Mulai dari preset teruji, ganti komponen, dan pantau estimasi daya serta harga lengkap dengan JIT buffer.", icon: Sliders },
  { id: "tradein", label: "Circular Trade-In & Buyback", short: "Trade-In", sub: "Tukar tambah aset IT dan etalase unit refurbished", blurb: "Hitung nilai buyback perangkat lama dan pilih unit refurbished bersertifikat IoT QC.", icon: RefreshCw },
  { id: "qc", label: "Mesin IoT QC & Telemetri", short: "IoT QC", sub: "Telemetri Burn-In dan sertifikat IoT QC digital", blurb: "Masukkan nomor seri untuk memeriksa log suhu Burn-In, 15 titik inspeksi, dan sertifikat unit.", icon: Activity },
  { id: "bottleneck", label: "Analisis Bottleneck AI", short: "Bottleneck AI", sub: "Kalkulasi keseimbangan CPU, GPU, RAM, dan beban kerja", blurb: "Temukan komponen yang menahan performa, estimasi FPS, dan saran penyeimbangan rakitan.", icon: Gauge },
  { id: "versus", label: "Versus Arena", short: "Versus Arena", sub: "Perbandingan spesifikasi dua perangkat berdampingan", blurb: "Bandingkan dua PC, laptop, atau smartphone secara langsung berdasarkan spesifikasi dan nilai pakai.", icon: Swords },
  { id: "account", label: "Profil & Akun", short: "Profil & Akun", sub: "Kartu profil, pesanan, preset & pengaturan", blurb: "Kelola kartu profil publik, riwayat pesanan Market/Trade-In, preset tersimpan, dan kustomisasi akun.", icon: User },
  { id: "community", label: "Komunitas & Pusat Pengetahuan", short: "Komunitas", sub: "Showcase rakitan, panduan lab, dan forum tanya jawab", blurb: "Bagikan rakitan PC, pelajari panduan instalasi lab sekolah, dan diskusikan solusi teknis.", icon: MessageSquare },
];
const HOME = { id: "home", label: "Beranda", short: "Beranda", sub: "Ringkasan ekosistem", icon: LayoutDashboard };
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
  const productId = searchParams.get("productId");
  useEffect(() => {
    onSync(tab, view, productId);
  }, [tab, view, productId, onSync]);
  return null;
}

const ROLES = {
  b2c: { label: "Anggota / Kreator B2C", icon: User, greeting: "Bandingkan komponen, susun rakitan, dan bagikan hasilnya ke komunitas.", rec: ["bottleneck", "versus", "community"] },
  b2b: { label: "Admin Enterprise B2B", icon: Building2, greeting: "Kelola pengadaan perangkat organisasi, verifikasi sertifikat IoT QC, dan pantau pesanan unit.", rec: ["qc", "tradein", "account"] },
  b2s: { label: "Admin Lab Sekolah / CBT (B2S)", icon: GraduationCap, greeting: "Siapkan perangkat lab sekolah dan ujian CBT lengkap dengan jaminan IoT QC terverifikasi.", rec: ["builder", "tradein", "qc"] },
};

const ACTIONS = [
  { label: "Bandingkan dua GPU", module: "market", view: "catalog", keys: "gpu graphics card rtx compare specs" },
  { label: "Cek batas RAM dan slot NVMe laptop", module: "market", view: "upgrade", keys: "upgrade ram nvme slot max laptop pc" },
  { label: "Mulai preset CBT Labkom", module: "builder", keys: "cbt lab school b2s preset" },
  { label: "Rakit workstation kantor enterprise", module: "builder", keys: "office b2b workstation" },
  { label: "Hitung estimasi Trade-In perangkat", module: "tradein", keys: "sell buyback estimate value" },
  { label: "Cek nomor seri IoT QC", module: "qc", keys: "serial qr telemetry certificate" },
  { label: "Temukan bottleneck CPU dan GPU", module: "bottleneck", keys: "bottleneck fps pairing cpu gpu ram" },
  { label: "Bandingkan dua laptop di Versus Arena", module: "versus", keys: "versus compare laptop phone verdict" },
  { label: "Ajukan pertanyaan di Komunitas", module: "community", keys: "question help post forum showcase" },
  { label: "Unduh sertifikat IoT QC", module: "account", keys: "certificate vault order invoice settings api" },
];
const COMMANDS = [
  ...NAV.map((m) => ({ label: m.id === "home" ? "Buka Beranda" : `Buka ${m.label}`, hint: m.sub, module: m.id, keys: `${m.label} ${m.sub}` })),
  ...ACTIONS.map((a) => ({ ...a, hint: BY_ID[a.module].label })),
];
const SERIAL_RE = /^VICI-[A-Z]{3}-\d{4}-\d{4}$/;

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
    <div role="status" className="vt-in fixed bottom-4 right-4 z-[80] flex max-w-sm items-start gap-2.5 rounded-xl border border-default bg-surface p-4 text-sm text-primary shadow-floating">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent-primary" aria-hidden="true" />
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

const COMMUNITY_CATEGORY_LABELS = {
  hardware: "Hardware",
  build_showcase: "Showcase",
  gaming: "Gaming",
  dev: "Dev & Coding",
  creative: "Kreatif",
  troubleshooting: "Tanya Jawab",
  general: "Panduan",
  meme: "Meme",
  news: "Info Resmi",
};

const OPERATE_QUICK_TOOLS = [
  { label: "Cek Serial IoT QC", hint: "Verifikasi log Burn-In", module: "qc", icon: Activity },
  { label: "Analisis Upgrade Maksimal", hint: "Cek slot RAM & NVMe", module: "market", view: "upgrade", icon: Zap },
  { label: "Analisis Bottleneck AI", hint: "Uji keseimbangan CPU/GPU", module: "bottleneck", icon: Gauge },
];

const formatCompactIdr = (value) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(value) || 0);

function WorkspacePulsePanel({ user, isAuthLoading, onNavigate }) {
  const [recentOrders, setRecentOrders] = useState([]);
  const [recentPosts, setRecentPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthLoading) return undefined;
    if (!isSupabaseAuthConfigured) {
      setRecentOrders([]);
      setRecentPosts([]);
      setLoading(false);
      return undefined;
    }

    let active = true;
    setLoading(true);

    async function loadOperationalSnapshot() {
      try {
        const client = getSupabaseBrowserClient();
        const postsPromise = client
          .from("community_posts")
          .select("id, title, category, likes_count, created_at")
          .order("created_at", { ascending: false })
          .limit(3);

        const ordersPromise = user?.id
          ? client
              .from("orders")
              .select("id, order_number, product_name, status, total_price, created_at")
              .eq("user_id", user.id)
              .order("created_at", { ascending: false })
              .limit(3)
          : Promise.resolve({ data: [], error: null });

        const [ordersResult, postsResult] = await Promise.all([ordersPromise, postsPromise]);
        if (!active) return;

        setRecentOrders(!ordersResult.error && Array.isArray(ordersResult.data) ? ordersResult.data : []);
        setRecentPosts(!postsResult.error && Array.isArray(postsResult.data) ? postsResult.data : []);
      } catch {
        if (active) {
          setRecentOrders([]);
          setRecentPosts([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadOperationalSnapshot();
    return () => {
      active = false;
    };
  }, [user?.id, isAuthLoading]);

  return (
    <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start" aria-label="Ringkasan operasional">
      <section aria-labelledby="orders-rail-title" className="rounded-xl border border-default bg-surface p-5 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h2 id="orders-rail-title" className="tracking-tight flex items-center gap-2 font-sans text-lg font-bold text-primary">
            <Package className="h-4 w-4 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
            {user ? "Pesanan Terbaru" : "Alat Cepat"}
          </h2>
          {user && (
            <Link
              href="/profile?tab=orders"
              className={`inline-flex min-h-9 items-center rounded-full px-2.5 text-xs font-medium text-accent-primary transition hover:bg-accent-subtle ${focusRing}`}
            >
              Semua pesanan
            </Link>
          )}
        </div>

        {loading ? (
          <div className="mt-3 space-y-2.5" aria-hidden="true">
            <div className="h-14 animate-pulse rounded-lg bg-subtle" />
            <div className="h-14 animate-pulse rounded-lg bg-subtle" />
          </div>
        ) : user && recentOrders.length > 0 ? (
          <ul className="mt-3 divide-y divide-default">
            {recentOrders.map((order) => (
              <li key={order.id}>
                <button
                  type="button"
                  onClick={() => onNavigate("account")}
                  className={`flex min-h-11 w-full items-start justify-between gap-3 py-3 text-left transition-colors hover:text-accent-primary ${focusRing}`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-primary">
                      {order.product_name || order.order_number || "Pesanan ViciTech"}
                    </span>
                    <span className="mt-0.5 block truncate font-mono text-xs text-secondary">
                      {order.status || "Diproses"}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-xs font-semibold tabular-nums text-primary">
                    {formatCompactIdr(order.total_price)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-3 space-y-2">
            {user && (
              <p className="text-xs leading-relaxed text-secondary">
                Belum ada pesanan aktif di akun Anda. Mulai rakit dari Preset Builder atau luncurkan alat berikut:
              </p>
            )}
            <div className="grid gap-2">
              {OPERATE_QUICK_TOOLS.map((tool) => {
                const Icon = tool.icon;
                return (
                  <button
                    key={tool.label}
                    type="button"
                    onClick={() => onNavigate(tool.module, tool.view)}
                    className={`flex min-h-11 w-full items-center gap-3 rounded-lg border border-default bg-canvas px-3 py-2 text-left transition hover:border-accent-primary/40 hover:bg-subtle ${focusRing}`}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-primary">{tool.label}</span>
                      <span className="block text-xs text-secondary">{tool.hint}</span>
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-secondary" strokeWidth={1.75} aria-hidden="true" />
                  </button>
                );
              })}
              <Link
                href="/messages"
                className={`flex min-h-11 w-full items-center gap-3 rounded-lg border border-default bg-canvas px-3 py-2 text-left transition hover:border-accent-primary/40 hover:bg-subtle ${focusRing}`}
              >
                <MessageSquare className="h-4 w-4 shrink-0 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-primary">Pesan Langsung</span>
                  <span className="block text-xs text-secondary">Konsultasi langsung dengan teknisi</span>
                </span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-secondary" strokeWidth={1.75} aria-hidden="true" />
              </Link>
            </div>
          </div>
        )}
      </section>

      <section aria-labelledby="community-rail-title" className="rounded-xl border border-default bg-surface p-5 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h2 id="community-rail-title" className="tracking-tight flex items-center gap-2 font-sans text-lg font-bold text-primary">
            <MessageSquare className="h-4 w-4 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
            Komunitas Terbaru
          </h2>
          <button
            type="button"
            onClick={() => onNavigate("community")}
            className={`min-h-9 rounded-full px-2.5 text-xs font-medium text-accent-primary transition hover:bg-accent-subtle ${focusRing}`}
          >
            Buka forum
          </button>
        </div>

        {loading ? (
          <div className="mt-3 space-y-2.5" aria-hidden="true">
            <div className="h-12 animate-pulse rounded-lg bg-subtle" />
            <div className="h-12 animate-pulse rounded-lg bg-subtle" />
          </div>
        ) : recentPosts.length > 0 ? (
          <ul className="mt-3 divide-y divide-default">
            {recentPosts.map((post) => (
              <li key={post.id}>
                <button
                  type="button"
                  onClick={() => onNavigate("community")}
                  className={`flex min-h-11 w-full items-start justify-between gap-3 py-3 text-left transition-colors hover:text-accent-primary ${focusRing}`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 text-sm font-medium leading-snug text-primary">
                      {post.title}
                    </span>
                    <span className="mt-1 inline-block rounded-full bg-subtle px-2 py-0.5 text-[11px] font-medium text-secondary">
                      {COMMUNITY_CATEGORY_LABELS[post.category] || "Diskusi"}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-xs tabular-nums text-secondary">
                    {Number(post.likes_count) || 0} suka
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-3 space-y-3">
            <p className="text-xs leading-relaxed text-secondary">
              Jelajahi showcase rakitan B2S/B2C, panduan instalasi lab CBT, dan tanya jawab teknisi di Community Hub.
            </p>
            <button
              type="button"
              onClick={() => onNavigate("community")}
              className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-default bg-canvas px-4 py-2 text-xs font-semibold text-primary transition hover:border-accent-primary/40 hover:bg-subtle ${focusRing}`}
            >
              <span>Buka Forum Komunitas</span>
              <ArrowRight className="h-3.5 w-3.5 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
            </button>
          </div>
        )}
      </section>
    </aside>
  );
}

function HomeDashboard({ role, onRoleChange, onNavigate, user, isAuthLoading }) {
  const r = ROLES[role] || ROLES.b2c;
  const featuredModules = MODULES.filter((m) => r.rec?.includes(m.id));
  const otherModules = MODULES.filter((m) => !r.rec?.includes(m.id));
  const primaryTarget = r.rec?.[0] || "builder";
  const primaryModule = BY_ID[primaryTarget] || BY_ID.builder;

  const dataTransparency = [
    {
      badgeClass: "vt-badge-simulated",
      badgeLabel: "Simulated / Demo",
      title: "Profil Uji IoT QC & Burn-In",
      detail: "Skenario uji terkalibrasi (Simulated / Demo) yang dipisahkan secara eksplisit dari sensor fisik ESP32 (v2.5).",
      go: ["qc"],
    },
    {
      badgeClass: "vt-badge-live",
      badgeLabel: "Live ESP32",
      title: "Sensor Fisik Terverifikasi",
      detail: "Khusus untuk telemetri suhu CPU/GPU dan voltase aktual yang masuk langsung dari perangkat ESP32.",
      go: ["qc"],
    },
    {
      badgeClass: "vt-badge-sample",
      badgeLabel: "Katalog Sampel",
      title: "Hardware Library & Trade-In",
      detail: "Spesifikasi acuan, estimasi harga, dan simulasi upgrade untuk riset awal.",
      go: ["market", "catalog"],
    },
  ];
  const quick = [
    ["Cek batas maksimal upgrade", "market", "upgrade"],
    ["Hitung bottleneck CPU & GPU", "bottleneck"],
    ["Cek nomor seri IoT QC", "qc"],
    ["Lihat rakitan komunitas", "community"],
  ];
  return (
    <>
      <section className="border-b border-default pb-5 sm:pb-10" aria-labelledby="home-title">
        <div className="mx-auto grid max-w-shell gap-5 px-4 py-5 sm:gap-10 sm:px-6 sm:py-8 lg:grid-cols-5 lg:items-center lg:py-10">
          <div className="lg:col-span-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="vt-badge-sample">{r.label}</span>
              <span className="text-xs font-medium text-secondary">Ruang Kerja Circular IT</span>
            </div>
            <h1 id="home-title" className="font-bold tracking-tight vt-display mt-3 max-w-2xl break-words text-3xl text-primary [text-wrap:balance] sm:mt-5 sm:text-5xl lg:text-6xl">
              Satu ruang kerja untuk riset, rakit, dan verifikasi perangkat keras.
            </h1>
            <p className="mt-3 max-w-[68ch] text-sm leading-relaxed text-secondary sm:mt-5 sm:text-base">
              {r.greeting} Tukar tambah, rakit preset, periksa telemetri IoT QC, dan bandingkan spesifikasi dalam satu ekosistem.
            </p>
            <div className="no-scrollbar mt-4 flex flex-nowrap gap-2 overflow-x-auto pb-1 sm:mt-5 sm:flex-wrap sm:overflow-visible" role="radiogroup" aria-label="Peran ruang kerja">
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
                    className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium transition-all duration-200 ease-smooth active:scale-[0.98] sm:min-h-11 sm:px-3.5 sm:py-2 sm:text-xs ${focusRing} ${
                      selected
                        ? "bg-accent-primary font-semibold text-white"
                        : "border border-default bg-surface text-secondary hover:bg-subtle hover:text-primary"
                    }`}
                  >
                    <RoleIcon className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                    <span>{meta.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 sm:mt-6 sm:gap-3">
              <button
                type="button"
                onClick={() => onNavigate(primaryTarget)}
                className={`vt-btn-tactile inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent-cta px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-cta-hover ${focusRing}`}
              >
                <span>Buka {primaryModule.short}</span>
                <ArrowRight className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate("market", "catalog")}
                className={`vt-btn-tactile inline-flex min-h-11 items-center gap-2 rounded-lg border border-default bg-surface px-4 py-2.5 text-sm font-medium text-primary hover:bg-subtle ${focusRing}`}
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

      <div className="mx-auto grid max-w-shell gap-5 px-4 py-5 sm:gap-8 sm:px-6 sm:py-10 lg:grid-cols-3">
        <section aria-labelledby="launch-title" className="space-y-5 sm:space-y-8 lg:col-span-2">
          <div>
            <h2 id="launch-title" className="font-sans text-2xl font-bold tracking-tight text-primary [text-wrap:balance]">
              Prioritas untuk peran Anda
            </h2>
            <div className="mt-3 flex flex-wrap gap-1.5 sm:mt-4 sm:gap-2" aria-label="Aksi cepat">
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
                    className={`vt-card-lift group flex min-h-11 flex-col justify-between rounded-xl border border-default bg-accent-subtle p-3.5 text-left hover:border-accent-primary/50 sm:p-5 ${focusRing}`}
                  >
                    <div>
                      <span className="flex items-center justify-between gap-2">
                        <span className="grid h-10 w-10 place-items-center rounded-lg bg-surface text-accent-primary shadow-sm transition group-hover:bg-accent-primary group-hover:text-white">
                          <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
                        </span>
                        <span className="rounded-md bg-surface px-2 py-0.5 text-[11px] font-semibold text-primary">
                          Direkomendasikan
                        </span>
                      </span>
                      <span className="mt-4 block font-sans text-lg font-semibold leading-snug text-primary">
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
            <h3 className="font-sans text-lg font-bold tracking-tight text-primary">
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
                    className={`vt-card-lift group flex min-h-11 items-start gap-3.5 rounded-xl border border-default bg-surface p-4 text-left hover:border-accent-primary/40 hover:bg-subtle ${focusRing}`}
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-subtle text-accent-primary transition group-hover:bg-accent-primary group-hover:text-white">
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
        <WorkspacePulsePanel user={user} isAuthLoading={isAuthLoading} onNavigate={onNavigate} />
      </div>
    </>
  );
}

/* ───────────────────────── Module container ───────────────────────── */

// Keeps inactive tabs mounted via [hidden] without hiding duplicate headers/footers via CSS.
function Chromeless({ active = true, fillHeight = false, children }) {
  return (
    <div
      hidden={!active}
      className={`vt-module vt-in [&>div]:min-h-0 ${
        fillHeight ? "flex h-full min-h-0 flex-1 flex-col overflow-hidden" : ""
      }`}
    >
      {children}
    </div>
  );
}

function SubTabs({ label, items, value, onChange }) {
  return (
    <div className="mx-auto max-w-shell px-4 pt-8 sm:px-6">
      <div role="tablist" aria-label={label} className="inline-flex flex-wrap gap-1 rounded-full border border-default bg-surface p-1.5 shadow-sm">
        {items.map(([id, text, Icon]) => {
          const on = value === id;
          return (
            <button key={id} type="button" role="tab" aria-selected={on} onClick={() => onChange(id)} className={`flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-sm transition-colors duration-200 ${focusRing} ${on ? "bg-accent-cta font-semibold text-white" : "text-secondary hover:bg-subtle hover:text-primary"}`}>
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
        <section role="alert" className="mx-auto my-8 max-w-3xl rounded-xl border border-default bg-surface p-6 text-primary shadow-sm">
          <h2 className="tracking-tight text-lg font-bold">Modul ini gagal ditampilkan</h2>
          <p className="mt-2 text-sm leading-relaxed text-secondary">Bagian lain dari ViciTech tetap tersedia. Coba muat ulang modul atau pilih menu lain.</p>
          <button type="button" onClick={() => this.setState({ hasError: false })} className="vt-btn vt-btn-primary mt-4">
            Muat ulang modul
          </button>
        </section>
      );
    }

    return this.props.children;
  }
}

const ModuleSlot = memo(function ModuleSlot({ Comp, active, fillHeight = false, extra }) {
  if (typeof Comp !== "function") {
    return (
      <section role="alert" className="mx-auto my-8 max-w-3xl rounded-xl border border-default bg-surface p-6 text-primary shadow-sm">
        <h2 className="tracking-tight text-lg font-bold">Modul ini tidak tersedia</h2>
        <p className="mt-2 text-sm leading-relaxed text-secondary">Komponennya belum dikonfigurasi. Pilih bagian lain untuk melanjutkan.</p>
      </section>
    );
  }

  return (
    <ModuleErrorBoundary>
      <Chromeless active={active} fillHeight={fillHeight}><Comp {...(extra || {})} /></Chromeless>
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
  marketProducts,
  marketError,
  marketCategory,
}) {
  const isLibraryView = view === "catalog" || view === "upgrade";

  return (
    <div>
      <section className="border-b border-default bg-surface">
        <div className="mx-auto max-w-shell px-4 py-6 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="vt-badge-sample">Market &amp; Hardware Library</span>
              <h1 className="mt-2 font-sans text-2xl font-bold tracking-tight text-primary [text-wrap:balance] sm:text-3xl">
                {isLibraryView
                  ? "Hardware Library, Spesifikasi & Potensi Upgrade"
                  : "Etalase Market & Unit Siap Kirim"}
              </h1>
            </div>

            {/* Unified Segmented Switcher */}
            <div
              role="tablist"
              aria-label="Pengalih mode Market"
              className="inline-flex flex-wrap gap-1 rounded-xl border border-default bg-subtle p-1"
            >
              <button
                type="button"
                role="tab"
                aria-selected={!isLibraryView}
                onClick={() => onView("ready")}
                className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-4 py-2 text-sm transition-colors ${focusRing} ${
                  !isLibraryView
                    ? "bg-accent-cta font-semibold text-white shadow-sm"
                    : "font-medium text-secondary hover:bg-surface hover:text-primary"
                }`}
              >
                <ShoppingBag className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                <span>Semua / Siap Kirim</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={isLibraryView}
                onClick={() => onView("catalog")}
                className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-4 py-2 text-sm transition-colors ${focusRing} ${
                  isLibraryView
                    ? "bg-accent-cta font-semibold text-white shadow-sm"
                    : "font-medium text-secondary hover:bg-surface hover:text-primary"
                }`}
              >
                <Layers className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                <span>Hardware Library &amp; Spesifikasi</span>
              </button>
            </div>
          </div>

          {isLibraryView && (
            <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Alat Hardware Library">
              <button
                type="button"
                role="tab"
                aria-selected={view === "catalog"}
                onClick={() => onView("catalog")}
                className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200 ease-smooth active:scale-[0.98] ${focusRing} ${
                  view === "catalog"
                    ? "bg-accent-primary text-white"
                    : "border border-default bg-canvas text-secondary hover:bg-subtle hover:text-primary"
                }`}
              >
                <Layers className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                <span>Katalog &amp; Bandingkan Spek</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={view === "upgrade"}
                onClick={() => onView("upgrade")}
                className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200 ease-smooth active:scale-[0.98] ${focusRing} ${
                  view === "upgrade"
                    ? "bg-accent-primary text-white"
                    : "border border-default bg-canvas text-secondary hover:bg-subtle hover:text-primary"
                }`}
              >
                <Zap className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                <span>Analisis Upgrade Maksimal</span>
              </button>
            </div>
          )}
        </div>
      </section>

      {view === "ready" && (
        <MarketStorefront
          initialProducts={marketProducts}
          initialCategory={marketCategory}
          initialError={marketError}
          onOpenLibrary={() => onView("catalog")}
          onOpenBuilder={() => onNavigate("builder")}
        />
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
  const stack = [["Next.js", Layers], ["Supabase", Zap], ["Tailwind CSS", Sliders], ["Telemetri ESP32", Activity]];
  const link = `rounded text-sm text-secondary transition-colors duration-200 hover:text-primary ${focusRing}`;
  return (
    <footer className="mt-8 border-t border-default bg-canvas md:mt-20">
      <div className="mx-auto hidden max-w-shell gap-10 px-4 py-14 sm:px-6 md:grid md:grid-cols-4">
        <div className="md:col-span-2">
          <p className="flex items-center gap-2 text-base font-semibold text-primary">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-accent-primary text-white"><Cpu className="h-4 w-4" aria-hidden="true" /></span>
            <span className="font-sans text-lg tracking-tight">ViciTech</span>
          </p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-secondary">
            Riset perangkat keras, tukar tambah Trade-In, verifikasi IoT QC, dan pelacakan siklus pakai dalam satu ekosistem Circular IT.
          </p>
          <ul className="mt-5 flex flex-wrap gap-2" aria-label="Tumpukan teknologi">
            {stack.map(([name, Icon]) => (
              <li key={name} className="inline-flex items-center gap-1.5 rounded-full border border-default bg-surface px-3 py-1 text-xs text-secondary">
                <Icon className="h-3.5 w-3.5 text-accent-primary" aria-hidden="true" /> {name}
              </li>
            ))}
          </ul>
        </div>
        <nav aria-label="Modul ViciTech">
          <p className="vt-eyebrow">Modul</p>
          <ul className="mt-3 space-y-2">
            {MODULES.map((m) => <li key={m.id}><button type="button" onClick={() => onNavigate(m.id)} className={link}>{m.short}</button></li>)}
          </ul>
        </nav>
        <div>
          <p className="vt-eyebrow flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-accent-primary" aria-hidden="true" /> Standar</p>
          <ul className="mt-3 space-y-2">
            {["Sanitasi data NIST 800-88", "Protokol 15-titik IoT QC", "Kebijakan JIT Dynamic Buffer 5%", "Sertifikasi Grade Refurbished"].map((t) => (
              <li key={t} className="text-sm leading-relaxed text-secondary">{t}</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mx-auto space-y-2 px-4 py-4 md:hidden">
        <p className="flex items-center gap-2 text-sm font-semibold text-primary">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-accent-primary text-white"><Cpu className="h-3.5 w-3.5" aria-hidden="true" /></span>
          <span className="font-sans">ViciTech</span>
        </p>
        <details className="border-t border-default pt-2">
          <summary className="cursor-pointer py-1 text-xs font-semibold uppercase tracking-wide text-secondary">Modul</summary>
          <ul className="grid grid-cols-2 gap-x-3 pb-2">
            {MODULES.map((m) => <li key={m.id}><button type="button" onClick={() => onNavigate(m.id)} className="min-h-8 py-1 text-left text-xs text-secondary">{m.short}</button></li>)}
          </ul>
        </details>
        <details className="border-t border-default pt-2">
          <summary className="cursor-pointer py-1 text-xs font-semibold uppercase tracking-wide text-secondary">Standar</summary>
          <ul className="space-y-1 pb-2 text-xs text-secondary">
            {["Sanitasi data NIST 800-88", "Protokol 15-titik IoT QC", "Kebijakan JIT Dynamic Buffer 5%", "Sertifikasi Grade Refurbished"].map((t) => <li key={t}>{t}</li>)}
          </ul>
        </details>
      </div>
      <div className="border-t border-default bg-surface/60">
        <div className="mx-auto flex max-w-shell flex-wrap items-center justify-between gap-2 px-4 py-3 text-[11px] text-secondary sm:px-6 md:py-4 md:text-xs">
          <p>© {new Date().getFullYear()} ViciTech. Seluruh hak cipta dilindungi.</p>
          <p>Harga, spesifikasi, dan skor pada katalog merupakan data referensi.</p>
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

/**
 * @param {object} props
 * @param {Record<string, unknown>} [props.components]
 * @param {string} [props.initialRole]
 * @param {string} [props.initialModule]
 * @param {string} [props.initialView]
 * @param {string | null} [props.initialSerial]
 * @param {string} [props.initialProfileUsername]
 * @param {string} [props.initialMessageUsername]
 * @param {string} [props.initialMessagePeerId]
 * @param {readonly import('@/lib/admin/products-validation').ProductRow[]} [props.initialMarketProducts]
 * @param {string | null} [props.initialMarketError]
 * @param {string} [props.initialMarketCategory]
 * @param {string} [props.initialBuilderProductId]
 * @param {string} [props.homeUrl]
 * @param {() => Promise<void> | void} [props.onSignOut]
 */
export default function ViciTechApp({
  components = undefined,
  initialRole = "b2c",
  initialModule = "home",
  initialView = "",
  initialSerial = null,
  initialProfileUsername = "",
  initialMessageUsername = "",
  initialMessagePeerId = "",
  initialMarketProducts = [],
  initialMarketError = null,
  initialMarketCategory = "all",
  initialBuilderProductId = "",
  homeUrl = undefined,
  onSignOut = undefined,
}) {
  const router = useRouter();
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
  const [builderProductId, setBuilderProductId] = useState(initialBuilderProductId);
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
        notify(`Pesanan ${event.detail.id} telah dibuat dan disimpan ke akun ViciTech Anda.`);
      }
    };
    window.addEventListener("vicitech:order_created", handleOrderCreated);
    return () => window.removeEventListener("vicitech:order_created", handleOrderCreated);
  }, [notify]);

  const handleSignOut = useCallback(async () => {
    if (!supabase) {
      notify("Autentikasi Supabase belum dikonfigurasi.");
      return;
    }

    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        notify(`Gagal keluar: ${error.message}`);
        return;
      }
      await forceResetAuthSession(supabase);
    } catch (error) {
      notify(`Gagal keluar: ${error.message}`);
      return;
    }

    try {
      await onSignOut?.();
    } catch (error) {
      notify(`Berhasil keluar, namun aksi lanjutan gagal: ${error.message}`);
      return;
    }
    notify("Anda telah keluar dari akun.");
  }, [notify, onSignOut]);

  useEffect(() => {
    try {
      const saved = window.sessionStorage.getItem(PENDING_CHECKOUT_STORAGE_KEY);
      if (!saved) return;
      const summary = JSON.parse(saved);
      if (!summary?.productName || !summary?.pricing || !Array.isArray(summary.items) || !summary?.specs) {
        window.sessionStorage.removeItem(PENDING_CHECKOUT_STORAGE_KEY);
        notify("Checkout tertunda tidak dapat dipulihkan. Silakan ulangi proses checkout.");
        return;
      }
      triggerCheckout(summary);
    } catch (error) {
      window.sessionStorage.removeItem(PENDING_CHECKOUT_STORAGE_KEY);
      notify(`Checkout tertunda gagal dipulihkan: ${error.message}`);
    }
  }, [notify, triggerCheckout]);

  const show = useCallback((id, view) => {
    setActive(id);
    if (view) setViews((v) => ({ ...v, [id]: view }));
    setVisited((v) => (v.has(id) ? v : new Set(v).add(id)));
  }, []);

  const navigate = useCallback((rawId, rawViewOrData) => {
    let [id, viewOrData] = normalizeModuleTarget(rawId, rawViewOrData);

    if (id === "home") {
      setPalette(false);
      router.push(homeUrl || "/");
      return;
    }

    if (id === "account") {
      setPalette(false);
      const tabSuffix = viewOrData === "orders" || viewOrData === "settings" ? `?tab=${viewOrData}` : "";
      router.push(`/profile${tabSuffix}`);
      return;
    }

    if (id === "qc") {
      setPalette(false);
      if (typeof viewOrData === "string" && SERIAL_RE.test(viewOrData.trim().toUpperCase())) {
        const serial = viewOrData.trim().toUpperCase();
        router.push(`/qc-panel?order=${encodeURIComponent(serial)}`);
        return;
      }
      router.push("/qc-panel");
      return;
    }

    if (id === "builder") {
      setPalette(false);
      if (viewOrData && typeof viewOrData === "object") {
        try {
          window.sessionStorage.setItem("vicitech:pending-builder-config", JSON.stringify(viewOrData));
        } catch {
          // Abaikan kesalahan sessionStorage di mode privat.
        }
      }
      router.push("/builder");
      return;
    }

    if (id === "bottleneck") {
      setPalette(false);
      router.push("/bottleneck");
      return;
    }

    if (id === "versus") {
      setPalette(false);
      router.push("/versus");
      return;
    }

    if (id === "tradein" || id === "trade-in") {
      setPalette(false);
      router.push("/trade-in");
      return;
    }

    if (id === "community") {
      setPalette(false);
      router.push("/community");
      return;
    }

    const v = validView(id, viewOrData) ? viewOrData : undefined;
    show(id, v);
    setPalette(false);
    const hash = `#${id}${v ? `/${v}` : ""}`;
    if (window.location.hash !== hash) window.history.pushState(null, "", hash);
    window.dispatchEvent(new CustomEvent("vicitech:module-change", { detail: { module: id, view: v } }));
    window.scrollTo(0, 0);
  }, [show, router, homeUrl]);

  const handleQuerySync = useCallback((tab, view, productId) => {
    if (productId) {
      setBuilderProductId(productId);
    }
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
      document.title = `${BY_ID[active].label} | ViciTech`;
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
    navigate("builder", { items });
  }, [navigate]);

  // Cross-module prop hand-offs
  const extras = useMemo(() => ({
    builder: {
      role,
      userId: authState.user?.id,
      importedConfig: builderConfig,
      initialProductId: builderProductId,
      marketProducts: initialMarketProducts,
      onNavigate: navigate,
      onOpenEngine: (serial) => {
        if (serial) setQcSerial(serial);
        navigate("qc", serial);
      },
    },
    tradein: {
      onNavigate: navigate,
      onOpenBuilder: (items) => {
        navigate("builder", items ? { items } : undefined);
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
        navigate("builder", parts);
      },
    },
    versus: {
      marketProducts: initialMarketProducts,
      onDeployToPreset: (item) => {
        const partHint = item?.builderPartHint && typeof item.builderPartHint === "object"
          ? item.builderPartHint
          : {};
        navigate("builder", { ...partHint, items: [item] });
      },
      onRequestQuote: (item) => notify(`Permintaan penawaran dibuat untuk ${item.name}.`),
    },
    account: {
      role,
      user: authState.user,
      isAuthLoading: authState.isLoading,
      onRoleChange: setRole,
      onNavigate: navigate,
      onReconfigure: (preset) => {
        setBuilderConfig({ preset });
        notify(`Preset "${preset.name}" dimuat ke Preset Builder.`);
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
      initialPeerId: initialMessagePeerId,
    },
  }), [role, authState, builderConfig, qcSerial, navigate, notify, handleSignOut, initialProfileUsername, initialMessageUsername, initialMessagePeerId, initialMarketProducts]);

  const isViewportLockedChat = active === "messages";

  return (
    <div
      className={`flex min-w-0 flex-col bg-canvas text-primary font-sans antialiased ${
        isViewportLockedChat
          ? "h-[calc(100dvh-10rem)] overflow-hidden md:h-[calc(100dvh-6rem)]"
          : "min-h-screen"
      }`}
    >
      <Suspense fallback={null}>
        <QueryParamSync onSync={handleQuerySync} />
      </Suspense>

      <main className={isViewportLockedChat ? "flex min-h-0 flex-1 flex-col overflow-hidden" : "flex-1"}>
        {active === "home" && (
          <div className="vt-in">
            <HomeDashboard
              role={role}
              onRoleChange={setRole}
              onNavigate={navigate}
              user={authState.user}
              isAuthLoading={authState.isLoading}
            />
          </div>
        )}

        {(active === "tradein" || active === "qc") && resolvedInitialModule !== "qc" && (
          <div className="border-b border-default bg-surface">
            <div className="mx-auto flex max-w-shell flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
              <div>
                <p className="text-xs font-semibold text-primary">Ruang Kerja Trade-In &amp; IoT QC</p>
                <p className="text-xs text-secondary">Beralih antara estimasi buyback sirkular dan mesin inspeksi serial IoT QC.</p>
              </div>
              <div role="tablist" aria-label="Pengalih Trade-In dan IoT QC" className="inline-flex flex-wrap gap-1 rounded-xl border border-default bg-subtle p-1">
                <button
                  type="button"
                  role="tab"
                  aria-selected={active === "tradein"}
                  onClick={() => navigate("tradein")}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-4 py-2 text-xs transition-colors ${focusRing} ${
                    active === "tradein"
                    ? "bg-accent-cta font-semibold text-white shadow-sm"
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
                      ? "bg-accent-cta font-semibold text-white shadow-sm"
                      : "font-medium text-secondary hover:bg-surface hover:text-primary"
                  }`}
                >
                  <Activity className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                  <span>Mesin IoT QC &amp; Telemetri</span>
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
              marketProducts={initialMarketProducts}
              marketError={initialMarketError}
              marketCategory={initialMarketCategory}
            />
          </div>
        )}
        {MODULE_IDS.filter((id) => visited.has(id)).map((id) => (
          <ModuleSlot
            key={id}
            Comp={C[id]}
            active={active === id}
            fillHeight={id === "messages"}
            extra={extras[id]}
          />
        ))}
      </main>

      {!isViewportLockedChat && <Footer onNavigate={navigate} />}
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
