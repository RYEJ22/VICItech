import { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  Smartphone, Laptop, Monitor, Headphones, Cpu, Search, SlidersHorizontal, ArrowRightLeft,
  CheckCircle2, ShieldCheck, Zap, Plus, FileText, Check, X,
} from "lucide-react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { listHardwareComponents } from "@/lib/hardware/components";

/* ───────────────────────── Category config ───────────────────────── */

const MAX_COMPARE = 4;
const ITEMS_PER_PAGE = 24;
const num = (n) => new Intl.NumberFormat("id-ID").format(n);
const idr = (n) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
const grade = (v) => (v >= 95 ? "A+" : v >= 90 ? "A" : v >= 80 ? "B" : "C");

// specs: { key, label, short?, fmt?, better? }. `better` marks a numeric spec that can be ranked in comparisons.
const CATS = {
  phones: {
    label: "Smartphone & Perangkat Mobile", short: "Smartphone", icon: Smartphone, typeLabel: "Segmen",
    focus: "Chipset, refresh rate, kamera, baterai, pengisian daya",
    specs: [
      { key: "chipset", label: "Chipset" },
      { key: "refresh", label: "Refresh Rate Layar", short: "Refresh rate", fmt: (v) => `${v} Hz`, better: "high" },
      { key: "camera", label: "Konfigurasi Kamera" },
      { key: "battery", label: "Kapasitas Baterai", fmt: (v) => `${num(v)} mAh`, better: "high" },
      { key: "charging", label: "Daya Pengisian", short: "Pengisian", fmt: (v) => `${v} W`, better: "high" },
      { key: "perf", label: "Indeks Performa", fmt: (v) => `${v} / 100`, better: "high" },
    ],
    card: ["chipset", "refresh", "battery", "charging"],
  },
  laptops: {
    label: "Laptop & Workstation Mobile", short: "Laptop", icon: Laptop, typeLabel: "Segmen",
    focus: "CPU, GPU, ekspansi RAM, layar, bobot, kesehatan baterai",
    specs: [
      { key: "cpu", label: "CPU" },
      { key: "gpu", label: "GPU" },
      { key: "ramMax", label: "Ekspansi RAM", fmt: (v) => `Hingga ${v} GB`, better: "high" },
      { key: "display", label: "Resolusi Layar / Akurasi Warna", short: "Layar" },
      { key: "weight", label: "Bobot", fmt: (v) => `${v} kg`, better: "low" },
      { key: "health", label: "Kesehatan Baterai", short: "Baterai", fmt: (v) => `${grade(v)} (${v}%)`, better: "high" },
      { key: "perf", label: "Indeks Performa", fmt: (v) => `${v} / 100`, better: "high" },
    ],
    card: ["cpu", "gpu", "weight", "health"],
  },
  pc: {
    label: "PC Desktop & Komponen", short: "PC & Komponen", icon: Monitor, typeLabel: "Komponen",
    focus: "Form factor, TDP, socket, benchmark, VRAM & core",
    specs: [
      { key: "formFactor", label: "Form Factor" },
      { key: "tdp", label: "Daya TDP", short: "TDP", fmt: (v) => `${v} W`, better: "low" },
      { key: "socket", label: "Tipe Socket", short: "Socket" },
      { key: "perf", label: "Skor Benchmark", short: "Benchmark", fmt: (v) => `${v} / 100`, better: "high" },
      { key: "cores", label: "VRAM / Core", short: "VRAM / Core" },
    ],
    card: ["socket", "tdp", "perf", "cores"],
  },
  peripherals: {
    label: "Periferal & Aksesori IT", short: "Periferal", icon: Headphones, typeLabel: "Jenis perangkat",
    focus: "Konektivitas, DPI/switch, kompatibilitas, daya, garansi",
    specs: [
      { key: "connectivity", label: "Konektivitas", short: "Konektivitas" },
      { key: "switchType", label: "DPI / Tipe Switch", short: "DPI / Switch" },
      { key: "compat", label: "Kompatibilitas" },
      { key: "power", label: "Daya & Baterai", short: "Daya" },
      { key: "warranty", label: "Garansi", fmt: (v) => `${v} bulan`, better: "high" },
    ],
    card: ["connectivity", "switchType", "power", "warranty"],
  },
};
const CAT_ORDER = ["phones", "laptops", "pc", "peripherals"];
const COND_LABEL = { new: "Baru", refurb: "Recertified A+", used: "Bekas" };

/* ───────────────────────── Sample catalog ───────────────────────── */

const phone = (id, brand, name, type, cond, price, delta, chipset, refresh, camera, battery, charging, perf) =>
  ({ id, cat: "phones", brand, name, type, cond, price, delta, specs: { chipset, refresh, camera, battery, charging, perf } });
const laptop = (id, brand, name, type, cond, price, delta, cpu, gpu, ramMax, display, weight, health, perf) =>
  ({ id, cat: "laptops", brand, name, type, cond, price, delta, specs: { cpu, gpu, ramMax, display, weight, health, perf } });
const pcPart = (id, brand, name, type, cond, price, delta, formFactor, tdp, socket, perf, cores) =>
  ({ id, cat: "pc", brand, name, type, cond, price, delta, specs: { formFactor, tdp, socket, perf, cores } });
const periph = (id, brand, name, type, cond, price, delta, connectivity, switchType, compat, power, warranty) =>
  ({ id, cat: "peripherals", brand, name, type, cond, price, delta, specs: { connectivity, switchType, compat, power, warranty } });

