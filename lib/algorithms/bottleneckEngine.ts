import type { HardwareComponent } from '@/lib/hardware/components';

export const BOTTLENECK_SCENARIOS = [
  '1080p_esports',
  '1440p_aaa',
  '4k_ultra',
  'rendering',
] as const;

export type BottleneckScenarioId = (typeof BOTTLENECK_SCENARIOS)[number];
export type MemoryStandard = 'DDR4' | 'DDR5';
export type BottleneckSeverity = 'optimal' | 'warning' | 'high';
export type BottleneckDirection = 'balanced' | 'cpu' | 'gpu';
export type PsuHeadroomStatus = 'safe' | 'tight' | 'insufficient' | 'unspecified';
export type CompatibilityStatus = 'pass' | 'warn' | 'fail';

export interface BottleneckScenarioMeta {
  readonly id: BottleneckScenarioId;
  readonly label: string;
  readonly shortLabel: string;
  readonly description: string;
  readonly cpuMultiplier: number;
  readonly gpuMultiplier: number;
  readonly minIdealRamGb: number;
  readonly recommendedRamGb: number;
}

export interface BottleneckCpuSpec {
  readonly id: string;
  readonly name: string;
  readonly priceIdr: number;
  readonly socket: string;
  readonly supportedMemory: readonly MemoryStandard[];
  readonly gamingScore: number;
  readonly multiCoreScore: number;
  readonly tdpWatts: number;
  readonly source: 'supabase_hardware' | 'curated_sample';
}

export interface BottleneckGpuSpec {
  readonly id: string;
  readonly name: string;
  readonly priceIdr: number;
  readonly rasterScore: number;
  readonly vramGb: number;
  readonly tdpWatts: number;
  readonly source: 'supabase_hardware' | 'curated_sample';
}

export interface BottleneckRamSpec {
  readonly id: string;
  readonly name: string;
  readonly priceIdr: number;
  readonly capacityGb: number;
  readonly memoryType: MemoryStandard;
  readonly speedMTs: number;
  readonly isDualChannel: boolean;
}

export interface BottleneckMotherboardSpec {
  readonly id: string;
  readonly name: string;
  readonly priceIdr: number;
  readonly socket: string;
  readonly memoryType: MemoryStandard;
}

export interface BottleneckPsuSpec {
  readonly id: string;
  readonly name: string;
  readonly priceIdr: number;
  readonly wattage: number;
}

export interface BottleneckCatalog {
  readonly cpus: readonly BottleneckCpuSpec[];
  readonly gpus: readonly BottleneckGpuSpec[];
  readonly rams: readonly BottleneckRamSpec[];
  readonly motherboards: readonly BottleneckMotherboardSpec[];
  readonly psus: readonly BottleneckPsuSpec[];
}

export interface BottleneckInput {
  readonly cpu: BottleneckCpuSpec;
  readonly gpu: BottleneckGpuSpec;
  readonly ram?: BottleneckRamSpec | null | undefined;
  readonly motherboard?: BottleneckMotherboardSpec | null | undefined;
  readonly psu?: BottleneckPsuSpec | null | undefined;
  readonly scenario: BottleneckScenarioId;
  readonly availableCpus?: readonly BottleneckCpuSpec[] | undefined;
  readonly availableGpus?: readonly BottleneckGpuSpec[] | undefined;
}

export interface PsuHeadroomResult {
  readonly estimatedWattage: number;
  readonly recommendedPsuWatts: number;
  readonly selectedPsuWatts: number | null;
  readonly loadPct: number | null;
  readonly status: PsuHeadroomStatus;
  readonly statusLabel: string;
  readonly explanation: string;
}

export interface CompatibilityCheckItem {
  readonly id: 'socket' | 'memory_type' | 'ram_capacity' | 'psu_headroom';
  readonly label: string;
  readonly status: CompatibilityStatus;
  readonly detail: string;
}

export interface UpgradeSuggestion {
  readonly targetKind: 'cpu' | 'gpu';
  readonly candidateId: string;
  readonly candidateName: string;
  readonly currentBottleneckPct: number;
  readonly projectedBottleneckPct: number;
  readonly improvementPct: number;
  readonly priceDeltaIdr: number;
  readonly requiresPlatformChange: boolean;
  readonly reason: string;
}

export interface ScenarioBenchmarkItem {
  readonly id: string;
  readonly title: string;
  readonly preset: string;
  readonly metricDisplay: string;
  readonly tierLabel: 'Sangat Lancar' | 'Lancar' | 'Cukup' | 'Terbatas';
  readonly barPct: number;
}

export interface BottleneckAnalysisResult {
  readonly scenario: BottleneckScenarioMeta;
  readonly cpuEffectiveScore: number;
  readonly gpuEffectiveScore: number;
  readonly cpuUtilizationPct: number;
  readonly gpuUtilizationPct: number;
  readonly bottleneckPct: number;
  readonly severity: BottleneckSeverity;
  readonly statusBadge: string;
  readonly direction: BottleneckDirection;
  readonly directionLabel: string;
  readonly explanation: string;
  readonly projectedMetricLabel: string;
  readonly projectedMetricValue: number;
  readonly projectedMetricUnit: string;
  readonly scenarioBenchmarks: readonly ScenarioBenchmarkItem[];
  readonly psuHeadroom: PsuHeadroomResult;
  readonly compatibilityChecks: readonly CompatibilityCheckItem[];
  readonly upgradeSuggestions: readonly UpgradeSuggestion[];
  readonly totalSelectedPriceIdr: number;
}

