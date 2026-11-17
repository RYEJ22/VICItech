import { useEffect, useMemo, useState } from "react";
import {
  Swords, Scale, Cpu, Laptop, Smartphone, CheckCircle2, XCircle, Zap, ArrowRightLeft, Trophy, Sparkles,
  Search, ShieldCheck, X,
} from "lucide-react";

/* ───────────────────────── Sample catalog (prices in IDR) ───────────────────────── */
// perf is a ViciTech performance index (0-100). It drives the "performance per Rp 1 juta" value score.

const idr = (n) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
const num = (n) => new Intl.NumberFormat("id-ID").format(n);

const pc = (id, name, cond, price, cpu, cores, threads, gpu, vram, ramType, ramMhz, ramGb, tdp, multi, gaming, bottleneck, thermal, perf) =>
  ({ id, cat: "pc", brand: "ViciTech", name, cond, price, cpu, cores, threads, gpu, vram, ramType, ramMhz, ramGb, tdp, multi, gaming, bottleneck, thermal, perf });
const laptop = (id, brand, name, cond, price, cpu, cpuScore, gpu, gpuScore, display, srgb, weight, wh, hours, health, perf) =>
  ({ id, cat: "laptops", brand, name, cond, price, cpu, cpuScore, gpu, gpuScore, display, srgb, weight, wh, hours, health, perf });
const phone = (id, brand, name, cond, price, chip, chipScore, hz, camera, mp, battery, charging, perf) =>
  ({ id, cat: "phones", brand, name, cond, price, chip, chipScore, hz, camera, mp, battery, charging, perf });

const PCS = [
  pc("b2s", "B2S CBT Labkom Standard", "new", 5600000, "Intel Core i3-12100", 4, 8, "Integrated UHD 730", 0, "DDR4-3200", 3200, 8, 117, 38, 30, 8, 60, 34),
  pc("b2b", "B2B Enterprise Office Workstation", "new", 9850000, "Intel Core i5-12400", 6, 12, "Integrated UHD 730", 0, "DDR4-3200", 3200, 16, 151, 52, 40, 6, 64, 48),
  pc("b2c", "B2C Creator & Gaming Rig", "new", 29550000, "AMD Ryzen 7 7800X3D", 8, 16, "RTX 4070 Super 12 GB", 12, "DDR5-6000", 6000, 32, 431, 70, 94, 12, 52, 86),
  pc("esports", "Esports 1080p Rig", "new", 12900000, "AMD Ryzen 5 7600", 6, 12, "RTX 4060 8 GB", 8, "DDR5-6000", 6000, 16, 292, 58, 76, 5, 62, 66),
  pc("render", "4K Render Workstation", "new", 41000000, "AMD Ryzen 9 7950X", 16, 32, "RTX 4070 12 GB", 12, "DDR5-6000", 6000, 64, 541, 100, 82, 18, 22, 94),
  pc("sff", "Refurbished Office SFF (OptiPlex 7090)", "refurb", 6300000, "Intel Core i7-10700", 8, 16, "Integrated UHD 630", 0, "DDR4-2933", 2933, 16, 98, 46, 38, 7, 58, 44),
  pc("mini", "Refurbished Mini PC (EliteDesk 800 G6)", "refurb", 4900000, "Intel Core i5-10500T", 6, 12, "Integrated UHD 630", 0, "DDR4-2666", 2666, 16, 70, 40, 30, 6, 66, 36),
];
const LAPTOPS = [
  laptop("t14", "Lenovo", "ThinkPad T14 Gen 4", "refurb", 9800000, "Ryzen 7 PRO 7840U", 68, "Radeon 780M (integrated)", 20, '14" 1920×1200 IPS', 100, 1.4, 52.5, 11, 96, 62),
  laptop("lat7440", "Dell", "Latitude 7440", "new", 22400000, "Core i7-1365U", 58, "Intel Iris Xe (integrated)", 18, '14" 1920×1200 IPS', 100, 1.36, 58, 12, 100, 58),
  laptop("elite840", "HP", "EliteBook 840 G9", "refurb", 8200000, "Core i5-1245U", 52, "Intel Iris Xe (integrated)", 18, '14" 1920×1200 IPS', 100, 1.4, 51, 10, 94, 52),
  laptop("g14", "ASUS", "ROG Zephyrus G14", "new", 33500000, "Ryzen 9 8945HS", 84, "RTX 4070 8 GB", 70, '14" 2880×1800 OLED', 100, 1.5, 73, 9, 100, 84),
  laptop("legion5", "Lenovo", "Legion Pro 5", "new", 29900000, "Core i7-14700HX", 82, "RTX 4060 8 GB", 52, '16" 2560×1600 165 Hz IPS', 100, 2.5, 80, 6, 100, 80),
  laptop("prec5570", "Dell", "Precision 5570", "refurb", 25000000, "Core i7-12800H", 70, "RTX A1000 4 GB", 40, '15.6" 3840×2400 IPS, 100% Adobe RGB', 100, 1.84, 86, 8, 92, 70),
  laptop("aspire5", "Acer", "Aspire 5 (15.6 inch)", "new", 8900000, "Core i5-1335U", 54, "Intel Iris Xe (integrated)", 18, '15.6" 1920×1080 IPS', 62, 1.7, 50, 8, 100, 48),
];
const PHONES = [
  phone("s24u", "Samsung", "Galaxy S24 Ultra 12/256 GB", "new", 19500000, "Snapdragon 8 Gen 3 for Galaxy", 96, 120, "200 MP main, 50 MP 5× tele, 12 MP ultrawide, 10 MP 3× tele", 200, 5000, 45, 96),
  phone("ip15p", "Apple", "iPhone 15 Pro 256 GB", "new", 18500000, "Apple A17 Pro", 95, 120, "48 MP main, 12 MP 3× tele, 12 MP ultrawide", 48, 3274, 27, 95),
  phone("x14tp", "Xiaomi", "Xiaomi 14T Pro 12/256 GB", "new", 9500000, "Dimensity 9300+", 90, 144, "50 MP main, 50 MP 2.6× tele, 12 MP ultrawide", 50, 5000, 120, 88),
  phone("px8a", "Google", "Pixel 8a 128 GB", "new", 8200000, "Google Tensor G3", 70, 120, "64 MP main, 13 MP ultrawide", 64, 4492, 18, 66),
  phone("a55", "Samsung", "Galaxy A55 5G 8/256 GB", "new", 6500000, "Exynos 1480", 52, 120, "50 MP main, 12 MP ultrawide, 5 MP macro", 50, 5000, 25, 52),
  phone("rn13", "Xiaomi", "Redmi Note 13 Pro+ 12/512 GB", "new", 5200000, "Dimensity 7200 Ultra", 56, 120, "200 MP main, 8 MP ultrawide, 2 MP macro", 200, 5000, 120, 56),
  phone("ip13", "Apple", "iPhone 13 128 GB", "refurb", 7200000, "Apple A15 Bionic", 62, 60, "12 MP main, 12 MP ultrawide", 12, 3240, 20, 62),
];

