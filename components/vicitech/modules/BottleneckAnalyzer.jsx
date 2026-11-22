import { useEffect, useMemo, useState } from "react";
import {
  Cpu, Activity, Gauge, AlertTriangle, CheckCircle2, Zap, Monitor, BarChart2, Sparkles, ArrowUpRight, RefreshCw,
} from "lucide-react";
import { listHardwareComponents } from "@/lib/hardware/components";

/* ───────────────────────── Parts catalog (sample data, prices in IDR) ───────────────────────── */
// gaming / mt: CPU gaming and multi-thread indexes (0-100). peak: sustained peak package power in W.
// raster: GPU raster index (0-100). tbp: board power in W. perf: RAM speed / channel factor. cap: cooler or PSU capacity in W.

const CPUS = [
  { id: "i3-12100f", name: "Intel Core i3-12100F", price: 1600000, socket: "LGA1700", ddr: [4, 5], gaming: 52, mt: 38, peak: 89 },
  { id: "i5-12400f", name: "Intel Core i5-12400F", price: 2300000, socket: "LGA1700", ddr: [4, 5], gaming: 62, mt: 52, peak: 117 },
  { id: "r5-5600", name: "AMD Ryzen 5 5600", price: 2200000, socket: "AM4", ddr: [4], gaming: 63, mt: 51, peak: 88 },
  { id: "r5-7600", name: "AMD Ryzen 5 7600", price: 3900000, socket: "AM5", ddr: [5], gaming: 76, mt: 58, peak: 88 },
  { id: "i7-13700k", name: "Intel Core i7-13700K", price: 6500000, socket: "LGA1700", ddr: [4, 5], gaming: 88, mt: 85, peak: 253 },
  { id: "r7-7800x3d", name: "AMD Ryzen 7 7800X3D", price: 7200000, socket: "AM5", ddr: [5], gaming: 96, mt: 70, peak: 120 },
  { id: "r9-7950x", name: "AMD Ryzen 9 7950X", price: 8200000, socket: "AM5", ddr: [5], gaming: 92, mt: 100, peak: 230 },
];
const GPUS = [
  { id: "igpu", name: "Integrated Graphics", price: 0, raster: 10, vram: 0, tbp: 0 },
  { id: "rx6600", name: "Radeon RX 6600 8GB", price: 3000000, raster: 40, vram: 8, tbp: 132 },
  { id: "rtx3060", name: "GeForce RTX 3060 12GB", price: 3600000, raster: 44, vram: 12, tbp: 170 },
  { id: "rtx4060", name: "GeForce RTX 4060 8GB", price: 4800000, raster: 52, vram: 8, tbp: 115 },
  { id: "rtx4070", name: "GeForce RTX 4070 12GB", price: 8900000, raster: 66, vram: 12, tbp: 200 },
  { id: "rx7800xt", name: "Radeon RX 7800 XT 16GB", price: 8700000, raster: 78, vram: 16, tbp: 263 },
  { id: "rtx4090", name: "GeForce RTX 4090 24GB", price: 32500000, raster: 100, vram: 24, tbp: 450 },
];
const RAMS = [
  { id: "d4-8", label: "8 GB DDR4-2666, single channel", price: 400000, gb: 8, ddr: 4, perf: 0.88 },
  { id: "d4-16", label: "16 GB DDR4-3200, dual channel", price: 750000, gb: 16, ddr: 4, perf: 1 },
  { id: "d4-32", label: "32 GB DDR4-3200, dual channel", price: 1500000, gb: 32, ddr: 4, perf: 1 },
  { id: "d5-16", label: "16 GB DDR5-6000, dual channel", price: 1100000, gb: 16, ddr: 5, perf: 1.04 },
  { id: "d5-32", label: "32 GB DDR5-6000, dual channel", price: 2100000, gb: 32, ddr: 5, perf: 1.04 },
  { id: "d5-64", label: "64 GB DDR5-6000, dual channel", price: 4000000, gb: 64, ddr: 5, perf: 1.04 },
];
const COOLERS = [
  { id: "stock", name: "Stock cooler", price: 0, cap: 95 },
  { id: "tower-mid", name: "Mid-range tower cooler", price: 350000, cap: 160 },
  { id: "tower-high", name: "High-end dual-tower cooler", price: 750000, cap: 230 },
  { id: "aio-240", name: "240 mm liquid cooler", price: 1300000, cap: 260 },
  { id: "aio-360", name: "360 mm liquid cooler", price: 2100000, cap: 340 },
];
const PSUS = [
  { id: "psu-450", name: "450 W 80+ Bronze", price: 650000, w: 450 },
  { id: "psu-550", name: "550 W 80+ Bronze", price: 850000, w: 550 },
  { id: "psu-650", name: "650 W 80+ Gold", price: 1100000, w: 650 },
  { id: "psu-750", name: "750 W 80+ Gold", price: 1500000, w: 750 },
  { id: "psu-850", name: "850 W 80+ Gold", price: 1900000, w: 850 },
  { id: "psu-1000", name: "1000 W 80+ Gold", price: 2600000, w: 1000 },
];
const LISTS = { cpu: CPUS, gpu: GPUS, ram: RAMS, cooler: COOLERS, psu: PSUS };
const LABEL = { cpu: "CPU", gpu: "GPU", ram: "RAM", cooler: "CPU cooler" };

