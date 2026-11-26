import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sliders, CheckCircle2, Zap, Building2, GraduationCap, Gamepad2, ShoppingCart, FileText, RefreshCw,
  Cpu, CircuitBoard, MemoryStick, HardDrive, Gauge, Monitor, ShieldCheck, Truck, Bookmark, Plus, Minus, X,
  LoaderCircle, Wind, Box, Copy, Check, Wrench, Sparkles, Video, ExternalLink, Store,
} from "lucide-react";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { saveUserPreset } from "@/lib/supabase";
import { getSupabaseBrowserClient, isSupabaseAuthConfigured } from "@/lib/supabase/client";
import { useCheckout } from "@/context/CheckoutContext";
import { listHardwareComponents } from "@/lib/hardware/components";
import { buildMarketCatalogUrl, matchPartToMarket } from "@/lib/part-matcher";

/* ───────────────────────── Katalog (data referensi, harga dalam IDR) ───────────────────────── */

const part = (id, name, spec, price, w, wr, extra = {}) => ({ id, name, spec, price, w, wr, ...extra });

const BASE_CATALOG = {
  cpu: [
    part("i3-12100", "Intel Core i3-12100", "4C / 8T, LGA1700", 1900000, 60, 36, { sk: "LGA1700" }),
    part("i5-12400", "Intel Core i5-12400", "6C / 12T, LGA1700", 2700000, 65, 36, { sk: "LGA1700" }),
    part("r5-5600", "AMD Ryzen 5 5600", "6C / 12T, AM4", 2200000, 65, 36, { sk: "AM4" }),
    part("i5-13600k", "Intel Core i5-13600K", "14C / 20T, LGA1700", 4600000, 125, 36, { sk: "LGA1700" }),
    part("r5-7600", "AMD Ryzen 5 7600", "6C / 12T, AM5", 3900000, 65, 36, { sk: "AM5" }),
    part("r7-7800x3d", "AMD Ryzen 7 7800X3D", "8C / 16T, AM5, 3D V-Cache", 7200000, 120, 36, { sk: "AM5" }),
    part("r9-7950x", "AMD Ryzen 9 7950X", "16C / 32T, AM5", 8200000, 170, 36, { sk: "AM5" }),
  ],
  mobo: [
    part("h610m", "ASUS Prime H610M-K D4", "Micro-ATX, LGA1700, DDR4", 1150000, 30, 36, { sk: "LGA1700", ddr: 4 }),
    part("b660m", "MSI PRO B660M-A D4", "Micro-ATX, LGA1700, DDR4", 1850000, 35, 36, { sk: "LGA1700", ddr: 4 }),
    part("b550m", "MSI B550M PRO-VDH", "Micro-ATX, AM4, DDR4", 1650000, 35, 36, { sk: "AM4", ddr: 4 }),
    part("z790", "Gigabyte Z790 Aorus Elite", "ATX, LGA1700, DDR5", 3600000, 45, 36, { sk: "LGA1700", ddr: 5 }),
    part("a620m", "ASRock A620M-HDV", "Micro-ATX, AM5, DDR5", 1500000, 30, 36, { sk: "AM5", ddr: 5 }),
    part("b650m", "MSI MAG B650M Mortar", "Micro-ATX, AM5, DDR5", 2300000, 40, 36, { sk: "AM5", ddr: 5 }),
    part("x670e", "ASUS TUF X670E-Plus", "ATX, AM5, DDR5, siap upgrade", 4600000, 50, 36, { sk: "AM5", ddr: 5 }),
  ],
  ram: [
    part("d4-8", "8 GB DDR4-3200", "1 × 8 GB", 400000, 4, 60, { ddr: 4, gb: 8 }),
    part("d4-16", "16 GB DDR4-3200", "2 × 8 GB Dual-Channel", 750000, 6, 60, { ddr: 4, gb: 16 }),
    part("d4-32", "32 GB DDR4-3200", "2 × 16 GB Dual-Channel", 1500000, 8, 60, { ddr: 4, gb: 32 }),
    part("d5-16", "16 GB DDR5-5600", "2 × 8 GB Dual-Channel", 950000, 6, 60, { ddr: 5, gb: 16 }),
    part("d5-32", "32 GB DDR5-6000", "2 × 16 GB Dual-Channel", 1900000, 8, 60, { ddr: 5, gb: 32 }),
    part("d5-64", "64 GB DDR5-6000", "2 × 32 GB Dual-Channel", 3800000, 10, 60, { ddr: 5, gb: 64 }),
  ],
  storage: [
    part("sata-256", "256 GB SATA SSD", "Kecepatan baca 550 MB/s", 450000, 3, 36),
    part("nvme-512", "512 GB NVMe SSD", "Kecepatan baca 3.500 MB/s", 750000, 5, 36),
    part("nvme-1t", "1 TB NVMe SSD", "Kecepatan baca 5.000 MB/s", 1250000, 6, 36),
    part("nvme-2t", "2 TB NVMe SSD", "Kecepatan baca 7.000 MB/s", 2400000, 8, 60),
    part("hdd-1t", "1 TB HDD 7200 rpm", "Penyimpanan data besar", 650000, 7, 24),
  ],
  gpu: [
    part("igpu", "Grafis Terintegrasi (iGPU)", "Menggunakan grafis bawaan CPU", 0, 0, 36),
    part("rtx-3050", "NVIDIA RTX 3050 6GB", "6 GB GDDR6", 2500000, 70, 36),
    part("rx-6600", "AMD Radeon RX 6600 8GB", "8 GB GDDR6 · Sweet-spot 1080p", 3000000, 132, 36),
    part("rtx-3060", "NVIDIA RTX 3060 12GB", "12 GB GDDR6 · VRAM lega editing", 3600000, 170, 36),
    part("rtx-4060", "NVIDIA RTX 4060 8GB", "8 GB GDDR6 · DLSS 3 & NVENC AV1", 4800000, 115, 36),
    part("rtx-4070s", "NVIDIA RTX 4070 Super", "12 GB GDDR6X", 10900000, 220, 36),
    part("rtx-4090", "NVIDIA RTX 4090", "24 GB GDDR6X", 32500000, 450, 36),
  ],
  psu: [
    part("psu-350", "350 W 80+ White", "Kapasitas 350 W", 400000, 0, 36, { cap: 350 }),
    part("psu-450", "450 W 80+ Bronze", "Kapasitas 450 W", 650000, 0, 36, { cap: 450 }),
    part("psu-550", "550 W 80+ Bronze", "Kapasitas 550 W", 850000, 0, 36, { cap: 550 }),
    part("psu-650", "650 W 80+ Gold", "Kapasitas 650 W", 1100000, 0, 60, { cap: 650 }),
    part("psu-750", "750 W 80+ Gold", "Kapasitas 750 W", 1500000, 0, 60, { cap: 750 }),
    part("psu-1000", "1000 W 80+ Gold", "Kapasitas 1.000 W", 2600000, 0, 60, { cap: 1000 }),
  ],
  cooler: [
    part("cooler-stock", "Stock Cooler Bawaan CPU", "Pendingin standar bawaan boks CPU", 0, 5, 12),
    part("cooler-tower", "Tower Air Cooler 120mm (4 Heatpipe)", "Pendingin senyap hingga 150 W TDP", 350000, 8, 24),
    part("cooler-dual", "Dual-Tower Air Cooler 120mm", "Performa tinggi hingga 220 W TDP", 750000, 10, 36),
    part("cooler-aio240", "Liquid Cooler AIO 240mm", "Radiator 240mm untuk CPU kelas atas", 1350000, 15, 36),
  ],
  case: [
    part("case-mt", "Casing Micro-ATX Standar Lab", "Sasis baja ringkas & tangguh", 450000, 5, 24),
    part("case-matx-mesh", "Casing Micro-ATX Mesh Airflow", "Panel depan mesh + 3 kipas airflow", 650000, 10, 24),
    part("case-sff", "Casing SFF Ringkas Enterprise", "Hemat ruang meja kantor", 700000, 5, 24),
    part("case-atx-mesh", "Casing ATX Airflow Mid-Tower", "Lega untuk GPU panjang & upgrade", 1050000, 12, 24),
  ],
  monitor: [
    part("mon-none", "Tanpa Monitor (Unit PC Saja)", "Gunakan monitor yang sudah Anda miliki", 0, 0, 24),
    part("mon-19", 'Monitor 19,5" HD Lab', "Panel hemat daya untuk lab CBT", 850000, 18, 36),
    part("mon-24-ips", 'Monitor 24" FHD IPS 100 Hz', "Nyaman untuk kuliah, editing & esports", 1450000, 22, 36),
    part("mon-24-dual", 'Dual Monitor 24" FHD IPS', "Setup produktivitas multi-layar", 2750000, 40, 36),
    part("mon-27-qhd", 'Monitor 27" QHD 165 Hz IPS', "Tajam & mulus untuk gaming 1440p", 3450000, 35, 36),
    part("mon-32-4k", 'Monitor 32" 4K Kreator (99% sRGB)', "Akurasi warna tinggi untuk editing 4K", 6850000, 45, 36),
  ],
};

