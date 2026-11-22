import { useEffect, useMemo, useState } from "react";
import {
  RefreshCw, Recycle, Building, GraduationCap, CheckCircle2, DollarSign, Leaf, ShieldAlert, FileSpreadsheet,
  User, ShieldCheck, X,
} from "lucide-react";
import { useCheckout } from "@/context/CheckoutContext";

/* ───────────────────────── Model Trade-In (tarif referensi, IDR) ───────────────────────── */

const ENTITIES = [
  { id: "Kantor / Korporasi", icon: Building },
  { id: "Sekolah / Lab CBT", icon: GraduationCap },
  { id: "Individu", icon: User },
];

// base = estimasi nilai beli kembali per unit, kg = perkiraan bobot limbah elektronik per unit
const EQUIPMENT = {
  Laptop: { base: 2400000, kg: 2 },
  "PC Desktop": { base: 1500000, kg: 7 },
  Monitor: { base: 450000, kg: 5 },
  "Server / Jaringan": { base: 4000000, kg: 15 },
};

const CONDITIONS = {
  "Berfungsi Normal": { mult: 1, hint: "Menyala dan seluruh fitur berfungsi normal" },
  "Cacat Ringan": { mult: 0.6, hint: "Berfungsi, dengan lecet fisik atau kendala minor" },
  "Rusak / Suku Cadang": { mult: 0.15, hint: "Mati total, dinilai untuk komponen dan daur ulang" },
};

const BULK = [{ min: 10, pct: 3 }, { min: 50, pct: 6 }, { min: 200, pct: 10 }]; // khusus kantor dan sekolah
const MAX_QTY = 5000;

function estimate({ entity, equipment, condition, qty }) {
  const bonus = entity === "Individu" ? 0 : [...BULK].reverse().find((t) => qty >= t.min)?.pct ?? 0;
  const equipMeta = EQUIPMENT[equipment] || EQUIPMENT.Laptop;
  const condMeta = CONDITIONS[condition] || CONDITIONS["Berfungsi Normal"];
  const mid = equipMeta.base * condMeta.mult * (1 + bonus / 100);
  const lowUnit = roundTo(mid * 0.85);
  const highUnit = roundTo(mid * 1.15);
  return { bonus, lowUnit, highUnit, low: lowUnit * qty, high: highUnit * qty, kg: Math.round(equipMeta.kg * qty * 10) / 10 };
}

/* ───────────────────────── Katalog Refurbished (data referensi) ───────────────────────── */

const GRADES = {
  "A+": { label: "Grade A+ (Seperti Baru)", cls: "border-emerald-600/20 bg-emerald-50 text-emerald-800" },
  A: { label: "Grade A (Lecet Pemakaian Ringan)", cls: "border-accent-primary/25 bg-accent-subtle text-accent-hover" },
  RE: { label: "Recertified Enterprise", cls: "border-default bg-subtle text-primary" },
};

const NOTES = {
  "A+": "Tidak ada cacat kosmetik yang mencolok. Charger atau adaptor daya asli sudah termasuk.",
  A: "Goresan tipis pada penutup atas atau bekas kilap ringan di palm rest. Layar dan keyboard bersih.",
  RE: "Unit eks armada korporasi, telah dibersihkan dan diinstal ulang. Sisa stiker aset tipis mungkin masih terlihat di sasis.",
};

const WARRANTY_MONTHS = 12;
const TABS = ["Semua", "Laptop", "Desktop", "Mini PC"];

