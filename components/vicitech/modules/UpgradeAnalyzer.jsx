import { useMemo, useState } from "react";
import { Laptop, Monitor, MemoryStick, HardDrive, CircuitBoard, Zap, CheckCircle2, AlertTriangle, ArrowRightLeft, Gauge } from "lucide-react";

/* ───────────────────────── Data sampel spesifikasi perangkat (verifikasi ke datasheet sebelum membeli) ───────────────────────── */
// ram: soldered GB + `slots` soket yang menerima hingga `slotMax` GB per slot; `modules` berisi ukuran terpasang.
// gpu / cpu: skor 0-15 untuk kapasitas headroom upgrade. notes: [tone, text].

const dev = (id, name, kind, price, ram, m2, sata, drives, gpu, cpu, notes) => ({ id, name, kind, price, ram, m2, sata, drives, gpu, cpu, notes });
const DDR4 = 47000, DDR5 = 55000; // estimasi Rp per GB

const DEVICES = [
  dev("t14", "ThinkPad T14 Gen 4 (Recertified A+)", "Laptop", 9800000, { type: "DDR5-5600 SODIMM", perGB: DDR5, soldered: 16, slots: 1, slotMax: 32, modules: [] }, { total: 1, used: 1, gen: "PCIe 4.0 x4", size: "2280" }, { total: 0, used: 0 }, [512],
    { score: 0, text: "Grafis terintegrasi, tidak dapat di-upgrade." }, { score: 0, text: "CPU tersolder langsung ke motherboard." },
    [["ok", "16 GB tersolder dan tersedia satu slot SODIMM kosong. Penambahan modul 32 GB meningkatkan total RAM ke 48 GB."], ["warn", "Hanya ada satu slot M.2: upgrade SSD berarti mengganti drive 512 GB bawaan."], ["warn", "Dengan konfigurasi single SODIMM tambahan, memori berjalan asimetris sehingga performa iGPU sedikit berkurang."]]),
  dev("lat7440", "Dell Latitude 7440 (16 GB / 512 GB)", "Laptop", 22400000, { type: "LPDDR5x (tersolder)", perGB: 0, soldered: 16, slots: 0, slotMax: 0, modules: [] }, { total: 1, used: 1, gen: "PCIe 4.0 x4", size: "2230 atau 2280" }, { total: 0, used: 0 }, [512],
    { score: 0, text: "Grafis terintegrasi, tidak dapat di-upgrade." }, { score: 0, text: "CPU tersolder langsung ke motherboard." },
    [["warn", "RAM tersolder permanen. Pilih varian 32 GB sejak awal jika Anda rutin mengedit video atau menjalankan VM."], ["ok", "SSD dapat diganti dan mendukung ukuran 2230 maupun 2280."], ["warn", "Tidak ada slot penyimpanan kedua."]]),
  dev("elite840", "HP EliteBook 840 G9 (Recertified A+)", "Laptop", 8200000, { type: "DDR5-4800 SODIMM", perGB: DDR5, soldered: 0, slots: 2, slotMax: 32, modules: [8, 8] }, { total: 2, used: 1, gen: "PCIe 4.0 x4", size: "2280" }, { total: 0, used: 0 }, [512],
    { score: 0, text: "Grafis terintegrasi, tidak dapat di-upgrade." }, { score: 0, text: "CPU tersolder langsung ke motherboard." },
    [["ok", "Dua slot SODIMM mendukung hingga 64 GB. Gunakan pasangan identik untuk menjaga kecepatan dual-channel."], ["ok", "Slot M.2 kedua masih kosong untuk drive data tambahan."]]),
  dev("g14", "ASUS ROG Zephyrus G14 (32 GB / 1 TB)", "Laptop", 33500000, { type: "LPDDR5x (tersolder)", perGB: 0, soldered: 32, slots: 0, slotMax: 0, modules: [] }, { total: 1, used: 1, gen: "PCIe 4.0 x4", size: "2280" }, { total: 0, used: 0 }, [1000],
    { score: 0, text: "GPU tersolder langsung ke motherboard." }, { score: 0, text: "CPU tersolder langsung ke motherboard." },
    [["warn", "RAM terkunci di 32 GB dan tidak bisa ditambah di kemudian hari."], ["ok", "Satu slot M.2 2280 dapat di-upgrade ke SSD NVMe 2 TB atau 4 TB."], ["warn", "Sasis tipis cenderung cepat hangat; pilih SSD dengan efisiensi termal rendah."]]),
  dev("legion5", "Lenovo Legion Pro 5 (32 GB / 1 TB)", "Laptop", 29900000, { type: "DDR5-5600 SODIMM", perGB: DDR5, soldered: 0, slots: 2, slotMax: 32, modules: [16, 16] }, { total: 2, used: 1, gen: "PCIe 4.0 x4", size: "2280" }, { total: 0, used: 0 }, [1000],
    { score: 0, text: "GPU tersolder langsung ke motherboard." }, { score: 0, text: "CPU tersolder langsung ke motherboard." },
    [["ok", "Dua slot SODIMM dapat ditingkatkan dari 32 GB ke 64 GB memakai dua keping 32 GB."], ["ok", "Slot M.2 kedua masih kosong dan siap pasang."]]),
  dev("prec5570", "Dell Precision 5570 (32 GB / 1 TB)", "Laptop", 25000000, { type: "DDR5-4800 SODIMM", perGB: DDR5, soldered: 0, slots: 2, slotMax: 32, modules: [16, 16] }, { total: 2, used: 1, gen: "PCIe 4.0 x4", size: "2280" }, { total: 0, used: 0 }, [1000],
    { score: 0, text: "GPU workstation tersolder ke motherboard." }, { score: 0, text: "CPU tersolder langsung ke motherboard." },
    [["ok", "Mendukung ekspansi RAM hingga 64 GB pada dua slot SODIMM."], ["warn", "Periksa panduan servis untuk ukuran fisik slot M.2 kedua sebelum membeli drive."]]),
  dev("optiplex7090", "Dell OptiPlex 7090 SFF (Recertified A+)", "Desktop", 6300000, { type: "DDR4-2933 DIMM", perGB: DDR4, soldered: 0, slots: 2, slotMax: 64, modules: [8, 8] }, { total: 2, used: 1, gen: "PCIe 3.0 x4", size: "2280" }, { total: 1, used: 0 }, [512],
    { score: 7, text: "Slot PCIe x16 low-profile. PSU bawaan membatasi GPU hingga sekitar 75 W." }, { score: 8, text: "Soket LGA1200: mendukung hingga Intel Core gen 10/11 sesuai batas pendingin." },
    [["ok", "Dua slot DIMM. Naik dari 16 GB ke 64 GB memerlukan penggantian kedua keping RAM."], ["ok", "Tersedia satu slot M.2 kosong dan satu ruang drive 2,5 inci."], ["warn", "Hanya mendukung kartu grafis low-profile karena dimensi casing dan daya PSU ringkas."]]),
  dev("elitedesk800", "HP EliteDesk 800 G6 Mini (Recertified A+)", "Desktop", 4900000, { type: "DDR4-2666 SODIMM", perGB: DDR4, soldered: 0, slots: 2, slotMax: 32, modules: [8, 8] }, { total: 2, used: 1, gen: "PCIe 3.0 x4", size: "2280" }, { total: 0, used: 0 }, [256],
    { score: 0, text: "Tidak ada slot PCIe: grafis tetap terintegrasi." }, { score: 5, text: "Soket LGA1200, terbatas untuk prosesor seri-T 35 W." },
    [["ok", "Mendukung hingga 64 GB melalui dua slot SODIMM."], ["ok", "Slot M.2 kedua masih kosong."], ["warn", "Tidak tersedia jalur upgrade kartu grafis diskrit pada sasis Mini PC ini."]]),
  dev("b2c-rig", "ViciTech Creator & Gaming Rig", "Desktop", 29550000, { type: "DDR5-6000 DIMM", perGB: DDR5, soldered: 0, slots: 4, slotMax: 32, modules: [16, 16] }, { total: 2, used: 1, gen: "PCIe 4.0 x4", size: "2280" }, { total: 4, used: 0 }, [1000],
    { score: 15, text: "Slot PCIe 4.0 x16 dan PSU 750 W: siap untuk GPU kelas RTX 4080." }, { score: 12, text: "Soket AM5: mendukung upgrade langsung hingga Ryzen 9 7950X dan generasi AM5 terbaru." },
    [["ok", "Empat slot DIMM: tambah dua keping 16 GB identik untuk mencapai 64 GB."], ["ok", "Satu slot M.2 dan empat port SATA masih tersedia."], ["warn", "Pastikan panjang kartu dan konektor daya PSU sebelum mengganti GPU lebih besar."]]),
  dev("b2s-lab", "ViciTech CBT Labkom Standard PC", "Desktop", 5600000, { type: "DDR4-3200 DIMM", perGB: DDR4, soldered: 0, slots: 2, slotMax: 32, modules: [8] }, { total: 1, used: 0, gen: "PCIe 3.0 x4", size: "2280" }, { total: 4, used: 1 }, [256],
    { score: 12, text: "Slot PCIe x16 kosong, namun PSU 350 W membatasi GPU hingga kisaran 120 W." }, { score: 12, text: "Soket LGA1700: dapat di-upgrade hingga Core i5-12400 sesuai kapasitas pendingin." },
    [["ok", "Terpasang satu keping 8 GB dengan satu slot kosong: tambah satu keping 8 GB untuk mengaktifkan dual-channel."], ["ok", "Slot M.2 masih kosong. Memindahkan OS ke NVMe mempercepat waktu booting ujian."], ["warn", "Upgrade PSU 350 W terlebih dahulu sebelum memasang kartu grafis tambahan."]]),
];