const WORKLOADS = {
  esports: { id: "esports", label: "1080p Esports", sub: "Valorant, CS2 at low and medium", res: "1080p", kind: "game", need: 8, heat: 0.6, other: "GPU" },
  aaa: { id: "aaa", label: "1440p AAA Gaming", sub: "Cyberpunk 2077, GTA V at high", res: "1440p", kind: "game", need: 16, heat: 0.6, other: "GPU" },
  render: { id: "render", label: "4K Video Editing / Rendering", sub: "Timeline editing and 4K export", res: "4K", kind: "render", need: 32, heat: 1, other: "GPU" },
  cbt: { id: "cbt", label: "CBT Server Workload", sub: "Exam server for a school lab", res: "", kind: "server", need: 16, heat: 0.85, other: "RAM" },
};
const DEFAULT_CFG = { cpu: "i5-12400f", gpu: "rtx3060", ram: "d4-16", cooler: "tower-mid", psu: "psu-550", workload: "esports" };

/* ───────────────────────── Scoring model ───────────────────────── */

const get = (kind, id) => LISTS[kind].find((x) => x.id === id);
const idr = (n) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
const fmtDelta = (d) => (d === 0 ? "No extra cost" : `${d > 0 ? "+" : "-"}${idr(Math.abs(d))}`);
const fpsTag = (f) => (f >= 240 ? "Great for 240 Hz" : f >= 144 ? "Great for 144 Hz" : f >= 60 ? "Smooth at 60 FPS" : "Below 60 FPS");

// Keeps RAM on a generation the selected CPU supports (cheapest kit that is at least as large)
function fixRam(cfg) {
  const cpu = get("cpu", cfg.cpu);
  const ram = get("ram", cfg.ram);
  if (cpu.ddr.includes(ram.ddr)) return cfg;
  const pool = RAMS.filter((r) => cpu.ddr.includes(r.ddr));
  if (!pool.length) return cfg;
  const pick = pool.filter((r) => r.gb >= ram.gb).sort((a, b) => a.price - b.price)[0] ?? pool[pool.length - 1];
  return { ...cfg, ram: pick.id };
}