const SLOTS = [
  { key: "cpu", label: "CPU", icon: Cpu },
  { key: "mobo", label: "Motherboard", icon: CircuitBoard },
  { key: "ram", label: "RAM", icon: MemoryStick },
  { key: "storage", label: "Storage (SSD / HDD)", icon: HardDrive },
  { key: "gpu", label: "GPU", icon: Gauge },
  { key: "psu", label: "Power Supply (PSU)", icon: Zap },
  { key: "cooler", label: "CPU Cooler", icon: Wind },
  { key: "case", label: "Casing PC", icon: Box },
  { key: "monitor", label: "Monitor", icon: Monitor },
];

const PRESETS = {
  b2c_budget: {
    id: "b2c_budget", seg: "B2C", name: "Gaming 1080p Pelajar / Budget", icon: Gamepad2, qty: 1,
    blurb: "Rakitan gaming 1080p & kuliah paling ramah kantong dengan GPU 8 GB dan RAM dual-channel.",
    focus: ["1080p 100+ FPS", "Ramah budget", "Dual-channel 16 GB"],
    parts: { cpu: "i3-12100", mobo: "h610m", ram: "d4-16", storage: "nvme-512", gpu: "rx-6600", psu: "psu-550", cooler: "cooler-stock", case: "case-matx-mesh", monitor: "mon-none" },
  },
  b2c_mid: {
    id: "b2c_mid", seg: "B2C", name: "Editing & Kuliah Mid-Range", icon: Video, qty: 1,
    blurb: "Seimbang untuk editing 1080p/4K, desain, coding, dan gaming lancar lengkap dengan monitor 24\" IPS.",
    focus: ["RAM 32 GB", "RTX 4060 NVENC", "Sudah termasuk Monitor"],
    parts: { cpu: "i5-12400", mobo: "b660m", ram: "d4-32", storage: "nvme-1t", gpu: "rtx-4060", psu: "psu-550", cooler: "cooler-tower", case: "case-matx-mesh", monitor: "mon-24-ips" },
  },
  b2c: {
    id: "b2c", seg: "B2C", name: "Rig Kreator & Gaming Pro", icon: Sparkles, qty: 1,
    blurb: "Performa 1440p FPS tinggi dan rendering cepat di platform AM5 DDR5 dengan headroom upgrade panjang.",
    focus: ["AM5 DDR5", "RTX 4070 Super", "Monitor 27\" QHD 165 Hz"],
    parts: { cpu: "r7-7800x3d", mobo: "b650m", ram: "d5-32", storage: "nvme-1t", gpu: "rtx-4070s", psu: "psu-750", cooler: "cooler-dual", case: "case-atx-mesh", monitor: "mon-27-qhd" },
  },
  b2s: {
    id: "b2s", seg: "B2S", name: "Standar Labkom CBT", icon: GraduationCap, qty: 30,
    blurb: "PC laboratorium siap ujian yang efisien biaya untuk pengadaan puluhan unit sekolah.",
    focus: ["Biaya hemat", "Daya tahan tinggi", "Siap pengadaan massal"],
    parts: { cpu: "i3-12100", mobo: "h610m", ram: "d4-8", storage: "sata-256", gpu: "igpu", psu: "psu-350", cooler: "cooler-stock", case: "case-mt", monitor: "mon-19" },
  },
  b2b: {
    id: "b2b", seg: "B2B", name: "Workstation Kantor Enterprise", icon: Building2, qty: 5,
    blurb: "Mesin kerja senyap dan hemat listrik dengan dukungan dua monitor IPS sekaligus.",
    focus: ["Hemat energi", "Bentuk ringkas", "Dukungan dual monitor"],
    parts: { cpu: "i5-12400", mobo: "b660m", ram: "d4-16", storage: "nvme-512", gpu: "igpu", psu: "psu-350", cooler: "cooler-stock", case: "case-sff", monitor: "mon-24-dual" },
  },
  custom: {
    id: "custom", seg: "B2C", name: "Custom Build (Mulai dari Kosong)", icon: Wrench, qty: 1,
    blurb: "Mulai dari konfigurasi dasar paling ringan lalu pilih sendiri tiap komponen sesuai selera & anggaran.",
    focus: ["Bebas pilih part", "Cek kompatibilitas otomatis", "Tanpa monitor bawaan"],
    parts: { cpu: "i3-12100", mobo: "h610m", ram: "d4-8", storage: "nvme-512", gpu: "igpu", psu: "psu-450", cooler: "cooler-stock", case: "case-matx-mesh", monitor: "mon-none" },
  },
};

const BUDGET_PRESET_CHIPS = [
  { label: "Semua", value: 35000000 },
  { label: "≤ Rp 10 jt", value: 10000000 },
  { label: "≤ Rp 16 jt", value: 16000000 },
  { label: "≤ Rp 25 jt", value: 25000000 },
  { label: "≤ Rp 35 jt", value: 35000000 },
];

const TIERS = [{ min: 10, pct: 3 }, { min: 30, pct: 5 }, { min: 100, pct: 8 }];
const MAX_QTY = 500;

/* ───────────────────────── Helpers & Hand-off Matching ───────────────────────── */

const idr = (n) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
const fmtDelta = (d) => (d === 0 ? "Harga sama" : `${d > 0 ? "+" : "-"}${idr(Math.abs(d))}`);
const fmtDate = (d) => d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
const clampQty = (v) => Math.min(MAX_QTY, Math.max(1, parseInt(v, 10) || 1));
const discountPct = (q) => [...TIERS].reverse().find((t) => q >= t.min)?.pct ?? 0;
const makeRef = (prefix) => `${prefix}-${Date.now().toString(36).toUpperCase().slice(-6)}`;

