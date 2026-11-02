import { useEffect, useMemo, useState } from "react";
import {
  RefreshCw, Recycle, Building, GraduationCap, CheckCircle2, DollarSign, Leaf, ShieldAlert, FileSpreadsheet,
  Cpu, User, ShieldCheck, X,
} from "lucide-react";

/* ───────────────────────── Trade-in model (sample rates, IDR) ───────────────────────── */

const ENTITIES = [
  { id: "Corporate Office", icon: Building },
  { id: "School / CBT Lab", icon: GraduationCap },
  { id: "Individual", icon: User },
];

// base = typical operational resale value per unit, kg = e-waste weight per unit
const EQUIPMENT = {
  Laptops: { base: 2400000, kg: 2 },
  Desktops: { base: 1500000, kg: 7 },
  Monitors: { base: 450000, kg: 5 },
  "Server / Networking": { base: 4000000, kg: 15 },
};

const CONDITIONS = {
  Operational: { mult: 1, hint: "Powers on and works normally" },
  "Minor Defect": { mult: 0.6, hint: "Works, with cosmetic or small functional faults" },
  "Salvage / Parts": { mult: 0.15, hint: "Not working, valued for parts and recycling" },
};

const BULK = [{ min: 10, pct: 3 }, { min: 50, pct: 6 }, { min: 200, pct: 10 }]; // offices and schools only
const MAX_QTY = 5000;

function estimate({ entity, equipment, condition, qty }) {
  const bonus = entity === "Individual" ? 0 : [...BULK].reverse().find((t) => qty >= t.min)?.pct ?? 0;
  const mid = EQUIPMENT[equipment].base * CONDITIONS[condition].mult * (1 + bonus / 100);
  const lowUnit = roundTo(mid * 0.85);
  const highUnit = roundTo(mid * 1.15);
  return { bonus, lowUnit, highUnit, low: lowUnit * qty, high: highUnit * qty, kg: Math.round(EQUIPMENT[equipment].kg * qty * 10) / 10 };
}

/* ───────────────────────── Refurbished catalog (sample data) ───────────────────────── */

