"use client";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  LayoutDashboard, Cpu, Sliders, RefreshCw, Activity, MessageSquare, Search, Bell, ShieldCheck, Layers, Zap,
  Gauge, Swords, User, Building2, GraduationCap, Menu, X, ArrowRight, CheckCircle2,
} from "lucide-react";

import HardwareLibrary from "./modules/HardwareLibrary";
import UpgradeAnalyzer from "./modules/UpgradeAnalyzer";
import PresetBuilder from "./modules/PresetBuilder";
import TradeInPortal from "./modules/TradeInPortal";
import IotQcEngine from "./modules/IotQcEngine";
import BottleneckAnalyzer from "./modules/BottleneckAnalyzer";
import VersusArena from "./modules/VersusArena";
import AccountDashboard from "./modules/AccountDashboard";
import CommunityHub from "./modules/CommunityHub";
import CheckoutModal, { PENDING_CHECKOUT_STORAGE_KEY } from "./CheckoutModal";

/*
  ViciTech master shell. One top bar, one tab bar and one footer wrap every module, and each module keeps its
  state while you switch tabs (visited modules stay mounted and are only hidden with [hidden] { display: none !important; }).

  Module map                           Component
  library   > catalog                  HardwareLibrary      (categorized library: phones, laptops, PCs, accessories)
            > upgrade                  UpgradeAnalyzer      (max RAM, NVMe slots, upgrade planner)
  builder                              PresetBuilder        (B2S / B2B / B2C configurator with live price, wattage, and JIT 5% buffer)
  tradein                              TradeInPortal        (buyback form and certified refurbished gallery)
  qc                                   IotQcEngine          (serial lookup, telemetry, 15-point QC, certificate)
  bottleneck                           BottleneckAnalyzer   (CPU + GPU + RAM + workload pairing and rebalancing)
  versus                               VersusArena          (head-to-head comparison and verdict)
  account                              AccountDashboard     (orders, trade-ins, presets, certificates vault, settings)
  community                            CommunityHub         (build showcases, guides and Q&A feed)

  Each module renders its own header and footer so it also works standalone. The shell hides those
  (see `Chromeless`) and supplies the shared chrome. The URL hash mirrors the active view: #library/upgrade, #builder, #community.
  Pass `components` to swap any module, e.g. with next/dynamic: <ViciTechApp components={{ qc: QcDynamic }} />.
*/

/* ───────────────────────── Navigation model ───────────────────────── */

const MODULES = [
  { id: "library", label: "Hardware Library & Upgrade Analyzer", short: "Library", sub: "Phones, laptops, PCs, accessories and max upgrade potential", blurb: "Browse every hardware category, compare specs and see how far a laptop or PC can be upgraded.", icon: Layers, views: [["catalog", "Hardware Library", Layers], ["upgrade", "Max Upgrade Analyzer", Zap]] },
  { id: "builder", label: "Smart Preset Builder", short: "Preset Builder", sub: "One-click configurator for B2S, B2B and B2C", blurb: "Start from a curated build, swap parts and watch price and power draw update live with JIT buffer.", icon: Sliders },
  { id: "tradein", label: "Circular Trade-In & Buyback", short: "Trade-In", sub: "Asset buyback and refurbished gallery", blurb: "Value retired equipment in bulk and buy certified refurbished hardware with savings shown up front.", icon: RefreshCw },
  { id: "qc", label: "IoT QC & Telemetry Engine", short: "IoT QC", sub: "Telemetry and digital QC certificates", blurb: "Look up a serial number to see burn-in telemetry, the 15-point check and its certificate.", icon: Activity },
  { id: "bottleneck", label: "AI Bottleneck Analyzer", short: "Bottleneck AI", sub: "CPU, GPU, RAM and workload pairing", blurb: "Find the part holding a build back, estimate FPS and get rebalancing advice.", icon: Gauge },
  { id: "versus", label: "Versus Arena", short: "Versus Arena", sub: "Head-to-head comparison with a verdict", blurb: "Put two PCs, laptops or phones side by side and see who wins on specs and value.", icon: Swords },
  { id: "account", label: "Account Dashboard", short: "Account", sub: "Orders, certificates, presets and role management", blurb: "Track orders, trade-ins, QC certificate vault and customize system roles.", icon: User },
  { id: "community", label: "Community & Knowledge Hub", short: "Community", sub: "Build showcases, guides and Q&A feed", blurb: "Share custom PC builds, learn lab setup guides, and ask technicians questions.", icon: MessageSquare },
];
const HOME = { id: "home", label: "Home", short: "Home", sub: "Ecosystem overview", icon: LayoutDashboard };
const NAV = [HOME, ...MODULES];
const BY_ID = Object.fromEntries(NAV.map((m) => [m.id, m]));
const DEFAULT_VIEWS = { library: "catalog" };
const validView = (id, v) => BY_ID[id]?.views?.some(([k]) => k === v);