function buildCatalog(remoteComponents) {
  const next = {
    cpu: [...BASE_CATALOG.cpu],
    mobo: [...BASE_CATALOG.mobo],
    ram: [...BASE_CATALOG.ram],
    storage: [...BASE_CATALOG.storage],
    gpu: [...BASE_CATALOG.gpu],
    psu: [...BASE_CATALOG.psu],
    cooler: [...BASE_CATALOG.cooler],
    case: [...BASE_CATALOG.case],
    monitor: [...BASE_CATALOG.monitor],
  };

  for (const component of remoteComponents || []) {
    const { specs = {} } = component;
    const id = `hardware-${component.id}`;
    const price = Number(component.base_price) || 0;
    const watts = Number(specs.tdpWatts || specs.wattage || specs.boardPowerWatts) || 0;
    const ddrMatch = String(specs.memoryType || "").match(/DDR([45])/i);
    const ddr = ddrMatch ? Number(ddrMatch[1]) : null;

    if (component.category === "cpu") {
      next.cpu.push(part(id, component.name, `${specs.cores || "CPU"}C${specs.threads ? ` / ${specs.threads}T` : ""}, ${specs.socket || "soket standar"}`, price, watts, 36, {
        inventoryId: component.id,
        sk: specs.socket || null,
        ddr: ddr ? [ddr] : [4, 5],
      }));
    } else if (component.category === "motherboard") {
      next.mobo.push(part(id, component.name, `${specs.formFactor || "Motherboard"}, ${specs.socket || "soket standar"}, ${specs.memoryType || "DDR"}`, price, watts || 35, 36, {
        inventoryId: component.id,
        sk: specs.socket || null,
        ddr: ddr || null,
      }));
    } else if (component.category === "ram") {
      const capacity = Number(specs.capacityGB) || 16;
      next.ram.push(part(id, component.name, `${capacity} GB${specs.speedMTs ? `, ${specs.speedMTs} MT/s` : ""}`, price, watts || 6, 60, {
        inventoryId: component.id,
        ddr: ddr || 5,
        gb: capacity,
      }));
    } else if (component.category === "storage") {
      next.storage.push(part(id, component.name, `${specs.interface || "Storage"}${specs.capacityGB ? `, ${specs.capacityGB} GB` : ""}`, price, watts || 5, 36, { inventoryId: component.id }));
    } else if (component.category === "gpu") {
      next.gpu.push(part(id, component.name, `${specs.vramGB || 0} GB ${specs.memoryType || "grafis"}`, price, watts, 36, { inventoryId: component.id }));
    } else if (component.category === "psu") {
      const capacity = Number(specs.wattage) || 0;
      next.psu.push(part(id, component.name, `${capacity} W ${specs.efficiencyRating || ""}`.trim(), price, 0, 36, { inventoryId: component.id, cap: capacity }));
    } else if (component.category === "cooler") {
      next.cooler.push(part(id, component.name, `${specs.type || "CPU Cooler"}`, price, watts || 8, 24, { inventoryId: component.id }));
    } else if (component.category === "case") {
      next.case.push(part(id, component.name, `${specs.formFactor || "Casing PC"}`, price, watts || 8, 24, { inventoryId: component.id }));
    } else if (component.category === "monitor") {
      next.monitor.push(part(id, component.name, `${specs.resolution || "Monitor"}`, price, watts || 25, 36, { inventoryId: component.id }));
    }
  }

  return next;
}

const partOf = (catalog, slot, id) => catalog[slot]?.find((x) => x.id === id) || catalog[slot][0];
const unitTotal = (catalog, sel) => SLOTS.reduce((sum, s) => sum + partOf(catalog, s.key, sel[s.key]).price, 0);

function normalizeTokens(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2 && !["gb", "tb", "ssd", "hdd", "ddr4", "ddr5", "nvidia", "geforce", "amd", "intel", "core", "plus", "gold", "bronze", "white"].includes(t));
}