const GRADES = {
  "A+": { label: "Grade A+ (Like New)", cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" },
  A: { label: "Grade A (Minor Cosmetic Wear)", cls: "border-cyan-500/30 bg-cyan-500/10 text-cyan-400" },
  RE: { label: "Recertified Enterprise", cls: "border-violet-400/30 bg-violet-400/10 text-violet-300" },
};

const NOTES = {
  "A+": "No known cosmetic issues. Original charger or power adapter included.",
  A: "Light scratches on the lid or top cover and slight shine on the palm rest. Screen and keys are clean.",
  RE: "Ex-corporate fleet unit, cleaned and re-imaged. Faint asset-tag residue may remain on the chassis.",
};

const WARRANTY_MONTHS = 12;
const TABS = ["All", "Laptops", "Desktops", "Mini PCs"];

// checks: [status, detail] for the four product-specific inspection points. status: "pass" | "serviced"
const RAW = [
  { id: "t14", name: "Lenovo ThinkPad T14 Gen 4", kind: "Laptops", grade: "A+", retail: 21900000, price: 9800000, spec: "Ryzen 7 PRO 7840U, 16 GB, 512 GB NVMe", kg: 1.6, co2: 215,
    checks: { power: ["serviced", "New cell fitted, 100% capacity"], thermal: ["serviced", "Re-pasted, 68 °C at full load"], screen: ["pass", "97% uniformity, 0 dead pixels"], storage: ["pass", "SSD health 99%, 0 bad sectors"] } },
  { id: "x1c", name: "Lenovo ThinkPad X1 Carbon Gen 10", kind: "Laptops", grade: "A", retail: 32000000, price: 14500000, spec: "Core i7-1260P, 16 GB, 512 GB NVMe", kg: 1.4, co2: 230,
    checks: { power: ["pass", "Battery health 91%"], thermal: ["serviced", "Re-pasted, 71 °C at full load"], screen: ["pass", "95% uniformity, 0 dead pixels"], storage: ["pass", "SSD health 97%, 0 bad sectors"] } },
  { id: "lat7420", name: "Dell Latitude 7420", kind: "Laptops", grade: "A", retail: 24500000, price: 9200000, spec: "Core i5-1145G7, 16 GB, 256 GB NVMe", kg: 1.5, co2: 205,
    checks: { power: ["serviced", "New cell fitted, 100% capacity"], thermal: ["serviced", "Re-pasted, 73 °C at full load"], screen: ["pass", "94% uniformity, 0 dead pixels"], storage: ["pass", "SSD health 96%, 0 bad sectors"] } },
  { id: "elite840", name: "HP EliteBook 840 G9", kind: "Laptops", grade: "RE", retail: 20900000, price: 8200000, spec: "Core i5-1245U, 16 GB, 512 GB NVMe", kg: 1.5, co2: 210,
    checks: { power: ["pass", "Battery health 88%"], thermal: ["serviced", "Re-pasted, 70 °C at full load"], screen: ["pass", "96% uniformity, 0 dead pixels"], storage: ["pass", "SSD health 98%, 0 bad sectors"] } },
  { id: "optiplex7090", name: "Dell OptiPlex 7090 SFF", kind: "Desktops", grade: "A", retail: 15900000, price: 6300000, spec: "Core i7-10700, 16 GB, 512 GB SSD", kg: 6.5, co2: 320,
    checks: { power: ["pass", "PSU load-tested, CMOS cell 3.1 V"], thermal: ["serviced", "Re-pasted, 66 °C at full load"], screen: ["pass", "All display outputs verified"], storage: ["pass", "SSD health 97%, 0 bad sectors"] } },
  { id: "prodesk600", name: "HP ProDesk 600 G6 Tower", kind: "Desktops", grade: "RE", retail: 12600000, price: 4300000, spec: "Core i5-10500, 16 GB, 256 GB SSD", kg: 7.2, co2: 300,
    checks: { power: ["pass", "PSU load-tested, CMOS cell 3.0 V"], thermal: ["serviced", "Re-pasted, 64 °C at full load"], screen: ["pass", "All display outputs verified"], storage: ["pass", "SSD health 95%, 0 bad sectors"] } },
  { id: "elitedesk800", name: "HP EliteDesk 800 G6 Mini", kind: "Mini PCs", grade: "A+", retail: 14500000, price: 4900000, spec: "Core i5-10500T, 16 GB, 256 GB NVMe", kg: 1.3, co2: 150,
    checks: { power: ["pass", "Adapter load-tested, CMOS cell 3.2 V"], thermal: ["serviced", "Re-pasted, 62 °C at full load"], screen: ["pass", "All display outputs verified"], storage: ["pass", "SSD health 99%, 0 bad sectors"] } },
  { id: "m90q", name: "Lenovo ThinkCentre M90q Gen 3 Tiny", kind: "Mini PCs", grade: "RE", retail: 13800000, price: 5700000, spec: "Core i5-12500T, 16 GB, 256 GB NVMe", kg: 1.4, co2: 155,
    checks: { power: ["pass", "Adapter load-tested, CMOS cell 3.1 V"], thermal: ["serviced", "Re-pasted, 63 °C at full load"], screen: ["pass", "All display outputs verified"], storage: ["pass", "SSD health 98%, 0 bad sectors"] } },
].map((p) => ({ ...p, saved: p.retail - p.price, savePct: Math.round((1 - p.price / p.retail) * 100) }));

// The 15-point inspection. `key` points use per-product results; `alt` is the label for non-laptops
const CHECK_DEFS = [
  { group: "Power & Thermal", items: [
    { key: "power", label: "Battery Health", alt: "PSU & CMOS Battery" },
    { key: "thermal", label: "Thermal Re-pasting" },
    { label: "Fan & Cooling", detail: "Fan curve and noise within spec" },
    { label: "CPU Stress Test", detail: "30 minutes at full load, no throttling" },
  ] },
  { group: "Display & Input", items: [
    { key: "screen", label: "Screen Uniformity", alt: "Display Output" },
    { label: "Keyboard & Trackpad", alt: "Front Panel & USB Input", detail: "Every key and input registered" },
    { label: "Webcam & Microphone", alt: "Audio Jacks", detail: "Capture and playback verified" },
    { label: "Speakers & Audio", detail: "Clean output, no distortion" },
  ] },
  { group: "Storage & Memory", items: [
    { key: "storage", label: "Storage Health Status" },
    { label: "Memory Test", detail: "Full-pass test, 0 errors" },
    { label: "Secure Data Wipe", detail: "NIST 800-88 wipe, certificate issued" },
  ] },
  { group: "Hardware & Connectivity", items: [
    { label: "Ports & Connectivity", detail: "All ports and card readers tested" },
    { label: "Wi-Fi & Bluetooth", detail: "Pairs and holds signal" },
    { label: "Chassis & Hinges", alt: "Chassis & Latches", detail: "Frame straight, no loose parts" },
    { label: "BIOS & Firmware", detail: "Latest version, no management lock" },
  ] },
];

/* ───────────────────────── Helpers ───────────────────────── */

const idr = (n) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
const num = (n) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(n);
const roundTo = (n, step = 10000) => Math.round(n / step) * step;
const clampQty = (v) => Math.min(MAX_QTY, Math.max(1, parseInt(v, 10) || 1));
const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/70";

/* ───────────────────────── UI pieces ───────────────────────── */

function Header({ onOpenEngine, onOpenBuilder }) {
  const link = `shrink-0 rounded-md px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-100 ${focusRing}`;
  return (
    <header className="sticky top-0 z-30 border-b border-zinc-800 bg-zinc-950/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
        <span className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-cyan-500 text-zinc-950"><Cpu className="h-5 w-5" /></span>
          <span className="text-lg font-semibold tracking-tight">ViciTech</span>
        </span>
        <nav aria-label="Modules" className="ml-2 flex items-center gap-1 overflow-x-auto">
          <button type="button" onClick={onOpenEngine} className={link}>Hardware Engine</button>
          <button type="button" onClick={onOpenBuilder} className={link}>Preset Builder</button>
          <button type="button" aria-current="page" className={`flex shrink-0 items-center gap-2 border-b-2 border-cyan-500 px-3 py-1.5 text-sm font-medium text-cyan-400 ${focusRing}`}>
            <Recycle className="h-4 w-4" /> Trade-In &amp; Recycle
          </button>
        </nav>
        <span className="ml-auto hidden items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-400 md:inline-flex">
          <span className="h-2 w-2 rounded-full bg-emerald-400" /> ViciTech Engine v1.0
        </span>
      </div>
    </header>
  );
}

function Choice({ active, onClick, icon: Icon, title, hint }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-colors ${focusRing} ${
        active ? "border-cyan-500/70 bg-cyan-500/10" : "border-zinc-800 bg-zinc-950/50 hover:border-zinc-700"
      }`}
    >
      {Icon && <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${active ? "text-cyan-400" : "text-zinc-500"}`} />}
      <span>
        <span className={`block text-sm font-medium ${active ? "text-cyan-300" : "text-zinc-200"}`}>{title}</span>
        {hint && <span className="mt-0.5 block text-xs text-zinc-500">{hint}</span>}
      </span>
    </button>
  );
}

