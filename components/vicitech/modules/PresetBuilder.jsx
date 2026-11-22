import { useEffect, useMemo, useState } from "react";
import {
  Sliders, CheckCircle2, Zap, Building2, GraduationCap, Gamepad2, ShoppingCart, FileText, RefreshCw,
  Cpu, CircuitBoard, MemoryStick, HardDrive, Gauge, Monitor, ShieldCheck, Truck, Bookmark, Plus, Minus, X,
  LoaderCircle,
} from "lucide-react";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { saveUserPreset } from "@/lib/supabase";
import { useCheckout } from "@/context/CheckoutContext";
import { listHardwareComponents } from "@/lib/hardware/components";

/* ───────────────────────── Catalog (sample data, prices in IDR) ───────────────────────── */

// part(id, name, spec, price, watts, warrantyMonths, extras)
const part = (id, name, spec, price, w, wr, extra = {}) => ({ id, name, spec, price, w, wr, ...extra });

const CATALOG = {
  cpu: [
    part("i3-12100", "Intel Core i3-12100", "4C / 8T, LGA1700", 1900000, 60, 36, { sk: "LGA1700" }),
    part("i5-12400", "Intel Core i5-12400", "6C / 12T, LGA1700", 2700000, 65, 36, { sk: "LGA1700" }),
    part("i5-13600k", "Intel Core i5-13600K", "14C / 20T, LGA1700", 4600000, 125, 36, { sk: "LGA1700" }),
    part("r5-7600", "AMD Ryzen 5 7600", "6C / 12T, AM5", 3900000, 65, 36, { sk: "AM5" }),
    part("r7-7800x3d", "AMD Ryzen 7 7800X3D", "8C / 16T, AM5, 3D V-Cache", 7200000, 120, 36, { sk: "AM5" }),
    part("r9-7950x", "AMD Ryzen 9 7950X", "16C / 32T, AM5", 8200000, 170, 36, { sk: "AM5" }),
  ],
  mobo: [
    part("h610m", "ASUS Prime H610M-K D4", "Micro-ATX, LGA1700, DDR4", 1150000, 30, 36, { sk: "LGA1700", ddr: 4 }),
    part("b660m", "MSI PRO B660M-A D4", "Micro-ATX, LGA1700, DDR4", 1850000, 35, 36, { sk: "LGA1700", ddr: 4 }),
    part("z790", "Gigabyte Z790 Aorus Elite", "ATX, LGA1700, DDR5", 3600000, 45, 36, { sk: "LGA1700", ddr: 5 }),
    part("a620m", "ASRock A620M-HDV", "Micro-ATX, AM5, DDR5", 1500000, 30, 36, { sk: "AM5", ddr: 5 }),
    part("b650m", "MSI MAG B650M Mortar", "Micro-ATX, AM5, DDR5", 2300000, 40, 36, { sk: "AM5", ddr: 5 }),
    part("x670e", "ASUS TUF X670E-Plus", "ATX, AM5, DDR5, upgrade-ready", 4600000, 50, 36, { sk: "AM5", ddr: 5 }),
  ],
  ram: [
    part("d4-8", "8 GB DDR4-3200", "1 × 8 GB", 400000, 4, 60, { ddr: 4, gb: 8 }),
    part("d4-16", "16 GB DDR4-3200", "2 × 8 GB", 750000, 6, 60, { ddr: 4, gb: 16 }),
    part("d5-16", "16 GB DDR5-5600", "2 × 8 GB", 950000, 6, 60, { ddr: 5, gb: 16 }),
    part("d5-32", "32 GB DDR5-6000", "2 × 16 GB", 1900000, 8, 60, { ddr: 5, gb: 32 }),
    part("d5-64", "64 GB DDR5-6000", "2 × 32 GB", 3800000, 10, 60, { ddr: 5, gb: 64 }),
  ],
  storage: [
    part("sata-256", "256 GB SATA SSD", "550 MB/s read", 450000, 3, 36),
    part("nvme-512", "512 GB NVMe SSD", "3,500 MB/s read", 750000, 5, 36),
    part("nvme-1t", "1 TB NVMe SSD", "5,000 MB/s read", 1250000, 6, 36),
    part("nvme-2t", "2 TB NVMe SSD", "7,000 MB/s read", 2400000, 8, 60),
    part("hdd-1t", "1 TB HDD 7200 rpm", "Bulk storage", 650000, 7, 24),
  ],
  gpu: [
    part("igpu", "Integrated graphics", "Uses CPU graphics", 0, 0, 36),
    part("rtx-3050", "NVIDIA RTX 3050 6GB", "6 GB GDDR6", 2500000, 70, 36),
    part("rtx-4060", "NVIDIA RTX 4060 8GB", "8 GB GDDR6", 4800000, 115, 36),
    part("rtx-4070s", "NVIDIA RTX 4070 Super", "12 GB GDDR6X", 10900000, 220, 36),
    part("rtx-4090", "NVIDIA RTX 4090", "24 GB GDDR6X", 32500000, 450, 36),
  ],
  psu: [
    part("psu-350", "350 W 80+ White", "350 W capacity", 400000, 0, 36, { cap: 350 }),
    part("psu-450", "450 W 80+ Bronze", "450 W capacity", 650000, 0, 36, { cap: 450 }),
    part("psu-550", "550 W 80+ Bronze", "550 W capacity", 850000, 0, 36, { cap: 550 }),
    part("psu-750", "750 W 80+ Gold", "750 W capacity", 1500000, 0, 60, { cap: 750 }),
    part("psu-1000", "1000 W 80+ Gold", "1,000 W capacity", 2600000, 0, 60, { cap: 1000 }),
  ],
  chassis: [
    part("mt-lab", 'Micro-ATX Case + 19.5" Monitor', "Lab bundle, durable build", 1300000, 20, 36),
    part("sff-case", "Compact SFF Case", "Slim chassis, no monitor", 700000, 0, 24),
    part("sff-dual", 'Compact SFF + Dual 24" IPS Monitors', "Multi-monitor desk setup", 3400000, 40, 36),
    part("atx-case", "ATX Airflow Mid-Tower", "Room for upgrades, no monitor", 1050000, 0, 24),
    part("atx-qhd", 'ATX Mid-Tower + 27" QHD 165 Hz', "Gaming bundle", 4500000, 35, 36),
    part("atx-4k", 'ATX Mid-Tower + 32" 4K Creator Monitor', "Color-accurate display", 7900000, 45, 36),
  ],
};

