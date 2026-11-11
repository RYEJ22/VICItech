import { useMemo, useState } from "react";
import { Cpu, Laptop, Monitor, MemoryStick, HardDrive, CircuitBoard, Zap, CheckCircle2, AlertTriangle, ArrowRightLeft, Gauge } from "lucide-react";

/* ───────────────────────── Sample device specs (verify against the datasheet before buying) ───────────────────────── */
// ram: soldered GB + `slots` sockets that accept up to `slotMax` GB each; `modules` lists the sizes installed in them.
// gpu / cpu: score 0-15 for how much upgrade headroom exists. notes: [tone, text].

const dev = (id, name, kind, price, ram, m2, sata, drives, gpu, cpu, notes) => ({ id, name, kind, price, ram, m2, sata, drives, gpu, cpu, notes });
const DDR4 = 47000, DDR5 = 55000; // estimated Rp per GB

const DEVICES = [
  dev("t14", "ThinkPad T14 Gen 4 (Recertified A+)", "Laptop", 9800000, { type: "DDR5-5600 SODIMM", perGB: DDR5, soldered: 16, slots: 1, slotMax: 32, modules: [] }, { total: 1, used: 1, gen: "PCIe 4.0 x4", size: "2280" }, { total: 0, used: 0 }, [512],
    { score: 0, text: "Integrated graphics, not upgradable." }, { score: 0, text: "The CPU is soldered to the board." },
    [["ok", "16 GB is soldered and one SODIMM slot is empty. A 32 GB module takes it to 48 GB."], ["warn", "Only one M.2 slot: a bigger SSD means replacing the existing 512 GB drive."], ["warn", "With a single SODIMM the memory runs mixed, so integrated graphics may lose a little speed."]]),
  dev("lat7440", "Dell Latitude 7440 (16 GB / 512 GB)", "Laptop", 22400000, { type: "LPDDR5x (soldered)", perGB: 0, soldered: 16, slots: 0, slotMax: 0, modules: [] }, { total: 1, used: 1, gen: "PCIe 4.0 x4", size: "2230 or 2280" }, { total: 0, used: 0 }, [512],
    { score: 0, text: "Integrated graphics, not upgradable." }, { score: 0, text: "The CPU is soldered to the board." },
    [["warn", "RAM is soldered. Pick the 32 GB model at purchase if you edit video or run virtual machines."], ["ok", "The SSD is replaceable and both 2230 and 2280 drives fit."], ["warn", "There is no second drive slot."]]),
  dev("elite840", "HP EliteBook 840 G9 (Recertified A+)", "Laptop", 8200000, { type: "DDR5-4800 SODIMM", perGB: DDR5, soldered: 0, slots: 2, slotMax: 32, modules: [8, 8] }, { total: 2, used: 1, gen: "PCIe 4.0 x4", size: "2280" }, { total: 0, used: 0 }, [512],
    { score: 0, text: "Integrated graphics, not upgradable." }, { score: 0, text: "The CPU is soldered to the board." },
    [["ok", "Two SODIMM slots take up to 64 GB. Use a matched pair to keep dual-channel speed."], ["ok", "A second M.2 slot is free for a data drive."]]),
  dev("g14", "ASUS ROG Zephyrus G14 (32 GB / 1 TB)", "Laptop", 33500000, { type: "LPDDR5x (soldered)", perGB: 0, soldered: 32, slots: 0, slotMax: 0, modules: [] }, { total: 1, used: 1, gen: "PCIe 4.0 x4", size: "2280" }, { total: 0, used: 0 }, [1000],
    { score: 0, text: "The GPU is soldered to the board." }, { score: 0, text: "The CPU is soldered to the board." },
    [["warn", "RAM is fixed at 32 GB, so there is nothing to add later."], ["ok", "The single 2280 slot can take a 2 TB or 4 TB NVMe drive."], ["warn", "The thin chassis runs warm, so favor SSDs with low heat output."]]),
  dev("legion5", "Lenovo Legion Pro 5 (32 GB / 1 TB)", "Laptop", 29900000, { type: "DDR5-5600 SODIMM", perGB: DDR5, soldered: 0, slots: 2, slotMax: 32, modules: [16, 16] }, { total: 2, used: 1, gen: "PCIe 4.0 x4", size: "2280" }, { total: 0, used: 0 }, [1000],
    { score: 0, text: "The GPU is soldered to the board." }, { score: 0, text: "The CPU is soldered to the board." },
    [["ok", "Two SODIMM slots take it from 32 GB to 64 GB with two 32 GB modules."], ["ok", "A second M.2 slot is free."]]),
  dev("prec5570", "Dell Precision 5570 (32 GB / 1 TB)", "Laptop", 25000000, { type: "DDR5-4800 SODIMM", perGB: DDR5, soldered: 0, slots: 2, slotMax: 32, modules: [16, 16] }, { total: 2, used: 1, gen: "PCIe 4.0 x4", size: "2280" }, { total: 0, used: 0 }, [1000],
    { score: 0, text: "The workstation GPU is soldered to the board." }, { score: 0, text: "The CPU is soldered to the board." },
    [["ok", "Supports up to 64 GB across two SODIMM slots."], ["warn", "Check the service manual for the second M.2 slot length before buying a drive."]]),
  dev("optiplex7090", "Dell OptiPlex 7090 SFF (Recertified A+)", "Desktop", 6300000, { type: "DDR4-2933 DIMM", perGB: DDR4, soldered: 0, slots: 2, slotMax: 64, modules: [8, 8] }, { total: 2, used: 1, gen: "PCIe 3.0 x4", size: "2280" }, { total: 1, used: 0 }, [512],
    { score: 7, text: "Low-profile PCIe x16 slot. The small PSU limits cards to about 75 W." }, { score: 8, text: "LGA1200: up to 10th and 11th gen Core, within the cooler limit." },
    [["ok", "Two DIMM slots. Going from 16 GB to 64 GB means replacing both modules."], ["ok", "One free M.2 slot and one free 2.5-inch bay."], ["warn", "Low-profile graphics cards only, because of the compact case and PSU."]]),
  dev("elitedesk800", "HP EliteDesk 800 G6 Mini (Recertified A+)", "Desktop", 4900000, { type: "DDR4-2666 SODIMM", perGB: DDR4, soldered: 0, slots: 2, slotMax: 32, modules: [8, 8] }, { total: 2, used: 1, gen: "PCIe 3.0 x4", size: "2280" }, { total: 0, used: 0 }, [256],
    { score: 0, text: "No PCIe slot: graphics stay integrated." }, { score: 5, text: "LGA1200, but only 35 W T-series CPUs fit the cooler." },
    [["ok", "Up to 64 GB across two SODIMM slots."], ["ok", "A second M.2 slot is free."], ["warn", "There is no graphics upgrade path in this case."]]),
  dev("b2c-rig", "ViciTech Creator & Gaming Rig", "Desktop", 29550000, { type: "DDR5-6000 DIMM", perGB: DDR5, soldered: 0, slots: 4, slotMax: 32, modules: [16, 16] }, { total: 2, used: 1, gen: "PCIe 4.0 x4", size: "2280" }, { total: 4, used: 0 }, [1000],
    { score: 15, text: "PCIe 4.0 x16 and a 750 W PSU: room for RTX 4080-class cards." }, { score: 12, text: "AM5 socket: drop-in upgrades up to Ryzen 9 7950X and newer AM5 chips." },
    [["ok", "Four DIMM slots: add two matching 16 GB modules to reach 64 GB."], ["ok", "One free M.2 slot and four free SATA ports."], ["warn", "Check card length and PSU connectors before choosing a larger GPU."]]),
  dev("b2s-lab", "ViciTech CBT Labkom Standard PC", "Desktop", 5600000, { type: "DDR4-3200 DIMM", perGB: DDR4, soldered: 0, slots: 2, slotMax: 32, modules: [8] }, { total: 1, used: 0, gen: "PCIe 3.0 x4", size: "2280" }, { total: 4, used: 1 }, [256],
    { score: 12, text: "The PCIe x16 slot is free, but the 350 W PSU limits cards to about 120 W." }, { score: 12, text: "LGA1700: up to Core i5-12400 within the board and cooler limits." },
    [["ok", "One 8 GB module and one free slot: a second 8 GB stick gives dual-channel, the cheapest speed-up for a lab."], ["ok", "The M.2 slot is free. Moving the OS to NVMe shortens boot and exam start times."], ["warn", "Replace the 350 W PSU before adding a graphics card."]]),
];