const ROLES = {
  b2c: { label: "B2C Member / Creator", name: "Dimas Saputra", initials: "DS", icon: User, greeting: "Compare parts, plan a build and share it with the community.", rec: ["bottleneck", "versus", "community"] },
  b2b: { label: "B2B Enterprise Admin", name: "Aulia Rahman", initials: "AR", icon: Building2, greeting: "Fleet overview for your organization: certify, order and track.", rec: ["qc", "tradein", "account"] },
  b2s: { label: "B2S School / CBT Lab Admin", name: "Hendra Wijaya", initials: "HW", icon: GraduationCap, greeting: "Equip labs, track warranties and keep every seat exam-ready.", rec: ["builder", "tradein", "qc"] },
};

const SEED_NOTIFS = {
  b2c: [
    { id: 1, text: "Pre-order VT-PO-2026-0412 entered IoT stress testing", target: ["qc"], ago: "5 h ago", unread: true },
    { id: 2, text: "Price drop: RTX 4060 is lower this week", target: ["library", "catalog"], ago: "1 d ago", unread: true },
    { id: 3, text: "Your build post received 12 new upvotes", target: ["community"], ago: "2 d ago", unread: false },
  ],
  b2b: [
    { id: 1, text: "Offer ready for trade-in VT-TI-2026-0149", target: ["account"], ago: "3 h ago", unread: true },
    { id: 2, text: "Tax invoice INV-2026-0377 is pending", target: ["account"], ago: "2 d ago", unread: true },
    { id: 3, text: "Batch VICI-LTP-2026-0950 warranty ends soon", target: ["qc"], ago: "4 d ago", unread: false },
  ],
  b2s: [
    { id: 1, text: "CBT lab order VT-PO-2026-0402 passed IoT stress testing", target: ["qc"], ago: "7 h ago", unread: true },
    { id: 2, text: "Maintenance task due in 6 days: exam-day power test", target: ["account"], ago: "1 d ago", unread: true },
    { id: 3, text: "Spare units shipped to your school lab", target: ["tradein"], ago: "5 d ago", unread: false },
  ],
};

const ACTIONS = [
  { label: "Compare two GPUs", module: "library", view: "catalog", keys: "gpu graphics card rtx compare specs" },
  { label: "Check max RAM and NVMe slots of a laptop", module: "library", view: "upgrade", keys: "upgrade ram nvme slot max laptop pc" },
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
  qc: { icon: ShieldCheck, target: ["qc"], tone: "text-emerald-400" },
  order: { icon: Sliders, target: ["builder"], tone: "text-cyan-400" },
  tradein: { icon: RefreshCw, target: ["tradein"], tone: "text-emerald-400" },
  price: { icon: Layers, target: ["library", "catalog"], tone: "text-cyan-400" },
  upgrade: { icon: Zap, target: ["library", "upgrade"], tone: "text-amber-400" },
  bottleneck: { icon: Gauge, target: ["bottleneck"], tone: "text-amber-400" },
  versus: { icon: Swords, target: ["versus"], tone: "text-cyan-400" },
  community: { icon: MessageSquare, target: ["community"], tone: "text-cyan-400" },
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
const seedEvents = () => {
  const now = Date.now();
  return [["qc", "New QC Pass: VICI-SRV-2026-9042", 8], ["order", "Preset Order Submitted for CBT Lab Tasikmalaya", 41], ["bottleneck", "Bottleneck scan: i5-12400F + RTX 4060 at 1080p", 80], ["upgrade", "Upgrade check: ThinkPad T14 can reach 48 GB RAM", 120], ["tradein", "Trade-In valuation requested: 40 laptops", 190]]
    .map(([type, text, s], i) => ({ id: i, type, text, at: now - s * 1000 }));
};

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70";
const iconBtn = `relative grid h-9 w-9 place-items-center rounded-lg border border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:text-cyan-300 ${focusRing}`;
const panel = "absolute right-0 top-full z-50 mt-2 rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/50";
const CSS = `
@keyframes vt-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.vt-in{animation:vt-in .28s ease-out both}
.vt-module .lg\\:top-20{top:8.5rem!important}
@media (prefers-reduced-motion:reduce){.vt-in{animation:none}}`;

/* ───────────────────────── Hooks ───────────────────────── */

function useDismiss(open, onClose, ref) {
  useEffect(() => {
    if (!open) return;
    const down = (e) => ref.current && !ref.current.contains(e.target) && onClose();
    const key = (e) => e.key === "Escape" && onClose();
    document.addEventListener("pointerdown", down);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("pointerdown", down); document.removeEventListener("keydown", key); };
  }, [open, onClose, ref]);
}

function useOverlay(open, onClose) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    const key = (e) => e.key === "Escape" && onClose();
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", key);
    return () => { document.body.style.overflow = prev; document.removeEventListener("keydown", key); };
  }, [open, onClose]);
}

function useCountUp(target, ms = 1200) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return setV(target);
    let raf;
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / ms);
      setV(target * (1 - (1 - p) ** 3));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

/* ───────────────────────── Top bar ───────────────────────── */

const Dot = () => <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]" />;