/* ───────────────────────── Comparison rows and verdict cases ───────────────────────── */
// A row with `rank` is scored; `better` says whether high or low wins. Rows without `rank` are shown only.

const valueOf = (p) => p.perf / (p.price / 1e6);
const PRICE_ROW = { key: "price", label: "Price (IDR)", rank: (p) => p.price, better: "low", show: (p) => idr(p.price) };
const VALUE_ROW = { key: "value", label: "Performance per Rp 1 juta", rank: valueOf, better: "high", show: (p) => valueOf(p).toFixed(1) };
const perfRow = { key: "perf", label: "Performance Index", rank: (p) => p.perf, better: "high", show: (p) => `${p.perf} / 100` };
const gradeText = (p) => (p.cond === "new" ? "New (100%)" : `Recertified A+ (${p.health}% battery)`);

const CATS = {
  pc: {
    label: "PC & Component Presets", sub: "Raw specs, preset price and bottleneck score", icon: Cpu, items: PCS,
    line: (p) => `${p.cpu} with ${p.gpu}`,
    rows: [
      { key: "cpu", label: "CPU", show: (p) => p.cpu },
      { key: "cores", label: "CPU Cores / Threads", rank: (p) => p.cores, better: "high", show: (p) => `${p.cores}C / ${p.threads}T` },
      { key: "gpu", label: "GPU", show: (p) => p.gpu },
      { key: "vram", label: "GPU VRAM", rank: (p) => p.vram, better: "high", show: (p) => (p.vram ? `${p.vram} GB` : "Shared memory") },
      { key: "ram", label: "RAM Capacity", rank: (p) => p.ramGb, better: "high", show: (p) => `${p.ramGb} GB` },
      { key: "ramSpeed", label: "RAM Speed", rank: (p) => p.ramMhz, better: "high", show: (p) => `${p.ramType} (${num(p.ramMhz)} MT/s)` },
      { key: "tdp", label: "TDP (peak system draw)", rank: (p) => p.tdp, better: "low", show: (p) => `${p.tdp} W` },
      { key: "multi", label: "Multi-core Score", rank: (p) => p.multi, better: "high", show: (p) => `${p.multi} / 100` },
      { key: "gaming", label: "Gaming Score", rank: (p) => p.gaming, better: "high", show: (p) => `${p.gaming} / 100` },
      { key: "bottleneck", label: "Bottleneck Score (lower is better)", abs: 100, rank: (p) => p.bottleneck, better: "low", show: (p) => `${p.bottleneck}%` },
      { key: "thermal", label: "Thermal Headroom", abs: 100, rank: (p) => p.thermal, better: "high", show: (p) => `${p.thermal}%` },
      perfRow,
    ],
    cases: [
      { id: "work", label: "Heavy Workstation", keys: ["multi", "cores", "ram", "thermal"] },
      { id: "game", label: "Gaming", keys: ["gaming", "vram", "bottleneck"] },
      { id: "office", label: "Efficient Office Fleets", keys: ["tdp", "thermal", "bottleneck"] },
      { id: "value", label: "Value for Money", keys: ["value"] },
    ],
  },
  laptops: {
    label: "Laptops & Mobile Workstations", sub: "CPU and GPU, display, weight, battery and grade", icon: Laptop, items: LAPTOPS,
    line: (p) => `${p.cpu}, ${p.gpu}`,
    rows: [
      { key: "cpu", label: "CPU", rank: (p) => p.cpuScore, better: "high", show: (p) => p.cpu },
      { key: "gpu", label: "GPU", rank: (p) => p.gpuScore, better: "high", show: (p) => p.gpu },
      { key: "display", label: "Display", show: (p) => p.display },
      { key: "srgb", label: "sRGB Coverage", abs: 100, rank: (p) => p.srgb, better: "high", show: (p) => `${p.srgb}%` },
      { key: "weight", label: "Weight", rank: (p) => p.weight, better: "low", show: (p) => `${p.weight} kg` },
      { key: "battery", label: "Battery Capacity", rank: (p) => p.wh, better: "high", show: (p) => `${p.wh} Wh` },
      { key: "hours", label: "Battery Life (office use)", rank: (p) => p.hours, better: "high", show: (p) => `about ${p.hours} h` },
      { key: "grade", label: "Condition / Refurbished Grade", abs: 100, rank: (p) => p.health, better: "high", show: gradeText },
      perfRow,
    ],
    cases: [
      { id: "mobile", label: "Mobile Productivity", keys: ["weight", "hours", "battery"] },
      { id: "creative", label: "Creative Work", keys: ["srgb", "gpu", "cpu"] },
      { id: "power", label: "Raw Performance", keys: ["cpu", "gpu", "perf"] },
      { id: "value", label: "Value for Money", keys: ["value"] },
    ],
  },
  phones: {
    label: "Smartphones & Mobile Devices", sub: "Processor, display, camera, battery and charging", icon: Smartphone, items: PHONES,
    line: (p) => p.chip,
    rows: [
      { key: "chip", label: "Processor", rank: (p) => p.chipScore, better: "high", show: (p) => p.chip },
      { key: "hz", label: "Display Refresh Rate", rank: (p) => p.hz, better: "high", show: (p) => `${p.hz} Hz` },
      { key: "camera", label: "Camera Setup", show: (p) => p.camera },
      { key: "mp", label: "Main Camera Resolution", rank: (p) => p.mp, better: "high", show: (p) => `${p.mp} MP` },
      { key: "battery", label: "Battery", rank: (p) => p.battery, better: "high", show: (p) => `${num(p.battery)} mAh` },
      { key: "charging", label: "Fast Charging", rank: (p) => p.charging, better: "high", show: (p) => `${p.charging} W` },
      perfRow,
    ],
    cases: [
      { id: "photo", label: "Photography", keys: ["mp", "chip"] },
      { id: "battery", label: "Battery & Charging", keys: ["battery", "charging"] },
      { id: "perf", label: "Gaming & Performance", keys: ["chip", "hz", "perf"] },
      { id: "value", label: "Value for Money", keys: ["value"] },
    ],
  },
};
const TAB_ORDER = ["pc", "laptops", "phones"];