function analyze(cfg) {
  const cpu = get("cpu", cfg.cpu), gpu = get("gpu", cfg.gpu), ram = get("ram", cfg.ram), cooler = get("cooler", cfg.cooler), psu = get("psu", cfg.psu);
  const w = WORKLOADS[cfg.workload];
  const cap = (need) => (ram.gb >= need ? 1 : Math.sqrt(ram.gb / need)); // capacity penalty
  const cool = (h) => { const heat = cpu.peak * h; return heat <= cooler.cap ? 1 : Math.max(0.75, cooler.cap / heat); }; // thermal throttling

  // What each side can deliver, in the workload's own units
  const E = { c: cpu.gaming * 4 * ram.perf * cap(8) * cool(0.6), g: gpu.raster * 7 };
  const A = { c: cpu.gaming * 1.9 * ram.perf * cap(16) * cool(0.6), g1080: gpu.raster * 2.4, g1440: gpu.raster * 1.63 };
  const R = { c: cpu.mt * cap(32) * cool(1), g: gpu.raster * 1.1 };
  const S = { c: cpu.mt * cool(0.85), r: Math.min(100, ram.gb * 3.4) * ram.perf };

  const render = Math.round(2 / (1 / R.c + 1 / R.g));
  const perf = {
    esports: Math.round(Math.min(E.c, E.g)),
    aaa1080: Math.round(Math.min(A.c, A.g1080)),
    aaa1440: Math.round(Math.min(A.c, A.g1440)),
    render,
    exportMin: Math.round((600 / render) * 10) / 10,
    clients: Math.round(Math.min(S.c, S.r) * 0.9),
  };

  const [c, o] = { esports: [E.c, E.g], aaa: [A.c, A.g1440], render: [R.c, R.g], cbt: [S.c, S.r] }[w.id];
  const lo = Math.min(c, o), hi = Math.max(c, o);
  const pct = Math.round((1 - lo / hi) * 100);
  const rFac = w.kind === "server" ? 1 : ram.perf * cap(w.need);
  const cFac = cool(w.heat);
  const limiter = c > o ? w.other : rFac < 0.92 && rFac <= cFac ? "RAM" : cFac < 0.92 ? "Cooling" : "CPU";
  const loads = { cpu: Math.round((lo / c) * 100), other: Math.round((lo / o) * 100) };

  const draw = cpu.peak + gpu.tbp + 60; // CPU + GPU + board, drives and fans
  const heat = Math.round(cpu.peak * w.heat);
  const level = (x, warn) => (x <= warn ? "ok" : x <= 1 ? "warn" : "critical");
  const power = { draw, load: draw / psu.w, status: level(draw / psu.w, 0.8), rec: PSUS.find((p) => draw <= p.w * 0.8) ?? PSUS[PSUS.length - 1] };
  const cooling = { heat, load: heat / cooler.cap, status: level(heat / cooler.cap, 0.85), rec: COOLERS.find((k) => heat <= k.cap * 0.85) ?? COOLERS[COOLERS.length - 1] };
  const total = [cpu, gpu, ram, cooler, psu].reduce((s, x) => s + x.price, 0);

  return { cpu, gpu, ram, cooler, psu, w, perf, pct, sev: pct <= 10 ? 0 : pct <= 25 ? 1 : 2, limiter, cpuSide: c <= o, loads, power, cooling, total };
}

// Candidate fixes are simulated through analyze(), so every suggestion is scored by the same model
function buildRecs(cfg) {
  const a = analyze(cfg);
  const recs = [];
  const mk = (id, title, next, detail, hardware = true) => {
    const after = analyze(next);
    return { id, title, next, after, cost: after.total - a.total, detail: detail(after, after.total - a.total), hardware };
  };

  if (a.pct > 15) {
    const kind = { CPU: "cpu", GPU: "gpu", RAM: "ram", Cooling: "cooler" }[a.limiter];
    const cpu = get("cpu", cfg.cpu);
    const opts = LISTS[kind]
      .filter((x) => x.id !== cfg[kind] && (kind !== "ram" || cpu.ddr.includes(x.ddr)))
      .map((x) => {
        const next = fixRam({ ...cfg, [kind]: x.id });
        const notes = [];
        if (kind === "cpu" && x.socket !== cpu.socket) notes.push("Needs a new motherboard.");
        if (next.ram !== cfg.ram) notes.push(`RAM switches to ${get("ram", next.ram).label}.`);
        return mk(`fix-${x.id}`, `Upgrade ${LABEL[kind]} to ${x.name ?? x.label}`, next, (r, d) => `Bottleneck ${a.pct}% to ${r.pct}%. ${fmtDelta(d)} for parts. ${notes.join(" ")}`.trim());
      });
    const best = opts.filter((o) => o.after.pct <= 15).sort((p, q) => p.cost - q.cost)[0] ?? opts.filter((o) => o.after.pct < a.pct).sort((p, q) => p.after.pct - q.after.pct)[0];
    if (best) recs.push(best);

    if (a.w.kind === "game") {
      Object.values(WORKLOADS).filter((x) => x.kind === "game" && x.id !== cfg.workload).forEach((x) => {
        const r = mk(`wl-${x.id}`, `Switch target to ${x.label}`, { ...cfg, workload: x.id }, (after) => `Bottleneck ${a.pct}% to ${after.pct}%. ${x.id === "aaa" ? "A higher resolution shifts load onto the GPU." : "A lower resolution eases the load on the GPU."}`, false);
        if (r.after.pct <= 15 && r.after.pct < a.pct - 10) recs.push(r);
      });
    }
  }
  if (a.power.status !== "ok" && a.power.rec.id !== cfg.psu) recs.push(mk("psu", `Upgrade PSU to ${a.power.rec.name}`, { ...cfg, psu: a.power.rec.id }, (r, d) => `Peak draw is about ${a.power.draw} W. ${fmtDelta(d)}.`));
  if (a.cooling.status !== "ok" && a.limiter !== "Cooling" && a.cooling.rec.id !== cfg.cooler) recs.push(mk("cooler", `Upgrade CPU cooler to ${a.cooling.rec.name}`, { ...cfg, cooler: a.cooling.rec.id }, (r, d) => `The CPU needs to shed about ${a.cooling.heat} W. ${fmtDelta(d)}.`));
  return recs;
}