const STORE_OPTS = [
  { id: "keep", label: "Pertahankan penyimpanan saat ini" },
  { id: "nvme1", label: "Tambah 1 TB NVMe SSD", gb: 1000, cost: 1250000, need: "m2" },
  { id: "nvme2", label: "Tambah 2 TB NVMe SSD", gb: 2000, cost: 2400000, need: "m2" },
  { id: "sata2", label: "Tambah 2 TB SATA SSD", gb: 2000, cost: 1600000, need: "sata" },
  { id: "swap2", label: "Ganti drive utama dengan 2 TB NVMe SSD", gb: 2000, cost: 2400000, replace: true },
];

/* ───────────────────────── Helpers and scoring ───────────────────────── */

const idr = (n) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
const sum = (a) => a.reduce((s, x) => s + x, 0);
const fmtGB = (gb) => (gb >= 1000 ? `${(gb / 1000).toFixed(gb % 1000 ? 1 : 0)} TB` : `${gb} GB`);
const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas";
const card = "rounded-xl border border-default bg-surface p-5 shadow-sm";

const ramInstalled = (d) => d.ram.soldered + sum(d.ram.modules);
const ramMax = (d) => d.ram.soldered + d.ram.slots * d.ram.slotMax;

function scoreOf(d) {
  const room = ramMax(d) - ramInstalled(d);
  const ram = room > 0 ? (35 * room) / ramMax(d) : 0;
  const free = d.m2.total - d.m2.used + (d.sata.total - d.sata.used);
  const storage = 10 + (Math.min(free, 2) / 2) * 25;
  const compute = d.gpu.score + d.cpu.score;
  const total = Math.round(ram + storage + compute);
  const grade = total >= 75
    ? ["A", "Sangat mudah di-upgrade"]
    : total >= 55
      ? ["B", "Ruang upgrade lega"]
      : total >= 35
        ? ["C", "Ruang upgrade terbatas"]
        : ["D", "Sebagian besar terkunci"];
  return { ram, storage, compute, total, grade };
}

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
    <div
      className={`min-w-[5.5rem] rounded-xl px-3 py-2.5 text-center shadow-sm ${
        free
          ? "border border-dashed border-accent-primary/50 bg-accent-subtle text-accent-cta"
          : kind === "fixed"
            ? "border border-default bg-subtle text-secondary"
            : "border border-default bg-canvas text-primary"
      }`}
    >
      <p className="font-mono text-sm font-semibold">{label}</p>
      <p className="text-[11px] opacity-85">{sub}</p>
    </div>
  );
}