export const BOTTLENECK_SCENARIO_META: Readonly<Record<BottleneckScenarioId, BottleneckScenarioMeta>> = {
  '1080p_esports': {
    id: '1080p_esports',
    label: '1080p Kompetitif',
    shortLabel: '1080p Kompetitif',
    description: 'Beban CPU lebih tinggi untuk mengejar 144–240+ FPS pada game esports.',
    cpuMultiplier: 0.85,
    gpuMultiplier: 1.15,
    minIdealRamGb: 8,
    recommendedRamGb: 16,
  },
  '1440p_aaa': {
    id: '1440p_aaa',
    label: '1440p AAA',
    shortLabel: '1440p AAA',
    description: 'Beban seimbang antara CPU dan GPU pada game AAA resolusi QHD.',
    cpuMultiplier: 1.0,
    gpuMultiplier: 1.0,
    minIdealRamGb: 16,
    recommendedRamGb: 16,
  },
  '4k_ultra': {
    id: '4k_ultra',
    label: '4K Ultra',
    shortLabel: '4K Ultra',
    description: 'Beban sangat dominan ke GPU dan kapasitas VRAM pada resolusi 2160p.',
    cpuMultiplier: 1.12,
    gpuMultiplier: 0.95,
    minIdealRamGb: 16,
    recommendedRamGb: 16,
  },
  rendering: {
    id: 'rendering',
    label: 'Editing & Render',
    shortLabel: 'Editing & Render',
    description: 'Memanfaatkan inti multi-core CPU, kapasitas RAM lega, dan VRAM GPU.',
    cpuMultiplier: 0.98,
    gpuMultiplier: 0.95,
    minIdealRamGb: 16,
    recommendedRamGb: 32,
  },
};

export const CURATED_BOTTLENECK_CATALOG: BottleneckCatalog = {
  cpus: [
    { id: 'i3-12100f', name: 'Intel Core i3-12100F', priceIdr: 1_600_000, socket: 'LGA1700', supportedMemory: ['DDR4', 'DDR5'], gamingScore: 52, multiCoreScore: 38, tdpWatts: 89, source: 'curated_sample' },
    { id: 'i5-12400f', name: 'Intel Core i5-12400F', priceIdr: 2_300_000, socket: 'LGA1700', supportedMemory: ['DDR4', 'DDR5'], gamingScore: 62, multiCoreScore: 52, tdpWatts: 117, source: 'curated_sample' },
    { id: 'r5-5600', name: 'AMD Ryzen 5 5600', priceIdr: 2_200_000, socket: 'AM4', supportedMemory: ['DDR4'], gamingScore: 63, multiCoreScore: 51, tdpWatts: 88, source: 'curated_sample' },
    { id: 'r5-7600', name: 'AMD Ryzen 5 7600', priceIdr: 3_900_000, socket: 'AM5', supportedMemory: ['DDR5'], gamingScore: 76, multiCoreScore: 58, tdpWatts: 88, source: 'curated_sample' },
    { id: 'i7-13700k', name: 'Intel Core i7-13700K', priceIdr: 6_500_000, socket: 'LGA1700', supportedMemory: ['DDR4', 'DDR5'], gamingScore: 88, multiCoreScore: 85, tdpWatts: 253, source: 'curated_sample' },
    { id: 'r7-7800x3d', name: 'AMD Ryzen 7 7800X3D', priceIdr: 7_200_000, socket: 'AM5', supportedMemory: ['DDR5'], gamingScore: 96, multiCoreScore: 70, tdpWatts: 120, source: 'curated_sample' },
    { id: 'r9-7950x', name: 'AMD Ryzen 9 7950X', priceIdr: 8_200_000, socket: 'AM5', supportedMemory: ['DDR5'], gamingScore: 92, multiCoreScore: 100, tdpWatts: 230, source: 'curated_sample' },
  ],
  gpus: [
    { id: 'igpu', name: 'Integrated Graphics (iGPU)', priceIdr: 0, rasterScore: 16, vramGb: 0, tdpWatts: 0, source: 'curated_sample' },
    { id: 'rx-6600', name: 'AMD Radeon RX 6600 8GB', priceIdr: 3_000_000, rasterScore: 46, vramGb: 8, tdpWatts: 132, source: 'curated_sample' },
    { id: 'rtx-3060', name: 'NVIDIA RTX 3060 12GB', priceIdr: 3_600_000, rasterScore: 50, vramGb: 12, tdpWatts: 170, source: 'curated_sample' },
    { id: 'rtx-4060', name: 'NVIDIA RTX 4060 8GB', priceIdr: 4_800_000, rasterScore: 58, vramGb: 8, tdpWatts: 115, source: 'curated_sample' },
    { id: 'rtx-4070', name: 'NVIDIA RTX 4070 12GB', priceIdr: 8_900_000, rasterScore: 72, vramGb: 12, tdpWatts: 200, source: 'curated_sample' },
    { id: 'rx-7800xt', name: 'AMD Radeon RX 7800 XT 16GB', priceIdr: 8_700_000, rasterScore: 79, vramGb: 16, tdpWatts: 263, source: 'curated_sample' },
    { id: 'rtx-4070s', name: 'NVIDIA RTX 4070 Super 12GB', priceIdr: 10_900_000, rasterScore: 81, vramGb: 12, tdpWatts: 220, source: 'curated_sample' },
    { id: 'rtx-4090', name: 'NVIDIA RTX 4090 24GB', priceIdr: 32_500_000, rasterScore: 100, vramGb: 24, tdpWatts: 450, source: 'curated_sample' },
  ],
  rams: [
    { id: 'd4-8', name: '8 GB DDR4-2666 Single Channel', priceIdr: 400_000, capacityGb: 8, memoryType: 'DDR4', speedMTs: 2666, isDualChannel: false },
    { id: 'd4-16', name: '16 GB DDR4-3200 Dual Channel', priceIdr: 750_000, capacityGb: 16, memoryType: 'DDR4', speedMTs: 3200, isDualChannel: true },
    { id: 'd4-32', name: '32 GB DDR4-3200 Dual Channel', priceIdr: 1_500_000, capacityGb: 32, memoryType: 'DDR4', speedMTs: 3200, isDualChannel: true },
    { id: 'd5-16', name: '16 GB DDR5-5600 Dual Channel', priceIdr: 950_000, capacityGb: 16, memoryType: 'DDR5', speedMTs: 5600, isDualChannel: true },
    { id: 'd5-32', name: '32 GB DDR5-6000 Dual Channel', priceIdr: 1_900_000, capacityGb: 32, memoryType: 'DDR5', speedMTs: 6000, isDualChannel: true },
    { id: 'd5-64', name: '64 GB DDR5-6000 Dual Channel', priceIdr: 3_800_000, capacityGb: 64, memoryType: 'DDR5', speedMTs: 6000, isDualChannel: true },
  ],
  motherboards: [
    { id: 'b660m-d4', name: 'MSI PRO B660M-A D4 (LGA1700 · DDR4)', priceIdr: 1_850_000, socket: 'LGA1700', memoryType: 'DDR4' },
    { id: 'z790-d5', name: 'Gigabyte Z790 Aorus Elite (LGA1700 · DDR5)', priceIdr: 3_600_000, socket: 'LGA1700', memoryType: 'DDR5' },
    { id: 'b550m-d4', name: 'MSI B550M PRO-VDH (AM4 · DDR4)', priceIdr: 1_650_000, socket: 'AM4', memoryType: 'DDR4' },
    { id: 'b650m-d5', name: 'MSI MAG B650M Mortar (AM5 · DDR5)', priceIdr: 2_300_000, socket: 'AM5', memoryType: 'DDR5' },
    { id: 'x670e-d5', name: 'ASUS TUF X670E-Plus (AM5 · DDR5)', priceIdr: 4_600_000, socket: 'AM5', memoryType: 'DDR5' },
  ],
  psus: [
    { id: 'psu-450', name: '450 W 80+ Bronze', priceIdr: 650_000, wattage: 450 },
    { id: 'psu-550', name: '550 W 80+ Bronze', priceIdr: 850_000, wattage: 550 },
    { id: 'psu-650', name: '650 W 80+ Gold', priceIdr: 1_100_000, wattage: 650 },
    { id: 'psu-750', name: '750 W 80+ Gold', priceIdr: 1_500_000, wattage: 750 },
    { id: 'psu-850', name: '850 W 80+ Gold', priceIdr: 1_900_000, wattage: 850 },
    { id: 'psu-1000', name: '1000 W 80+ Gold', priceIdr: 2_600_000, wattage: 1000 },
  ],
};

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function toSpecRecord(raw: unknown): Readonly<Record<string, unknown>> {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return {};
  }
  const map: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    map[k] = v;
  }
  return map;
}