const PHRASE = {
  cores: "more CPU cores", vram: "more VRAM", ram: "more RAM", ramSpeed: "faster memory", tdp: "lower power draw",
  multi: "a higher multi-core score", gaming: "stronger gaming performance", bottleneck: "a more balanced CPU and GPU pairing",
  thermal: "better thermal headroom", perf: "higher overall performance", price: "a lower price", value: "better performance per Rp 1 juta",
  cpu: "a faster CPU", gpu: "a faster GPU", srgb: "wider sRGB coverage", weight: "a lighter build", battery: "a bigger battery",
  hours: "longer battery life", grade: "a better condition grade", chip: "a faster processor", hz: "a smoother display",
  mp: "a higher-resolution main camera", charging: "faster charging",
};

/* ───────────────────────── Comparison engine ───────────────────────── */

function evaluate(cat, a, b) {
  const rows = [...CATS[cat].rows, PRICE_ROW, VALUE_ROW].map((r) => {
    if (!r.rank) return { ...r, win: null, adv: 0, note: "" };
    const va = r.rank(a), vb = r.rank(b);
    const raw = r.abs ? (va - vb) / r.abs : Math.log((va + 1e-9) / (vb + 1e-9));
    const adv = Math.max(-1.5, Math.min(1.5, r.better === "high" ? raw : -raw)); // positive favors Item A
    const win = Math.abs(raw) < 0.01 ? null : adv > 0 ? "a" : "b";
    const hi = Math.max(va, vb), lo = Math.min(va, vb);
    const note = !win ? "" : r.abs ? `${r.better === "high" ? "+" : "-"}${Math.round(hi - lo)} pts` : lo === 0 ? "" : r.better === "high" ? `+${Math.round((hi / lo - 1) * 100)}%` : `-${Math.round((1 - lo / hi) * 100)}%`;
    return { ...r, win, adv: win ? adv : 0, note };
  });

  const ranked = rows.filter((r) => r.rank);
  const wonA = ranked.filter((r) => r.win === "a").length;
  const wonB = ranked.filter((r) => r.win === "b").length;
  const valA = valueOf(a), valB = valueOf(b);
  const leader = wonA !== wonB ? (wonA > wonB ? "a" : "b") : valA >= valB ? "a" : "b";

  // One verdict line per use case: weighted by the rows that matter for it
  const verdicts = CATS[cat].cases.map((c) => {
    const picked = ranked.filter((r) => c.keys.includes(r.key));
    const score = picked.reduce((s, r) => s + r.adv, 0) / picked.length;
    if (Math.abs(score) < 0.04) return { ...c, tie: true };
    const side = score > 0 ? "a" : "b";
    const [w, l] = side === "a" ? [a, b] : [b, a];
    const sorted = picked.filter((r) => (side === "a" ? r.adv : -r.adv) > 0).sort((x, y) => Math.abs(y.adv) - Math.abs(x.adv));
    const strong = sorted.filter((r) => Math.abs(r.adv) >= 0.05).slice(0, 2);
    const reasons = (strong.length ? strong : sorted.slice(0, 1)).map((r) => PHRASE[r.key]);
    const diff = w.price - l.price;
    const clause = diff > 0 ? `, despite costing ${idr(diff)} more` : diff < 0 ? `, and it costs ${idr(-diff)} less` : "";
    return { ...c, side, text: `${w.name} due to ${reasons.join(" and ")}${clause}` };
  });

  return { rows, wonA, wonB, ranked: ranked.length, valA, valB, leader, verdicts };
}