function findMatchingPart(catalog, slot, rawHint) {
  const list = catalog[slot] || [];
  if (!list.length || !rawHint) return null;
  const raw = String(rawHint).trim();
  const lower = raw.toLowerCase();

  const exact = list.find((item) => item.id.toLowerCase() === lower || item.name.toLowerCase() === lower);
  if (exact) return exact;

  const idMatch = list.find(
    (item) =>
      lower.includes(item.id.toLowerCase()) ||
      (lower.length >= 4 && item.id.toLowerCase().startsWith(lower.slice(0, 4))),
  );
  if (idMatch) return idMatch;

  if (slot === "psu") {
    const wMatch = raw.match(/(\d{3,4})\s*w/i);
    if (wMatch) {
      const targetW = Number(wMatch[1]);
      const sorted = [...list].filter((p) => Number(p.cap) > 0).sort((a, b) => a.cap - b.cap);
      const exactOrNext = sorted.find((p) => p.cap >= targetW) || sorted[sorted.length - 1];
      if (exactOrNext) return exactOrNext;
    }
  }

  if (slot === "ram") {
    const capMatch = raw.match(/(\d{1,3})\s*gb/i);
    if (capMatch) {
      const targetGb = Number(capMatch[1]);
      const ddrWanted = /ddr4/i.test(raw) ? 4 : /ddr5/i.test(raw) ? 5 : null;
      const capMatchItem =
        list.find((r) => r.gb === targetGb && (!ddrWanted || r.ddr === ddrWanted)) ||
        list.find((r) => r.gb === targetGb);
      if (capMatchItem) return capMatchItem;
    }
  }

  const tokens = normalizeTokens(raw);
  if (!tokens.length) return null;

  let best = null;
  let bestScore = 0;
  for (const item of list) {
    const hay = `${item.id} ${item.name} ${item.spec}`.toLowerCase();
    let score = 0;
    for (const token of tokens) {
      if (hay.includes(token)) score += token.length >= 4 ? 2 : 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }
  return bestScore >= 2 ? best : null;
}

function mapSlotLabelToKey(rawSlot) {
  const s = String(rawSlot ?? "").toLowerCase();
  if (s.includes("cooler") || s.includes("pendingin") || s.includes("aio") || s.includes("heatsink")) return "cooler";
  if (s.includes("cpu") || s.includes("prosesor")) return "cpu";
  if (s.includes("mobo") || s.includes("motherboard")) return "mobo";
  if (s.includes("ram") || s.includes("memori")) return "ram";
  if (s.includes("storage") || s.includes("ssd") || s.includes("nvme") || s.includes("hdd") || s.includes("penyimpanan")) return "storage";
  if (s.includes("gpu") || s.includes("grafis") || s.includes("vga")) return "gpu";
  if (s.includes("psu") || s.includes("power supply")) return "psu";
  if (s.includes("monitor") || s.includes("layar")) return "monitor";
  if (s.includes("case") || s.includes("casing") || s.includes("chassis") || s.includes("sasis")) return "case";
  return null;
}

function inferSlotFromItem(item) {
  const hint = `${item?.slot || ""} ${item?.category || ""} ${item?.type || ""} ${item?.name || ""} ${item?.title || ""}`.toLowerCase();
  if (/\b(cooler|aio|heatsink|pendingin)\b/i.test(hint)) return "cooler";
  if (/\b(cpu|ryzen|core i\d|processor|prosesor)\b/i.test(hint)) return "cpu";
  if (/\b(gpu|rtx|radeon|rx\s?\d|geforce|vga|graphics)\b/i.test(hint)) return "gpu";
  if (/\b(ram|ddr[45]|memory|memori)\b/i.test(hint)) return "ram";
  if (/\b(motherboard|mobo|b650|b660|b550|h610|z790|a620|x670)\b/i.test(hint)) return "mobo";
  if (/\b(nvme|ssd|hdd|storage)\b/i.test(hint)) return "storage";
  if (/\b(psu|power supply|80\+)\b/i.test(hint)) return "psu";
  if (/\b(monitor|display|ips|qhd|165\s?hz)\b/i.test(hint)) return "monitor";
  if (/\b(casing|case|chassis|tower|sff)\b/i.test(hint)) return "case";
  return null;
}

function fixCompat(catalog, sel) {
  const next = { ...sel };
  const cpu = partOf(catalog, "cpu", next.cpu);
  const compatibleBoards = catalog.mobo.filter((m) => !cpu.sk || !m.sk || m.sk === cpu.sk);
  if (partOf(catalog, "mobo", next.mobo).sk && cpu.sk && partOf(catalog, "mobo", next.mobo).sk !== cpu.sk && compatibleBoards.length) {
    next.mobo = compatibleBoards[0].id;
  }
  const mobo = partOf(catalog, "mobo", next.mobo);
  const ram = partOf(catalog, "ram", next.ram);
  if (ram.ddr && mobo.ddr && ram.ddr !== mobo.ddr) {
    const pool = catalog.ram.filter((r) => r.ddr === mobo.ddr);
    if (pool.length) next.ram = (pool.find((r) => r.gb >= ram.gb) || pool[pool.length - 1]).id;
  }
  return next;
}

function optionsFor(catalog, slot, sel) {
  if (slot === "mobo") return catalog.mobo.filter((m) => !m.sk || !partOf(catalog, "cpu", sel.cpu).sk || m.sk === partOf(catalog, "cpu", sel.cpu).sk);
  if (slot === "ram") return catalog.ram.filter((r) => !r.ddr || !partOf(catalog, "mobo", sel.mobo).ddr || r.ddr === partOf(catalog, "mobo", sel.mobo).ddr);
  return catalog[slot];
}

function summarize(catalog, sel, qty) {
  const rows = SLOTS.map((s) => ({ ...s, part: partOf(catalog, s.key, sel[s.key]) }));
  const unit = rows.reduce((sum, r) => sum + r.part.price, 0);
  const watts = rows.reduce((sum, r) => sum + r.part.w, 0);
  const cap = partOf(catalog, "psu", sel.psu).cap || 550;
  const pct = discountPct(qty);
  const gross = unit * qty;
  const discount = Math.round((gross * pct) / 100);
  const basePrice = gross - discount;
  const jitBuffer = Math.round(basePrice * 0.05);
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

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas";

/* ───────────────────────── Small UI pieces ───────────────────────── */

function PartRow({ slot, current, marketMatch, open, onToggle, options, deltaFor, onPick }) {
  const Icon = slot.icon;
  const showBuyBridge = current.price > 0 && marketMatch;
  return (
    <li className="vt-card-lift rounded-xl border border-default bg-surface shadow-sm">
      <div className="flex flex-wrap items-center gap-2.5 p-3.5 sm:gap-3 sm:p-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-default bg-canvas text-accent-primary">
          <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1 basis-48">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs text-secondary">{slot.label}</p>
            {showBuyBridge && marketMatch.matched ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                <Store className="h-3 w-3" aria-hidden="true" />
                {marketMatch.badge}
              </span>
            ) : null}
          </div>
          <p className="font-medium text-primary">{current.name}</p>
          <p className="text-xs text-secondary">{current.spec}</p>
        </div>
        <div className="text-right">
          <p className="font-mono font-semibold tabular-nums text-primary">{idr(current.price)}</p>
          <p className="font-mono text-xs tabular-nums text-secondary">{current.w} W · garansi {current.wr} bln</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {showBuyBridge ? (
            marketMatch.matched ? (
              <Link
                href={marketMatch.href}
                aria-label={`Beli ${current.name} di ViciTech Market`}
                className={`vt-motion-press inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-accent-cta px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-accent-cta-hover ${focusRing}`}
              >
                <Store className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                <span>{marketMatch.ctaLabel}</span>
              </Link>
            ) : (
              <a
                href={marketMatch.href}
                target="_blank"
                rel="noopener noreferrer sponsored"
                title={marketMatch.badge}
                aria-label={`Cek ${current.name} di Toko Resmi (Partner)`}
                className={`vt-motion-press inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-accent-primary/35 bg-accent-subtle px-3 py-2 text-xs font-semibold text-accent-cta transition-colors hover:bg-accent-primary/15 ${focusRing}`}
              >
                <span>{marketMatch.ctaLabel}</span>
                <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
              </a>
            )
          ) : null}
          <button
            type="button"
            aria-expanded={open}
            onClick={onToggle}
            className={`vt-motion-press inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${focusRing} ${
              open
                ? "border-accent-primary bg-accent-subtle text-accent-cta"
                : "border-default bg-canvas text-primary hover:border-accent-primary/40 hover:bg-subtle"
            }`}
          >
            <RefreshCw className="h-4 w-4 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
            <span>Ganti / Upgrade</span>
          </button>
        </div>
      </div>

      {open && (
        <ul className="divide-y divide-default border-t border-default bg-canvas/60">
          {options.map((o) => {
            const isCurrent = o.id === current.id;
            const { delta, extra } = deltaFor(o);
            return (
              <li key={o.id}>
                <button
                  type="button"
                  aria-pressed={isCurrent}
                  onClick={() => onPick(o.id)}
                  className={`vt-motion-press flex min-h-11 w-full items-center gap-3 px-4 py-3 text-left transition-colors ${focusRing} ${
                    isCurrent ? "bg-accent-subtle" : "hover:bg-subtle"
                  }`}
                >
                  {isCurrent ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-accent-cta" strokeWidth={1.75} aria-hidden="true" />
                  ) : (
                    <span className="h-4 w-4 shrink-0 rounded-full border border-default bg-surface" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-primary">{o.name}</span>
                    <span className="block text-xs text-secondary">
                      {o.spec}{extra ? ", termasuk penyesuaian komponen" : ""}
                    </span>
                  </span>
                  <span
                    className={`font-mono text-sm font-medium tabular-nums ${
                      isCurrent
                        ? "text-accent-cta"
                        : delta > 0
                          ? "text-status-sample"
                          : delta < 0
                            ? "text-status-live"
                            : "text-secondary"
                    }`}
                  >
                    {isCurrent ? "Terpilih" : fmtDelta(delta)}
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

  const btn = `inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${focusRing}`;
  return (
    <div className="vt-backdrop-enter fixed inset-0 z-50 flex justify-end bg-black/55" onClick={onClose}>
      <aside role="dialog" aria-modal="true" aria-label="Pre-Order Cepat" onClick={(e) => e.stopPropagation()} className="vt-panel-enter flex h-full w-full max-w-md flex-col border-l border-default bg-surface text-primary">
        <div className="flex items-start justify-between gap-4 border-b border-default p-5">
          <div>
            <h2 className="tracking-tight font-sans text-lg font-bold text-primary">Tinjau Pre-Order Cepat</h2>
            <p className="text-sm text-secondary">{preset.seg} · {preset.name} ({qtyLabel})</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Tutup panel pre-order" className={`inline-flex h-11 w-11 items-center justify-center rounded-lg border border-default bg-subtle text-primary hover:bg-canvas ${focusRing}`}>
            <X className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          <section>
            <h3 className="tracking-tight mb-2 text-sm font-bold text-primary">Rincian harga per unit</h3>
            <ul className="divide-y divide-default rounded-xl border border-default bg-canvas">
              {calc.rows.map((r) => (
                <li key={r.key} className="flex items-baseline justify-between gap-3 px-3 py-2 text-sm">
                  <span className="min-w-0">
                    <span className="text-secondary">{r.label}: </span>
                    <span className="font-medium text-primary">{r.part.name}</span>
                  </span>
                  <span className="shrink-0 font-mono tabular-nums text-primary">{idr(r.part.price)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-3 space-y-1.5 font-mono text-sm tabular-nums">
              <div className="flex justify-between text-secondary"><dt>Harga dasar per unit</dt><dd>{idr(calc.unit)}</dd></div>
              <div className="flex justify-between text-secondary"><dt>× {qty} unit</dt><dd>{idr(calc.gross)}</dd></div>
              {calc.pct > 0 && <div className="flex justify-between text-status-live"><dt>Diskon grosir {calc.pct}%</dt><dd>-{idr(calc.discount)}</dd></div>}
              <div className="flex justify-between border-t border-default pt-2 text-primary"><dt>Subtotal rakitan</dt><dd>{idr(calc.basePrice)}</dd></div>
              <div className="flex justify-between text-accent-cta">
                <dt className="flex items-center gap-1.5 font-sans">
                  <Zap className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>JIT 5% Buffer (Buffer Pasar Dinamis)</span>
                </dt>
                <dd>+{idr(calc.jitBuffer)}</dd>
              </div>
              <div className="flex justify-between border-t border-default pt-2 text-base font-semibold text-primary">
                <dt className="font-sans">Total Pesanan (Subtotal + JIT)</dt>
                <dd className="text-accent-cta">{idr(calc.total)}</dd>
              </div>
            </dl>
          </section>

          <section>
            <h3 className="tracking-tight mb-3 flex items-center gap-2 text-sm font-bold text-primary">
              <Truck className="h-4 w-4 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
              <span>Estimasi pengiriman via Hub Bandung</span>
            </h3>
            <ol className="space-y-3 border-l border-default pl-4">
              {timeline.map((s, i) => (
                <li key={s.label} className="relative">
                  <span className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ${i === timeline.length - 1 ? "bg-status-live" : "bg-accent-primary"}`} />
                  <p className="text-sm font-medium text-primary">
                    {s.label} <span className="font-normal text-secondary">· {s.date}</span>
                  </p>
                  <p className="text-xs text-secondary">{s.note}</p>
                </li>
              ))}
            </ol>
          </section>

          {notice && (
            <p role="status" className="flex gap-2 rounded-lg border border-status-live/30 bg-emerald-50 p-3 text-sm text-emerald-800">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-status-live" aria-hidden="true" />
              <span>{notice}</span>
            </p>
          )}
        </div>

        <div className="space-y-2 border-t border-default bg-surface p-5">
          {!psuOk && (
            <p className="text-xs text-status-danger">
              Kebutuhan daya melebihi kapasitas PSU. Naikkan kapasitas PSU untuk melanjutkan checkout.
            </p>
          )}
          <button
            type="button"
            onClick={onOrder}
            disabled={!psuOk}
            className={`${btn} ${
              psuOk
                ? "bg-accent-cta font-semibold text-white hover:bg-accent-cta-hover"
                : "cursor-not-allowed bg-subtle text-secondary"
            }`}
          >
            <ShoppingCart className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            <span>Lanjut ke Checkout</span>
          </button>
          <button type="button" onClick={onQuote} className={`${btn} border border-default bg-canvas text-primary hover:bg-subtle`}>
            <FileText className="h-4 w-4 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
            <span>{preset.seg === "B2C" ? "Minta Penawaran PDF" : `Minta Penawaran Resmi ${preset.seg} (PDF)`}</span>
          </button>
          <button type="button" onClick={onSave} disabled={isSaving} className={`${btn} border border-default bg-surface text-secondary hover:bg-subtle hover:text-primary disabled:cursor-wait disabled:opacity-60`}>
            {isSaving ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Bookmark className="h-4 w-4 text-accent-primary" aria-hidden="true" />}
            <span>{isSaving ? "Menyimpan preset…" : "Simpan Preset ke Akun"}</span>
          </button>
        </div>
      </aside>
    </div>
  );
}

/* ───────────────────────── Page ───────────────────────── */

export default function PresetBuilder({
  role = "b2c",
  userId,
  importedConfig,
  initialProductId = "",
  marketProducts = [],
}) {
  const router = useRouter();
  const { triggerCheckout } = useCheckout();
  const initialPresetKey = role === "b2c" ? "b2c_budget" : (role && PRESETS[role] ? role : "b2s");
  const [remoteComponents, setRemoteComponents] = useState([]);
  const [presetId, setPresetId] = useState(initialPresetKey);
  const [sel, setSel] = useState(PRESETS[initialPresetKey].parts);
  const [qty, setQty] = useState(PRESETS[initialPresetKey].qty);
  const [budgetLimit, setBudgetLimit] = useState(35000000);
  const [openSlot, setOpenSlot] = useState(null);
  const [autoNote, setAutoNote] = useState("");
  const [drawer, setDrawer] = useState(false);
  const [notice, setNotice] = useState("");
  const [specCopyNotice, setSpecCopyNotice] = useState("");
  const [saved, setSaved] = useState([]);
  const [isSavingPreset, setIsSavingPreset] = useState(false);
  const [loadedProductId, setLoadedProductId] = useState("");
  const lastProductAppliedRef = useRef("");

  const catalog = useMemo(() => buildCatalog(remoteComponents), [remoteComponents]);

  useEffect(() => {
    if (!specCopyNotice) return undefined;
    const t = window.setTimeout(() => setSpecCopyNotice(""), 2600);
    return () => window.clearTimeout(t);
  }, [specCopyNotice]);

  useEffect(() => {
    let active = true;
    listHardwareComponents({ activeOnly: true }).then((components) => {
      if (active) setRemoteComponents(components || []);
    }).catch((error) => {
      if (active) setNotice(`Inventori komponen tidak dapat dimuat: ${error.message}`);
    });
    return () => { active = false; };
  }, []);

  // Sinkronisasi peran bila user belum mengimpor konfigurasi khusus
  useEffect(() => {
    const resolvedKey = role === "b2c" ? "b2c_budget" : (role && PRESETS[role] ? role : null);
    if (resolvedKey && !importedConfig && !initialProductId) {
      setPresetId(resolvedKey);
      setSel(PRESETS[resolvedKey].parts);
      setQty(PRESETS[resolvedKey].qty);
    }
  }, [role, importedConfig, initialProductId]);

  // Hand-off nyata dari Bottleneck Analyzer / Hardware Library / Versus Arena / Account Preset
  useEffect(() => {
    if (!importedConfig) return;

    if (importedConfig.preset) {
      const p = importedConfig.preset;
      const targetRole = p.role && PRESETS[String(p.role).toLowerCase()] ? String(p.role).toLowerCase() : null;
      if (targetRole) setPresetId(targetRole);
      if (Number.isFinite(Number(p.qty)) && Number(p.qty) >= 1) {
        setQty(clampQty(p.qty));
      }

      setSel((current) => {
        const next = { ...current };
        if (Array.isArray(p.parts)) {
          for (const entry of p.parts) {
            if (!Array.isArray(entry)) continue;
            const slotKey = mapSlotLabelToKey(entry[0]);
            const partHint = entry[1];
            if (!slotKey || !partHint) continue;
            const matched = findMatchingPart(catalog, slotKey, partHint);
            if (matched) next[slotKey] = matched.id;
          }
        } else if (p.parts && typeof p.parts === "object") {
          for (const [rawKey, val] of Object.entries(p.parts)) {
            const slotKey = mapSlotLabelToKey(rawKey) || (catalog[rawKey] ? rawKey : null);
            if (!slotKey) continue;
            const matched = findMatchingPart(catalog, slotKey, val);
            if (matched) next[slotKey] = matched.id;
          }
        }
        return fixCompat(catalog, next);
      });
      setAutoNote(`Preset "${p.name || "Tersimpan"}" dimuat ke Preset Builder.`);
      return;
    }

    setSel((current) => {
      const next = { ...current };
      const applySlotHint = (slotKey, hint) => {
        if (!hint) return;
        const matched = findMatchingPart(catalog, slotKey, hint);
        if (matched) next[slotKey] = matched.id;
      };

      applySlotHint("cpu", importedConfig.cpu);
      applySlotHint("mobo", importedConfig.mobo || importedConfig.motherboard);
      applySlotHint("ram", importedConfig.ram);
      applySlotHint("storage", importedConfig.storage);
      applySlotHint("gpu", importedConfig.gpu);
      applySlotHint("psu", importedConfig.psu);
      applySlotHint("cooler", importedConfig.cooler);
      applySlotHint("case", importedConfig.case || importedConfig.chassis);
      applySlotHint("monitor", importedConfig.monitor);

      if (Array.isArray(importedConfig.items)) {
        for (const item of importedConfig.items) {
          if (!item || typeof item !== "object") continue;
          const inferredSlot = inferSlotFromItem(item);
          if (inferredSlot) {
            applySlotHint(inferredSlot, item.id || item.name || item.title);
          }
          const itemSpecs = item.specs && typeof item.specs === "object" ? item.specs : null;
          if (itemSpecs) {
            applySlotHint("cpu", itemSpecs.cpu);
            applySlotHint("gpu", itemSpecs.gpu);
            applySlotHint("ram", itemSpecs.ram);
            applySlotHint("storage", itemSpecs.storage);
            applySlotHint("psu", itemSpecs.psu);
            applySlotHint("mobo", itemSpecs.motherboard || itemSpecs.mobo);
          }
        }
      }

      return fixCompat(catalog, next);
    });
    setAutoNote("Konfigurasi komponen dimuat dan diverifikasi kompatibilitasnya secara otomatis.");
  }, [catalog, importedConfig]);

  // Hand-off nyata via query param ?productId=... dari /market/[id]
  useEffect(() => {
    const targetId = typeof initialProductId === "string" ? initialProductId.trim() : "";
    if (!targetId) return undefined;
    if (lastProductAppliedRef.current === `${targetId}:${remoteComponents.length}`) return undefined;

    let active = true;
    const applyProductToBuilder = (product) => {
      if (!active || !product) return;
      lastProductAppliedRef.current = `${targetId}:${remoteComponents.length}`;
      setLoadedProductId(product.id || targetId);

      setSel((current) => {
        const next = { ...current };
        const applyHint = (slotKey, hint) => {
          if (!slotKey || !hint) return;
          const matched = findMatchingPart(catalog, slotKey, hint);
          if (matched) next[slotKey] = matched.id;
        };

        if (product.specs && typeof product.specs === "object" && !Array.isArray(product.specs)) {
          for (const [k, v] of Object.entries(product.specs)) {
            const slotKey = mapSlotLabelToKey(k);
            if (slotKey && typeof v === "string") applyHint(slotKey, v);
          }
        }

        if (Array.isArray(product.preset_components)) {
          for (const entry of product.preset_components) {
            if (!entry || typeof entry !== "object") continue;
            const slotKey = mapSlotLabelToKey(entry.slot) || inferSlotFromItem(entry);
            if (slotKey && entry.name) applyHint(slotKey, entry.name);
          }
        }

        if (product.category === "component" && product.title) {
          const inferred = inferSlotFromItem({ title: product.title, category: product.category });
          if (inferred) applyHint(inferred, product.title);
        }

        return fixCompat(catalog, next);
      });

      setPresetId("b2c");
      setQty(1);
      setAutoNote(`Komponen dari "${product.title}" berhasil dimuat dan disesuaikan di Preset Builder.`);
    };

    const existing = Array.isArray(marketProducts)
      ? marketProducts.find((p) => p.id === targetId || p.slug === targetId)
      : null;

    if (existing) {
      applyProductToBuilder(existing);
      return () => { active = false; };
    }

    if (!isSupabaseAuthConfigured) return () => { active = false; };

    const client = getSupabaseBrowserClient();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(targetId);
    client
      .from("products")
      .select("id, slug, title, category, specs, preset_components")
      .eq(isUuid ? "id" : "slug", targetId)
      .maybeSingle()
      .then(({ data }) => {
        if (active && data) applyProductToBuilder(data);
      })
      .catch(() => {
        // Abaikan bila produk tidak tersedia.
      });

    return () => { active = false; };
  }, [catalog, initialProductId, marketProducts, remoteComponents.length]);

  const preset = PRESETS[presetId] || PRESETS.b2c_budget;
  const calc = useMemo(() => summarize(catalog, sel, qty), [catalog, sel, qty]);
  const presetUnit = useMemo(() => Object.fromEntries(Object.values(PRESETS).map((p) => [p.id, unitTotal(catalog, p.parts)])), [catalog]);
  const curatedPresets = useMemo(
    () => ["b2c_budget", "b2c_mid", "b2c", "b2s", "b2b"].map((key) => PRESETS[key]),
    [],
  );
  const matchingBudgetCount = useMemo(
    () => curatedPresets.filter((p) => presetUnit[p.id] <= budgetLimit).length,
    [curatedPresets, presetUnit, budgetLimit],
  );
  const recommendedPsuWatts = Math.max(350, Math.ceil((calc.watts * 1.35) / 50) * 50);
  const isCustom = presetId === "custom" || Boolean(loadedProductId) || SLOTS.some((s) => sel[s.key] !== preset.parts[s.key]);
  const psuOk = calc.load <= 1;
  const loadPct = Math.round(calc.load * 100);
  const meter = calc.load > 1 ? "bg-status-danger" : calc.load > 0.8 ? "bg-status-sample" : "bg-status-live";
  const nextTier = TIERS.find((t) => qty < t.min);
  const qtyLabel = `${qty} unit`;

  const startCustomBuild = () => {
    setPresetId("custom");
    setSel(PRESETS.custom.parts);
    setQty(1);
    setOpenSlot("cpu");
    setNotice("");
    setLoadedProductId("");
    setAutoNote("Mode Custom Build aktif. Pilih komponen mulai dari CPU hingga Monitor sesuai kebutuhan Anda.");
  };

  const applyBudgetPreset = () => {
    const candidates = curatedPresets
      .filter((p) => presetUnit[p.id] <= budgetLimit)
      .sort((a, b) => presetUnit[b.id] - presetUnit[a.id]);
    if (candidates.length > 0) {
      choosePreset(candidates[0].id);
      setAutoNote(`Preset "${candidates[0].name}" dipilih karena paling optimal untuk anggaran ≤ ${idr(budgetLimit)}.`);
    } else {
      startCustomBuild();
      setAutoNote(`Belum ada preset lengkap di bawah ${idr(budgetLimit)}. Mulai dari Custom Build untuk merakit hemat.`);
    }
  };

  const handleCheckBottleneck = () => {
    const params = new URLSearchParams();
    if (sel.cpu) params.set("cpu", String(sel.cpu));
    if (sel.gpu) params.set("gpu", String(sel.gpu));
    if (sel.ram) params.set("ram", String(sel.ram));
    if (sel.mobo) params.set("mobo", String(sel.mobo));
    if (sel.psu) params.set("psu", String(sel.psu));
    router.push(`/bottleneck?${params.toString()}`);
  };

  const handleCopySpecSheet = async () => {
    const lines = [
      `Spec Sheet Rakitan ViciTech — ${preset.name} (${preset.seg})`,
      ...calc.rows.map((row) => `• ${row.label}: ${row.part.name} (${idr(row.part.price)})`),
      `---`,
      `Harga per Unit: ${idr(calc.unit)}`,
      `Total Pesanan (${qtyLabel} + JIT 5%): ${idr(calc.total)}`,
      `Estimasi Konsumsi Daya: ${calc.watts} W (PSU terpilih ${calc.cap} W · Disarankan ≥ ${recommendedPsuWatts} W)`,
      `#ViciTechBuild`,
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setSpecCopyNotice("Spec Sheet berhasil disalin! Siap ditempel ke Komunitas atau WhatsApp.");
    } catch {
      setSpecCopyNotice("Browser memblokir akses papan klip. Salin rincian secara manual.");
    }
  };

  const timeline = useMemo(() => {
    const start = new Date();
    const build = 1 + Math.ceil(qty / 25);
    const at = (n) => { const d = new Date(start); d.setDate(d.getDate() + n); return fmtDate(d); };
    return [
      { label: "Pesanan dikonfirmasi", note: "Terverifikasi di database Supabase", date: at(0) },
      { label: "Perakitan di Hub Bandung", note: `${build} hari kerja untuk ${qtyLabel}`, date: at(build) },
      { label: "Uji burn-in IoT & pengecekan QC", note: "Inspeksi telemetri Smart Bench", date: at(build + 1) },
      { label: "Siap dikirim / diambil", note: "Pengiriman kurir atau ambil di hub", date: at(build + 3) },
    ];
  }, [qty, qtyLabel]);

  const choosePreset = (id) => {
    setPresetId(id); setSel(PRESETS[id].parts); setQty(PRESETS[id].qty);
    setOpenSlot(null); setAutoNote(""); setNotice(""); setLoadedProductId("");
  };

  const swap = (slot, id) => {
    const next = fixCompat(catalog, { ...sel, [slot]: id });
    const changed = SLOTS.filter((s) => s.key !== slot && next[s.key] !== sel[s.key]).map((s) => s.label);
    setSel(next); setOpenSlot(null);
    setAutoNote(changed.length ? `${changed.join(" dan ")} disesuaikan otomatis agar tetap kompatibel.` : "");
  };

  const deltaFor = (slot) => (opt) => {
    const next = fixCompat(catalog, { ...sel, [slot]: opt.id });
    return { delta: unitTotal(catalog, next) - calc.unit, extra: SLOTS.some((s) => s.key !== slot && next[s.key] !== sel[s.key]) };
  };

  const savePreset = async () => {
    if (isSavingPreset) return;
    setIsSavingPreset(true);
    const time = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    const label = `Konfigurasi ${preset.seg}, ${time}`;
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
      setNotice("Preset disimpan dan disinkronkan ke vault akun ViciTech Anda.");
    } catch {
      setNotice("Preset disimpan sementara di sesi browser ini.");
    } finally {
      setIsSavingPreset(false);
    }
  };

  const loadSaved = (s) => { setPresetId(s.presetId); setSel(s.sel); setQty(s.qty); setOpenSlot(null); setAutoNote(""); };
  const requestQuote = () => setNotice(`Permintaan penawaran ${makeRef("VT-Q")} dibuat. Dokumen PDF resmi akan dikirim maksimal 1 hari kerja.`);

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
      notes: `${qty} unit; diskon grosir ${calc.pct}%`,
    });
    setDrawer(false);
  };

  const closeDrawer = () => { setDrawer(false); setNotice(""); };

  const iconBtn = `vt-motion-press vt-btn-tactile grid h-11 w-11 place-items-center rounded-lg border border-default bg-surface text-secondary hover:border-accent-primary/40 hover:text-accent-cta ${focusRing}`;

  return (
    <div className="min-w-0 bg-canvas text-primary antialiased">
      <div className="mx-auto max-w-7xl px-3 pb-28 pt-4 sm:px-6 sm:pb-32 sm:pt-10 lg:pb-28">
        <div className="flex flex-wrap items-center gap-2">
          <span className="vt-badge-sample">Data Referensi &amp; Inventori</span>
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-cta">
            Rakit dengan Kepastian Kompatibilitas
          </span>
        </div>
        <h1 className="mt-2.5 flex items-center gap-2.5 font-sans text-2xl font-bold tracking-tight text-primary sm:mt-3 sm:gap-3 sm:text-5xl">
          <Sliders className="h-6 w-6 shrink-0 text-accent-primary sm:h-8 sm:w-8" strokeWidth={1.75} aria-hidden="true" />
          <span>Smart Preset Builder &amp; Konfigurator</span>
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-secondary sm:mt-4 sm:text-base">
          Mulai dari preset teruji sesuai segmen kebutuhan, ganti komponen apa saja, dan pantau harga, estimasi beban daya PSU, serta Buffer Pasar JIT 5% secara langsung.
        </p>

        {/* Filter Anggaran Cepat + Tombol Custom Build */}
        <section
          aria-label="Filter anggaran dan mode rakit custom"
          className="mt-5 rounded-xl border border-default bg-surface p-4 shadow-sm sm:mt-7 sm:p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-cta">
                Filter Anggaran Cepat
              </p>
              <p className="mt-0.5 text-sm text-secondary">
                Geser batas anggaran per unit:{" "}
                <strong className="font-mono font-semibold tabular-nums text-primary">
                  {budgetLimit >= 35000000 ? "Semua Anggaran (hingga Rp 35 jt)" : `Maks. ${idr(budgetLimit)}`}
                </strong>
                {" "}· <span className="font-mono text-xs">{matchingBudgetCount} preset cocok</span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={applyBudgetPreset}
                className={`vt-motion-press vt-btn-tactile inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-accent-primary/35 bg-accent-subtle px-3.5 py-2 text-xs font-semibold text-accent-cta hover:bg-accent-primary/15 ${focusRing}`}
              >
                <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                <span>Pilihkan Preset Terbaik</span>
              </button>
              <button
                type="button"
                onClick={startCustomBuild}
                aria-pressed={presetId === "custom"}
                className={`vt-motion-press vt-btn-tactile inline-flex min-h-10 items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors ${focusRing} ${
                  presetId === "custom"
                    ? "border-primary bg-primary text-surface"
                    : "border-default bg-canvas text-primary hover:border-accent-primary/40 hover:bg-subtle"
                }`}
              >
                <Wrench className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                <span>Mulai dari Kosong (Custom Build)</span>
              </button>
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex-1">
              <label htmlFor="builder-budget-slider" className="sr-only">
                Batas anggaran per unit dalam Rupiah
              </label>
              <input
                id="builder-budget-slider"
                type="range"
                min={5000000}
                max={35000000}
                step={1000000}
                value={budgetLimit}
                onChange={(e) => setBudgetLimit(Number(e.target.value))}
                className="h-2 w-full cursor-pointer accent-[#EA580C]"
              />
              <div className="mt-1 flex justify-between font-mono text-[11px] tabular-nums text-secondary">
                <span>Rp 5 jt</span>
                <span>Rp 15 jt</span>
                <span>Rp 25 jt</span>
                <span>Rp 35 jt</span>
              </div>
            </div>
            <div className="no-scrollbar flex flex-nowrap gap-1.5 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
              {BUDGET_PRESET_CHIPS.map((chip) => {
                const active =
                  (chip.label === "Semua" && budgetLimit >= 35000000) ||
                  (chip.label !== "Semua" && budgetLimit === chip.value);
                return (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => setBudgetLimit(chip.value)}
                    className={`min-h-9 shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium transition-colors ${focusRing} ${
                      active
                        ? "border-accent-primary bg-accent-cta font-semibold text-white"
                        : "border-default bg-canvas text-secondary hover:bg-subtle hover:text-primary"
                    }`}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Pemilih Preset */}
        <div role="radiogroup" aria-label="Pilih preset dasar" className="mt-5 grid gap-3 sm:mt-6 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
          {curatedPresets.map((p) => {
            const active = p.id === presetId;
            const Icon = p.icon;
            const unitCost = presetUnit[p.id];
            const withinBudget = unitCost <= budgetLimit;
            return (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => choosePreset(p.id)}
                className={`vt-card-lift flex flex-col rounded-xl border p-3.5 text-left transition-opacity sm:p-5 ${focusRing} ${
                  active
                    ? "border-accent-primary bg-accent-subtle shadow-sm"
                    : withinBudget
                      ? "border-default bg-surface hover:bg-subtle"
                      : "border-default bg-surface/75 opacity-60 hover:opacity-100"
                }`}
              >
                <span className="flex w-full items-start justify-between gap-2">
                  <span className="flex items-center gap-3">
                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${active ? "bg-accent-primary text-white" : "bg-subtle text-secondary"}`}>
                      <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
                    </span>
                    <span>
                      <span className="block font-mono text-xs font-semibold text-accent-cta">{p.seg}</span>
                      <span className="block font-sans text-base font-semibold text-primary">{p.name}</span>
                    </span>
                  </span>
                  {budgetLimit < 35000000 && (
                    <span
                      className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                        withinBudget
                          ? "bg-emerald-50 text-emerald-800"
                          : "bg-subtle text-secondary"
                      }`}
                    >
                      {withinBudget ? "Masuk Budget" : "Di Atas Budget"}
                    </span>
                  )}
                </span>
                <span className="mt-3 text-sm text-secondary">{p.blurb}</span>
                <span className="mt-3 flex flex-wrap gap-1.5">
                  {p.focus.map((f) => (
                    <span key={f} className="rounded-full border border-default bg-surface px-2.5 py-0.5 text-xs text-secondary">
                      {f}
                    </span>
                  ))}
                </span>
                <span className="mt-4 text-sm text-secondary">
                  Mulai <span className="font-mono font-semibold tabular-nums text-primary">{idr(unitCost)}</span> per unit
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-5 grid gap-4 sm:mt-8 sm:gap-6 lg:grid-cols-3">
          {/* Daftar Komponen */}
          <section className="lg:col-span-2" aria-label="Daftar komponen rakitan">
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <h2 className="tracking-tight font-sans text-lg font-bold text-primary">Komponen Rakitan</h2>
              {isCustom && (
                <span className="vt-badge-sample">Disesuaikan</span>
              )}
              {isCustom && (
                <button
                  type="button"
                  onClick={() => choosePreset(presetId)}
                  className={`ml-auto inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-secondary hover:bg-subtle hover:text-accent-cta ${focusRing}`}
                >
                  <RefreshCw className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                  <span>Reset ke preset awal</span>
                </button>
              )}
            </div>
            {autoNote && (
              <p role="status" className="mb-3 flex items-center gap-2 rounded-xl border border-accent-primary/25 bg-accent-subtle p-3.5 text-sm text-primary">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-accent-cta" strokeWidth={1.75} aria-hidden="true" />
                <span>{autoNote}</span>
              </p>
            )}
            <ul className="space-y-2.5 sm:space-y-3">
              {calc.rows.map((r) => (
                <PartRow
                  key={r.key}
                  slot={r}
                  current={r.part}
                  marketMatch={matchPartToMarket(r.part.name, r.key, marketProducts)}
                  open={openSlot === r.key}
                  onToggle={() => setOpenSlot(openSlot === r.key ? null : r.key)}
                  options={optionsFor(catalog, r.key, sel)}
                  deltaFor={deltaFor(r.key)}
                  onPick={(id) => swap(r.key, id)}
                />
              ))}
            </ul>
          </section>

          {/* Ringkasan Langsung */}
          <aside className="space-y-3 sm:space-y-4 lg:sticky lg:top-24 lg:self-start" aria-label="Ringkasan konfigurasi">
            <div className="rounded-xl border border-default bg-surface p-3.5 shadow-sm sm:p-5">
              <p className="text-sm text-secondary">Harga dasar per unit</p>
              <p className="mt-1 font-mono text-2xl font-semibold text-primary">
                <AnimatedNumber value={calc.unit} format="currency" />
              </p>

              <div className="mt-4 flex items-center justify-between gap-3">
                <label htmlFor="qty" className="text-sm font-medium text-secondary">Jumlah unit</label>
                <div className="flex items-center gap-2">
                  <button type="button" aria-label="Kurangi jumlah unit" className={iconBtn} onClick={() => setQty((q) => clampQty(q - 1))}>
                    <Minus className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <input
                    id="qty"
                    type="number"
                    min={1}
                    max={MAX_QTY}
                    value={qty}
                    onChange={(e) => setQty(clampQty(e.target.value))}
                    className={`vt-form-control h-11 w-20 rounded-lg border border-default bg-canvas text-center font-mono text-sm tabular-nums text-primary ${focusRing}`}
                  />
                  <button type="button" aria-label="Tambah jumlah unit" className={iconBtn} onClick={() => setQty((q) => clampQty(q + 1))}>
                    <Plus className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
              {calc.pct > 0 && (
                <p className="mt-3 flex justify-between font-mono text-sm text-status-live">
                  <span className="font-sans">Diskon grosir {calc.pct}%</span>
                  <AnimatedNumber value={calc.discount} format="currency" prefix="-" />
                </p>
              )}
              {nextTier && (
                <p className="mt-1 text-xs text-secondary">
                  Tambah {nextTier.min - qty} unit lagi untuk diskon grosir {nextTier.pct}%.
                </p>
              )}

              <div className="mt-4 space-y-1.5 border-t border-default pt-4">
                <div className="flex justify-between text-xs text-secondary">
                  <span>Subtotal ({qty}×)</span>
                  <AnimatedNumber value={calc.basePrice} format="currency" className="font-mono text-primary" />
                </div>
                <div className="flex justify-between text-xs text-accent-cta">
                  <span className="flex items-center gap-1"><Zap className="h-3 w-3" aria-hidden="true" /> JIT 5% Buffer</span>
                  <AnimatedNumber value={calc.jitBuffer} format="currency" prefix="+" className="font-mono" />
                </div>
                <div className="flex justify-between border-t border-default pt-2 text-base font-semibold">
                  <span className="text-primary">Total Pesanan</span>
                  <AnimatedNumber value={calc.total} format="currency" className="font-mono text-accent-cta" />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-default bg-surface p-3.5 shadow-sm sm:p-5">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 font-medium text-primary">
                  <Zap className="h-4 w-4 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
                  <span>Estimasi beban daya</span>
                </span>
                <AnimatedNumber value={calc.watts} format="number" suffix=" W" className="font-mono font-semibold text-primary" />
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-subtle" role="meter" aria-valuemin={0} aria-valuemax={calc.cap} aria-valuenow={calc.watts} aria-label="Beban daya terhadap kapasitas PSU">
                <div className={`vt-progress-fill h-full rounded-full ${meter}`} style={{ transform: `scaleX(${Math.min(100, loadPct) / 100})` }} />
              </div>
              <p className="mt-2 font-mono text-xs tabular-nums text-secondary">
                <AnimatedNumber value={loadPct} format="percent" /> dari kapasitas PSU {calc.cap} W
              </p>
              {!psuOk && (
                <p className="mt-2 text-xs text-status-danger">
                  Kebutuhan daya melebihi kapasitas PSU. Pilih PSU berkapasitas lebih besar.
                </p>
              )}
              {psuOk && calc.load > 0.8 && (
                <p className="mt-2 text-xs text-status-sample">
                  Margin daya tersisa tipis. PSU lebih besar memberi ruang upgrade lebih aman.
                </p>
              )}
              <p className="vt-badge-live mt-4" title="Garansi terpendek di antara komponen terpilih">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Garansi komponen {calc.warranty} bulan</span>
              </p>
            </div>

            <button
              type="button"
              onClick={() => setDrawer(true)}
              className={`vt-btn-tactile hidden min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent-cta px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-accent-cta-hover lg:inline-flex ${focusRing}`}
            >
              <ShoppingCart className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              <span>Tinjau Pre-Order Cepat</span>
            </button>

            {/* Aksi Lintas Modul: Cek Market, Bottleneck & Salin Spec Sheet */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
              <Link
                href={buildMarketCatalogUrl()}
                className={`vt-motion-press vt-btn-tactile inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-accent-primary/40 bg-accent-subtle px-4 py-2.5 text-xs font-semibold text-accent-cta transition-colors hover:bg-accent-primary/15 sm:text-sm ${focusRing}`}
              >
                <Store className="h-4 w-4 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
                <span>Cek Semua Komponen di Market</span>
              </Link>

              <button
                type="button"
                onClick={handleCheckBottleneck}
                className={`vt-motion-press vt-btn-tactile inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-default bg-surface px-4 py-2.5 text-xs font-semibold text-primary transition-colors hover:border-accent-primary/40 hover:bg-accent-subtle sm:text-sm ${focusRing}`}
              >
                <Gauge className="h-4 w-4 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
                <span>Cek Bottleneck Rakitan Ini</span>
              </button>

              <button
                type="button"
                onClick={() => void handleCopySpecSheet()}
                className={`vt-motion-press vt-btn-tactile inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-default bg-canvas px-4 py-2.5 text-xs font-semibold text-primary transition-colors hover:border-accent-primary/40 hover:bg-subtle sm:text-sm ${focusRing}`}
              >
                {specCopyNotice ? (
                  <Check className="h-4 w-4 text-status-live" strokeWidth={2} aria-hidden="true" />
                ) : (
                  <Copy className="h-4 w-4 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
                )}
                <span>{specCopyNotice ? "Spec Sheet Tersalin" : "Salin Spec Sheet"}</span>
              </button>
            </div>

            {specCopyNotice && (
              <p role="status" aria-live="polite" className="vt-pop flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-semibold text-emerald-900">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
                <span>{specCopyNotice}</span>
              </p>
            )}

            {saved.length > 0 && (
              <div className="rounded-xl border border-default bg-surface p-3.5 shadow-sm sm:p-4">
                <h3 className="tracking-tight mb-2 flex items-center gap-2 text-sm font-bold text-primary">
                  <Bookmark className="h-4 w-4 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
                  <span>Preset Tersimpan Sesi Ini</span>
                </h3>
                <ul className="space-y-1">
                  {saved.map((s) => (
                    <li key={s.id} className="flex items-center gap-2 text-sm">
                      <span className="min-w-0 flex-1 truncate text-primary">{s.label}</span>
                      <span className="font-mono text-xs tabular-nums text-secondary">{idr(s.unit)}</span>
                      <button type="button" onClick={() => loadSaved(s)} className={`min-h-9 rounded px-2 py-1 text-xs font-medium text-accent-cta hover:bg-accent-subtle ${focusRing}`}>
                        Muat
                      </button>
                      <button type="button" aria-label={`Hapus ${s.label}`} onClick={() => setSaved((l) => l.filter((x) => x.id !== s.id))} className={`inline-flex h-9 w-9 items-center justify-center rounded text-secondary hover:text-primary ${focusRing}`}>
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
        </div>
      </div>

      {/* Bilah aksi mobile */}
      <div className="fixed inset-x-0 bottom-14 z-20 flex items-center gap-2.5 border-t border-default bg-surface px-3 py-2 shadow-sm sm:gap-3 sm:px-4 sm:py-2.5 md:bottom-0 lg:hidden">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] leading-tight text-secondary">Total {qtyLabel} · inc. 5% JIT</p>
          <p className="truncate font-mono text-sm font-semibold text-accent-cta sm:text-base">
            <AnimatedNumber value={calc.total} format="currency" />
          </p>
        </div>
        <button type="button" onClick={() => setDrawer(true)} className={`vt-btn-tactile inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg bg-accent-cta px-3.5 py-2 text-xs font-semibold text-white hover:bg-accent-cta-hover sm:min-h-11 sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm ${focusRing}`}>
          <ShoppingCart className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
          <span>Checkout</span>
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
