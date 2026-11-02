import { useEffect, useMemo, useRef, useState } from "react";
import {
  User, Building2, GraduationCap, Package, RefreshCw, Sliders, ShieldCheck, Settings, FileText,
  CheckCircle2, Clock, LogOut, ChevronDown, Cpu, Leaf, Plus, X, Activity, Database,
} from "lucide-react";
import { listMyOrders, listUserPresets } from "@/lib/supabase";

/* ───────────────────────── Helpers ───────────────────────── */

const DAY = 864e5;
const ago = (d) => new Date(Date.now() - d * DAY);
const later = (d) => new Date(Date.now() + d * DAY);
const addMonths = (d, m) => { const x = new Date(d); x.setMonth(x.getMonth() + m); return x; };
const fmtDate = (d) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(d);
const idr = (n) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
const num = (n) => new Intl.NumberFormat("id-ID").format(n);
const rel = (h) => (h < 1 ? "Just now" : h < 24 ? `${Math.round(h)} h ago` : `${Math.round(h / 24)} d ago`);
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

/* ───────────────────────── Sample account data ───────────────────────── */
// Dates are offsets from today so the sample data never goes stale.

const STAGES = ["Verified", "IoT Stress Testing", "Packaging at Bandung Hub", "Shipped"];
const TRADE_STAGES = ["Submitted", "Inspection scheduled", "Inspected at Hub Bandung", "Offer ready", "Paid"];
const CITIES = ["Taraju, Tasikmalaya", "Tasikmalaya", "Bandung Hub pickup"];
const SCOPES = ["orders:write", "tradein:read", "qc:read", "presets:read"];
const CHECKS = ["Battery or PSU health", "Thermal re-pasting", "Fan and cooling", "CPU stress test", "Screen or display output", "Keyboard or front panel", "Webcam and audio", "Speakers", "Storage health", "Memory test", "Secure data wipe (NIST 800-88)", "Ports and connectivity", "Wi-Fi and Bluetooth", "Chassis and hinges", "BIOS and firmware"];

// stage = number of completed steps (4 = shipped)
const order = (id, title, type, units, total, stage, placed, eta, x = {}) => ({ id, title, type, units, total, stage, placed, eta, savings: 0, co2: 0, ...x });
const trade = (id, title, entity, equipment, units, condition, low, high, stage, submitted, kg, x = {}) => ({ id, title, entity, equipment, units, condition, low, high, stage, submitted, kg, ...x });
const preset = (id, name, kind, units, updated, parts) => ({ id, name, kind, units, updated, parts });
const cert = (serial, name, tested, techId, tech, units, assignee, purchased, months = 12) => ({ serial, name, tested, techId, tech, units, assignee, purchased, months });

const ROLES = {
  b2c: { label: "B2C Member / Creator", icon: User, name: "Dimas Saputra", email: "dimas.saputra@example.com", org: "", since: 640, target: 600, focus: "Saved presets, custom rigs and community posts" },
  b2b: { label: "B2B Enterprise Admin", icon: Building2, name: "Aulia Rahman", email: "aulia.rahman@nusantaramitra.example", org: "PT Nusantara Mitra Digital", since: 910, target: 9000, focus: "Bulk office orders, tax invoices and company assets" },
  b2s: { label: "B2S School / CBT Lab Admin", icon: GraduationCap, name: "Hendra Wijaya", email: "hendra.wijaya@smk-teknologi.example", org: "SMK Teknologi Nusantara", since: 480, target: 5000, focus: "Lab procurement, bulk warranty and maintenance" },
};

