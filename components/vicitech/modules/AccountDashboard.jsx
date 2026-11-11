import { useEffect, useMemo, useRef, useState } from "react";
import {
  User, Building2, GraduationCap, Package, RefreshCw, Sliders, ShieldCheck, Settings, FileText,
  CheckCircle2, Clock, LogOut, ChevronDown, Cpu, Plus, X, Activity,
} from "lucide-react";
import { listMyOrders, listUserPresets } from "@/lib/supabase";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getUserDisplayName, getUserInitials, getUserOrganization } from "@/lib/supabase/profile";

/* ───────────────────────── Helpers ───────────────────────── */

const DAY = 864e5;
const ago = (d) => new Date(Date.now() - d * DAY);
const later = (d) => new Date(Date.now() + d * DAY);
const addMonths = (d, m) => { const x = new Date(d); x.setMonth(x.getMonth() + m); return x; };
const fmtDate = (d) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(d);
const idr = (n) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70";
const sum = (list, f) => list.reduce((s, x) => s + f(x), 0);

async function sha256Hex(text) {
  try {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    let h = 0x811c9dc5, out = ""; // fallback for non-secure contexts
    for (let r = 0; r < 8; r++) { for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i) + r; h = Math.imul(h, 16777619) >>> 0; } out += h.toString(16).padStart(8, "0"); }
    return out;
  }
}

// Minimal single-page text PDF (Helvetica, Latin-1) so exports work without a PDF library
function makePdf(lines) {
  const clean = (s) => s.replace(/[^\x20-\xFF]/g, "?").replace(/[\\()]/g, "\\$&");
  const content = ["BT", "/F1 10 Tf", "14 TL", "50 800 Td", ...lines.map((l) => `(${clean(l)}) '`), "ET"].join("\n");
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = objs.map((o, i) => { const at = pdf.length; pdf += `${i + 1} 0 obj\n${o}\nendobj\n`; return at; });
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([Uint8Array.from(pdf, (c) => c.charCodeAt(0) & 255)], { type: "application/pdf" });
}
const saveBlob = (blob, name) => {
  const url = URL.createObjectURL(blob);
  Object.assign(document.createElement("a"), { href: url, download: name }).click();
  URL.revokeObjectURL(url);
};
const randomKey = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return `vt_live_${Array.from(bytes, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 32)}`;
};

const TRADE_STAGES = ["Submitted", "Inspection scheduled", "Inspected at Hub Bandung", "Offer ready", "Paid"];
const CITIES = ["Taraju, Tasikmalaya", "Tasikmalaya", "Bandung Hub pickup"];
const SCOPES = ["orders:write", "tradein:read", "qc:read", "presets:read"];
const CHECKS = ["Battery or PSU health", "Thermal re-pasting", "Fan and cooling", "CPU stress test", "Screen or display output", "Keyboard or front panel", "Webcam and audio", "Speakers", "Storage health", "Memory test", "Secure data wipe (NIST 800-88)", "Ports and connectivity", "Wi-Fi and Bluetooth", "Chassis and hinges", "BIOS and firmware"];

const ROLES = {
  b2c: { label: "B2C Member / Creator", icon: User, focus: "Your saved builds and activity" },
  b2b: { label: "B2B Enterprise Admin", icon: Building2, focus: "Your organization and orders" },
  b2s: { label: "B2S School / CBT Lab Admin", icon: GraduationCap, focus: "Your lab and orders" },
};

const EMPTY_ACCOUNT_DATA = {
  trades: [],
  presets: [],
  certs: [],
  invoices: [],
  maintenance: [],
  posts: [],
};
const initStore = () => Object.fromEntries(Object.keys(ROLES).map((r) => [r, { addresses: [], defaultAddr: null, keys: [], offers: {}, done: {}, prefs: { twoFactor: false, alerts: true } }]));

/* ───────────────────────── Derived values ───────────────────────── */

const unitTotal = (p) => sum(p.parts, (x) => x[2]);
const warrantyEnd = (c) => (c.purchased === null ? null : addMonths(ago(c.purchased), c.months));
const daysLeft = (c) => { const e = warrantyEnd(c); return e ? Math.ceil((e - Date.now()) / DAY) : null; };
const tradeStage = (t, offers) => (offers[t.id] === "accepted" ? Math.max(t.stage, 4) : t.stage);

function focusCards(userPresets, isLoading) {
  const savedPresets = isLoading ? "…" : userPresets.length;
  const customRigs = isLoading ? "…" : userPresets.filter((preset) =>
    Array.isArray(preset.parts) && preset.parts.length > 0
  ).length;
  return [
    { icon: Sliders, label: "Saved presets", value: savedPresets, sub: "Saved to this account", tab: "presets" },
    { icon: Cpu, label: "Custom rigs", value: customRigs, sub: "Your saved configurations", tab: "presets" },
    { icon: FileText, label: "Community posts", value: "—", sub: "Community profile not connected", tab: "community" },
  ];
}

/* ───────────────────────── Small UI ───────────────────────── */

const card = "rounded-xl border border-zinc-800 bg-zinc-900/50";
const btn = `inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`;
const ghost = `${btn} border border-zinc-700 text-zinc-200 hover:border-cyan-400/60 hover:text-cyan-300`;
const inputCls = `w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 ${focusRing}`;
const Chip = ({ tone = "zinc", children }) => {
  const t = { zinc: "border-zinc-700 text-zinc-300", cyan: "border-cyan-400/30 bg-cyan-400/10 text-cyan-300", emerald: "border-emerald-400/30 bg-emerald-400/10 text-emerald-400", amber: "border-amber-400/30 bg-amber-400/10 text-amber-300" }[tone];
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${t}`}>{children}</span>;
};

function Stepper({ steps, done, current = true }) {
  // done = number of completed steps; the next one is "in progress" when current is true
  return (
    <div>
      <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"><div className="h-full rounded-full bg-emerald-400 transition-all duration-500" style={{ width: `${(done / steps.length) * 100}%` }} /></div>
      <ol className="mt-3 grid gap-2 sm:grid-cols-[repeat(auto-fit,minmax(9rem,1fr))]">
        {steps.map((s, i) => {
          const complete = i < done, now = i === done && current;
          return (
            <li key={s} className="flex items-start gap-2 text-sm">
              {complete ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400" /> : now ? <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" /> : <span className="mt-1 h-3.5 w-3.5 shrink-0 rounded-full border border-zinc-200 dark:border-zinc-700" />}
              <span className={complete ? "text-zinc-800 dark:text-zinc-200" : now ? "font-medium text-amber-700 dark:text-amber-300" : "text-zinc-500"}>{s}{now && <span className="block text-xs font-normal text-zinc-500">In progress</span>}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Switch({ on, onChange, label, hint }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div><p className="text-sm text-zinc-900 dark:text-zinc-100">{label}</p><p className="text-xs text-zinc-500">{hint}</p></div>
      <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${focusRing} ${on ? "bg-emerald-400" : "bg-zinc-100 dark:bg-zinc-700"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white dark:bg-zinc-950 transition-all ${on ? "left-[1.375rem]" : "left-0.5"}`} />
      </button>
    </div>
  );
}