function StatusMenu() {
  const [open, setOpen] = useState(false);
  const [lat, setLat] = useState({ db: 42, mqtt: 18 });
  const ref = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, close, ref);
  useEffect(() => {
    const id = setInterval(() => setLat({ db: 35 + Math.round(Math.random() * 30), mqtt: 10 + Math.round(Math.random() * 20) }), 3000);
    return () => clearInterval(id);
  }, []);
  return (
    <div ref={ref} className="relative hidden lg:block">
      <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className={`flex items-center gap-3 rounded-lg border border-zinc-800 px-3 py-2 text-xs text-zinc-300 hover:border-zinc-700 ${focusRing}`}>
        <span className="flex items-center gap-1.5"><Dot /> Database OK</span>
        <span className="flex items-center gap-1.5"><Dot /> IoT Broker Online</span>
      </button>
      {open && (
        <div className={`${panel} w-72 p-4 text-sm`}>
          <p className="font-medium text-zinc-100">System status</p>
          {[["Supabase database", "OK", lat.db], ["IoT MQTT broker", "Online", lat.mqtt]].map(([name, state, ms]) => (
            <div key={name} className="mt-3 flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-zinc-300"><Dot /> {name}</span><span className="text-xs tabular-nums text-zinc-500">{state}, {ms} ms</span></div>
          ))}
          <p className="mt-3 text-xs text-zinc-600">Connected to Supabase with live local state resilience.</p>
        </div>
      )}
    </div>
  );
}