const PRODUCTS = [
  phone("s24u", "Samsung", "Galaxy S24 Ultra 12/256 GB", "Flagship", "new", 19500000, -1.8, "Snapdragon 8 Gen 3 for Galaxy", 120, "200 MP main, 50 MP 5× tele, 12 MP ultrawide, 10 MP 3× tele", 5000, 45, 96),
  phone("ip15p", "Apple", "iPhone 15 Pro 256 GB", "Flagship", "new", 18500000, -1.2, "Apple A17 Pro", 120, "48 MP main, 12 MP 3× tele, 12 MP ultrawide", 3274, 27, 95),
  phone("x14tp", "Xiaomi", "Xiaomi 14T Pro 12/256 GB", "Flagship", "new", 9500000, -2.4, "Dimensity 9300+", 144, "50 MP main, 50 MP 2.6× tele, 12 MP ultrawide", 5000, 120, 88),
  phone("a55", "Samsung", "Galaxy A55 5G 8/256 GB", "Mid-range", "new", 6500000, -0.9, "Exynos 1480", 120, "50 MP main, 12 MP ultrawide, 5 MP macro", 5000, 25, 52),
  phone("rn13", "Xiaomi", "Redmi Note 13 Pro+ 12/512 GB", "Mid-range", "new", 5200000, -1.6, "Dimensity 7200 Ultra", 120, "200 MP main, 8 MP ultrawide, 2 MP macro", 5000, 120, 56),
  phone("ip13", "Apple", "iPhone 13 128 GB", "Flagship", "refurb", 7200000, -3.1, "Apple A15 Bionic", 60, "12 MP main, 12 MP ultrawide", 3240, 20, 62),

  laptop("t14", "Lenovo", "ThinkPad T14 Gen 4 (16 GB / 512 GB)", "Business", "refurb", 9800000, -1.9, "Ryzen 7 PRO 7840U", "Radeon 780M (integrated)", 64, '14" 1920×1200, 100% sRGB', 1.4, 96, 62),
  laptop("lat7440", "Dell", "Latitude 7440 (16 GB / 512 GB)", "Business", "new", 22400000, 0.4, "Core i7-1365U", "Intel Iris Xe (integrated)", 64, '14" 1920×1200, 100% sRGB', 1.36, 100, 58),
  laptop("elite840", "HP", "EliteBook 840 G9 (16 GB / 512 GB)", "Business", "refurb", 8200000, -2.2, "Core i5-1245U", "Intel Iris Xe (integrated)", 64, '14" 1920×1200, 100% sRGB', 1.4, 94, 52),
  laptop("g14", "ASUS", "ROG Zephyrus G14 (32 GB / 1 TB)", "Gaming", "new", 33500000, -0.7, "Ryzen 9 8945HS", "RTX 4070 8 GB", 32, '14" 2880×1800 OLED, 100% DCI-P3', 1.5, 100, 84),
  laptop("legion5", "Lenovo", "Legion Pro 5 (32 GB / 1 TB)", "Gaming", "new", 29900000, -1.1, "Core i7-14700HX", "RTX 4060 8 GB", 64, '16" 2560×1600 165 Hz, 100% sRGB', 2.5, 100, 80),
  laptop("prec5570", "Dell", "Precision 5570 (32 GB / 1 TB)", "Workstation", "refurb", 25000000, -2.6, "Core i7-12800H", "RTX A1000 4 GB", 64, '15.6" 3840×2400, 100% Adobe RGB', 1.84, 92, 70),

  pcPart("r9-7950x", "AMD", "Ryzen 9 7950X", "CPU", "new", 8200000, -1.5, "Boxed CPU", 170, "AM5", 92, "16C / 32T"),
  pcPart("i5-13600k", "Intel", "Core i5-13600K", "CPU", "new", 4600000, -2.7, "Boxed CPU", 125, "LGA1700", 76, "14C / 20T"),
  pcPart("rtx4070s", "NVIDIA", "GeForce RTX 4070 Super", "GPU", "new", 10900000, -0.8, "Dual-fan, 2.5-slot", 220, "PCIe 4.0 x16", 74, "12 GB GDDR6X VRAM"),
  pcPart("rtx3080", "NVIDIA", "GeForce RTX 3080 10GB", "GPU", "refurb", 5600000, -3.4, "Triple-fan, 2.7-slot", 320, "PCIe 4.0 x16", 66, "10 GB GDDR6X VRAM"),
  pcPart("optiplex7090", "Dell", "OptiPlex 7090 SFF", "Desktop", "refurb", 6300000, -1.1, "Small form factor", 65, "LGA1200", 55, "8C / 16T"),
  pcPart("elitedesk800", "HP", "EliteDesk 800 G6 Mini", "Desktop", "refurb", 4900000, -0.5, "Mini PC", 35, "LGA1200", 40, "6C / 12T"),

  periph("mx3s", "Logitech", "MX Master 3S", "Mouse", "new", 1650000, -0.5, "Bluetooth and Logi Bolt", "8,000 DPI, quiet optical switches", "Windows, macOS, Linux, iPadOS", "USB-C, hingga 70 hari", 24),
  periph("k8pro", "Keychron", "K8 Pro Wireless Keyboard", "Keyboard", "new", 1850000, 0.3, "Bluetooth 5.1 & USB-C", "Gateron G Pro Brown, hot-swappable", "Windows, macOS, Linux", "Pengisian USB-C 5 V", 12),
  periph("dav3", "Razer", "DeathAdder V3", "Mouse", "new", 1350000, -1.4, "Kabel USB-C", "30,000 DPI, optical switches", "Windows, macOS", "Daya USB langsung", 24),
  periph("xm5", "Sony", "WH-1000XM5 Headset", "Headset", "new", 5400000, -2.0, "Bluetooth 5.2 & 3.5 mm", "Driver 30 mm, Active Noise Canceling", "Windows, macOS, Android, iOS", "USB-C, hingga 30 jam putar", 12),
  periph("ups1100", "APC", "Back-UPS 1100VA", "UPS", "new", 2100000, 0.2, "Port data USB", "Tidak berlaku", "PC, router, monitor", "Output 660 W, 6 soket", 24),
  periph("wd19s", "Dell", "WD19S Docking Station", "Dock", "refurb", 2700000, -2.8, "USB-C ke HDMI, DisplayPort, RJ45", "Tidak berlaku", "Dell Latitude & laptop USB-C", "Power delivery 130 W", 12),
].map((p) => ({
  ...p,
  hay: `${p.brand} ${p.name} ${p.type} ${COND_LABEL[p.cond]} ${CATS[p.cat].short} ${Object.values(p.specs).join(" ")}`.toLowerCase(),
}));

const STEP = 500000;
const BOUNDS = Object.fromEntries(CAT_ORDER.map((k) => {
  const prices = PRODUCTS.filter((p) => p.cat === k).map((p) => p.price);
  return [k, { min: Math.floor(Math.min(...prices) / STEP) * STEP, max: Math.ceil(Math.max(...prices) / STEP) * STEP }];
}));