const DATA = {
  b2c: {
    orders: [
      order("VT-PO-2026-0412", "Creator & Gaming Rig (custom build)", "Pre-order", 1, 29550000, 1, 2, 6),
      order("VT-OR-2026-0391", "ThinkPad T14 Gen 4, Recertified A+", "Order", 1, 9800000, 4, 9, 2, { savings: 12100000, co2: 215, serial: "VICI-LTP-2026-1187" }),
    ],
    trades: [trade("VT-TI-2026-0155", "Desktop with RTX 3060 and Ryzen 5 3600", "Individual", "Desktops", 1, "Operational", 1000000, 1400000, 2, 12, 7)],
    presets: [
      preset("rig", "Creator & Gaming Rig", "PC", 1, 3, [["CPU", "AMD Ryzen 7 7800X3D", 7200000], ["Motherboard", "MSI MAG B650M Mortar", 2300000], ["RAM", "32 GB DDR5-6000", 1900000], ["Storage", "1 TB NVMe SSD", 1250000], ["GPU", "NVIDIA RTX 4070 Super", 10900000], ["PSU", "750 W 80+ Gold", 1500000], ["Case / Monitor", 'ATX Mid-Tower + 27" QHD 165 Hz', 4500000]]),
      preset("esports", "Budget Esports Build", "PC", 1, 11, [["CPU", "AMD Ryzen 5 7600", 3900000], ["Motherboard", "ASRock A620M-HDV", 1500000], ["RAM", "16 GB DDR5-6000", 950000], ["Storage", "512 GB NVMe SSD", 750000], ["GPU", "NVIDIA RTX 4060 8 GB", 4800000], ["PSU", "550 W 80+ Bronze", 850000], ["Case", "ATX Airflow Mid-Tower", 1050000]]),
      preset("travel", "Travel Creator Laptop Kit", "Laptop", 1, 20, [["Laptop", "ASUS ROG Zephyrus G14 (32 GB / 1 TB)", 33500000], ["Dock", "Dell WD19S Docking Station (Recertified)", 2700000], ["Mouse", "Logitech MX Master 3S", 1650000]]),
    ],
    certs: [
      cert("VICI-LTP-2026-1187", "ThinkPad T14 Gen 4 (Recertified A+)", 12, "TECH-0388", "Dewi Anggraini", 1, "", 9),
      cert("VICI-DSK-2026-3305", "ViciTech Office Workstation SFF", 150, "TECH-0412", "Rizky Aditya", 1, "", 140),
    ],
    posts: [["1080p esports rig for under Rp 14 juta", 94, 2, 14], ["Silent 4K editing workstation notes", 52, 5, 33], ["Re-pasting a ThinkPad T14 after two years", 31, 4, 61]],
    addresses: [{ id: "a1", label: "Home", city: "Taraju, Tasikmalaya", line: "Jl. Raya Taraju (sample address)" }],
    activity: [["Pre-order VT-PO-2026-0412 entered IoT stress testing", 5], ["Trade-in VT-TI-2026-0155 inspection scheduled", 30], ["Your build post received 12 new upvotes", 52], ["Certificate VICI-LTP-2026-1187 added to your vault", 216]],
  },
  b2b: {
    orders: [
      order("VT-PO-2026-0377", "Bulk office refurbished order: 40 ThinkPad T14 Gen 4", "Pre-order", 40, 392000000, 2, 5, 9, { savings: 484000000, co2: 8600, serial: "VICI-LTP-2026-1190" }),
      order("VT-PO-2026-0358", "SFF office workstations (B2B preset), 20 units", "Pre-order", 20, 197000000, 3, 12, 3, { serial: "VICI-DSK-2026-3320" }),
      order("VT-OR-2026-0301", "Docking stations, 40 units (Recertified)", "Order", 40, 108000000, 4, 30, 0, { savings: 96000000, co2: 2400 }),
    ],
    trades: [
      trade("VT-TI-2026-0149", "60 office laptops", "Corporate Office", "Laptops", 60, "Operational", 129600000, 175800000, 3, 8, 120, { offer: 152400000 }),
      trade("VT-TI-2026-0160", "80 office monitors", "Corporate Office", "Monitors", 80, "Minor Defect", 19200000, 26400000, 1, 3, 400),
    ],
    presets: [
      preset("fleet", "Office Workstation SFF Fleet", "PC", 20, 4, [["CPU", "Intel Core i5-12400", 2700000], ["Motherboard", "MSI PRO B660M-A D4", 1850000], ["RAM", "16 GB DDR4-3200", 750000], ["Storage", "512 GB NVMe SSD", 750000], ["PSU", "350 W 80+ White", 400000], ["Case / Monitor", 'Compact SFF + Dual 24" IPS Monitors', 3400000]]),
      preset("exec", "Executive Laptop Fleet", "Laptop", 12, 18, [["Laptop", "Dell Latitude 7440 (16 GB / 512 GB)", 22400000], ["Dock", "Dell WD19S Docking Station (Recertified)", 2700000]]),
      preset("refurb", "Refurbished Office Laptop Fleet", "Laptop", 40, 27, [["Laptop", "ThinkPad T14 Gen 4 (Recertified A+)", 9800000]]),
    ],
    certs: [
      cert("VICI-LTP-2026-1190", "ThinkPad T14 Gen 4 batch (order VT-PO-2026-0377)", 3, "TECH-0388", "Dewi Anggraini", 40, "Finance, Sales and Operations", null),
      cert("VICI-DSK-2026-3320", "SFF workstation batch (order VT-PO-2026-0358)", 1, "TECH-0412", "Rizky Aditya", 20, "Customer Support floor", null),
      cert("VICI-DSK-2026-2210", "Office Workstation SFF batch (previous order)", 200, "TECH-0412", "Rizky Aditya", 15, "Finance, floor 2", 190),
      cert("VICI-LTP-2026-0950", "ThinkPad T14 batch (previous order)", 340, "TECH-0388", "Dewi Anggraini", 25, "Sales and Operations", 335),
    ],
    invoices: [["INV-2026-0377", "VT-PO-2026-0377", 392000000, "Pending"], ["INV-2026-0358", "VT-PO-2026-0358", 197000000, "Issued"], ["INV-2026-0301", "VT-OR-2026-0301", 108000000, "Issued"]],
    addresses: [{ id: "a1", label: "Head office", city: "Tasikmalaya", line: "Jl. Perintis Kemerdekaan (sample address)" }, { id: "a2", label: "Bandung Hub pickup", city: "Bandung Hub pickup", line: "ViciTech Hub Bandung, pickup counter" }],
    activity: [["Offer ready for trade-in VT-TI-2026-0149", 3], ["Order VT-PO-2026-0358 started packaging at Bandung Hub", 20], ["Tax invoice INV-2026-0377 is pending", 48], ["Batch VICI-LTP-2026-0950 warranty ends soon", 96]],
  },
  b2s: {
    orders: [
      order("VT-PO-2026-0402", "CBT lab procurement: 36 seats (B2S preset)", "Pre-order", 36, 201600000, 2, 6, 8, { serial: "VICI-DSK-2026-4101" }),
      order("VT-OR-2026-0344", "Spare units: 4 refurbished OptiPlex 7090 desktops", "Order", 4, 25200000, 4, 21, 0, { savings: 38400000, co2: 1280, serial: "VICI-DSK-2026-3988" }),
    ],
    trades: [trade("VT-TI-2026-0152", "30 retired lab desktops", "School / CBT Lab", "Desktops", 30, "Minor Defect", 24000000, 32700000, 1, 4, 210)],
    presets: [
      preset("labkom", "B2S CBT Labkom Standard", "Lab", 36, 6, [["CPU", "Intel Core i3-12100", 1900000], ["Motherboard", "ASUS Prime H610M-K D4", 1150000], ["RAM", "8 GB DDR4-3200", 400000], ["Storage", "256 GB SATA SSD", 450000], ["PSU", "350 W 80+ White", 400000], ["Case / Monitor", 'Micro-ATX Case + 19.5" Monitor', 1300000]]),
      preset("teacher", "Teacher Workstation", "PC", 6, 15, [["CPU", "Intel Core i5-12400", 2700000], ["Motherboard", "MSI PRO B660M-A D4", 1850000], ["RAM", "16 GB DDR4-3200", 750000], ["Storage", "512 GB NVMe SSD", 750000], ["PSU", "350 W 80+ White", 400000], ["Case / Monitor", 'Compact SFF + Dual 24" IPS Monitors', 3400000]]),
      preset("desk", "Teacher Desk Kit", "Lab", 4, 40, [["Mouse", "Logitech MX Master 3S", 1650000], ["Keyboard", "Keychron K8 Pro", 1850000], ["UPS", "APC Back-UPS 1100VA", 2100000]]),
    ],
    certs: [
      cert("VICI-DSK-2026-4101", "CBT Labkom Standard batch (order VT-PO-2026-0402)", 2, "TECH-0412", "Rizky Aditya", 36, "Lab 1 and Lab 2", null),
      cert("VICI-DSK-2026-3988", "OptiPlex 7090 SFF refurbished spares", 25, "TECH-0388", "Dewi Anggraini", 4, "Spare stock room", 21),
      cert("VICI-DSK-2026-2874", "Lab 3 desktops (previous order)", 250, "TECH-0412", "Rizky Aditya", 30, "Lab 3", 240),
    ],
    maintenance: [["m4", "Exam-day power circuit load test", "Lab 1 and Lab 2", 6], ["m1", "Quarterly dust cleaning and fan check", "Lab 1", 12], ["m2", "Re-paste CPUs older than three years", "Lab 3", 30], ["m3", "BIOS and firmware update window", "All labs", 45]],
    addresses: [{ id: "a1", label: "School lab", city: "Taraju, Tasikmalaya", line: "Jl. Pendidikan (sample address)" }, { id: "a2", label: "Bandung Hub pickup", city: "Bandung Hub pickup", line: "ViciTech Hub Bandung, pickup counter" }],
    activity: [["CBT lab order VT-PO-2026-0402 passed IoT stress testing", 7], ["Maintenance task due in 6 days: exam-day power test", 24], ["Trade-in VT-TI-2026-0152 inspection scheduled", 40], ["Spare units shipped to your school lab", 120]],
  },
};