function readNum(record: Readonly<Record<string, unknown>>, keys: readonly string[]): number | undefined {
  for (const key of keys) {
    const val = record[key];
    if (typeof val === 'number' && Number.isFinite(val)) return val;
    if (typeof val === 'string') {
      const n = Number(val.replace(/[^\d.-]/g, ''));
      if (Number.isFinite(n) && n > 0) return n;
    }
  }
  return undefined;
}

function readStr(record: Readonly<Record<string, unknown>>, keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const val = record[key];
    if (typeof val === 'string' && val.trim()) return val.trim();
  }
  return undefined;
}

function parseSupportedMemory(raw: string | undefined): readonly MemoryStandard[] {
  if (!raw) return ['DDR4', 'DDR5'];
  const upper = raw.toUpperCase();
  const hasD4 = upper.includes('DDR4');
  const hasD5 = upper.includes('DDR5');
  if (hasD4 && hasD5) return ['DDR4', 'DDR5'];
  if (hasD5) return ['DDR5'];
  if (hasD4) return ['DDR4'];
  return ['DDR4', 'DDR5'];
}

export function mergeBottleneckCatalog(components: readonly HardwareComponent[]): BottleneckCatalog {
  const cpus: BottleneckCpuSpec[] = [...CURATED_BOTTLENECK_CATALOG.cpus];
  const gpus: BottleneckGpuSpec[] = [...CURATED_BOTTLENECK_CATALOG.gpus];
  const rams: BottleneckRamSpec[] = [...CURATED_BOTTLENECK_CATALOG.rams];
  const motherboards: BottleneckMotherboardSpec[] = [...CURATED_BOTTLENECK_CATALOG.motherboards];
  const psus: BottleneckPsuSpec[] = [...CURATED_BOTTLENECK_CATALOG.psus];

  const seenCpu = new Set(cpus.map((c) => c.name.toLowerCase()));
  const seenGpu = new Set(gpus.map((g) => g.name.toLowerCase()));
  const seenRam = new Set(rams.map((r) => r.name.toLowerCase()));
  const seenMobo = new Set(motherboards.map((m) => m.name.toLowerCase()));
  const seenPsu = new Set(psus.map((p) => p.name.toLowerCase()));

  for (const comp of components) {
    const specs = toSpecRecord(comp.specs);
    const id = `hardware-${comp.id}`;
    const priceIdr = Math.max(0, Math.round(Number(comp.base_price) || 0));
    const rawPerf = Number(comp.performance_score) || 60;
    const perfScore = clamp(Math.round(rawPerf > 100 ? rawPerf / 100 : rawPerf), 10, 100);
    const key = comp.name.trim().toLowerCase();

    if (comp.category === 'cpu' && !seenCpu.has(key)) {
      seenCpu.add(key);
      cpus.push({
        id,
        name: comp.name,
        priceIdr,
        socket: readStr(specs, ['socket']) ?? 'LGA1700',
        supportedMemory: parseSupportedMemory(readStr(specs, ['memoryType'])),
        gamingScore: readNum(specs, ['gamingScore']) ?? perfScore,
        multiCoreScore: readNum(specs, ['multiCoreScore']) ?? perfScore,
        tdpWatts: readNum(specs, ['tdpWatts', 'tdp']) ?? 95,
        source: 'supabase_hardware',
      });
    } else if (comp.category === 'gpu' && !seenGpu.has(key)) {
      seenGpu.add(key);
      gpus.push({
        id,
        name: comp.name,
        priceIdr,
        rasterScore: perfScore,
        vramGb: readNum(specs, ['vramGB', 'vram']) ?? 8,
        tdpWatts: readNum(specs, ['tdpWatts', 'boardPowerWatts', 'tdp']) ?? 160,
        source: 'supabase_hardware',
      });
    } else if (comp.category === 'ram' && !seenRam.has(key)) {
      seenRam.add(key);
      const memTypeStr = readStr(specs, ['memoryType']) ?? 'DDR5';
      const memoryType: MemoryStandard = memTypeStr.toUpperCase().includes('DDR4') ? 'DDR4' : 'DDR5';
      rams.push({
        id,
        name: comp.name,
        priceIdr,
        capacityGb: readNum(specs, ['capacityGB', 'capacity']) ?? 16,
        memoryType,
        speedMTs: readNum(specs, ['speedMTs']) ?? (memoryType === 'DDR5' ? 5600 : 3200),
        isDualChannel: true,
      });
    } else if (comp.category === 'motherboard' && !seenMobo.has(key)) {
      seenMobo.add(key);
      const memTypeStr = readStr(specs, ['memoryType']) ?? 'DDR5';
      const memoryType: MemoryStandard = memTypeStr.toUpperCase().includes('DDR4') ? 'DDR4' : 'DDR5';
      motherboards.push({
        id,
        name: comp.name,
        priceIdr,
        socket: readStr(specs, ['socket']) ?? 'AM5',
        memoryType,
      });
    } else if (comp.category === 'psu' && !seenPsu.has(key)) {
      seenPsu.add(key);
      const wattage = readNum(specs, ['wattage']) ?? 550;
      if (wattage > 0) {
        psus.push({
          id,
          name: comp.name,
          priceIdr,
          wattage,
        });
      }
    }
  }

  return { cpus, gpus, rams, motherboards, psus };
}