/* ───────────────────────── Helpers ───────────────────────── */

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60";
const specLabel = (s) => s.short || s.label;
const specValue = (p, s) => (s.fmt ? s.fmt(p.specs[s.key]) : p.specs[s.key]);
const iconOf = (p) => (p.cat === "pc" && p.type !== "Desktop" ? Cpu : CATS[p.cat].icon);
const perfPerMillion = (p) => p.specs.perf / (p.price / 1e6);
const newFilters = () => Object.fromEntries(CAT_ORDER.map((k) => [k, { cond: "all", brand: "all", type: "all", max: BOUNDS[k].max }]));

function Overlay({ label, onClose, wide = false, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    const prev = document.body.style.overflow;
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 md:items-stretch md:justify-end" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onClick={(e) => e.stopPropagation()}
        className={`flex max-h-[88svh] w-full flex-col rounded-t-2xl border-t border-default bg-surface pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl md:h-full md:max-h-full md:rounded-none md:border-l md:border-t-0 md:pb-0 ${wide ? "md:max-w-3xl" : "md:max-w-md"}`}
      >
        <div className="flex justify-center pt-3 pb-1 md:hidden" aria-hidden="true">
          <span className="h-1 w-10 rounded-full bg-default" />
        </div>
        {children}
      </div>
    </div>
  );
}

function OverlayHeader({ title, subtitle, onClose }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-default px-5 pb-4 pt-3 md:p-5">
      <div className="min-w-0">
        <h2 className="tracking-tight font-sans text-lg font-bold text-primary">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-secondary">{subtitle}</p>}
      </div>
      <button type="button" onClick={onClose} aria-label="Tutup panel" className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-default bg-subtle text-primary hover:bg-canvas ${focusRing}`}>
        <X className="h-5 w-5" strokeWidth={1.75} />
      </button>
    </div>
  );
}

function CondBadge({ cond }) {
  if (cond === "used") {
    return <span className="inline-flex items-center gap-1 rounded-md border border-default bg-canvas px-2 py-0.5 text-xs font-medium text-secondary">Bekas</span>;
  }
  return cond === "refurb" ? (
    <span className="inline-flex items-center gap-1 rounded-md border border-status-live/30 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800"><ShieldCheck className="h-3 w-3" /> Recertified A+</span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-md border border-default bg-canvas px-2 py-0.5 text-xs font-medium text-primary">Baru</span>
  );
}

const Delta = ({ d }) => <span className="text-xs tabular-nums text-secondary">{d > 0 ? "+" : ""}{d.toFixed(1)}% dlm 7 hari</span>;

/* ───────────────────────── Product card ───────────────────────── */

const ProductCard = memo(function ProductCard({ p, inCompare, compareFull, inBuilder, onCompare, onSheet, onBuilder, onUpgrade }) {
  const cfg = CATS[p.cat];
  const Icon = iconOf(p);
  const blocked = compareFull && !inCompare;
  const secondary = `inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg border border-default bg-surface px-2.5 py-2 text-xs font-medium text-primary transition-colors hover:bg-subtle ${focusRing}`;
  return (
    <article
      className={`vt-card-lift relative flex flex-col justify-between rounded-xl border bg-surface p-5 shadow-sm ${
        inCompare ? "border-accent-primary ring-1 ring-accent-primary/25" : "border-default hover:border-accent-primary/40"
      }`}
    >
      <div>
        <div className="grid h-24 place-items-center rounded-lg border border-default bg-canvas text-primary" aria-hidden="true">
          <Icon className="h-9 w-9" strokeWidth={1.6} />
        </div>
        <div className="mt-3.5 flex flex-wrap items-center gap-2">
          <span className="rounded-md border border-default bg-canvas px-2 py-0.5 text-xs font-medium text-secondary">{p.brand}</span>
          <CondBadge cond={p.cond} />
          <span className="ml-auto text-xs text-secondary">{p.type}</span>
        </div>
        <h3 className="tracking-tight mt-2.5 text-base font-bold leading-snug text-primary">{p.name}</h3>
        <div className="mt-2">
          <p className="flex items-center gap-1 text-xs text-secondary"><Zap className="h-3 w-3 text-accent-primary" /> Indeks harga referensi</p>
          <p className="font-mono text-xl font-semibold tabular-nums text-primary">{idr(p.price)}</p>
          <Delta d={p.delta} />
        </div>
        <dl className="mt-3.5 grid grid-cols-2 gap-2">
          {cfg.card.map((key) => {
            const s = cfg.specs.find((x) => x.key === key);
            return (
              <div key={key} className="rounded-lg border border-default bg-canvas p-2.5">
                <dt className="text-[11px] text-secondary">{specLabel(s)}</dt>
                <dd className="mt-0.5 text-xs font-medium leading-snug text-primary">{specValue(p, s)}</dd>
              </div>
            );
          })}
        </dl>
      </div>
      <div className="mt-5 space-y-2 pt-2">
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => onSheet(p.id)} className={secondary}>
            <FileText className="h-3.5 w-3.5 text-secondary" />
            <span>Lihat Datasheet</span>
          </button>
          <button
            type="button"
            aria-pressed={inBuilder}
            onClick={() => onBuilder(p.id)}
            className={`${secondary} ${inBuilder ? "border-accent-primary/40 bg-accent-subtle text-accent-hover font-semibold" : ""}`}
          >
            {inBuilder ? <CheckCircle2 className="h-3.5 w-3.5 text-accent-primary" /> : <Plus className="h-3.5 w-3.5" />}
            <span>{inBuilder ? "Di Preset Builder" : "+ ke Preset Builder"}</span>
          </button>
        </div>
        <button
          type="button"
          aria-pressed={inCompare}
          disabled={blocked}
          onClick={() => onCompare(p)}
          title={blocked ? `Bandingkan hingga ${MAX_COMPARE} unit` : undefined}
          className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${focusRing} ${
            inCompare
              ? "bg-accent-cta font-semibold text-white hover:bg-accent-cta-hover"
              : blocked
                ? "cursor-not-allowed bg-subtle text-secondary"
                : "border border-default bg-surface text-primary hover:bg-subtle"
          }`}
        >
          {inCompare ? <CheckCircle2 className="h-4 w-4" /> : <ArrowRightLeft className="h-4 w-4" />}
          <span>{inCompare ? "Dalam Perbandingan" : "Bandingkan"}</span>
        </button>
        {onUpgrade && (p.cat === "laptops" || (p.cat === "pc" && p.type === "Desktop")) && (
          <button type="button" onClick={() => onUpgrade(p.id)} className={`${secondary} w-full`}>
            <Zap className="h-3.5 w-3.5 text-accent-primary" />
            <span>Cek Potensi Upgrade</span>
          </button>
        )}
      </div>
    </article>
  );
});

