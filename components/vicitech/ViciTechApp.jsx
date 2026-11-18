"use client";
import Link from "next/link";
import { Component, memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  LayoutDashboard, Cpu, Sliders, RefreshCw, Activity, MessageSquare, Search, Bell, ShieldCheck, Layers, Zap,
  Gauge, Swords, User, Building2, GraduationCap, Menu, X, ArrowRight, CheckCircle2, ChevronDown,
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
import CyberSuite from "./CyberSuite";
import AuthNavigation from "./auth/AuthNavigation";
import { supabase } from "@/lib/supabase";
import { getUserDisplayName, getUserInitials } from "@/lib/supabase/profile";
import { PENDING_CHECKOUT_STORAGE_KEY, useCheckout } from "@/context/CheckoutContext";

/*
  ViciTech master shell. One floating top bar (its logo opens the navigation pill) and one footer wrap every module, and each module keeps its
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
  b2c: { label: "B2C Member / Creator", icon: User, greeting: "Compare parts, plan a build and share it with the community.", rec: ["bottleneck", "versus", "community"] },
  b2b: { label: "B2B Enterprise Admin", icon: Building2, greeting: "Fleet overview for your organization: certify, order and track.", rec: ["qc", "tradein", "account"] },
  b2s: { label: "B2S School / CBT Lab Admin", icon: GraduationCap, greeting: "Equip labs, track warranties and keep every seat exam-ready.", rec: ["builder", "tradein", "qc"] },
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
  qc: { icon: ShieldCheck, target: ["qc"] },
  order: { icon: Sliders, target: ["builder"] },
  tradein: { icon: RefreshCw, target: ["tradein"] },
  price: { icon: Layers, target: ["library", "catalog"] },
  upgrade: { icon: Zap, target: ["library", "upgrade"] },
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
const seedEvents = () => {
  const now = Date.now();
  return [["qc", "New QC Pass: VICI-SRV-2026-9042", 8], ["order", "Preset Order Submitted for CBT Lab Tasikmalaya", 41], ["bottleneck", "Bottleneck scan: i5-12400F + RTX 4060 at 1080p", 80], ["upgrade", "Upgrade check: ThinkPad T14 can reach 48 GB RAM", 120], ["tradein", "Trade-In valuation requested: 40 laptops", 190]]
    .map(([type, text, s], i) => ({ id: i, type, text, at: now - s * 1000 }));
};

// Surface, motion and focus styles live in app/globals.css so the server and the client render
// identical markup (an inline <style> tag here caused a hydration mismatch).
const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/60 focus-visible:ring-offset-2 focus-visible:ring-offset-paper";
const iconBtn = `vt-chip relative grid h-9 w-9 place-items-center rounded-full text-ink ${focusRing}`;
const panel = "vt-metal vt-pop absolute right-0 top-full z-50 mt-3 origin-top-right rounded-3xl";

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

// Slides a bar away while the page scrolls down and brings it back on any upward scroll.
function useHideOnScroll({ delta = 10, top = 80 } = {}) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    let last = window.scrollY;
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = Math.max(0, window.scrollY);
      if (y <= top) { setHidden(false); last = y; return; }
      if (Math.abs(y - last) < delta) return;
      setHidden(y > last);
      last = y;
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(frame); };
  }, [delta, top]);
  return hidden;
}

/* ───────────────────────── Top bar ───────────────────────── */

const Dot = () => <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-signal" aria-hidden="true" />;

/* States where each kind of data comes from, instead of inventing latencies or "online" badges. */
const DATA_SOURCES = [
  { name: "Supabase", detail: "Accounts, orders and presets", source: "Live" },
  { name: "IoT telemetry", detail: "ESP32 ingest endpoint", source: "Live" },
  { name: "QC test profiles", detail: "Burn-in and 15-point checks", source: "Simulated" },
  { name: "Hardware catalog", detail: "Prices, specs and scores", source: "Sample" },
];

function StatusMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, close, ref);
  return (
    <div ref={ref} className="relative hidden shrink-0 items-center gap-2 text-xs xl:flex">
      <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className={`vt-chip flex items-center gap-2 rounded-full px-3.5 py-2 text-xs text-ink ${focusRing}`}>
        <Dot /> Data sources
      </button>
      {open && (
        <div className={`${panel} w-80 p-4 text-sm`}>
          <p className="font-medium text-ink">Where the data comes from</p>
          <ul className="mt-3 space-y-3">
            {DATA_SOURCES.map((row) => (
              <li key={row.name} className="flex items-start justify-between gap-3">
                <span className="min-w-0">
                  <span className="block text-sm text-ink">{row.name}</span>
                  <span className="block text-xs text-pewter">{row.detail}</span>
                </span>
                <span className={`vt-tag shrink-0 ${row.source === "Live" ? "vt-tag-signal" : ""}`}>{row.source}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 border-t border-black/[0.06] pt-3 text-xs leading-relaxed text-pewter">
            Sample and simulated values are labelled wherever they appear. A simulated QC profile is never a physical sensor reading.
          </p>
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
        <Bell className="h-4 w-4" aria-hidden="true" />
        {unread > 0 && <span className="absolute -right-1 -top-1 grid h-4 min-w-[1rem] place-items-center rounded-full bg-signal px-1 text-[10px] font-bold text-white">{unread}</span>}
      </button>
      {open && (
        <div className={`${panel} w-[min(22rem,calc(100vw-2rem))] p-1.5`}>
          <div className="flex items-center justify-between px-3 pb-2 pt-3">
            <p className="text-sm font-medium text-ink">Notifications</p>
            <button type="button" disabled={!unread} onClick={() => setNotifs((l) => l.map((n) => ({ ...n, unread: false })))} className={`rounded text-xs text-signal-deep hover:underline disabled:text-faint ${focusRing}`}>Mark all as read</button>
          </div>
          <ul className="max-h-80 space-y-0.5 overflow-y-auto">
            {notifs.map((n) => {
              const Icon = BY_ID[n.target[0]]?.icon || Bell;
              return (
                <li key={n.id}>
                  <button type="button" onClick={() => { setNotifs((l) => l.map((x) => (x.id === n.id ? { ...x, unread: false } : x))); setOpen(false); onNavigate(...n.target); }} className={`flex w-full items-start gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-black/[0.04] ${focusRing}`}>
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-signal" aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className={`block text-sm leading-snug ${n.unread ? "font-medium text-ink" : "text-pewter"}`}>{n.text}</span>
                      <span className="text-xs text-faint">{n.ago}</span>
                    </span>
                    {n.unread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-signal" aria-label="Unread" />}
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

function RoleMenu({ role, setRole, user }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, close, ref);
  const r = ROLES[role];
  const displayName = getUserDisplayName(user);
  return (
    <div ref={ref} className="relative">
      <button type="button" aria-expanded={open} aria-label={`Profile and workspace role menu, ${displayName}, ${r.label}`} onClick={() => setOpen((v) => !v)} className={`vt-chip flex max-w-[180px] items-center gap-2 rounded-full py-1 pl-1 pr-3 ${focusRing}`}>
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-signal text-[11px] font-semibold text-white">{getUserInitials(user)}</span>
        <span className="hidden min-w-0 flex-1 text-left xl:block">
          <span className="block truncate text-xs font-medium leading-tight text-ink" title={displayName}>{displayName}</span>
          <span className="block truncate text-[11px] leading-tight text-pewter" title={r.label}>{r.label}</span>
        </span>
      </button>
      {open && (
        <div className={`${panel} w-72 p-2`}>
          <p className="px-2 py-1.5 text-xs text-pewter">Switch workspace role</p>
          <div role="radiogroup" aria-label="Role">
            {Object.entries(ROLES).map(([k, v]) => {
              const I = v.icon;
              const selected = role === k;
              return (
                <button key={k} type="button" role="radio" aria-checked={selected} onClick={() => { setRole(k); setOpen(false); }} className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm transition-colors ${focusRing} ${selected ? "bg-signal text-white font-medium" : "text-ink hover:bg-black/[0.04]"}`}>
                  <I className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">{v.label}</span>
                  {selected && <CheckCircle2 className="h-4 w-4 shrink-0 text-white" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/*
  TabBar is the floating navigation pill. The Navbar logo toggles it. The pill lists the six primary destinations;
  the other modules stay reachable from Home, the footer, the mobile drawer and the command bar (Ctrl + K).
  Module entries resolve their icon from NAV; an entry with an `href` is a real route and never shows as active.
*/
const PILL_ITEMS = [
  { id: "home", label: "Home Base" },
  { id: "library", label: "Library Parts" },
  { id: "builder", label: "Preset Builder" },
  { id: "tradein", label: "Trade-In" },
  { id: "qc", label: "IoT QC Consumer" },
  { id: "qc-admin", label: "Admin QC Portal", href: "/qc-panel", icon: ShieldCheck, adminOnly: true },
];
const pillItem = `flex h-full w-full flex-col items-center justify-center gap-1.5 rounded-2xl px-2 py-3 text-center text-[11px] font-medium leading-tight transition-colors duration-200 focus-visible:ring-offset-2 lg:flex-row lg:gap-2 lg:whitespace-nowrap lg:rounded-full lg:px-3.5 lg:py-2.5 lg:text-sm ${focusRing}`;

function TabBar({ open, id, navRef, active, onNavigate, onClose, onEscape, role }) {
  if (!open) return null;
  
  // Saring menu: Hapus Admin QC Portal jika role bukan 'admin'
  const visibleItems = PILL_ITEMS.filter((it) => {
    if (it.adminOnly) return role === "admin";
    return true;
  });

  return (
    <nav ref={navRef} id={id} aria-label="Primary" onKeyDown={(e) => e.key === "Escape" && onEscape()} className="vt-metal vt-pop absolute inset-x-0 top-full z-50 mx-auto mt-3 w-[min(26rem,calc(100vw-1.5rem))] origin-top rounded-[1.75rem] p-1.5 lg:w-max lg:rounded-full">
      <ul className="grid grid-cols-3 gap-1 lg:flex lg:gap-0.5">
        {/* PERHATIKAN: Gunakan visibleItems, bukan PILL_ITEMS di sini! */}
        {visibleItems.map((it) => {
          const Icon = it.icon || BY_ID[it.id].icon;
          const on = active === it.id;
          const tone = on
            ? "bg-signal text-white shadow-signal"
            : "text-pewter hover:bg-black/[0.05] hover:text-ink";
          return (
            <li key={it.id}>
              {it.href ? (
                <Link href={it.href} onClick={onClose} className={`${pillItem} ${tone}`}>
                  <Icon className="h-4 w-4 shrink-0" /> {it.label}
                </Link>
              ) : (
                <button type="button" aria-current={on ? "page" : undefined} onClick={() => onNavigate(it.id)} className={`${pillItem} ${tone}`}>
                  <Icon className="h-4 w-4 shrink-0" /> {it.label}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function Navbar({ active, role, setRole, user, notifs, setNotifs, onNavigate, onSearch, onMenu, onNotify, onAuthState, onSignOut }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const hidden = useHideOnScroll();
  const logoRef = useRef(null);
  const pillRef = useRef(null);
  // The logo and the pill count as one region, so clicking the logo again toggles instead of close-then-reopen
  const trayRef = useRef({ contains: (node) => Boolean(logoRef.current?.contains(node) || pillRef.current?.contains(node)) });
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const toggleMenu = useCallback(() => setMenuOpen((v) => !v), []);
  const focusLogo = useCallback(() => logoRef.current?.focus(), []);
  const go = useCallback((...target) => { setMenuOpen(false); onNavigate(...target); }, [onNavigate]);
  useDismiss(menuOpen, closeMenu, trayRef);
  // Close the pill when the bar slides away or the view changes from anywhere else (palette, notifications, back button)
  useEffect(() => { setMenuOpen(false); }, [hidden, active]);

  return (
    <header data-hidden={hidden} className="vt-nav pointer-events-none sticky top-0 z-40 px-3 pb-2 pt-3 sm:px-5">
      <div className="vt-metal pointer-events-auto relative mx-auto flex h-14 w-full max-w-shell items-center gap-2 rounded-full px-2 text-ink sm:gap-3 sm:px-2.5">
        <button type="button" aria-label="Open menu" onClick={onMenu} className={`${iconBtn} shrink-0 md:hidden`}>
          <Menu className="h-4 w-4" aria-hidden="true" />
        </button>
        <button ref={logoRef} type="button" aria-label="ViciTech navigation" aria-expanded={menuOpen} aria-controls="vt-nav-pill" onClick={toggleMenu} className={`flex shrink-0 items-center gap-2 rounded-full py-1 pl-1 pr-2 transition-colors duration-200 sm:pr-3 ${menuOpen ? "bg-black/[0.06]" : "hover:bg-black/[0.04]"} ${focusRing}`}>
          <span className="grid h-9 w-9 place-items-center rounded-full bg-signal text-white shadow-signal"><Cpu className="h-[18px] w-[18px]" aria-hidden="true" /></span>
          <span className="hidden text-base font-semibold tracking-tight text-ink sm:block">ViciTech</span>
          <ChevronDown aria-hidden="true" className={`h-3.5 w-3.5 text-pewter transition-transform duration-200 ${menuOpen ? "rotate-180" : ""}`} />
        </button>
        
        {/* TabBar dengan tambahan props role={role} */}
        <TabBar 
          open={menuOpen} 
          id="vt-nav-pill" 
          navRef={pillRef} 
          active={active} 
          onNavigate={go} 
          onClose={closeMenu} 
          onEscape={focusLogo} 
          role={role} 
        />

        <div className="flex min-w-0 flex-1 justify-center">
          <button type="button" onClick={onSearch} aria-keyshortcuts="Control+K Meta+K" className={`vt-well hidden w-full max-w-md items-center gap-2.5 rounded-full py-2 pl-3.5 pr-2 text-left text-sm text-pewter hover:text-ink md:flex ${focusRing}`}>
            <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate">Search modules, serials, guides</span>
            <kbd className="rounded-full bg-black/[0.06] px-2 py-0.5 font-sans text-[11px] text-pewter">Ctrl K</kbd>
          </button>
        </div>
        <button type="button" aria-label="Search" onClick={onSearch} className={`${iconBtn} shrink-0 md:hidden`}>
          <Search className="h-4 w-4" aria-hidden="true" />
        </button>

        <StatusMenu />
        {user && (
          <div className="hidden shrink-0 items-center gap-2 md:flex">
            <NotificationsMenu notifs={notifs} setNotifs={setNotifs} onNavigate={onNavigate} />
            <RoleMenu role={role} setRole={setRole} user={user} />
          </div>
        )}
        <AuthNavigation onAuthState={onAuthState} onNotify={onNotify} onNavigate={onNavigate} onSignOut={onSignOut} />
      </div>
    </header>
  );
}

/* ───────────────────────── Overlays ───────────────────────── */

function MobileDrawer({ open, onClose, active, onNavigate, role, user }) {
  useOverlay(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] bg-black/60 md:hidden backdrop-blur-sm" onClick={onClose}>
      <aside role="dialog" aria-modal="true" aria-label="Navigation menu" onClick={(e) => e.stopPropagation()} className="flex h-full w-80 max-w-[85vw] flex-col bg-paper shadow-2xl">
        <div className="flex items-center justify-between border-b border-black/[0.06] p-4">
          <span className="flex items-center gap-2 font-semibold text-ink">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-signal text-white"><Cpu className="h-4 w-4" aria-hidden="true" /></span> ViciTech
          </span>
          <button type="button" aria-label="Close menu" onClick={onClose} className={iconBtn}><X className="h-4 w-4" /></button>
        </div>
        <nav aria-label="Primary" className="flex-1 space-y-1 overflow-y-auto p-3">
          {NAV.map((m) => {
            const on = active === m.id;
            const Icon = m.icon;
            return (
              m.id === "qc" ? (
                <Link key={m.id} href="/qc-panel" onClick={onClose} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-black/[0.04] ${focusRing}`}>
                  <Icon className="h-5 w-5 shrink-0 text-pewter" aria-hidden="true" />
                  <span>
                    <span className="block text-sm text-ink">{m.short}</span>
                    <span className="block text-xs text-pewter">Public tracking & diagnostics panel</span>
                  </span>
                </Link>
              ) : (
                <button key={m.id} type="button" aria-current={on ? "page" : undefined} onClick={() => onNavigate(m.id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${focusRing} ${on ? "bg-signal text-white" : "text-pewter hover:bg-black/[0.04] hover:text-ink"}`}>
                  <Icon className={`h-5 w-5 shrink-0 ${on ? "text-white" : "text-pewter"}`} aria-hidden="true" />
                  <span className="min-w-0">
                    <span className={`block text-sm font-medium ${on ? "text-white" : "text-ink"}`}>{m.short}</span>
                    <span className={`block text-xs leading-snug ${on ? "text-white/80" : "text-pewter"}`}>{m.sub}</span>
                  </span>
                </button>
              )
            );
          })}
        </nav>
        <div className="border-t border-black/[0.06] p-4">
          {user ? (
            <p className="truncate text-xs text-pewter">Signed in as {user.email || getUserDisplayName(user)}</p>
          ) : (
            <p className="text-xs leading-relaxed text-pewter">Signed out. Sign in from the top bar to reach your orders and presets.</p>
          )}
          <p className="mt-2 flex items-center gap-2 text-xs text-faint"><Dot /> Sample data in the catalog</p>
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
    <div className="fixed inset-0 z-[70] flex items-start justify-center bg-black/45 p-4 pt-[12vh] backdrop-blur-sm" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Command palette" onMouseDown={(e) => e.stopPropagation()} className="vt-metal w-full max-w-xl overflow-hidden rounded-2xl">
        <div className="flex items-center gap-3 border-b border-black/[0.06] px-4">
          <Search className="h-4 w-4 shrink-0 text-pewter" aria-hidden="true" />
          <input ref={inputRef} value={q} onChange={(e) => { setQ(e.target.value); setIdx(0); }} onKeyDown={onKeyDown} placeholder="Search modules, actions or a serial number" aria-label="Search" autoComplete="off" spellCheck={false} className="h-12 flex-1 bg-transparent text-sm text-ink placeholder:text-faint focus:outline-none" />
          <kbd className="rounded border border-black/10 bg-black/5 px-1.5 py-0.5 text-[11px] text-pewter">Esc</kbd>
        </div>
        <ul role="listbox" aria-label="Results" className="max-h-80 overflow-y-auto p-2">
          {items.length === 0 && <li className="px-3 py-6 text-center text-sm text-pewter">No matches. Try “gpu”, “upgrade” or a serial like VICI-SRV-2026-9042.</li>}
          {items.map((it, i) => {
            const Icon = BY_ID[it.module]?.icon || Layers;
            return (
              <li key={it.label} role="option" aria-selected={i === idx}>
                <button type="button" onMouseEnter={() => setIdx(i)} onClick={() => onSelect(it)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${i === idx ? "bg-signal-wash text-signal-deep" : "text-ink hover:bg-black/[0.04]"}`}>
                  <Icon className={`h-4 w-4 shrink-0 ${i === idx ? "text-signal" : "text-pewter"}`} aria-hidden="true" />
                  <span className="flex-1 truncate text-sm font-medium">{it.label}</span>
                  <span className="hidden shrink-0 text-xs text-pewter sm:block">{it.hint}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <p className="border-t border-black/[0.06] px-4 py-2.5 text-xs text-pewter">Arrow keys to move, Enter to open, Esc to close.</p>
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
    <div role="status" className="vt-in vt-metal fixed bottom-4 right-4 z-[80] flex max-w-sm items-start gap-2.5 rounded-2xl p-4 text-sm text-ink">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-signal" aria-hidden="true" />
      <span className="font-medium leading-snug">{toast.msg}</span>
    </div>
  );
}

/* ───────────────────────── Home dashboard ───────────────────────── */

function Stat({ icon: Icon, value, label, onClick }) {
  return (
    <li>
      <button type="button" onClick={onClick} className={`vt-card vt-card-hover flex w-full items-center gap-4 rounded-2xl p-5 text-left ${focusRing}`}>
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-signal-wash text-signal"><Icon className="h-5 w-5" aria-hidden="true" /></span>
        <span className="min-w-0 flex-1">
          <span className="vt-num block text-2xl font-semibold text-ink">{value}</span>
          <span className="block text-sm leading-snug text-pewter">{label}</span>
        </span>
        <ArrowRight className="h-4 w-4 shrink-0 text-faint" aria-hidden="true" />
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
    <section aria-labelledby="feed-title" className="vt-card rounded-2xl p-6" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="feed-title" className="flex items-center gap-2 text-base font-semibold text-ink">
            <Zap className="h-4 w-4 text-signal" aria-hidden="true" /> Activity stream
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-pewter">
            Illustrative events generated in your browser. Not live customer activity.
          </p>
        </div>
        <span className={`vt-tag shrink-0 ${paused ? "" : "vt-tag-signal"}`}>{paused ? "Paused" : "Sample"}</span>
      </div>
      <ul className="mt-4 divide-y divide-black/[0.06]">
        {events.map((e) => {
          const t = EVENT_TYPES[e.type] || EVENT_TYPES.price;
          const Icon = t.icon;
          return (
            <li key={e.id} className="vt-in">
              <button type="button" onClick={() => onNavigate(...t.target)} className={`flex w-full items-start gap-3 py-3 text-left transition-colors hover:text-signal-deep ${focusRing}`}>
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-signal" aria-hidden="true" />
                <span className="min-w-0 flex-1 text-sm leading-snug text-ink">{e.text}</span>
                <span className="vt-num shrink-0 text-xs text-faint">{ago(e.at)}</span>
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
  // Sample program figures — illustrative only, and labelled as such in the section header.
  const stats = [
    { icon: Cpu, value: "1,240+", label: "Units benchmarked", go: ["library", "catalog"] },
    { icon: RefreshCw, value: "15.4 t", label: "E-waste diverted", go: ["tradein"] },
    { icon: ShieldCheck, value: "99.8%", label: "QC pass rate", go: ["qc"] },
  ];
  const quick = [
    ["Check max upgrade potential", "library", "upgrade"],
    ["Find a bottleneck", "bottleneck"],
    ["Look up a serial number", "qc"],
    ["Browse community builds", "community"],
  ];
  return (
    <>
      <section className="border-b border-black/[0.06] pb-12" aria-labelledby="home-title">
        <div className="mx-auto grid max-w-shell gap-10 px-4 py-14 sm:px-6 lg:grid-cols-5 lg:items-center lg:py-20">
          <div className="lg:col-span-3">
            <p className="vt-eyebrow flex items-center gap-2">
              <Layers className="h-3.5 w-3.5 text-signal" aria-hidden="true" /> Circular IT economy
            </p>
            <h1 id="home-title" className="vt-display mt-5 max-w-2xl text-4xl italic text-ink sm:text-5xl lg:text-6xl">
              One place to research, plan and buy trusted hardware.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-pewter">{r.greeting} Trade in, build, verify, analyse and compare hardware in one connected ecosystem.</p>
          </div>
          <div className="lg:col-span-2">
            <ul className="grid gap-3" aria-label="Program summary">
              {stats.map((s) => <Stat key={s.label} {...s} onClick={() => onNavigate(...s.go)} />)}
            </ul>
            <p className="mt-3 text-xs leading-relaxed text-faint">Sample program figures shown for illustration, not measured customer results.</p>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-shell gap-8 px-4 py-12 sm:px-6 lg:grid-cols-3">
        <section aria-labelledby="launch-title" className="lg:col-span-2">
          <h2 id="launch-title" className="text-xl font-semibold tracking-tight text-ink">Start anywhere</h2>
          <div className="mt-3 flex flex-wrap gap-2" aria-label="Quick actions">
            {quick.map(([label, ...go]) => (
              <button key={label} type="button" onClick={() => onNavigate(...go)} className={`vt-chip rounded-full px-4 py-1.5 text-xs font-medium text-ink transition-transform hover:-translate-y-0.5 ${focusRing}`}>{label}</button>
            ))}
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {MODULES.map((m) => {
              const Icon = m.icon;
              const rec = r.rec?.includes(m.id);
              return (
                <button key={m.id} type="button" onClick={() => onNavigate(m.id)} className={`vt-card vt-card-hover group relative flex flex-col justify-between rounded-2xl p-6 text-left ${focusRing} ${rec ? "selected-indicator" : ""}`}>
                  <span className="flex items-start justify-between gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-signal-wash text-signal transition-colors duration-200 group-hover:bg-signal group-hover:text-white">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    {rec && <span className="vt-tag vt-tag-signal">Recommended</span>}
                  </span>
                  <span className="mt-4 block text-lg font-semibold leading-snug text-ink">{m.label}</span>
                  <span className="mt-1.5 block text-sm leading-relaxed text-pewter">{m.blurb}</span>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink transition-colors group-hover:text-signal-deep">
                    Open module <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                  </span>
                </button>
              );
            })}
          </div>
        </section>
        <div className="lg:sticky lg:top-28 lg:self-start"><ActivityFeed onNavigate={onNavigate} /></div>
      </div>
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
            <button key={id} type="button" role="tab" aria-selected={on} onClick={() => onChange(id)} className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-colors duration-200 ${focusRing} ${on ? "bg-signal text-white font-medium" : "text-pewter hover:bg-white hover:text-ink"}`}>
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
  components,
  initialRole = "b2c",
  initialModule = "home",
  initialSerial = null,
  initialProfileUsername = "",
  initialMessageUsername = "",
  homeUrl,
  onSignOut,
}) {
  const { triggerCheckout } = useCheckout();
  const C = useMemo(() => ({ ...DEFAULT_COMPONENTS, ...components }), [components]);
  const [active, setActive] = useState(initialModule);
  const [views, setViews] = useState(DEFAULT_VIEWS);
  const [visited, setVisited] = useState(() => new Set(["home", initialModule]));
  const [role, setRole] = useState(initialRole);
  const [authState, setAuthState] = useState({ user: null, session: null, isLoading: true });
  const [notifsByRole, setNotifsByRole] = useState(SEED_NOTIFS);
  const [upgradeDevice, setUpgradeDevice] = useState("t14");
  const [builderConfig, setBuilderConfig] = useState(null);
  const [qcSerial, setQcSerial] = useState(initialSerial);
  const [palette, setPalette] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [toast, setToast] = useState(null);

  const notify = useCallback((msg) => setToast({ msg, n: Date.now() }), []);
  const updateAuthState = useCallback((nextAuthState) => {
    setAuthState(nextAuthState);
  }, []);
  const clearToast = useCallback(() => setToast(null), []);
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

  const navigate = useCallback((id, viewOrData) => {
    if (id === "home" && homeUrl && window.location.pathname !== homeUrl) {
      window.location.assign(homeUrl);
      return;
    }

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
  }, [show, notify, homeUrl]);

  // The URL hash mirrors the active view (deep links and the back button)
  useEffect(() => {
    const read = () => {
      if (["qc", "profile", "messages"].includes(initialModule)) {
        show(initialModule);
        if (window.location.hash) {
          window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}`);
        }
        return;
      }
      const rawHash = window.location.hash.slice(1);
      if (!rawHash) {
        if (initialModule === "home") show("home");
        return;
      }
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
  }, [show, initialModule]);

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
    <div className="flex min-h-screen flex-col bg-[#F4F4F2] text-[#141518] font-sans antialiased">
      <Navbar active={active} role={role} setRole={setRole} user={authState.user} notifs={notifsByRole[role] || []} setNotifs={setNotifs} onNavigate={navigate} onSearch={() => setPalette(true)} onMenu={() => setDrawer(true)} onNotify={notify} onAuthState={updateAuthState} onSignOut={handleSignOut} />

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
      <MobileDrawer open={drawer} onClose={closeDrawer} active={active} onNavigate={navigate} role={role} user={authState.user} />
      <CommandPalette open={palette} onClose={closePalette} onSelect={(it) => navigate(it.module, it.view)} />
      <ToastHost toast={toast} onDone={clearToast} />
    </div>
  );
}