function SlotGroup({ icon: Icon, title, detail, children }) {
  return (
    <div>
      <p className="mb-2 flex flex-wrap items-center gap-2 text-sm font-medium text-primary">
        <Icon className="h-4 w-4 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
        <span>{title}</span>
        <span className="text-xs font-normal text-secondary">{detail}</span>
      </p>
      <div className="flex flex-wrap gap-2.5">{children}</div>
    </div>
  );
}

function ScoreRing({ value, grade }) {
  const r = 34, len = 2 * Math.PI * r;
  return (
    <svg
      viewBox="0 0 80 80"
      className="h-24 w-24 shrink-0 -rotate-90"
      role="img"
      aria-label={`Skor potensi upgrade ${value} dari 100, Grade ${grade[0]}`}
    >
      <circle cx="40" cy="40" r={r} fill="none" strokeWidth="7" className="stroke-subtle" />
      <circle
        cx="40"
        cy="40"
        r={r}
        fill="none"
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={`${(len * value) / 100} ${len}`}
        className="stroke-accent-primary transition-all duration-500 motion-reduce:transition-none"
      />
      <text
        x="40"
        y="40"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="22"
        fontWeight="600"
        className="fill-primary font-mono"
        transform="rotate(90 40 40)"
      >
        {value}
      </text>
    </svg>
  );
}

