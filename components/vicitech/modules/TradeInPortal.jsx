import { useEffect, useMemo, useState } from "react";
import {
  RefreshCw, Recycle, Building, GraduationCap, CheckCircle2, DollarSign, Leaf, ShieldAlert, FileSpreadsheet,
  User, ShieldCheck, X,
} from "lucide-react";
import { useCheckout } from "@/context/CheckoutContext";

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
  "A+": { label: "Grade A+ (Like New)", cls: "border-emerald-600/20 bg-emerald-50 text-emerald-800" },
  A: { label: "Grade A (Minor Cosmetic Wear)", cls: "border-accent-primary/25 bg-accent-subtle text-accent-hover" },
  RE: { label: "Recertified Enterprise", cls: "border-violet-600/20 bg-violet-50 text-violet-800" },
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
const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas";

/* ───────────────────────── UI pieces ───────────────────────── */

function Choice({ active, onClick, icon: Icon, title, hint }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-colors ${focusRing} ${
        active ? "border-accent-primary/40 bg-accent-subtle" : "border-default bg-surface hover:border-primary/20"
      }`}
    >
      {Icon && <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${active ? "text-accent-primary" : "text-secondary"}`} />}
      <span>
        <span className={`block text-sm font-medium ${active ? "text-accent-hover" : "text-primary"}`}>{title}</span>
        {hint && <span className="mt-0.5 block text-xs text-secondary">{hint}</span>}
      </span>
    </button>
  );
}