function computeRamModifier(ram: BottleneckRamSpec | null | undefined, meta: BottleneckScenarioMeta): number {
  if (!ram) return 1.0;
  let typeFactor = 1.0;
  if (ram.memoryType === 'DDR5') {
    typeFactor = 1.03;
  } else if (ram.speedMTs < 3000 || !ram.isDualChannel) {
    typeFactor = 0.94;
  }
  const targetGb = meta.id === 'rendering' ? meta.recommendedRamGb : meta.minIdealRamGb;
  const capacityFactor = ram.capacityGb >= targetGb ? 1.0 : clamp(Math.sqrt(ram.capacityGb / targetGb), 0.82, 1.0);
  return typeFactor * capacityFactor;
}

function computeVramModifier(vramGb: number, scenario: BottleneckScenarioId): number {
  if (scenario === '4k_ultra') {
    if (vramGb === 0) return 0.6;
    if (vramGb < 8) return 0.72;
    if (vramGb === 8) return 0.8;
    if (vramGb < 16) return 0.94;
    return 1.06;
  }
  if (scenario === 'rendering') {
    if (vramGb === 0) return 0.55;
    if (vramGb < 8) return 0.78;
    if (vramGb === 8) return 0.9;
    if (vramGb < 16) return 1.0;
    return 1.08;
  }
  if (scenario === '1440p_aaa') {
    if (vramGb === 0) return 0.7;
    if (vramGb < 8) return 0.86;
    return 1.0;
  }
  return 1.0;
}

export function calculatePsuHeadroom(
  cpuTdpWatts: number,
  gpuTdpWatts: number,
  selectedPsu: BottleneckPsuSpec | null | undefined,
): PsuHeadroomResult {
  const safeCpuTdp = Math.max(0, Math.round(cpuTdpWatts));
  const safeGpuTdp = Math.max(0, Math.round(gpuTdpWatts));
  const estimatedWattage = safeCpuTdp + safeGpuTdp + 90;
  const recommendedPsuWatts = Math.ceil((estimatedWattage * 1.35) / 50) * 50;

  if (!selectedPsu || selectedPsu.wattage <= 0) {
    return {
      estimatedWattage,
      recommendedPsuWatts,
      selectedPsuWatts: null,
      loadPct: null,
      status: 'unspecified',
      statusLabel: 'PSU Belum Dipilih',
      explanation: `Estimasi puncak sistem ${estimatedWattage} W. Disarankan PSU minimal ${recommendedPsuWatts} W untuk headroom aman +35%.`,
    };
  }

  const loadPct = round1((estimatedWattage / selectedPsu.wattage) * 100);
  if (loadPct <= 75) {
    return {
      estimatedWattage,
      recommendedPsuWatts,
      selectedPsuWatts: selectedPsu.wattage,
      loadPct,
      status: 'safe',
      statusLabel: 'Aman / Optimal',
      explanation: `Beban puncak ${loadPct.toFixed(1)}% dari kapasitas ${selectedPsu.wattage} W masih menyisakan headroom ideal untuk lonjakan daya (transient spike).`,
    };
  }
  if (loadPct < 90) {
    return {
      estimatedWattage,
      recommendedPsuWatts,
      selectedPsuWatts: selectedPsu.wattage,
      loadPct,
      status: 'tight',
      statusLabel: 'Mepet',
      explanation: `Beban ${loadPct.toFixed(1)}% mendekati batas atas PSU ${selectedPsu.wattage} W. Pertimbangkan naik ke ${recommendedPsuWatts} W agar kipas PSU tetap senyap.`,
    };
  }
  return {
    estimatedWattage,
    recommendedPsuWatts,
    selectedPsuWatts: selectedPsu.wattage,
    loadPct,
    status: 'insufficient',
    statusLabel: 'Tidak Disarankan / Kurang Daya',
    explanation: `Beban puncak ${loadPct.toFixed(1)}% melampaui margin aman PSU ${selectedPsu.wattage} W. Wajib upgrade minimal ke ${recommendedPsuWatts} W.`,
  };
}