function autoFix(cfg) {
  let c = cfg;
  const steps = [];
  for (let i = 0; i < 4; i++) {
    const rec = buildRecs(c).find((r) => r.hardware);
    if (!rec) break;
    steps.push(rec.title.charAt(0).toLowerCase() + rec.title.slice(1));
    c = rec.next;
  }
  return { cfg: c, steps };
}

/* ───────────────────────── UI pieces ───────────────────────── */

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5500]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F6F5F2]";
const selectCls = `w-full rounded-xl border border-black/10 bg-white px-3.5 py-3 text-sm text-[#141518] shadow-sm ${focusRing}`;
const SEV = [
  { label: "Balanced system", text: "text-emerald-700", stroke: "stroke-emerald-500", chip: "border-emerald-600/20 bg-emerald-50 text-emerald-800" },
  { label: "Slight bottleneck (acceptable)", text: "text-amber-700", stroke: "stroke-amber-500", chip: "border-amber-600/20 bg-amber-50 text-amber-800" },
  { label: "High bottleneck", text: "text-rose-700", stroke: "stroke-rose-500", chip: "border-rose-600/20 bg-rose-50 text-rose-800" },
];
const STATUS = { ok: ["text-emerald-700", CheckCircle2, "OK"], warn: ["text-amber-700", AlertTriangle, "Tight"], critical: ["text-rose-700", AlertTriangle, "Insufficient"] };
const HINT = {
  CPU: "The GPU waits on the CPU for frames. A faster CPU, or a target that loads the GPU harder, uses the GPU fully.",
  GPU: "The CPU has headroom to spare. For more performance, upgrade the GPU or lower the resolution or settings.",
  RAM: "Memory capacity or speed is starving the CPU. More RAM, or a faster dual-channel kit, removes the limit.",
  Cooling: "The CPU cooler can't remove enough heat, so the CPU throttles. A larger cooler restores full speed.",
};

function MeterGauge({ pct, sev }) {
  const len = Math.PI * 80;
  const frac = Math.min(pct, 50) / 50; // 25% sits at the midpoint so the 10% and 25% zone borders stay readable
  return (
    <svg viewBox="0 0 200 116" className="mx-auto w-full max-w-xs" role="img" aria-label={`Bottleneck ${pct} percent, ${SEV[sev].label}`}>
      <path d="M20 100 A80 80 0 0 1 180 100" fill="none" strokeWidth="14" strokeLinecap="round" className="stroke-black/10" />
      <path d="M20 100 A80 80 0 0 1 180 100" fill="none" strokeWidth="14" strokeLinecap="round" strokeDasharray={`${len * frac} ${len}`} className={`${SEV[sev].stroke} transition-all duration-500`} />
      <line x1="43.4" y1="58.8" x2="27.2" y2="47.1" strokeWidth="2" className="stroke-[#F6F5F2]" />
      <line x1="100" y1="30" x2="100" y2="10" strokeWidth="2" className="stroke-[#F6F5F2]" />
      <text x="100" y="94" textAnchor="middle" fontSize="34" fontWeight="600" className="fill-[#141518]">{pct}%</text>
    </svg>
  );
}

function LoadBar({ label, value, limiting }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-[#5A606A]">{label} load {limiting && <span className="ml-1 rounded-full bg-[#FF5500]/10 px-2 py-0.5 text-xs font-medium text-[#C94300]">limiting</span>}</span>
        <span className="tabular-nums font-medium text-[#141518]">{value}%</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-black/[0.07]">
        <div className={`h-full rounded-full transition-all duration-500 ${limiting ? "bg-[#FF5500]" : value >= 85 ? "bg-emerald-500" : "bg-amber-500"}`} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
    </div>
  );
}