function GradeBadge({ grade }) {
  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs ${GRADES[grade].cls}`}>{GRADES[grade].label}</span>;
}

function ProductCard({ p, onInspect }) {
  const { triggerCheckout } = useCheckout();

  return (
    <article className="flex flex-col rounded-3xl border border-default bg-surface p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <GradeBadge grade={p.grade} />
        <span className="text-xs text-secondary">{p.kind}</span>
      </div>
      <h3 className="mt-3 text-base font-semibold leading-snug text-primary">{p.name}</h3>
      <p className="mt-1 text-xs text-secondary">{p.spec}</p>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs text-secondary">Refurbished price</p>
          <p className="text-xl font-semibold tabular-nums text-primary">{idr(p.price)}</p>
          <p className="text-xs tabular-nums text-secondary">
            Original retail <span className="line-through">{idr(p.retail)}</span>
          </p>
        </div>
        <div className="rounded-lg border border-status-live/30 bg-emerald-50 px-2.5 py-1.5 text-right">
          <p className="text-lg font-semibold leading-none tabular-nums text-emerald-800">{p.savePct}%</p>
          <p className="mt-1 text-xs text-emerald-800">saved</p>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-xl bg-subtle p-2.5">
          <dt className="flex items-center gap-1 text-secondary"><Recycle className="h-3 w-3" /> E-waste</dt>
          <dd className="mt-1 font-medium tabular-nums text-primary">{num(p.kg)} kg</dd>
        </div>
        <div className="rounded-xl bg-subtle p-2.5">
          <dt className="flex items-center gap-1 text-secondary"><Leaf className="h-3 w-3" /> CO₂ avoided</dt>
          <dd className="mt-1 font-medium tabular-nums text-primary">{num(p.co2)} kg</dd>
        </div>
        <div className="rounded-xl bg-subtle p-2.5">
          <dt className="flex items-center gap-1 text-secondary"><ShieldCheck className="h-3 w-3" /> Warranty</dt>
          <dd className="mt-1 font-medium text-primary">{WARRANTY_MONTHS} months</dd>
        </div>
      </dl>

      <div className="mt-auto space-y-2 pt-4">
        <button
          type="button"
          onClick={() => onInspect(p)}
          className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-default px-4 py-2.5 text-sm font-medium text-primary transition-colors hover:border-accent-primary/40 hover:text-accent-hover ${focusRing}`}
        >
          <CheckCircle2 className="h-4 w-4" /> Inspection Summary
        </button>
        <button
          type="button"
          onClick={() => triggerCheckout({
            title: p.title || p.name,
            type: "trade_in_refurbished",
            price: p.price,
            specs: {
              condition: p.condition || GRADES[p.grade].label,
              warranty: p.warranty || `${WARRANTY_MONTHS} Months ViciCare`,
              storage: p.storage,
              color: p.color,
              configuration: p.spec,
            },
          })}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-accent-cta px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-cta-hover"
        >
          Check Out Now
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
      <aside role="dialog" aria-modal="true" aria-label={`Inspection summary for ${product.name}`} onClick={(e) => e.stopPropagation()} className="flex h-full w-full max-w-md flex-col border-l border-default bg-surface">
        <div className="flex items-start justify-between gap-4 border-b border-default p-5">
          <div>
            <h2 className="font-serif text-xl font-semibold text-primary">Inspection Summary</h2>
            <p className="text-sm text-secondary">{product.name}</p>
            <div className="mt-2"><GradeBadge grade={product.grade} /></div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close inspection summary" className={`rounded-lg p-2 text-secondary hover:bg-subtle hover:text-primary ${focusRing}`}><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-status-live/30 bg-emerald-50 px-3 py-1 text-sm text-emerald-800">
              <CheckCircle2 className="h-4 w-4 text-status-live" /> {total} of {total} points verified
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-default px-3 py-1 text-sm text-primary">
              <ShieldCheck className="h-4 w-4 text-accent-primary" /> {WARRANTY_MONTHS}-month warranty
            </span>
          </div>

          {groups.map((g) => (
            <section key={g.group}>
              <h3 className="mb-2 text-sm font-medium text-primary">{g.group}</h3>
              <ul className="divide-y divide-default rounded-xl border border-default">
                {g.items.map((it) => (
                  <li key={it.label} className="flex gap-3 px-3 py-2.5">
                    {it.status === "serviced"
                      ? <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-accent-primary" aria-label="Serviced by our technicians" />
                      : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-status-live" aria-label="Passed" />}
                    <div>
                      <p className="text-sm text-primary">{it.label}</p>
                      <p className="text-xs text-secondary">{it.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          <p className="text-xs text-secondary">
            <CheckCircle2 className="mr-1 inline h-3 w-3 text-status-live" /> Passed as received.
            <RefreshCw className="ml-3 mr-1 inline h-3 w-3 text-accent-primary" /> Serviced by our technicians.
          </p>

          <div className="flex gap-3 rounded-xl border border-status-sample/30 bg-amber-50 p-3">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-status-sample" />
            <div>
              <p className="text-sm font-medium text-amber-900">What to know before you buy</p>
              <p className="mt-0.5 text-sm text-amber-900/90">{NOTES[product.grade]}</p>
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
    <div className="bg-canvas text-primary antialiased">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-accent-hover">Give good hardware another life</p>
        <h1 className="flex items-center gap-3 font-serif text-4xl font-semibold tracking-tight text-primary sm:text-5xl">
          <Recycle className="h-8 w-8 text-accent-primary" /> Office Refurbished &amp; Trade-In Portal
        </h1>
        <p className="mt-3 max-w-2xl text-secondary">
          Sell retired equipment for a clear buyback estimate, or buy recertified enterprise hardware with a full inspection record and the savings shown up front.
        </p>

        {/* Trade-in form */}
        <section className="mt-10" aria-labelledby="buyback-title">
          <h2 id="buyback-title" className="flex items-center gap-2 font-serif text-2xl font-semibold text-primary">
            <DollarSign className="h-5 w-5 text-accent-primary" /> Asset buyback request
          </h2>
          <div className="mt-4 grid gap-6 lg:grid-cols-5">
            <div className="space-y-5 rounded-3xl border border-default bg-surface p-6 shadow-sm lg:col-span-3">
              <fieldset>
                <legend className="mb-2 text-sm text-primary">Entity type</legend>
                <div role="radiogroup" aria-label="Entity type" className="grid gap-2 sm:grid-cols-3">
                  {ENTITIES.map((e) => <Choice key={e.id} active={form.entity === e.id} icon={e.icon} title={e.id} onClick={() => set("entity")(e.id)} />)}
                </div>
              </fieldset>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="equipment" className="mb-2 block text-sm text-primary">Equipment type</label>
                  <select id="equipment" value={form.equipment} onChange={(e) => set("equipment")(e.target.value)} className={`w-full rounded-lg border border-default bg-surface px-3 py-2.5 text-sm text-primary ${focusRing}`}>
                    {Object.keys(EQUIPMENT).map((k) => <option key={k}>{k}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="qty" className="mb-2 block text-sm text-primary">Unit quantity</label>
                  <input
                    id="qty" type="number" inputMode="numeric" min={1} max={MAX_QTY} value={form.qty}
                    onChange={(e) => set("qty")(e.target.value)}
                    onBlur={() => set("qty")(String(qty))}
                    className={`w-full rounded-lg border border-default bg-surface px-3 py-2.5 text-sm tabular-nums text-primary ${focusRing}`}
                  />
                </div>
              </div>

              <fieldset>
                <legend className="mb-2 text-sm text-primary">Estimated condition</legend>
                <div role="radiogroup" aria-label="Estimated condition" className="grid gap-2 sm:grid-cols-3">
                  {Object.entries(CONDITIONS).map(([k, c]) => <Choice key={k} active={form.condition === k} title={k} hint={c.hint} onClick={() => set("condition")(k)} />)}
                </div>
              </fieldset>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button type="button" onClick={() => setRevealed(true)} className={`inline-flex min-h-11 items-center gap-2 rounded-full bg-accent-cta px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-accent-cta-hover ${focusRing}`}>
                  <DollarSign className="h-4 w-4" /> Get Instant Valuation Estimate
                </button>
                <button type="button" onClick={downloadTemplate} className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2.5 text-sm text-secondary hover:bg-subtle hover:text-accent-hover ${focusRing}`}>
                  <FileSpreadsheet className="h-4 w-4" /> Download asset list template
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-default bg-surface p-6 shadow-sm lg:col-span-2" aria-live="polite">
              {!revealed ? (
                <div className="flex h-full min-h-48 flex-col items-center justify-center text-center">
                  <DollarSign className="h-8 w-8 text-secondary" />
                  <p className="mt-3 text-sm text-primary">Your estimate appears here.</p>
                  <p className="mt-1 text-sm text-secondary">Fill in the form, then select Get Instant Valuation Estimate.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-secondary">Estimated buyback value for {qty} {qty > 1 ? "units" : "unit"}</p>
                    <p className="text-2xl font-semibold tabular-nums text-status-live">{idr(est.low)} to {idr(est.high)}</p>
                  </div>
                  <dl className="divide-y divide-default rounded-lg border border-default text-sm">
                    <div className="flex justify-between gap-3 px-3 py-2"><dt className="text-secondary">Per unit</dt><dd className="text-right tabular-nums text-primary">{idr(est.lowUnit)} to {idr(est.highUnit)}</dd></div>
                    <div className="flex justify-between gap-3 px-3 py-2"><dt className="text-secondary">Bulk bonus</dt><dd className="tabular-nums text-primary">{est.bonus ? `+${est.bonus}%` : "None"}</dd></div>
                    <div className="flex justify-between gap-3 px-3 py-2"><dt className="flex items-center gap-1.5 text-secondary"><Leaf className="h-3.5 w-3.5 text-status-live" /> E-waste kept out of landfill</dt><dd className="tabular-nums text-primary">{num(est.kg)} kg</dd></div>
                  </dl>
                  {nextBulk && <p className="text-xs text-secondary">Add {nextBulk.min - qty} more unit{nextBulk.min - qty > 1 ? "s" : ""} for a +{nextBulk.pct}% bulk bonus.</p>}
                  {form.entity === "Individual" && <p className="text-xs text-secondary">Bulk bonuses apply to offices and schools.</p>}

                  <p className="flex gap-2 rounded-lg border border-status-sample/30 bg-amber-50 p-3 text-xs text-amber-900">
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-status-sample" />
                    Sample rates for demonstration. The final value is confirmed after a physical inspection at Hub Bandung.
                  </p>

                  {submittedRef ? (
                    <p role="status" className="flex gap-2 rounded-lg border border-status-live/30 bg-emerald-50 p-3 text-sm text-emerald-800">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-status-live" />
                      Request {submittedRef} received. We will email the official valuation to {email.trim()}.
                    </p>
                  ) : (
                    <div>
                      <label htmlFor="email" className="mb-2 block text-sm text-primary">Contact email</label>
                      <div className="flex gap-2">
                        <input
                          id="email" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setEmailError(false); }}
                          aria-invalid={emailError} placeholder="name@organization.id"
                          className={`min-w-0 flex-1 rounded-lg border bg-surface px-3 py-2.5 text-sm text-primary placeholder:text-secondary ${focusRing} ${emailError ? "border-status-danger" : "border-default"}`}
                        />
                        <button type="button" onClick={submit} className={`min-h-11 shrink-0 rounded-full bg-accent-cta px-5 py-3 text-sm font-semibold text-white hover:bg-accent-cta-hover ${focusRing}`}>
                          Submit for valuation
                        </button>
                      </div>
                      {emailError && <p className="mt-1.5 text-xs text-status-danger">Enter a valid email address so we can send the official valuation.</p>}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Refurbished gallery */}
        <section className="mt-14" aria-labelledby="gallery-title">
          <h2 id="gallery-title" className="flex items-center gap-2 font-serif text-2xl font-semibold text-primary">
            <RefreshCw className="h-5 w-5 text-accent-primary" /> Certified refurbished hardware
          </h2>
          <p className="mt-1 text-sm text-secondary">Every unit passes a 15-point inspection and ships with a {WARRANTY_MONTHS}-month warranty.</p>

          <div role="tablist" aria-label="Filter by category" className="mt-5 flex flex-wrap gap-2">
            {TABS.map((t) => (
              <button
                key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
                className={`rounded-full border px-4 py-2 text-sm transition-colors ${focusRing} ${tab === t ? "border-accent-primary/30 bg-accent-subtle font-medium text-accent-hover" : "border-default text-secondary hover:border-primary/20 hover:text-primary"}`}
              >
                {t} <span className="ml-1 text-xs text-secondary">{tabCounts[t]}</span>
              </button>
            ))}
          </div>

          <p className="mt-4 flex flex-wrap items-center gap-x-1.5 gap-y-1 rounded-2xl border border-default bg-surface px-5 py-4 text-sm text-secondary shadow-sm">
            <Leaf className="h-4 w-4 text-status-live" />
            Buying one of each unit shown saves <b className="font-semibold tabular-nums text-status-live">{idr(totals.saved)}</b>,
            keeps <b className="font-semibold tabular-nums text-primary">{num(totals.kg)} kg</b> of e-waste in use and avoids
            <b className="font-semibold tabular-nums text-primary">{num(totals.co2)} kg</b> of CO₂.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((p) => <ProductCard key={p.id} p={p} onInspect={setInspecting} />)}
          </div>
        </section>
      </div>

      {inspecting && <InspectionDrawer product={inspecting} onClose={closeInspect} />}
    </div>
  );
}