const SLOTS = [
  { key: "cpu", label: "CPU", icon: Cpu },
  { key: "mobo", label: "Motherboard", icon: CircuitBoard },
  { key: "ram", label: "RAM", icon: MemoryStick },
  { key: "storage", label: "Storage (SSD / HDD)", icon: HardDrive },
  { key: "gpu", label: "GPU", icon: Gauge },
  { key: "psu", label: "Power Supply (PSU)", icon: Zap },
  { key: "chassis", label: "Case / Monitor", icon: Monitor },
];

const PRESETS = {
  b2s: {
    id: "b2s", seg: "B2S", name: "CBT Labkom Standard", icon: GraduationCap, qty: 30,
    blurb: "Exam-ready lab PCs that stay affordable across dozens of seats.",
    focus: ["Low cost", "High durability", "Bulk order ready"],
    parts: { cpu: "i3-12100", mobo: "h610m", ram: "d4-8", storage: "sata-256", gpu: "igpu", psu: "psu-350", chassis: "mt-lab" },
  },
  b2b: {
    id: "b2b", seg: "B2B", name: "Enterprise Office Workstation", icon: Building2, qty: 5,
    blurb: "Quiet, low-power desk machines that drive two monitors.",
    focus: ["Energy efficient", "Compact form factor", "Multi-monitor support"],
    parts: { cpu: "i5-12400", mobo: "b660m", ram: "d4-16", storage: "nvme-512", gpu: "igpu", psu: "psu-350", chassis: "sff-dual" },
  },
  b2c: {
    id: "b2c", seg: "B2C", name: "Creator & Gaming Rig", icon: Gamepad2, qty: 1,
    blurb: "High frame rates and render power, with headroom to upgrade later.",
    focus: ["High FPS", "Render power", "Upgradeable"],
    parts: { cpu: "r7-7800x3d", mobo: "b650m", ram: "d5-32", storage: "nvme-1t", gpu: "rtx-4070s", psu: "psu-750", chassis: "atx-qhd" },
  },
};

const TIERS = [{ min: 10, pct: 3 }, { min: 30, pct: 5 }, { min: 100, pct: 8 }];
const MAX_QTY = 500;

/* ───────────────────────── Helpers ───────────────────────── */

const idr = (n) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
const fmtDelta = (d) => (d === 0 ? "Same price" : `${d > 0 ? "+" : "-"}${idr(Math.abs(d))}`);
const fmtDate = (d) => d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
const clampQty = (v) => Math.min(MAX_QTY, Math.max(1, parseInt(v, 10) || 1));
const discountPct = (q) => [...TIERS].reverse().find((t) => q >= t.min)?.pct ?? 0;
const makeRef = (prefix) => `${prefix}-${Date.now().toString(36).toUpperCase().slice(-6)}`;

const partOf = (slot, id) => CATALOG[slot]?.find((x) => x.id === id) || CATALOG[slot][0];
const unitTotal = (sel) => SLOTS.reduce((sum, s) => sum + partOf(s.key, sel[s.key]).price, 0);