const STORE_OPTS = [
  { id: "keep", label: "Keep current storage" },
  { id: "nvme1", label: "Add a 1 TB NVMe SSD", gb: 1000, cost: 1250000, need: "m2" },
  { id: "nvme2", label: "Add a 2 TB NVMe SSD", gb: 2000, cost: 2400000, need: "m2" },
  { id: "sata2", label: "Add a 2 TB SATA SSD", gb: 2000, cost: 1600000, need: "sata" },
  { id: "swap2", label: "Replace the main drive with a 2 TB NVMe SSD", gb: 2000, cost: 2400000, replace: true },
];

/* ───────────────────────── Helpers and scoring ───────────────────────── */

const idr = (n) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
const sum = (a) => a.reduce((s, x) => s + x, 0);
const fmtGB = (gb) => (gb >= 1000 ? `${(gb / 1000).toFixed(gb % 1000 ? 1 : 0)} TB` : `${gb} GB`);
const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70";
const card = "rounded-xl border border-zinc-800 bg-zinc-900/50";

const ramInstalled = (d) => d.ram.soldered + sum(d.ram.modules);
const ramMax = (d) => d.ram.soldered + d.ram.slots * d.ram.slotMax;

function scoreOf(d) {
  const room = ramMax(d) - ramInstalled(d);
  const ram = room > 0 ? (35 * room) / ramMax(d) : 0;
  const free = d.m2.total - d.m2.used + (d.sata.total - d.sata.used);
  const storage = 10 + (Math.min(free, 2) / 2) * 25; // replacing the main drive is always possible
  const compute = d.gpu.score + d.cpu.score;
  const total = Math.round(ram + storage + compute);
  const grade = total >= 75 ? ["A", "Very upgradeable"] : total >= 55 ? ["B", "Good headroom"] : total >= 35 ? ["C", "Limited headroom"] : ["D", "Mostly locked in"];
  return { ram, storage, compute, total, grade };
}