// checks: [status, detail] untuk 4 titik inspeksi spesifik unit. status: "pass" | "serviced"
const RAW = [
  { id: "t14", name: "Lenovo ThinkPad T14 Gen 4", kind: "Laptop", grade: "A+", retail: 21900000, price: 9800000, spec: "Ryzen 7 PRO 7840U, 16 GB, 512 GB NVMe", kg: 1.6, co2: 215,
    checks: { power: ["serviced", "Sel baterai baru terpasang, kapasitas 100%"], thermal: ["serviced", "Repaste termal baru, 68 °C pada beban penuh"], screen: ["pass", "Keseragaman layar 97%, 0 dead pixel"], storage: ["pass", "Kesehatan SSD 99%, 0 bad sector"] } },
  { id: "x1c", name: "Lenovo ThinkPad X1 Carbon Gen 10", kind: "Laptop", grade: "A", retail: 32000000, price: 14500000, spec: "Core i7-1260P, 16 GB, 512 GB NVMe", kg: 1.4, co2: 230,
    checks: { power: ["pass", "Kesehatan baterai 91%"], thermal: ["serviced", "Repaste termal baru, 71 °C pada beban penuh"], screen: ["pass", "Keseragaman layar 95%, 0 dead pixel"], storage: ["pass", "Kesehatan SSD 97%, 0 bad sector"] } },
  { id: "lat7420", name: "Dell Latitude 7420", kind: "Laptop", grade: "A", retail: 24500000, price: 9200000, spec: "Core i5-1145G7, 16 GB, 256 GB NVMe", kg: 1.5, co2: 205,
    checks: { power: ["serviced", "Sel baterai baru terpasang, kapasitas 100%"], thermal: ["serviced", "Repaste termal baru, 73 °C pada beban penuh"], screen: ["pass", "Keseragaman layar 94%, 0 dead pixel"], storage: ["pass", "Kesehatan SSD 96%, 0 bad sector"] } },
  { id: "elite840", name: "HP EliteBook 840 G9", kind: "Laptop", grade: "RE", retail: 20900000, price: 8200000, spec: "Core i5-1245U, 16 GB, 512 GB NVMe", kg: 1.5, co2: 210,
    checks: { power: ["pass", "Kesehatan baterai 88%"], thermal: ["serviced", "Repaste termal baru, 70 °C pada beban penuh"], screen: ["pass", "Keseragaman layar 96%, 0 dead pixel"], storage: ["pass", "Kesehatan SSD 98%, 0 bad sector"] } },
  { id: "optiplex7090", name: "Dell OptiPlex 7090 SFF", kind: "Desktop", grade: "A", retail: 15900000, price: 6300000, spec: "Core i7-10700, 16 GB, 512 GB SSD", kg: 6.5, co2: 320,
    checks: { power: ["pass", "PSU lolos uji beban, baterai CMOS 3,1 V"], thermal: ["serviced", "Repaste termal baru, 66 °C pada beban penuh"], screen: ["pass", "Semua output tampilan terverifikasi"], storage: ["pass", "Kesehatan SSD 97%, 0 bad sector"] } },
  { id: "prodesk600", name: "HP ProDesk 600 G6 Tower", kind: "Desktop", grade: "RE", retail: 12600000, price: 4300000, spec: "Core i5-10500, 16 GB, 256 GB SSD", kg: 7.2, co2: 300,
    checks: { power: ["pass", "PSU lolos uji beban, baterai CMOS 3,0 V"], thermal: ["serviced", "Repaste termal baru, 64 °C pada beban penuh"], screen: ["pass", "Semua output tampilan terverifikasi"], storage: ["pass", "Kesehatan SSD 95%, 0 bad sector"] } },
  { id: "elitedesk800", name: "HP EliteDesk 800 G6 Mini", kind: "Mini PC", grade: "A+", retail: 14500000, price: 4900000, spec: "Core i5-10500T, 16 GB, 256 GB NVMe", kg: 1.3, co2: 150,
    checks: { power: ["pass", "Adaptor lolos uji beban, baterai CMOS 3,2 V"], thermal: ["serviced", "Repaste termal baru, 62 °C pada beban penuh"], screen: ["pass", "Semua output tampilan terverifikasi"], storage: ["pass", "Kesehatan SSD 99%, 0 bad sector"] } },
  { id: "m90q", name: "Lenovo ThinkCentre M90q Gen 3 Tiny", kind: "Mini PC", grade: "RE", retail: 13800000, price: 5700000, spec: "Core i5-12500T, 16 GB, 256 GB NVMe", kg: 1.4, co2: 155,
    checks: { power: ["pass", "Adaptor lolos uji beban, baterai CMOS 3,1 V"], thermal: ["serviced", "Repaste termal baru, 63 °C pada beban penuh"], screen: ["pass", "Semua output tampilan terverifikasi"], storage: ["pass", "Kesehatan SSD 98%, 0 bad sector"] } },
].map((p) => ({ ...p, saved: p.retail - p.price, savePct: Math.round((1 - p.price / p.retail) * 100) }));