function PerfCard({ icon: Icon, title, sub, active, children }) {
  return (
    <section className={`rounded-2xl border p-5 ${active ? "border-[#FF5500]/30 bg-[#FF5500]/[0.035] ring-1 ring-[#FF5500]/10" : "border-black/[0.07] bg-white/70"}`}>
      <h3 className="flex items-center gap-2 text-sm font-semibold text-[#141518]"><Icon className="h-4 w-4 text-[#FF5500]" /> {title}
        {active && <span className="ml-auto rounded-full bg-[#FF5500]/10 px-2.5 py-1 text-[11px] font-medium text-[#C94300]">Selected</span>}
      </h3>
      <p className="text-xs text-[#777C83]">{sub}</p>
      {children}
    </section>
  );
}
const Row = ({ k, v, className = "text-[#141518]" }) => <div className="flex justify-between gap-3 py-1 text-sm"><dt className="text-[#777C83]">{k}</dt><dd className={`text-right tabular-nums ${className}`}>{v}</dd></div>;
const Big = ({ value, unit, tag }) => <p className="mt-3"><span className="font-serif text-3xl font-semibold tabular-nums tracking-tight text-[#141518]">{value}</span> <span className="text-sm text-[#5A606A]">{unit}</span>{tag && <span className="ml-2 text-xs font-medium text-[#C94300]">{tag}</span>}</p>;