function Planner({ d, onNavigate }) {
  const [ramPick, setRamPick] = useState("keep");
  const [storePick, setStorePick] = useState("keep");
  const ropts = useMemo(() => ramOptions(d), [d]);
  const ramPlan = ropts.find((o) => String(o.total) === ramPick);
  const opt = STORE_OPTS.find((o) => o.id === storePick) || STORE_OPTS[0];
  const installed = ramInstalled(d);
  const storageNow = sum(d.drives);
  const freeM2 = d.m2.total - d.m2.used, freeSata = d.sata.total - d.sata.used;
  const allowed = (o) => !o.need || (o.need === "m2" ? freeM2 > 0 : freeSata > 0);
  const storageAfter = opt.id === "keep" ? storageNow : opt.replace ? storageNow - d.drives[0] + opt.gb : storageNow + opt.gb;
  const cost = (ramPlan?.cost ?? 0) + (opt.cost ?? 0);
  const hints = [];
  if (ramPlan) {
    hints.push(
      ramPlan.total >= 32
        ? "Kapasitas 32 GB ke atas ideal untuk editing 4K, mesin virtual, dan multitasking berat."
        : "Penambahan RAM membantu browser dan aplikasi ujian tetap responsif.",
    );
  }
  if (ramPlan && ramPlan.reused < ramPlan.n) {
    hints.push(
      `Beli ${ramPlan.n - ramPlan.reused} modul ${ramPlan.s} GB baru${
        ramPlan.reused ? ` dan gunakan kembali ${ramPlan.reused} modul yang sudah terpasang` : ""
      }.`,
    );
  }
  if (opt.replace) {
    hints.push("Kloning data ke drive baru terlebih dahulu. Drive lama tetap bisa dipakai sebagai penyimpanan eksternal.");
  }

  return (
    <section className={card} aria-labelledby="plan-title">
      <h2 id="plan-title" className="tracking-tight flex items-center gap-2 font-sans text-lg font-bold text-primary">
        <Zap className="h-5 w-5 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
        <span>Perencana Upgrade</span>
      </h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="ram-plan" className="mb-1.5 flex items-center gap-2 text-sm font-medium text-primary">
            <MemoryStick className="h-4 w-4 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
            <span>Memori (RAM)</span>
          </label>
          <select
            id="ram-plan"
            value={ramPick}
            onChange={(e) => setRamPick(e.target.value)}
            disabled={!ropts.length}
            className={`vt-form-control min-h-11 w-full rounded-lg border border-default bg-canvas px-3 py-2.5 text-sm text-primary disabled:opacity-50 ${focusRing}`}
          >
            <option value="keep">
              {ropts.length ? `Pertahankan ${installed} GB` : `Pertahankan ${installed} GB (tersolder, tidak bisa ditambah)`}
            </option>
            {ropts.map((o) => (
              <option key={o.total} value={o.total}>
                Total {o.total} GB ({o.n} × {o.s} GB), estimasi {idr(o.cost)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="store-plan" className="mb-1.5 flex items-center gap-2 text-sm font-medium text-primary">
            <HardDrive className="h-4 w-4 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
            <span>Penyimpanan</span>
          </label>
          <select
            id="store-plan"
            value={storePick}
            onChange={(e) => setStorePick(e.target.value)}
            className={`vt-form-control min-h-11 w-full rounded-lg border border-default bg-canvas px-3 py-2.5 text-sm text-primary ${focusRing}`}
          >
            {STORE_OPTS.map((o) => (
              <option key={o.id} value={o.id} disabled={!allowed(o)}>
                {o.label}{allowed(o) ? "" : " (tidak ada slot kosong)"}
              </option>
            ))}
          </select>
        </div>
      </div>

      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
        <div className="rounded-lg border border-default bg-canvas p-3">
          <dt className="text-xs text-secondary">RAM</dt>
          <dd className="mt-0.5 font-mono text-primary">
            {installed} GB <span className="text-secondary">→</span>{" "}
            <span className={ramPlan ? "font-semibold text-status-live" : ""}>
              {ramPlan ? ramPlan.total : installed} GB
            </span>
          </dd>
        </div>
        <div className="rounded-lg border border-default bg-canvas p-3">
          <dt className="text-xs text-secondary">Penyimpanan</dt>
          <dd className="mt-0.5 font-mono text-primary">
            {fmtGB(storageNow)} <span className="text-secondary">→</span>{" "}
            <span className={opt.id !== "keep" ? "font-semibold text-status-live" : ""}>
              {fmtGB(storageAfter)}
            </span>
          </dd>
        </div>
        <div className="rounded-lg border border-default bg-canvas p-3">
          <dt className="text-xs text-secondary">Estimasi Biaya</dt>
          <dd className="mt-0.5 font-mono font-semibold tabular-nums text-primary">{idr(cost)}</dd>
        </div>
      </dl>

      {hints.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {hints.map((h) => (
            <li key={h} className="flex gap-2 text-sm text-secondary">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-status-live" strokeWidth={1.75} aria-hidden="true" />
              <span>{h}</span>
            </li>
          ))}
        </ul>
      )}

      {onNavigate && (
        <button
          type="button"
          onClick={() => onNavigate("bottleneck")}
          className={`vt-motion-press vt-btn-tactile mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg border border-default bg-subtle px-3.5 py-2 text-sm font-medium text-primary hover:border-accent-primary/40 hover:bg-accent-subtle ${focusRing}`}
        >
          <Gauge className="h-4 w-4 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
          <span>Cek bottleneck konfigurasi ini</span>
        </button>
      )}
      <p className="mt-3 text-xs text-secondary">
        Harga merupakan estimasi referensi komponen baru. Biaya RAM hanya menghitung modul baru yang perlu dibeli.
      </p>
    </section>
  );
}

/* ───────────────────────── Page ───────────────────────── */

export default function UpgradeAnalyzer({ deviceId, onDeviceChange, onNavigate }) {
  const [localId, setLocalId] = useState("t14");
  const id = deviceId ?? localId;
  const pick = (next) => (onDeviceChange ? onDeviceChange(next) : setLocalId(next));
  const d = DEVICES.find((x) => x.id === id) || DEVICES[0];
  const sc = useMemo(() => scoreOf(d), [d]);
  const installed = ramInstalled(d), max = ramMax(d);
  const freeM2 = d.m2.total - d.m2.used, freeSata = d.sata.total - d.sata.used;
  const maxStorage = (d.m2.total + d.sata.total) * 2000;
  const Kind = d.kind === "Laptop" ? Laptop : Monitor;

  return (
    <div className="bg-canvas text-primary antialiased">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="vt-badge-sample">Data Referensi</span>
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-cta">
            Analisis Ekspansi Hardware
          </span>
        </div>
        <h1 className="mt-3 flex items-center gap-3 font-sans text-3xl font-bold tracking-tight text-primary sm:text-4xl">
          <ArrowRightLeft className="h-8 w-8 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
          <span>Analisis Potensi Upgrade Maksimal</span>
        </h1>
        <p className="mt-3 max-w-2xl text-secondary">
          Ketahui seberapa jauh laptop atau PC dapat ditingkatkan: batas kapasitas RAM, jumlah slot NVMe dan SATA kosong, ruang upgrade CPU/GPU, serta simulasi estimasi biayanya.
        </p>

        {/* Pemilih perangkat */}
        <div className="mt-8 space-y-4">
          {["Laptop", "Desktop"].map((kind) => (
            <div key={kind}>
              <p className="mb-2 text-sm font-medium text-secondary">
                {kind === "Laptop" ? "Laptop & Workstation Mobile" : "PC & Desktop"}
              </p>
              <div
                role="radiogroup"
                aria-label={kind === "Laptop" ? "Pilih laptop" : "Pilih desktop"}
                className="flex flex-wrap gap-2"
              >
                {DEVICES.filter((x) => x.kind === kind).map((x) => (
                  <button
                    key={x.id}
                    type="button"
                    role="radio"
                    aria-checked={x.id === d.id}
                    onClick={() => pick(x.id)}
                    className={`min-h-11 rounded-lg border px-3.5 py-2 text-sm transition-colors ${focusRing} ${
                      x.id === d.id
                        ? "border-accent-primary bg-accent-subtle font-semibold text-primary shadow-sm"
                        : "border-default bg-surface text-secondary hover:bg-subtle hover:text-primary"
                    }`}
                  >
                    {x.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-5">
          <div className="space-y-6 lg:col-span-3">
            {/* Skor Potensi Upgrade */}
            <section className={card} aria-label="Skor potensi upgrade">
              <div className="flex flex-wrap items-center gap-5">
                <ScoreRing value={sc.total} grade={sc.grade} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm text-secondary">
                    <Kind className="h-4 w-4 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
                    <span>{d.kind}</span>
                    <span>·</span>
                    <span className="font-mono tabular-nums">{idr(d.price)}</span>
                  </p>
                  <h2 className="tracking-tight mt-1 font-sans text-xl font-bold text-primary">{d.name}</h2>
                  <p className="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
                    <span className="vt-badge-live">Grade {sc.grade[0]}</span>
                    <span className="text-secondary">{sc.grade[1]}</span>
                  </p>
                </div>
              </div>
              <ul className="mt-5 grid gap-3 sm:grid-cols-3">
                {[
                  ["Memori (RAM)", sc.ram, 35],
                  ["Penyimpanan", sc.storage, 35],
                  ["CPU & GPU", sc.compute, 30],
                ].map(([k, v, cap]) => (
                  <li key={k}>
                    <div className="flex justify-between text-xs">
                      <span className="text-secondary">{k}</span>
                      <span className="font-mono tabular-nums font-medium text-primary">
                        {Math.round(v)} / {cap}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-subtle">
                      <div
                        className="h-full rounded-full bg-accent-primary transition-all duration-500 motion-reduce:transition-none"
                        style={{ width: `${(v / cap) * 100}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            {/* Peta Slot */}
            <section className={`${card} space-y-5`} aria-labelledby="slots-title">
              <h2 id="slots-title" className="tracking-tight flex items-center gap-2 font-sans text-lg font-bold text-primary">
                <CircuitBoard className="h-5 w-5 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
                <span>Peta Slot Internal</span>
              </h2>
              <SlotGroup icon={MemoryStick} title="Memori (RAM)" detail={`${d.ram.type}, terpasang ${installed} GB, maks. ${max} GB`}>
                {d.ram.soldered > 0 && <Slot kind="fixed" label={`${d.ram.soldered} GB`} sub="tersolder" />}
                {Array.from({ length: d.ram.slots }, (_, i) =>
                  d.ram.modules[i] ? (
                    <Slot key={i} kind="used" label={`${d.ram.modules[i]} GB`} sub={`slot ${i + 1}`} />
                  ) : (
                    <Slot key={i} kind="free" label="Kosong" sub={`slot ${i + 1}, maks. ${d.ram.slotMax} GB`} />
                  ),
                )}
                {d.ram.slots === 0 && (
                  <p className="self-center text-sm text-secondary">Tidak ada soket tambahan: kapasitas RAM permanen.</p>
                )}
              </SlotGroup>
              <SlotGroup icon={HardDrive} title="Slot NVMe (M.2)" detail={`${d.m2.gen}, ${d.m2.size}, ${freeM2} dari ${d.m2.total} kosong`}>
                {Array.from({ length: d.m2.total }, (_, i) =>
                  i < d.m2.used ? (
                    <Slot key={i} kind="used" label={fmtGB(d.drives[i] ?? 0)} sub={`slot M.2 #${i + 1}`} />
                  ) : (
                    <Slot key={i} kind="free" label="Kosong" sub={`slot M.2 #${i + 1}`} />
                  ),
                )}
              </SlotGroup>
              {d.sata.total > 0 && (
                <SlotGroup icon={HardDrive} title="Port & Bay SATA" detail={`${freeSata} dari ${d.sata.total} kosong`}>
                  {Array.from({ length: d.sata.total }, (_, i) =>
                    i < d.sata.used ? (
                      <Slot key={i} kind="used" label="Terisi" sub={`SATA ${i + 1}`} />
                    ) : (
                      <Slot key={i} kind="free" label="Kosong" sub={`SATA ${i + 1}`} />
                    ),
                  )}
                </SlotGroup>
              )}
            </section>

            {/* Potensi Maksimal */}
            <section className={card} aria-labelledby="max-title">
              <h2 id="max-title" className="tracking-tight flex items-center gap-2 font-sans text-lg font-bold text-primary">
                <Gauge className="h-5 w-5 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
                <span>Potensi Maksimal</span>
              </h2>
              <dl className="mt-3 divide-y divide-default text-sm">
                {[
                  ["RAM", max > installed ? `${installed} GB saat ini, maksimal hingga ${max} GB` : `Terkunci di ${installed} GB`, max > installed],
                  ["Penyimpanan", `${fmtGB(sum(d.drives))} saat ini, hingga ${fmtGB(maxStorage)} dengan drive 2 TB di tiap slot`, true],
                  ["Grafis (GPU)", d.gpu.text, d.gpu.score > 0],
                  ["Prosesor (CPU)", d.cpu.text, d.cpu.score > 0],
                ].map(([k, v, ok]) => (
                  <div key={k} className="grid grid-cols-4 gap-3 py-2.5">
                    <dt className="font-medium text-secondary">{k}</dt>
                    <dd className="col-span-3 flex gap-2 text-primary">
                      {ok ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-status-live" strokeWidth={1.75} aria-hidden="true" />
                      ) : (
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-status-sample" strokeWidth={1.75} aria-hidden="true" />
                      )}
                      <span>{v}</span>
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          </div>

          <div className="space-y-6 lg:col-span-2 lg:self-start">
            <Planner key={d.id} d={d} onNavigate={onNavigate} />
            <section className={card} aria-labelledby="notes-title">
              <h2 id="notes-title" className="tracking-tight font-sans text-lg font-bold text-primary">
                Catatan Upgrade
              </h2>
              <ul className="mt-3 space-y-2.5">
                {d.notes.map(([tone, text]) => (
                  <li key={text} className="flex gap-2.5 text-sm leading-relaxed text-secondary">
                    {tone === "ok" ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-status-live" strokeWidth={1.75} aria-label="Dapat di-upgrade" />
                    ) : (
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-status-sample" strokeWidth={1.75} aria-label="Perhatian" />
                    )}
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
