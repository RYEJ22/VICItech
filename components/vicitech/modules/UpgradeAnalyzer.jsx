import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/components/providers/LanguageProvider";
import {
  AlertTriangle,
  ArrowRightLeft,
  Bot,
  CheckCircle2,
  CircuitBoard,
  Gauge,
  HardDrive,
  Laptop,
  MapPin,
  MemoryStick,
  Monitor,
  Search,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import { openAiConsultation } from "@/lib/ai/open-ai-consultation";
import {
  MANUAL_RAM_TYPE_LABELS,
  MANUAL_STORAGE_TYPE_LABELS,
  MANUAL_USE_CASE_LABELS,
  analyzeManualUpgrade,
} from "@/lib/algorithms/manualUpgradeEngine";

/* ───────────────────────── Data katalog preset (verifikasi ke datasheet sebelum membeli) ───────────────────────── */

const dev = (id, brand, name, kind, segment, price, ram, m2, sata, drives, gpu, cpu, notes) => ({
  id,
  brand,
  name,
  kind,
  segment,
  price,
  ram,
  m2,
  sata,
  drives,
  gpu,
  cpu,
  notes,
});

const DDR4 = 47000;
const DDR5 = 55000;

const DEVICES = [
  dev("t14", "Lenovo", "ThinkPad T14 Gen 4 (Recertified A+)", "Laptop", "Bisnis & Kuliah", 9800000, { type: "DDR5-5600 SODIMM", perGB: DDR5, soldered: 16, slots: 1, slotMax: 32, modules: [] }, { total: 1, used: 1, gen: "PCIe 4.0 x4", size: "2280" }, { total: 0, used: 0 }, [512],
    { score: 0, text: "Grafis terintegrasi, tidak dapat di-upgrade." }, { score: 0, text: "CPU tersolder langsung ke motherboard." },
    [["ok", "16 GB tersolder dan tersedia satu slot SODIMM kosong. Penambahan modul 32 GB meningkatkan total RAM ke 48 GB."], ["warn", "Hanya ada satu slot M.2: upgrade SSD berarti mengganti drive 512 GB bawaan."], ["warn", "Dengan konfigurasi single SODIMM tambahan, memori berjalan asimetris sehingga performa iGPU sedikit berkurang."]]),
  dev("al14", "Acer", "Acer Aspire Lite 14 AL14 (8 GB / 512 GB)", "Laptop", "Kuliah & Office", 6499000, { type: "DDR5-4800 SODIMM", perGB: DDR5, soldered: 0, slots: 1, slotMax: 32, modules: [8] }, { total: 1, used: 1, gen: "PCIe 4.0 x4", size: "2280" }, { total: 0, used: 0 }, [512],
    { score: 0, text: "Grafis terintegrasi Intel/AMD, tidak dapat di-upgrade." }, { score: 0, text: "CPU tersolder langsung ke motherboard." },
    [["ok", "Satu slot SODIMM DDR5 dapat diganti dari 8 GB menjadi 16 GB atau 32 GB untuk multitasking yang jauh lebih lancar."], ["warn", "Hanya tersedia satu slot M.2 2280: siapkan enclosure USB-C jika ingin mengkloning OS ke SSD 1 TB / 2 TB."]]),
  dev("vivo14", "ASUS", "ASUS Vivobook 14 A1404 (8 GB / 512 GB)", "Laptop", "Kuliah & Office", 6899000, { type: "DDR4-3200 SODIMM", perGB: DDR4, soldered: 8, slots: 1, slotMax: 16, modules: [] }, { total: 1, used: 1, gen: "PCIe 3.0 x4", size: "2280" }, { total: 0, used: 0 }, [512],
    { score: 0, text: "Grafis terintegrasi, tidak dapat di-upgrade." }, { score: 0, text: "CPU tersolder langsung ke motherboard." },
    [["ok", "8 GB tersolder + 1 slot SODIMM kosong. Tambah keping 8 GB untuk mengaktifkan dual-channel 16 GB atau 16 GB untuk total 24 GB."], ["warn", "Hanya satu slot M.2 NVMe: upgrade kapasitas penyimpanan dilakukan dengan mengganti SSD bawaan."]]),
  dev("ideapad3", "Lenovo", "Lenovo IdeaPad Slim 3 Gen 8 (8 GB / 512 GB)", "Laptop", "Kuliah & Office", 6699000, { type: "LPDDR5 (tersolder)", perGB: 0, soldered: 8, slots: 0, slotMax: 0, modules: [] }, { total: 1, used: 1, gen: "PCIe 4.0 x4", size: "2242 / 2280" }, { total: 0, used: 0 }, [512],
    { score: 0, text: "Grafis terintegrasi, tidak dapat di-upgrade." }, { score: 0, text: "CPU tersolder langsung ke motherboard." },
    [["warn", "RAM LPDDR5 tersolder permanen di 8 GB dan tidak memiliki slot ekspansi."], ["ok", "SSD NVMe masih dapat ditingkatkan ke 1 TB atau 2 TB pada slot M.2."]]),
  dev("nitrov15", "Acer", "Acer Nitro V 15 ANV15 (16 GB / 512 GB)", "Laptop", "Gaming & Editing", 12999000, { type: "DDR5-5200 SODIMM", perGB: DDR5, soldered: 0, slots: 2, slotMax: 32, modules: [8, 8] }, { total: 2, used: 1, gen: "PCIe 4.0 x4", size: "2280" }, { total: 0, used: 0 }, [512],
    { score: 0, text: "GPU RTX Laptop tersolder ke motherboard." }, { score: 0, text: "CPU tersolder langsung ke motherboard." },
    [["ok", "Dua slot SODIMM DDR5 mendukung upgrade dari 16 GB ke 32 GB (2×16 GB) atau 64 GB untuk editing 4K & game berat."], ["ok", "Tersedia slot M.2 kedua yang kosong khusus untuk menambah SSD game & file proyek."]]),
  dev("tuf-a15", "ASUS", "ASUS TUF Gaming A15 FA507 (16 GB / 512 GB)", "Laptop", "Gaming & Editing", 15499000, { type: "DDR5-4800 SODIMM", perGB: DDR5, soldered: 0, slots: 2, slotMax: 32, modules: [8, 8] }, { total: 2, used: 1, gen: "PCIe 4.0 x4", size: "2280" }, { total: 0, used: 0 }, [512],
    { score: 0, text: "GPU RTX Laptop tersolder ke motherboard." }, { score: 0, text: "CPU tersolder langsung ke motherboard." },
    [["ok", "Dua slot SODIMM DDR5 mudah diakses untuk upgrade hingga 64 GB."], ["ok", "Slot M.2 NVMe Gen4 kedua siap pasang tanpa membongkar drive OS bawaan."]]),
  dev("thin15", "MSI", "MSI Thin 15 B12UCX (8 GB / 512 GB)", "Laptop", "Gaming Entry", 9999000, { type: "DDR4-3200 SODIMM", perGB: DDR4, soldered: 0, slots: 2, slotMax: 32, modules: [8] }, { total: 1, used: 1, gen: "PCIe 4.0 x4", size: "2280" }, { total: 1, used: 0 }, [512],
    { score: 0, text: "GPU diskrit tersolder di board laptop." }, { score: 0, text: "CPU tersolder langsung ke motherboard." },
    [["ok", "Baru terisi 1 keping 8 GB: menambahkan 1 keping 8 GB mengaktifkan dual-channel 16 GB dengan biaya sangat terjangkau."], ["ok", "Masih tersedia satu bay SATA 2,5 inci kosong untuk SSD tambahan."]]),
  dev("lat7440", "Dell", "Dell Latitude 7440 (16 GB / 512 GB)", "Laptop", "Ultrabook Bisnis", 22400000, { type: "LPDDR5x (tersolder)", perGB: 0, soldered: 16, slots: 0, slotMax: 0, modules: [] }, { total: 1, used: 1, gen: "PCIe 4.0 x4", size: "2230 atau 2280" }, { total: 0, used: 0 }, [512],
    { score: 0, text: "Grafis terintegrasi, tidak dapat di-upgrade." }, { score: 0, text: "CPU tersolder langsung ke motherboard." },
    [["warn", "RAM tersolder permanen. Pilih varian 32 GB sejak awal jika Anda rutin mengedit video atau menjalankan VM."], ["ok", "SSD dapat diganti dan mendukung ukuran 2230 maupun 2280."], ["warn", "Tidak ada slot penyimpanan kedua."]]),
  dev("elite840", "HP", "HP EliteBook 840 G9 (Recertified A+)", "Laptop", "Bisnis & Kuliah", 8200000, { type: "DDR5-4800 SODIMM", perGB: DDR5, soldered: 0, slots: 2, slotMax: 32, modules: [8, 8] }, { total: 2, used: 1, gen: "PCIe 4.0 x4", size: "2280" }, { total: 0, used: 0 }, [512],
    { score: 0, text: "Grafis terintegrasi, tidak dapat di-upgrade." }, { score: 0, text: "CPU tersolder langsung ke motherboard." },
    [["ok", "Dua slot SODIMM mendukung hingga 64 GB. Gunakan pasangan identik untuk menjaga kecepatan dual-channel."], ["ok", "Slot M.2 kedua masih kosong untuk drive data tambahan."]]),
  dev("g14", "ASUS", "ASUS ROG Zephyrus G14 (32 GB / 1 TB)", "Laptop", "Kreator Premium", 33500000, { type: "LPDDR5x (tersolder)", perGB: 0, soldered: 32, slots: 0, slotMax: 0, modules: [] }, { total: 1, used: 1, gen: "PCIe 4.0 x4", size: "2280" }, { total: 0, used: 0 }, [1000],
    { score: 0, text: "GPU tersolder langsung ke motherboard." }, { score: 0, text: "CPU tersolder langsung ke motherboard." },
    [["warn", "RAM terkunci di 32 GB dan tidak bisa ditambah di kemudian hari."], ["ok", "Satu slot M.2 2280 dapat di-upgrade ke SSD NVMe 2 TB atau 4 TB."], ["warn", "Sasis tipis cenderung cepat hangat; pilih SSD dengan efisiensi termal rendah."]]),
  dev("legion5", "Lenovo", "Lenovo Legion Pro 5 (32 GB / 1 TB)", "Laptop", "Gaming & Kreator", 29900000, { type: "DDR5-5600 SODIMM", perGB: DDR5, soldered: 0, slots: 2, slotMax: 32, modules: [16, 16] }, { total: 2, used: 1, gen: "PCIe 4.0 x4", size: "2280" }, { total: 0, used: 0 }, [1000],
    { score: 0, text: "GPU tersolder langsung ke motherboard." }, { score: 0, text: "CPU tersolder langsung ke motherboard." },
    [["ok", "Dua slot SODIMM dapat ditingkatkan dari 32 GB ke 64 GB memakai dua keping 32 GB."], ["ok", "Slot M.2 kedua masih kosong dan siap pasang."]]),
  dev("prec5570", "Dell", "Dell Precision 5570 (32 GB / 1 TB)", "Laptop", "Workstation CAD/3D", 25000000, { type: "DDR5-4800 SODIMM", perGB: DDR5, soldered: 0, slots: 2, slotMax: 32, modules: [16, 16] }, { total: 2, used: 1, gen: "PCIe 4.0 x4", size: "2280" }, { total: 0, used: 0 }, [1000],
    { score: 0, text: "GPU workstation tersolder ke motherboard." }, { score: 0, text: "CPU tersolder langsung ke motherboard." },
    [["ok", "Mendukung ekspansi RAM hingga 64 GB pada dua slot SODIMM."], ["warn", "Periksa panduan servis untuk ukuran fisik slot M.2 kedua sebelum membeli drive."]]),
  dev("optiplex7090", "Dell", "Dell OptiPlex 7090 SFF (Recertified A+)", "Desktop", "Kantor & Enterprise", 6300000, { type: "DDR4-2933 DIMM", perGB: DDR4, soldered: 0, slots: 2, slotMax: 64, modules: [8, 8] }, { total: 2, used: 1, gen: "PCIe 3.0 x4", size: "2280" }, { total: 1, used: 0 }, [512],
    { score: 7, text: "Slot PCIe x16 low-profile. PSU bawaan membatasi GPU hingga sekitar 75 W." }, { score: 8, text: "Soket LGA1200: mendukung hingga Intel Core gen 10/11 sesuai batas pendingin." },
    [["ok", "Dua slot DIMM. Naik dari 16 GB ke 64 GB memerlukan penggantian kedua keping RAM."], ["ok", "Tersedia satu slot M.2 kosong dan satu ruang drive 2,5 inci."], ["warn", "Hanya mendukung kartu grafis low-profile karena dimensi casing dan daya PSU ringkas."]]),
  dev("prodesk400", "HP", "HP ProDesk 400 G7 SFF (Recertified A+)", "Desktop", "Kantor & Lab", 4750000, { type: "DDR4-2933 DIMM", perGB: DDR4, soldered: 0, slots: 2, slotMax: 32, modules: [8] }, { total: 1, used: 1, gen: "PCIe 3.0 x4", size: "2280" }, { total: 2, used: 0 }, [256],
    { score: 7, text: "Slot PCIe x16 low-profile: cocok untuk GPU 75 W seperti RTX 3050 LP 6 GB." }, { score: 8, text: "Soket LGA1200: mendukung upgrade ke Core i5/i7 gen 10." },
    [["ok", "Satu slot DIMM masih kosong: pasang 1 keping 8 GB untuk mengaktifkan dual-channel 16 GB."], ["ok", "Tersedia dua port SATA kosong untuk SSD 2,5 inci atau HDD arsip."]]),
  dev("elitedesk800", "HP", "HP EliteDesk 800 G6 Mini (Recertified A+)", "Desktop", "Mini PC Kantor", 4900000, { type: "DDR4-2666 SODIMM", perGB: DDR4, soldered: 0, slots: 2, slotMax: 32, modules: [8, 8] }, { total: 2, used: 1, gen: "PCIe 3.0 x4", size: "2280" }, { total: 0, used: 0 }, [256],
    { score: 0, text: "Tidak ada slot PCIe: grafis tetap terintegrasi." }, { score: 5, text: "Soket LGA1200, terbatas untuk prosesor seri-T 35 W." },
    [["ok", "Mendukung hingga 64 GB melalui dua slot SODIMM."], ["ok", "Slot M.2 kedua masih kosong."], ["warn", "Tidak tersedia jalur upgrade kartu grafis diskrit pada sasis Mini PC ini."]]),
  dev("m70q", "Lenovo", "ThinkCentre M70q Gen 3 Tiny (Recertified A+)", "Desktop", "Mini PC Kantor", 5400000, { type: "DDR4-3200 SODIMM", perGB: DDR4, soldered: 0, slots: 2, slotMax: 32, modules: [16] }, { total: 1, used: 1, gen: "PCIe 4.0 x4", size: "2280" }, { total: 1, used: 0 }, [512],
    { score: 0, text: "Tidak ada slot PCIe untuk GPU diskrit." }, { score: 6, text: "Soket LGA1700 seri-T 35 W (hingga Core i7-12700T)." },
    [["ok", "Terpasang satu keping 16 GB: tambah satu keping 16 GB lagi menjadi 32 GB dual-channel."], ["ok", "Tersedia bay SATA 2,5 inci kosong untuk penyimpanan tambahan."]]),
  dev("b2c-rig", "ViciTech", "ViciTech Creator & Gaming Rig", "Desktop", "Gaming & Kreator", 29550000, { type: "DDR5-6000 DIMM", perGB: DDR5, soldered: 0, slots: 4, slotMax: 32, modules: [16, 16] }, { total: 2, used: 1, gen: "PCIe 4.0 x4", size: "2280" }, { total: 4, used: 0 }, [1000],
    { score: 15, text: "Slot PCIe 4.0 x16 dan PSU 750 W: siap untuk GPU kelas RTX 4080." }, { score: 12, text: "Soket AM5: mendukung upgrade langsung hingga Ryzen 9 7950X dan generasi AM5 terbaru." },
    [["ok", "Empat slot DIMM: tambah dua keping 16 GB identik untuk mencapai 64 GB."], ["ok", "Satu slot M.2 dan empat port SATA masih tersedia."], ["warn", "Pastikan panjang kartu dan konektor daya PSU sebelum mengganti GPU lebih besar."]]),
  dev("b2s-lab", "ViciTech", "ViciTech CBT Labkom Standard PC", "Desktop", "Lab Sekolah", 5600000, { type: "DDR4-3200 DIMM", perGB: DDR4, soldered: 0, slots: 2, slotMax: 32, modules: [8] }, { total: 1, used: 0, gen: "PCIe 3.0 x4", size: "2280" }, { total: 4, used: 1 }, [256],
    { score: 12, text: "Slot PCIe x16 kosong, namun PSU 350 W membatasi GPU hingga kisaran 120 W." }, { score: 12, text: "Soket LGA1700: dapat di-upgrade hingga Core i5-12400 sesuai kapasitas pendingin." },
    [["ok", "Terpasang satu keping 8 GB dengan satu slot kosong: tambah satu keping 8 GB untuk mengaktifkan dual-channel."], ["ok", "Slot M.2 masih kosong. Memindahkan OS ke NVMe mempercepat waktu booting ujian."], ["warn", "Upgrade PSU 350 W terlebih dahulu sebelum memasang kartu grafis tambahan."]]),
];

const BRAND_FILTERS = ["Semua Merek", ...new Set(DEVICES.map((item) => item.brand))];
const CATEGORY_FILTERS = ["Semua", "Laptop", "Desktop"];
const DEFAULT_VISIBLE_DEVICES = 6;

const STORE_OPTS = [
  { id: "keep", label: "Pertahankan penyimpanan saat ini" },
  { id: "nvme1", label: "Tambah 1 TB NVMe SSD", gb: 1000, cost: 1250000, need: "m2" },
  { id: "nvme2", label: "Tambah 2 TB NVMe SSD", gb: 2000, cost: 2400000, need: "m2" },
  { id: "sata2", label: "Tambah 2 TB SATA SSD", gb: 2000, cost: 1600000, need: "sata" },
  { id: "swap2", label: "Ganti drive utama dengan 2 TB NVMe SSD", gb: 2000, cost: 2400000, replace: true },
];

const MANUAL_RAM_CAPACITIES = [4, 8, 12, 16, 24, 32, 64];
const MANUAL_STORAGE_CAPACITIES = [
  { value: 128, label: "128 GB" },
  { value: 256, label: "256 GB" },
  { value: 512, label: "512 GB" },
  { value: 1000, label: "1 TB" },
  { value: 2000, label: "2 TB" },
];

/* ───────────────────────── Helpers dan kalkulasi ───────────────────────── */

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

function estimatePresetPerformanceGain(d, ramPlan, storeOpt) {
  const installed = ramInstalled(d);
  let multitaskGainPct = 0;
  if (ramPlan) {
    const ratio = ramPlan.total / Math.max(4, installed);
    const dualChannelBonus = d.ram.soldered === 0 && d.ram.modules.length === 1 && ramPlan.n >= 2 ? 15 : 0;
    multitaskGainPct = Math.min(85, Math.max(25, Math.round((ratio - 1) * 32 + dualChannelBonus)));
  }

  let storageGainPct = 0;
  let storageLabel = "";
  if (storeOpt.id !== "keep") {
    if (d.m2.used === 0 && storeOpt.need === "m2") {
      storageGainPct = 90;
      storageLabel = "Booting & loading aplikasi hingga 4× lebih cepat via NVMe";
    } else if (storeOpt.replace) {
      storageGainPct = 45;
      storageLabel = "Kapasitas lega & kecepatan baca/tulis berkelanjutan meningkat";
    } else {
      storageGainPct = 35;
      storageLabel = "Ruang kerja & scratch disk terpisah tanpa membebani drive OS";
    }
  }

  const combinedBoostPct = Math.min(95, Math.round(multitaskGainPct * 0.65 + storageGainPct * 0.55));
  return {
    multitaskGainPct,
    storageGainPct,
    storageLabel,
    combinedBoostPct,
  };
}

/* ───────────────────────── Komponen UI ───────────────────────── */

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
  const r = 34;
  const len = 2 * Math.PI * r;
  const strokeTone =
    value >= 75
      ? "stroke-emerald-600"
      : value >= 45
        ? "stroke-amber-500"
        : "stroke-rose-600";
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
        className={`${strokeTone} transition-[stroke-dasharray,stroke] duration-500 motion-reduce:transition-none`}
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
  const freeM2 = d.m2.total - d.m2.used;
  const freeSata = d.sata.total - d.sata.used;
  const allowed = (o) => !o.need || (o.need === "m2" ? freeM2 > 0 : freeSata > 0);
  const storageAfter = opt.id === "keep" ? storageNow : opt.replace ? storageNow - d.drives[0] + opt.gb : storageNow + opt.gb;
  const cost = (ramPlan?.cost ?? 0) + (opt.cost ?? 0);
  const perfGain = useMemo(() => estimatePresetPerformanceGain(d, ramPlan, opt), [d, ramPlan, opt]);

  const hints = [];
  if (ramPlan) {
    hints.push(
      ramPlan.total >= 32
        ? "Kapasitas 32 GB ke atas ideal untuk editing 4K, mesin virtual, dan multitasking berat."
        : "Penambahan RAM membantu browser, office, dan aplikasi kerja tetap responsif.",
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

  const handleConsultUpgrade = () => {
    const prompt = [
      `Halo ViciTech AI, saya berencana melakukan upgrade untuk perangkat ${d.name} (${d.kind}).`,
      `- Konfigurasi saat ini: ${installed} GB RAM (${d.ram.type}), penyimpanan ${fmtGB(storageNow)}.`,
      `- Target rencana upgrade: RAM ${ramPlan ? `naik ke ${ramPlan.total} GB (${ramPlan.n} × ${ramPlan.s} GB)` : `tetap ${installed} GB`}, penyimpanan ${opt.id === "keep" ? `tetap ${fmtGB(storageNow)}` : `${opt.label} (total ${fmtGB(storageAfter)})`}.`,
      `- Estimasi biaya komponen: ${cost > 0 ? idr(cost) : "Belum memilih komponen tambahan"}.`,
      `Apakah stok komponen upgrade yang kompatibel tersedia di ViciTech Market / mitra servis, dan bagaimana jadwal booking pemasangannya?`,
    ].join("\n");
    openAiConsultation(prompt);
  };

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

      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <div className="rounded-lg border border-default bg-canvas p-3">
          <dt className="text-xs text-secondary">Target RAM</dt>
          <dd className="mt-0.5 font-mono text-primary">
            {installed} GB <span className="text-secondary">→</span>{" "}
            <span className={ramPlan ? "font-semibold text-status-live" : ""}>
              {ramPlan ? ramPlan.total : installed} GB
            </span>
          </dd>
        </div>
        <div className="rounded-lg border border-default bg-canvas p-3">
          <dt className="text-xs text-secondary">Target Penyimpanan</dt>
          <dd className="mt-0.5 font-mono text-primary">
            {fmtGB(storageNow)} <span className="text-secondary">→</span>{" "}
            <span className={opt.id !== "keep" ? "font-semibold text-status-live" : ""}>
              {fmtGB(storageAfter)}
            </span>
          </dd>
        </div>
      </dl>

      {/* Ringkasan Estimasi Biaya + Indikator Peningkatan Performa */}
      <div className="mt-4 rounded-xl border border-accent-primary/25 bg-accent-subtle p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-secondary">Total Estimasi Biaya Komponen</p>
            <p className="mt-0.5 font-mono text-xl font-bold tabular-nums text-accent-cta">
              {idr(cost)}
            </p>
          </div>
          {perfGain.combinedBoostPct > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-600/20 bg-emerald-50 px-3 py-1 font-mono text-xs font-semibold text-emerald-800">
              <TrendingUp className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
              <span>Estimasi +{perfGain.combinedBoostPct}% Performa</span>
            </span>
          )}
        </div>

        {perfGain.combinedBoostPct > 0 ? (
          <div className="mt-3 space-y-2 border-t border-accent-primary/15 pt-3">
            {perfGain.multitaskGainPct > 0 && (
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-primary">Kelancaran Multitasking &amp; Tab Berat</span>
                  <span className="font-mono font-semibold tabular-nums text-status-live">
                    +{perfGain.multitaskGainPct}%
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface">
                  <div
                    className="h-full rounded-full bg-status-live transition-all duration-500 motion-reduce:transition-none"
                    style={{ width: `${Math.min(100, perfGain.multitaskGainPct)}%` }}
                  />
                </div>
              </div>
            )}
            {perfGain.storageGainPct > 0 && (
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-primary">Kecepatan Loading &amp; Ruang Proyek</span>
                  <span className="font-mono font-semibold tabular-nums text-accent-cta">
                    +{perfGain.storageGainPct}%
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface">
                  <div
                    className="h-full rounded-full bg-accent-primary transition-all duration-500 motion-reduce:transition-none"
                    style={{ width: `${Math.min(100, perfGain.storageGainPct)}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-secondary">{perfGain.storageLabel}</p>
              </div>
            )}
          </div>
        ) : (
          <p className="mt-2 border-t border-accent-primary/15 pt-2.5 text-xs text-secondary">
            Pilih opsi penambahan RAM atau SSD di atas untuk melihat proyeksi lonjakan performa dan total biaya komponen.
          </p>
        )}
      </div>

      {hints.length > 0 && (
        <ul className="mt-3.5 space-y-1.5">
          {hints.map((h) => (
            <li key={h} className="flex gap-2 text-sm text-secondary">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-status-live" strokeWidth={1.75} aria-hidden="true" />
              <span>{h}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 space-y-2.5">
        <button
          type="button"
          onClick={handleConsultUpgrade}
          className={`vt-motion-press vt-btn-tactile inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent-cta px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-cta-hover ${focusRing}`}
        >
          <Wrench className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
          <span>Booking Upgrade / Tanya Stok</span>
        </button>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Link
            href="/partners"
            className={`vt-motion-press vt-btn-tactile inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-default bg-canvas px-3.5 py-2 text-xs font-semibold text-primary transition-colors hover:border-accent-primary/40 hover:bg-subtle ${focusRing}`}
          >
            <MapPin className="h-4 w-4 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
            <span>Cari Mitra Servis</span>
          </Link>

          {onNavigate ? (
            <button
              type="button"
              onClick={() => onNavigate("bottleneck")}
              className={`vt-motion-press vt-btn-tactile inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-default bg-canvas px-3.5 py-2 text-xs font-semibold text-primary transition-colors hover:border-accent-primary/40 hover:bg-subtle ${focusRing}`}
            >
              <Gauge className="h-4 w-4 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
              <span>Cek Bottleneck</span>
            </button>
          ) : (
            <Link
              href="/bottleneck"
              className={`vt-motion-press vt-btn-tactile inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-default bg-canvas px-3.5 py-2 text-xs font-semibold text-primary transition-colors hover:border-accent-primary/40 hover:bg-subtle ${focusRing}`}
            >
              <Gauge className="h-4 w-4 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
              <span>Cek Bottleneck</span>
            </Link>
          )}
        </div>
      </div>

      <p className="mt-3 text-xs text-secondary">
        Harga merupakan estimasi referensi komponen baru. Biaya RAM hanya menghitung modul baru yang perlu dibeli.
      </p>
    </section>
  );
}

/* ───────────────────────── Mode Input Manual ───────────────────────── */

function ManualUpgradePanel({ initialModelName = "" }) {
  const [form, setForm] = useState({
    deviceType: "laptop",
    modelName: initialModelName,
    currentRamGb: 8,
    ramType: "unknown",
    storageType: "hdd",
    currentStorageGb: 512,
    useCase: "office",
  });

  useEffect(() => {
    if (initialModelName) {
      setForm((prev) => ({ ...prev, modelName: initialModelName }));
    }
  }, [initialModelName]);

  const analysis = useMemo(() => analyzeManualUpgrade(form), [form]);
  const selectClass = `vt-form-control min-h-11 w-full rounded-lg border border-default bg-canvas px-3 py-2.5 text-sm text-primary ${focusRing}`;

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-12">
      {/* Form Input Manual */}
      <section className={`${card} space-y-4 lg:sticky lg:top-24 lg:col-span-5 lg:self-start`} aria-labelledby="manual-form-title">
        <div className="border-b border-default pb-3">
          <h2 id="manual-form-title" className="tracking-tight flex items-center gap-2 font-sans text-lg font-bold text-primary">
            <SlidersHorizontal className="h-5 w-5 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
            <span>Spesifikasi Perangkat Anda</span>
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-secondary">
            Isi spesifikasi laptop atau PC Anda saat ini untuk melihat jalur upgrade maksimal dan estimasi biayanya.
          </p>
        </div>

        {/* Jenis Perangkat */}
        <div>
          <p className="mb-1.5 text-sm font-medium text-primary">Jenis Perangkat</p>
          <div role="radiogroup" aria-label="Pilih jenis perangkat" className="grid grid-cols-2 gap-2">
            {[
              { id: "laptop", label: "Laptop", Icon: Laptop },
              { id: "desktop", label: "Desktop PC", Icon: Monitor },
            ].map(({ id, label, Icon }) => {
              const active = form.deviceType === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setForm((prev) => ({ ...prev, deviceType: id }))}
                  className={`vt-motion-press inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${focusRing} ${
                    active
                      ? "border-accent-primary bg-accent-subtle font-semibold text-primary shadow-sm"
                      : "border-default bg-canvas text-secondary hover:bg-subtle hover:text-primary"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${active ? "text-accent-cta" : "text-secondary"}`} strokeWidth={1.75} aria-hidden="true" />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Merek & Nama Model */}
        <div>
          <label htmlFor="manual-model" className="mb-1.5 block text-sm font-medium text-primary">
            Merek &amp; Nama Model
          </label>
          <input
            id="manual-model"
            type="text"
            value={form.modelName}
            maxLength={100}
            onChange={(e) => setForm((prev) => ({ ...prev, modelName: e.target.value }))}
            placeholder={
              form.deviceType === "laptop"
                ? "cth. Acer Swift 3 SF314 atau ASUS VivoBook A416"
                : "cth. PC Rakitan Core i3-10100F atau Lenovo V530s"
            }
            className={selectClass}
          />
        </div>

        {/* RAM Saat Ini */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="manual-ram-gb" className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-primary">
              <MemoryStick className="h-4 w-4 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
              <span>RAM Saat Ini</span>
            </label>
            <select
              id="manual-ram-gb"
              value={form.currentRamGb}
              onChange={(e) => setForm((prev) => ({ ...prev, currentRamGb: Number(e.target.value) }))}
              className={selectClass}
            >
              {MANUAL_RAM_CAPACITIES.map((gb) => (
                <option key={gb} value={gb}>
                  {gb} GB
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="manual-ram-type" className="mb-1.5 block text-sm font-medium text-primary">
              Tipe &amp; Slot RAM
            </label>
            <select
              id="manual-ram-type"
              value={form.ramType}
              onChange={(e) => setForm((prev) => ({ ...prev, ramType: e.target.value }))}
              className={selectClass}
            >
              {Object.entries(MANUAL_RAM_TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Penyimpanan Saat Ini */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="manual-storage-type" className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-primary">
              <HardDrive className="h-4 w-4 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
              <span>Tipe Storage</span>
            </label>
            <select
              id="manual-storage-type"
              value={form.storageType}
              onChange={(e) => setForm((prev) => ({ ...prev, storageType: e.target.value }))}
              className={selectClass}
            >
              {Object.entries(MANUAL_STORAGE_TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="manual-storage-gb" className="mb-1.5 block text-sm font-medium text-primary">
              Kapasitas Storage
            </label>
            <select
              id="manual-storage-gb"
              value={form.currentStorageGb}
              onChange={(e) => setForm((prev) => ({ ...prev, currentStorageGb: Number(e.target.value) }))}
              className={selectClass}
            >
              {MANUAL_STORAGE_CAPACITIES.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Kebutuhan Utama */}
        <div>
          <p className="mb-1.5 text-sm font-medium text-primary">Kebutuhan Utama</p>
          <div role="radiogroup" aria-label="Pilih kebutuhan utama" className="grid grid-cols-2 gap-2">
            {Object.entries(MANUAL_USE_CASE_LABELS).map(([key, label]) => {
              const active = form.useCase === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setForm((prev) => ({ ...prev, useCase: key }))}
                  className={`vt-motion-press min-h-11 rounded-lg border px-3 py-2 text-xs font-medium transition-colors sm:text-sm ${focusRing} ${
                    active
                      ? "border-accent-primary bg-accent-subtle font-semibold text-primary shadow-sm"
                      : "border-default bg-canvas text-secondary hover:bg-subtle hover:text-primary"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Hasil Analisis Rule-Based + CTA Konsultasi ViciTech AI */}
      <div className="space-y-6 lg:col-span-7">
        <section className={card} aria-label="Ringkasan hasil analisis perangkat manual">
          <div className="flex flex-wrap items-center gap-5">
            <ScoreRing value={analysis.score} grade={analysis.grade} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-xs text-secondary">
                <span className="vt-badge-simulated">Analisis Instan</span>
                <span>{form.deviceType === "laptop" ? "Laptop" : "Desktop PC"}</span>
                <span>·</span>
                <span>{MANUAL_USE_CASE_LABELS[form.useCase]}</span>
              </div>
              <h3 className="mt-1.5 font-sans text-xl font-bold tracking-tight text-primary">
                {analysis.deviceLabel}
              </h3>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                <span className="vt-badge-live">Grade {analysis.grade[0]}</span>
                <span className="text-secondary">{analysis.grade[1]}</span>
              </p>
            </div>
          </div>

          {/* Biaya & Indikator Performa */}
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-accent-primary/25 bg-accent-subtle p-4">
              <p className="text-xs font-medium text-secondary">Estimasi Kisaran Biaya Upgrade</p>
              <p className="mt-1 font-mono text-lg font-bold tabular-nums text-accent-cta sm:text-xl">
                {analysis.costRange.minIdr === 0
                  ? "Rp 0 (Sudah Optimal)"
                  : `${idr(analysis.costRange.minIdr)} – ${idr(analysis.costRange.maxIdr)}`}
              </p>
              <ul className="mt-2 space-y-1 text-xs text-secondary">
                {analysis.costRange.breakdown.map((line) => (
                  <li key={line}>• {line}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-default bg-canvas p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-xs font-medium text-secondary">
                  <TrendingUp className="h-3.5 w-3.5 text-status-live" strokeWidth={1.75} aria-hidden="true" />
                  <span>Proyeksi Lonjakan Performa</span>
                </p>
                <span className="font-mono text-xs font-bold tabular-nums text-status-live">
                  +{analysis.perfBoostPct}%
                </span>
              </div>
              <p className="mt-1.5 text-sm font-semibold text-primary">{analysis.perfGainHeadline}</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-subtle">
                <div
                  className="h-full rounded-full bg-status-live transition-all duration-500 motion-reduce:transition-none"
                  style={{ width: `${analysis.perfBoostPct}%` }}
                />
              </div>
              <p className="mt-2 text-xs leading-relaxed text-secondary">{analysis.perfGainDetail}</p>
            </div>
          </div>
        </section>

        {/* Jalur Upgrade Maksimal */}
        <section className={card} aria-labelledby="manual-path-title">
          <h3 id="manual-path-title" className="tracking-tight flex items-center gap-2 font-sans text-lg font-bold text-primary">
            <Gauge className="h-5 w-5 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
            <span>Jalur Upgrade Disarankan</span>
          </h3>
          <dl className="mt-3 divide-y divide-default text-sm">
            <div className="grid gap-1 py-2.5 sm:grid-cols-4 sm:gap-3">
              <dt className="font-medium text-secondary">Memori (RAM)</dt>
              <dd className="text-primary sm:col-span-3">{analysis.ramPathText}</dd>
            </div>
            <div className="grid gap-1 py-2.5 sm:grid-cols-4 sm:gap-3">
              <dt className="font-medium text-secondary">Penyimpanan</dt>
              <dd className="text-primary sm:col-span-3">{analysis.storageTargetText}</dd>
            </div>
            <div className="grid gap-1 py-2.5 sm:grid-cols-4 sm:gap-3">
              <dt className="font-medium text-secondary">Platform &amp; Ekspansi</dt>
              <dd className="text-secondary sm:col-span-3">{analysis.platformNote}</dd>
            </div>
          </dl>
        </section>

        {/* Peringatan Bottleneck & Kompatibilitas */}
        <section className={card} aria-labelledby="manual-warn-title">
          <h3 id="manual-warn-title" className="tracking-tight font-sans text-lg font-bold text-primary">
            Peringatan Bottleneck &amp; Kompatibilitas
          </h3>
          {analysis.warnings.length > 0 ? (
            <ul className="mt-3 space-y-2.5">
              {analysis.warnings.map((w) => (
                <li
                  key={w.title}
                  className={`flex gap-2.5 rounded-lg border p-3 text-sm ${
                    w.tone === "critical"
                      ? "border-red-200 bg-red-50/70"
                      : w.tone === "warn"
                        ? "border-amber-200 bg-amber-50/60"
                        : "border-default bg-canvas"
                  }`}
                >
                  {w.tone === "ok" ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-status-live" strokeWidth={1.75} aria-hidden="true" />
                  ) : (
                    <AlertTriangle
                      className={`mt-0.5 h-4 w-4 shrink-0 ${w.tone === "critical" ? "text-status-danger" : "text-status-sample"}`}
                      strokeWidth={1.75}
                      aria-hidden="true"
                    />
                  )}
                  <div>
                    <p className="font-semibold text-primary">{w.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-secondary">{w.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 flex items-center gap-2 text-sm text-emerald-800">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-status-live" strokeWidth={1.75} aria-hidden="true" />
              <span>Tidak ada peringatan bottleneck kritis untuk kombinasi perangkat dan kebutuhan Anda.</span>
            </p>
          )}

          {/* 1-Click CTA ke ViciTech AI */}
          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-default pt-4">
            <button
              type="button"
              onClick={() => openAiConsultation(analysis.aiPrompt)}
              className={`vt-motion-press vt-btn-tactile inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-accent-cta px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-cta-hover sm:flex-initial ${focusRing}`}
            >
              <Bot className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              <span>Konsultasi Upgrade ke ViciTech AI</span>
            </button>

            <Link
              href="/partners"
              className={`vt-motion-press vt-btn-tactile inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-default bg-canvas px-4 py-2.5 text-xs font-semibold text-primary hover:border-accent-primary/40 hover:bg-subtle ${focusRing}`}
            >
              <MapPin className="h-4 w-4 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
              <span>Cari Mitra Servis</span>
            </Link>

            <Link
              href="/trade-in"
              className={`vt-motion-press vt-btn-tactile inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-default bg-surface px-4 py-2.5 text-xs font-medium text-secondary hover:bg-subtle hover:text-primary ${focusRing}`}
            >
              <Sparkles className="h-4 w-4 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
              <span>Simulasi Trade-In</span>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

/* ───────────────────────── Halaman Utama Upgrade Analyzer ───────────────────────── */

export default function UpgradeAnalyzer({ deviceId, onDeviceChange, onNavigate }) {
  const { t } = useLanguage();
  const upg = t.routes.upgrade;
  const [localId, setLocalId] = useState("t14");
  const [analyzerMode, setAnalyzerMode] = useState("preset");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Semua");
  const [brandFilter, setBrandFilter] = useState("Semua Merek");
  const [showAllPresets, setShowAllPresets] = useState(false);
  const [manualSeedModel, setManualSeedModel] = useState("");

  useEffect(() => {
    if (deviceId) {
      setAnalyzerMode("preset");
    }
  }, [deviceId]);

  const id = deviceId ?? localId;
  const pick = (next) => (onDeviceChange ? onDeviceChange(next) : setLocalId(next));
  const d = DEVICES.find((x) => x.id === id) || DEVICES[0];

  const categoryCounts = useMemo(
    () =>
      Object.fromEntries(
        CATEGORY_FILTERS.map((cat) => [
          cat,
          cat === "Semua" ? DEVICES.length : DEVICES.filter((item) => item.kind === cat).length,
        ]),
      ),
    [],
  );

  const filteredDevices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return DEVICES.filter((item) => {
      if (categoryFilter !== "Semua" && item.kind !== categoryFilter) return false;
      if (brandFilter !== "Semua Merek" && item.brand !== brandFilter) return false;
      if (!q) return true;
      const hay = `${item.brand} ${item.name} ${item.kind} ${item.segment} ${item.ram.type}`.toLowerCase();
      return hay.includes(q);
    });
  }, [searchQuery, categoryFilter, brandFilter]);

  const isFiltered =
    Boolean(searchQuery.trim()) || categoryFilter !== "Semua" || brandFilter !== "Semua Merek";

  const displayedDevices = useMemo(() => {
    if (isFiltered || showAllPresets || filteredDevices.length <= DEFAULT_VISIBLE_DEVICES) {
      return filteredDevices;
    }
    const baseSlice = filteredDevices.slice(0, DEFAULT_VISIBLE_DEVICES);
    if (baseSlice.some((item) => item.id === d.id)) {
      return baseSlice;
    }
    return [d, ...baseSlice.slice(0, DEFAULT_VISIBLE_DEVICES - 1)];
  }, [filteredDevices, isFiltered, showAllPresets, d]);

  const sc = useMemo(() => scoreOf(d), [d]);
  const installed = ramInstalled(d);
  const max = ramMax(d);
  const freeM2 = d.m2.total - d.m2.used;
  const freeSata = d.sata.total - d.sata.used;
  const maxStorage = (d.m2.total + d.sata.total) * 2000;
  const Kind = d.kind === "Laptop" ? Laptop : Monitor;

  const openManualWithQuery = () => {
    setManualSeedModel(searchQuery.trim());
    setAnalyzerMode("manual");
  };

  return (
    <div className="bg-canvas text-primary antialiased">
      <div className="mx-auto max-w-7xl px-4 pb-24 pt-8 sm:px-6 sm:pb-24 sm:pt-10 lg:px-8">
        <div className="flex flex-wrap items-center gap-2">
          <span className="vt-badge-sample">{upg.badge}</span>
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-cta">
            {upg.eyebrow}
          </span>
        </div>
        <h1 className="mt-3 flex items-center gap-3 font-sans text-3xl font-bold tracking-tight text-primary sm:text-4xl">
          <ArrowRightLeft className="h-8 w-8 shrink-0 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
          <span>{upg.title}</span>
        </h1>
        <p className="mt-3 max-w-2xl text-secondary">
          {upg.desc}
        </p>

        {/* Pengalih Mode: Katalog Preset vs Input Manual */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div
            role="tablist"
            aria-label="Mode analisis perangkat"
            className="inline-flex flex-wrap gap-1 rounded-xl border border-default bg-surface p-1 shadow-sm"
          >
            <button
              type="button"
              role="tab"
              aria-selected={analyzerMode === "preset"}
              onClick={() => setAnalyzerMode("preset")}
              className={`vt-motion-press inline-flex min-h-11 items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-colors sm:text-sm ${focusRing} ${
                analyzerMode === "preset"
                  ? "bg-accent-cta text-white shadow-sm"
                  : "text-secondary hover:bg-subtle hover:text-primary"
              }`}
            >
              <Laptop className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              <span>Katalog Preset ({DEVICES.length})</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={analyzerMode === "manual"}
              onClick={() => setAnalyzerMode("manual")}
              className={`vt-motion-press inline-flex min-h-11 items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-colors sm:text-sm ${focusRing} ${
                analyzerMode === "manual"
                  ? "bg-accent-cta text-white shadow-sm"
                  : "text-secondary hover:bg-subtle hover:text-primary"
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              <span>Cek Perangkat Lain / Input Manual</span>
            </button>
          </div>
        </div>

        {analyzerMode === "manual" ? (
          <ManualUpgradePanel initialModelName={manualSeedModel} />
        ) : (
          <>
            {/* Search Bar + Filter Kategori & Merek */}
            <section className="mt-6 rounded-xl border border-default bg-surface p-4 shadow-sm sm:p-5" aria-label="Filter dan pilih perangkat preset">
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <div className="relative flex-1">
                  <label htmlFor="upgrade-device-search" className="sr-only">
                    Cari perangkat berdasarkan merek atau seri
                  </label>
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary" aria-hidden="true" />
                  <input
                    id="upgrade-device-search"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari merek atau model (cth. ThinkPad, Vivobook, Nitro, OptiPlex)…"
                    className={`vt-form-control min-h-11 w-full rounded-lg border border-default bg-subtle py-2.5 pl-10 pr-10 text-sm text-primary placeholder:text-secondary focus:bg-surface ${focusRing}`}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      aria-label="Hapus kata kunci pencarian"
                      className={`absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-secondary hover:bg-subtle hover:text-primary ${focusRing}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Filter Kategori: Semua / Laptop / Desktop */}
                <div role="group" aria-label="Filter kategori perangkat" className="flex flex-wrap gap-1.5">
                  {CATEGORY_FILTERS.map((cat) => {
                    const active = categoryFilter === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setCategoryFilter(cat)}
                        className={`vt-motion-press inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-semibold transition-all duration-200 ease-smooth active:scale-[0.98] sm:text-sm ${focusRing} ${
                          active
                            ? "border-accent-primary bg-accent-primary text-white"
                            : "border-default bg-canvas text-secondary hover:bg-subtle hover:text-primary"
                        }`}
                      >
                        <span>{cat}</span>
                        <span className="font-mono text-[11px] opacity-80">{categoryCounts[cat]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Filter Merek */}
              <div
                role="group"
                aria-label="Filter berdasarkan merek"
                className="no-scrollbar mt-3 flex flex-nowrap gap-1.5 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible md:pb-0"
              >
                {BRAND_FILTERS.map((brand) => {
                  const active = brandFilter === brand;
                  return (
                    <button
                      key={brand}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setBrandFilter(brand)}
                      className={`vt-motion-press min-h-9 shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium transition-colors ${focusRing} ${
                        active
                          ? "border-accent-primary/40 bg-accent-subtle font-semibold text-accent-cta"
                          : "border-default bg-canvas text-secondary hover:bg-subtle hover:text-primary"
                      }`}
                    >
                      {brand}
                    </button>
                  );
                })}
              </div>

              {/* Daftar Perangkat Terstruktur */}
              {displayedDevices.length > 0 ? (
                <>
                  <div
                    role="radiogroup"
                    aria-label="Daftar perangkat preset"
                    className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3"
                  >
                    {displayedDevices.map((x) => {
                      const active = x.id === d.id;
                      const ItemIcon = x.kind === "Laptop" ? Laptop : Monitor;
                      const freeSlots = x.m2.total - x.m2.used + (x.sata.total - x.sata.used);
                      return (
                        <button
                          key={x.id}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() => pick(x.id)}
                          className={`vt-motion-press flex min-h-11 flex-col justify-between rounded-xl border p-3.5 text-left transition-all ${focusRing} ${
                            active
                              ? "border-accent-primary bg-accent-subtle shadow-sm ring-1 ring-accent-primary/20"
                              : "border-default bg-canvas hover:border-accent-primary/35 hover:bg-subtle"
                          }`}
                        >
                          <div className="flex w-full items-center justify-between gap-2 text-xs">
                            <span className="inline-flex items-center gap-1.5 font-semibold text-secondary">
                              <ItemIcon className={`h-3.5 w-3.5 ${active ? "text-accent-cta" : "text-secondary"}`} strokeWidth={1.75} aria-hidden="true" />
                              <span>{x.brand} · {x.kind}</span>
                            </span>
                            <span className="rounded bg-surface px-1.5 py-0.5 text-[11px] font-medium text-secondary">
                              {x.segment}
                            </span>
                          </div>
                          <p className="mt-1.5 text-sm font-semibold leading-snug text-primary">{x.name}</p>
                          <p className="mt-1.5 font-mono text-xs tabular-nums text-secondary">
                            RAM {ramInstalled(x)}→{ramMax(x)} GB · {freeSlots > 0 ? `${freeSlots} slot kosong` : "1 slot utama"}
                          </p>
                        </button>
                      );
                    })}
                  </div>

                  {!isFiltered && filteredDevices.length > DEFAULT_VISIBLE_DEVICES && (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-default pt-3">
                      <p className="text-xs text-secondary">
                        Menampilkan {displayedDevices.length} dari {filteredDevices.length} perangkat preset.
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowAllPresets((prev) => !prev)}
                        className={`vt-motion-press min-h-10 rounded-lg border border-default bg-canvas px-3.5 py-1.5 text-xs font-semibold text-primary hover:border-accent-primary/40 hover:bg-subtle ${focusRing}`}
                      >
                        {showAllPresets
                          ? "Tampilkan Lebih Ringkas"
                          : `Tampilkan Semua (${filteredDevices.length} Perangkat)`}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="mt-4 rounded-xl border border-dashed border-default bg-canvas p-6 text-center">
                  <p className="text-sm font-semibold text-primary">
                    Perangkat “{searchQuery.trim()}” belum ada di katalog preset.
                  </p>
                  <p className="mt-1 text-xs text-secondary">
                    Gunakan mode Input Manual untuk menganalisis potensi upgrade laptop atau PC Anda secara instan.
                  </p>
                  <button
                    type="button"
                    onClick={openManualWithQuery}
                    className={`vt-motion-press vt-btn-tactile mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent-cta px-4 py-2 text-xs font-semibold text-white hover:bg-accent-cta-hover ${focusRing}`}
                  >
                    <SlidersHorizontal className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                    <span>Cek lewat Input Manual →</span>
                  </button>
                </div>
              )}
            </section>

            {/* Detail Skor, Peta Slot & Perencana Upgrade Preset */}
            <div className="mt-6 grid gap-6 lg:grid-cols-5">
              <div className="space-y-6 lg:col-span-3">
                {/* Skor Potensi Upgrade */}
                <section className={card} aria-label="Skor potensi upgrade">
                  <div className="flex flex-wrap items-center gap-5">
                    <ScoreRing value={sc.total} grade={sc.grade} />
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 text-sm text-secondary">
                        <Kind className="h-4 w-4 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
                        <span>{d.brand} · {d.kind}</span>
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
                      <div key={k} className="grid grid-cols-1 gap-1 py-2.5 sm:grid-cols-4 sm:gap-3">
                        <dt className="text-xs font-medium text-secondary sm:text-sm">{k}</dt>
                        <dd className="flex gap-2 text-primary sm:col-span-3">
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

              <div className="space-y-6 lg:sticky lg:top-24 lg:col-span-2 lg:self-start">
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
          </>
        )}
      </div>
    </div>
  );
}