function RoleSwitcher({ role, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const down = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const key = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", down); document.addEventListener("keydown", key);
    return () => { document.removeEventListener("pointerdown", down); document.removeEventListener("keydown", key); };
  }, [open]);
  const Cur = ROLES[role].icon;
  return (
    <div ref={ref} className="relative">
      <button type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((v) => !v)} className={`flex w-full items-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 hover:border-emerald-600/60 dark:hover:border-emerald-400/60 sm:w-72 ${focusRing}`}>
        <Cur className="h-4 w-4 text-cyan-700 dark:text-cyan-400" /><span className="flex-1 text-left">{ROLES[role].label}</span><ChevronDown className={`h-4 w-4 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ul role="listbox" aria-label="Switch role" className="absolute right-0 top-full z-20 mt-2 w-full min-w-[18rem] rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-1.5 shadow-2xl shadow-black/50">
          {Object.entries(ROLES).map(([k, r]) => {
            const I = r.icon;
            return (
              <li key={k} role="option" aria-selected={k === role}>
                <button type="button" onClick={() => { onChange(k); setOpen(false); }} className={`flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left ${focusRing} ${k === role ? "bg-emerald-600/10 dark:bg-emerald-400/10" : "hover:bg-white dark:hover:bg-zinc-900"}`}>
                  <I className="mt-0.5 h-4 w-4 shrink-0 text-cyan-700 dark:text-cyan-400" />
                  <span><span className="block text-sm text-zinc-900 dark:text-zinc-100">{r.label}</span><span className="block text-xs text-zinc-500">{r.focus}</span></span>
                  {k === role && <CheckCircle2 className="ml-auto mt-0.5 h-4 w-4 text-emerald-700 dark:text-emerald-400" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ───────────────────────── Tab panels ───────────────────────── */

function OrdersTab({ liveOrders = [], isLoading, error, onNavigate, onOpenQc }) {
  if (isLoading) {
    return <p role="status" className={`${card} p-5 text-sm text-zinc-600 dark:text-zinc-400`}>Loading your orders…</p>;
  }
  if (error) {
    return <p role="alert" className="rounded-xl border border-red-400/30 bg-red-400/5 p-5 text-sm text-red-700 dark:text-red-300">{error}</p>;
  }
  if (!liveOrders.length) {
    return (
      <section className={`${card} overflow-hidden p-6 sm:p-8`}>
        <div className="mx-auto max-w-xl text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-emerald-600/30 dark:border-emerald-400/30 bg-emerald-600/10 dark:bg-emerald-400/10 text-cyan-700 dark:text-cyan-300 shadow-[0_0_32px_-12px_rgba(34,211,238,0.65)]">
            <Cpu className="h-7 w-7" />
          </span>
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-400">Garage status</p>
          <h3 className="mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">No active orders yet.</h3>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">Start building your custom rig in Preset Builder!</p>
          <button type="button" onClick={() => onNavigate?.("builder")} className={`${btn} mt-5 border border-emerald-600/40 dark:border-emerald-400/40 bg-emerald-600/10 dark:bg-emerald-400/10 font-medium text-cyan-800 dark:text-cyan-200 hover:bg-emerald-600/15 dark:hover:bg-emerald-400/15`}>
            <Plus className="h-4 w-4" /> Open Preset Builder
          </button>
        </div>
      </section>
    );
  }
  return (
    <div className="space-y-4">
      {liveOrders.map((o) => {
        const total = Number(o.total_price ?? (Number(o.base_price || 0) + Number(o.jit_buffer || 0)));
        const placed = o.created_at ? new Date(o.created_at) : null;
        const status = o.status || "Status pending";
        const units = Number(o.order_summary?.quantity || o.order_summary?.qty || 1);
        return (
        <article key={o.id} className={`${card} p-5`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Chip tone="cyan">{status}</Chip>
                <span className="break-all text-xs tabular-nums text-zinc-500">{o.id}</span>
              </div>
              <h3 className="mt-1.5 font-semibold text-zinc-900 dark:text-zinc-50">{o.product_name}</h3>
              <p className="text-xs text-zinc-500">{placed && !Number.isNaN(placed.getTime()) ? `Placed ${fmtDate(placed)}, ` : ""}{units} {units === 1 ? "unit" : "units"}</p>
            </div>
            <p className="text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">{idr(total)}</p>
          </div>
          {o.serial_number && <button type="button" onClick={() => onOpenQc?.(o.serial_number)} className={`${ghost} mt-4 py-1.5 text-cyan-700 dark:text-cyan-300 hover:text-cyan-800 dark:hover:text-cyan-200`}><Activity className="h-4 w-4" /> Inspect in IoT QC</button>}
        </article>
      );
      })}
    </div>
  );
}

function TradeTab({ d, store, onOffer, onNavigate }) {
  if (!d.trades.length) {
    return (
      <section className={`${card} p-6 text-center`}>
        <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">No trade-in requests yet.</p>
        {onNavigate && <button type="button" onClick={() => onNavigate("tradein")} className={`${ghost} mt-4`}><Plus className="h-4 w-4" /> Explore Trade-In</button>}
      </section>
    );
  }
  return (
    <div className="space-y-4">
      {d.trades.map((t) => {
        const decision = store.offers[t.id];
        const eff = tradeStage(t, store.offers);
        const offerOpen = t.offer && t.stage === 3 && !decision;
        return (
          <article key={t.id} className={`${card} p-5`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2"><Chip tone="cyan">{t.entity}</Chip><span className="text-xs tabular-nums text-zinc-500">{t.id}</span></div>
                <h3 className="mt-1.5 font-semibold text-zinc-900 dark:text-zinc-50">{t.title}</h3>
                <p className="text-xs text-zinc-500">{t.units} x {t.equipment.toLowerCase()}, {t.condition.toLowerCase()}, submitted {fmtDate(ago(t.submitted))}</p>
              </div>
              <div className="text-right"><p className="text-xs text-zinc-500">Estimated buyback</p><p className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">{idr(t.low)} to {idr(t.high)}</p></div>
            </div>
            <div className="mt-4"><Stepper steps={TRADE_STAGES} done={decision === "declined" ? t.stage : eff} current={decision !== "declined" && eff < 5} /></div>
            {offerOpen && (
              <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-3">
                <div className="min-w-0 flex-1"><p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Final offer: {idr(t.offer)}</p><p className="text-xs text-zinc-600 dark:text-zinc-400">Based on the Hub Bandung inspection. Accept to start the payout.</p></div>
                <button type="button" onClick={() => onOffer(t.id, "accepted")} className={`${btn} bg-emerald-400 font-semibold text-zinc-950 hover:bg-emerald-300`}>Accept offer</button>
                <button type="button" onClick={() => onOffer(t.id, "declined")} className={ghost}>Decline</button>
              </div>
            )}
            {decision === "accepted" && <p className="mt-4 flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400"><CheckCircle2 className="h-4 w-4" /> Offer of {idr(t.offer)} accepted. Payout is being processed.</p>}
            {decision === "declined" && <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">You declined this offer. The request is closed.</p>}
          </article>
        );
      })}
      {onNavigate && <button type="button" onClick={() => onNavigate("tradein")} className={ghost}><Plus className="h-4 w-4" /> New trade-in request</button>}
    </div>
  );
}

function PresetsTab({ userPresets = [], isLoading, onExport, onReconfigure, canReconfigure, onNavigate }) {
  const [open, setOpen] = useState(null);
  const combinedPresets = useMemo(() => {
    const mappedUser = userPresets.map((up) => ({
      id: up.id,
      name: up.name,
      kind: "Custom PC",
      units: up.qty || 1,
      updated: 0,
      parts: Array.isArray(up.parts) ? up.parts : [],
      isUserSaved: true,
    }));
    return mappedUser;
  }, [userPresets]);

  if (isLoading) {
    return <p role="status" className={`${card} p-5 text-sm text-zinc-600 dark:text-zinc-400`}>Loading your saved presets…</p>;
  }
  if (!combinedPresets.length) {
    return (
      <section className={`${card} p-6 text-center`}>
        <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">No saved presets yet.</p>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Create a custom configuration in Preset Builder and save it to your account.</p>
        <button type="button" onClick={() => onNavigate?.("builder")} className={`${ghost} mt-4`}><Sliders className="h-4 w-4" /> Open Preset Builder</button>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      {combinedPresets.map((p) => {
        const unit = unitTotal(p);
        return (
          <article key={p.id} className={`${card} p-5`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Chip tone="cyan">{p.kind}</Chip>
                  {p.isUserSaved && (
                    <span className="rounded bg-emerald-600/10 dark:bg-emerald-400/10 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-700 dark:text-cyan-300">
                      User Saved Preset
                    </span>
                  )}
                  <span className="text-xs text-zinc-500">Updated {p.updated === 0 ? "Today" : fmtDate(ago(p.updated))}</span>
                </div>
                <h3 className="mt-1.5 font-semibold text-zinc-900 dark:text-zinc-50">{p.name}</h3>
                <p className="text-xs text-zinc-500">{p.units} {p.units > 1 ? "units" : "unit"}, {idr(unit)} per unit</p>
              </div>
              <p className="text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">{idr(unit * p.units)}</p>
            </div>
            <button type="button" aria-expanded={open === p.id} onClick={() => setOpen(open === p.id ? null : p.id)} className={`mt-3 inline-flex items-center gap-1.5 rounded text-sm text-cyan-700 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 ${focusRing}`}>
              <ChevronDown className={`h-4 w-4 transition-transform ${open === p.id ? "rotate-180" : ""}`} /> {open === p.id ? "Hide parts" : "View parts"}
            </button>
            {open === p.id && (
              <dl className="mt-2 divide-y divide-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-800 text-sm">
                {p.parts.map(([slot, name, price]) => <div key={slot} className="flex justify-between gap-3 px-3 py-2"><dt className="text-zinc-500">{slot}: <span className="text-zinc-800 dark:text-zinc-200">{name}</span></dt><dd className="tabular-nums text-zinc-700 dark:text-zinc-300">{idr(price)}</dd></div>)}
              </dl>
            )}
            <div className="mt-4 flex flex-wrap gap-2 border-t border-zinc-200 dark:border-zinc-800 pt-3">
              <button type="button" onClick={() => onExport(p)} className={`${btn} bg-emerald-600 dark:bg-emerald-400 font-medium text-white dark:text-zinc-950 hover:bg-emerald-500 dark:hover:bg-emerald-300`}><FileText className="h-4 w-4" /> Export PDF Proposal</button>
              <button type="button" disabled={!canReconfigure} title={canReconfigure ? undefined : "Connect the Preset Builder to enable this"} onClick={() => onReconfigure(p)} className={ghost}><Sliders className="h-4 w-4" /> Re-configure in Builder</button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function CertsTab({ d, role, store, selected, setSelected, onReport, onLink, onDone }) {
  if (!d.certs.length) {
    return (
      <section className={`${card} p-6 text-center`}>
        <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">No QC certificates yet.</p>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Certificates for your units will appear here when available.</p>
      </section>
    );
  }
  const c = d.certs.find((x) => x.serial === selected) || d.certs[0];
  const left = daysLeft(c);
  const total = c.months * 30;
  const tone = left === null ? "text-zinc-400" : left <= 0 ? "text-red-400" : left <= 60 ? "text-amber-400" : "text-emerald-400";
  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-5">
        <ul className="space-y-2 xl:col-span-2" aria-label="Certificates">
          {d.certs.map((x) => {
            const dl = daysLeft(x);
            return (
              <li key={x.serial}>
                <button type="button" aria-pressed={x.serial === c.serial} onClick={() => setSelected(x.serial)} className={`w-full rounded-xl border p-3 text-left ${focusRing} ${x.serial === c.serial ? "border-emerald-600/60 dark:border-emerald-400/60 bg-emerald-600/10 dark:bg-emerald-400/10" : "border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 hover:border-zinc-200 dark:hover:border-zinc-700"}`}>
                  <span className="block text-xs tabular-nums text-cyan-700 dark:text-cyan-300">{x.serial}</span>
                  <span className="block text-sm text-zinc-900 dark:text-zinc-100">{x.name}</span>
                  <span className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-zinc-500">{x.units} {x.units > 1 ? "units" : "unit"}{x.assignee && <>, {x.assignee}</>}
                    {dl === null ? <Chip>Warranty starts on delivery</Chip> : dl <= 0 ? <Chip tone="amber">Warranty ended</Chip> : <Chip tone={dl <= 60 ? "amber" : "emerald"}>{dl} days of warranty left</Chip>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <section className={`${card} p-5 xl:col-span-3`} aria-label="Certificate details">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h3 className="font-semibold text-zinc-900 dark:text-zinc-50">{c.name}</h3><p className="text-sm tabular-nums text-cyan-700 dark:text-cyan-300">{c.serial}{c.units > 1 ? ` and ${c.units - 1} more serials in this batch` : ""}</p></div>
            <Chip tone="emerald"><ShieldCheck className="h-3 w-3" /> 15 of 15 Pass</Chip>
          </div>
          <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            {[["Tested", fmtDate(ago(c.tested))], ["Technician sign-off", `${c.techId}, ${c.tech}`], ["Units covered", c.units], [role === "b2s" ? "Lab or room" : "Assigned to", c.assignee || "You"]].map(([k, v]) => <div key={k} className="rounded-lg bg-white/60 dark:bg-zinc-950/60 p-2.5"><dt className="text-xs text-zinc-500">{k}</dt><dd className="text-zinc-900 dark:text-zinc-100">{v}</dd></div>)}
          </dl>
          <div className="mt-4">
            <div className="flex justify-between text-sm"><span className="text-zinc-600 dark:text-zinc-400">Warranty</span><span className={tone}>{left === null ? "Starts when the order is delivered" : left <= 0 ? "Ended" : `${left} days left, ends ${fmtDate(warrantyEnd(c))}`}</span></div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"><div className={`h-full rounded-full ${left !== null && left <= 60 ? "bg-amber-400" : "bg-emerald-400"}`} style={{ width: `${left === null ? 100 : Math.max(0, Math.min(100, (left / total) * 100))}%` }} /></div>
          </div>
          <h4 className="mb-2 mt-5 text-sm font-medium text-zinc-700 dark:text-zinc-300">15-point inspection</h4>
          <ul className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2">{CHECKS.map((k) => <li key={k} className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300"><CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400" /> {k}</li>)}</ul>
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" onClick={() => onReport(c)} className={`${btn} bg-emerald-600 dark:bg-emerald-400 font-medium text-white dark:text-zinc-950 hover:bg-emerald-500 dark:hover:bg-emerald-300`}><FileText className="h-4 w-4" /> Download report (PDF)</button>
            <button type="button" onClick={() => onLink(c)} className={ghost}>Copy verification link</button>
          </div>
        </section>
      </div>

      {role === "b2s" && (
        <section className={`${card} p-5`} aria-labelledby="maint-title">
          <h3 id="maint-title" className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-50"><Clock className="h-4 w-4 text-amber-700 dark:text-amber-400" /> Maintenance schedule</h3>
          <ul className="mt-3 divide-y divide-zinc-800">
            {d.maintenance.map(([id, title, where, due]) => {
              const done = store.done[id];
              return (
                <li key={id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
                  <span className="min-w-0 flex-1"><span className={`block ${done ? "text-zinc-500 line-through" : "text-zinc-900 dark:text-zinc-100"}`}>{title}</span><span className="text-xs text-zinc-500">{where}, due {fmtDate(later(due))}</span></span>
                  {!done && due <= 14 && <Chip tone="amber">Due in {due} days</Chip>}
                  <button type="button" aria-pressed={!!done} onClick={() => onDone(id)} className={`${ghost} py-1.5`}>{done ? <><CheckCircle2 className="h-4 w-4 text-emerald-700 dark:text-emerald-400" /> Done</> : "Mark done"}</button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

function AddressForm({ onAdd }) {
  const [f, setF] = useState({ label: "", city: CITIES[0], line: "" });
  const [err, setErr] = useState("");
  const submit = (e) => {
    e.preventDefault();
    if (f.label.trim().length < 2 || f.line.trim().length < 5) return setErr("Add a label and a street line.");
    onAdd({ id: `a${Date.now()}`, label: f.label.trim(), city: f.city, line: f.line.trim() });
    setF({ label: "", city: CITIES[0], line: "" }); setErr("");
  };
  return (
    <form onSubmit={submit} className="mt-3 grid gap-2 sm:grid-cols-3">
      <input aria-label="Address label" value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} placeholder="Label, e.g. Warehouse" className={inputCls} />
      <select aria-label="City or hub" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} className={inputCls}>{CITIES.map((c) => <option key={c}>{c}</option>)}</select>
      <input aria-label="Street line" value={f.line} onChange={(e) => setF({ ...f, line: e.target.value })} placeholder="Street and number" className={inputCls} />
      <div className="flex items-center gap-3 sm:col-span-3"><button type="submit" className={ghost}><Plus className="h-4 w-4" /> Add address</button>{err && <p role="alert" className="text-sm text-red-700 dark:text-red-400">{err}</p>}</div>
    </form>
  );
}

function ApiKeys({ role, rs, patch, flash }) {
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState(["orders:write", "qc:read"]);
  const [fresh, setFresh] = useState(null);
  const [err, setErr] = useState("");
  if (role === "b2c") {
    return <p className="mt-3 rounded-lg border border-dashed border-zinc-200 dark:border-zinc-700 p-4 text-sm text-zinc-600 dark:text-zinc-400">API keys for automated procurement are available on B2B and B2S accounts. Switch the role to try the generator.</p>;
  }
  const create = (e) => {
    e.preventDefault();
    if (name.trim().length < 3) return setErr("Give the key a name of at least 3 characters.");
    if (!scopes.length) return setErr("Pick at least one scope.");
    const key = randomKey();
    patch((s) => ({ ...s, keys: [{ id: `k${Date.now()}`, name: name.trim(), scopes, created: new Date(), last4: key.slice(-4) }, ...s.keys] }));
    setFresh(key); setName(""); setErr("");
  };
  const copy = async () => { try { await navigator.clipboard.writeText(fresh); flash("API key copied to clipboard."); } catch { flash("Copying isn't available in this browser."); } };
  return (
    <div className="mt-3 space-y-4">
      <form onSubmit={create} className="space-y-3">
        <input aria-label="API key name" value={name} onChange={(e) => { setName(e.target.value); setErr(""); }} placeholder="Key name, e.g. ERP procurement hook" className={inputCls} />
        <fieldset className="flex flex-wrap gap-2"><legend className="sr-only">Scopes</legend>
          {SCOPES.map((s) => { const on = scopes.includes(s); return <label key={s} className={`cursor-pointer rounded-full border px-3 py-1 text-xs ${on ? "border-emerald-600/60 dark:border-emerald-400/60 bg-emerald-600/10 dark:bg-emerald-400/10 text-cyan-700 dark:text-cyan-300" : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400"}`}><input type="checkbox" className="sr-only" checked={on} onChange={() => setScopes((l) => (on ? l.filter((x) => x !== s) : [...l, s]))} />{s}</label>; })}
        </fieldset>
        <div className="flex flex-wrap items-center gap-3"><button type="submit" className={`${btn} bg-emerald-600 dark:bg-emerald-400 font-medium text-white dark:text-zinc-950 hover:bg-emerald-500 dark:hover:bg-emerald-300`}><Plus className="h-4 w-4" /> Generate API key</button>{err && <p role="alert" className="text-sm text-red-700 dark:text-red-400">{err}</p>}</div>
      </form>
      {fresh && (
        <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-3" role="status">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Copy this key now. It will not be shown again.</p>
          <code className="mt-2 block break-all rounded bg-white dark:bg-zinc-950 p-2 text-xs text-emerald-700 dark:text-emerald-300">{fresh}</code>
          <div className="mt-2 flex gap-2"><button type="button" onClick={copy} className={`${ghost} py-1.5`}>Copy key</button><button type="button" onClick={() => setFresh(null)} className={`${ghost} py-1.5`}>I saved it</button></div>
        </div>
      )}
      <ul className="divide-y divide-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-800">
        {rs.keys.length === 0 && <li className="p-3 text-sm text-zinc-500">No keys yet.</li>}
        {rs.keys.map((k) => (
          <li key={k.id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
            <span className="min-w-0 flex-1"><span className="block text-zinc-900 dark:text-zinc-100">{k.name}</span><span className="text-xs text-zinc-500">vt_live_••••{k.last4}, created {fmtDate(k.created)}, {k.scopes.join(", ")}</span></span>
            <button type="button" onClick={() => patch((s) => ({ ...s, keys: s.keys.filter((x) => x.id !== k.id) }))} className={`${ghost} py-1.5`}>Revoke</button>
          </li>
        ))}
      </ul>
      <p className="text-xs text-zinc-600">Send the key as a Bearer token. Use the endpoint of your own ViciTech API deployment.</p>
    </div>
  );
}

function ProfileIdentity({ user }) {
  const [username, setUsername] = useState(user?.user_metadata?.username || "");
  const [displayName, setDisplayName] = useState(
    user?.user_metadata?.full_name || getUserDisplayName(user)
  );
  const [avatarUrl, setAvatarUrl] = useState(user?.user_metadata?.avatar_url || "");
  const [bio, setBio] = useState(user?.user_metadata?.bio || "");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    setUsername(user?.user_metadata?.username || "");
    setDisplayName(user?.user_metadata?.full_name || getUserDisplayName(user));
    setAvatarUrl(user?.user_metadata?.avatar_url || "");
    setBio(user?.user_metadata?.bio || "");
    setMessage("");

    if (!user?.id) return () => { active = false; };

    try {
      getSupabaseBrowserClient()
        .from("profiles")
        .select("username, display_name, full_name, avatar_url, bio")
        .eq("id", user.id)
        .maybeSingle()
        .then(({ data, error }) => {
          if (!active) return;
          if (error) {
            setMessage(`Could not load your saved profile: ${error.message}`);
            return;
          }
          if (data) {
            setUsername(data.username || user?.user_metadata?.username || "");
            setDisplayName(data.full_name || data.display_name || user?.user_metadata?.full_name || getUserDisplayName(user));
            setAvatarUrl(data.avatar_url || user?.user_metadata?.avatar_url || "");
            setBio(data.bio || user?.user_metadata?.bio || "");
          }
        })
        .catch((error) => {
          if (active) setMessage(`Could not load your saved profile: ${error.message}`);
        });
    } catch (error) {
      setMessage(`Could not load your saved profile: ${error.message}`);
    }

    return () => { active = false; };
  }, [user]);

  const saveProfile = async (event) => {
    event.preventDefault();
    const normalizedUsername = username.trim();
    const normalizedDisplayName = displayName.trim();
    const normalizedAvatarUrl = avatarUrl.trim();
    const normalizedBio = bio.trim();
    if (!/^[a-z0-9]{3,20}$/.test(normalizedUsername)) {
      setMessage("Username must be 3–20 characters and contain only lowercase letters and numbers.");
      return;
    }
    if (!normalizedDisplayName || normalizedDisplayName.length > 80) {
      setMessage("Display name is required and must be 80 characters or fewer.");
      return;
    }
    if (normalizedBio.length > 500) {
      setMessage("Bio must be 500 characters or fewer.");
      return;
    }
    if (normalizedAvatarUrl) {
      try {
        if (new URL(normalizedAvatarUrl).protocol !== "https:") throw new Error();
      } catch {
        setMessage("Avatar URL must be a valid HTTPS URL.");
        return;
      }
    }
    if (!user?.id) {
      setMessage("You must be signed in to update your profile.");
      return;
    }

    setIsSaving(true);
    setMessage("");
    try {
      const client = getSupabaseBrowserClient();
      const { data: previousProfile, error: readError } = await client
        .from("profiles")
        .select("username, display_name, full_name, avatar_url, bio")
        .eq("id", user.id)
        .maybeSingle();
      if (readError) throw new Error(`Could not verify the current profile: ${readError.message}`);

      const { error: saveError } = await client.from("profiles").upsert(
        {
          id: user.id,
          username: normalizedUsername,
          display_name: normalizedDisplayName,
          full_name: normalizedDisplayName,
          avatar_url: normalizedAvatarUrl || null,
          bio: normalizedBio || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
      if (saveError) {
        if (saveError.code === "23505") throw new Error("That username is already taken. Choose another one.");
        throw new Error(`Could not save your profile: ${saveError.message}`);
      }

      const { error: authError } = await client.auth.updateUser({
        data: {
          username: normalizedUsername,
          full_name: normalizedDisplayName,
          avatar_url: normalizedAvatarUrl || null,
          bio: normalizedBio || null,
        },
      });
      if (authError) {
        const rollback = previousProfile
          ? await client.from("profiles").upsert(
              { id: user.id, ...previousProfile, updated_at: new Date().toISOString() },
              { onConflict: "id" }
            )
          : await client.from("profiles").delete().eq("id", user.id);
        if (rollback.error) {
          throw new Error(
            `Auth metadata update failed: ${authError.message}. Profile rollback also failed: ${rollback.error.message}`
          );
        }
        throw new Error(`Auth metadata update failed: ${authError.message}`);
      }

      setUsername(normalizedUsername);
      setDisplayName(normalizedDisplayName);
      setAvatarUrl(normalizedAvatarUrl);
      setBio(normalizedBio);
      setMessage("Profile saved. Your account and navbar identity are updated.");
    } catch (error) {
      setMessage(error.message || "Could not save your profile.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className={`${card} p-5`} aria-labelledby="identity-title">
      <h3 id="identity-title" className="font-semibold text-zinc-900 dark:text-zinc-50">Profile &amp; Identity</h3>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Choose the username and display name shown across ViciTech.</p>
      <form onSubmit={saveProfile} className="mt-4 space-y-4">
        <label className="block text-sm text-zinc-700 dark:text-zinc-300">
          Username
          <span className="mt-1.5 flex items-center rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 focus-within:border-emerald-600/60 dark:focus-within:border-emerald-400/60">
            <span className="text-zinc-500">@</span>
            <input
              type="text"
              name="username"
              value={username}
              onChange={(event) => setUsername(event.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""))}
              autoComplete="username"
              maxLength={20}
              pattern="[a-z0-9]{3,20}"
              required
              aria-describedby="username-help"
              className="w-full bg-transparent px-2 py-2.5 text-zinc-900 dark:text-zinc-100 outline-none"
            />
          </span>
          <span id="username-help" className="mt-1 block text-xs text-zinc-500">3–20 lowercase letters or numbers. Usernames must be unique.</span>
        </label>
        <label className="block text-sm text-zinc-700 dark:text-zinc-300">
          Display name
          <input
            type="text"
            name="displayName"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            autoComplete="name"
            maxLength={80}
            required
            className="mt-1.5 w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2.5 text-zinc-900 dark:text-zinc-100 outline-none focus:border-emerald-600/60 dark:focus:border-emerald-400/60"
          />
        </label>
        <label className="block text-sm text-zinc-700 dark:text-zinc-300">
          Avatar image URL
          <input
            type="url"
            name="avatarUrl"
            value={avatarUrl}
            onChange={(event) => setAvatarUrl(event.target.value)}
            placeholder="https://example.com/avatar.png"
            className="mt-1.5 w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2.5 text-zinc-900 dark:text-zinc-100 outline-none focus:border-emerald-600/60 dark:focus:border-emerald-400/60"
          />
        </label>
        <label className="block text-sm text-zinc-700 dark:text-zinc-300">
          Public bio
          <textarea
            name="bio"
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            maxLength={500}
            rows={3}
            className="mt-1.5 w-full resize-y rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2.5 text-zinc-900 dark:text-zinc-100 outline-none focus:border-emerald-600/60 dark:focus:border-emerald-400/60"
          />
        </label>
        <button type="submit" disabled={isSaving} className={`${ghost} disabled:cursor-wait disabled:opacity-60`}>
          {isSaving ? "Saving profile…" : "Save profile"}
        </button>
        {message && <p role="status" aria-live="polite" className="text-sm text-cyan-800 dark:text-cyan-200">{message}</p>}
      </form>
    </section>
  );
}

function SettingsTab({ role, rs, patch, flash, user }) {
  return (
    <div className="space-y-4">
      <ProfileIdentity user={user} />
      <section className={`${card} p-5`} aria-labelledby="sec-title">
        <h3 id="sec-title" className="font-semibold text-zinc-900 dark:text-zinc-50">Account security</h3>
        <div className="divide-y divide-zinc-800">
          <Switch on={rs.prefs.twoFactor} onChange={(v) => patch((s) => ({ ...s, prefs: { ...s.prefs, twoFactor: v } }))} label="Two-factor authentication" hint="Ask for a one-time code when you sign in." />
          <Switch on={rs.prefs.alerts} onChange={(v) => patch((s) => ({ ...s, prefs: { ...s.prefs, alerts: v } }))} label="Sign-in alerts" hint="Email me when a new device signs in." />
        </div>
        <button type="button" onClick={() => flash("Other sessions were signed out.")} className={`${ghost} mt-3`}><LogOut className="h-4 w-4" /> Sign out of other sessions</button>
      </section>

      <section className={`${card} p-5`} aria-labelledby="addr-title">
        <h3 id="addr-title" className="font-semibold text-zinc-900 dark:text-zinc-50">Shipping addresses</h3>
        <ul className="mt-3 space-y-2" role="radiogroup" aria-label="Default shipping address">
          {rs.addresses.map((a) => {
            const on = rs.defaultAddr === a.id;
            return (
              <li key={a.id} className={`flex items-start gap-3 rounded-lg border p-3 ${on ? "border-emerald-600/50 dark:border-emerald-400/50 bg-emerald-600/5 dark:bg-emerald-400/5" : "border-zinc-200 dark:border-zinc-800"}`}>
                <button type="button" role="radio" aria-checked={on} aria-label={`Use ${a.label} as default`} onClick={() => patch((s) => ({ ...s, defaultAddr: a.id }))} className={`mt-1 h-4 w-4 shrink-0 rounded-full border ${focusRing} ${on ? "border-emerald-600 dark:border-emerald-400 bg-emerald-600 dark:bg-emerald-400" : "border-zinc-200 dark:border-zinc-600"}`} />
                <div className="min-w-0 flex-1 text-sm"><p className="text-zinc-900 dark:text-zinc-100">{a.label} {on && <Chip tone="cyan">Default</Chip>}</p><p className="text-xs text-zinc-500">{a.line}, {a.city}</p></div>
                {!on && <button type="button" aria-label={`Remove ${a.label}`} onClick={() => patch((s) => ({ ...s, addresses: s.addresses.filter((x) => x.id !== a.id) }))} className={`rounded p-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 ${focusRing}`}><X className="h-4 w-4" /></button>}
              </li>
            );
          })}
        </ul>
        <AddressForm onAdd={(a) => patch((s) => ({ ...s, addresses: [...s.addresses, a] }))} />
      </section>

      <section className={`${card} p-5`} aria-labelledby="api-title">
        <h3 id="api-title" className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-50"><Settings className="h-4 w-4 text-cyan-700 dark:text-cyan-400" /> Enterprise integration</h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Create API keys so your ERP or procurement tool can place pre-orders and read QC certificates.</p>
        <ApiKeys role={role} rs={rs} patch={patch} flash={flash} />
      </section>
    </div>
  );
}

/* ───────────────────────── Sidebar ───────────────────────── */

function Sidebar({ orders, presets, ordersLoading, ordersError, presetsLoading }) {
  return (
    <aside className="space-y-4 lg:sticky lg:top-[8.5rem] lg:self-start" aria-label="Account summary">
      <section className={`${card} p-5`}>
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Account overview</h2>
        <dl className="mt-4 space-y-3">
          <div className="flex items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-3">
            <dt className="text-sm text-zinc-600 dark:text-zinc-400">Orders</dt>
            <dd className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{ordersLoading ? "Loading" : ordersError ? "Unavailable" : orders.length}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-sm text-zinc-600 dark:text-zinc-400">Saved presets</dt>
            <dd className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{presetsLoading ? "Loading" : presets.length}</dd>
          </div>
        </dl>
        <p className="mt-4 text-xs leading-relaxed text-zinc-500">Order totals and saved presets reflect records associated with your account.</p>
      </section>
    </aside>
  );
}

/* ------------------------- Page ------------------------- */

function AccountDashboardContent({ initialRole = "b2c", role: controlledRole, onRoleChange, onNavigate, onReconfigure, onSignOut, user }) {
  const [localRole, setLocalRole] = useState(initialRole);
  const role = controlledRole ?? localRole; // controlled when the shell passes `role`
  const [tab, setTab] = useState("orders");
  const [store, setStore] = useState(initStore);
  const [selectedCert, setSelectedCert] = useState(null);
  const [toast, setToast] = useState("");
  const [liveOrders, setLiveOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState("");
  const [userPresets, setUserPresets] = useState([]);
  const [presetsLoading, setPresetsLoading] = useState(true);

  const profile = {
    ...ROLES[role],
    name: getUserDisplayName(user),
    email: user?.email || "",
    org: getUserOrganization(user),
  };
  const d = EMPTY_ACCOUNT_DATA;
  const rs = store[role];
  const focus = useMemo(() => focusCards(userPresets, presetsLoading), [userPresets, presetsLoading]);

  useEffect(() => {
    let ignore = false;
    if (!user?.id) {
      setLiveOrders([]);
      setOrdersError("");
      setOrdersLoading(false);
      setUserPresets([]);
      setPresetsLoading(false);
      return undefined;
    }

    const loadOrders = () => {
      setOrdersLoading(true);
      setOrdersError("");
      return listMyOrders({ userId: user.id })
        .then((orders) => {
          if (!ignore) setLiveOrders(orders);
        })
        .catch((error) => {
          if (!ignore) {
            setLiveOrders([]);
            setOrdersError(error.message || "Could not load your orders.");
          }
        })
        .finally(() => {
          if (!ignore) setOrdersLoading(false);
        });
    };
    void loadOrders();

    const loadPresets = () => {
      setPresetsLoading(true);
      return listUserPresets(user.id)
        .then((presets) => {
          if (!ignore) setUserPresets(presets);
        })
        .catch((error) => {
          if (!ignore) {
            setUserPresets([]);
            setToast(`Could not load saved presets: ${error.message}`);
          }
        })
        .finally(() => {
          if (!ignore) setPresetsLoading(false);
        });
    };
    void loadPresets();

    const onOrderCreated = (e) => {
      if (e.detail?.user_id === user.id) {
        void loadOrders();
      }
    };
    const onPresetSaved = (e) => {
      if (e.detail?.user_id === user.id) {
        void loadPresets();
      }
    };

    window.addEventListener("vicitech:order_created", onOrderCreated);
    window.addEventListener("vicitech:preset_saved", onPresetSaved);
    return () => {
      ignore = true;
      window.removeEventListener("vicitech:order_created", onOrderCreated);
      window.removeEventListener("vicitech:preset_saved", onPresetSaved);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const patch = (fn) => setStore((s) => ({ ...s, [role]: fn(s[role]) }));
  const flash = (msg) => setToast(msg);
  const changeRole = (r) => (onRoleChange ? onRoleChange(r) : setLocalRole(r));
  useEffect(() => { setSelectedCert(null); setToast(""); }, [role]);
  const canReconfigure = !!(onReconfigure || onNavigate);

  const exportProposal = (p) => {
    const unit = unitTotal(p);
    saveBlob(makePdf([
      "VICITECH PRESET PROPOSAL", "", `Prepared for: ${profile.name}${profile.org ? `, ${profile.org}` : ""}`, `Account type: ${profile.label}`, `Preset: ${p.name} (${p.kind})`, `Units: ${p.units}`, "",
      "ITEMIZED PARTS (per unit)", ...p.parts.map(([slot, name, price]) => `${slot}: ${name} - ${idr(price)}`), "", `Unit price: ${idr(unit)}`, `Order total for ${p.units} units: ${idr(unit * p.units)}`, "",
      "Prices are indicative and subject to the final quotation from the ViciTech team.",
    ]), `ViciTech-Proposal-${p.id}.pdf`);
    flash(`Proposal for ${p.name} downloaded.`);
  };
  const reconfigure = (p) => {
    if (onReconfigure) onReconfigure(p);
    else if (onNavigate) onNavigate("builder", p);
  };
  const certHash = (c) => sha256Hex(JSON.stringify({ serial: c.serial, tech: c.techId, checks: 15, result: "PASS" }));
  const exportReport = async (c) => {
    const hash = await certHash(c);
    saveBlob(makePdf(["VICITECH IOT QC INSPECTION REPORT", "", `Serial: ${c.serial}`, `Product: ${c.name}`, `Units covered: ${c.units}`, `Tested: ${fmtDate(ago(c.tested))}`, `Technician sign-off: ${c.techId} (${c.tech})`, "", "15-POINT INSPECTION: 15 of 15 PASS", ...CHECKS.map((k) => `PASS  ${k}`), "", "SHA-256 certificate hash:", hash]), `ViciTech-QC-${c.serial}.pdf`);
    flash(`Report for ${c.serial} downloaded.`);
  };
  const copyLink = async (c) => {
    const hash = await certHash(c);
    try { await navigator.clipboard.writeText(`${window.location.origin}/verify/${c.serial}?h=${hash.slice(0, 16)}`); flash("Verification link copied."); } catch { flash("Copying isn't available in this browser."); }
  };

  const tabs = [
    { id: "orders", label: "Orders & Pre-Orders", short: "Orders", icon: Package, count: ordersLoading || ordersError ? undefined : liveOrders.length },
    { id: "trade", label: "Trade-In & Buyback Status", short: "Trade-In", icon: RefreshCw },
    { id: "presets", label: "Saved Presets & Configurations", short: "Presets", icon: Sliders, count: presetsLoading ? undefined : userPresets.length },
    { id: "certs", label: "IoT QC Certificates Vault", short: "QC Vault", icon: ShieldCheck },
    { id: "settings", label: "Settings & Enterprise Integration", short: "Settings", icon: Settings },
  ];
  const onTabKey = (e) => {
    const i = tabs.findIndex((t) => t.id === tab);
    const next = e.key === "ArrowRight" ? (i + 1) % tabs.length : e.key === "ArrowLeft" ? (i - 1 + tabs.length) % tabs.length : null;
    if (next === null) return;
    e.preventDefault(); setTab(tabs[next].id); document.getElementById(`tab-${tabs[next].id}`)?.focus();
  };
  const initials = getUserInitials(user);

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 antialiased">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-950/90">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-600 dark:bg-emerald-400 text-white dark:text-zinc-950"><Cpu className="h-5 w-5" /></span>
          <span className="text-lg font-semibold tracking-tight">ViciTech</span>
          <span className="rounded-full border border-emerald-600/30 dark:border-emerald-400/30 bg-emerald-600/10 dark:bg-emerald-400/10 px-3 py-1 text-xs text-cyan-700 dark:text-cyan-300">My Account</span>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        {/* Profile header */}
        <section className={`${card} p-5`} aria-label="Profile">
          <div className="flex flex-wrap items-center gap-4">
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full border border-emerald-600/40 dark:border-emerald-400/40 bg-emerald-600/10 dark:bg-emerald-400/10 text-xl font-semibold text-cyan-700 dark:text-cyan-300" aria-hidden="true">{initials}</span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">{profile.name}</h1><Chip tone="emerald"><ShieldCheck className="h-3 w-3" /> Signed in</Chip></div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{profile.email}</p>
              {profile.org && <p className="text-xs text-zinc-500">{profile.org}</p>}
            </div>
            <div className="flex w-full flex-wrap items-end gap-3 sm:w-auto">
              <div><p className="mb-1.5 text-xs text-zinc-500">Viewing as</p><RoleSwitcher role={role} onChange={changeRole} /></div>
              <button type="button" onClick={onSignOut} disabled={!onSignOut} title={onSignOut ? undefined : "Connect your auth provider"} className={ghost}><LogOut className="h-4 w-4" /> Sign out</button>
            </div>
          </div>
        </section>

        {/* Role focus */}
        <div className="mt-4 grid gap-3 sm:grid-cols-3" aria-label={`Focus for ${profile.label}`}>
          {focus.map((f) => {
            const I = f.icon;
            return (
              <button key={f.label} type="button" onClick={() => f.tab === "community" ? onNavigate?.("community") : setTab(f.tab)} className={`${card} flex items-center gap-3 p-4 text-left transition-colors hover:border-emerald-600/50 dark:hover:border-emerald-400/50 ${focusRing}`}>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-zinc-100 dark:bg-zinc-800 text-cyan-700 dark:text-cyan-400"><I className="h-5 w-5" /></span>
                <span className="min-w-0"><span className="block text-xs text-zinc-500">{f.label}</span><span className="block text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">{f.value}</span><span className="block truncate text-xs text-zinc-500">{f.sub}</span></span>
              </button>
            );
          })}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="min-w-0 space-y-4 lg:col-span-2">
            <div role="tablist" aria-label="Account sections" onKeyDown={onTabKey} className="flex gap-1 overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 p-1.5">
              {tabs.map((t) => {
                const I = t.icon, on = tab === t.id;
                return (
                  <button key={t.id} type="button" role="tab" id={`tab-${t.id}`} aria-label={t.label} title={t.label} aria-selected={on} aria-controls="account-panel" tabIndex={on ? 0 : -1} onClick={() => setTab(t.id)}
                    className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border px-3 py-2 text-sm transition-all ${focusRing} ${on ? "border-emerald-600/50 dark:border-emerald-400/50 bg-emerald-600/10 dark:bg-emerald-400/10 font-medium text-cyan-700 dark:text-cyan-300 shadow-[0_0_18px_-4px_rgba(34,211,238,0.6)]" : "border-transparent text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-zinc-100"}`}>
                    <I className="h-4 w-4" /> {t.short}
                    {t.count !== undefined && <span className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-1.5 text-xs tabular-nums text-zinc-700 dark:text-zinc-300">{t.count}</span>}
                  </button>
                );
              })}
            </div>

            <div aria-live="polite" className="min-h-0">{toast && <p className="flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="h-4 w-4 shrink-0" /> {toast}</p>}</div>

            <section id="account-panel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
              <h2 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-50">{tabs.find((t) => t.id === tab).label}</h2>
              {tab === "orders" && <OrdersTab liveOrders={liveOrders} isLoading={ordersLoading} error={ordersError} onNavigate={onNavigate} onOpenQc={(s) => onNavigate?.("qc", s)} />}
              {tab === "trade" && <TradeTab d={d} store={rs} onOffer={(id, v) => { patch((s) => ({ ...s, offers: { ...s.offers, [id]: v } })); flash(v === "accepted" ? "Offer accepted. Payout is being processed." : "Offer declined."); }} onNavigate={onNavigate} />}
              {tab === "presets" && <PresetsTab d={d} role={role} userPresets={userPresets} isLoading={presetsLoading} onExport={exportProposal} onReconfigure={reconfigure} canReconfigure={canReconfigure} onNavigate={onNavigate} />}
              {tab === "certs" && <CertsTab d={d} role={role} store={rs} selected={selectedCert} setSelected={setSelectedCert} onReport={exportReport} onLink={copyLink} onDone={(id) => patch((s) => ({ ...s, done: { ...s.done, [id]: !s.done[id] } }))} />}
              {tab === "settings" && <SettingsTab role={role} rs={rs} patch={patch} flash={flash} user={user} />}
            </section>
          </div>
          <Sidebar orders={liveOrders} presets={userPresets} ordersLoading={ordersLoading} ordersError={ordersError} presetsLoading={presetsLoading} />
        </div>
      </main>

      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-6 text-center text-xs text-zinc-600">ViciTech Engine v1.0. Account records are scoped to your signed-in profile.</footer>
    </div>
  );
}

export default function AccountDashboard({ user, isAuthLoading, onNavigate, ...props }) {
  if (isAuthLoading) {
    return (
      <main className="grid min-h-[60vh] place-items-center bg-white dark:bg-zinc-950 px-4 text-zinc-700 dark:text-zinc-300">
        <p role="status" className="text-sm">Checking your ViciTech account…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="grid min-h-[60vh] place-items-center bg-white dark:bg-zinc-950 px-4 py-12 text-zinc-900 dark:text-zinc-100">
        <section className="w-full max-w-lg rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 p-8 text-center shadow-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-400">Account access</p>
          <h1 className="mt-3 text-2xl font-semibold">Sign in to view your account</h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Your orders, saved presets, and QC certificates are only available after you sign in.
            Use the Sign In button in the navigation bar to continue.
          </p>
          <button
            type="button"
            onClick={() => onNavigate?.("home")}
            className="mt-6 rounded-lg border border-zinc-200 dark:border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 transition hover:border-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Return home
          </button>
        </section>
      </main>
    );
  }

  return <AccountDashboardContent key={user.id} {...props} user={user} onNavigate={onNavigate} />;
}