// Protokol inspeksi 15 titik
const CHECK_DEFS = [
  { group: "Daya & Termal", items: [
    { key: "power", label: "Kesehatan Baterai", alt: "PSU & Baterai CMOS" },
    { key: "thermal", label: "Repaste Termal CPU/GPU" },
    { label: "Kipas & Pendinginan", detail: "Kurva kipas dan tingkat kebisingan normal" },
    { label: "Uji Beban CPU", detail: "Uji beban penuh 30 menit tanpa thermal throttling" },
  ] },
  { group: "Layar & Input", items: [
    { key: "screen", label: "Keseragaman Layar", alt: "Output Tampilan" },
    { label: "Keyboard & Trackpad", alt: "Panel Depan & Input USB", detail: "Seluruh tombol dan port input terbaca" },
    { label: "Webcam & Mikrofon", alt: "Jack Audio", detail: "Tangkapan kamera dan suara terverifikasi" },
    { label: "Speaker & Audio", detail: "Keluaran suara jernih tanpa distorsi" },
  ] },
  { group: "Penyimpanan & Memori", items: [
    { key: "storage", label: "Status Kesehatan Storage" },
    { label: "Uji Memori (RAM)", detail: "Pengujian penuh tanpa error" },
    { label: "Sanitasi Data Aman", detail: "Penghapusan standar NIST 800-88 disertai sertifikat" },
  ] },
  { group: "Perangkat Keras & Konektivitas", items: [
    { label: "Port & Konektivitas", detail: "Semua port USB, HDMI, LAN, dan card reader diuji" },
    { label: "Wi-Fi & Bluetooth", detail: "Koneksi dan pairing stabil" },
    { label: "Sasis & Engsel", alt: "Sasis & Pengunci Casing", detail: "Rangka kokoh dan tidak ada bagian longgar" },
    { label: "BIOS & Firmware", detail: "Versi terbaru dan bebas kunci manajemen aset" },
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
      className={`flex min-h-11 items-start gap-3 rounded-lg border p-3 text-left transition-colors ${focusRing} ${
        active ? "border-accent-primary bg-accent-subtle" : "border-default bg-surface hover:bg-subtle"
      }`}
    >
      {Icon && <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${active ? "text-accent-primary" : "text-secondary"}`} strokeWidth={1.75} aria-hidden="true" />}
      <span>
        <span className={`block text-sm font-medium ${active ? "text-accent-cta" : "text-primary"}`}>{title}</span>
        {hint && <span className="mt-0.5 block text-xs text-secondary">{hint}</span>}
      </span>
    </button>
  );
}

function GradeBadge({ grade }) {
  return <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${GRADES[grade].cls}`}>{GRADES[grade].label}</span>;
}

function ProductCard({ p, onInspect }) {
  const { triggerCheckout } = useCheckout();

  return (
    <article className="flex flex-col rounded-xl border border-default bg-surface p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <GradeBadge grade={p.grade} />
        <span className="text-xs font-medium text-secondary">{p.kind}</span>
      </div>
      <h3 className="mt-3 font-serif text-lg font-semibold leading-snug text-primary">{p.name}</h3>
      <p className="mt-1 text-xs text-secondary">{p.spec}</p>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs text-secondary">Harga unit refurbished</p>
          <p className="font-mono text-xl font-semibold tabular-nums text-primary">{idr(p.price)}</p>
          <p className="font-mono text-xs tabular-nums text-secondary">
            Harga ritel baru <span className="line-through">{idr(p.retail)}</span>
          </p>
        </div>
        <div className="rounded-lg border border-status-live/30 bg-emerald-50 px-2.5 py-1.5 text-right">
          <p className="font-mono text-lg font-semibold leading-none tabular-nums text-emerald-800">{p.savePct}%</p>
          <p className="mt-1 text-xs text-emerald-800">hemat</p>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-lg border border-default bg-canvas p-2.5">
          <dt className="flex items-center gap-1 text-secondary"><Recycle className="h-3 w-3" aria-hidden="true" /> E-waste</dt>
          <dd className="mt-1 font-mono font-medium tabular-nums text-primary">{num(p.kg)} kg</dd>
        </div>
        <div className="rounded-lg border border-default bg-canvas p-2.5">
          <dt className="flex items-center gap-1 text-secondary"><Leaf className="h-3 w-3" aria-hidden="true" /> CO₂ dicegah</dt>
          <dd className="mt-1 font-mono font-medium tabular-nums text-primary">{num(p.co2)} kg</dd>
        </div>
        <div className="rounded-lg border border-default bg-canvas p-2.5">
          <dt className="flex items-center gap-1 text-secondary"><ShieldCheck className="h-3 w-3" aria-hidden="true" /> Garansi</dt>
          <dd className="mt-1 font-mono font-medium text-primary">{WARRANTY_MONTHS} bln</dd>
        </div>
      </dl>

      <div className="mt-auto space-y-2 pt-4">
        <button
          type="button"
          onClick={() => onInspect(p)}
          className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-default bg-canvas px-4 py-2.5 text-sm font-medium text-primary transition-colors hover:border-accent-primary/40 hover:bg-subtle ${focusRing}`}
        >
          <CheckCircle2 className="h-4 w-4 text-status-live" strokeWidth={1.75} aria-hidden="true" />
          <span>Ringkasan Inspeksi</span>
        </button>
        <button
          type="button"
          onClick={() => triggerCheckout({
            title: p.title || p.name,
            type: "trade_in_refurbished",
            price: p.price,
            specs: {
              Kondisi: p.condition || GRADES[p.grade].label,
              Garansi: p.warranty || `${WARRANTY_MONTHS} Bulan ViciCare`,
              Konfigurasi: p.spec,
            },
          })}
          className={`inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-accent-cta px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-cta-hover ${focusRing}`}
        >
          Beli Unit Ini
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

  const laptop = product.kind === "Laptop";
  const groups = CHECK_DEFS.map((g) => ({
    group: g.group,
    items: g.items.map((it) => {
      const r = it.key ? product.checks[it.key] : null;
      return { label: laptop ? it.label : it.alt || it.label, status: r ? r[0] : "pass", detail: r ? r[1] : it.detail };
    }),
  }));
  const total = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/55" onClick={onClose}>
      <aside role="dialog" aria-modal="true" aria-label={`Ringkasan inspeksi ${product.name}`} onClick={(e) => e.stopPropagation()} className="flex h-full w-full max-w-md flex-col border-l border-default bg-surface">
        <div className="flex items-start justify-between gap-4 border-b border-default p-5">
          <div>
            <h2 className="font-serif text-xl font-semibold text-primary">Ringkasan Inspeksi 15-Titik</h2>
            <p className="text-sm text-secondary">{product.name}</p>
            <div className="mt-2"><GradeBadge grade={product.grade} /></div>
          </div>
          <button type="button" onClick={onClose} aria-label="Tutup ringkasan inspeksi" className={`inline-flex h-11 w-11 items-center justify-center rounded-lg border border-default bg-subtle text-primary hover:bg-canvas ${focusRing}`}>
            <X className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <div className="flex flex-wrap gap-2">
            <span className="vt-badge-live">
              <CheckCircle2 className="h-4 w-4 text-status-live" strokeWidth={1.75} aria-hidden="true" />
              <span>{total} dari {total} titik terverifikasi</span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-default bg-canvas px-2.5 py-1 text-xs font-medium text-primary">
              <ShieldCheck className="h-4 w-4 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
              <span>Garansi {WARRANTY_MONTHS} bulan</span>
            </span>
          </div>

          {groups.map((g) => (
            <section key={g.group}>
              <h3 className="mb-2 text-sm font-semibold text-primary">{g.group}</h3>
              <ul className="divide-y divide-default rounded-xl border border-default bg-canvas">
                {g.items.map((it) => (
                  <li key={it.label} className="flex gap-3 px-3 py-2.5">
                    {it.status === "serviced"
                      ? <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-accent-primary" aria-label="Diservis oleh teknisi ViciTech" />
                      : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-status-live" aria-label="Lolos inspeksi" />}
                    <div>
                      <p className="text-sm font-medium text-primary">{it.label}</p>
                      <p className="text-xs text-secondary">{it.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          <p className="text-xs text-secondary">
            <CheckCircle2 className="mr-1 inline h-3 w-3 text-status-live" aria-hidden="true" /> Lolos kondisi bawaan.
            <RefreshCw className="ml-3 mr-1 inline h-3 w-3 text-accent-primary" aria-hidden="true" /> Diservis ulang oleh teknisi ViciTech.
          </p>

          <div className="flex gap-3 rounded-xl border border-status-sample/30 bg-amber-50 p-3">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-status-sample" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-amber-900">Hal yang perlu diketahui sebelum membeli</p>
              <p className="mt-0.5 text-sm text-amber-900/90">{NOTES[product.grade]}</p>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

/* ───────────────────────── Page ───────────────────────── */

export default function CircularPortal() {
  const [form, setForm] = useState({ entity: "Sekolah / Lab CBT", equipment: "Laptop", condition: "Berfungsi Normal", qty: "25" });
  const [revealed, setRevealed] = useState(false);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState(false);
  const [submittedRef, setSubmittedRef] = useState("");
  const [tab, setTab] = useState("Semua");
  const [inspecting, setInspecting] = useState(null);

  const qty = clampQty(form.qty);
  const est = useMemo(() => estimate({ ...form, qty }), [form.entity, form.equipment, form.condition, qty]); // eslint-disable-line react-hooks/exhaustive-deps
  const nextBulk = form.entity !== "Individu" ? BULK.find((t) => qty < t.min) : null;

  const set = (key) => (value) => { setForm((f) => ({ ...f, [key]: value })); setSubmittedRef(""); };

  const submit = () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setEmailError(true);
    setEmailError(false);
    setSubmittedRef(`VT-TI-${Date.now().toString(36).toUpperCase().slice(-6)}`);
  };

  const downloadTemplate = () => {
    const csv = `Jenis Perangkat,Merek dan Model,Nomor Seri,Kondisi,Jumlah\r\n"${form.equipment}",,,"${form.condition}",${qty}\r\n`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "template-daftar-aset-vicitech.csv" });
    a.click();
    URL.revokeObjectURL(url);
  };

  const tabCounts = useMemo(() => Object.fromEntries(TABS.map((t) => [t, t === "Semua" ? RAW.length : RAW.filter((p) => p.kind === t).length])), []);
  const filtered = useMemo(() => RAW.filter((p) => tab === "Semua" || p.kind === tab), [tab]);
  const totals = useMemo(
    () => filtered.reduce((t, p) => ({ saved: t.saved + p.saved, kg: t.kg + p.kg, co2: t.co2 + p.co2 }), { saved: 0, kg: 0, co2: 0 }),
    [filtered]
  );
  const closeInspect = useMemo(() => () => setInspecting(null), []);

  return (
    <div className="bg-canvas text-primary antialiased">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="vt-badge-sample">Tarif Referensi</span>
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-cta">
            Perpanjang Siklus Pakai Perangkat Keras
          </span>
        </div>
        <h1 className="mt-3 flex items-center gap-3 font-serif text-3xl font-semibold tracking-tight text-primary sm:text-5xl">
          <Recycle className="h-8 w-8 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
          <span>Portal Trade-In Sirkular &amp; Refurbished</span>
        </h1>
        <p className="mt-3 max-w-2xl text-secondary">
          Tukar tambah perangkat lama Anda untuk mendapatkan estimasi nilai buyback yang transparan, atau pilih unit refurbished Grade A+ yang lolos inspeksi 15 titik.
        </p>

        {/* Form Trade-in */}
        <section className="mt-10" aria-labelledby="buyback-title">
          <h2 id="buyback-title" className="flex items-center gap-2 font-serif text-2xl font-semibold text-primary">
            <DollarSign className="h-5 w-5 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
            <span>Simulasi Valuasi &amp; Buyback Aset</span>
          </h2>
          <div className="mt-4 grid gap-6 lg:grid-cols-5">
            <div className="space-y-5 rounded-xl border border-default bg-surface p-6 shadow-sm lg:col-span-3">
              <fieldset>
                <legend className="mb-2 text-sm font-medium text-primary">Tipe Pengaju</legend>
                <div role="radiogroup" aria-label="Tipe pengaju" className="grid gap-2 sm:grid-cols-3">
                  {ENTITIES.map((e) => <Choice key={e.id} active={form.entity === e.id} icon={e.icon} title={e.id} onClick={() => set("entity")(e.id)} />)}
                </div>
              </fieldset>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="equipment" className="mb-2 block text-sm font-medium text-primary">Jenis Perangkat</label>
                  <select id="equipment" value={form.equipment} onChange={(e) => set("equipment")(e.target.value)} className={`min-h-11 w-full rounded-lg border border-default bg-canvas px-3 py-2.5 text-sm text-primary ${focusRing}`}>
                    {Object.keys(EQUIPMENT).map((k) => <option key={k}>{k}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="qty" className="mb-2 block text-sm font-medium text-primary">Jumlah Unit</label>
                  <input
                    id="qty" type="number" inputMode="numeric" min={1} max={MAX_QTY} value={form.qty}
                    onChange={(e) => set("qty")(e.target.value)}
                    onBlur={() => set("qty")(String(qty))}
                    className={`min-h-11 w-full rounded-lg border border-default bg-canvas px-3 py-2.5 font-mono text-sm tabular-nums text-primary ${focusRing}`}
                  />
                </div>
              </div>

              <fieldset>
                <legend className="mb-2 text-sm font-medium text-primary">Perkiraan Kondisi Unit</legend>
                <div role="radiogroup" aria-label="Perkiraan kondisi unit" className="grid gap-2 sm:grid-cols-3">
                  {Object.entries(CONDITIONS).map(([k, c]) => <Choice key={k} active={form.condition === k} title={k} hint={c.hint} onClick={() => set("condition")(k)} />)}
                </div>
              </fieldset>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button type="button" onClick={() => setRevealed(true)} className={`inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent-cta px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-accent-cta-hover ${focusRing}`}>
                  <DollarSign className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                  <span>Hitung Estimasi Valuasi</span>
                </button>
                <button type="button" onClick={downloadTemplate} className={`inline-flex min-h-11 items-center gap-2 rounded-lg border border-default bg-canvas px-4 py-2.5 text-sm font-medium text-primary hover:bg-subtle ${focusRing}`}>
                  <FileSpreadsheet className="h-4 w-4 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
                  <span>Unduh Template Daftar Aset (CSV)</span>
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-default bg-surface p-6 shadow-sm lg:col-span-2" aria-live="polite">
              {!revealed ? (
                <div className="flex h-full min-h-48 flex-col items-center justify-center text-center">
                  <DollarSign className="h-8 w-8 text-secondary" strokeWidth={1.75} aria-hidden="true" />
                  <p className="mt-3 text-sm font-medium text-primary">Estimasi nilai tampil di sini.</p>
                  <p className="mt-1 text-sm text-secondary">Isi formulir di samping lalu klik Hitung Estimasi Valuasi.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <span className="vt-badge-sample">Estimasi Tarif Referensi</span>
                    <p className="mt-2 text-sm text-secondary">Perkiraan nilai buyback untuk {qty} unit</p>
                    <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-status-live">
                      {idr(est.low)} – {idr(est.high)}
                    </p>
                  </div>
                  <dl className="divide-y divide-default rounded-lg border border-default bg-canvas text-sm">
                    <div className="flex justify-between gap-3 px-3 py-2">
                      <dt className="text-secondary">Nilai per unit</dt>
                      <dd className="text-right font-mono tabular-nums text-primary">{idr(est.lowUnit)} – {idr(est.highUnit)}</dd>
                    </div>
                    <div className="flex justify-between gap-3 px-3 py-2">
                      <dt className="text-secondary">Bonus jumlah besar</dt>
                      <dd className="font-mono tabular-nums text-primary">{est.bonus ? `+${est.bonus}%` : "Tidak ada"}</dd>
                    </div>
                    <div className="flex justify-between gap-3 px-3 py-2">
                      <dt className="flex items-center gap-1.5 text-secondary">
                        <Leaf className="h-3.5 w-3.5 text-status-live" aria-hidden="true" />
                        <span>Limbah elektronik tercegah</span>
                      </dt>
                      <dd className="font-mono tabular-nums text-primary">{num(est.kg)} kg</dd>
                    </div>
                  </dl>
                  {nextBulk && (
                    <p className="text-xs text-secondary">
                      Tambah {nextBulk.min - qty} unit lagi untuk mendapatkan bonus grosir +{nextBulk.pct}%.
                    </p>
                  )}
                  {form.entity === "Individu" && (
                    <p className="text-xs text-secondary">Bonus jumlah besar berlaku untuk pengajuan kantor dan sekolah.</p>
                  )}

                  <p className="flex gap-2 rounded-lg border border-status-sample/30 bg-amber-50 p-3 text-xs text-amber-900">
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-status-sample" aria-hidden="true" />
                    <span>Tarif bersifat estimasi referensi. Nilai final dikonfirmasi setelah inspeksi fisik di Hub ViciTech atau mitra terdekat.</span>
                  </p>

                  {submittedRef ? (
                    <p role="status" className="flex gap-2 rounded-lg border border-status-live/30 bg-emerald-50 p-3 text-sm text-emerald-800">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-status-live" aria-hidden="true" />
                      <span>Pengajuan {submittedRef} dicatat. Penawaran resmi akan dikirim ke {email.trim()}.</span>
                    </p>
                  ) : (
                    <div>
                      <label htmlFor="email" className="mb-2 block text-sm font-medium text-primary">Email Kontak</label>
                      <div className="flex gap-2">
                        <input
                          id="email" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setEmailError(false); }}
                          aria-invalid={emailError} placeholder="nama@instansi.id"
                          className={`min-h-11 min-w-0 flex-1 rounded-lg border bg-canvas px-3 py-2.5 text-sm text-primary placeholder:text-secondary ${focusRing} ${emailError ? "border-status-danger" : "border-default"}`}
                        />
                        <button type="button" onClick={submit} className={`min-h-11 shrink-0 rounded-lg bg-accent-cta px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-cta-hover ${focusRing}`}>
                          Ajukan Valuasi
                        </button>
                      </div>
                      {emailError && <p className="mt-1.5 text-xs text-status-danger">Masukkan alamat email yang valid untuk menerima penawaran resmi.</p>}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Galeri Refurbished */}
        <section className="mt-14" aria-labelledby="gallery-title">
          <h2 id="gallery-title" className="flex items-center gap-2 font-serif text-2xl font-semibold text-primary">
            <RefreshCw className="h-5 w-5 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
            <span>Etalase Unit Refurbished Tersertifikasi</span>
          </h2>
          <p className="mt-1 text-sm text-secondary">
            Setiap unit melewati protokol inspeksi 15 titik dan dilengkapi garansi {WARRANTY_MONTHS} bulan.
          </p>

          <div role="tablist" aria-label="Filter kategori refurbished" className="mt-5 flex flex-wrap gap-2">
            {TABS.map((t) => (
              <button
                key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
                className={`min-h-11 rounded-full border px-4 py-2 text-sm transition-colors ${focusRing} ${
                  tab === t
                    ? "border-accent-primary bg-accent-cta font-semibold text-white"
                    : "border-default bg-surface text-secondary hover:bg-subtle hover:text-primary"
                }`}
              >
                {t} <span className="ml-1 font-mono text-xs opacity-80">{tabCounts[t]}</span>
              </button>
            ))}
          </div>

          <p className="mt-4 flex flex-wrap items-center gap-x-1.5 gap-y-1 rounded-xl border border-default bg-surface px-5 py-4 text-sm text-secondary shadow-sm">
            <Leaf className="h-4 w-4 text-status-live" aria-hidden="true" />
            Memilih unit refurbished pada kategori ini menghemat hingga <b className="font-mono font-semibold tabular-nums text-status-live">{idr(totals.saved)}</b>,
            memperpanjang masa pakai <b className="font-mono font-semibold tabular-nums text-primary">{num(totals.kg)} kg</b> perangkat keras, dan mencegah{" "}
            <b className="font-mono font-semibold tabular-nums text-primary">{num(totals.co2)} kg</b> emisi CO₂.
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