function buildCompatibilityChecks(
  input: BottleneckInput,
  psuHeadroom: PsuHeadroomResult,
  meta: BottleneckScenarioMeta,
): readonly CompatibilityCheckItem[] {
  const checks: CompatibilityCheckItem[] = [];
  const { cpu, ram, motherboard } = input;

  if (motherboard) {
    const socketOk = motherboard.socket.toUpperCase() === cpu.socket.toUpperCase();
    checks.push({
      id: 'socket',
      label: 'Soket CPU & Motherboard',
      status: socketOk ? 'pass' : 'fail',
      detail: socketOk
        ? `Cocok (${cpu.socket} terpasang pada ${motherboard.name}).`
        : `Tidak cocok: CPU menggunakan soket ${cpu.socket}, sedangkan motherboard memakai soket ${motherboard.socket}.`,
    });
  } else {
    checks.push({
      id: 'socket',
      label: 'Soket CPU & Motherboard',
      status: 'pass',
      detail: `CPU membutuhkan motherboard soket ${cpu.socket} (belum dipilih spesifik).`,
    });
  }

  if (ram) {
    const cpuSupportsRam = cpu.supportedMemory.includes(ram.memoryType);
    const moboSupportsRam = motherboard ? motherboard.memoryType === ram.memoryType : true;
    const memOk = cpuSupportsRam && moboSupportsRam;
    checks.push({
      id: 'memory_type',
      label: 'Generasi Memori (DDR4 / DDR5)',
      status: memOk ? 'pass' : 'fail',
      detail: memOk
        ? `Kompatibel (${ram.memoryType} didukung oleh CPU ${cpu.name}${motherboard ? ` & motherboard ${motherboard.memoryType}` : ''}).`
        : !cpuSupportsRam
          ? `Tidak cocok: CPU ${cpu.name} hanya mendukung ${cpu.supportedMemory.join('/')}, tidak cocok dengan RAM ${ram.memoryType}.`
          : `Tidak cocok: Motherboard mendukung ${motherboard?.memoryType ?? ''}, berbeda dengan modul RAM ${ram.memoryType}.`,
    });

    const isLowForScenario =
      (meta.id !== '1080p_esports' && ram.capacityGb < 16) ||
      (meta.id === 'rendering' && ram.capacityGb < 32);
    checks.push({
      id: 'ram_capacity',
      label: `Kapasitas RAM (${meta.shortLabel})`,
      status: isLowForScenario ? 'warn' : 'pass',
      detail:
        meta.id === 'rendering' && ram.capacityGb < 32
          ? `RAM ${ram.capacityGb} GB memadai untuk proyek ringan, namun Editing & Render 4K disarankan minimal 32 GB.`
          : ram.capacityGb < 16 && meta.id !== '1080p_esports'
            ? `Peringatan: ${ram.capacityGb} GB di bawah batas nyaman 16 GB untuk ${meta.shortLabel}, berisiko memicu stuttering.`
            : `${ram.capacityGb} GB mencukupi standar beban kerja ${meta.shortLabel}.`,
    });
  } else {
    checks.push({
      id: 'memory_type',
      label: 'Generasi Memori (DDR4 / DDR5)',
      status: 'pass',
      detail: `CPU mendukung ${cpu.supportedMemory.join(' / ')} (modul RAM bersifat opsional).`,
    });
  }

  checks.push({
    id: 'psu_headroom',
    label: 'Headroom Daya PSU (+35% Safety Buffer)',
    status:
      psuHeadroom.status === 'safe'
        ? 'pass'
        : psuHeadroom.status === 'tight' || psuHeadroom.status === 'unspecified'
          ? 'warn'
          : 'fail',
    detail: psuHeadroom.explanation,
  });

  return checks;
}

function formatSuggestionDelta(delta: number): string {
  if (delta === 0) return 'Tanpa selisih harga';
  const absFormatted = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Math.abs(delta));
  return delta > 0 ? `+${absFormatted}` : `-${absFormatted}`;
}

function tierFromFps(avgFps: number, highThreshold: number, midThreshold: number): ScenarioBenchmarkItem['tierLabel'] {
  if (avgFps >= highThreshold) return 'Sangat Lancar';
  if (avgFps >= midThreshold) return 'Lancar';
  if (avgFps >= Math.round(midThreshold * 0.6)) return 'Cukup';
  return 'Terbatas';
}

function formatFpsRange(baseFps: number): string {
  const low = Math.max(15, Math.round((baseFps * 0.88) / 5) * 5);
  const high = Math.max(low + 10, Math.round((baseFps * 1.12) / 5) * 5);
  return `${low} – ${high} FPS`;
}