// Keeps the board matched to the CPU socket and the RAM matched to the board's DDR generation
function fixCompat(sel) {
  const next = { ...sel };
  const cpu = partOf("cpu", next.cpu);
  const compatibleBoards = CATALOG.mobo.filter((m) => !cpu.sk || !m.sk || m.sk === cpu.sk);
  if (partOf("mobo", next.mobo).sk && cpu.sk && partOf("mobo", next.mobo).sk !== cpu.sk && compatibleBoards.length) {
    next.mobo = compatibleBoards[0].id;
  }
  const mobo = partOf("mobo", next.mobo);
  const ram = partOf("ram", next.ram);
  if (ram.ddr && mobo.ddr && ram.ddr !== mobo.ddr) {
    const pool = CATALOG.ram.filter((r) => r.ddr === mobo.ddr);
    if (pool.length) next.ram = (pool.find((r) => r.gb >= ram.gb) || pool[pool.length - 1]).id;
  }
  return next;
}

function optionsFor(slot, sel) {
  if (slot === "mobo") return CATALOG.mobo.filter((m) => m.sk === partOf("cpu", sel.cpu).sk);
  if (slot === "ram") return CATALOG.ram.filter((r) => r.ddr === partOf("mobo", sel.mobo).ddr);
  return CATALOG[slot];
}

function summarize(sel, qty) {
  const rows = SLOTS.map((s) => ({ ...s, part: partOf(s.key, sel[s.key]) }));
  const unit = rows.reduce((sum, r) => sum + r.part.price, 0);
  const watts = rows.reduce((sum, r) => sum + r.part.w, 0);
  const cap = partOf("psu", sel.psu).cap;
  const pct = discountPct(qty);
  const gross = unit * qty;
  const discount = Math.round((gross * pct) / 100);
  const basePrice = gross - discount;
  const jitBuffer = Math.round(basePrice * 0.05); // 5% JIT dynamic buffer
  const total = basePrice + jitBuffer;
  return {
    rows,
    unit,
    watts,
    cap,
    load: watts / cap,
    warranty: Math.min(...rows.map((r) => r.part.wr)),
    pct,
    gross,
    discount,
    basePrice,
    jitBuffer,
    total,
  };
}

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5500]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F6F5F2]";

/* ───────────────────────── Small UI pieces ───────────────────────── */