/* ───────────────────────── UI pieces ───────────────────────── */

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5500]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F6F5F2]";
const SIDES = { a: { label: "Item A", text: "text-[#C94300]", bar: "bg-[#FF5500]" }, b: { label: "Item B", text: "text-[#30343A]", bar: "bg-[#8B9199]" } };

function CondBadge({ cond }) {
  return cond === "refurb" ? (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-xs text-emerald-700 dark:text-emerald-400"><ShieldCheck className="h-3 w-3" /> Recertified A+</span>
  ) : (
    <span className="inline-flex rounded-full border border-emerald-600/30 dark:border-emerald-400/30 bg-emerald-600/10 dark:bg-emerald-400/10 px-2 py-0.5 text-xs text-[#C94300] dark:text-cyan-300">New</span>
  );
}

function ItemCard({ item, side, leader, line, Icon, onChange }) {
  const s = SIDES[side];
  return (
    <article className={`relative rounded-3xl border p-5 shadow-[0_10px_32px_rgba(20,21,24,0.04)] ${leader ? "border-[#FF5500]/30 bg-white ring-1 ring-[#FF5500]/10" : "border-black/[0.07] bg-white/80"}`}>
      <div className="flex items-center justify-between">
        <span className={`text-sm font-medium ${s.text}`}>{s.label}</span>
        {leader && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-2 py-0.5 text-xs text-emerald-700 dark:text-emerald-400"><Trophy className="h-3.5 w-3.5" /> Leads overall</span>}
      </div>
      <div className="mt-3 flex gap-3">
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-950/70 text-zinc-500" aria-hidden="true"><Icon className="h-7 w-7" /></div>
        <div className="min-w-0">
          <h3 className="font-semibold leading-snug text-zinc-900 dark:text-zinc-50">{item.name}</h3>
          <p className="text-xs text-zinc-500">{item.brand}, {line(item)}</p>
          <div className="mt-1.5"><CondBadge cond={item.cond} /></div>
        </div>
      </div>
      <p className="mt-3 text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">{idr(item.price)}</p>
      <button type="button" onClick={onChange} className={`mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full border border-black/10 px-4 py-2.5 text-sm font-medium text-[#30343A] hover:border-[#FF5500]/35 hover:text-[#C94300] ${focusRing}`}>
        <Search className="h-4 w-4" /> Change {s.label}
      </button>
    </article>
  );
}

function Picker({ cat, side, otherId, currentId, onPick, onClose }) {
  const [q, setQ] = useState("");
  const cfg = CATS[cat];
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    const prev = document.body.style.overflow;
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);
  const tokens = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const list = cfg.items.filter((p) => tokens.every((t) => `${p.brand} ${p.name} ${cfg.line(p)}`.toLowerCase().includes(t)));
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center sm:p-6" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={`Choose ${SIDES[side].label}`} onClick={(e) => e.stopPropagation()} className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 p-4">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Choose {SIDES[side].label}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className={`rounded-lg p-2 text-zinc-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100 ${focusRing}`}><X className="h-5 w-5" /></button>
        </div>
        <div className="relative border-b border-zinc-200 dark:border-zinc-800 p-3">
          <label htmlFor="picker-search" className="sr-only">Search {cfg.label}</label>
          <Search className="pointer-events-none absolute left-6 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input id="picker-search" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, brand or chip" className={`w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 py-2.5 pl-10 pr-3 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 ${focusRing}`} />
        </div>
        <ul className="flex-1 divide-y divide-zinc-800 overflow-y-auto">
          {list.length === 0 && <li className="p-6 text-center text-sm text-zinc-500">No matches in this category.</li>}
          {list.map((p) => {
            const taken = p.id === otherId;
            return (
              <li key={p.id}>
                <button type="button" disabled={taken} onClick={() => onPick(p.id)} className={`flex w-full items-center gap-3 px-4 py-3 text-left ${focusRing} ${taken ? "cursor-not-allowed opacity-40" : p.id === currentId ? "bg-emerald-600/10 dark:bg-emerald-400/10" : "hover:bg-white dark:hover:bg-zinc-900"}`}>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-zinc-900 dark:text-zinc-100">{p.name}</span>
                    <span className="block truncate text-xs text-zinc-500">{p.brand}, {cfg.line(p)}</span>
                  </span>
                  <span className="flex flex-col items-end gap-1"><span className="text-sm tabular-nums text-zinc-800 dark:text-zinc-200">{idr(p.price)}</span><CondBadge cond={p.cond} /></span>
                  {taken && <span className="text-xs text-zinc-500">Used as {SIDES[side === "a" ? "b" : "a"].label}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/* ───────────────────────── Page ───────────────────────── */

export default function VersusArena({ onDeployToPreset, onRequestQuote }) {
  const [tab, setTab] = useState("pc");
  // Each category keeps its own Item A / Item B selection
  const [sel, setSel] = useState({ pc: { a: "b2c", b: "esports" }, laptops: { a: "t14", b: "lat7440" }, phones: { a: "s24u", b: "x14tp" } });
  const [picker, setPicker] = useState(null); // "a" | "b" | null
  const [deployed, setDeployed] = useState([]);
  const [quote, setQuote] = useState(null);
  const [notice, setNotice] = useState("");

  const cfg = CATS[tab];
  const { a: idA, b: idB } = sel[tab];
  const A = cfg.items.find((p) => p.id === idA);
  const B = cfg.items.find((p) => p.id === idB);
  const result = useMemo(() => evaluate(tab, A, B), [tab, A, B]);
  const leaderItem = result.leader === "a" ? A : B;
  const Icon = cfg.icon;

  const choose = (side, id) => { setSel((s) => ({ ...s, [tab]: { ...s[tab], [side]: id } })); setPicker(null); setQuote(null); setNotice(""); };
  const swap = () => { setSel((s) => ({ ...s, [tab]: { a: s[tab].b, b: s[tab].a } })); setQuote(null); setNotice(""); };
  const switchTab = (k) => { setTab(k); setPicker(null); setQuote(null); setNotice(""); };

  const deploy = () => {
    setDeployed((d) => (d.some((x) => x.id === leaderItem.id) ? d : [...d, leaderItem]));
    onDeployToPreset?.(leaderItem);
    setNotice(`${leaderItem.name} is queued for the Preset Builder.`);
  };
  const requestQuote = () => {
    const ref = `VT-Q-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    setQuote({ ref, item: leaderItem, text: `ViciTech quote request ${ref}\n${leaderItem.name}\nListed price: ${idr(leaderItem.price)}\nStatus: pending review by the ViciTech team` });
    onRequestQuote?.(leaderItem);
    setNotice("");
  };
  const copyQuote = async () => {
    try { await navigator.clipboard.writeText(quote.text); setNotice("Quote summary copied to clipboard."); } catch { setNotice("Copying isn't available in this browser."); }
  };

  const total = Math.max(1, result.wonA + result.wonB);
  const better = result.valA >= result.valB ? "a" : "b";
  const valueGap = Math.round((Math.max(result.valA, result.valB) / Math.min(result.valA, result.valB) - 1) * 100);

  return (
    <div className="min-h-screen bg-[#F6F5F2] text-[#141518] antialiased">
      <header className="border-b border-black/[0.06] bg-[#F6F5F2]/90">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#FF5500] text-white"><Cpu className="h-5 w-5" /></span>
          <span className="font-serif text-xl font-semibold tracking-tight">ViciTech</span>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-[#5A606A]">Versus Arena</span>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#FF5500]">Make the comparison count</p>
        <h1 className="flex items-center gap-3 font-serif text-4xl font-semibold tracking-tight text-[#141518] sm:text-5xl"><Swords className="h-8 w-8 text-[#FF5500]" /> Versus Arena</h1>
        <p className="mt-4 max-w-2xl leading-relaxed text-[#5A606A]">Put two products head to head, see who wins each spec, compare value per rupiah and get a clear verdict for the way you plan to use them.</p>

        {/* Category tabs */}
        <div role="tablist" aria-label="Comparison category" className="mt-8 grid gap-3 sm:grid-cols-3">
          {TAB_ORDER.map((k) => {
            const c = CATS[k];
            const TabIcon = c.icon;
            const on = tab === k;
            return (
              <button key={k} type="button" role="tab" id={`tab-${k}`} aria-selected={on} aria-controls="arena-panel" onClick={() => switchTab(k)}
                className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition-all ${focusRing} ${on ? "border-[#FF5500]/30 bg-white shadow-[0_10px_28px_rgba(255,85,0,0.07)]" : "border-black/[0.07] bg-white/70 hover:border-black/15"}`}>
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${on ? "bg-[#FF5500] text-white" : "bg-[#F6F5F2] text-[#5A606A]"}`}><TabIcon className="h-5 w-5" /></span>
                <span><span className={`block text-sm font-semibold ${on ? "text-[#C94300]" : "text-[#141518]"}`}>{c.label}</span><span className="block text-xs text-[#777C83]">{c.sub}</span></span>
              </button>
            );
          })}
        </div>

        <section id="arena-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="mt-6 space-y-6">
          {/* Item A vs Item B */}
          <div className="grid items-stretch gap-4 md:grid-cols-[1fr_auto_1fr]">
            <ItemCard item={A} side="a" leader={result.leader === "a"} line={cfg.line} Icon={Icon} onChange={() => setPicker("a")} />
            <div className="flex items-center justify-center gap-3 md:flex-col">
              <span className="grid h-12 w-12 place-items-center rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-[#C94300] dark:text-[#C94300]"><Swords className="h-6 w-6" /></span>
              <button type="button" onClick={swap} aria-label="Swap Item A and Item B" className={`grid h-11 w-11 place-items-center rounded-full border border-black/10 bg-white text-[#5A606A] hover:border-[#FF5500]/35 hover:text-[#C94300] ${focusRing}`}><ArrowRightLeft className="h-4 w-4" /></button>
            </div>
            <ItemCard item={B} side="b" leader={result.leader === "b"} line={cfg.line} Icon={Icon} onChange={() => setPicker("b")} />
          </div>

          {/* Scoreboard */}
          <div className="rounded-2xl border border-black/[0.07] bg-white p-5 shadow-[0_8px_24px_rgba(20,21,24,0.035)]" aria-label="Scoreboard">
            <div className="flex items-center justify-between text-sm">
              <span className={`font-medium ${SIDES.a.text}`}>{A.name}: {result.wonA} rows</span>
              <span className="text-xs text-zinc-500">{result.ranked} ranked rows</span>
              <span className={`font-medium ${SIDES.b.text}`}>{B.name}: {result.wonB} rows</span>
            </div>
            <div className="mt-2 flex h-2.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800" role="img" aria-label={`${A.name} wins ${result.wonA} rows, ${B.name} wins ${result.wonB}`}>
              <div className={`${SIDES.a.bar} transition-all duration-500`} style={{ width: `${(result.wonA / total) * 100}%` }} />
              <div className={`${SIDES.b.bar} ml-auto transition-all duration-500`} style={{ width: `${(result.wonB / total) * 100}%` }} />
            </div>
          </div>

          {/* Matrix */}
          <div className="overflow-hidden rounded-2xl border border-black/[0.07] bg-white shadow-[0_8px_24px_rgba(20,21,24,0.035)]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <caption className="sr-only">Specification comparison. Winning values are highlighted in green.</caption>
                <thead className="bg-white/70 dark:bg-zinc-900/70">
                  <tr>
                    <th className="w-56 p-3 text-left font-normal text-zinc-500">Specification</th>
                    <th className={`p-3 text-left font-semibold ${SIDES.a.text}`}>{A.name}</th>
                    <th className={`p-3 text-left font-semibold ${SIDES.b.text}`}>{B.name}</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((r) => (
                    <tr key={r.key} className={`border-t border-zinc-200 dark:border-zinc-800 ${r.key === "value" ? "bg-white/40 dark:bg-zinc-900/40" : ""}`}>
                      <th scope="row" className="p-3 text-left font-normal text-zinc-600 dark:text-zinc-400">{r.label}</th>
                      {[["a", A], ["b", B]].map(([side, item]) => {
                        const win = r.win === side;
                        const lose = r.rank && r.win && !win;
                        return (
                          <td key={side} className={`p-3 align-top ${win ? "bg-emerald-400/10 font-semibold text-emerald-700 dark:text-emerald-400" : lose ? "text-zinc-500" : "text-zinc-800 dark:text-zinc-200"}`}>
                            <span className="flex items-start gap-1.5">
                              {win && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-label="Wins this row" />}
                              {lose && <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-zinc-600" aria-label="Loses this row" />}
                              <span>{r.show(item)}{win && r.note && <span className="ml-2 text-xs font-normal text-emerald-700 dark:text-emerald-300">{r.note}</span>}</span>
                            </span>
                            {r.rank && !r.win && <span className="text-xs text-zinc-500">Tie</span>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-5">
            {/* Price to performance */}
            <section aria-labelledby="value-title" className="rounded-3xl border border-black/[0.06] bg-white p-6 shadow-[0_12px_36px_rgba(20,21,24,0.04)] lg:col-span-2 lg:self-start">
              <h2 id="value-title" className="flex items-center gap-2 font-serif text-xl font-semibold text-[#141518]"><Scale className="h-5 w-5 text-[#FF5500]" /> Price to performance</h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Performance index points you get for every Rp 1 juta.</p>
              <div className="mt-4 space-y-4">
                {[["a", A, result.valA], ["b", B, result.valB]].map(([side, item, v]) => (
                  <div key={side}>
                    <div className="flex items-center justify-between gap-3 text-sm"><span className={`truncate ${SIDES[side].text}`}>{item.name}</span><span className={`flex items-center gap-1 tabular-nums ${better === side ? "font-semibold text-emerald-700 dark:text-emerald-400" : "text-zinc-700 dark:text-zinc-300"}`}><Zap className="h-3.5 w-3.5" /> {v.toFixed(1)}</span></div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"><div className={`h-full rounded-full transition-all duration-500 ${better === side ? "bg-emerald-400" : "bg-zinc-500"}`} style={{ width: `${(v / Math.max(result.valA, result.valB)) * 100}%` }} /></div>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-sm text-zinc-700 dark:text-zinc-300">{valueGap === 0 ? "Both deliver the same value per rupiah." : <><span className="font-semibold text-emerald-700 dark:text-emerald-400">{(better === "a" ? A : B).name}</span> gives {valueGap}% more performance per rupiah.</>}</p>
            </section>

            {/* Verdict */}
            <section aria-labelledby="verdict-title" className="rounded-3xl border border-black/[0.06] bg-white p-6 shadow-[0_12px_36px_rgba(20,21,24,0.04)] lg:col-span-3">
              <h2 id="verdict-title" className="flex items-center gap-2 font-serif text-xl font-semibold text-[#141518]"><Sparkles className="h-5 w-5 text-[#FF5500]" /> ViciTech Verdict</h2>
              <p className="text-xs text-zinc-500">Generated from the matrix above with rule-based scoring, not a benchmark run.</p>

              <p className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">
                <Trophy className="h-4 w-4 shrink-0" />
                <span>Recommended pick: <span className="font-semibold">{leaderItem.name}</span>, winning {result.leader === "a" ? result.wonA : result.wonB} of {result.ranked} ranked rows{result.wonA === result.wonB ? " and better value on a tie" : ""}.</span>
              </p>

              <ul className="mt-4 space-y-2.5">
                {result.verdicts.map((v) => (
                  <li key={v.id} className="flex gap-2.5 text-sm">
                    {v.tie ? <Scale className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" /> : <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${v.side === "a" ? "text-[#C94300] dark:text-[#C94300]" : "text-amber-700 dark:text-amber-400"}`} />}
                    <span className="text-zinc-700 dark:text-zinc-300">
                      {v.tie ? <><span className="font-medium text-zinc-900 dark:text-zinc-100">{v.label}:</span> too close to call, the two are within 4%.</> : <><span className="font-medium text-zinc-900 dark:text-zinc-100">Winner for {v.label}:</span> {v.text}.</>}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-5 flex flex-wrap gap-3">
                <button type="button" onClick={deploy} className={`inline-flex items-center gap-2 rounded-full bg-[#FF5500] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#E94B00] ${focusRing}`}><Cpu className="h-4 w-4" /> Deploy to Preset Builder</button>
                <button type="button" onClick={requestQuote} className={`inline-flex items-center gap-2 rounded-full border border-[#FF5500]/25 px-5 py-3 text-sm font-medium text-[#C94300] hover:bg-[#FF5500]/[0.06] ${focusRing}`}><ShieldCheck className="h-4 w-4" /> Request Official Quote</button>
              </div>

              <div aria-live="polite" className="mt-3 space-y-2 text-sm">
                {notice && <p className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400"><CheckCircle2 className="h-4 w-4" /> {notice}</p>}
                {quote && (
                  <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-950/60 p-3">
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">Quote request {quote.ref}</p>
                    <p className="text-zinc-600 dark:text-zinc-400">{quote.item.name}, listed at {idr(quote.item.price)}. The ViciTech team reviews it and replies with the official quote.</p>
                    <button type="button" onClick={copyQuote} className={`mt-2 rounded border border-zinc-200 dark:border-zinc-700 px-3 py-1 text-xs text-zinc-800 dark:text-zinc-200 hover:border-emerald-600/60 dark:hover:border-emerald-400/60 ${focusRing}`}>Copy summary</button>
                  </div>
                )}
                {deployed.length > 0 && <p className="text-xs text-zinc-500">Queued for Preset Builder: {deployed.map((d) => d.name).join(", ")}</p>}
              </div>
            </section>
          </div>
        </section>
      </main>

      <footer className="border-t border-black/[0.06] py-6 text-center text-xs text-[#777C83]">ViciTech Engine v1.0. Sample catalog, prices and scores.</footer>

      {picker && <Picker cat={tab} side={picker} otherId={sel[tab][picker === "a" ? "b" : "a"]} currentId={sel[tab][picker]} onPick={(id) => choose(picker, id)} onClose={() => setPicker(null)} />}
    </div>
  );
}