// Memory kits that reach a higher total: even module counts keep dual-channel, and matching modules already installed are reused
function ramOptions(d) {
  const r = d.ram;
  if (!r.slots) return [];
  const installed = ramInstalled(d);
  const counts = r.slots === 1 ? [1] : Array.from({ length: Math.floor(r.slots / 2) }, (_, i) => (i + 1) * 2);
  const best = new Map();
  for (const s of [8, 16, 32, 64].filter((x) => x <= r.slotMax)) {
    for (const n of counts) {
      const total = r.soldered + n * s;
      if (total <= installed) continue;
      const reused = Math.min(r.modules.filter((m) => m === s).length, n);
      const plan = { total, n, s, reused, cost: (n - reused) * s * r.perGB };
      if (!best.has(total) || plan.cost < best.get(total).cost) best.set(total, plan);
    }
  }
  return [...best.values()].sort((a, b) => a.total - b.total);
}

/* ───────────────────────── UI pieces ───────────────────────── */

function Slot({ kind, label, sub }) {
  const free = kind === "free";
  return (
    <div className={`min-w-[5.5rem] rounded-lg border px-3 py-2 text-center ${free ? "border-dashed border-emerald-400/50 bg-emerald-400/5 text-emerald-700 dark:text-emerald-400" : kind === "fixed" ? "border-zinc-200 dark:border-zinc-700 bg-zinc-100/60 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300" : "border-emerald-600/40 dark:border-emerald-400/40 bg-emerald-600/10 dark:bg-emerald-400/10 text-cyan-700 dark:text-cyan-300"}`}>
      <p className="text-sm font-medium">{label}</p>
      <p className="text-[11px] opacity-80">{sub}</p>
    </div>
  );
}