function PartRow({ slot, current, open, onToggle, options, deltaFor, onPick }) {
  const Icon = slot.icon;
  return (
    <li className="rounded-2xl border border-black/[0.06] bg-white shadow-[0_8px_24px_rgba(20,21,24,0.035)]">
      <div className="flex flex-wrap items-center gap-3 p-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-[#C94300] dark:text-[#C94300]">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1 basis-48">
          <p className="text-xs text-zinc-500">{slot.label}</p>
          <p className="font-medium text-zinc-900 dark:text-zinc-50">{current.name}</p>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">{current.spec}</p>
        </div>
        <div className="text-right">
          <p className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">{idr(current.price)}</p>
          <p className="text-xs tabular-nums text-zinc-500">{current.w} W, {current.wr} mo warranty</p>
        </div>
        <button
          type="button"
          aria-expanded={open}
          onClick={onToggle}
          className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${focusRing} ${
            open ? "border-[#FF5500]/30 bg-[#FF5500]/[0.06] text-[#C94300]" : "border-black/10 text-[#30343A] hover:border-[#FF5500]/40 hover:text-[#C94300]"
          }`}
        >
          <RefreshCw className="h-4 w-4" /> Swap / Upgrade
        </button>
      </div>

      {open && (
        <ul className="divide-y divide-zinc-800 border-t border-zinc-200 dark:border-zinc-800">
          {options.map((o) => {
            const isCurrent = o.id === current.id;
            const { delta, extra } = deltaFor(o);
            return (
              <li key={o.id}>
                <button
                  type="button"
                  aria-pressed={isCurrent}
                  onClick={() => onPick(o.id)}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${focusRing} ${isCurrent ? "bg-[#FF5500]/10 dark:bg-emerald-500/10" : "hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50"}`}
                >
                  {isCurrent ? <CheckCircle2 className="h-4 w-4 shrink-0 text-[#C94300] dark:text-[#C94300]" /> : <span className="h-4 w-4 shrink-0 rounded-full border border-zinc-200 dark:border-zinc-700" />}
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-zinc-900 dark:text-zinc-100">{o.name}</span>
                    <span className="block text-xs text-zinc-500">{o.spec}{extra ? ", includes matching parts" : ""}</span>
                  </span>
                  <span className={`text-sm font-medium tabular-nums ${isCurrent ? "text-[#C94300] dark:text-[#C94300]" : delta > 0 ? "text-amber-700 dark:text-amber-400" : delta < 0 ? "text-emerald-700 dark:text-emerald-400" : "text-zinc-500"}`}>
                    {isCurrent ? "Current" : fmtDelta(delta)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

function OrderDrawer({
  calc,
  preset,
  qty,
  timeline,
  notice,
  psuOk,
  qtyLabel,
  onClose,
  onSave,
  onQuote,
  onOrder,
  isSaving,
}) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    const prev = document.body.style.overflow;
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  const btn = `inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${focusRing}`;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70" onClick={onClose}>
      <aside role="dialog" aria-modal="true" aria-label="Fast-Track Pre-Order" onClick={(e) => e.stopPropagation()} className="flex h-full w-full max-w-md flex-col border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 p-5">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Fast-Track Pre-Order</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{preset.seg} {preset.name}, {qtyLabel}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close pre-order" className={`rounded-lg p-2 text-zinc-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100 ${focusRing}`}><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          <section>
            <h3 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">Itemized price per unit</h3>
            <ul className="divide-y divide-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-800">
              {calc.rows.map((r) => (
                <li key={r.key} className="flex items-baseline justify-between gap-3 px-3 py-2 text-sm">
                  <span className="min-w-0"><span className="text-zinc-500">{r.label}: </span><span className="text-zinc-900 dark:text-zinc-100">{r.part.name}</span></span>
                  <span className="shrink-0 tabular-nums text-zinc-800 dark:text-zinc-200">{idr(r.part.price)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-3 space-y-1.5 text-sm tabular-nums">
              <div className="flex justify-between text-zinc-600 dark:text-zinc-400"><dt>Unit base price</dt><dd>{idr(calc.unit)}</dd></div>
              <div className="flex justify-between text-zinc-600 dark:text-zinc-400"><dt>× {qty} unit{qty > 1 ? "s" : ""}</dt><dd>{idr(calc.gross)}</dd></div>
              {calc.pct > 0 && <div className="flex justify-between text-emerald-700 dark:text-emerald-400"><dt>Bulk discount {calc.pct}%</dt><dd>-{idr(calc.discount)}</dd></div>}
              <div className="flex justify-between border-t border-zinc-200 dark:border-zinc-800 pt-2 text-zinc-700 dark:text-zinc-300"><dt>Base price</dt><dd>{idr(calc.basePrice)}</dd></div>
              <div className="flex justify-between text-[#C94300] dark:text-[#C94300]">
                <dt className="flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5" /> JIT 5% Buffer (Dynamic Market Buffer)
                </dt>
                <dd>+{idr(calc.jitBuffer)}</dd>
              </div>
              <div className="flex justify-between border-t border-zinc-200 dark:border-zinc-800 pt-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">
                <dt>Order Total (Base + JIT)</dt>
                <dd className="text-emerald-700 dark:text-emerald-400">{idr(calc.total)}</dd>
              </div>
            </dl>
          </section>

          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300"><Truck className="h-4 w-4 text-[#C94300] dark:text-[#C94300]" /> Estimated delivery via Hub Bandung</h3>
            <ol className="space-y-3 border-l border-zinc-200 dark:border-zinc-800 pl-4">
              {timeline.map((s, i) => (
                <li key={s.label} className="relative">
                  <span className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ${i === timeline.length - 1 ? "bg-emerald-500" : "bg-[#FF5500] dark:bg-emerald-500"}`} />
                  <p className="text-sm text-zinc-900 dark:text-zinc-100">{s.label} <span className="text-zinc-500">by {s.date}</span></p>
                  <p className="text-xs text-zinc-500">{s.note}</p>
                </li>
              ))}
            </ol>
          </section>

          {notice && (
            <p role="status" className="flex gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> {notice}
            </p>
          )}
        </div>

        <div className="space-y-2 border-t border-zinc-200 dark:border-zinc-800 p-5">
          {!psuOk && <p className="text-xs text-red-700 dark:text-red-400">Power draw exceeds the PSU capacity. Swap the PSU to enable checkout.</p>}
          <button
            type="button"
            onClick={onOrder}
            disabled={!psuOk}
            className={`${btn} ${psuOk ? "bg-emerald-500 text-zinc-950 hover:bg-emerald-400 font-semibold" : "cursor-not-allowed bg-zinc-100 dark:bg-zinc-800 text-zinc-500"}`}
          >
            <span className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" /> Continue to Checkout
            </span>
          </button>
          <button type="button" onClick={onQuote} className={`${btn} border border-emerald-600/50 dark:border-emerald-400/50 text-[#C94300] dark:text-cyan-300 hover:bg-[#FF5500]/10 dark:hover:bg-emerald-500/10`}>
            <FileText className="h-4 w-4" /> {preset.seg === "B2C" ? "Request PDF Quote" : `Request Official ${preset.seg} PDF Quote`}
          </button>
          <button type="button" onClick={onSave} disabled={isSaving} className={`${btn} border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 hover:border-zinc-500 disabled:cursor-wait disabled:opacity-60`}>
            {isSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Bookmark className="h-4 w-4" />} {isSaving ? "Saving preset…" : "Save preset to Account"} Vault
          </button>
        </div>
      </aside>
    </div>
  );
}

/* ───────────────────────── Page ───────────────────────── */

export default function PresetBuilder({ onOpenEngine, onNavigate, role = "b2s", userId, importedConfig }) {
  const { triggerCheckout } = useCheckout();
  const [, setCatalogRevision] = useState(0);
  const [presetId, setPresetId] = useState(role && PRESETS[role] ? role : "b2s");
  const [sel, setSel] = useState(PRESETS[role && PRESETS[role] ? role : "b2s"].parts);
  const [qty, setQty] = useState(PRESETS[role && PRESETS[role] ? role : "b2s"].qty);
  const [openSlot, setOpenSlot] = useState(null);
  const [autoNote, setAutoNote] = useState("");
  const [drawer, setDrawer] = useState(false);
  const [notice, setNotice] = useState("");
  const [saved, setSaved] = useState([]);
  const [isSavingPreset, setIsSavingPreset] = useState(false);

  useEffect(() => {
    let active = true;
    listHardwareComponents({ activeOnly: true }).then((components) => {
      if (!active) return;
      for (const slot of Object.keys(CATALOG)) {
        CATALOG[slot] = CATALOG[slot].filter((item) => !item.inventoryId);
      }

      for (const component of components) {
        const { specs = {} } = component;
        const id = `hardware-${component.id}`;
        const price = Number(component.base_price) || 0;
        const watts = Number(specs.tdpWatts || specs.wattage || specs.boardPowerWatts) || 0;
        const ddrMatch = String(specs.memoryType || "").match(/DDR([45])/i);
        const ddr = ddrMatch ? Number(ddrMatch[1]) : null;

        if (component.category === "cpu") {
          CATALOG.cpu.push(part(id, component.name, `${specs.cores || "CPU"}C${specs.threads ? ` / ${specs.threads}T` : ""}, ${specs.socket || "socket unspecified"}`, price, watts, 36, {
            inventoryId: component.id,
            sk: specs.socket || null,
            ddr: ddr ? [ddr] : [4, 5],
          }));
        } else if (component.category === "motherboard") {
          CATALOG.mobo.push(part(id, component.name, `${specs.formFactor || "Motherboard"}, ${specs.socket || "socket unspecified"}, ${specs.memoryType || "memory unspecified"}`, price, watts || 35, 36, {
            inventoryId: component.id,
            sk: specs.socket || null,
            ddr: ddr || null,
          }));
        } else if (component.category === "ram") {
          const capacity = Number(specs.capacityGB) || 16;
          CATALOG.ram.push(part(id, component.name, `${capacity} GB${specs.speedMTs ? `, ${specs.speedMTs} MT/s` : ""}`, price, watts || 6, 60, {
            inventoryId: component.id,
            ddr: ddr || 5,
            gb: capacity,
          }));
        } else if (component.category === "storage") {
          CATALOG.storage.push(part(id, component.name, `${specs.interface || "Storage"}${specs.capacityGB ? `, ${specs.capacityGB} GB` : ""}`, price, watts || 5, 36, { inventoryId: component.id }));
        } else if (component.category === "gpu") {
          CATALOG.gpu.push(part(id, component.name, `${specs.vramGB || 0} GB ${specs.memoryType || "graphics"}`, price, watts, 36, { inventoryId: component.id }));
        } else if (component.category === "psu") {
          const capacity = Number(specs.wattage) || 0;
          CATALOG.psu.push(part(id, component.name, `${capacity} W ${specs.efficiencyRating || ""}`.trim(), price, 0, 36, { inventoryId: component.id, cap: capacity }));
        } else if (component.category === "case") {
          CATALOG.chassis.push(part(id, component.name, `${specs.formFactor || "PC case"}`, price, 0, 24, { inventoryId: component.id }));
        }
      }
      setCatalogRevision((revision) => revision + 1);
    }).catch((error) => {
      if (active) setNotice(`Hardware inventory could not be loaded: ${error.message}`);
    });
    return () => { active = false; };
  }, []);

  // Sync role default if user switches roles and has not modified parts
  useEffect(() => {
    if (role && PRESETS[role] && !importedConfig) {
      setPresetId(role);
      setSel(PRESETS[role].parts);
      setQty(PRESETS[role].qty);
    }
  }, [role, importedConfig]);

  // Support prop hand-off from Bottleneck Analyzer / Hardware Library / Versus Arena / Account
  useEffect(() => {
    if (!importedConfig) return;
    setSel((current) => {
      const next = { ...current };
      // Map parts from bottleneck analyzer
      if (importedConfig.cpu && CATALOG.cpu.some((c) => c.id === importedConfig.cpu || c.id.startsWith(importedConfig.cpu.slice(0, 4)))) {
        const found = CATALOG.cpu.find((c) => c.id === importedConfig.cpu || c.id.startsWith(importedConfig.cpu.slice(0, 4)));
        if (found) next.cpu = found.id;
      }
      if (importedConfig.gpu && CATALOG.gpu.some((g) => g.id === importedConfig.gpu || g.id.includes(importedConfig.gpu))) {
        const found = CATALOG.gpu.find((g) => g.id === importedConfig.gpu || g.id.includes(importedConfig.gpu));
        if (found) next.gpu = found.id;
      }
      if (importedConfig.ram && CATALOG.ram.some((r) => r.id === importedConfig.ram)) {
        next.ram = importedConfig.ram;
      }
      if (importedConfig.psu && CATALOG.psu.some((p) => p.id === importedConfig.psu)) {
        next.psu = importedConfig.psu;
      }
      const verified = fixCompat(next);
      return verified;
    });
    setAutoNote("Configuration imported and verified for compatibility (live price, wattage, and 5% JIT buffer updated).");
  }, [importedConfig]);

  const preset = PRESETS[presetId] || PRESETS.b2s;
  const calc = useMemo(() => summarize(sel, qty), [sel, qty]);
  const presetUnit = useMemo(() => Object.fromEntries(Object.values(PRESETS).map((p) => [p.id, unitTotal(p.parts)])), []);
  const isCustom = SLOTS.some((s) => sel[s.key] !== preset.parts[s.key]);
  const psuOk = calc.load <= 1;
  const loadPct = Math.round(calc.load * 100);
  const meter = calc.load > 1 ? "bg-red-500" : calc.load > 0.8 ? "bg-amber-400" : "bg-emerald-500";
  const nextTier = TIERS.find((t) => qty < t.min);
  const qtyLabel = `${qty} unit${qty > 1 ? "s" : ""}`;

  const timeline = useMemo(() => {
    const start = new Date();
    const build = 1 + Math.ceil(qty / 25);
    const at = (n) => { const d = new Date(start); d.setDate(d.getDate() + n); return fmtDate(d); };
    return [
      { label: "Order confirmed", note: "Verified in Supabase database", date: at(0) },
      { label: "Assembly at Hub Bandung", note: `${build} working day${build > 1 ? "s" : ""} for ${qtyLabel}`, date: at(build) },
      { label: "IoT Burn-in test and quality check", note: "Smart Bench telemetry inspection", date: at(build + 1) },
      { label: "Delivered", note: "Courier delivery or hub pickup", date: at(build + 3) },
    ];
  }, [qty, qtyLabel]);

  const choosePreset = (id) => {
    setPresetId(id); setSel(PRESETS[id].parts); setQty(PRESETS[id].qty);
    setOpenSlot(null); setAutoNote(""); setNotice("");
  };

  const swap = (slot, id) => {
    const next = fixCompat({ ...sel, [slot]: id });
    const changed = SLOTS.filter((s) => s.key !== slot && next[s.key] !== sel[s.key]).map((s) => s.label);
    setSel(next); setOpenSlot(null);
    setAutoNote(changed.length ? `${changed.join(" and ")} updated to stay compatible.` : "");
  };

  // Price change of the whole build, including parts that were auto-matched for compatibility
  const deltaFor = (slot) => (opt) => {
    const next = fixCompat({ ...sel, [slot]: opt.id });
    return { delta: unitTotal(next) - calc.unit, extra: SLOTS.some((s) => s.key !== slot && next[s.key] !== sel[s.key]) };
  };

  const savePreset = async () => {
    if (isSavingPreset) return;
    setIsSavingPreset(true);
    const time = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    const label = `${preset.seg} config, ${time}`;
    setSaved((list) => [{ id: Date.now(), presetId, sel, qty, unit: calc.unit, label }, ...list].slice(0, 5));
    try {
      await saveUserPreset({
        userId,
        name: `${preset.name} (${preset.seg})`,
        role,
        parts: calc.rows.map((r) => [r.label, r.part.name, r.part.price]),
        qty,
        unitTotal: calc.unit,
      });
      setNotice("Preset saved and synced with your ViciTech Account vault.");
    } catch {
      setNotice("Preset saved locally in memory.");
    } finally {
      setIsSavingPreset(false);
    }
  };

  const loadSaved = (s) => { setPresetId(s.presetId); setSel(s.sel); setQty(s.qty); setOpenSlot(null); setAutoNote(""); };
  const requestQuote = () => setNotice(`Quote request ${makeRef("VT-Q")} created. The official PDF will be sent within 1 business day.`);

  const submitOrder = () => {
    if (!psuOk) return;
    triggerCheckout({
      userRole: role,
      productName: `${preset.seg} ${preset.name}`,
      type: "preset_builder",
      quantity: qty,
      items: calc.rows.map((row) => ({
        id: row.key,
        label: row.label,
        name: row.part.name,
        spec: row.part.spec,
        unitPrice: row.part.price,
      })),
      specs: {
        powerDrawWatts: calc.watts,
        psuCapacityWatts: calc.cap,
        warrantyMonths: calc.warranty,
        presetName: `${preset.seg} ${preset.name}`,
      },
      pricing: {
        basePrice: calc.basePrice,
        jitBuffer: calc.jitBuffer,
        total: calc.total,
      },
      notes: `${qty} unit${qty === 1 ? "" : "s"}; ${calc.pct}% bulk discount`,
    });
    setDrawer(false);
  };

  const closeDrawer = () => { setDrawer(false); setNotice(""); };

  const iconBtn = `vt-btn-tactile grid h-10 w-10 place-items-center rounded-xl border border-black/10 bg-white text-[#5A606A] hover:border-[#FF5500]/40 hover:text-[#C94300] ${focusRing}`;

  return (
    <div className="bg-[#F6F5F2] text-[#141518] antialiased">
      <div className="mx-auto max-w-7xl px-4 pb-28 pt-10 sm:px-6 lg:pb-12">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#FF5500]">Build with confidence</p>
        <h1 className="flex items-center gap-3 font-serif text-4xl font-semibold tracking-tight text-[#141518] sm:text-5xl">
          <Sliders className="h-8 w-8 text-[#FF5500]" /> Smart Preset Builder &amp; Configurator
        </h1>
        <p className="mt-4 max-w-2xl leading-relaxed text-[#5A606A]">
          Start from a curated build for your segment, swap any part, and watch price, power draw and live 5% JIT buffer update as you go.
        </p>

        {/* Preset selector */}
        <div role="radiogroup" aria-label="Choose a preset" className="mt-8 grid gap-4 md:grid-cols-3">
          {Object.values(PRESETS).map((p) => {
            const active = p.id === presetId;
            const Icon = p.icon;
            return (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => choosePreset(p.id)}
                className={`vt-card-interactive flex flex-col rounded-2xl border p-5 text-left ${focusRing} ${active ? "border-[#FF5500]/30 bg-white ring-1 ring-[#FF5500]/15 shadow-[0_12px_32px_rgba(255,85,0,0.08)]" : "border-black/[0.07] bg-white/70 hover:border-black/15"}`}
              >
                <span className="flex items-center gap-3">
                  <span className={`grid h-10 w-10 place-items-center rounded-xl ${active ? "bg-[#FF5500] text-white" : "bg-[#F6F5F2] text-[#5A606A]"}`}><Icon className="h-5 w-5" /></span>
                  <span>
                  <span className="block text-xs font-medium text-[#C94300]">{p.seg}</span>
                    <span className="block font-semibold text-zinc-900 dark:text-zinc-50">{p.name}</span>
                  </span>
                </span>
                <span className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">{p.blurb}</span>
                <span className="mt-3 flex flex-wrap gap-1.5">
                  {p.focus.map((f) => <span key={f} className="rounded-full border border-zinc-200 dark:border-zinc-700 px-2 py-0.5 text-xs text-zinc-700 dark:text-zinc-300">{f}</span>)}
                </span>
                <span className="mt-4 text-sm text-zinc-500">From <span className="font-semibold tabular-nums text-zinc-800 dark:text-zinc-200">{idr(presetUnit[p.id])}</span> per unit</span>
              </button>
            );
          })}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          {/* Component list */}
          <section className="lg:col-span-2" aria-label="Components">
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Components</h2>
              {isCustom && <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-xs text-amber-700 dark:text-amber-300">Customized</span>}
              {isCustom && (
                <button type="button" onClick={() => choosePreset(presetId)} className={`ml-auto inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-zinc-600 dark:text-zinc-400 hover:text-[#C94300] dark:hover:text-[#C94300] ${focusRing}`}>
                  <RefreshCw className="h-4 w-4" /> Reset to preset
                </button>
              )}
            </div>
            {autoNote && (
              <p role="status" className="mb-3 flex items-center gap-2 rounded-2xl border border-[#FF5500]/20 bg-[#FF5500]/[0.05] p-3 text-sm text-[#8B3100]">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-[#C94300] dark:text-[#C94300]" /> {autoNote}
              </p>
            )}
            <ul className="space-y-3">
              {calc.rows.map((r) => (
                <PartRow
                  key={r.key}
                  slot={r}
                  current={r.part}
                  open={openSlot === r.key}
                  onToggle={() => setOpenSlot(openSlot === r.key ? null : r.key)}
                  options={optionsFor(r.key, sel)}
                  deltaFor={deltaFor(r.key)}
                  onPick={(id) => swap(r.key, id)}
                />
              ))}
            </ul>
          </section>

          {/* Live summary */}
          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start" aria-label="Build summary">
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 p-5">
              <p className="text-sm text-zinc-500">Unit base price</p>
              <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                <AnimatedNumber value={calc.unit} format="currency" />
              </p>

              <div className="mt-4 flex items-center justify-between gap-3">
                <label htmlFor="qty" className="text-sm text-zinc-600 dark:text-zinc-400">Quantity</label>
                <div className="flex items-center gap-2">
                  <button type="button" aria-label="Decrease units" className={iconBtn} onClick={() => setQty((q) => clampQty(q - 1))}><Minus className="h-4 w-4" /></button>
                  <input id="qty" type="number" min={1} max={MAX_QTY} value={qty} onChange={(e) => setQty(clampQty(e.target.value))} className={`h-9 w-20 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-center tabular-nums ${focusRing}`} />
                  <button type="button" aria-label="Increase units" className={iconBtn} onClick={() => setQty((q) => clampQty(q + 1))}><Plus className="h-4 w-4" /></button>
                </div>
              </div>
              {calc.pct > 0 && <p className="mt-3 flex justify-between text-sm text-emerald-700 dark:text-emerald-400"><span>Bulk discount {calc.pct}%</span><AnimatedNumber value={calc.discount} format="currency" prefix="-" /></p>}
              {nextTier && <p className="mt-1 text-xs text-zinc-500">Add {nextTier.min - qty} more unit{nextTier.min - qty > 1 ? "s" : ""} for {nextTier.pct}% off.</p>}

              <div className="mt-4 space-y-1.5 border-t border-zinc-200 dark:border-zinc-800 pt-4">
                <div className="flex justify-between text-xs text-zinc-600 dark:text-zinc-400">
                  <span>Base price ({qty}x)</span>
                  <AnimatedNumber value={calc.basePrice} format="currency" />
                </div>
                <div className="flex justify-between text-xs text-[#C94300] dark:text-[#C94300]">
                  <span className="flex items-center gap-1"><Zap className="h-3 w-3" /> JIT 5% Buffer</span>
                  <AnimatedNumber value={calc.jitBuffer} format="currency" prefix="+" />
                </div>
                <div className="flex justify-between border-t border-zinc-200/80 dark:border-zinc-800/80 pt-2 text-base font-semibold">
                  <span className="text-zinc-800 dark:text-zinc-200">Order total</span>
                  <AnimatedNumber value={calc.total} format="currency" className="text-emerald-700 dark:text-emerald-400" />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 p-5">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300"><Zap className="h-4 w-4 text-[#C94300] dark:text-[#C94300]" /> Estimated power draw</span>
                <AnimatedNumber value={calc.watts} format="number" suffix=" W" className="font-semibold text-zinc-900 dark:text-zinc-50" />
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800" role="meter" aria-valuemin={0} aria-valuemax={calc.cap} aria-valuenow={calc.watts} aria-label="Power draw against PSU capacity">
                <div className={`h-full rounded-full transition-all ${meter}`} style={{ width: `${Math.min(100, loadPct)}%` }} />
              </div>
              <p className="mt-2 text-xs tabular-nums text-zinc-500">
                <AnimatedNumber value={loadPct} format="percent" /> of {calc.cap} W PSU capacity
              </p>
              {!psuOk && <p className="mt-2 text-xs text-red-700 dark:text-red-400">Draw exceeds PSU capacity. Swap to a larger power supply.</p>}
              {psuOk && calc.load > 0.8 && <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">Little headroom left. A larger PSU leaves room to upgrade.</p>}
              <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-sm text-emerald-700 dark:text-emerald-400" title="The shortest warranty among the selected parts">
                <ShieldCheck className="h-4 w-4" /> {calc.warranty}-month warranty
              </p>
            </div>

            <button
              type="button"
              onClick={() => setDrawer(true)}
              className={`vt-btn-tactile hidden w-full items-center justify-center gap-2 rounded-full bg-[#FF5500] px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#E94B00] lg:inline-flex ${focusRing}`}
            >
              <ShoppingCart className="h-4 w-4" /> Review Fast-Track Pre-Order
            </button>

            {saved.length > 0 && (
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 p-4">
                <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300"><Bookmark className="h-4 w-4 text-[#C94300] dark:text-[#C94300]" /> Saved presets</h3>
                <ul className="space-y-1">
                  {saved.map((s) => (
                    <li key={s.id} className="flex items-center gap-2 text-sm">
                      <span className="min-w-0 flex-1 truncate text-zinc-800 dark:text-zinc-200">{s.label}</span>
                      <span className="tabular-nums text-xs text-zinc-500">{idr(s.unit)}</span>
                      <button type="button" onClick={() => loadSaved(s)} className={`rounded px-2 py-1 text-xs text-[#C94300] dark:text-[#C94300] hover:bg-[#FF5500]/10 dark:hover:bg-emerald-500/10 ${focusRing}`}>Load</button>
                      <button type="button" aria-label={`Delete ${s.label}`} onClick={() => setSaved((l) => l.filter((x) => x.id !== s.id))} className={`rounded p-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 ${focusRing}`}><X className="h-3.5 w-3.5" /></button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
        </div>
      </div>

      {/* Mobile action bar */}
      <div className="fixed inset-x-0 bottom-0 z-20 flex items-center gap-3 border-t border-black/[0.06] bg-[#F6F5F2]/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-zinc-500">Order total, {qtyLabel} (incl. 5% JIT)</p>
          <p className="truncate font-semibold text-emerald-700 dark:text-emerald-400">
            <AnimatedNumber value={calc.total} format="currency" />
          </p>
        </div>
        <button type="button" onClick={() => setDrawer(true)} className={`vt-btn-tactile inline-flex items-center gap-2 rounded-full bg-[#FF5500] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#E94B00] ${focusRing}`}>
          <ShoppingCart className="h-4 w-4" /> Checkout
        </button>
      </div>

      {drawer && (
        <OrderDrawer
          calc={calc}
          preset={preset}
          qty={qty}
          qtyLabel={qtyLabel}
          timeline={timeline}
          notice={notice}
          psuOk={psuOk}
          onClose={closeDrawer}
          onSave={savePreset}
          onQuote={requestQuote}
          onOrder={submitOrder}
          isSaving={isSavingPreset}
        />
      )}
    </div>
  );
}