function buildScenarioBenchmarks(
  input: BottleneckInput,
  cpuEffectiveScore: number,
  gpuEffectiveScore: number,
  baseCapability: number,
): readonly ScenarioBenchmarkItem[] {
  const ramGb = input.ram?.capacityGb ?? 16;

  if (input.scenario === '1080p_esports') {
    const valFps = Math.round(baseCapability * 4.2);
    const cs2Fps = Math.round(baseCapability * 2.9);
    const dotaFps = Math.round(baseCapability * 2.45);
    const apexFps = Math.round(baseCapability * 2.1);

    return [
      {
        id: 'valorant',
        title: 'Valorant',
        preset: '1080p Low/Med · Kompetitif',
        metricDisplay: formatFpsRange(valFps),
        tierLabel: tierFromFps(valFps, 200, 120),
        barPct: Math.round(clamp((valFps / 360) * 100, 12, 100)),
      },
      {
        id: 'cs2',
        title: 'Counter-Strike 2 (CS2)',
        preset: '1080p Medium · Esports',
        metricDisplay: formatFpsRange(cs2Fps),
        tierLabel: tierFromFps(cs2Fps, 165, 100),
        barPct: Math.round(clamp((cs2Fps / 260) * 100, 12, 100)),
      },
      {
        id: 'dota2',
        title: 'Dota 2',
        preset: '1080p High · Teamfight',
        metricDisplay: formatFpsRange(dotaFps),
        tierLabel: tierFromFps(dotaFps, 144, 90),
        barPct: Math.round(clamp((dotaFps / 220) * 100, 12, 100)),
      },
      {
        id: 'apex',
        title: 'Apex Legends',
        preset: '1080p Competitive',
        metricDisplay: formatFpsRange(apexFps),
        tierLabel: tierFromFps(apexFps, 144, 85),
        barPct: Math.round(clamp((apexFps / 200) * 100, 12, 100)),
      },
    ];
  }

  if (input.scenario === '1440p_aaa') {
    const cpFps = Math.round(baseCapability * 1.18);
    const wukongFps = Math.round(baseCapability * 1.05);
    const rdr2Fps = Math.round(baseCapability * 1.32);
    const gtavFps = Math.round(baseCapability * 1.85);

    return [
      {
        id: 'cyberpunk',
        title: 'Cyberpunk 2077',
        preset: '1440p High · Upscaling',
        metricDisplay: formatFpsRange(cpFps),
        tierLabel: tierFromFps(cpFps, 85, 60),
        barPct: Math.round(clamp((cpFps / 120) * 100, 12, 100)),
      },
      {
        id: 'wukong',
        title: 'Black Myth: Wukong',
        preset: '1440p High · TSR/DLSS',
        metricDisplay: formatFpsRange(wukongFps),
        tierLabel: tierFromFps(wukongFps, 80, 55),
        barPct: Math.round(clamp((wukongFps / 110) * 100, 12, 100)),
      },
      {
        id: 'rdr2',
        title: 'Red Dead Redemption 2',
        preset: '1440p High–Ultra',
        metricDisplay: formatFpsRange(rdr2Fps),
        tierLabel: tierFromFps(rdr2Fps, 90, 60),
        barPct: Math.round(clamp((rdr2Fps / 125) * 100, 12, 100)),
      },
      {
        id: 'gtav',
        title: 'GTA V Enhanced',
        preset: '1440p Very High',
        metricDisplay: formatFpsRange(gtavFps),
        tierLabel: tierFromFps(gtavFps, 110, 75),
        barPct: Math.round(clamp((gtavFps / 150) * 100, 12, 100)),
      },
    ];
  }

  if (input.scenario === '4k_ultra') {
    const cp4k = Math.round(baseCapability * 0.72);
    const wukong4k = Math.round(baseCapability * 0.65);
    const rdr4k = Math.round(baseCapability * 0.85);
    const fh4k = Math.round(baseCapability * 1.15);

    return [
      {
        id: 'cyberpunk-4k',
        title: 'Cyberpunk 2077',
        preset: '4K High · DLSS/FSR Performance',
        metricDisplay: formatFpsRange(cp4k),
        tierLabel: tierFromFps(cp4k, 70, 50),
        barPct: Math.round(clamp((cp4k / 95) * 100, 10, 100)),
      },
      {
        id: 'wukong-4k',
        title: 'Black Myth: Wukong',
        preset: '4K High · Upscaling',
        metricDisplay: formatFpsRange(wukong4k),
        tierLabel: tierFromFps(wukong4k, 65, 45),
        barPct: Math.round(clamp((wukong4k / 90) * 100, 10, 100)),
      },
      {
        id: 'rdr2-4k',
        title: 'Red Dead Redemption 2',
        preset: '4K Ultra',
        metricDisplay: formatFpsRange(rdr4k),
        tierLabel: tierFromFps(rdr4k, 75, 55),
        barPct: Math.round(clamp((rdr4k / 100) * 100, 10, 100)),
      },
      {
        id: 'fh5-4k',
        title: 'Forza Horizon 5',
        preset: '4K Extreme',
        metricDisplay: formatFpsRange(fh4k),
        tierLabel: tierFromFps(fh4k, 90, 60),
        barPct: Math.round(clamp((fh4k / 120) * 100, 10, 100)),
      },
    ];
  }

  // Skenario: Editing & Render
  const renderIndex = Math.round(
    clamp((2 * cpuEffectiveScore * gpuEffectiveScore) / (cpuEffectiveScore + gpuEffectiveScore), 10, 100),
  );
  const premiereScore = Math.round(clamp(renderIndex * (ramGb >= 32 ? 1.08 : ramGb >= 16 ? 0.94 : 0.7), 15, 100));
  const blenderScore = Math.round(clamp(gpuEffectiveScore * 0.72 + cpuEffectiveScore * 0.35, 15, 100));
  const aeScore = Math.round(clamp(cpuEffectiveScore * 0.65 + (ramGb >= 32 ? 32 : ramGb >= 16 ? 18 : 6), 15, 100));
  const resolveScore = Math.round(clamp(gpuEffectiveScore * 0.68 + (input.gpu.vramGb >= 12 ? 28 : input.gpu.vramGb >= 8 ? 18 : 6), 15, 100));

  const tierOf = (score: number): ScenarioBenchmarkItem['tierLabel'] =>
    score >= 80 ? 'Sangat Lancar' : score >= 60 ? 'Lancar' : score >= 40 ? 'Cukup' : 'Terbatas';

  return [
    {
      id: 'premiere-4k',
      title: 'Premiere Pro 4K Timeline',
      preset: 'Playback 4K H.264 / Color',
      metricDisplay: premiereScore >= 78 ? 'Full 1/1 Real-time' : premiereScore >= 58 ? 'Lancar 1/2 Res' : 'Disarankan Proxy',
      tierLabel: tierOf(premiereScore),
      barPct: premiereScore,
    },
    {
      id: 'blender',
      title: 'Blender Cycles / Eevee',
      preset: 'Render Scene 3D & Viewport',
      metricDisplay: `Skor ${blenderScore} / 100`,
      tierLabel: tierOf(blenderScore),
      barPct: blenderScore,
    },
    {
      id: 'after-effects',
      title: 'After Effects Preview',
      preset: `Komposisi VFX · RAM ${ramGb} GB`,
      metricDisplay: aeScore >= 78 ? 'RAM Preview Cepat' : aeScore >= 56 ? 'Preview Stabil' : 'Terbatas RAM/CPU',
      tierLabel: tierOf(aeScore),
      barPct: aeScore,
    },
    {
      id: 'davinci',
      title: 'DaVinci Resolve 4K Export',
      preset: `Grade & Encode · ${input.gpu.vramGb || 0} GB VRAM`,
      metricDisplay: resolveScore >= 78 ? 'Ekspor Sangat Cepat' : resolveScore >= 58 ? 'Ekspor Stabil' : 'Render Ringan',
      tierLabel: tierOf(resolveScore),
      barPct: resolveScore,
    },
  ];
}