/* ───────────────────────── Overlays ───────────────────────── */

function Datasheet({ p, inCompare, compareFull, inBuilder, onCompare, onBuilder, onClose }) {
  const cfg = CATS[p.cat];
  const hasPerf = "perf" in p.specs;
  return (
    <Overlay label={`Datasheet untuk ${p.name}`} onClose={onClose}>
      <OverlayHeader title="Datasheet Lengkap" subtitle={p.name} onClose={onClose} />
      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md border border-default px-2 py-0.5 text-xs text-primary">{p.brand}</span>
          <CondBadge cond={p.cond} />
          <span className="text-xs text-secondary">{cfg.short}, {p.type}</span>
        </div>
        <div>
          <p className="text-xs text-secondary">Indeks harga referensi</p>
          <p className="font-mono text-2xl font-semibold tabular-nums text-primary">{idr(p.price)}</p>
          <Delta d={p.delta} />
        </div>
        <section>
          <h3 className="tracking-tight mb-2 text-sm font-bold text-primary">Semua Spesifikasi</h3>
          <dl className="divide-y divide-default rounded-xl border border-default">
            {cfg.specs.map((s) => (
              <div key={s.key} className="grid grid-cols-5 gap-3 px-3 py-2.5 text-sm">
                <dt className="col-span-2 text-secondary">{s.label}</dt>
                <dd className="col-span-3 text-primary">{specValue(p, s)}</dd>
              </div>
            ))}
            {hasPerf && (
              <div className="grid grid-cols-5 gap-3 px-3 py-2.5 text-sm">
                <dt className="col-span-2 text-secondary">Performa per Rp 1 juta</dt>
                <dd className="col-span-3 font-mono tabular-nums text-status-live">{perfPerMillion(p).toFixed(1)}</dd>
              </div>
            )}
          </dl>
        </section>
        <p className="flex gap-2 rounded-lg border border-default bg-canvas p-3 text-sm text-secondary">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-status-live" />
          {p.cond === "refurb"
            ? "Unit recertified lulus 15 titik inspeksi IoT QC dan disertai garansi ViciTech 12 bulan."
            : p.cond === "used"
              ? "Komponen bekas pakai; periksa daftar spesifikasi dan kondisi sebelum membeli."
              : "Unit baru tersegel dengan garansi resmi pabrikan."}
        </p>
      </div>
      <div className="grid gap-2 border-t border-default p-5 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onCompare(p)}
          disabled={compareFull && !inCompare}
          className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40 ${focusRing} ${
            inCompare ? "bg-accent-cta font-semibold text-white hover:bg-accent-cta-hover" : "border border-default bg-surface text-primary hover:bg-subtle"
          }`}
        >
          {inCompare ? <CheckCircle2 className="h-4 w-4" /> : <ArrowRightLeft className="h-4 w-4" />}
          <span>{inCompare ? "Dalam Perbandingan" : "Tambah ke Perbandingan"}</span>
        </button>
        <button
          type="button"
          onClick={() => onBuilder(p.id)}
          className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium ${focusRing} ${
            inBuilder ? "border border-accent-primary/40 bg-accent-subtle font-semibold text-primary" : "border border-default bg-surface text-primary hover:bg-subtle"
          }`}
        >
          {inBuilder ? <CheckCircle2 className="h-4 w-4 text-accent-primary" /> : <Plus className="h-4 w-4" />}
          <span>{inBuilder ? "Di Preset Builder" : "Tambah ke Preset Builder"}</span>
        </button>
      </div>
    </Overlay>
  );
}