function NotificationsMenu({ notifs, setNotifs, onNavigate }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, close, ref);
  const unread = useMemo(() => notifs.filter((n) => n.unread).length, [notifs]);
  return (
    <div ref={ref} className="relative">
      <button type="button" aria-label={`Notifications, ${unread} unread`} aria-expanded={open} onClick={() => setOpen((v) => !v)} className={iconBtn}>
        <Bell className="h-4 w-4" />
        {unread > 0 && <span className="absolute -right-1 -top-1 grid h-4 min-w-[1rem] place-items-center rounded-full bg-cyan-400 px-1 text-[10px] font-bold text-zinc-950">{unread}</span>}
      </button>
      {open && (
        <div className={`${panel} w-[min(22rem,calc(100vw-2rem))]`}>
          <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
            <p className="text-sm font-medium text-zinc-100">Notifications</p>
            <button type="button" disabled={!unread} onClick={() => setNotifs((l) => l.map((n) => ({ ...n, unread: false })))} className={`rounded text-xs text-cyan-400 hover:text-cyan-300 disabled:text-zinc-600 ${focusRing}`}>Mark all as read</button>
          </div>
          <ul className="max-h-80 divide-y divide-zinc-800 overflow-y-auto">
            {notifs.map((n) => {
              const Icon = BY_ID[n.target[0]]?.icon || Bell;
              return (
                <li key={n.id}>
                  <button type="button" onClick={() => { setNotifs((l) => l.map((x) => (x.id === n.id ? { ...x, unread: false } : x))); setOpen(false); onNavigate(...n.target); }} className={`flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-zinc-900 ${focusRing}`}>
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
                    <span className="min-w-0 flex-1"><span className={`block text-sm ${n.unread ? "text-zinc-100" : "text-zinc-400"}`}>{n.text}</span><span className="text-xs text-zinc-500">{n.ago}</span></span>
                    {n.unread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-cyan-400" aria-label="Unread" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function RoleMenu({ role, setRole, onSignOut }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, close, ref);
  const r = ROLES[role];
  return (
    <div ref={ref} className="relative">
      <button type="button" aria-expanded={open} aria-label={`Profile and role menu, ${r.label}`} onClick={() => setOpen((v) => !v)} className={`flex items-center gap-2.5 rounded-lg border border-zinc-800 py-1 pl-1 pr-1 hover:border-zinc-700 lg:pr-3 ${focusRing}`}>
        <span className="grid h-7 w-7 place-items-center rounded-md bg-cyan-400/15 text-xs font-semibold text-cyan-300">{r.initials}</span>
        <span className="hidden text-left lg:block"><span className="block text-xs font-medium leading-tight text-zinc-100">{r.name}</span><span className="block text-[11px] leading-tight text-zinc-500">{r.label}</span></span>
      </button>
      {open && (
        <div className={`${panel} w-72 p-2`}>
          <p className="px-2 py-1.5 text-xs text-zinc-500">Switch role</p>
          <div role="radiogroup" aria-label="Role">
            {Object.entries(ROLES).map(([k, v]) => {
              const I = v.icon;
              return (
                <button key={k} type="button" role="radio" aria-checked={role === k} onClick={() => { setRole(k); setOpen(false); }} className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm ${focusRing} ${role === k ? "bg-cyan-400/10 text-cyan-300" : "text-zinc-300 hover:bg-zinc-900"}`}>
                  <I className="h-4 w-4" /> {v.label} {role === k && <CheckCircle2 className="ml-auto h-4 w-4 text-emerald-400" />}
                </button>
              );
            })}
          </div>
          <button type="button" disabled={!onSignOut} onClick={onSignOut} title={onSignOut ? undefined : "Connect your auth provider"} className={`mt-1 w-full rounded-lg border-t border-zinc-800 px-2 py-2 text-left text-sm text-zinc-400 enabled:hover:text-zinc-100 disabled:cursor-not-allowed disabled:text-zinc-600 ${focusRing}`}>Sign out</button>
        </div>
      )}
    </div>
  );
}

function Navbar({ role, setRole, notifs, setNotifs, onNavigate, onSearch, onMenu, onSignOut }) {
  return (
    <div className="border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <button type="button" aria-label="Open menu" onClick={onMenu} className={`${iconBtn} md:hidden`}><Menu className="h-4 w-4" /></button>
        <button type="button" onClick={() => onNavigate("home")} aria-label="ViciTech home" className={`flex items-center gap-2.5 rounded-lg ${focusRing}`}>
          <span className="relative grid h-8 w-8 place-items-center rounded-lg bg-cyan-400 text-zinc-950">
            <Cpu className="h-5 w-5" />
            <span className="absolute -right-1 -top-1 flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-70 motion-safe:animate-ping" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-cyan-300 shadow-[0_0_8px_2px_rgba(34,211,238,0.8)] ring-2 ring-zinc-950" />
            </span>
          </span>
          <span className="text-lg font-semibold tracking-tight">ViciTech</span>
        </button>
        <span className="hidden items-center rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-1 text-xs text-cyan-300 xl:inline-flex">ViciTech OS v1.0 - Connected</span>
        <div className="flex flex-1 justify-center">
          <button type="button" onClick={onSearch} className={`hidden w-full max-w-md items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-left text-sm text-zinc-500 hover:border-zinc-700 md:flex ${focusRing}`}>
            <Search className="h-4 w-4" /> <span className="flex-1">Search modules, serials, guides</span>
            <kbd className="rounded border border-zinc-700 bg-zinc-950 px-1.5 py-0.5 text-[11px] text-zinc-400">Ctrl + K</kbd>
          </button>
        </div>
        <button type="button" aria-label="Search" onClick={onSearch} className={`${iconBtn} md:hidden`}><Search className="h-4 w-4" /></button>
        <StatusMenu />
        <NotificationsMenu notifs={notifs} setNotifs={setNotifs} onNavigate={onNavigate} />
        <RoleMenu role={role} setRole={setRole} onSignOut={onSignOut} />
      </div>
    </div>
  );
}

function TabBar({ active, onNavigate }) {
  return (
    <nav aria-label="Primary" className="hidden border-b border-zinc-800 bg-zinc-950/90 backdrop-blur md:block">
      <ul className="mx-auto flex max-w-7xl gap-1.5 overflow-x-auto px-4 py-2.5 sm:px-6">
        {NAV.map((m) => {
          const on = active === m.id;
          const Icon = m.icon;
          return (
            <li key={m.id}>
              <button type="button" title={m.label} aria-current={on ? "page" : undefined} onClick={() => onNavigate(m.id)} className={`flex items-center gap-2 whitespace-nowrap rounded-lg border px-3 py-2 text-sm transition-all ${focusRing} ${on ? "border-cyan-400/50 bg-cyan-400/10 font-medium text-cyan-300 shadow-[0_0_18px_-4px_rgba(34,211,238,0.6)]" : "border-transparent text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"}`}>
                <Icon className="h-4 w-4" /> {m.short}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/* ───────────────────────── Overlays ───────────────────────── */

function MobileDrawer({ open, onClose, active, onNavigate, role }) {
  useOverlay(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] bg-black/70 md:hidden" onClick={onClose}>
      <aside role="dialog" aria-modal="true" aria-label="Navigation menu" onClick={(e) => e.stopPropagation()} className="flex h-full w-80 max-w-[85vw] flex-col border-r border-zinc-800 bg-zinc-950">
        <div className="flex items-center justify-between border-b border-zinc-800 p-4">
          <span className="flex items-center gap-2 font-semibold"><span className="grid h-8 w-8 place-items-center rounded-lg bg-cyan-400 text-zinc-950"><Cpu className="h-5 w-5" /></span> ViciTech</span>
          <button type="button" aria-label="Close menu" onClick={onClose} className={iconBtn}><X className="h-4 w-4" /></button>
        </div>
        <nav aria-label="Primary" className="flex-1 space-y-1 overflow-y-auto p-3">
          {NAV.map((m) => {
            const on = active === m.id;
            const Icon = m.icon;
            return (
              <button key={m.id} type="button" aria-current={on ? "page" : undefined} onClick={() => onNavigate(m.id)} className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left ${focusRing} ${on ? "border-cyan-400/50 bg-cyan-400/10 shadow-[0_0_18px_-4px_rgba(34,211,238,0.6)]" : "border-transparent hover:bg-zinc-900"}`}>
                <Icon className={`h-5 w-5 shrink-0 ${on ? "text-cyan-300" : "text-zinc-500"}`} />
                <span><span className={`block text-sm ${on ? "font-medium text-cyan-300" : "text-zinc-200"}`}>{m.short}</span><span className="block text-xs text-zinc-500">{m.sub}</span></span>
              </button>
            );
          })}
        </nav>
        <div className="space-y-2 border-t border-zinc-800 p-4 text-xs text-zinc-400">
          <p className="flex items-center gap-2"><Dot /> Database OK</p>
          <p className="flex items-center gap-2"><Dot /> IoT Broker Online</p>
          <p className="pt-1 text-zinc-500">Signed in as {ROLES[role]?.label || role}</p>
        </div>
      </aside>
    </div>
  );
}

function CommandPalette({ open, onClose, onSelect }) {
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const inputRef = useRef(null);
  useOverlay(open, onClose);
  useEffect(() => {
    if (!open) return;
    setQ(""); setIdx(0);
    inputRef.current?.focus();
  }, [open]);

  const items = useMemo(() => {
    const serial = q.trim().toUpperCase();
    const tokens = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const found = COMMANDS.filter((c) => tokens.every((t) => `${c.label} ${c.keys} ${c.hint}`.toLowerCase().includes(t)));
    return SERIAL_RE.test(serial) ? [{ label: `Look up ${serial}`, hint: "Opens the IoT QC & Telemetry Engine", module: "qc" }, ...found] : found;
  }, [q]);

  if (!open) return null;
  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => (items.length ? (i + 1) % items.length : 0)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => (items.length ? (i - 1 + items.length) % items.length : 0)); }
    else if (e.key === "Enter" && items[idx]) { e.preventDefault(); onSelect(items[idx]); }
  };
  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center bg-black/70 p-4 pt-[12vh]" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Command palette" onMouseDown={(e) => e.stopPropagation()} className="w-full max-w-xl overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/60">
        <div className="flex items-center gap-3 border-b border-zinc-800 px-4">
          <Search className="h-4 w-4 text-zinc-500" />
          <input ref={inputRef} value={q} onChange={(e) => { setQ(e.target.value); setIdx(0); }} onKeyDown={onKeyDown} placeholder="Search modules, actions or a serial number" aria-label="Search" autoComplete="off" spellCheck={false} className="h-12 flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none" />
          <kbd className="rounded border border-zinc-700 px-1.5 py-0.5 text-[11px] text-zinc-500">Esc</kbd>
        </div>
        <ul role="listbox" aria-label="Results" className="max-h-80 overflow-y-auto p-2">
          {items.length === 0 && <li className="px-3 py-6 text-center text-sm text-zinc-500">No matches. Try “gpu”, “upgrade” or a serial like VICI-SRV-2026-9042.</li>}
          {items.map((it, i) => {
            const Icon = BY_ID[it.module]?.icon || Layers;
            return (
              <li key={it.label} role="option" aria-selected={i === idx}>
                <button type="button" onMouseEnter={() => setIdx(i)} onClick={() => onSelect(it)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left ${i === idx ? "bg-cyan-400/10" : ""}`}>
                  <Icon className={`h-4 w-4 shrink-0 ${i === idx ? "text-cyan-300" : "text-zinc-500"}`} />
                  <span className="flex-1 text-sm text-zinc-100">{it.label}</span>
                  <span className="hidden text-xs text-zinc-500 sm:block">{it.hint}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <p className="border-t border-zinc-800 px-4 py-2 text-xs text-zinc-600">Up and down to move, Enter to open, Esc to close.</p>
      </div>
    </div>
  );
}

function ToastHost({ toast, onDone }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onDone, 4000);
    return () => clearTimeout(t);
  }, [toast, onDone]);
  if (!toast) return null;
  return (
    <div role="status" className="vt-in fixed bottom-4 right-4 z-[80] flex max-w-sm items-start gap-2.5 rounded-xl border border-emerald-400/30 bg-zinc-950 p-3.5 text-sm text-emerald-300 shadow-2xl shadow-black/60">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> <span>{toast.msg}</span>
    </div>
  );
}

/* ───────────────────────── Home dashboard ───────────────────────── */

function Stat({ icon: Icon, target, format, label, onClick }) {
  const v = useCountUp(target);
  return (
    <li>
      <button type="button" onClick={onClick} className={`flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-zinc-800/40 ${focusRing}`}>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-emerald-400/30 bg-emerald-400/10 text-emerald-400"><Icon className="h-5 w-5" /></span>
        <span><span className="block text-2xl font-semibold tabular-nums text-zinc-50">{format(v)}</span><span className="block text-sm text-zinc-400">{label}</span></span>
        <ArrowRight className="ml-auto h-4 w-4 text-zinc-600" />
      </button>
    </li>
  );
}

function ActivityFeed({ onNavigate }) {
  const [events, setEvents] = useState(seedEvents);
  const [now, setNow] = useState(Date.now());
  const [paused, setPaused] = useState(false);
  const uid = useRef(100);
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      const [type, text] = pick(GENERATORS)();
      setEvents((l) => [{ id: ++uid.current, type, text, at: Date.now() }, ...l].slice(0, 7));
    }, 3500);
    return () => clearInterval(id);
  }, [paused]);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const ago = (at) => { const s = Math.max(0, Math.floor((now - at) / 1000)); return s < 5 ? "just now" : s < 60 ? `${s}s ago` : `${Math.floor(s / 60)} min ago`; };
  return (
    <section aria-labelledby="feed-title" className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="flex items-center justify-between gap-3">
        <h2 id="feed-title" className="flex items-center gap-2 text-base font-semibold text-zinc-50"><Zap className="h-5 w-5 text-cyan-400" /> Live activity</h2>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs ${paused ? "border-zinc-700 text-zinc-400" : "border-emerald-400/30 bg-emerald-400/10 text-emerald-400"}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${paused ? "bg-zinc-500" : "bg-emerald-400 motion-safe:animate-pulse"}`} /> {paused ? "Paused" : "Live"}
        </span>
      </div>
      <ul className="mt-3 divide-y divide-zinc-800">
        {events.map((e) => {
          const t = EVENT_TYPES[e.type] || EVENT_TYPES.price;
          const Icon = t.icon;
          return (
            <li key={e.id} className="vt-in">
              <button type="button" onClick={() => onNavigate(...t.target)} className={`flex w-full items-start gap-3 py-2.5 text-left hover:text-cyan-300 ${focusRing}`}>
                <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${t.tone}`} />
                <span className="min-w-0 flex-1 text-sm text-zinc-200">{e.text}</span>
                <span className="shrink-0 text-xs tabular-nums text-zinc-500">{ago(e.at)}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function HomeDashboard({ role, onNavigate }) {
  const r = ROLES[role] || ROLES.b2c;
  const stats = [
    { icon: Cpu, target: 1240, format: (v) => `${Math.round(v).toLocaleString("en-US")}+`, label: "Units Benchmarked", go: ["library", "catalog"] },
    { icon: RefreshCw, target: 15.4, format: (v) => `${v.toFixed(1)} Tons`, label: "E-Waste Saved", go: ["tradein"] },
    { icon: ShieldCheck, target: 99.8, format: (v) => `${v.toFixed(1)}%`, label: "QC Pass Rate", go: ["qc"] },
  ];
  const quick = [
    ["Check max upgrade potential", "library", "upgrade"],
    ["Find a bottleneck", "bottleneck"],
    ["Look up a serial number", "qc"],
    ["Browse community builds", "community"],
  ];
  return (
    <>
      <section className="border-b border-zinc-800" aria-labelledby="home-title">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-5 lg:items-center lg:py-16">
          <div className="lg:col-span-3">
            <p className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-400"><Layers className="h-3.5 w-3.5" /> Circular IT economy platform</p>
            <h1 id="home-title" className="mt-4 max-w-2xl text-3xl font-semibold leading-tight tracking-tight text-zinc-50 sm:text-4xl lg:text-5xl">Welcome to the ViciTech home base</h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-zinc-400">{r.greeting} Trade in, build, verify, analyze and compare hardware in one connected ecosystem.</p>
          </div>
          <ul className="divide-y divide-zinc-800 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40 lg:col-span-2" aria-label="Executive summary">
            {stats.map((s) => <Stat key={s.label} {...s} onClick={() => onNavigate(...s.go)} />)}
          </ul>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-3">
        <section aria-labelledby="launch-title" className="lg:col-span-2">
          <h2 id="launch-title" className="text-xl font-semibold text-zinc-50">Quick launcher</h2>
          <div className="mt-3 flex flex-wrap gap-2" aria-label="Quick actions">
            {quick.map(([label, ...go]) => <button key={label} type="button" onClick={() => onNavigate(...go)} className={`rounded-full border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:border-cyan-400/60 hover:text-cyan-300 ${focusRing}`}>{label}</button>)}
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {MODULES.map((m, i) => {
              const Icon = m.icon;
              const rec = r.rec?.includes(m.id);
              return (
                <button key={m.id} type="button" onClick={() => onNavigate(m.id)} className={`group flex flex-col rounded-xl border p-5 text-left transition-all ${focusRing} ${rec ? "border-cyan-400/40 bg-cyan-400/5" : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"} hover:shadow-[0_0_24px_-8px_rgba(34,211,238,0.5)]`}>
                  <span className="flex items-start justify-between gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-zinc-800 text-cyan-400 group-hover:bg-cyan-400 group-hover:text-zinc-950"><Icon className="h-5 w-5" /></span>
                    {rec && <span className="rounded-full border border-cyan-400/30 px-2 py-0.5 text-xs text-cyan-300">Recommended for {r.label}</span>}
                  </span>
                  <span className="mt-4 font-semibold text-zinc-50">{m.label}</span>
                  <span className="mt-1 text-sm text-zinc-400">{m.blurb}</span>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm text-cyan-400">Open module <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></span>
                </button>
              );
            })}
          </div>
        </section>
        <div className="lg:sticky lg:top-40 lg:self-start"><ActivityFeed onNavigate={onNavigate} /></div>
      </div>
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
    <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
      <div role="tablist" aria-label={label} className="inline-flex flex-wrap gap-1 rounded-xl border border-zinc-800 bg-zinc-900/50 p-1.5">
        {items.map(([id, text, Icon]) => {
          const on = value === id;
          return (
            <button key={id} type="button" role="tab" aria-selected={on} onClick={() => onChange(id)} className={`flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm transition-all ${focusRing} ${on ? "border-cyan-400/50 bg-cyan-400/10 font-medium text-cyan-300 shadow-[0_0_18px_-4px_rgba(34,211,238,0.6)]" : "border-transparent text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100"}`}>
              <Icon className="h-4 w-4" /> {text}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const ModuleSlot = memo(function ModuleSlot({ Comp, active, extra }) {
  return <Chromeless active={active}><Comp {...extra} /></Chromeless>;
});

const LibraryModule = memo(function LibraryModule({ C, view, onView, deviceId, onDevice, onNavigate, onOpenBuilder }) {
  return (
    <>
      <SubTabs label="Hardware library views" items={BY_ID.library.views} value={view} onChange={onView} />
      <Chromeless active={view === "catalog"}>
        <C.catalog
          onOpenBuilder={onOpenBuilder}
          onCheckUpgrade={(id) => { onDevice(id); onView("upgrade"); }}
        />
      </Chromeless>
      <Chromeless active={view === "upgrade"}>
        <C.upgrade deviceId={deviceId} onDeviceChange={onDevice} onNavigate={onNavigate} />
      </Chromeless>
    </>
  );
});

/* ───────────────────────── Footer ───────────────────────── */

function Footer({ onNavigate }) {
  const stack = [["Next.js", Layers], ["Supabase", Zap], ["Tailwind CSS", Sliders], ["IoT MQTT", Activity]];
  const link = `rounded text-sm text-zinc-400 hover:text-cyan-300 ${focusRing}`;
  return (
    <footer className="mt-10 border-t border-zinc-800">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <p className="flex items-center gap-2 font-semibold"><span className="grid h-8 w-8 place-items-center rounded-lg bg-cyan-400 text-zinc-950"><Cpu className="h-5 w-5" /></span> ViciTech</p>
          <p className="mt-3 max-w-sm text-sm text-zinc-400">A circular IT economy platform: hardware trade-ins, IoT-verified quality, AI bottleneck analysis, smart presets with JIT buffers, and a community knowledge hub.</p>
          <ul className="mt-4 flex flex-wrap gap-2" aria-label="Tech stack">
            {stack.map(([name, Icon]) => <li key={name} className="inline-flex items-center gap-1.5 rounded-full border border-zinc-800 px-3 py-1 text-xs text-zinc-300"><Icon className="h-3.5 w-3.5 text-cyan-400" /> {name}</li>)}
          </ul>
        </div>
        <nav aria-label="Modules">
          <p className="text-sm font-medium text-zinc-200">Modules</p>
          <ul className="mt-3 space-y-2">{MODULES.map((m) => <li key={m.id}><button type="button" onClick={() => onNavigate(m.id)} className={link}>{m.short}</button></li>)}</ul>
        </nav>
        <div>
          <p className="flex items-center gap-2 text-sm font-medium text-zinc-200"><ShieldCheck className="h-4 w-4 text-emerald-400" /> Compliance &amp; Standards</p>
          <ul className="mt-3 space-y-2">{["NIST 800-88 data sanitization", "15-point IoT QC protocol", "JIT dynamic buffer policy", "Refurbished grading standards"].map((t) => <li key={t}><a href="#" onClick={(e) => e.preventDefault()} className={link}>{t}</a></li>)}</ul>
        </div>
      </div>
      <div className="border-t border-zinc-800">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-zinc-600 sm:px-6">
          <p>© {new Date().getFullYear()} ViciTech OS. All rights reserved.</p>
          <p>Production-ready build with Supabase persistence and live keep-alive tab switching.</p>
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
const MODULE_IDS = ["builder", "tradein", "qc", "bottleneck", "versus", "account", "community"];

export default function ViciTechApp({ components, initialRole = "b2c", onSignOut }) {
  const C = useMemo(() => ({ ...DEFAULT_COMPONENTS, ...components }), [components]);
  const [active, setActive] = useState("home");
  const [views, setViews] = useState(DEFAULT_VIEWS);
  const [visited, setVisited] = useState(() => new Set(["home"]));
  const [role, setRole] = useState(initialRole);
  const [notifsByRole, setNotifsByRole] = useState(SEED_NOTIFS);
  const [upgradeDevice, setUpgradeDevice] = useState("t14");
  const [builderConfig, setBuilderConfig] = useState(null);
  const [qcSerial, setQcSerial] = useState(null);
  const [palette, setPalette] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [toast, setToast] = useState(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutSummary, setCheckoutSummary] = useState(null);

  const notify = useCallback((msg) => setToast({ msg, n: Date.now() }), []);
  const clearToast = useCallback(() => setToast(null), []);
  const openCheckout = useCallback((summary) => {
    setCheckoutSummary(summary);
    setIsCheckoutOpen(true);
  }, []);
  const closeCheckout = useCallback(() => {
    setIsCheckoutOpen(false);
    setCheckoutSummary(null);
    window.sessionStorage.removeItem(PENDING_CHECKOUT_STORAGE_KEY);
  }, []);

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
      setCheckoutSummary(summary);
      setIsCheckoutOpen(true);
    } catch (error) {
      window.sessionStorage.removeItem(PENDING_CHECKOUT_STORAGE_KEY);
      notify(`The pending checkout could not be restored: ${error.message}`);
    }
  }, [notify]);

  const show = useCallback((id, view) => {
    setActive(id);
    if (view) setViews((v) => ({ ...v, [id]: view }));
    setVisited((v) => (v.has(id) ? v : new Set(v).add(id)));
  }, []);

  const navigate = useCallback((id, viewOrData) => {
    // Map legacy account/community to top-level community
    if (id === "account" && viewOrData === "community") {
      id = "community";
      viewOrData = undefined;
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
    setDrawer(false);
    setPalette(false);
    const hash = `#${id}${v ? `/${v}` : ""}`;
    if (window.location.hash !== hash) window.history.pushState(null, "", hash);
    window.scrollTo(0, 0);
  }, [show, notify]);

  // The URL hash mirrors the active view (deep links and the back button)
  useEffect(() => {
    const read = () => {
      const rawHash = window.location.hash.slice(1);
      if (!rawHash) return show("home");
      let [id, view] = rawHash.split("/");
      if (id === "account" && view === "community") {
        id = "community";
        view = undefined;
      }
      if (!BY_ID[id]) return show("home");
      show(id, validView(id, view) ? view : undefined);
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, [show]);

  useEffect(() => {
    if (BY_ID[active]) {
      document.title = `${BY_ID[active].label} | ViciTech OS`;
    }
  }, [active]);

  // Ctrl+K / Cmd+K toggles the command palette
  useEffect(() => {
    const key = (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPalette((v) => !v); } };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);

  const closePalette = useCallback(() => setPalette(false), []);
  const closeDrawer = useCallback(() => setDrawer(false), []);
  const libView = useCallback((v) => navigate("library", v), [navigate]);
  const setNotifs = useCallback((fn) => setNotifsByRole((s) => ({ ...s, [role]: fn(s[role] || []) })), [role]);

  // Cross-module prop hand-offs
  const extras = useMemo(() => ({
    builder: {
      role,
      importedConfig: builderConfig,
      onOpenCheckout: openCheckout,
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
      onRoleChange: setRole,
      onNavigate: navigate,
      onReconfigure: (preset) => {
        setBuilderConfig({ preset });
        notify(`Preset "${preset.name}" loaded into Preset Builder.`);
        navigate("builder");
      },
      onSignOut,
    },
    community: {
      onNavigate: navigate,
    },
  }), [role, builderConfig, qcSerial, navigate, notify, onSignOut, openCheckout]);

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100 antialiased">
      <style>{CSS}</style>

      <div className="sticky top-0 z-40">
        <Navbar role={role} setRole={setRole} notifs={notifsByRole[role] || []} setNotifs={setNotifs} onNavigate={navigate} onSearch={() => setPalette(true)} onMenu={() => setDrawer(true)} onSignOut={onSignOut} />
        <TabBar active={active} onNavigate={navigate} />
      </div>

      <main className="flex-1">
        {active === "home" && <div className="vt-in"><HomeDashboard role={role} onNavigate={navigate} /></div>}

        {visited.has("library") && (
          <div hidden={active !== "library"}>
            <LibraryModule
              C={C}
              view={views.library}
              onView={libView}
              deviceId={upgradeDevice}
              onDevice={setUpgradeDevice}
              onNavigate={navigate}
              onOpenBuilder={(items) => {
                setBuilderConfig({ items });
                notify("Selected hardware sent to Preset Builder.");
                navigate("builder");
              }}
            />
          </div>
        )}
        {MODULE_IDS.filter((id) => visited.has(id)).map((id) => (
          <ModuleSlot key={id} Comp={C[id]} active={active === id} extra={extras[id]} />
        ))}
      </main>

      <Footer onNavigate={navigate} />
      <MobileDrawer open={drawer} onClose={closeDrawer} active={active} onNavigate={navigate} role={role} />
      <CommandPalette open={palette} onClose={closePalette} onSelect={(it) => navigate(it.module, it.view)} />
      <CheckoutModal
        open={isCheckoutOpen}
        orderSummary={checkoutSummary}
        onClose={closeCheckout}
        onOrderCreated={(order) => notify(`Order ${order.id} was placed and saved to your ViciTech account.`)}
      />
      <ToastHost toast={toast} onDone={clearToast} />
    </div>
  );
}