function SlotGroup({ icon: Icon, title, detail, children }) {
  return (
    <div>
      <p className="mb-2 flex flex-wrap items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300"><Icon className="h-4 w-4 text-cyan-700 dark:text-cyan-400" /> {title} <span className="text-xs text-zinc-500">{detail}</span></p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function ScoreRing({ value, grade }) {
  const r = 34, len = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 80 80" className="h-24 w-24 shrink-0 -rotate-90" role="img" aria-label={`Upgrade potential ${value} out of 100, grade ${grade[0]}`}>
      <circle cx="40" cy="40" r={r} fill="none" strokeWidth="7" className="stroke-zinc-800" />
      <circle cx="40" cy="40" r={r} fill="none" strokeWidth="7" strokeLinecap="round" strokeDasharray={`${(len * value) / 100} ${len}`} className="stroke-emerald-400 transition-all duration-500" />
      <text x="40" y="40" textAnchor="middle" dominantBaseline="central" fontSize="22" fontWeight="600" className="fill-zinc-50" transform="rotate(90 40 40)">{value}</text>
    </svg>
  );
}

function Planner({ d, onNavigate }) {
  const [ramPick, setRamPick] = useState("keep");
  const [storePick, setStorePick] = useState("keep");
  const ropts = useMemo(() => ramOptions(d), [d]);
  const ramPlan = ropts.find((o) => String(o.total) === ramPick);
  const opt = STORE_OPTS.find((o) => o.id === storePick);
  const installed = ramInstalled(d);
  const storageNow = sum(d.drives);
  const freeM2 = d.m2.total - d.m2.used, freeSata = d.sata.total - d.sata.used;
  const allowed = (o) => !o.need || (o.need === "m2" ? freeM2 > 0 : freeSata > 0);
  const storageAfter = opt.id === "keep" ? storageNow : opt.replace ? storageNow - d.drives[0] + opt.gb : storageNow + opt.gb;
  const cost = (ramPlan?.cost ?? 0) + (opt.cost ?? 0);
  const hints = [];
  if (ramPlan) hints.push(ramPlan.total >= 32 ? "32 GB or more is comfortable for 4K editing, virtual machines and heavy multitasking." : "More RAM helps browsers and exam software stay responsive.");
  if (ramPlan && ramPlan.reused < ramPlan.n) hints.push(`Buy ${ramPlan.n - ramPlan.reused} new ${ramPlan.s} GB ${ramPlan.n - ramPlan.reused > 1 ? "modules" : "module"}${ramPlan.reused ? ` and keep the ${ramPlan.reused} you already have` : ""}.`);
  if (opt.replace) hints.push("Clone your data to the new drive first. The old drive can be reused in an external case.");

  return (
    <section className={`${card} p-5`} aria-labelledby="plan-title">
      <h2 id="plan-title" className="flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50"><Zap className="h-5 w-5 text-cyan-700 dark:text-cyan-400" /> Upgrade planner</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="ram-plan" className="mb-1.5 flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300"><MemoryStick className="h-4 w-4 text-cyan-700 dark:text-cyan-400" /> Memory</label>
          <select id="ram-plan" value={ramPick} onChange={(e) => setRamPick(e.target.value)} disabled={!ropts.length} className={`w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 disabled:opacity-50 ${focusRing}`}>
            <option value="keep">{ropts.length ? `Keep ${installed} GB` : `Keep ${installed} GB (soldered, no upgrade possible)`}</option>
            {ropts.map((o) => <option key={o.total} value={o.total}>{o.total} GB total, {o.n} x {o.s} GB, about {idr(o.cost)}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="store-plan" className="mb-1.5 flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300"><HardDrive className="h-4 w-4 text-cyan-700 dark:text-cyan-400" /> Storage</label>
          <select id="store-plan" value={storePick} onChange={(e) => setStorePick(e.target.value)} className={`w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 ${focusRing}`}>
            {STORE_OPTS.map((o) => <option key={o.id} value={o.id} disabled={!allowed(o)}>{o.label}{allowed(o) ? "" : " (no free slot)"}</option>)}
          </select>
        </div>
      </div>

      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
        <div className="rounded-lg bg-white/60 dark:bg-zinc-950/60 p-3"><dt className="text-xs text-zinc-500">Memory</dt><dd className="text-zinc-900 dark:text-zinc-100">{installed} GB <span className="text-zinc-500">to</span> <span className={ramPlan ? "font-semibold text-emerald-700 dark:text-emerald-400" : ""}>{ramPlan ? ramPlan.total : installed} GB</span></dd></div>
        <div className="rounded-lg bg-white/60 dark:bg-zinc-950/60 p-3"><dt className="text-xs text-zinc-500">Storage</dt><dd className="text-zinc-900 dark:text-zinc-100">{fmtGB(storageNow)} <span className="text-zinc-500">to</span> <span className={opt.id !== "keep" ? "font-semibold text-emerald-700 dark:text-emerald-400" : ""}>{fmtGB(storageAfter)}</span></dd></div>
        <div className="rounded-lg bg-white/60 dark:bg-zinc-950/60 p-3"><dt className="text-xs text-zinc-500">Estimated cost</dt><dd className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">{idr(cost)}</dd></div>
      </dl>
      {hints.length > 0 && <ul className="mt-3 space-y-1.5">{hints.map((h) => <li key={h} className="flex gap-2 text-sm text-zinc-600 dark:text-zinc-400"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400" /> {h}</li>)}</ul>}
      {onNavigate && (
        <button type="button" onClick={() => onNavigate("bottleneck")} className={`mt-4 inline-flex items-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-sm text-zinc-800 dark:text-zinc-200 hover:border-emerald-600/60 dark:hover:border-emerald-400/60 hover:text-cyan-700 dark:hover:text-cyan-300 ${focusRing}`}>
          <Gauge className="h-4 w-4" /> Check bottlenecks with this setup
        </button>
      )}
      <p className="mt-3 text-xs text-zinc-600">Prices are estimates for new parts. Memory cost covers only the modules you need to buy.</p>
    </section>
  );
}

/* ───────────────────────── Page ───────────────────────── */

export default function UpgradeAnalyzer({ deviceId, onDeviceChange, onNavigate }) {
  const [localId, setLocalId] = useState("t14");
  const id = deviceId ?? localId; // controlled when the shell passes deviceId
  const pick = (next) => (onDeviceChange ? onDeviceChange(next) : setLocalId(next));
  const d = DEVICES.find((x) => x.id === id) || DEVICES[0];
  const sc = useMemo(() => scoreOf(d), [d]);
  const installed = ramInstalled(d), max = ramMax(d);
  const freeM2 = d.m2.total - d.m2.used, freeSata = d.sata.total - d.sata.used;
  const maxStorage = (d.m2.total + d.sata.total) * 2000;
  const Kind = d.kind === "Laptop" ? Laptop : Monitor;

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 antialiased">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-950/90">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-600 dark:bg-emerald-400 text-white dark:text-zinc-950"><Cpu className="h-5 w-5" /></span>
          <span className="text-lg font-semibold tracking-tight">ViciTech</span>
          <span className="rounded-full border border-emerald-600/30 dark:border-emerald-400/30 bg-emerald-600/10 dark:bg-emerald-400/10 px-3 py-1 text-xs text-cyan-700 dark:text-cyan-300">Max Upgrade Analyzer</span>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <h1 className="flex items-center gap-3 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl"><ArrowRightLeft className="h-8 w-8 text-cyan-700 dark:text-cyan-400" /> Max Upgrade Potential Analyzer</h1>
        <p className="mt-3 max-w-2xl text-zinc-600 dark:text-zinc-400">See how far a laptop or PC can grow: RAM limits, free NVMe and SATA slots, graphics and CPU headroom, plus a planner that prices the upgrade.</p>

        {/* Device picker */}
        <div className="mt-8 space-y-4">
          {["Laptop", "Desktop"].map((kind) => (
            <div key={kind}>
              <p className="mb-2 text-sm text-zinc-600 dark:text-zinc-400">{kind === "Laptop" ? "Laptops and mobile workstations" : "PCs and desktops"}</p>
              <div role="radiogroup" aria-label={kind === "Laptop" ? "Choose a laptop" : "Choose a desktop"} className="flex flex-wrap gap-2">
                {DEVICES.filter((x) => x.kind === kind).map((x) => (
                  <button key={x.id} type="button" role="radio" aria-checked={x.id === d.id} onClick={() => pick(x.id)} className={`rounded-lg border px-3 py-2 text-sm transition-colors ${focusRing} ${x.id === d.id ? "border-emerald-600/60 dark:border-emerald-400/60 bg-emerald-600/10 dark:bg-emerald-400/10 text-cyan-700 dark:text-cyan-300 shadow-[0_0_18px_-6px_rgba(34,211,238,0.6)]" : "border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-200 dark:hover:border-zinc-700"}`}>{x.name}</button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-5">
          <div className="space-y-6 lg:col-span-3">
            {/* Score */}
            <section className={`${card} p-5`} aria-label="Upgrade potential">
              <div className="flex flex-wrap items-center gap-5">
                <ScoreRing value={sc.total} grade={sc.grade} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm text-zinc-500"><Kind className="h-4 w-4" /> {d.kind}, {idr(d.price)}</p>
                  <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">{d.name}</h2>
                  <p className="mt-1 text-sm"><span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 font-medium text-emerald-700 dark:text-emerald-400">Grade {sc.grade[0]}</span> <span className="text-zinc-600 dark:text-zinc-400">{sc.grade[1]}</span></p>
                </div>
              </div>
              <ul className="mt-5 grid gap-3 sm:grid-cols-3">
                {[["Memory", sc.ram, 35], ["Storage", sc.storage, 35], ["CPU and GPU", sc.compute, 30]].map(([k, v, cap]) => (
                  <li key={k}>
                    <div className="flex justify-between text-xs"><span className="text-zinc-600 dark:text-zinc-400">{k}</span><span className="tabular-nums text-zinc-700 dark:text-zinc-300">{Math.round(v)} / {cap}</span></div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"><div className="h-full rounded-full bg-emerald-600 dark:bg-emerald-400 transition-all duration-500" style={{ width: `${(v / cap) * 100}%` }} /></div>
                  </li>
                ))}
              </ul>
            </section>

            {/* Slot map */}
            <section className={`${card} space-y-5 p-5`} aria-labelledby="slots-title">
              <h2 id="slots-title" className="flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50"><CircuitBoard className="h-5 w-5 text-cyan-700 dark:text-cyan-400" /> Slot map</h2>
              <SlotGroup icon={MemoryStick} title="Memory" detail={`${d.ram.type}, ${installed} GB now, up to ${max} GB`}>
                {d.ram.soldered > 0 && <Slot kind="fixed" label={`${d.ram.soldered} GB`} sub="soldered" />}
                {Array.from({ length: d.ram.slots }, (_, i) => d.ram.modules[i] ? <Slot key={i} kind="used" label={`${d.ram.modules[i]} GB`} sub={`slot ${i + 1}`} /> : <Slot key={i} kind="free" label="Free" sub={`slot ${i + 1}, up to ${d.ram.slotMax} GB`} />)}
                {d.ram.slots === 0 && <p className="self-center text-sm text-zinc-500">No sockets: memory cannot be changed.</p>}
              </SlotGroup>
              <SlotGroup icon={HardDrive} title="NVMe (M.2) slots" detail={`${d.m2.gen}, ${d.m2.size}, ${freeM2} of ${d.m2.total} free`}>
                {Array.from({ length: d.m2.total }, (_, i) => i < d.m2.used ? <Slot key={i} kind="used" label={fmtGB(d.drives[i] ?? 0)} sub={`M.2 slot ${i + 1}`} /> : <Slot key={i} kind="free" label="Free" sub={`M.2 slot ${i + 1}`} />)}
              </SlotGroup>
              {d.sata.total > 0 && (
                <SlotGroup icon={HardDrive} title="SATA bays and ports" detail={`${freeSata} of ${d.sata.total} free`}>
                  {Array.from({ length: d.sata.total }, (_, i) => i < d.sata.used ? <Slot key={i} kind="used" label="In use" sub={`SATA ${i + 1}`} /> : <Slot key={i} kind="free" label="Free" sub={`SATA ${i + 1}`} />)}
                </SlotGroup>
              )}
            </section>

            {/* Maximum potential */}
            <section className={`${card} p-5`} aria-labelledby="max-title">
              <h2 id="max-title" className="flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50"><Gauge className="h-5 w-5 text-cyan-700 dark:text-cyan-400" /> Maximum potential</h2>
              <dl className="mt-3 divide-y divide-zinc-800 text-sm">
                {[
                  ["RAM", max > installed ? `${installed} GB now, up to ${max} GB` : `Locked at ${installed} GB`, max > installed],
                  ["Storage", `${fmtGB(sum(d.drives))} now, up to ${fmtGB(maxStorage)} with 2 TB drives in every slot`, true],
                  ["Graphics", d.gpu.text, d.gpu.score > 0],
                  ["CPU", d.cpu.text, d.cpu.score > 0],
                ].map(([k, v, ok]) => (
                  <div key={k} className="grid grid-cols-4 gap-3 py-2.5"><dt className="text-zinc-500">{k}</dt><dd className="col-span-3 flex gap-2 text-zinc-800 dark:text-zinc-200">{ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />}{v}</dd></div>
                ))}
              </dl>
            </section>
          </div>

          <div className="space-y-6 lg:col-span-2 lg:self-start">
            <Planner key={d.id} d={d} onNavigate={onNavigate} />
            <section className={`${card} p-5`} aria-labelledby="notes-title">
              <h2 id="notes-title" className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Upgrade notes</h2>
              <ul className="mt-3 space-y-2.5">
                {d.notes.map(([tone, text]) => (
                  <li key={text} className="flex gap-2.5 text-sm text-zinc-700 dark:text-zinc-300">
                    {tone === "ok" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400" aria-label="Good news" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" aria-label="Caution" />} {text}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </main>

      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-6 text-center text-xs text-zinc-600">ViciTech Engine v1.0. Sample specifications: confirm slot counts and limits in the manufacturer's datasheet before buying parts.</footer>
    </div>
  );
}