function buildCoreAnalysis(
  input: BottleneckInput,
  skipRecommendations: boolean,
): BottleneckAnalysisResult {
  const meta = BOTTLENECK_SCENARIO_META[input.scenario];
  const ramFactor = computeRamModifier(input.ram, meta);
  const vramFactor = computeVramModifier(input.gpu.vramGb, input.scenario);

  const rawCpuBase = input.scenario === 'rendering' ? input.cpu.multiCoreScore : input.cpu.gamingScore;
  const cpuEffectiveScore = round1(Math.max(1, rawCpuBase * meta.cpuMultiplier * ramFactor));
  const gpuEffectiveScore = round1(Math.max(1, input.gpu.rasterScore * meta.gpuMultiplier * vramFactor));

  const lo = Math.min(cpuEffectiveScore, gpuEffectiveScore);
  const hi = Math.max(cpuEffectiveScore, gpuEffectiveScore);
  const bottleneckPct = round1(clamp((1 - lo / hi) * 100, 0, 95));

  const cpuUtilizationPct = Math.round((lo / cpuEffectiveScore) * 100);
  const gpuUtilizationPct = Math.round((lo / gpuEffectiveScore) * 100);

  const severity: BottleneckSeverity =
    bottleneckPct < 10 ? 'optimal' : bottleneckPct < 20 ? 'warning' : 'high';
  const statusBadge =
    severity === 'optimal' ? 'Optimal' : severity === 'warning' ? 'Perhatian' : 'Bottleneck Tinggi';

  let direction: BottleneckDirection = 'balanced';
  let directionLabel = 'Seimbang / Optimal';
  if (bottleneckPct >= 10) {
    const cpuIsLimiter = cpuEffectiveScore < gpuEffectiveScore;
    direction = cpuIsLimiter ? 'cpu' : 'gpu';
    directionLabel = cpuIsLimiter
      ? severity === 'high'
        ? 'CPU Bottleneck Berat'
        : 'CPU Bottleneck Ringan'
      : severity === 'high'
        ? 'GPU Bottleneck Berat'
        : 'GPU Bottleneck Ringan';
  }

  let explanation: string;
  if (direction === 'balanced') {
    explanation = `Kombinasi ${input.cpu.name} dan ${input.gpu.name} selaras untuk skenario ${meta.label} (${bottleneckPct.toFixed(1)}% selisih beban). CPU dan GPU dapat bekerja optimal tanpa salah satu tertinggal jauh.`;
  } else if (direction === 'cpu') {
    explanation =
      input.scenario === '1080p_esports'
        ? `Pada ${meta.label}, GPU dapat merender frame lebih cepat sehingga prosesor ${input.cpu.name} menjadi batas utama (${bottleneckPct.toFixed(1)}%). Naikkan CPU atau pindah ke 1440p agar beban bergeser ke GPU.`
        : `Kemampuan ${input.cpu.name} tertinggal ${bottleneckPct.toFixed(1)}% di belakang ${input.gpu.name} pada beban ${meta.label}, sehingga potensi penuh kartu grafis tidak keluar maksimal.`;
  } else {
    explanation =
      input.scenario === '4k_ultra'
        ? `Resolusi ${meta.label} membebani shader dan VRAM secara masif; ${input.gpu.name} beroperasi penuh 100% sementara CPU masih memiliki ruang longgar (${bottleneckPct.toFixed(1)}% limit GPU).`
        : `${input.gpu.name} beroperasi pada kapasitas maksimal sementara ${input.cpu.name} masih longgar, menciptakan GPU bottleneck ${bottleneckPct.toFixed(1)}% di ${meta.label}.`;
  }

  const baseCapability = Math.min(cpuEffectiveScore, gpuEffectiveScore);
  let projectedMetricLabel = 'Estimasi Rata-rata Frame Rate';
  let projectedMetricValue = Math.round(baseCapability * 1.45);
  let projectedMetricUnit = 'FPS';

  if (input.scenario === '1080p_esports') {
    projectedMetricLabel = 'Proyeksi FPS Esports (1080p)';
    projectedMetricValue = Math.round(baseCapability * 3.1);
    projectedMetricUnit = 'FPS';
  } else if (input.scenario === '1440p_aaa') {
    projectedMetricLabel = 'Proyeksi FPS Game AAA (1440p High)';
    projectedMetricValue = Math.round(baseCapability * 1.48);
    projectedMetricUnit = 'FPS';
  } else if (input.scenario === '4k_ultra') {
    projectedMetricLabel = 'Proyeksi FPS 4K Ultra (2160p)';
    projectedMetricValue = Math.round(baseCapability * 0.85);
    projectedMetricUnit = 'FPS';
  } else {
    projectedMetricLabel = 'Indeks Kecepatan Render & Ekspor 4K';
    projectedMetricValue = Math.round(clamp((2 * cpuEffectiveScore * gpuEffectiveScore) / (cpuEffectiveScore + gpuEffectiveScore), 5, 100));
    projectedMetricUnit = 'indeks / 100';
  }

  const scenarioBenchmarks = buildScenarioBenchmarks(
    input,
    cpuEffectiveScore,
    gpuEffectiveScore,
    baseCapability,
  );

  const psuHeadroom = calculatePsuHeadroom(input.cpu.tdpWatts, input.gpu.tdpWatts, input.psu);
  const compatibilityChecks = buildCompatibilityChecks(input, psuHeadroom, meta);

  let upgradeSuggestions: UpgradeSuggestion[] = [];
  if (!skipRecommendations && bottleneckPct >= 12 && direction !== 'balanced') {
    const targetKind: 'cpu' | 'gpu' = direction === 'cpu' ? 'cpu' : 'gpu';

    if (targetKind === 'cpu') {
      const pool = input.availableCpus ?? CURATED_BOTTLENECK_CATALOG.cpus;
      const evaluated = pool
        .filter((candidate) => candidate.id !== input.cpu.id)
        .map((candidate): UpgradeSuggestion | null => {
          const sim = buildCoreAnalysis({ ...input, cpu: candidate }, true);
          const improvementPct = round1(bottleneckPct - sim.bottleneckPct);
          if (improvementPct < 2 || sim.bottleneckPct >= bottleneckPct) return null;
          const requiresPlatformChange =
            candidate.socket.toUpperCase() !== input.cpu.socket.toUpperCase() ||
            (input.motherboard ? candidate.socket.toUpperCase() !== input.motherboard.socket.toUpperCase() : false);
          const priceDeltaIdr = candidate.priceIdr - input.cpu.priceIdr;
          return {
            targetKind: 'cpu',
            candidateId: candidate.id,
            candidateName: candidate.name,
            currentBottleneckPct: bottleneckPct,
            projectedBottleneckPct: sim.bottleneckPct,
            improvementPct,
            priceDeltaIdr,
            requiresPlatformChange,
            reason: `Menurunkan bottleneck dari ${bottleneckPct.toFixed(1)}% menjadi ${sim.bottleneckPct.toFixed(1)}% (${formatSuggestionDelta(priceDeltaIdr)})${requiresPlatformChange ? ` — perlu motherboard soket ${candidate.socket}` : ' — soket sama'}.`,
          };
        })
        .filter((item): item is UpgradeSuggestion => item !== null)
        .sort((a, b) => {
          const aOptimal = a.projectedBottleneckPct < 10 ? 0 : 1;
          const bOptimal = b.projectedBottleneckPct < 10 ? 0 : 1;
          if (aOptimal !== bOptimal) return aOptimal - bOptimal;
          const aSocket = a.requiresPlatformChange ? 1 : 0;
          const bSocket = b.requiresPlatformChange ? 1 : 0;
          if (aSocket !== bSocket) return aSocket - bSocket;
          return a.projectedBottleneckPct - b.projectedBottleneckPct || a.priceDeltaIdr - b.priceDeltaIdr;
        });

      upgradeSuggestions = evaluated.slice(0, 2);
    } else {
      const pool = input.availableGpus ?? CURATED_BOTTLENECK_CATALOG.gpus;
      const evaluated = pool
        .filter((candidate) => candidate.id !== input.gpu.id)
        .map((candidate): UpgradeSuggestion | null => {
          const sim = buildCoreAnalysis({ ...input, gpu: candidate }, true);
          const improvementPct = round1(bottleneckPct - sim.bottleneckPct);
          if (improvementPct < 2 || sim.bottleneckPct >= bottleneckPct) return null;
          const priceDeltaIdr = candidate.priceIdr - input.gpu.priceIdr;
          return {
            targetKind: 'gpu',
            candidateId: candidate.id,
            candidateName: candidate.name,
            currentBottleneckPct: bottleneckPct,
            projectedBottleneckPct: sim.bottleneckPct,
            improvementPct,
            priceDeltaIdr,
            requiresPlatformChange: false,
            reason: `Menyeimbangkan beban GPU dan menurunkan bottleneck ke ${sim.bottleneckPct.toFixed(1)}% (${formatSuggestionDelta(priceDeltaIdr)}).`,
          };
        })
        .filter((item): item is UpgradeSuggestion => item !== null)
        .sort((a, b) => {
          const aOptimal = a.projectedBottleneckPct < 10 ? 0 : 1;
          const bOptimal = b.projectedBottleneckPct < 10 ? 0 : 1;
          if (aOptimal !== bOptimal) return aOptimal - bOptimal;
          return a.projectedBottleneckPct - b.projectedBottleneckPct || Math.abs(a.priceDeltaIdr) - Math.abs(b.priceDeltaIdr);
        });

      upgradeSuggestions = evaluated.slice(0, 2);
    }
  }

  const totalSelectedPriceIdr =
    input.cpu.priceIdr +
    input.gpu.priceIdr +
    (input.ram?.priceIdr ?? 0) +
    (input.motherboard?.priceIdr ?? 0) +
    (input.psu?.priceIdr ?? 0);

  return {
    scenario: meta,
    cpuEffectiveScore,
    gpuEffectiveScore,
    cpuUtilizationPct,
    gpuUtilizationPct,
    bottleneckPct,
    severity,
    statusBadge,
    direction,
    directionLabel,
    explanation,
    projectedMetricLabel,
    projectedMetricValue,
    projectedMetricUnit,
    scenarioBenchmarks,
    psuHeadroom,
    compatibilityChecks,
    upgradeSuggestions,
    totalSelectedPriceIdr,
  };
}

export function analyzeBottleneck(input: BottleneckInput): BottleneckAnalysisResult {
  return buildCoreAnalysis(input, false);
}