const initStore = () => Object.fromEntries(Object.keys(ROLES).map((r) => [r, { addresses: DATA[r].addresses, defaultAddr: "a1", keys: [], offers: {}, done: {}, prefs: { twoFactor: true, alerts: true } }]));

/* ───────────────────────── Derived values ───────────────────────── */

const unitTotal = (p) => sum(p.parts, (x) => x[2]);
const warrantyEnd = (c) => (c.purchased === null ? null : addMonths(ago(c.purchased), c.months));
const daysLeft = (c) => { const e = warrantyEnd(c); return e ? Math.ceil((e - Date.now()) / DAY) : null; };
const tradeStage = (t, offers) => (offers[t.id] === "accepted" ? Math.max(t.stage, 4) : t.stage);

function summarize(role, d, store) {
  const co2 = sum(d.orders, (o) => o.co2);
  const ewaste = sum(d.trades.filter((t) => store.offers[t.id] !== "declined"), (t) => t.kg);
  const active = d.certs.filter((c) => (daysLeft(c) ?? 1) > 0 && c.purchased !== null);
  const next = [...active].sort((a, b) => daysLeft(a) - daysLeft(b))[0];
  return {
    savings: sum(d.orders, (o) => o.savings), co2, ewaste,
    score: Math.min(100, Math.round(((co2 + ewaste * 3) / ROLES[role].target) * 100)),
    warrantyUnits: sum(active, (c) => c.units), next,
    activeOrders: d.orders.filter((o) => o.stage < 4).length,
  };
}