function CompareModal({ items, cat, diffOnly, setDiffOnly, onRemove, onClear, onClose }) {
  const cfg = CATS[cat];
  const hasPerf = cfg.specs.some((s) => s.key === "perf");
  const rows = useMemo(() => {
    const defs = [
      { key: "price", label: "Harga referensi", get: (p) => p.price, show: idr, better: "low" },
      ...cfg.specs.map((s) => ({ key: s.key, label: s.label, get: (p) => p.specs[s.key], show: (v) => (s.fmt ? s.fmt(v) : v), better: s.better })),
      ...(hasPerf ? [{ key: "value", label: "Performa per Rp 1 juta", get: perfPerMillion, show: (v) => v.toFixed(1), better: "high" }] : []),
    ];
    return defs.map((d) => {
      const vals = items.map(d.get);
      const same = vals.every((v) => v === vals[0]);
      const best = d.better && !same ? (d.better === "high" ? Math.max(...vals) : Math.min(...vals)) : null;
      return { ...d, vals, same, best };
    });
  }, [items, cfg, hasPerf]);

  const pick = (fn, dir = 1) => [...items].sort((a, b) => dir * (fn(a) - fn(b)))[0];
  const highlights = [
    ["Harga terendah", pick((p) => p.price)],
    ...(hasPerf ? [["Performa tertinggi", pick((p) => p.specs.perf, -1)], ["Nilai terbaik", pick(perfPerMillion, -1)]] : [["Garansi terpanjang", pick((p) => p.specs.warranty, -1)]]),
  ];
  const shown = diffOnly ? rows.filter((r) => !r.same) : rows;

  return (
    <Overlay label="Perbandingan spesifikasi berdampingan" onClose={onClose} wide>
      <OverlayHeader title={`Bandingkan ${cfg.short}`} subtitle="Nilai spesifikasi terbaik ditandai pada setiap baris." onClose={onClose} />
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-default px-5 py-3 text-sm">
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-secondary">
          {highlights.map(([k, p]) => <p key={k}>{k}: <span className="font-medium text-primary">{p.name}</span></p>)}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-primary">
            <input type="checkbox" checked={diffOnly} onChange={(e) => setDiffOnly(e.target.checked)} className="h-4 w-4 accent-accent-primary" />
            <span>Tampilkan perbedaan saja</span>
          </label>
          {onClear && (
            <button type="button" onClick={onClear} className={`min-h-11 rounded-lg border border-default bg-subtle px-3 py-1.5 text-xs font-medium text-primary hover:bg-canvas ${focusRing}`}>
              Hapus semua
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full min-w-[600px] border-collapse text-sm">
          <thead>
            <tr>
              <th className="w-40 p-3 sm:pl-5" />
              {items.map((p) => (
                <th key={p.id} className="p-3 text-left align-top font-normal">
                  <div className="flex items-start justify-between gap-2">
                    <div><p className="font-semibold text-primary">{p.name}</p><p className="mt-1"><CondBadge cond={p.cond} /></p></div>
                    <button type="button" aria-label={`Hapus ${p.name}`} onClick={() => onRemove(p)} className={`inline-flex h-11 w-11 items-center justify-center rounded-lg text-secondary hover:bg-subtle hover:text-primary ${focusRing}`}><X className="h-4 w-4" /></button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 && <tr><td colSpan={items.length + 1} className="p-6 text-center text-secondary">Perangkat yang dipilih memiliki spesifikasi identik.</td></tr>}
            {shown.map((r) => (
              <tr key={r.key} className="border-t border-default">
                <th scope="row" className="p-3 text-left font-normal text-secondary sm:pl-5">{r.label}</th>
                {items.map((p, i) => {
                  const win = r.best !== null && r.vals[i] === r.best;
                  return (
                    <td key={p.id} className={`p-3 align-top tabular-nums ${win ? "bg-accent-subtle font-semibold text-primary" : r.same ? "text-secondary" : "text-primary"}`}>
                      <span className="inline-flex items-start gap-1.5">{win && <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent-primary" aria-label="Unggul pada baris ini" />}{r.show(r.vals[i])}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Overlay>
  );
}

function BuilderList({ items, onRemove, onClear, onClose, onOpenBuilder }) {
  const [copied, setCopied] = useState("");
  const total = items.reduce((s, p) => s + p.price, 0);
  const copy = async () => {
    const text = `${items.map((p) => `${p.name} (${p.brand}): ${idr(p.price)}`).join("\n")}\nTotal: ${idr(total)}`;
    try { await navigator.clipboard.writeText(text); setCopied("Daftar disalin ke papan klip."); } catch { setCopied("Fitur salin tidak tersedia di browser ini."); }
  };
  return (
    <Overlay label="Daftar Preset Builder" onClose={onClose}>
      <OverlayHeader title="Daftar Preset Builder" subtitle="Item yang akan dimasukkan ke preset atau pesanan massal" onClose={onClose} />
      <div className="flex-1 overflow-y-auto p-5">
        {items.length === 0 ? <p className="text-sm text-secondary">Belum ada komponen dipilih. Klik Ke Builder pada kartu mana pun.</p> : (
          <ul className="divide-y divide-default rounded-xl border border-default">
            {items.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-3 py-2.5">
                <div className="min-w-0 flex-1"><p className="truncate text-sm text-primary">{p.name}</p><p className="text-xs text-secondary">{CATS[p.cat].short}, {p.brand}</p></div>
                <span className="font-mono text-sm tabular-nums text-primary">{idr(p.price)}</span>
                <button type="button" aria-label={`Hapus ${p.name}`} onClick={() => onRemove(p.id)} className={`inline-flex h-11 w-11 items-center justify-center rounded-lg text-secondary hover:bg-subtle hover:text-primary ${focusRing}`}><X className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="space-y-2 border-t border-default p-5">
        <p className="flex justify-between text-base font-semibold"><span className="text-secondary">Total</span><span className="font-mono tabular-nums text-primary">{idr(total)}</span></p>
        {copied && <p role="status" className="text-xs text-status-live">{copied}</p>}
        {onOpenBuilder && <button type="button" disabled={!items.length} onClick={() => onOpenBuilder(items)} className={`min-h-11 w-full rounded-lg bg-accent-cta px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-cta-hover disabled:opacity-40 ${focusRing}`}>Buka Preset Builder</button>}
        <div className="flex gap-2">
          <button type="button" disabled={!items.length} onClick={copy} className={`vt-motion-press min-h-11 flex-1 rounded-lg border border-default bg-subtle px-4 py-2.5 text-sm font-medium text-primary hover:bg-canvas disabled:opacity-40 ${focusRing}`}>
            {copied.startsWith("Daftar disalin") ? <><Check className="vt-motion-pop h-4 w-4" aria-hidden="true" /> Tersalin</> : "Salin daftar"}
          </button>
          <button type="button" disabled={!items.length} onClick={onClear} className={`min-h-11 flex-1 rounded-lg border border-default px-4 py-2.5 text-sm text-secondary hover:bg-subtle hover:text-primary disabled:opacity-40 ${focusRing}`}>Hapus semua</button>
        </div>
      </div>
    </Overlay>
  );
}

function FilterControls({ cfg, f, options, bounds, setFilter, fieldClass }) {
  return (
    <>
      <div>
        <p className="mb-1.5 text-sm font-medium text-primary">Kondisi</p>
        <div role="radiogroup" aria-label="Kondisi" className="grid grid-cols-4 gap-1 rounded-xl border border-default bg-subtle p-1">
          {[["all", "Semua"], ["new", "Baru"], ["refurb", "Refurb A+"], ["used", "Bekas"]].map(([v, label]) => (
            <button key={v} type="button" role="radio" aria-checked={f.cond === v} onClick={() => setFilter("cond", v)} className={`min-h-11 rounded-lg px-1 py-1.5 text-xs font-medium transition-colors ${focusRing} ${f.cond === v ? "bg-accent-cta font-semibold text-white shadow-sm" : "text-secondary hover:text-primary"}`}>{label}</button>
          ))}
        </div>
      </div>
      <div>
        <label htmlFor={`f-brand-${cfg.short}`} className="mb-1.5 block text-sm font-medium text-primary">Merek</label>
        <select id={`f-brand-${cfg.short}`} value={f.brand} onChange={(e) => setFilter("brand", e.target.value)} className={`${fieldClass} min-h-11`}>
          <option value="all">Semua merek</option>{options.brands.map((b) => <option key={b}>{b}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor={`f-type-${cfg.short}`} className="mb-1.5 block text-sm font-medium text-primary">{cfg.typeLabel}</label>
        <select id={`f-type-${cfg.short}`} value={f.type} onChange={(e) => setFilter("type", e.target.value)} className={`${fieldClass} min-h-11`}>
          <option value="all">Semua</option>{options.types.map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor={`f-price-${cfg.short}`} className="mb-1.5 flex justify-between text-sm font-medium text-primary"><span>Harga maksimal</span><span className="font-mono tabular-nums text-accent-hover">{idr(f.max)}</span></label>
        <input id={`f-price-${cfg.short}`} type="range" min={bounds.min} max={bounds.max} step={STEP} value={Math.min(f.max, bounds.max)} onChange={(e) => setFilter("max", Number(e.target.value))} className="mt-2 h-8 w-full accent-accent-primary" />
      </div>
    </>
  );
}

/* ───────────────────────── Page ───────────────────────── */

export default function HardwareLibrary({ onOpenBuilder, onCheckUpgrade }) {
  const [inventoryProducts, setInventoryProducts] = useState([]);
  const [inventoryError, setInventoryError] = useState("");
  const [cat, setCat] = useState("phones");
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 250);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState(newFilters);
  const [compare, setCompare] = useState({ phones: [], laptops: [], pc: [], peripherals: [] });
  const [builder, setBuilder] = useState([]);
  const [sheetId, setSheetId] = useState(null);
  const [panel, setPanel] = useState(null); // "compare" | "builder" | null
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [diffOnly, setDiffOnly] = useState(false);

  useEffect(() => {
    let active = true;
    listHardwareComponents({ activeOnly: true }).then((components) => {
      if (!active) return;
      const products = components.map((component) => {
        const specs = component.specs || {};
        const benchmark = Math.max(0, Math.min(100, Number(component.performance_score) / 100));
        const detailSpecs = {
          ...specs,
          formFactor: specs.formFactor || specs.coolerType || specs.interface || component.category,
          tdp: specs.tdpWatts || specs.wattage || 0,
          socket: specs.socket || specs.chipset || specs.interface || "—",
          perf: benchmark,
          cores: specs.cores
            ? `${specs.cores}C${specs.threads ? ` / ${specs.threads}T` : ""}`
            : specs.vramGB
              ? `${specs.vramGB} GB VRAM`
              : specs.capacityGB
                ? `${specs.capacityGB} GB`
                : specs.capacityTB
                  ? `${specs.capacityTB} TB`
                  : component.category.toUpperCase(),
          ...Object.fromEntries(Object.entries(specs).map(([key, value]) => [`spec_${key}`, value])),
        };
        const cond = component.condition === "brand_new"
          ? "new"
          : component.condition === "used"
            ? "used"
            : "refurb";
        const product = {
          id: `registry:${component.id}`,
          cat: "pc",
          brand: component.brand,
          name: component.name,
          type: component.category.toUpperCase(),
          cond,
          price: Number(component.base_price),
          delta: 0,
          specs: detailSpecs,
        };
        return {
          ...product,
          hay: `${product.brand} ${product.name} ${product.type} ${COND_LABEL[cond]} ${CATS.pc.short} ${Object.values(detailSpecs).join(" ")}`.toLowerCase(),
        };
      });
      setInventoryProducts(products);
      const maxPcPrice = products.reduce((max, product) => Math.max(max, product.price), BOUNDS.pc.max);
      setFilters((current) => ({
        ...current,
        pc: { ...current.pc, max: Math.max(current.pc.max, maxPcPrice) },
      }));
      setInventoryError("");
    }).catch((error) => {
      if (active) setInventoryError(`Registri hardware gagal dimuat: ${error.message}`);
    });
    return () => { active = false; };
  }, []);

  const products = useMemo(() => [...PRODUCTS, ...inventoryProducts], [inventoryProducts]);
  const productById = useMemo(() => Object.fromEntries(products.map((product) => [product.id, product])), [products]);
  const categoryBounds = useMemo(() => Object.fromEntries(CAT_ORDER.map((key) => {
    const prices = products.filter((product) => product.cat === key).map((product) => product.price);
    const min = prices.reduce((value, price) => Math.min(value, price), Number.POSITIVE_INFINITY);
    const max = prices.reduce((value, price) => Math.max(value, price), 0);
    return [key, {
      min: Math.floor(min / STEP) * STEP,
      max: Math.ceil(max / STEP) * STEP,
    }];
  })), [products]);
  const categoryOptions = useMemo(() => Object.fromEntries(CAT_ORDER.map((key) => {
    const items = products.filter((product) => product.cat === key);
    return [key, {
      brands: [...new Set(items.map((product) => product.brand))].sort(),
      types: [...new Set(items.map((product) => product.type))].sort(),
    }];
  })), [products]);

  const cfg = CATS[cat];
  const f = filters[cat];
  const tokens = useMemo(() => debouncedQuery.trim().toLowerCase().split(/\s+/).filter(Boolean), [debouncedQuery]);

  // Search runs across every category, so each tab shows how many matches it holds
  const searched = useMemo(() => products.filter((p) => tokens.every((t) => p.hay.includes(t))), [products, tokens]);
  const tabCounts = useMemo(() => Object.fromEntries(CAT_ORDER.map((k) => [k, searched.filter((p) => p.cat === k).length])), [searched]);
  const visible = useMemo(
    () => searched.filter((p) => p.cat === cat && (f.cond === "all" || p.cond === f.cond) && (f.brand === "all" || p.brand === f.brand) && (f.type === "all" || p.type === f.type) && p.price <= f.max),
    [searched, cat, f]
  );
  const totalPages = Math.max(1, Math.ceil(visible.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paginatedVisible = useMemo(() => {
    const start = (safePage - 1) * ITEMS_PER_PAGE;
    return visible.slice(start, start + ITEMS_PER_PAGE);
  }, [safePage, visible]);
  const otherHits = CAT_ORDER.filter((k) => k !== cat && tabCounts[k] > 0);

  useEffect(() => {
    setPage(1);
  }, [cat, debouncedQuery, f]);

  const selected = compare[cat].map((id) => productById[id]).filter(Boolean);
  const builderItems = builder.map((id) => productById[id]).filter(Boolean);
  const compareOpen = panel === "compare" && selected.length >= 2;
  const sheet = sheetId ? productById[sheetId] : null;
  const barVisible = selected.length > 0 || builder.length > 0;

  useEffect(() => { if (panel === "compare" && selected.length < 2) setPanel(null); }, [panel, selected.length]);

  const setFilter = useCallback(
    (key, value) => setFilters((all) => ({ ...all, [cat]: { ...all[cat], [key]: value } })),
    [cat],
  );
  const resetFilters = useCallback(() => {
    setQuery("");
    setFilters((all) => ({
      ...all,
      [cat]: { ...newFilters()[cat], max: categoryBounds[cat].max },
    }));
  }, [cat, categoryBounds]);
  const toggleCompare = useCallback((p) => setCompare((c) => {
    const ids = c[p.cat];
    return { ...c, [p.cat]: ids.includes(p.id) ? ids.filter((i) => i !== p.id) : ids.length >= MAX_COMPARE ? ids : [...ids, p.id] };
  }), []);
  const toggleBuilder = useCallback((id) => setBuilder((l) => (l.includes(id) ? l.filter((i) => i !== id) : [...l, id])), []);
  const clearCompare = useCallback(() => {
    setCompare((c) => ({ ...c, [cat]: [] }));
    setPanel(null);
  }, [cat]);
  const clearBuilder = useCallback(() => setBuilder([]), []);
  const closePanel = useCallback(() => setPanel(null), []);
  const closeSheet = useCallback(() => setSheetId(null), []);
  const filtersActive = tokens.length > 0 || f.cond !== "all" || f.brand !== "all" || f.type !== "all" || f.max < categoryBounds[cat].max;

  const field = `vt-form-control w-full rounded-lg border border-default bg-canvas px-3.5 py-2.5 text-sm text-primary outline-none transition-colors focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/25`;
  return (
    <div className="bg-canvas text-primary antialiased">
      <div className={`mx-auto max-w-7xl px-4 py-8 sm:px-6 ${barVisible ? "pb-36 md:pb-24" : "pb-16 md:pb-10"}`}>
        <h2 className="font-sans text-3xl font-bold tracking-tight text-primary sm:text-4xl">Hardware Library &amp; Periferal</h2>
        <p className="mt-3 max-w-2xl leading-relaxed text-secondary">Jelajahi ponsel, laptop, komponen PC, dan aksesori IT dengan spesifikasi inti lalu bandingkan berdampingan.</p>
        {inventoryError && <p role="status" className="mt-4 rounded-xl border border-default bg-surface p-4 text-sm text-accent-hover shadow-sm">{inventoryError} Menampilkan katalog terkurasi.</p>}

        {/* Category tabs */}
        <div role="tablist" aria-label="Kategori hardware" className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CAT_ORDER.map((k) => {
            const c = CATS[k];
            const Icon = c.icon;
            const on = cat === k;
            return (
              <button
                key={k}
                type="button"
                role="tab"
                id={`tab-${k}`}
                aria-selected={on}
                aria-controls="library-panel"
                onClick={() => setCat(k)}
                className={`relative flex min-h-11 flex-col justify-between rounded-xl border p-5 text-left transition-colors duration-150 ${focusRing} ${
                  on
                    ? "border-accent-primary bg-accent-subtle/50"
                    : "border-default bg-surface hover:border-accent-primary/40 hover:bg-subtle/40"
                }`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className={`grid h-10 w-10 place-items-center rounded-lg transition-colors ${on ? "bg-accent-primary text-white" : "border border-default bg-canvas text-primary"}`}><Icon className="h-5 w-5" /></span>
                  <span className="flex items-center gap-1.5">
                    {compare[k].length > 0 && <span className="inline-flex items-center gap-1 rounded-md border border-status-live/30 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800"><ArrowRightLeft className="h-3 w-3" /> {compare[k].length}</span>}
                    <span className="rounded-md border border-default bg-canvas px-2 py-0.5 font-mono text-xs font-medium tabular-nums text-secondary">{tabCounts[k]}</span>
                  </span>
                </span>
                <span className="mt-4 block text-base font-semibold text-primary">{c.label}</span>
                <span className="mt-1 block text-xs text-secondary">{c.focus}</span>
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <section id="library-panel" role="tabpanel" aria-labelledby={`tab-${cat}`}>
          <div className="mt-6 rounded-xl border border-default bg-surface p-4 shadow-sm sm:p-6">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <label htmlFor="lib-search" className="sr-only">Cari di semua kategori hardware</label>
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-secondary" />
                <input id="lib-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari merek, chipset, RTX, DDR5…" className={`${field} min-h-11 py-2.5 pl-12`} />
              </div>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(true)}
                className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg border border-default bg-canvas px-3.5 py-2 text-sm font-medium text-primary md:hidden ${focusRing}`}
              >
                <SlidersHorizontal className="h-4 w-4 text-accent-primary" />
                <span>Filter</span>
                {filtersActive && <span aria-hidden="true" className="h-2 w-2 rounded-full bg-accent-primary" />}
              </button>
            </div>
            <div className="mt-5 hidden gap-4 md:grid md:grid-cols-4">
              <FilterControls cfg={cfg} f={f} options={categoryOptions[cat]} bounds={categoryBounds[cat]} setFilter={setFilter} fieldClass={field} />
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-default pt-2 text-sm">
              <p className="flex items-center gap-2 text-secondary"><SlidersHorizontal className="h-4 w-4" /> Filter untuk {cfg.short}. Pencarian mencakup seluruh kategori.</p>
              <button type="button" onClick={resetFilters} disabled={!filtersActive} className={`min-h-11 rounded px-2 text-xs font-semibold text-accent-hover hover:underline disabled:text-secondary ${focusRing}`}>Reset filter</button>
            </div>
          </div>

          <p className="mt-6 text-sm text-secondary" aria-live="polite">
            Menampilkan <span className="font-mono font-semibold text-primary">{visible.length}</span> dari {products.filter((p) => p.cat === cat).length} pada {cfg.short}
          </p>

          {paginatedVisible.length ? (
            <>
              <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {paginatedVisible.map((p) => (
                  <ProductCard
                    key={p.id}
                    p={p}
                    inCompare={compare[cat].includes(p.id)}
                    compareFull={compare[cat].length >= MAX_COMPARE}
                    inBuilder={builder.includes(p.id)}
                    onCompare={toggleCompare}
                    onSheet={setSheetId}
                    onBuilder={toggleBuilder}
                    onUpgrade={onCheckUpgrade}
                  />
                ))}
              </div>
              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between gap-3 rounded-xl border border-default bg-surface px-4 py-3 text-sm shadow-sm">
                  <p className="text-xs text-secondary">
                    Halaman <span className="font-mono font-semibold text-primary">{safePage}</span> / <span className="font-mono">{totalPages}</span>
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={safePage <= 1}
                      onClick={() => setPage((current) => Math.max(1, current - 1))}
                      className={`min-h-11 rounded-lg border border-default bg-subtle px-3.5 py-1.5 text-xs font-medium text-primary hover:bg-canvas disabled:opacity-40 ${focusRing}`}
                    >
                      Sebelumnya
                    </button>
                    <button
                      type="button"
                      disabled={safePage >= totalPages}
                      onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                      className={`min-h-11 rounded-lg border border-default bg-subtle px-3.5 py-1.5 text-xs font-medium text-primary hover:bg-canvas disabled:opacity-40 ${focusRing}`}
                    >
                      Berikutnya
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="mt-4 rounded-xl border border-default bg-surface p-10 text-center shadow-sm">
              <p className="font-medium text-primary">Tidak ada {cfg.short.toLowerCase()} yang cocok dengan filter ini.</p>
              {tokens.length > 0 && otherHits.length > 0 && (
                <p className="mt-3 flex flex-wrap items-center justify-center gap-2 text-sm text-secondary">
                  Hasil ditemukan di:
                  {otherHits.map((k) => (
                    <button key={k} type="button" onClick={() => setCat(k)} className={`rounded-lg border border-default bg-canvas px-3 py-1.5 text-xs font-medium text-primary hover:border-accent-primary/40 ${focusRing}`}>
                      {CATS[k].short} ({tabCounts[k]})
                    </button>
                  ))}
                </p>
              )}
              <button type="button" onClick={resetFilters} className={`mt-4 min-h-11 rounded-lg border border-default bg-subtle px-4 py-2 text-sm font-medium text-primary hover:bg-canvas ${focusRing}`}>Reset filter</button>
            </div>
          )}
        </section>
      </div>

      {barVisible && (
        <div className="fixed inset-x-0 bottom-14 z-30 border-t border-default bg-surface shadow-lg md:bottom-0">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
            <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
              {selected.length > 0 && <span className="shrink-0 text-xs font-medium text-secondary">Membandingkan {cfg.short}:</span>}
              {selected.map((p) => (
                <span key={p.id} className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg border border-default bg-canvas pl-3 pr-1 text-xs font-medium text-primary">
                  <span className="max-w-[10rem] truncate">{p.name}</span>
                  <button type="button" aria-label={`Hapus ${p.name} dari perbandingan`} onClick={() => toggleCompare(p)} className={`inline-flex h-11 w-11 items-center justify-center rounded-lg text-secondary hover:bg-subtle hover:text-primary ${focusRing}`}><X className="h-3.5 w-3.5" /></button>
                </span>
              ))}
              {selected.length === 1 && <span className="shrink-0 text-xs text-secondary">Pilih 1 {cfg.short.toLowerCase()} lagi untuk membandingkan</span>}
            </div>
            {builder.length > 0 && (
              <button type="button" onClick={() => setPanel("builder")} className={`inline-flex min-h-11 items-center gap-2 rounded-lg border border-default bg-canvas px-3.5 py-2 text-sm font-medium text-primary hover:bg-subtle ${focusRing}`}>
                <Plus className="h-4 w-4 text-accent-primary" /> Daftar Preset Builder ({builder.length})
              </button>
            )}
            {selected.length > 0 && (
              <button type="button" disabled={selected.length < 2} onClick={() => setPanel("compare")} className={`inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent-cta px-4 py-2 text-sm font-semibold text-white hover:bg-accent-cta-hover disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`}>
                <ArrowRightLeft className="h-4 w-4" /> Bandingkan Sekarang
              </button>
            )}
          </div>
        </div>
      )}

      {mobileFiltersOpen && (
        <Overlay label={`Filter ${cfg.short}`} onClose={() => setMobileFiltersOpen(false)}>
          <OverlayHeader title={`Filter ${cfg.label}`} subtitle="Sesuaikan kondisi, merek, tipe, dan batas harga" onClose={() => setMobileFiltersOpen(false)} />
          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            <FilterControls cfg={cfg} f={f} options={categoryOptions[cat]} bounds={categoryBounds[cat]} setFilter={setFilter} fieldClass={field} />
          </div>
          <div className="flex gap-2 border-t border-default p-4">
            <button type="button" onClick={resetFilters} disabled={!filtersActive} className={`min-h-11 flex-1 rounded-lg border border-default bg-subtle px-4 py-2 text-sm font-medium text-primary disabled:opacity-40 ${focusRing}`}>Reset</button>
            <button type="button" onClick={() => setMobileFiltersOpen(false)} className={`min-h-11 flex-1 rounded-lg bg-accent-cta px-4 py-2 text-sm font-semibold text-white hover:bg-accent-cta-hover ${focusRing}`}>Lihat {visible.length} Item</button>
          </div>
        </Overlay>
      )}
      {sheet && <Datasheet p={sheet} inCompare={compare[sheet.cat].includes(sheet.id)} compareFull={compare[sheet.cat].length >= MAX_COMPARE} inBuilder={builder.includes(sheet.id)} onCompare={toggleCompare} onBuilder={toggleBuilder} onClose={closeSheet} />}
      {compareOpen && <CompareModal items={selected} cat={cat} diffOnly={diffOnly} setDiffOnly={setDiffOnly} onRemove={toggleCompare} onClear={clearCompare} onClose={closePanel} />}
      {panel === "builder" && <BuilderList items={builderItems} onRemove={toggleBuilder} onClear={clearBuilder} onClose={closePanel} onOpenBuilder={onOpenBuilder} />}
    </div>
  );
}