function GradeBadge({ grade }) {
  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs ${GRADES[grade].cls}`}>{GRADES[grade].label}</span>;
}

function ProductCard({ p, onInspect }) {
  return (
    <article className="flex flex-col rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="flex items-start justify-between gap-3">
        <GradeBadge grade={p.grade} />
        <span className="text-xs text-zinc-500">{p.kind}</span>
      </div>
      <h3 className="mt-3 text-base font-semibold leading-snug text-zinc-50">{p.name}</h3>
      <p className="mt-1 text-xs text-zinc-400">{p.spec}</p>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs text-zinc-500">Refurbished price</p>
          <p className="text-xl font-semibold tabular-nums text-zinc-50">{idr(p.price)}</p>
          <p className="text-xs tabular-nums text-zinc-500">
            Original retail <span className="line-through">{idr(p.retail)}</span>
          </p>
        </div>
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-right">
          <p className="text-lg font-semibold leading-none tabular-nums text-emerald-400">{p.savePct}%</p>
          <p className="mt-1 text-xs text-emerald-300">saved</p>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-lg bg-zinc-950/60 p-2">
          <dt className="flex items-center gap-1 text-zinc-500"><Recycle className="h-3 w-3" /> E-waste</dt>
          <dd className="mt-1 font-medium tabular-nums text-zinc-100">{num(p.kg)} kg</dd>
        </div>
        <div className="rounded-lg bg-zinc-950/60 p-2">
          <dt className="flex items-center gap-1 text-zinc-500"><Leaf className="h-3 w-3" /> CO₂ avoided</dt>
          <dd className="mt-1 font-medium tabular-nums text-zinc-100">{num(p.co2)} kg</dd>
        </div>
        <div className="rounded-lg bg-zinc-950/60 p-2">
          <dt className="flex items-center gap-1 text-zinc-500"><ShieldCheck className="h-3 w-3" /> Warranty</dt>
          <dd className="mt-1 font-medium text-zinc-100">{WARRANTY_MONTHS} months</dd>
        </div>
      </dl>

      <div className="mt-auto pt-4">
        <button
          type="button"
          onClick={() => onInspect(p)}
          className={`inline-flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-sm font-medium text-zinc-200 transition-colors hover:border-cyan-500/60 hover:text-cyan-400 ${focusRing}`}
        >
          <CheckCircle2 className="h-4 w-4" /> Inspection Summary
        </button>
      </div>
    </article>
  );
}

function InspectionDrawer({ product, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    const prev = document.body.style.overflow;
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  const laptop = product.kind === "Laptops";
  const groups = CHECK_DEFS.map((g) => ({
    group: g.group,
    items: g.items.map((it) => {
      const r = it.key ? product.checks[it.key] : null;
      return { label: laptop ? it.label : it.alt || it.label, status: r ? r[0] : "pass", detail: r ? r[1] : it.detail };
    }),
  }));
  const total = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70" onClick={onClose}>
      <aside role="dialog" aria-modal="true" aria-label={`Inspection summary for ${product.name}`} onClick={(e) => e.stopPropagation()} className="flex h-full w-full max-w-md flex-col border-l border-zinc-800 bg-zinc-950">
        <div className="flex items-start justify-between gap-4 border-b border-zinc-800 p-5">
          <div>
            <h2 className="text-lg font-semibold text-zinc-50">Inspection Summary</h2>
            <p className="text-sm text-zinc-400">{product.name}</p>
            <div className="mt-2"><GradeBadge grade={product.grade} /></div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close inspection summary" className={`rounded-lg p-2 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100 ${focusRing}`}><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-sm text-emerald-400">
              <CheckCircle2 className="h-4 w-4" /> {total} of {total} points verified
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-zinc-700 px-3 py-1 text-sm text-zinc-300">
              <ShieldCheck className="h-4 w-4 text-cyan-400" /> {WARRANTY_MONTHS}-month warranty
            </span>
          </div>

          {groups.map((g) => (
            <section key={g.group}>
              <h3 className="mb-2 text-sm font-medium text-zinc-300">{g.group}</h3>
              <ul className="divide-y divide-zinc-800 rounded-xl border border-zinc-800">
                {g.items.map((it) => (
                  <li key={it.label} className="flex gap-3 px-3 py-2.5">
                    {it.status === "serviced"
                      ? <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" aria-label="Serviced by our technicians" />
                      : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-label="Passed" />}
                    <div>
                      <p className="text-sm text-zinc-100">{it.label}</p>
                      <p className="text-xs text-zinc-500">{it.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          <p className="text-xs text-zinc-500">
            <CheckCircle2 className="mr-1 inline h-3 w-3 text-emerald-400" /> Passed as received.
            <RefreshCw className="ml-3 mr-1 inline h-3 w-3 text-cyan-400" /> Serviced by our technicians.
          </p>

          <div className="flex gap-3 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
            <div>
              <p className="text-sm font-medium text-amber-200">What to know before you buy</p>
              <p className="mt-0.5 text-sm text-amber-100/80">{NOTES[product.grade]}</p>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

/* ───────────────────────── Page ───────────────────────── */

export default function CircularPortal({ onOpenEngine, onOpenBuilder }) {
  const [form, setForm] = useState({ entity: "School / CBT Lab", equipment: "Laptops", condition: "Operational", qty: "25" });
  const [revealed, setRevealed] = useState(false);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState(false);
  const [submittedRef, setSubmittedRef] = useState("");
  const [tab, setTab] = useState("All");
  const [inspecting, setInspecting] = useState(null);

  const qty = clampQty(form.qty);
  const est = useMemo(() => estimate({ ...form, qty }), [form.entity, form.equipment, form.condition, qty]); // eslint-disable-line react-hooks/exhaustive-deps
  const nextBulk = form.entity !== "Individual" ? BULK.find((t) => qty < t.min) : null;

  const set = (key) => (value) => { setForm((f) => ({ ...f, [key]: value })); setSubmittedRef(""); };

  const submit = () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setEmailError(true);
    setEmailError(false);
    setSubmittedRef(`VT-TI-${Date.now().toString(36).toUpperCase().slice(-6)}`);
  };

  const downloadTemplate = () => {
    const csv = `Equipment type,Brand and model,Serial number,Condition,Quantity\r\n"${form.equipment}",,,"${form.condition}",${qty}\r\n`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "vicitech-asset-list-template.csv" });
    a.click();
    URL.revokeObjectURL(url);
  };

  const tabCounts = useMemo(() => Object.fromEntries(TABS.map((t) => [t, t === "All" ? RAW.length : RAW.filter((p) => p.kind === t).length])), []);
  const filtered = useMemo(() => RAW.filter((p) => tab === "All" || p.kind === tab), [tab]);
  const totals = useMemo(
    () => filtered.reduce((t, p) => ({ saved: t.saved + p.saved, kg: t.kg + p.kg, co2: t.co2 + p.co2 }), { saved: 0, kg: 0, co2: 0 }),
    [filtered]
  );
  const closeInspect = useMemo(() => () => setInspecting(null), []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 antialiased">
      <Header onOpenEngine={onOpenEngine} onOpenBuilder={onOpenBuilder} />

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <h1 className="flex items-center gap-3 text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">
          <Recycle className="h-8 w-8 text-emerald-400" /> Office Refurbished &amp; Trade-In Portal
        </h1>
        <p className="mt-3 max-w-2xl text-zinc-400">
          Sell retired equipment for a clear buyback estimate, or buy recertified enterprise hardware with a full inspection record and the savings shown up front.
        </p>

        {/* Trade-in form */}
        <section className="mt-10" aria-labelledby="buyback-title">
          <h2 id="buyback-title" className="flex items-center gap-2 text-xl font-semibold text-zinc-50">
            <DollarSign className="h-5 w-5 text-cyan-400" /> Asset buyback request
          </h2>
          <div className="mt-4 grid gap-6 lg:grid-cols-5">
            <div className="space-y-5 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 lg:col-span-3">
              <fieldset>
                <legend className="mb-2 text-sm text-zinc-300">Entity type</legend>
                <div role="radiogroup" aria-label="Entity type" className="grid gap-2 sm:grid-cols-3">
                  {ENTITIES.map((e) => <Choice key={e.id} active={form.entity === e.id} icon={e.icon} title={e.id} onClick={() => set("entity")(e.id)} />)}
                </div>
              </fieldset>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="equipment" className="mb-2 block text-sm text-zinc-300">Equipment type</label>
                  <select id="equipment" value={form.equipment} onChange={(e) => set("equipment")(e.target.value)} className={`w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 ${focusRing}`}>
                    {Object.keys(EQUIPMENT).map((k) => <option key={k}>{k}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="qty" className="mb-2 block text-sm text-zinc-300">Unit quantity</label>
                  <input
                    id="qty" type="number" inputMode="numeric" min={1} max={MAX_QTY} value={form.qty}
                    onChange={(e) => set("qty")(e.target.value)}
                    onBlur={() => set("qty")(String(qty))}
                    className={`w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm tabular-nums text-zinc-100 ${focusRing}`}
                  />
                </div>
              </div>

              <fieldset>
                <legend className="mb-2 text-sm text-zinc-300">Estimated condition</legend>
                <div role="radiogroup" aria-label="Estimated condition" className="grid gap-2 sm:grid-cols-3">
                  {Object.entries(CONDITIONS).map(([k, c]) => <Choice key={k} active={form.condition === k} title={k} hint={c.hint} onClick={() => set("condition")(k)} />)}
                </div>
              </fieldset>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button type="button" onClick={() => setRevealed(true)} className={`inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 ${focusRing}`}>
                  <DollarSign className="h-4 w-4" /> Get Instant Valuation Estimate
                </button>
                <button type="button" onClick={downloadTemplate} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-zinc-400 hover:text-cyan-400 ${focusRing}`}>
                  <FileSpreadsheet className="h-4 w-4" /> Download asset list template
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 lg:col-span-2" aria-live="polite">
              {!revealed ? (
                <div className="flex h-full min-h-48 flex-col items-center justify-center text-center">
                  <DollarSign className="h-8 w-8 text-zinc-700" />
                  <p className="mt-3 text-sm text-zinc-300">Your estimate appears here.</p>
                  <p className="mt-1 text-sm text-zinc-500">Fill in the form, then select Get Instant Valuation Estimate.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-zinc-500">Estimated buyback value for {qty} {qty > 1 ? "units" : "unit"}</p>
                    <p className="text-2xl font-semibold tabular-nums text-emerald-400">{idr(est.low)} to {idr(est.high)}</p>
                  </div>
                  <dl className="divide-y divide-zinc-800 rounded-lg border border-zinc-800 text-sm">
                    <div className="flex justify-between gap-3 px-3 py-2"><dt className="text-zinc-500">Per unit</dt><dd className="text-right tabular-nums text-zinc-100">{idr(est.lowUnit)} to {idr(est.highUnit)}</dd></div>
                    <div className="flex justify-between gap-3 px-3 py-2"><dt className="text-zinc-500">Bulk bonus</dt><dd className="tabular-nums text-zinc-100">{est.bonus ? `+${est.bonus}%` : "None"}</dd></div>
                    <div className="flex justify-between gap-3 px-3 py-2"><dt className="flex items-center gap-1.5 text-zinc-500"><Leaf className="h-3.5 w-3.5 text-emerald-400" /> E-waste kept out of landfill</dt><dd className="tabular-nums text-zinc-100">{num(est.kg)} kg</dd></div>
                  </dl>
                  {nextBulk && <p className="text-xs text-zinc-500">Add {nextBulk.min - qty} more unit{nextBulk.min - qty > 1 ? "s" : ""} for a +{nextBulk.pct}% bulk bonus.</p>}
                  {form.entity === "Individual" && <p className="text-xs text-zinc-500">Bulk bonuses apply to offices and schools.</p>}

                  <p className="flex gap-2 rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-xs text-amber-100/80">
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                    Sample rates for demonstration. The final value is confirmed after a physical inspection at Hub Bandung.
                  </p>

                  {submittedRef ? (
                    <p role="status" className="flex gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                      Request {submittedRef} received. We will email the official valuation to {email.trim()}.
                    </p>
                  ) : (
                    <div>
                      <label htmlFor="email" className="mb-2 block text-sm text-zinc-300">Contact email</label>
                      <div className="flex gap-2">
                        <input
                          id="email" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setEmailError(false); }}
                          aria-invalid={emailError} placeholder="name@organization.id"
                          className={`min-w-0 flex-1 rounded-lg border bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 ${focusRing} ${emailError ? "border-red-500" : "border-zinc-700"}`}
                        />
                        <button type="button" onClick={submit} className={`shrink-0 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 ${focusRing}`}>
                          Submit for valuation
                        </button>
                      </div>
                      {emailError && <p className="mt-1.5 text-xs text-red-400">Enter a valid email address so we can send the official valuation.</p>}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Refurbished gallery */}
        <section className="mt-14" aria-labelledby="gallery-title">
          <h2 id="gallery-title" className="flex items-center gap-2 text-xl font-semibold text-zinc-50">
            <RefreshCw className="h-5 w-5 text-cyan-400" /> Certified refurbished hardware
          </h2>
          <p className="mt-1 text-sm text-zinc-400">Every unit passes a 15-point inspection and ships with a {WARRANTY_MONTHS}-month warranty.</p>

          <div role="tablist" aria-label="Filter by category" className="mt-5 flex flex-wrap gap-2">
            {TABS.map((t) => (
              <button
                key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
                className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${focusRing} ${tab === t ? "border-cyan-500 bg-cyan-500/15 text-cyan-300" : "border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"}`}
              >
                {t} <span className="ml-1 text-xs text-zinc-500">{tabCounts[t]}</span>
              </button>
            ))}
          </div>

          <p className="mt-4 flex flex-wrap items-center gap-x-1.5 gap-y-1 rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3 text-sm text-zinc-400">
            <Leaf className="h-4 w-4 text-emerald-400" />
            Buying one of each unit shown saves <b className="font-semibold tabular-nums text-emerald-400">{idr(totals.saved)}</b>,
            keeps <b className="font-semibold tabular-nums text-zinc-100">{num(totals.kg)} kg</b> of e-waste in use and avoids
            <b className="font-semibold tabular-nums text-zinc-100">{num(totals.co2)} kg</b> of CO₂.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((p) => <ProductCard key={p.id} p={p} onInspect={setInspecting} />)}
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-800 py-6 text-center text-xs text-zinc-600">
        ViciTech Engine v1.0. Sample prices, rates and inspection data.
      </footer>

      {inspecting && <InspectionDrawer product={inspecting} onClose={closeInspect} />}
    </div>
  );
}