function Field({ id, label, icon: Icon, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 flex items-center gap-2 text-sm font-medium text-[#30343A]">{Icon && <Icon className="h-4 w-4 text-[#FF5500]" />} {label}</label>
      {children}
    </div>
  );
}

/* ───────────────────────── Page ───────────────────────── */

export default function BottleneckAnalyzer({ onSwapToPreset }) {
  const [, setCatalogRevision] = useState(0);
  const [cfg, setCfg] = useState(DEFAULT_CFG);
  const [note, setNote] = useState("");
  const [catalogError, setCatalogError] = useState("");

  useEffect(() => {
    let active = true;
    listHardwareComponents({ activeOnly: true }).then((components) => {
      if (!active) return;
      for (const list of Object.values(LISTS)) {
        for (let index = list.length - 1; index >= 0; index -= 1) {
          if (list[index].inventoryId) list.splice(index, 1);
        }
      }

      for (const component of components) {
        const { specs = {} } = component;
        const id = `hardware-${component.id}`;
        const price = Number(component.base_price) || 0;
        const performance = Math.max(1, Math.min(100, Number(component.performance_score) / 100));
        const ddrMatch = String(specs.memoryType || "").match(/DDR([45])/i);
        const ddr = ddrMatch ? Number(ddrMatch[1]) : null;

        if (component.category === "cpu") {
          CPUS.push({
            id,
            inventoryId: component.id,
            name: component.name,
            price,
            socket: specs.socket || "Unknown",
            ddr: ddr ? [ddr] : [4, 5],
            gaming: performance,
            mt: performance,
            peak: Number(specs.tdpWatts) || 95,
          });
        } else if (component.category === "gpu") {
          GPUS.push({
            id,
            inventoryId: component.id,
            name: component.name,
            price,
            raster: performance,
            vram: Number(specs.vramGB) || 0,
            tbp: Number(specs.tdpWatts || specs.boardPowerWatts) || 150,
          });
        } else if (component.category === "ram") {
          RAMS.push({
            id,
            inventoryId: component.id,
            label: `${component.name} (${Number(specs.capacityGB) || 16} GB)`,
            price,
            gb: Number(specs.capacityGB) || 16,
            ddr: ddr || 5,
            perf: Math.max(0.75, Math.min(1.2, (Number(specs.speedMTs) || 4800) / 6000)),
          });
        } else if (component.category === "psu") {
          PSUS.push({
            id,
            inventoryId: component.id,
            name: component.name,
            price,
            w: Number(specs.wattage) || 0,
          });
        } else if (component.category === "cooling") {
          COOLERS.push({
            id,
            inventoryId: component.id,
            name: component.name,
            price,
            cap: Number(specs.coolingCapacityWatts || specs.maxTdpWatts) || 95,
          });
        }
      }
      setCatalogRevision((revision) => revision + 1);
    }).catch((error) => {
      if (active) setCatalogError(`Hardware inventory could not be loaded: ${error.message}`);
    });
    return () => { active = false; };
  }, []);

  const a = useMemo(() => analyze(cfg), [cfg]);
  const recs = useMemo(() => buildRecs(cfg), [cfg]);
  const fix = useMemo(() => autoFix(cfg), [cfg]);
  const fixed = useMemo(() => analyze(fix.cfg), [fix]);

  const sev = SEV[a.sev];
  const { w, perf, power, cooling } = a;
  const cpuSide = a.cpuSide;
  const limLabel = a.limiter === "Cooling" ? "CPU cooler" : a.limiter;
  const heldBack = cpuSide ? w.other : "CPU";
  const message = a.pct <= 10
    ? `Balanced: the CPU and ${w.other} are well matched for ${w.label}.`
    : `Your ${limLabel} is limiting your ${heldBack} by ${a.pct}%${w.res ? ` at ${w.res}` : ""}.`;
  const headline = { esports: `${perf.esports} FPS average`, aaa: `${perf.aaa1440} FPS average`, render: `${perf.exportMin} min to export a 10-minute 4K timeline`, cbt: `About ${perf.clients} concurrent exam clients` }[w.id];

  const update = (patch) => {
    const next = fixRam({ ...cfg, ...patch });
    setNote(next.ram !== cfg.ram && !("ram" in patch) ? `RAM changed to ${get("ram", next.ram).label} to match the ${get("cpu", next.cpu).name} platform.` : "");
    setCfg(next);
  };
  const apply = (rec) => { setCfg(rec.next); setNote(`Applied: ${rec.title}.`); };
  const swap = () => {
    setCfg(fix.cfg);
    setNote(`Swapped to preset (${fix.steps.join(", ")}).`);
    const { workload, ...parts } = fix.cfg;
    onSwapToPreset?.(parts);
  };

  return (
    <div className="bg-[#F6F5F2] text-[#141518] antialiased">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="max-w-4xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#FF5500]">Build with confidence</p>
          <h1 className="font-serif text-4xl font-semibold leading-tight tracking-tight text-[#141518] sm:text-5xl">Find the balance in your build.</h1>
          <p className="mt-4 max-w-2xl leading-relaxed text-[#5A606A]">Pair a CPU, GPU and RAM with your target workload to see which part limits performance, what frame rates to expect and whether your PSU and cooler keep up.</p>
          <p className="mt-3 flex max-w-2xl gap-2 text-xs leading-relaxed text-[#777C83]"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#FF5500]" /> Results come from a simplified scoring model, not live benchmarks. Treat them as a planning guide.</p>
        </div>
        {catalogError && <p role="status" className="mt-3 rounded-2xl border border-amber-600/20 bg-amber-50 px-4 py-3 text-sm text-amber-800">{catalogError} Showing the curated analyzer data instead.</p>}

        <div className="mt-8 grid gap-6 lg:grid-cols-5">
          {/* Input panel */}
          <section aria-labelledby="cfg-title" className="space-y-5 rounded-3xl border border-black/[0.06] bg-white p-6 shadow-[0_12px_36px_rgba(20,21,24,0.04)] lg:col-span-2 lg:self-start">
            <div className="flex items-center justify-between">
              <h2 id="cfg-title" className="font-serif text-xl font-semibold text-[#141518]">Hardware pairing</h2>
              <button type="button" onClick={() => { setCfg(DEFAULT_CFG); setNote(""); }} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-[#5A606A] hover:bg-black/[0.04] hover:text-[#C94300] ${focusRing}`}><RefreshCw className="h-4 w-4" /> Reset</button>
            </div>

            <Field id="cpu" label="CPU" icon={Cpu}>
              <select id="cpu" value={cfg.cpu} onChange={(e) => update({ cpu: e.target.value })} className={selectCls}>{CPUS.map((x) => <option key={x.id} value={x.id}>{x.name} ({x.socket})</option>)}</select>
            </Field>
            <Field id="gpu" label="GPU" icon={Monitor}>
              <select id="gpu" value={cfg.gpu} onChange={(e) => update({ gpu: e.target.value })} className={selectCls}>{GPUS.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
            </Field>
            <Field id="ram" label="RAM capacity and speed" icon={BarChart2}>
              <select id="ram" value={cfg.ram} onChange={(e) => update({ ram: e.target.value })} className={selectCls}>
                {RAMS.map((x) => { const ok = a.cpu.ddr.includes(x.ddr); return <option key={x.id} value={x.id} disabled={!ok}>{x.label}{ok ? "" : " (needs a different CPU platform)"}</option>; })}
              </select>
            </Field>

            <fieldset>
              <legend className="mb-2 flex items-center gap-2 text-sm font-medium text-[#30343A]"><Activity className="h-4 w-4 text-[#FF5500]" /> Target resolution and workload</legend>
              <div role="radiogroup" aria-label="Target resolution and workload" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {Object.values(WORKLOADS).map((x) => {
                  const on = cfg.workload === x.id;
                  return (
                    <button key={x.id} type="button" role="radio" aria-checked={on} onClick={() => update({ workload: x.id })} className={`rounded-2xl border p-3.5 text-left transition-colors ${focusRing} ${on ? "border-[#FF5500]/35 bg-[#FF5500]/[0.045]" : "border-black/[0.07] bg-[#F6F5F2]/60 hover:border-black/15"}`}>
                      <span className={`block text-sm font-medium ${on ? "text-[#C94300]" : "text-[#30343A]"}`}>{x.label}</span>
                      <span className="block text-xs text-[#777C83]">{x.sub}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="grid gap-4 border-t border-black/[0.06] pt-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <Field id="psu" label="Power supply" icon={Zap}>
                <select id="psu" value={cfg.psu} onChange={(e) => update({ psu: e.target.value })} className={selectCls}>{PSUS.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
              </Field>
              <Field id="cooler" label="CPU cooler" icon={Cpu}>
                <select id="cooler" value={cfg.cooler} onChange={(e) => update({ cooler: e.target.value })} className={selectCls}>{COOLERS.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
              </Field>
            </div>

            <div aria-live="polite">{note && <p className="flex gap-2 rounded-2xl border border-[#FF5500]/20 bg-[#FF5500]/[0.05] p-3 text-sm text-[#8B3100]"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> {note}</p>}</div>
            <p className="flex justify-between border-t border-black/[0.06] pt-3 text-sm"><span className="text-[#777C83]">Selected parts subtotal</span><span className="font-semibold tabular-nums text-[#141518]">{idr(a.total)}</span></p>
            <p className="text-xs text-[#777C83]">Excludes motherboard, case and storage.</p>
          </section>

          {/* Results */}
          <div className="space-y-6 lg:col-span-3">
            <section aria-labelledby="meter-title" className="rounded-3xl border border-black/[0.06] bg-white p-6 shadow-[0_12px_36px_rgba(20,21,24,0.04)]">
              <h2 id="meter-title" className="flex items-center gap-2 font-serif text-xl font-semibold text-[#141518]"><Gauge className="h-5 w-5 text-[#FF5500]" /> Bottleneck meter</h2>
              <div className="mt-2 grid items-center gap-6 md:grid-cols-2">
                <div>
                  <MeterGauge pct={a.pct} sev={a.sev} />
                  <p className={`mt-1 text-center text-sm font-medium ${sev.text}`}>{sev.label}</p>
                  <ul className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-[#777C83]">
                    <li><span className="text-emerald-700">0 to 10%</span> balanced</li><li><span className="text-amber-700">11 to 25%</span> slight</li><li><span className="text-rose-700">Over 25%</span> high</li>
                  </ul>
                </div>
                <div className="space-y-4">
                  <p className={`flex gap-2 rounded-lg border p-3 text-sm ${sev.chip}`}>{a.sev === 0 ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />} {message}</p>
                  {a.pct > 10 && <p className="text-xs leading-relaxed text-[#5A606A]">{HINT[a.limiter]}</p>}
                  <div className="space-y-3">
                    <h3 className="flex items-center gap-2 text-sm font-medium text-[#30343A]"><Activity className="h-4 w-4 text-[#FF5500]" /> Load under {w.label}</h3>
                    <LoadBar label="CPU" value={a.loads.cpu} limiting={cpuSide} />
                    {w.kind === "server" ? <LoadBar label="RAM" value={a.loads.other} limiting={!cpuSide} /> : <LoadBar label="GPU" value={a.loads.other} limiting={!cpuSide} />}
                    {w.kind === "server" && <p className="text-xs text-[#777C83]">The GPU is not used by this workload.</p>}
                  </div>
                </div>
              </div>
              <p className="mt-4 border-t border-black/[0.06] pt-4 text-sm text-[#5A606A]">Projected result: <span className="font-semibold text-[#141518]">{headline}</span></p>
            </section>

            <section aria-labelledby="perf-title">
              <h2 id="perf-title" className="mb-3 flex items-center gap-2 font-serif text-xl font-semibold text-[#141518]"><BarChart2 className="h-5 w-5 text-[#FF5500]" /> Estimated performance</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <PerfCard icon={Zap} title="Esports FPS" sub="1080p low and medium" active={w.id === "esports"}>
                  <Big value={perf.esports} unit="FPS" tag={fpsTag(perf.esports)} />
                  <dl className="mt-2"><Row k="Valorant" v={`${Math.round(perf.esports * 1.15)} FPS`} /><Row k="CS2" v={`${Math.round(perf.esports * 0.85)} FPS`} /></dl>
                </PerfCard>
                <PerfCard icon={Monitor} title="AAA gaming FPS" sub="1080p and 1440p high" active={w.id === "aaa"}>
                  <Big value={perf.aaa1440} unit="FPS at 1440p" tag={fpsTag(perf.aaa1440)} />
                  <dl className="mt-2"><Row k="1080p high" v={`${perf.aaa1080} FPS`} /><Row k="Cyberpunk 2077 at 1440p" v={`${Math.round(perf.aaa1440 * 0.8)} FPS`} /><Row k="GTA V at 1440p" v={`${Math.round(perf.aaa1440 * 1.3)} FPS`} /></dl>
                </PerfCard>
                <PerfCard icon={BarChart2} title="Workstation / 4K render index" sub="Higher is faster, 100 is a top-tier system" active={w.id === "render"}>
                  <Big value={perf.render} unit="index" />
                  <dl className="mt-2"><Row k="10-minute 4K export" v={`about ${perf.exportMin} min`} /><Row k="GPU memory" v={a.gpu.vram ? `${a.gpu.vram} GB VRAM` : "Shared with RAM"} className={a.gpu.vram && a.gpu.vram < 8 ? "text-amber-700" : "text-[#141518]"} /><Row k="CBT server capacity" v={`about ${perf.clients} clients`} /></dl>
                </PerfCard>
                <PerfCard icon={Zap} title="Thermal and power draw" sub="PSU and cooler check at the selected workload">
                  {[["Power", `${power.draw} W of ${a.psu.w} W`, power], ["Cooling", `${cooling.heat} W of ${a.cooler.cap} W`, cooling]].map(([k, v, s]) => {
                    const [tone, Icon, text] = STATUS[s.status];
                    return (
                      <div key={k} className="mt-3">
                        <div className="flex items-center justify-between text-sm"><span className={`flex items-center gap-1.5 ${tone}`}><Icon className="h-4 w-4" /> {k}: {text}</span><span className="tabular-nums text-[#5A606A]">{v}</span></div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-black/[0.07]"><div className={`h-full rounded-full ${s.status === "ok" ? "bg-emerald-500" : s.status === "warn" ? "bg-amber-500" : "bg-rose-500"}`} style={{ width: `${Math.min(100, Math.round(s.load * 100))}%` }} /></div>
                      </div>
                    );
                  })}
                  <p className="mt-3 text-xs text-[#777C83]">Suggested: {power.rec.name} PSU, {cooling.rec.name.toLowerCase()} or better.</p>
                </PerfCard>
              </div>
            </section>

            <section aria-labelledby="rec-title" className="rounded-3xl border border-black/[0.06] bg-white p-6 shadow-[0_12px_36px_rgba(20,21,24,0.04)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 id="rec-title" className="flex items-center gap-2 font-serif text-xl font-semibold text-[#141518]"><Sparkles className="h-5 w-5 text-[#FF5500]" /> Smart rebalancing</h2>
                <button type="button" onClick={swap} disabled={!fix.steps.length} className={`inline-flex items-center gap-2 rounded-full bg-[#FF5500] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#E94B00] disabled:cursor-not-allowed disabled:bg-black/10 disabled:text-[#777C83] ${focusRing}`}>
                  <RefreshCw className="h-4 w-4" /> One-Click Swap to Preset
                </button>
              </div>
              {fix.steps.length > 0 ? (
                <p className="mt-2 text-sm text-[#5A606A]">The swap will {fix.steps.join(", ")}. Bottleneck {a.pct}% to {fixed.pct}%, parts {fmtDelta(fixed.total - a.total)}.</p>
              ) : (
                <p className="mt-2 text-sm text-[#5A606A]">Nothing to swap: this setup needs no hardware changes for {w.label}.</p>
              )}
              {recs.length > 0 ? (
                <ul className="mt-4 space-y-2">
                  {recs.map((r) => (
                    <li key={r.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#FF5500]/15 bg-[#FF5500]/[0.035] p-4">
                      <ArrowUpRight className="h-5 w-5 shrink-0 text-[#FF5500]" />
                      <div className="min-w-0 flex-1 basis-56"><p className="text-sm font-medium text-[#141518]">{r.title}</p><p className="text-xs text-[#5A606A]">{r.detail}</p></div>
                      <button type="button" onClick={() => apply(r)} className={`rounded-full border border-[#FF5500]/25 px-4 py-2 text-sm font-medium text-[#C94300] hover:bg-[#FF5500]/[0.07] ${focusRing}`}>Apply</button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 flex items-center gap-2 text-sm text-emerald-700"><CheckCircle2 className="h-4 w-4" /> No upgrades needed. This pairing is well balanced and your PSU and cooler keep up.</p>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