function focusCards(role, d, m, store) {
  const openMaint = (d.maintenance || []).filter((t) => !store.done[t[0]]).sort((a, b) => a[3] - b[3])[0];
  const lead = d.orders.find((o) => o.stage < 4);
  return {
    b2c: () => [
      { icon: Sliders, label: "Saved presets", value: d.presets.length, sub: "Ready to re-configure", tab: "presets" },
      { icon: Cpu, label: "Custom rigs", value: d.presets.filter((p) => p.kind === "PC").length, sub: "Desktop builds saved", tab: "presets" },
      { icon: FileText, label: "Community posts", value: d.posts.length, sub: `${sum(d.posts, (p) => p[1])} upvotes in total`, tab: "presets" },
    ],
    b2b: () => [
      { icon: Package, label: "Bulk office orders", value: d.orders.filter((o) => o.units >= 10 && o.stage < 4).length, sub: "In progress", tab: "orders" },
      { icon: FileText, label: "Tax invoices", value: d.invoices.filter((i) => i[3] === "Pending").length, sub: "Pending issue", tab: "orders" },
      { icon: Building2, label: "Company assets", value: sum(d.certs, (c) => c.units), sub: "Units with certificates", tab: "certs" },
    ],
    b2s: () => [
      { icon: Package, label: "Lab procurement", value: lead ? STAGES[lead.stage] : "Complete", sub: lead ? lead.title : "No open orders", tab: "orders" },
      { icon: ShieldCheck, label: "Bulk warranty", value: m.warrantyUnits, sub: "Units under warranty", tab: "certs" },
      { icon: Clock, label: "Maintenance", value: openMaint ? `${openMaint[3]} days` : "All done", sub: openMaint ? openMaint[1] : "No open tasks", tab: "certs" },
    ],
  }[role]();
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
      <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800"><div className="h-full rounded-full bg-emerald-400 transition-all duration-500" style={{ width: `${(done / steps.length) * 100}%` }} /></div>
      <ol className="mt-3 grid gap-2 sm:grid-cols-[repeat(auto-fit,minmax(9rem,1fr))]">
        {steps.map((s, i) => {
          const complete = i < done, now = i === done && current;
          return (
            <li key={s} className="flex items-start gap-2 text-sm">
              {complete ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /> : now ? <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" /> : <span className="mt-1 h-3.5 w-3.5 shrink-0 rounded-full border border-zinc-700" />}
              <span className={complete ? "text-zinc-200" : now ? "font-medium text-amber-300" : "text-zinc-500"}>{s}{now && <span className="block text-xs font-normal text-zinc-500">In progress</span>}</span>
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
      <div><p className="text-sm text-zinc-100">{label}</p><p className="text-xs text-zinc-500">{hint}</p></div>
      <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${focusRing} ${on ? "bg-emerald-400" : "bg-zinc-700"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-zinc-950 transition-all ${on ? "left-[1.375rem]" : "left-0.5"}`} />
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
      <button type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((v) => !v)} className={`flex w-full items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 hover:border-cyan-400/60 sm:w-72 ${focusRing}`}>
        <Cur className="h-4 w-4 text-cyan-400" /><span className="flex-1 text-left">{ROLES[role].label}</span><ChevronDown className={`h-4 w-4 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ul role="listbox" aria-label="Switch role" className="absolute right-0 top-full z-20 mt-2 w-full min-w-[18rem] rounded-xl border border-zinc-800 bg-zinc-950 p-1.5 shadow-2xl shadow-black/50">
          {Object.entries(ROLES).map(([k, r]) => {
            const I = r.icon;
            return (
              <li key={k} role="option" aria-selected={k === role}>
                <button type="button" onClick={() => { onChange(k); setOpen(false); }} className={`flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left ${focusRing} ${k === role ? "bg-cyan-400/10" : "hover:bg-zinc-900"}`}>
                  <I className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
                  <span><span className="block text-sm text-zinc-100">{r.label}</span><span className="block text-xs text-zinc-500">{r.focus}</span></span>
                  {k === role && <CheckCircle2 className="ml-auto mt-0.5 h-4 w-4 text-emerald-400" />}
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

function OrdersTab({ d, role, liveOrders = [], onCert, onInvoice, onOpenQc }) {
  const combined = useMemo(() => {
    const mappedLive = liveOrders.map((o) => ({
      id: o.id,
      title: o.product_name,
      type: "Pre-order",
      units: 1,
      total: o.total_price || (o.base_price ? o.base_price + (o.jit_buffer || 0) : 0),
      stage: o.status === "Shipped" ? 4 : o.status === "Packaging at Bandung Hub" ? 3 : 2,
      placed: 0,
      eta: 3,
      serial: o.serial_number,
      source: o.source,
      isLive: true,
    }));
    const seen = new Set();
    const result = [];
    for (const o of [...mappedLive, ...d.orders]) {
      if (!seen.has(o.id)) {
        seen.add(o.id);
        result.push(o);
      }
    }
    return result;
  }, [liveOrders, d.orders]);

  return (
    <div className="space-y-4">
      {combined.map((o) => (
        <article key={o.id} className={`${card} p-5`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Chip tone={o.type === "Pre-order" ? "amber" : "cyan"}>{o.type}</Chip>
                <span className="text-xs tabular-nums text-zinc-500">{o.id}</span>
                {o.isLive && (
                  <span className="inline-flex items-center gap-1 rounded bg-emerald-400/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
                    <Database className="h-3 w-3" /> Live Supabase Order
                  </span>
                )}
              </div>
              <h3 className="mt-1.5 font-semibold text-zinc-50">{o.title}</h3>
              <p className="text-xs text-zinc-500">Placed {o.placed === 0 ? "Just now" : fmtDate(ago(o.placed))}, {o.units} {o.units > 1 ? "units" : "unit"}</p>
            </div>
            <p className="text-lg font-semibold tabular-nums text-zinc-50">{idr(o.total)}</p>
          </div>
          <div className="mt-4"><Stepper steps={STAGES} done={o.stage} current={o.stage < 4} /></div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 pt-3 text-sm">
            <p className="text-zinc-400">{o.stage === 4 ? (o.eta > 0 ? `Shipped, arriving around ${fmtDate(later(o.eta))}` : "Delivered") : `Estimated shipping around ${fmtDate(later(o.eta))}`}</p>
            <div className="flex flex-wrap items-center gap-2">
              {o.serial && (
                <button type="button" onClick={() => onOpenQc?.(o.serial)} className={`${ghost} py-1.5 text-cyan-300 hover:text-cyan-200`}>
                  <Activity className="h-4 w-4" /> Inspect in IoT QC
                </button>
              )}
              {o.serial && o.stage >= 2 && <button type="button" onClick={() => onCert(o.serial)} className={`${ghost} py-1.5`}><ShieldCheck className="h-4 w-4" /> View QC certificate</button>}
            </div>
          </div>
        </article>
      ))}
      {role === "b2b" && (
        <section className={`${card} p-5`} aria-labelledby="inv-title">
          <h3 id="inv-title" className="flex items-center gap-2 font-semibold text-zinc-50"><FileText className="h-4 w-4 text-cyan-400" /> Tax invoices</h3>
          <ul className="mt-3 divide-y divide-zinc-800">
            {d.invoices.map(([no, ref, amount, status]) => (
              <li key={no} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
                <span className="min-w-0 flex-1"><span className="block text-zinc-100">{no}</span><span className="text-xs text-zinc-500">For order {ref}</span></span>
                <span className="tabular-nums text-zinc-200">{idr(amount)}</span>
                <Chip tone={status === "Issued" ? "emerald" : "amber"}>{status}</Chip>
                <button type="button" onClick={() => onInvoice({ no, ref, amount, status })} className={`${ghost} py-1.5`}>Download summary</button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function TradeTab({ d, store, onOffer, onNavigate }) {
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
                <h3 className="mt-1.5 font-semibold text-zinc-50">{t.title}</h3>
                <p className="text-xs text-zinc-500">{t.units} x {t.equipment.toLowerCase()}, {t.condition.toLowerCase()}, submitted {fmtDate(ago(t.submitted))}</p>
              </div>
              <div className="text-right"><p className="text-xs text-zinc-500">Estimated buyback</p><p className="font-semibold tabular-nums text-emerald-400">{idr(t.low)} to {idr(t.high)}</p></div>
            </div>
            <div className="mt-4"><Stepper steps={TRADE_STAGES} done={decision === "declined" ? t.stage : eff} current={decision !== "declined" && eff < 5} /></div>
            {offerOpen && (
              <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-3">
                <div className="min-w-0 flex-1"><p className="text-sm font-medium text-emerald-300">Final offer: {idr(t.offer)}</p><p className="text-xs text-zinc-400">Based on the Hub Bandung inspection. Accept to start the payout.</p></div>
                <button type="button" onClick={() => onOffer(t.id, "accepted")} className={`${btn} bg-emerald-400 font-semibold text-zinc-950 hover:bg-emerald-300`}>Accept offer</button>
                <button type="button" onClick={() => onOffer(t.id, "declined")} className={ghost}>Decline</button>
              </div>
            )}
            {decision === "accepted" && <p className="mt-4 flex items-center gap-2 text-sm text-emerald-400"><CheckCircle2 className="h-4 w-4" /> Offer of {idr(t.offer)} accepted. Payout is being processed.</p>}
            {decision === "declined" && <p className="mt-4 text-sm text-zinc-400">You declined this offer. The request is closed.</p>}
          </article>
        );
      })}
      {onNavigate && <button type="button" onClick={() => onNavigate("tradein")} className={ghost}><Plus className="h-4 w-4" /> New trade-in request</button>}
    </div>
  );
}

function PresetsTab({ d, role, userPresets = [], onExport, onReconfigure, canReconfigure }) {
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
    return [...mappedUser, ...d.presets];
  }, [userPresets, d.presets]);

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
                    <span className="rounded bg-cyan-400/10 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-300">
                      User Saved Preset
                    </span>
                  )}
                  <span className="text-xs text-zinc-500">Updated {p.updated === 0 ? "Today" : fmtDate(ago(p.updated))}</span>
                </div>
                <h3 className="mt-1.5 font-semibold text-zinc-50">{p.name}</h3>
                <p className="text-xs text-zinc-500">{p.units} {p.units > 1 ? "units" : "unit"}, {idr(unit)} per unit</p>
              </div>
              <p className="text-lg font-semibold tabular-nums text-zinc-50">{idr(unit * p.units)}</p>
            </div>
            <button type="button" aria-expanded={open === p.id} onClick={() => setOpen(open === p.id ? null : p.id)} className={`mt-3 inline-flex items-center gap-1.5 rounded text-sm text-cyan-400 hover:text-cyan-300 ${focusRing}`}>
              <ChevronDown className={`h-4 w-4 transition-transform ${open === p.id ? "rotate-180" : ""}`} /> {open === p.id ? "Hide parts" : "View parts"}
            </button>
            {open === p.id && (
              <dl className="mt-2 divide-y divide-zinc-800 rounded-lg border border-zinc-800 text-sm">
                {p.parts.map(([slot, name, price]) => <div key={slot} className="flex justify-between gap-3 px-3 py-2"><dt className="text-zinc-500">{slot}: <span className="text-zinc-200">{name}</span></dt><dd className="tabular-nums text-zinc-300">{idr(price)}</dd></div>)}
              </dl>
            )}
            <div className="mt-4 flex flex-wrap gap-2 border-t border-zinc-800 pt-3">
              <button type="button" onClick={() => onExport(p)} className={`${btn} bg-cyan-400 font-medium text-zinc-950 hover:bg-cyan-300`}><FileText className="h-4 w-4" /> Export PDF Proposal</button>
              <button type="button" disabled={!canReconfigure} title={canReconfigure ? undefined : "Connect the Preset Builder to enable this"} onClick={() => onReconfigure(p)} className={ghost}><Sliders className="h-4 w-4" /> Re-configure in Builder</button>
            </div>
          </article>
        );
      })}
      {role === "b2c" && (
        <section className={`${card} p-5`} aria-labelledby="posts-title">
          <h3 id="posts-title" className="font-semibold text-zinc-50">Your community posts</h3>
          <ul className="mt-3 divide-y divide-zinc-800">
            {d.posts.map(([title, likes, comments, days]) => <li key={title} className="flex flex-wrap items-center gap-3 py-2.5 text-sm"><span className="min-w-0 flex-1 text-zinc-100">{title}</span><span className="text-xs tabular-nums text-zinc-500">{likes} upvotes, {comments} comments, {days} d ago</span></li>)}
          </ul>
        </section>
      )}
    </div>
  );
}

function CertsTab({ d, role, store, selected, setSelected, onReport, onLink, onDone }) {
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
                <button type="button" aria-pressed={x.serial === c.serial} onClick={() => setSelected(x.serial)} className={`w-full rounded-xl border p-3 text-left ${focusRing} ${x.serial === c.serial ? "border-cyan-400/60 bg-cyan-400/10" : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"}`}>
                  <span className="block text-xs tabular-nums text-cyan-300">{x.serial}</span>
                  <span className="block text-sm text-zinc-100">{x.name}</span>
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
            <div><h3 className="font-semibold text-zinc-50">{c.name}</h3><p className="text-sm tabular-nums text-cyan-300">{c.serial}{c.units > 1 ? ` and ${c.units - 1} more serials in this batch` : ""}</p></div>
            <Chip tone="emerald"><ShieldCheck className="h-3 w-3" /> 15 of 15 Pass</Chip>
          </div>
          <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            {[["Tested", fmtDate(ago(c.tested))], ["Technician sign-off", `${c.techId}, ${c.tech}`], ["Units covered", c.units], [role === "b2s" ? "Lab or room" : "Assigned to", c.assignee || "You"]].map(([k, v]) => <div key={k} className="rounded-lg bg-zinc-950/60 p-2.5"><dt className="text-xs text-zinc-500">{k}</dt><dd className="text-zinc-100">{v}</dd></div>)}
          </dl>
          <div className="mt-4">
            <div className="flex justify-between text-sm"><span className="text-zinc-400">Warranty</span><span className={tone}>{left === null ? "Starts when the order is delivered" : left <= 0 ? "Ended" : `${left} days left, ends ${fmtDate(warrantyEnd(c))}`}</span></div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-800"><div className={`h-full rounded-full ${left !== null && left <= 60 ? "bg-amber-400" : "bg-emerald-400"}`} style={{ width: `${left === null ? 100 : Math.max(0, Math.min(100, (left / total) * 100))}%` }} /></div>
          </div>
          <h4 className="mb-2 mt-5 text-sm font-medium text-zinc-300">15-point inspection</h4>
          <ul className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2">{CHECKS.map((k) => <li key={k} className="flex items-center gap-2 text-sm text-zinc-300"><CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" /> {k}</li>)}</ul>
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" onClick={() => onReport(c)} className={`${btn} bg-cyan-400 font-medium text-zinc-950 hover:bg-cyan-300`}><FileText className="h-4 w-4" /> Download report (PDF)</button>
            <button type="button" onClick={() => onLink(c)} className={ghost}>Copy verification link</button>
          </div>
        </section>
      </div>

      {role === "b2s" && (
        <section className={`${card} p-5`} aria-labelledby="maint-title">
          <h3 id="maint-title" className="flex items-center gap-2 font-semibold text-zinc-50"><Clock className="h-4 w-4 text-amber-400" /> Maintenance schedule</h3>
          <ul className="mt-3 divide-y divide-zinc-800">
            {d.maintenance.map(([id, title, where, due]) => {
              const done = store.done[id];
              return (
                <li key={id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
                  <span className="min-w-0 flex-1"><span className={`block ${done ? "text-zinc-500 line-through" : "text-zinc-100"}`}>{title}</span><span className="text-xs text-zinc-500">{where}, due {fmtDate(later(due))}</span></span>
                  {!done && due <= 14 && <Chip tone="amber">Due in {due} days</Chip>}
                  <button type="button" aria-pressed={!!done} onClick={() => onDone(id)} className={`${ghost} py-1.5`}>{done ? <><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Done</> : "Mark done"}</button>
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
      <div className="flex items-center gap-3 sm:col-span-3"><button type="submit" className={ghost}><Plus className="h-4 w-4" /> Add address</button>{err && <p role="alert" className="text-sm text-red-400">{err}</p>}</div>
    </form>
  );
}

function ApiKeys({ role, rs, patch, flash }) {
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState(["orders:write", "qc:read"]);
  const [fresh, setFresh] = useState(null);
  const [err, setErr] = useState("");
  if (role === "b2c") {
    return <p className="mt-3 rounded-lg border border-dashed border-zinc-700 p-4 text-sm text-zinc-400">API keys for automated procurement are available on B2B and B2S accounts. Switch the role to try the generator.</p>;
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
          {SCOPES.map((s) => { const on = scopes.includes(s); return <label key={s} className={`cursor-pointer rounded-full border px-3 py-1 text-xs ${on ? "border-cyan-400/60 bg-cyan-400/10 text-cyan-300" : "border-zinc-700 text-zinc-400"}`}><input type="checkbox" className="sr-only" checked={on} onChange={() => setScopes((l) => (on ? l.filter((x) => x !== s) : [...l, s]))} />{s}</label>; })}
        </fieldset>
        <div className="flex flex-wrap items-center gap-3"><button type="submit" className={`${btn} bg-cyan-400 font-medium text-zinc-950 hover:bg-cyan-300`}><Plus className="h-4 w-4" /> Generate API key</button>{err && <p role="alert" className="text-sm text-red-400">{err}</p>}</div>
      </form>
      {fresh && (
        <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-3" role="status">
          <p className="text-sm font-medium text-amber-200">Copy this key now. It will not be shown again.</p>
          <code className="mt-2 block break-all rounded bg-zinc-950 p-2 text-xs text-emerald-300">{fresh}</code>
          <div className="mt-2 flex gap-2"><button type="button" onClick={copy} className={`${ghost} py-1.5`}>Copy key</button><button type="button" onClick={() => setFresh(null)} className={`${ghost} py-1.5`}>I saved it</button></div>
        </div>
      )}
      <ul className="divide-y divide-zinc-800 rounded-lg border border-zinc-800">
        {rs.keys.length === 0 && <li className="p-3 text-sm text-zinc-500">No keys yet.</li>}
        {rs.keys.map((k) => (
          <li key={k.id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
            <span className="min-w-0 flex-1"><span className="block text-zinc-100">{k.name}</span><span className="text-xs text-zinc-500">vt_live_••••{k.last4}, created {fmtDate(k.created)}, {k.scopes.join(", ")}</span></span>
            <button type="button" onClick={() => patch((s) => ({ ...s, keys: s.keys.filter((x) => x.id !== k.id) }))} className={`${ghost} py-1.5`}>Revoke</button>
          </li>
        ))}
      </ul>
      <p className="text-xs text-zinc-600">Send the key as a Bearer token. Use the endpoint of your own ViciTech API deployment.</p>
    </div>
  );
}

function SettingsTab({ role, rs, patch, flash }) {
  return (
    <div className="space-y-4">
      <section className={`${card} p-5`} aria-labelledby="sec-title">
        <h3 id="sec-title" className="font-semibold text-zinc-50">Account security</h3>
        <div className="divide-y divide-zinc-800">
          <Switch on={rs.prefs.twoFactor} onChange={(v) => patch((s) => ({ ...s, prefs: { ...s.prefs, twoFactor: v } }))} label="Two-factor authentication" hint="Ask for a one-time code when you sign in." />
          <Switch on={rs.prefs.alerts} onChange={(v) => patch((s) => ({ ...s, prefs: { ...s.prefs, alerts: v } }))} label="Sign-in alerts" hint="Email me when a new device signs in." />
        </div>
        <button type="button" onClick={() => flash("Other sessions were signed out.")} className={`${ghost} mt-3`}><LogOut className="h-4 w-4" /> Sign out of other sessions</button>
      </section>

      <section className={`${card} p-5`} aria-labelledby="addr-title">
        <h3 id="addr-title" className="font-semibold text-zinc-50">Shipping addresses</h3>
        <ul className="mt-3 space-y-2" role="radiogroup" aria-label="Default shipping address">
          {rs.addresses.map((a) => {
            const on = rs.defaultAddr === a.id;
            return (
              <li key={a.id} className={`flex items-start gap-3 rounded-lg border p-3 ${on ? "border-cyan-400/50 bg-cyan-400/5" : "border-zinc-800"}`}>
                <button type="button" role="radio" aria-checked={on} aria-label={`Use ${a.label} as default`} onClick={() => patch((s) => ({ ...s, defaultAddr: a.id }))} className={`mt-1 h-4 w-4 shrink-0 rounded-full border ${focusRing} ${on ? "border-cyan-400 bg-cyan-400" : "border-zinc-600"}`} />
                <div className="min-w-0 flex-1 text-sm"><p className="text-zinc-100">{a.label} {on && <Chip tone="cyan">Default</Chip>}</p><p className="text-xs text-zinc-500">{a.line}, {a.city}</p></div>
                {!on && <button type="button" aria-label={`Remove ${a.label}`} onClick={() => patch((s) => ({ ...s, addresses: s.addresses.filter((x) => x.id !== a.id) }))} className={`rounded p-1 text-zinc-500 hover:text-zinc-100 ${focusRing}`}><X className="h-4 w-4" /></button>}
              </li>
            );
          })}
        </ul>
        <AddressForm onAdd={(a) => patch((s) => ({ ...s, addresses: [...s.addresses, a] }))} />
      </section>

      <section className={`${card} p-5`} aria-labelledby="api-title">
        <h3 id="api-title" className="flex items-center gap-2 font-semibold text-zinc-50"><Settings className="h-4 w-4 text-cyan-400" /> Enterprise integration</h3>
        <p className="text-sm text-zinc-400">Create API keys so your ERP or procurement tool can place pre-orders and read QC certificates.</p>
        <ApiKeys role={role} rs={rs} patch={patch} flash={flash} />
      </section>
    </div>
  );
}

/* ───────────────────────── Sidebar ───────────────────────── */

function Sidebar({ m, role, d }) {
  const r = 26, len = 2 * Math.PI * r;
  return (
    <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start" aria-label="Account summary">
      <section className={`${card} p-5`}>
        <h2 className="text-base font-semibold text-zinc-50">Account impact</h2>
        <div className="mt-4 space-y-5">
          <div className="flex gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-emerald-400/30 bg-emerald-400/10 text-emerald-400"><RefreshCw className="h-4 w-4" /></span><div><p className="text-xs text-zinc-500">Total savings from circular economy</p><p className="text-xl font-semibold tabular-nums text-emerald-400">{idr(m.savings)}</p><p className="text-xs text-zinc-500">Compared with original retail prices</p></div></div>
          <div className="flex items-center gap-3">
            <svg viewBox="0 0 64 64" className="h-16 w-16 shrink-0 -rotate-90" role="img" aria-label={`Offset score ${m.score} out of 100`}>
              <circle cx="32" cy="32" r={r} fill="none" strokeWidth="6" className="stroke-zinc-800" />
              <circle cx="32" cy="32" r={r} fill="none" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${(len * m.score) / 100} ${len}`} className="stroke-cyan-400 transition-all duration-500" />
              <text x="32" y="32" textAnchor="middle" dominantBaseline="central" fontSize="16" fontWeight="600" className="fill-zinc-50" transform="rotate(90 32 32)">{m.score}</text>
            </svg>
            <div><p className="flex items-center gap-1.5 text-xs text-zinc-500"><Leaf className="h-3.5 w-3.5 text-emerald-400" /> Carbon and e-waste offset score</p><p className="text-sm tabular-nums text-zinc-200">{num(m.co2)} kg CO₂e avoided</p><p className="text-sm tabular-nums text-zinc-200">{num(m.ewaste)} kg e-waste diverted</p><p className="text-xs text-zinc-600">Score against a yearly target of {num(ROLES[role].target)} kg</p></div>
          </div>
          <div className="flex gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-cyan-400/30 bg-cyan-400/10 text-cyan-300"><ShieldCheck className="h-4 w-4" /></span><div><p className="text-xs text-zinc-500">Active warranties remaining</p><p className="text-xl font-semibold tabular-nums text-zinc-50">{m.warrantyUnits} {m.warrantyUnits === 1 ? "unit" : "units"}</p><p className="text-xs text-zinc-500">{m.next ? `Next ends in ${daysLeft(m.next)} days: ${m.next.name}` : "No active warranties yet"}</p></div></div>
        </div>
      </section>
      <section className={`${card} p-5`}>
        <h2 className="text-base font-semibold text-zinc-50">Recent activity</h2>
        <ul className="mt-3 space-y-3">{d.activity.map(([text, h]) => <li key={text} className="flex gap-2.5 text-sm"><Clock className="mt-0.5 h-4 w-4 shrink-0 text-zinc-600" /><span><span className="block text-zinc-300">{text}</span><span className="text-xs text-zinc-500">{rel(h)}</span></span></li>)}</ul>
      </section>
    </aside>
  );
}

/* ───────────────────────── Page ───────────────────────── */

export default function AccountDashboard({ initialRole = "b2c", role: controlledRole, onRoleChange, onNavigate, onReconfigure, onSignOut }) {
  const [localRole, setLocalRole] = useState(initialRole);
  const role = controlledRole ?? localRole; // controlled when the shell passes `role`
  const [tab, setTab] = useState("orders");
  const [store, setStore] = useState(initStore);
  const [selectedCert, setSelectedCert] = useState(null);
  const [toast, setToast] = useState("");
  const [liveOrders, setLiveOrders] = useState([]);
  const [userPresets, setUserPresets] = useState([]);

  const profile = ROLES[role];
  const d = DATA[role];
  const rs = store[role];
  const m = useMemo(() => summarize(role, d, rs), [role, d, rs]);
  const focus = useMemo(() => focusCards(role, d, m, rs), [role, d, m, rs]);

  useEffect(() => {
    let ignore = false;
    listMyOrders({ role }).then((orders) => {
      if (!ignore && orders) setLiveOrders(orders);
    });
    setUserPresets(listUserPresets(role));

    const onOrderCreated = (e) => {
      if (e.detail) {
        setLiveOrders((prev) => [e.detail, ...prev.filter((x) => x.id !== e.detail.id)]);
        flash(`Order ${e.detail.id} recorded & synchronized.`);
      }
    };
    const onPresetSaved = (e) => {
      if (e.detail) {
        setUserPresets((prev) => [e.detail, ...prev.filter((x) => x.id !== e.detail.id)]);
        flash(`Preset ${e.detail.name} saved to account.`);
      }
    };

    window.addEventListener("vicitech:order_created", onOrderCreated);
    window.addEventListener("vicitech:preset_saved", onPresetSaved);
    return () => {
      ignore = true;
      window.removeEventListener("vicitech:order_created", onOrderCreated);
      window.removeEventListener("vicitech:preset_saved", onPresetSaved);
    };
  }, [role]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const patch = (fn) => setStore((s) => ({ ...s, [role]: fn(s[role]) }));
  const flash = (msg) => setToast(msg);
  const changeRole = (r) => (onRoleChange ? onRoleChange(r) : setLocalRole(r));
  useEffect(() => { setSelectedCert(null); setToast(""); }, [role]);
  const openCert = (serial) => { setSelectedCert(serial); setTab("certs"); };
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
  const exportInvoice = (i) => {
    saveBlob(makePdf(["VICITECH INVOICE SUMMARY (SAMPLE)", "", `Invoice: ${i.no}`, `Order: ${i.ref}`, `Billed to: ${profile.org || profile.name}`, `Amount: ${idr(i.amount)}`, `Status: ${i.status}`, "", "This summary is sample data. The official tax invoice is issued by the ViciTech finance team."]), `${i.no}.pdf`);
    flash(`Summary for ${i.no} downloaded.`);
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
    { id: "orders", label: "Active Orders & Pre-Orders", short: "Orders", icon: Package, count: (m.activeOrders + liveOrders.length) },
    { id: "trade", label: "Trade-In & Buyback Status", short: "Trade-In", icon: RefreshCw, count: d.trades.length },
    { id: "presets", label: "Saved Presets & Configurations", short: "Presets", icon: Sliders, count: d.presets.length + userPresets.length },
    { id: "certs", label: "IoT QC Certificates Vault", short: "QC Vault", icon: ShieldCheck, count: d.certs.length },
    { id: "settings", label: "Settings & Enterprise Integration", short: "Settings", icon: Settings },
  ];
  const onTabKey = (e) => {
    const i = tabs.findIndex((t) => t.id === tab);
    const next = e.key === "ArrowRight" ? (i + 1) % tabs.length : e.key === "ArrowLeft" ? (i - 1 + tabs.length) % tabs.length : null;
    if (next === null) return;
    e.preventDefault(); setTab(tabs[next].id); document.getElementById(`tab-${tabs[next].id}`)?.focus();
  };
  const initials = profile.name.split(" ").map((w) => w[0]).join("");

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 antialiased">
      <header className="border-b border-zinc-800 bg-zinc-950/90">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-cyan-400 text-zinc-950"><Cpu className="h-5 w-5" /></span>
          <span className="text-lg font-semibold tracking-tight">ViciTech</span>
          <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-300">My Account</span>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        {/* Profile header */}
        <section className={`${card} p-5`} aria-label="Profile">
          <div className="flex flex-wrap items-center gap-4">
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full border border-cyan-400/40 bg-cyan-400/10 text-xl font-semibold text-cyan-300" aria-hidden="true">{initials}</span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-semibold tracking-tight text-zinc-50">{profile.name}</h1><Chip tone="emerald"><ShieldCheck className="h-3 w-3" /> Verified ID</Chip></div>
              <p className="text-sm text-zinc-400">{profile.email}</p>
              <p className="text-xs text-zinc-500">{profile.org && `${profile.org}, `}Member since {fmtDate(ago(profile.since))}</p>
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
              <button key={f.label} type="button" onClick={() => setTab(f.tab)} className={`${card} flex items-center gap-3 p-4 text-left transition-colors hover:border-cyan-400/50 ${focusRing}`}>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-zinc-800 text-cyan-400"><I className="h-5 w-5" /></span>
                <span className="min-w-0"><span className="block text-xs text-zinc-500">{f.label}</span><span className="block text-lg font-semibold tabular-nums text-zinc-50">{f.value}</span><span className="block truncate text-xs text-zinc-500">{f.sub}</span></span>
              </button>
            );
          })}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="min-w-0 space-y-4 lg:col-span-2">
            <div role="tablist" aria-label="Account sections" onKeyDown={onTabKey} className="flex gap-1 overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/50 p-1.5">
              {tabs.map((t) => {
                const I = t.icon, on = tab === t.id;
                return (
                  <button key={t.id} type="button" role="tab" id={`tab-${t.id}`} aria-label={t.label} title={t.label} aria-selected={on} aria-controls="account-panel" tabIndex={on ? 0 : -1} onClick={() => setTab(t.id)}
                    className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border px-3 py-2 text-sm transition-all ${focusRing} ${on ? "border-cyan-400/50 bg-cyan-400/10 font-medium text-cyan-300 shadow-[0_0_18px_-4px_rgba(34,211,238,0.6)]" : "border-transparent text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100"}`}>
                    <I className="h-4 w-4" /> {t.short}
                    {t.count !== undefined && <span className="rounded-full bg-zinc-800 px-1.5 text-xs tabular-nums text-zinc-300">{t.count}</span>}
                  </button>
                );
              })}
            </div>

            <div aria-live="polite" className="min-h-0">{toast && <p className="flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-300"><CheckCircle2 className="h-4 w-4 shrink-0" /> {toast}</p>}</div>

            <section id="account-panel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
              <h2 className="mb-3 text-lg font-semibold text-zinc-50">{tabs.find((t) => t.id === tab).label}</h2>
              {tab === "orders" && <OrdersTab d={d} role={role} liveOrders={liveOrders} onCert={openCert} onInvoice={exportInvoice} onOpenQc={(s) => onNavigate?.("qc", s)} />}
              {tab === "trade" && <TradeTab d={d} store={rs} onOffer={(id, v) => { patch((s) => ({ ...s, offers: { ...s.offers, [id]: v } })); flash(v === "accepted" ? "Offer accepted. Payout is being processed." : "Offer declined."); }} onNavigate={onNavigate} />}
              {tab === "presets" && <PresetsTab d={d} role={role} userPresets={userPresets} onExport={exportProposal} onReconfigure={reconfigure} canReconfigure={canReconfigure} />}
              {tab === "certs" && <CertsTab d={d} role={role} store={rs} selected={selectedCert} setSelected={setSelectedCert} onReport={exportReport} onLink={copyLink} onDone={(id) => patch((s) => ({ ...s, done: { ...s.done, [id]: !s.done[id] } }))} />}
              {tab === "settings" && <SettingsTab role={role} rs={rs} patch={patch} flash={flash} />}
            </section>
          </div>
          <Sidebar m={m} role={role} d={d} />
        </div>
      </main>

      <footer className="border-t border-zinc-800 py-6 text-center text-xs text-zinc-600">ViciTech Engine v1.0. Sample account data for three roles.</footer>
    </div>
  );
}
