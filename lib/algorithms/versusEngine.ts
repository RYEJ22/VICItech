import type { HardwareComponent } from '@/lib/hardware/components';
import type { ProductRow } from '@/lib/admin/products-validation';

export const VERSUS_CATEGORIES = ['build', 'cpu', 'gpu', 'laptop', 'smartphone'] as const;
export type VersusCategory = (typeof VERSUS_CATEGORIES)[number];

export const VERSUS_PROFILES = ['gaming', 'productivity', 'value'] as const;
export type VersusProfile = (typeof VERSUS_PROFILES)[number];

export type VersusItemSource = 'supabase_market' | 'supabase_hardware' | 'curated_sample';
export type VersusSide = 'a' | 'b';
export type VersusMarginTier = 'dominant' | 'narrow' | 'tie';

export interface VersusWeightProfile {
  readonly id: VersusProfile;
  readonly label: string;
  readonly description: string;
  readonly weights: {
    readonly primaryPerf: number;
    readonly priceToPerf: number;
    readonly powerEfficiency: number;
    readonly platformLongevity: number;
  };
}

export interface SmartphoneWeightProfile {
  readonly id: VersusProfile;
  readonly label: string;
  readonly description: string;
  readonly weights: {
    readonly soc: number;
    readonly display: number;
    readonly batteryCharging: number;
    readonly camera: number;
    readonly priceToPerf: number;
  };
}

export interface VersusScenarioDisplay {
  readonly label: string;
  readonly description: string;
  readonly weightBreakdownText: string;
}

export interface VersusCategoryMeta {
  readonly id: VersusCategory;
  readonly label: string;
  readonly pillLabel: string;
  readonly subtitle: string;
}

export interface VersusBuilderPartHint {
  readonly cpu?: string | undefined;
  readonly gpu?: string | undefined;
  readonly ram?: string | undefined;
  readonly psu?: string | undefined;
}

export interface VersusRawSpecs {
  readonly performanceTier?: number | undefined;
  readonly gamingScore?: number | undefined;
  readonly multiCoreScore?: number | undefined;
  readonly priceIdr: number;
  readonly tdpWatts?: number | undefined;
  readonly cores?: number | undefined;
  readonly threads?: number | undefined;
  readonly vramGb?: number | undefined;
  readonly ramGb?: number | undefined;
  readonly ramType?: string | undefined;
  readonly socket?: string | undefined;
  readonly displaySummary?: string | undefined;
  readonly batteryWh?: number | undefined;
  readonly weightKg?: number | undefined;
  readonly cpuName?: string | undefined;
  readonly gpuName?: string | undefined;
  readonly socName?: string | undefined;
  readonly socScore?: number | undefined;
  readonly storageGb?: number | undefined;
  readonly displayScore?: number | undefined;
  readonly refreshRateHz?: number | undefined;
  readonly panelType?: string | undefined;
  readonly batteryMah?: number | undefined;
  readonly chargingWatt?: number | undefined;
  readonly cameraScore?: number | undefined;
  readonly cameraSummary?: string | undefined;
}

export interface VersusItem {
  readonly id: string;
  readonly name: string;
  readonly brand: string;
  readonly category: VersusCategory;
  readonly conditionLabel: string;
  readonly source: VersusItemSource;
  readonly subtitle: string;
  readonly marketSlug: string | null;
  readonly builderPartHint: VersusBuilderPartHint | null;
  readonly specs: VersusRawSpecs;
}

export interface SmartphoneResolvedSpecs {
  readonly socName: string;
  readonly socScore: number;
  readonly displayScore: number;
  readonly batteryChargingScore: number;
  readonly cameraScore: number;
  readonly batteryMah: number;
  readonly chargingWatt: number;
  readonly refreshRateHz: number;
  readonly ramGb: number;
  readonly storageGb: number;
  readonly panelType: string;
  readonly cameraSummary: string;
  readonly usedFallbackSpecs: boolean;
}

export interface VersusResolvedSpecs {
  readonly priceIdr: number;
  readonly tdpWatts: number;
  readonly gamingScore: number;
  readonly multiCoreScore: number;
  readonly platformLongevityScore: number;
  readonly usedFallbackTdp: boolean;
  readonly usedFallbackPerf: boolean;
  readonly smartphone: SmartphoneResolvedSpecs | null;
}

export interface VersusSubScores {
  readonly rawPerformance: number;
  readonly priceToPerformance: number;
  readonly powerEfficiency: number;
  readonly platformLongevity: number;
  readonly compositeScore: number;
  readonly perfPerMillionIdr: number;
  readonly perfPerWatt: number;
}

export interface VersusSubScoreBar {
  readonly key:
    | 'rawPerformance'
    | 'priceToPerformance'
    | 'powerEfficiency'
    | 'platformLongevity'
    | 'soc'
    | 'display'
    | 'batteryCharging'
    | 'camera';
  readonly label: string;
  readonly weightPct: number;
  readonly scoreA: number;
  readonly scoreB: number;
  readonly winner: VersusSide | 'tie';
}

export interface VersusMetricRow {
  readonly key: string;
  readonly label: string;
  readonly valueA: string;
  readonly valueB: string;
  readonly winner: VersusSide | 'tie' | null;
  readonly deltaNote: string;
}

export interface VersusVerdict {
  readonly winnerSide: VersusSide;
  readonly marginPts: number;
  readonly marginTier: VersusMarginTier;
  readonly marginLabel: string;
  readonly headline: string;
  readonly bullets: readonly [string, string, string];
}

export interface VersusComparisonResult {
  readonly profile: VersusProfile;
  readonly resolvedA: VersusResolvedSpecs;
  readonly resolvedB: VersusResolvedSpecs;
  readonly subScoresA: VersusSubScores;
  readonly subScoresB: VersusSubScores;
  readonly subScoreBars: readonly VersusSubScoreBar[];
  readonly specRows: readonly VersusMetricRow[];
  readonly verdict: VersusVerdict;
}

export const VERSUS_CATEGORY_META: Readonly<Record<VersusCategory, VersusCategoryMeta>> = {
  build: {
    id: 'build',
    label: 'Rakitan PC & Preset',
    pillLabel: 'Rakitan PC',
    subtitle: 'Full build, workstation, dan paket lab siap pakai',
  },
  cpu: {
    id: 'cpu',
    label: 'Prosesor (CPU)',
    pillLabel: 'CPU',
    subtitle: 'Skor gaming, multi-core, TDP, dan dukungan soket',
  },
  gpu: {
    id: 'gpu',
    label: 'Kartu Grafis (GPU)',
    pillLabel: 'GPU',
    subtitle: 'Performa raster, VRAM, dan efisiensi daya TBP',
  },
  laptop: {
    id: 'laptop',
    label: 'Laptop & Mobile',
    pillLabel: 'Laptop',
    subtitle: 'Komputasi mobile, GPU, bobot, dan baterai',
  },
  smartphone: {
    id: 'smartphone',
    label: 'Smartphone / HP',
    pillLabel: 'Smartphone / HP',
    subtitle: 'Chipset SoC, layar, baterai, fast charging, dan kamera',
  },
};

export const VERSUS_WEIGHT_PROFILES: Readonly<Record<VersusProfile, VersusWeightProfile>> = {
  gaming: {
    id: 'gaming',
    label: 'Gaming',
    description: 'Menitikberatkan frame rate stabil, performa single-thread & GPU, serta VRAM.',
    weights: {
      primaryPerf: 0.5,
      priceToPerf: 0.25,
      powerEfficiency: 0.15,
      platformLongevity: 0.1,
    },
  },
  productivity: {
    id: 'productivity',
    label: 'Render & Produktivitas',
    description: 'Memprioritaskan performa multi-core, kapasitas VRAM/RAM, dan efisiensi termal.',
    weights: {
      primaryPerf: 0.55,
      powerEfficiency: 0.2,
      priceToPerf: 0.15,
      platformLongevity: 0.1,
    },
  },
  value: {
    id: 'value',
    label: 'Hemat & Value',
    description: 'Mengutamakan performa per Rupiah yang dibayarkan serta konsumsi listrik rendah.',
    weights: {
      priceToPerf: 0.45,
      powerEfficiency: 0.3,
      primaryPerf: 0.25,
      platformLongevity: 0,
    },
  },
};

export const SMARTPHONE_WEIGHT_PROFILES: Readonly<Record<VersusProfile, SmartphoneWeightProfile>> = {
  gaming: {
    id: 'gaming',
    label: 'Gaming Mobile',
    description: 'Mengutamakan performa chipset SoC, respons layar refresh rate tinggi, baterai tahan lama, dan value.',
    weights: {
      soc: 0.45,
      display: 0.2,
      batteryCharging: 0.2,
      priceToPerf: 0.15,
      camera: 0,
    },
  },
  productivity: {
    id: 'productivity',
    label: 'Kamera & Harian',
    description: 'Memprioritaskan kualitas kamera OIS, kenyamanan panel AMOLED/LTPO, daya baterai, dan kelancaran SoC.',
    weights: {
      camera: 0.35,
      display: 0.25,
      batteryCharging: 0.2,
      soc: 0.2,
      priceToPerf: 0,
    },
  },
  value: {
    id: 'value',
    label: 'Hemat & Value',
    description: 'Menonjolkan rasio performa per Rupiah terbaik, baterai awet + fast charging cepat, dan performa SoC.',
    weights: {
      priceToPerf: 0.45,
      batteryCharging: 0.25,
      soc: 0.2,
      camera: 0.05,
      display: 0.05,
    },
  },
};

export function getVersusScenarioDisplay(
  category: VersusCategory,
  profile: VersusProfile,
): VersusScenarioDisplay {
  if (category === 'smartphone') {
    const sp = SMARTPHONE_WEIGHT_PROFILES[profile];
    const parts = [
      sp.weights.soc > 0 ? `Performa SoC ${Math.round(sp.weights.soc * 100)}%` : null,
      sp.weights.camera > 0 && sp.weights.display > 0 && profile === 'value'
        ? `Kamera & Layar ${Math.round((sp.weights.camera + sp.weights.display) * 100)}%`
        : null,
      profile !== 'value' && sp.weights.camera > 0 ? `Kamera ${Math.round(sp.weights.camera * 100)}%` : null,
      profile !== 'value' && sp.weights.display > 0 ? `Layar & Refresh Rate ${Math.round(sp.weights.display * 100)}%` : null,
      sp.weights.batteryCharging > 0 ? `Baterai & Charging ${Math.round(sp.weights.batteryCharging * 100)}%` : null,
      sp.weights.priceToPerf > 0 ? `Price-to-Performance ${Math.round(sp.weights.priceToPerf * 100)}%` : null,
    ].filter((entry): entry is string => Boolean(entry));

    return {
      label: sp.label,
      description: sp.description,
      weightBreakdownText: parts.join(', '),
    };
  }

  const pc = VERSUS_WEIGHT_PROFILES[profile];
  return {
    label: pc.label,
    description: pc.description,
    weightBreakdownText: `Performa Utama ${Math.round(pc.weights.primaryPerf * 100)}%, Price-to-Performance ${Math.round(pc.weights.priceToPerf * 100)}%, Efisiensi Daya ${Math.round(pc.weights.powerEfficiency * 100)}%, Masa Pakai Platform ${Math.round(pc.weights.platformLongevity * 100)}%`,
  };
}

const CATEGORY_DEFAULT_TDP: Readonly<Record<VersusCategory, number>> = {
  cpu: 95,
  gpu: 170,
  laptop: 55,
  build: 280,
  smartphone: 10,
};

const CATEGORY_PRICE_NORM_REF: Readonly<Record<VersusCategory, number>> = {
  cpu: 13.5,
  gpu: 8.5,
  laptop: 4.2,
  build: 4.0,
  smartphone: 8.5,
};

const CATEGORY_WATT_NORM_REF: Readonly<Record<VersusCategory, number>> = {
  cpu: 0.55,
  gpu: 0.32,
  laptop: 1.05,
  build: 0.22,
  smartphone: 6.0,
};

const IDR_FORMATTER = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

export function formatVersusIdr(amount: number): string {
  const safeAmount = Number.isFinite(amount) ? Math.max(0, Math.round(amount)) : 0;
  return IDR_FORMATTER.format(safeAmount);
}

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
  for (const [key, val] of Object.entries(raw)) {
    map[key] = val;
  }
  return map;
}

function readStringProp(record: Readonly<Record<string, unknown>>, keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const val = record[key];
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (trimmed) return trimmed;
    }
  }
  return undefined;
}

function readNumberProp(record: Readonly<Record<string, unknown>>, keys: readonly string[]): number | undefined {
  for (const key of keys) {
    const val = record[key];
    if (typeof val === 'number' && Number.isFinite(val)) {
      return val;
    }
    if (typeof val === 'string') {
      const normalized = val.replace(/\.(?=\d{3}(?:\D|$))/g, '');
      const match = normalized.match(/-?\d+(?:\.\d+)?/);
      if (match) {
        const parsed = Number(match[0]);
        if (Number.isFinite(parsed) && parsed > 0) {
          return parsed;
        }
      }
    }
  }
  return undefined;
}

function normalizeScoreValue(rawScore: number | undefined): number | undefined {
  if (rawScore === undefined || !Number.isFinite(rawScore) || rawScore <= 0) {
    return undefined;
  }
  const scaled = rawScore > 100 ? rawScore / 100 : rawScore;
  return round1(clamp(scaled, 10, 100));
}

function inferSocScoreFromName(socName: string | undefined, safePrice: number): number {
  const text = (socName ?? '').toLowerCase();
  if (text.includes('8 gen 3') || text.includes('a17 pro') || text.includes('9300')) return 95;
  if (text.includes('8s gen 3') || text.includes('8300') || text.includes('8 gen 2')) return 86;
  if (text.includes('7+ gen 3') || text.includes('7200') || text.includes('1480')) return 66;
  if (text.includes('685') || text.includes('helio g99')) return 44;
  return clamp(Math.round(35 + safePrice / 320_000), 35, 96);
}

function resolveSmartphoneSpecs(item: VersusItem, safePrice: number): SmartphoneResolvedSpecs {
  const socName = item.specs.socName ?? item.specs.cpuName ?? 'Chipset Smartphone';
  const explicitSoc = normalizeScoreValue(item.specs.socScore ?? item.specs.performanceTier);
  const socScore = explicitSoc ?? inferSocScoreFromName(socName, safePrice);

  const panelType = item.specs.panelType ?? 'AMOLED';
  const refreshRateHz = Math.round(clamp(item.specs.refreshRateHz ?? 120, 60, 165));
  const explicitDisplay = normalizeScoreValue(item.specs.displayScore);
  const panelLower = panelType.toLowerCase();
  const panelBase = panelLower.includes('ltpo') ? 78 : panelLower.includes('oled') ? 70 : 56;
  const hzBonus = refreshRateHz >= 144 ? 18 : refreshRateHz >= 120 ? 15 : refreshRateHz >= 90 ? 8 : 0;
  const displayScore = explicitDisplay ?? round1(clamp(panelBase + hzBonus, 45, 98));

  const batteryMah = Math.round(clamp(item.specs.batteryMah ?? 5000, 2000, 8000));
  const chargingWatt = Math.round(clamp(item.specs.chargingWatt ?? 33, 5, 240));
  const capacityScore = clamp(40 + ((batteryMah - 3000) / 2500) * 55, 35, 100);
  const chargeScore = clamp(30 + (Math.min(chargingWatt, 120) / 120) * 70, 30, 100);
  const batteryChargingScore = round1(capacityScore * 0.55 + chargeScore * 0.45);

  const explicitCamera = normalizeScoreValue(item.specs.cameraScore);
  const cameraScore = explicitCamera ?? round1(clamp(42 + safePrice / 360_000, 42, 94));
  const cameraSummary = item.specs.cameraSummary ?? 'Kamera Utama Multi-Lensa';

  const ramGb = Math.round(clamp(item.specs.ramGb ?? 8, 4, 24));
  const storageGb = Math.round(clamp(item.specs.storageGb ?? 256, 64, 1024));

  const usedFallbackSpecs =
    explicitSoc === undefined ||
    explicitDisplay === undefined ||
    item.specs.batteryMah === undefined ||
    item.specs.chargingWatt === undefined ||
    explicitCamera === undefined;

  return {
    socName,
    socScore,
    displayScore,
    batteryChargingScore,
    cameraScore,
    batteryMah,
    chargingWatt,
    refreshRateHz,
    ramGb,
    storageGb,
    panelType,
    cameraSummary,
    usedFallbackSpecs,
  };
}

function inferPlatformLongevity(item: VersusItem, resolvedMulti: number): number {
  const haystack = `${item.name} ${item.subtitle} ${item.specs.socket ?? ''} ${item.specs.ramType ?? ''}`.toLowerCase();
  if (haystack.includes('am5') || haystack.includes('ddr5')) return 92;
  if (haystack.includes('lga1700') || haystack.includes('lga 1700')) return 78;
  if (haystack.includes('am4')) return 66;
  if (item.category === 'gpu') {
    const vram = item.specs.vramGb ?? 8;
    if (vram >= 16) return 94;
    if (vram >= 12) return 88;
    if (vram >= 8) return 78;
    return 58;
  }
  if (item.category === 'laptop') {
    return clamp(Math.round(58 + resolvedMulti * 0.35), 50, 95);
  }
  return 72;
}

export function resolveVersusSpecs(item: VersusItem): VersusResolvedSpecs {
  const safePrice = Number.isFinite(item.specs.priceIdr) && item.specs.priceIdr > 0
    ? Math.round(item.specs.priceIdr)
    : 1_000_000;

  if (item.category === 'smartphone') {
    const smartphone = resolveSmartphoneSpecs(item, safePrice);
    return {
      priceIdr: safePrice,
      tdpWatts: CATEGORY_DEFAULT_TDP.smartphone,
      gamingScore: smartphone.socScore,
      multiCoreScore: smartphone.cameraScore,
      platformLongevityScore: smartphone.displayScore,
      usedFallbackTdp: false,
      usedFallbackPerf: smartphone.usedFallbackSpecs,
      smartphone,
    };
  }

  const hasExplicitTdp = item.specs.tdpWatts !== undefined && item.specs.tdpWatts > 0;
  const safeTdp = hasExplicitTdp
    ? Math.round(item.specs.tdpWatts ?? CATEGORY_DEFAULT_TDP[item.category])
    : CATEGORY_DEFAULT_TDP[item.category];

  const baseTier = normalizeScoreValue(item.specs.performanceTier);
  const explicitGaming = normalizeScoreValue(item.specs.gamingScore);
  const explicitMulti = normalizeScoreValue(item.specs.multiCoreScore);

  const hasPerf = explicitGaming !== undefined || explicitMulti !== undefined || baseTier !== undefined;

  let fallbackBase = 62;
  if (!hasPerf) {
    if (item.category === 'cpu') {
      const cores = item.specs.cores ?? 6;
      fallbackBase = clamp(36 + cores * 4, 35, 95);
    } else if (item.category === 'gpu') {
      const vram = item.specs.vramGb ?? 8;
      fallbackBase = clamp(32 + vram * 3.5, 30, 96);
    } else if (item.category === 'laptop') {
      fallbackBase = clamp(Math.round(45 + safePrice / 900_000), 40, 90);
    } else {
      fallbackBase = clamp(Math.round(42 + safePrice / 1_100_000), 38, 92);
    }
  }

  const resolvedGaming = explicitGaming ?? baseTier ?? fallbackBase;
  let resolvedMulti = explicitMulti ?? baseTier ?? fallbackBase;

  if (explicitMulti === undefined && item.specs.cores !== undefined && item.specs.cores >= 12) {
    resolvedMulti = round1(clamp(Math.max(resolvedMulti, resolvedGaming + 6), 15, 100));
  }

  const longevity = inferPlatformLongevity(item, resolvedMulti);

  return {
    priceIdr: safePrice,
    tdpWatts: Math.max(15, safeTdp),
    gamingScore: resolvedGaming,
    multiCoreScore: resolvedMulti,
    platformLongevityScore: longevity,
    usedFallbackTdp: !hasExplicitTdp,
    usedFallbackPerf: !hasPerf,
    smartphone: null,
  };
}

export function computeVersusSubScores(item: VersusItem, profile: VersusProfile): VersusSubScores {
  const resolved = resolveVersusSpecs(item);

  if (item.category === 'smartphone' && resolved.smartphone !== null) {
    const sp = resolved.smartphone;
    const priceInMillions = Math.max(0.5, resolved.priceIdr / 1_000_000);
    const perfPerMillionIdr = round1(sp.socScore / priceInMillions);
    const priceRef = CATEGORY_PRICE_NORM_REF.smartphone;
    const priceToPerformance = round1(clamp((100 * perfPerMillionIdr) / (perfPerMillionIdr + priceRef), 5, 100));

    const sw = SMARTPHONE_WEIGHT_PROFILES[profile].weights;
    const compositeScore = round1(
      sp.socScore * sw.soc +
        sp.displayScore * sw.display +
        sp.batteryChargingScore * sw.batteryCharging +
        sp.cameraScore * sw.camera +
        priceToPerformance * sw.priceToPerf,
    );

    return {
      rawPerformance: sp.socScore,
      priceToPerformance,
      powerEfficiency: sp.batteryChargingScore,
      platformLongevity: sp.displayScore,
      compositeScore,
      perfPerMillionIdr,
      perfPerWatt: Math.round((sp.socScore / Math.max(5, resolved.tdpWatts)) * 100) / 100,
    };
  }

  const rawPerformance =
    profile === 'gaming'
      ? resolved.gamingScore
      : profile === 'productivity'
        ? resolved.multiCoreScore
        : round1((resolved.gamingScore + resolved.multiCoreScore) / 2);

  const priceInMillions = Math.max(0.5, resolved.priceIdr / 1_000_000);
  const perfPerMillionIdr = round1(rawPerformance / priceInMillions);
  const priceRef = CATEGORY_PRICE_NORM_REF[item.category];
  const priceToPerformance = round1(clamp((100 * perfPerMillionIdr) / (perfPerMillionIdr + priceRef), 5, 100));

  const perfPerWatt = rawPerformance / Math.max(15, resolved.tdpWatts);
  const wattRef = CATEGORY_WATT_NORM_REF[item.category];
  const powerEfficiency = round1(clamp((100 * perfPerWatt) / (perfPerWatt + wattRef), 5, 100));

  const platformLongevity = round1(clamp(resolved.platformLongevityScore, 5, 100));
  const w = VERSUS_WEIGHT_PROFILES[profile].weights;

  const compositeScore = round1(
    rawPerformance * w.primaryPerf +
      priceToPerformance * w.priceToPerf +
      powerEfficiency * w.powerEfficiency +
      platformLongevity * w.platformLongevity,
  );

  return {
    rawPerformance,
    priceToPerformance,
    powerEfficiency,
    platformLongevity,
    compositeScore,
    perfPerMillionIdr,
    perfPerWatt: Math.round(perfPerWatt * 100) / 100,
  };
}

function compareMetric(
  valueA: number,
  valueB: number,
  higherIsBetter: boolean,
  absScale: number | null,
): { readonly winner: VersusSide | 'tie'; readonly deltaNote: string } {
  if (Math.abs(valueA - valueB) < 0.05) {
    return { winner: 'tie', deltaNote: 'Seimbang' };
  }
  const aWins = higherIsBetter ? valueA > valueB : valueA < valueB;
  const winner: VersusSide = aWins ? 'a' : 'b';
  const hi = Math.max(valueA, valueB);
  const lo = Math.min(valueA, valueB);

  if (absScale !== null) {
    const diff = round1(hi - lo);
    return { winner, deltaNote: `${higherIsBetter ? '+' : '-'}${diff} poin` };
  }
  if (lo <= 0) {
    return { winner, deltaNote: 'Lebih unggul' };
  }
  const pctDiff = higherIsBetter
    ? Math.round(((hi / lo) - 1) * 100)
    : Math.round((1 - lo / hi) * 100);
  return {
    winner,
    deltaNote: `${higherIsBetter ? '+' : '-'}${pctDiff}%`,
  };
}

function pickBarWinner(a: number, b: number): VersusSide | 'tie' {
  if (Math.abs(a - b) < 0.5) return 'tie';
  return a > b ? 'a' : 'b';
}

function buildSmartphoneSpecRows(
  resA: VersusResolvedSpecs,
  resB: VersusResolvedSpecs,
  subA: VersusSubScores,
  subB: VersusSubScores,
  spA: SmartphoneResolvedSpecs,
  spB: SmartphoneResolvedSpecs,
): readonly VersusMetricRow[] {
  const priceCmp = compareMetric(resA.priceIdr, resB.priceIdr, false, null);
  const valueCmp = compareMetric(subA.priceToPerformance, subB.priceToPerformance, true, 100);
  const socCmp = compareMetric(spA.socScore, spB.socScore, true, 100);
  const ramCmp = compareMetric(spA.ramGb, spB.ramGb, true, null);
  const displayCmp = compareMetric(spA.displayScore, spB.displayScore, true, 100);
  const batCmp = compareMetric(spA.batteryMah, spB.batteryMah, true, null);
  const chgCmp = compareMetric(spA.chargingWatt, spB.chargingWatt, true, null);
  const camCmp = compareMetric(spA.cameraScore, spB.cameraScore, true, 100);

  return [
    {
      key: 'price',
      label: 'Harga Katalog',
      valueA: formatVersusIdr(resA.priceIdr),
      valueB: formatVersusIdr(resB.priceIdr),
      winner: priceCmp.winner,
      deltaNote: priceCmp.winner === 'tie' ? 'Sama' : `${priceCmp.deltaNote} lebih hemat`,
    },
    {
      key: 'value_idx',
      label: 'Indeks Price-to-Performance',
      valueA: `${subA.priceToPerformance.toFixed(1)} (${subA.perfPerMillionIdr.toFixed(1)} / Rp 1 jt)`,
      valueB: `${subB.priceToPerformance.toFixed(1)} (${subB.perfPerMillionIdr.toFixed(1)} / Rp 1 jt)`,
      winner: valueCmp.winner,
      deltaNote: valueCmp.deltaNote,
    },
    {
      key: 'soc',
      label: 'Chipset / SoC',
      valueA: `${spA.socName} (Skor ${spA.socScore.toFixed(0)}/100)`,
      valueB: `${spB.socName} (Skor ${spB.socScore.toFixed(0)}/100)`,
      winner: socCmp.winner,
      deltaNote: socCmp.winner === 'tie' ? 'Setara' : `${socCmp.deltaNote} SoC`,
    },
    {
      key: 'ram_storage',
      label: 'RAM & Penyimpanan',
      valueA: `${spA.ramGb} GB / ${spA.storageGb} GB`,
      valueB: `${spB.ramGb} GB / ${spB.storageGb} GB`,
      winner: ramCmp.winner,
      deltaNote: ramCmp.winner === 'tie' ? 'Setara' : `${ramCmp.deltaNote} RAM`,
    },
    {
      key: 'display',
      label: 'Layar & Refresh Rate',
      valueA: `${spA.panelType} · ${spA.refreshRateHz} Hz`,
      valueB: `${spB.panelType} · ${spB.refreshRateHz} Hz`,
      winner: displayCmp.winner,
      deltaNote: displayCmp.deltaNote,
    },
    {
      key: 'battery',
      label: 'Kapasitas Baterai',
      valueA: `${spA.batteryMah.toLocaleString('id-ID')} mAh`,
      valueB: `${spB.batteryMah.toLocaleString('id-ID')} mAh`,
      winner: batCmp.winner,
      deltaNote: batCmp.deltaNote,
    },
    {
      key: 'charging',
      label: 'Kecepatan Fast Charging',
      valueA: `${spA.chargingWatt} W`,
      valueB: `${spB.chargingWatt} W`,
      winner: chgCmp.winner,
      deltaNote: chgCmp.deltaNote,
    },
    {
      key: 'camera',
      label: 'Sistem Kamera',
      valueA: `${spA.cameraSummary} (${spA.cameraScore.toFixed(0)}/100)`,
      valueB: `${spB.cameraSummary} (${spB.cameraScore.toFixed(0)}/100)`,
      winner: camCmp.winner,
      deltaNote: camCmp.deltaNote,
    },
  ];
}

function buildSpecRows(
  itemA: VersusItem,
  itemB: VersusItem,
  resA: VersusResolvedSpecs,
  resB: VersusResolvedSpecs,
  subA: VersusSubScores,
  subB: VersusSubScores,
): readonly VersusMetricRow[] {
  if (itemA.category === 'smartphone' && itemB.category === 'smartphone' && resA.smartphone && resB.smartphone) {
    return buildSmartphoneSpecRows(resA, resB, subA, subB, resA.smartphone, resB.smartphone);
  }

  const rows: VersusMetricRow[] = [];

  const priceCmp = compareMetric(resA.priceIdr, resB.priceIdr, false, null);
  rows.push({
    key: 'price',
    label: 'Harga Katalog',
    valueA: formatVersusIdr(resA.priceIdr),
    valueB: formatVersusIdr(resB.priceIdr),
    winner: priceCmp.winner,
    deltaNote: priceCmp.winner === 'tie' ? 'Sama' : `${priceCmp.deltaNote} lebih hemat`,
  });

  const valueCmp = compareMetric(subA.priceToPerformance, subB.priceToPerformance, true, 100);
  rows.push({
    key: 'value_idx',
    label: 'Indeks Price-to-Performance',
    valueA: `${subA.priceToPerformance.toFixed(1)} (${subA.perfPerMillionIdr.toFixed(1)} / Rp 1 jt)`,
    valueB: `${subB.priceToPerformance.toFixed(1)} (${subB.perfPerMillionIdr.toFixed(1)} / Rp 1 jt)`,
    winner: valueCmp.winner,
    deltaNote: valueCmp.deltaNote,
  });

  if (itemA.specs.cpuName || itemB.specs.cpuName) {
    rows.push({
      key: 'cpu_name',
      label: 'Prosesor (CPU)',
      valueA: itemA.specs.cpuName ?? 'Tidak tercantum',
      valueB: itemB.specs.cpuName ?? 'Tidak tercantum',
      winner: null,
      deltaNote: '',
    });
  }

  if (itemA.specs.gpuName || itemB.specs.gpuName) {
    rows.push({
      key: 'gpu_name',
      label: 'Kartu Grafis (GPU)',
      valueA: itemA.specs.gpuName ?? 'Tidak tercantum',
      valueB: itemB.specs.gpuName ?? 'Tidak tercantum',
      winner: null,
      deltaNote: '',
    });
  }

  if (itemA.specs.cores !== undefined || itemB.specs.cores !== undefined) {
    const cA = itemA.specs.cores ?? 6;
    const cB = itemB.specs.cores ?? 6;
    const cmp = compareMetric(cA, cB, true, null);
    rows.push({
      key: 'cores',
      label: 'Konfigurasi Core / Thread',
      valueA: itemA.specs.cores !== undefined ? `${itemA.specs.cores}C / ${itemA.specs.threads ?? itemA.specs.cores * 2}T` : 'Estimasi 6C',
      valueB: itemB.specs.cores !== undefined ? `${itemB.specs.cores}C / ${itemB.specs.threads ?? itemB.specs.cores * 2}T` : 'Estimasi 6C',
      winner: cmp.winner,
      deltaNote: cmp.deltaNote,
    });
  }

  if (itemA.specs.vramGb !== undefined || itemB.specs.vramGb !== undefined) {
    const vA = itemA.specs.vramGb ?? 0;
    const vB = itemB.specs.vramGb ?? 0;
    const cmp = compareMetric(vA, vB, true, null);
    rows.push({
      key: 'vram',
      label: 'Memori Grafis (VRAM)',
      valueA: vA > 0 ? `${vA} GB` : 'Shared RAM (iGPU)',
      valueB: vB > 0 ? `${vB} GB` : 'Shared RAM (iGPU)',
      winner: cmp.winner,
      deltaNote: cmp.deltaNote,
    });
  }

  if (itemA.specs.ramGb !== undefined || itemB.specs.ramGb !== undefined) {
    const rA = itemA.specs.ramGb ?? 16;
    const rB = itemB.specs.ramGb ?? 16;
    const cmp = compareMetric(rA, rB, true, null);
    rows.push({
      key: 'ram',
      label: 'Kapasitas & Tipe RAM',
      valueA: `${rA} GB${itemA.specs.ramType ? ` ${itemA.specs.ramType}` : ''}`,
      valueB: `${rB} GB${itemB.specs.ramType ? ` ${itemB.specs.ramType}` : ''}`,
      winner: cmp.winner,
      deltaNote: cmp.deltaNote,
    });
  }

  if (itemA.specs.displaySummary || itemB.specs.displaySummary) {
    rows.push({
      key: 'display',
      label: 'Layar / Panel',
      valueA: itemA.specs.displaySummary ?? 'Standar',
      valueB: itemB.specs.displaySummary ?? 'Standar',
      winner: null,
      deltaNote: '',
    });
  }

  const gamingCmp = compareMetric(resA.gamingScore, resB.gamingScore, true, 100);
  rows.push({
    key: 'gaming_score',
    label: 'Skor Performa Gaming',
    valueA: `${resA.gamingScore.toFixed(0)} / 100`,
    valueB: `${resB.gamingScore.toFixed(0)} / 100`,
    winner: gamingCmp.winner,
    deltaNote: gamingCmp.deltaNote,
  });

  const multiCmp = compareMetric(resA.multiCoreScore, resB.multiCoreScore, true, 100);
  rows.push({
    key: 'multi_score',
    label: 'Skor Multi-Core & Render',
    valueA: `${resA.multiCoreScore.toFixed(0)} / 100`,
    valueB: `${resB.multiCoreScore.toFixed(0)} / 100`,
    winner: multiCmp.winner,
    deltaNote: multiCmp.deltaNote,
  });

  const tdpCmp = compareMetric(resA.tdpWatts, resB.tdpWatts, false, null);
  rows.push({
    key: 'tdp',
    label: 'Konsumsi Daya (TDP)',
    valueA: `${resA.tdpWatts} W${resA.usedFallbackTdp ? ' (estimasi)' : ''}`,
    valueB: `${resB.tdpWatts} W${resB.usedFallbackTdp ? ' (estimasi)' : ''}`,
    winner: tdpCmp.winner,
    deltaNote: tdpCmp.winner === 'tie' ? 'Sama' : `${tdpCmp.deltaNote} lebih irit`,
  });

  return rows;
}

export function evaluateVersus(
  itemA: VersusItem,
  itemB: VersusItem,
  profile: VersusProfile,
): VersusComparisonResult {
  const resolvedA = resolveVersusSpecs(itemA);
  const resolvedB = resolveVersusSpecs(itemB);
  const subScoresA = computeVersusSubScores(itemA, profile);
  const subScoresB = computeVersusSubScores(itemB, profile);

  const isSmartphonePair =
    itemA.category === 'smartphone' &&
    itemB.category === 'smartphone' &&
    resolvedA.smartphone !== null &&
    resolvedB.smartphone !== null;

  let subScoreBars: VersusSubScoreBar[];
  if (isSmartphonePair && resolvedA.smartphone && resolvedB.smartphone) {
    const spA = resolvedA.smartphone;
    const spB = resolvedB.smartphone;
    const sw = SMARTPHONE_WEIGHT_PROFILES[profile].weights;

    subScoreBars = [
      {
        key: 'soc',
        label: 'Performa Chipset (SoC)',
        weightPct: Math.round(sw.soc * 100),
        scoreA: spA.socScore,
        scoreB: spB.socScore,
        winner: pickBarWinner(spA.socScore, spB.socScore),
      },
      {
        key: 'display',
        label: 'Layar & Refresh Rate',
        weightPct: Math.round(sw.display * 100),
        scoreA: spA.displayScore,
        scoreB: spB.displayScore,
        winner: pickBarWinner(spA.displayScore, spB.displayScore),
      },
      {
        key: 'batteryCharging',
        label: 'Baterai & Fast Charging',
        weightPct: Math.round(sw.batteryCharging * 100),
        scoreA: spA.batteryChargingScore,
        scoreB: spB.batteryChargingScore,
        winner: pickBarWinner(spA.batteryChargingScore, spB.batteryChargingScore),
      },
      {
        key: 'camera',
        label: 'Kamera',
        weightPct: Math.round(sw.camera * 100),
        scoreA: spA.cameraScore,
        scoreB: spB.cameraScore,
        winner: pickBarWinner(spA.cameraScore, spB.cameraScore),
      },
      {
        key: 'priceToPerformance',
        label: 'Indeks Price-to-Performance',
        weightPct: Math.round(sw.priceToPerf * 100),
        scoreA: subScoresA.priceToPerformance,
        scoreB: subScoresB.priceToPerformance,
        winner: pickBarWinner(subScoresA.priceToPerformance, subScoresB.priceToPerformance),
      },
    ];
  } else {
    const weights = VERSUS_WEIGHT_PROFILES[profile].weights;
    subScoreBars = [
      {
        key: 'rawPerformance',
        label: profile === 'productivity' ? 'Performa Multi-Core / VRAM' : 'Performa Utama',
        weightPct: Math.round(weights.primaryPerf * 100),
        scoreA: subScoresA.rawPerformance,
        scoreB: subScoresB.rawPerformance,
        winner: pickBarWinner(subScoresA.rawPerformance, subScoresB.rawPerformance),
      },
      {
        key: 'priceToPerformance',
        label: 'Indeks Price-to-Performance',
        weightPct: Math.round(weights.priceToPerf * 100),
        scoreA: subScoresA.priceToPerformance,
        scoreB: subScoresB.priceToPerformance,
        winner: pickBarWinner(subScoresA.priceToPerformance, subScoresB.priceToPerformance),
      },
      {
        key: 'powerEfficiency',
        label: 'Efisiensi Termal & Daya',
        weightPct: Math.round(weights.powerEfficiency * 100),
        scoreA: subScoresA.powerEfficiency,
        scoreB: subScoresB.powerEfficiency,
        winner: pickBarWinner(subScoresA.powerEfficiency, subScoresB.powerEfficiency),
      },
      {
        key: 'platformLongevity',
        label: 'Masa Pakai & Platform',
        weightPct: Math.round(weights.platformLongevity * 100),
        scoreA: subScoresA.platformLongevity,
        scoreB: subScoresB.platformLongevity,
        winner: pickBarWinner(subScoresA.platformLongevity, subScoresB.platformLongevity),
      },
    ];
  }

  const marginPts = round1(Math.abs(subScoresA.compositeScore - subScoresB.compositeScore));
  const marginTier: VersusMarginTier = marginPts >= 10 ? 'dominant' : marginPts >= 3 ? 'narrow' : 'tie';
  const marginLabel =
    marginTier === 'dominant'
      ? 'Unggul Telak'
      : marginTier === 'narrow'
        ? 'Menang Tipis'
        : 'Seimbang / Seri';

  let winnerSide: VersusSide = 'a';
  if (Math.abs(subScoresA.compositeScore - subScoresB.compositeScore) >= 0.05) {
    winnerSide = subScoresA.compositeScore > subScoresB.compositeScore ? 'a' : 'b';
  } else if (subScoresA.priceToPerformance !== subScoresB.priceToPerformance) {
    winnerSide = subScoresA.priceToPerformance > subScoresB.priceToPerformance ? 'a' : 'b';
  } else {
    winnerSide = resolvedA.priceIdr <= resolvedB.priceIdr ? 'a' : 'b';
  }

  const winnerItem = winnerSide === 'a' ? itemA : itemB;
  const loserItem = winnerSide === 'a' ? itemB : itemA;
  const winnerSub = winnerSide === 'a' ? subScoresA : subScoresB;
  const loserSub = winnerSide === 'a' ? subScoresB : subScoresA;
  const winnerRes = winnerSide === 'a' ? resolvedA : resolvedB;
  const loserRes = winnerSide === 'a' ? resolvedB : resolvedA;
  const scenarioInfo = getVersusScenarioDisplay(
    isSmartphonePair ? 'smartphone' : itemA.category,
    profile,
  );
  const priceDelta = winnerRes.priceIdr - loserRes.priceIdr;

  let bullet1: string;
  let bullet2: string;
  let bullet3: string;

  if (isSmartphonePair && winnerRes.smartphone && loserRes.smartphone) {
    const wPhone = winnerRes.smartphone;
    const lPhone = loserRes.smartphone;

    bullet1 =
      marginTier === 'tie'
        ? `Skor ${scenarioInfo.label} sangat berimbang (${winnerSub.compositeScore.toFixed(1)} vs ${loserSub.compositeScore.toFixed(1)}, selisih ${marginPts.toFixed(1)} poin); ${profile === 'productivity' ? 'kualitas kamera dan layar' : 'performa harian'} keduanya bersaing ketat.`
        : `${winnerItem.name} lebih tepat untuk ${scenarioInfo.label} dengan skor ${winnerSub.compositeScore.toFixed(1)} vs ${loserSub.compositeScore.toFixed(1)} (+${marginPts.toFixed(1)} poin), didukung ${wPhone.socName} dan panel ${wPhone.panelType} ${wPhone.refreshRateHz} Hz.`;

    bullet2 =
      priceDelta === 0
        ? `Keduanya ditawarkan di harga setara ${formatVersusIdr(winnerRes.priceIdr)} dengan indeks Price-to-Performance ${winnerSub.priceToPerformance.toFixed(1)} vs ${loserSub.priceToPerformance.toFixed(1)}.`
        : priceDelta < 0
          ? `Lebih hemat ${formatVersusIdr(Math.abs(priceDelta))} daripada ${loserItem.name}, dengan rasio value ${winnerSub.priceToPerformance.toFixed(1)} vs ${loserSub.priceToPerformance.toFixed(1)}.`
          : `Selisih harga ${formatVersusIdr(priceDelta)} lebih tinggi dibanding ${loserItem.name}, terkompensasi oleh ${wPhone.cameraScore >= lPhone.cameraScore ? `skor kamera ${wPhone.cameraScore.toFixed(0)}/100` : `performa chipset ${wPhone.socScore.toFixed(0)}/100`}.`;

    const batDiff = wPhone.batteryMah - lPhone.batteryMah;
    const chgDiff = wPhone.chargingWatt - lPhone.chargingWatt;
    const chargePhrase =
      chgDiff > 0
        ? `fast charging ${chgDiff} W lebih kencang (${wPhone.chargingWatt} W vs ${lPhone.chargingWatt} W)`
        : chgDiff < 0
          ? `fast charging ${wPhone.chargingWatt} W (kompetitor ${lPhone.chargingWatt} W)`
          : `fast charging setara ${wPhone.chargingWatt} W`;
    const batPhrase =
      batDiff > 0
        ? `baterai ${batDiff.toLocaleString('id-ID')} mAh lebih besar (${wPhone.batteryMah.toLocaleString('id-ID')} mAh vs ${lPhone.batteryMah.toLocaleString('id-ID')} mAh)`
        : `baterai ${wPhone.batteryMah.toLocaleString('id-ID')} mAh (kompetitor ${lPhone.batteryMah.toLocaleString('id-ID')} mAh)`;

    bullet3 = `Daya tahan dan pengisian: ${batPhrase} serta ${chargePhrase}.`;
  } else {
    bullet1 =
      marginTier === 'tie'
        ? `Skor komposit ${scenarioInfo.label} nyaris identik (${winnerSub.compositeScore.toFixed(1)} vs ${loserSub.compositeScore.toFixed(1)}, selisih ${marginPts.toFixed(1)} poin), sehingga pilihan dapat disesuaikan dengan anggaran.`
        : `${winnerItem.name} memimpin di skenario ${scenarioInfo.label} dengan skor komposit ${winnerSub.compositeScore.toFixed(1)} berbanding ${loserSub.compositeScore.toFixed(1)} (+${marginPts.toFixed(1)} poin).`;

    bullet2 =
      priceDelta === 0
        ? `Keduanya dibanderol pada harga identik ${formatVersusIdr(winnerRes.priceIdr)}, dengan indeks value ${winnerSub.priceToPerformance.toFixed(1)} vs ${loserSub.priceToPerformance.toFixed(1)}.`
        : priceDelta < 0
          ? `${winnerItem.name} lebih hemat ${formatVersusIdr(Math.abs(priceDelta))} sekaligus mencatat efisiensi biaya ${winnerSub.priceToPerformance.toFixed(1)} poin (vs ${loserSub.priceToPerformance.toFixed(1)}).`
          : `${winnerItem.name} lebih mahal ${formatVersusIdr(priceDelta)}, namun terbayar oleh performa utama ${winnerSub.rawPerformance.toFixed(0)}/100 pada profil ${scenarioInfo.label}.`;

    const wattDelta = winnerRes.tdpWatts - loserRes.tdpWatts;
    bullet3 =
      wattDelta === 0
        ? `Konsumsi daya setara di ${winnerRes.tdpWatts} W dengan skor efisiensi termal ${winnerSub.powerEfficiency.toFixed(1)} vs ${loserSub.powerEfficiency.toFixed(1)}.`
        : wattDelta < 0
          ? `Lebih hemat daya ${Math.abs(wattDelta)} W (${winnerRes.tdpWatts} W vs ${loserRes.tdpWatts} W) untuk operasional harian yang lebih dingin.`
          : `Memerlukan TDP ${wattDelta} W lebih tinggi (${winnerRes.tdpWatts} W vs ${loserRes.tdpWatts} W); pastikan kapasitas PSU memadai.`;
  }

  const headline =
    marginTier === 'tie'
      ? `Kedua opsi berada dalam margin seimbang untuk kebutuhan ${scenarioInfo.label}.`
      : `${winnerItem.name} menjadi pilihan utama untuk skenario ${scenarioInfo.label}.`;

  return {
    profile,
    resolvedA,
    resolvedB,
    subScoresA,
    subScoresB,
    subScoreBars,
    specRows: buildSpecRows(itemA, itemB, resolvedA, resolvedB, subScoresA, subScoresB),
    verdict: {
      winnerSide,
      marginPts,
      marginTier,
      marginLabel,
      headline,
      bullets: [bullet1, bullet2, bullet3],
    },
  };
}

export const CURATED_VERSUS_CATALOG: Readonly<Record<VersusCategory, readonly VersusItem[]>> = {
  build: [
    {
      id: 'curated-build-b2c-creator',
      name: 'B2C Creator & Gaming Rig 1440p',
      brand: 'ViciTech',
      category: 'build',
      conditionLabel: 'Baru (100%)',
      source: 'curated_sample',
      subtitle: 'Ryzen 7 7800X3D · RTX 4070 Super 12GB · 32GB DDR5',
      marketSlug: 'preset-workstation-creator-1440p',
      builderPartHint: { cpu: 'r7-7800x3d', gpu: 'rtx-4070s', ram: 'd5-32', psu: 'psu-750' },
      specs: {
        performanceTier: 88,
        gamingScore: 94,
        multiCoreScore: 78,
        priceIdr: 29_550_000,
        tdpWatts: 340,
        cores: 8,
        threads: 16,
        vramGb: 12,
        ramGb: 32,
        ramType: 'DDR5-6000',
        socket: 'AM5',
        cpuName: 'AMD Ryzen 7 7800X3D',
        gpuName: 'NVIDIA RTX 4070 Super 12GB',
      },
    },
    {
      id: 'curated-build-esports',
      name: 'Esports 1080p High-FPS Rig',
      brand: 'ViciTech',
      category: 'build',
      conditionLabel: 'Baru (100%)',
      source: 'curated_sample',
      subtitle: 'Ryzen 5 7600 · RTX 4060 8GB · 16GB DDR5',
      marketSlug: null,
      builderPartHint: { cpu: 'r5-7600', gpu: 'rtx-4060', ram: 'd5-16', psu: 'psu-550' },
      specs: {
        performanceTier: 69,
        gamingScore: 76,
        multiCoreScore: 60,
        priceIdr: 12_900_000,
        tdpWatts: 185,
        cores: 6,
        threads: 12,
        vramGb: 8,
        ramGb: 16,
        ramType: 'DDR5-6000',
        socket: 'AM5',
        cpuName: 'AMD Ryzen 5 7600',
        gpuName: 'NVIDIA RTX 4060 8GB',
      },
    },
    {
      id: 'curated-build-render-4k',
      name: '4K Render & AI Workstation',
      brand: 'ViciTech',
      category: 'build',
      conditionLabel: 'Baru (100%)',
      source: 'curated_sample',
      subtitle: 'Ryzen 9 7950X · RTX 4070 Super 12GB · 64GB DDR5',
      marketSlug: null,
      builderPartHint: { cpu: 'r9-7950x', gpu: 'rtx-4070s', ram: 'd5-64', psu: 'psu-750' },
      specs: {
        performanceTier: 93,
        gamingScore: 86,
        multiCoreScore: 98,
        priceIdr: 41_000_000,
        tdpWatts: 410,
        cores: 16,
        threads: 32,
        vramGb: 12,
        ramGb: 64,
        ramType: 'DDR5-6000',
        socket: 'AM5',
        cpuName: 'AMD Ryzen 9 7950X',
        gpuName: 'NVIDIA RTX 4070 Super 12GB',
      },
    },
    {
      id: 'curated-build-b2b-office',
      name: 'B2B Enterprise Office Workstation',
      brand: 'ViciTech',
      category: 'build',
      conditionLabel: 'Baru (100%)',
      source: 'curated_sample',
      subtitle: 'Core i5-12400 · UHD 730 · 16GB DDR4',
      marketSlug: null,
      builderPartHint: { cpu: 'i5-12400', gpu: 'igpu', ram: 'd4-16', psu: 'psu-350' },
      specs: {
        performanceTier: 48,
        gamingScore: 40,
        multiCoreScore: 54,
        priceIdr: 9_850_000,
        tdpWatts: 95,
        cores: 6,
        threads: 12,
        vramGb: 0,
        ramGb: 16,
        ramType: 'DDR4-3200',
        socket: 'LGA1700',
        cpuName: 'Intel Core i5-12400',
        gpuName: 'Intel UHD Graphics 730',
      },
    },
    {
      id: 'curated-build-b2s-cbt',
      name: 'B2S CBT Labkom Standard',
      brand: 'ViciTech',
      category: 'build',
      conditionLabel: 'Baru (100%)',
      source: 'curated_sample',
      subtitle: 'Core i3-12100 · UHD 730 · 8GB DDR4',
      marketSlug: null,
      builderPartHint: { cpu: 'i3-12100', gpu: 'igpu', ram: 'd4-8', psu: 'psu-350' },
      specs: {
        performanceTier: 36,
        gamingScore: 30,
        multiCoreScore: 39,
        priceIdr: 5_600_000,
        tdpWatts: 78,
        cores: 4,
        threads: 8,
        vramGb: 0,
        ramGb: 8,
        ramType: 'DDR4-3200',
        socket: 'LGA1700',
        cpuName: 'Intel Core i3-12100',
        gpuName: 'Intel UHD Graphics 730',
      },
    },
  ],
  cpu: [
    {
      id: 'curated-cpu-7800x3d',
      name: 'AMD Ryzen 7 7800X3D',
      brand: 'AMD',
      category: 'cpu',
      conditionLabel: 'Baru (100%)',
      source: 'curated_sample',
      subtitle: '8C / 16T · AM5 · 3D V-Cache',
      marketSlug: null,
      builderPartHint: { cpu: 'r7-7800x3d' },
      specs: { performanceTier: 88, gamingScore: 96, multiCoreScore: 70, priceIdr: 7_200_000, tdpWatts: 120, cores: 8, threads: 16, socket: 'AM5', ramType: 'DDR5' },
    },
    {
      id: 'curated-cpu-13700k',
      name: 'Intel Core i7-13700K',
      brand: 'Intel',
      category: 'cpu',
      conditionLabel: 'Baru (100%)',
      source: 'curated_sample',
      subtitle: '16C / 24T · LGA1700 · DDR4/DDR5',
      marketSlug: null,
      builderPartHint: { cpu: 'i5-13600k' },
      specs: { performanceTier: 86, gamingScore: 88, multiCoreScore: 85, priceIdr: 6_500_000, tdpWatts: 253, cores: 16, threads: 24, socket: 'LGA1700', ramType: 'DDR5' },
    },
    {
      id: 'curated-cpu-7950x',
      name: 'AMD Ryzen 9 7950X',
      brand: 'AMD',
      category: 'cpu',
      conditionLabel: 'Baru (100%)',
      source: 'curated_sample',
      subtitle: '16C / 32T · AM5 · Workstation Flagship',
      marketSlug: null,
      builderPartHint: { cpu: 'r9-7950x' },
      specs: { performanceTier: 96, gamingScore: 92, multiCoreScore: 100, priceIdr: 8_200_000, tdpWatts: 170, cores: 16, threads: 32, socket: 'AM5', ramType: 'DDR5' },
    },
    {
      id: 'curated-cpu-7600',
      name: 'AMD Ryzen 5 7600',
      brand: 'AMD',
      category: 'cpu',
      conditionLabel: 'Baru (100%)',
      source: 'curated_sample',
      subtitle: '6C / 12T · AM5 · Efisiensi 65W',
      marketSlug: null,
      builderPartHint: { cpu: 'r5-7600' },
      specs: { performanceTier: 69, gamingScore: 76, multiCoreScore: 58, priceIdr: 3_900_000, tdpWatts: 65, cores: 6, threads: 12, socket: 'AM5', ramType: 'DDR5' },
    },
    {
      id: 'curated-cpu-12400f',
      name: 'Intel Core i5-12400F',
      brand: 'Intel',
      category: 'cpu',
      conditionLabel: 'Baru (100%)',
      source: 'curated_sample',
      subtitle: '6C / 12T · LGA1700 · Mainstream Value',
      marketSlug: null,
      builderPartHint: { cpu: 'i5-12400' },
      specs: { performanceTier: 58, gamingScore: 62, multiCoreScore: 52, priceIdr: 2_300_000, tdpWatts: 65, cores: 6, threads: 12, socket: 'LGA1700', ramType: 'DDR4' },
    },
    {
      id: 'curated-cpu-5600',
      name: 'AMD Ryzen 5 5600',
      brand: 'AMD',
      category: 'cpu',
      conditionLabel: 'Baru (100%)',
      source: 'curated_sample',
      subtitle: '6C / 12T · AM4 · Hemat Platform',
      marketSlug: null,
      builderPartHint: null,
      specs: { performanceTier: 58, gamingScore: 63, multiCoreScore: 51, priceIdr: 2_200_000, tdpWatts: 65, cores: 6, threads: 12, socket: 'AM4', ramType: 'DDR4' },
    },
  ],
  gpu: [
    {
      id: 'curated-gpu-4070s',
      name: 'NVIDIA RTX 4070 Super 12GB',
      brand: 'NVIDIA',
      category: 'gpu',
      conditionLabel: 'Baru (100%)',
      source: 'curated_sample',
      subtitle: '12 GB GDDR6X · 220 W TBP · 1440p Ultra',
      marketSlug: null,
      builderPartHint: { gpu: 'rtx-4070s' },
      specs: { performanceTier: 76, gamingScore: 76, multiCoreScore: 78, priceIdr: 10_900_000, tdpWatts: 220, vramGb: 12 },
    },
    {
      id: 'curated-gpu-7800xt',
      name: 'AMD Radeon RX 7800 XT 16GB',
      brand: 'AMD',
      category: 'gpu',
      conditionLabel: 'Baru (100%)',
      source: 'curated_sample',
      subtitle: '16 GB GDDR6 · 263 W TBP · Raster & VRAM Besar',
      marketSlug: null,
      builderPartHint: null,
      specs: { performanceTier: 78, gamingScore: 78, multiCoreScore: 74, priceIdr: 8_700_000, tdpWatts: 263, vramGb: 16 },
    },
    {
      id: 'curated-gpu-4060',
      name: 'NVIDIA RTX 4060 8GB',
      brand: 'NVIDIA',
      category: 'gpu',
      conditionLabel: 'Baru (100%)',
      source: 'curated_sample',
      subtitle: '8 GB GDDR6 · 115 W TBP · 1080p Efisien',
      marketSlug: null,
      builderPartHint: { gpu: 'rtx-4060' },
      specs: { performanceTier: 52, gamingScore: 52, multiCoreScore: 50, priceIdr: 4_800_000, tdpWatts: 115, vramGb: 8 },
    },
    {
      id: 'curated-gpu-3060',
      name: 'NVIDIA RTX 3060 12GB',
      brand: 'NVIDIA',
      category: 'gpu',
      conditionLabel: 'Baru / Refurbished QC',
      source: 'curated_sample',
      subtitle: '12 GB GDDR6 · 170 W TBP · VRAM Lega untuk Render',
      marketSlug: null,
      builderPartHint: null,
      specs: { performanceTier: 44, gamingScore: 44, multiCoreScore: 48, priceIdr: 3_600_000, tdpWatts: 170, vramGb: 12 },
    },
    {
      id: 'curated-gpu-rx6600',
      name: 'AMD Radeon RX 6600 8GB',
      brand: 'AMD',
      category: 'gpu',
      conditionLabel: 'Baru (100%)',
      source: 'curated_sample',
      subtitle: '8 GB GDDR6 · 132 W TBP · Entry Value 1080p',
      marketSlug: null,
      builderPartHint: null,
      specs: { performanceTier: 40, gamingScore: 40, multiCoreScore: 38, priceIdr: 3_000_000, tdpWatts: 132, vramGb: 8 },
    },
    {
      id: 'curated-gpu-4090',
      name: 'NVIDIA RTX 4090 24GB',
      brand: 'NVIDIA',
      category: 'gpu',
      conditionLabel: 'Baru (100%)',
      source: 'curated_sample',
      subtitle: '24 GB GDDR6X · 450 W TBP · 4K & AI Flagship',
      marketSlug: null,
      builderPartHint: { gpu: 'rtx-4090' },
      specs: { performanceTier: 100, gamingScore: 100, multiCoreScore: 100, priceIdr: 32_500_000, tdpWatts: 450, vramGb: 24 },
    },
  ],
  laptop: [
    {
      id: 'curated-laptop-t14',
      name: 'Lenovo ThinkPad T14 Gen 4',
      brand: 'Lenovo',
      category: 'laptop',
      conditionLabel: 'Recertified A+ (IoT QC)',
      source: 'curated_sample',
      subtitle: 'Ryzen 7 PRO 7840U · 16GB RAM · 1.4 kg',
      marketSlug: null,
      builderPartHint: null,
      specs: {
        performanceTier: 64,
        gamingScore: 52,
        multiCoreScore: 68,
        priceIdr: 9_800_000,
        tdpWatts: 28,
        ramGb: 16,
        ramType: 'DDR5',
        displaySummary: '14" 1920x1200 IPS 100% sRGB',
        cpuName: 'AMD Ryzen 7 PRO 7840U',
        gpuName: 'Radeon 780M iGPU',
      },
    },
    {
      id: 'curated-laptop-g14',
      name: 'ASUS ROG Zephyrus G14 OLED',
      brand: 'ASUS',
      category: 'laptop',
      conditionLabel: 'Baru (100%)',
      source: 'curated_sample',
      subtitle: 'Ryzen 9 8945HS · RTX 4070 8GB · 1.5 kg',
      marketSlug: null,
      builderPartHint: null,
      specs: {
        performanceTier: 84,
        gamingScore: 86,
        multiCoreScore: 84,
        priceIdr: 33_500_000,
        tdpWatts: 95,
        vramGb: 8,
        ramGb: 32,
        ramType: 'DDR5',
        displaySummary: '14" 2880x1800 OLED 120Hz',
        cpuName: 'AMD Ryzen 9 8945HS',
        gpuName: 'RTX 4070 Laptop 8GB',
      },
    },
    {
      id: 'curated-laptop-legion5',
      name: 'Lenovo Legion Pro 5',
      brand: 'Lenovo',
      category: 'laptop',
      conditionLabel: 'Baru (100%)',
      source: 'curated_sample',
      subtitle: 'Core i7-14700HX · RTX 4060 8GB · 2.5 kg',
      marketSlug: null,
      builderPartHint: null,
      specs: {
        performanceTier: 80,
        gamingScore: 79,
        multiCoreScore: 84,
        priceIdr: 29_900_000,
        tdpWatts: 130,
        vramGb: 8,
        ramGb: 16,
        ramType: 'DDR5',
        displaySummary: '16" 2560x1600 IPS 165Hz',
        cpuName: 'Intel Core i7-14700HX',
        gpuName: 'RTX 4060 Laptop 8GB',
      },
    },
    {
      id: 'curated-laptop-elite840',
      name: 'HP EliteBook 840 G9',
      brand: 'HP',
      category: 'laptop',
      conditionLabel: 'Recertified A+ (IoT QC)',
      source: 'curated_sample',
      subtitle: 'Core i5-1245U · 16GB RAM · 1.4 kg',
      marketSlug: null,
      builderPartHint: null,
      specs: {
        performanceTier: 52,
        gamingScore: 38,
        multiCoreScore: 54,
        priceIdr: 8_200_000,
        tdpWatts: 28,
        ramGb: 16,
        ramType: 'DDR5',
        displaySummary: '14" 1920x1200 IPS 100% sRGB',
        cpuName: 'Intel Core i5-1245U',
        gpuName: 'Intel Iris Xe Graphics',
      },
    },
  ],
  smartphone: [
    {
      id: 'curated-phone-poco-f6',
      name: 'POCO F6 12/512 GB',
      brand: 'POCO',
      category: 'smartphone',
      conditionLabel: 'Baru · Garansi Resmi',
      source: 'curated_sample',
      subtitle: 'Snapdragon 8s Gen 3 · AMOLED 120Hz · 5000 mAh / 90W',
      marketSlug: null,
      builderPartHint: null,
      specs: {
        priceIdr: 5_699_000,
        socName: 'Snapdragon 8s Gen 3 (4nm)',
        socScore: 87,
        ramGb: 12,
        storageGb: 512,
        panelType: 'Flow AMOLED 1.5K',
        refreshRateHz: 120,
        displayScore: 86,
        batteryMah: 5000,
        chargingWatt: 90,
        cameraScore: 76,
        cameraSummary: '50 MP OIS (IMX882) + 8 MP Ultrawide',
      },
    },
    {
      id: 'curated-phone-a55',
      name: 'Samsung Galaxy A55 5G 8/256 GB',
      brand: 'Samsung',
      category: 'smartphone',
      conditionLabel: 'Baru · Garansi Resmi',
      source: 'curated_sample',
      subtitle: 'Exynos 1480 · Super AMOLED 120Hz · 5000 mAh / 25W',
      marketSlug: null,
      builderPartHint: null,
      specs: {
        priceIdr: 6_299_000,
        socName: 'Exynos 1480 (4nm)',
        socScore: 63,
        ramGb: 8,
        storageGb: 256,
        panelType: 'Super AMOLED',
        refreshRateHz: 120,
        displayScore: 84,
        batteryMah: 5000,
        chargingWatt: 25,
        cameraScore: 82,
        cameraSummary: '50 MP OIS + 12 MP Ultrawide + 5 MP Macro',
      },
    },
    {
      id: 'curated-phone-poco-x6pro',
      name: 'POCO X6 Pro 5G 12/512 GB',
      brand: 'POCO',
      category: 'smartphone',
      conditionLabel: 'Baru · Garansi Resmi',
      source: 'curated_sample',
      subtitle: 'Dimensity 8300-Ultra · AMOLED 120Hz · 5000 mAh / 67W',
      marketSlug: null,
      builderPartHint: null,
      specs: {
        priceIdr: 4_999_000,
        socName: 'MediaTek Dimensity 8300-Ultra',
        socScore: 84,
        ramGb: 12,
        storageGb: 512,
        panelType: 'CrystalRes AMOLED 1.5K',
        refreshRateHz: 120,
        displayScore: 85,
        batteryMah: 5000,
        chargingWatt: 67,
        cameraScore: 73,
        cameraSummary: '64 MP OIS + 8 MP Ultrawide',
      },
    },
    {
      id: 'curated-phone-rn13prop',
      name: 'Redmi Note 13 Pro+ 5G 12/512 GB',
      brand: 'Xiaomi',
      category: 'smartphone',
      conditionLabel: 'Baru · Garansi Resmi',
      source: 'curated_sample',
      subtitle: 'Dimensity 7200-Ultra · Curved AMOLED 120Hz · 5000 mAh / 120W',
      marketSlug: null,
      builderPartHint: null,
      specs: {
        priceIdr: 5_499_000,
        socName: 'MediaTek Dimensity 7200-Ultra',
        socScore: 65,
        ramGb: 12,
        storageGb: 512,
        panelType: 'Curved AMOLED 1.5K',
        refreshRateHz: 120,
        displayScore: 86,
        batteryMah: 5000,
        chargingWatt: 120,
        cameraScore: 81,
        cameraSummary: '200 MP OIS + 8 MP Ultrawide + IP68',
      },
    },
    {
      id: 'curated-phone-rn13',
      name: 'Redmi Note 13 8/256 GB',
      brand: 'Xiaomi',
      category: 'smartphone',
      conditionLabel: 'Baru · Garansi Resmi',
      source: 'curated_sample',
      subtitle: 'Snapdragon 685 · AMOLED 120Hz · 5000 mAh / 33W',
      marketSlug: null,
      builderPartHint: null,
      specs: {
        priceIdr: 2_499_000,
        socName: 'Snapdragon 685 (6nm)',
        socScore: 44,
        ramGb: 8,
        storageGb: 256,
        panelType: 'AMOLED FHD+',
        refreshRateHz: 120,
        displayScore: 76,
        batteryMah: 5000,
        chargingWatt: 33,
        cameraScore: 64,
        cameraSummary: '108 MP Utama + 8 MP Ultrawide',
      },
    },
    {
      id: 'curated-phone-14tp',
      name: 'Xiaomi 14T Pro 12/512 GB',
      brand: 'Xiaomi',
      category: 'smartphone',
      conditionLabel: 'Baru · Garansi Resmi',
      source: 'curated_sample',
      subtitle: 'Dimensity 9300+ · AMOLED 144Hz · 5000 mAh / 120W',
      marketSlug: null,
      builderPartHint: null,
      specs: {
        priceIdr: 8_999_000,
        socName: 'MediaTek Dimensity 9300+',
        socScore: 93,
        ramGb: 12,
        storageGb: 512,
        panelType: 'AI AMOLED 1.5K',
        refreshRateHz: 144,
        displayScore: 93,
        batteryMah: 5000,
        chargingWatt: 120,
        cameraScore: 90,
        cameraSummary: 'Leica 50 MP OIS + 50 MP Telephoto + 12 MP Ultrawide',
      },
    },
    {
      id: 'curated-phone-ip15p',
      name: 'iPhone 15 Pro 256 GB',
      brand: 'Apple',
      category: 'smartphone',
      conditionLabel: 'Baru · Garansi Resmi',
      source: 'curated_sample',
      subtitle: 'Apple A17 Pro · LTPO Super Retina XDR 120Hz · 3274 mAh / 27W',
      marketSlug: null,
      builderPartHint: null,
      specs: {
        priceIdr: 18_499_000,
        socName: 'Apple A17 Pro (3nm)',
        socScore: 95,
        ramGb: 8,
        storageGb: 256,
        panelType: 'LTPO Super Retina XDR OLED',
        refreshRateHz: 120,
        displayScore: 94,
        batteryMah: 3274,
        chargingWatt: 27,
        cameraScore: 94,
        cameraSummary: '48 MP OIS + 12 MP 3x Telephoto + ProRes Log',
      },
    },
    {
      id: 'curated-phone-s24u',
      name: 'Samsung Galaxy S24 Ultra 12/256 GB',
      brand: 'Samsung',
      category: 'smartphone',
      conditionLabel: 'Baru · Garansi Resmi',
      source: 'curated_sample',
      subtitle: 'Snapdragon 8 Gen 3 · LTPO Dynamic AMOLED 2X 120Hz · 5000 mAh / 45W',
      marketSlug: null,
      builderPartHint: null,
      specs: {
        priceIdr: 19_499_000,
        socName: 'Snapdragon 8 Gen 3 for Galaxy',
        socScore: 96,
        ramGb: 12,
        storageGb: 256,
        panelType: 'LTPO Dynamic AMOLED 2X',
        refreshRateHz: 120,
        displayScore: 97,
        batteryMah: 5000,
        chargingWatt: 45,
        cameraScore: 96,
        cameraSummary: '200 MP OIS + 50 MP 5x Periskop + 12 MP Ultrawide',
      },
    },
  ],
};

export function mapHardwareComponentToVersusItem(component: HardwareComponent): VersusItem | null {
  if (component.category !== 'cpu' && component.category !== 'gpu') {
    return null;
  }

  const specs = toSpecRecord(component.specs);
  const category: VersusCategory = component.category === 'cpu' ? 'cpu' : 'gpu';
  const normalizedPerf = normalizeScoreValue(component.performance_score) ?? 60;
  const cores = readNumberProp(specs, ['cores', 'coreCount']);
  const threads = readNumberProp(specs, ['threads', 'threadCount']);
  const vramGb = readNumberProp(specs, ['vramGB', 'vramGb', 'vram']);
  const tdpWatts = readNumberProp(specs, ['tdpWatts', 'boardPowerWatts', 'tdp']);
  const socket = readStringProp(specs, ['socket']) ?? component.architecture ?? undefined;
  const ramType = readStringProp(specs, ['memoryType', 'ramType']);

  const conditionLabel =
    component.condition === 'brand_new'
      ? 'Baru (100%)'
      : component.condition === 'refurbished_qc_passed'
        ? 'Refurbished Lulus IoT QC'
        : 'Bekas Terkurasi';

  const subtitleParts = [
    component.brand,
    cores !== undefined ? `${cores}C` : undefined,
    vramGb !== undefined ? `${vramGb} GB VRAM` : undefined,
    socket,
    tdpWatts !== undefined ? `${tdpWatts} W` : undefined,
  ].filter((part): part is string => Boolean(part));

  return {
    id: `hw-${component.id}`,
    name: component.name,
    brand: component.brand,
    category,
    conditionLabel,
    source: 'supabase_hardware',
    subtitle: subtitleParts.join(' · ') || 'Komponen Katalog ViciTech',
    marketSlug: null,
    builderPartHint: category === 'cpu' ? { cpu: `hardware-${component.id}` } : { gpu: `hardware-${component.id}` },
    specs: {
      performanceTier: normalizedPerf,
      gamingScore: readNumberProp(specs, ['gamingScore']) ?? normalizedPerf,
      multiCoreScore: readNumberProp(specs, ['multiCoreScore']) ?? normalizedPerf,
      priceIdr: Number(component.base_price) || 1_000_000,
      tdpWatts,
      cores,
      threads,
      vramGb,
      socket,
      ramType,
    },
  };
}

function inferMarketComponentCategory(product: ProductRow, specs: Readonly<Record<string, unknown>>): VersusCategory | null {
  if (product.category === 'pc-build') return 'build';
  if (product.category === 'laptop') return 'laptop';
  if (product.category === 'smartphone') return 'smartphone';
  if (product.category !== 'component') return null;

  const text = `${product.title} ${product.description} ${Object.keys(specs).join(' ')}`.toLowerCase();
  if (text.includes('rtx') || text.includes('radeon') || text.includes('vram') || text.includes('gpu')) {
    return 'gpu';
  }
  if (text.includes('ryzen') || text.includes('core i') || text.includes('socket') || text.includes('cpu')) {
    return 'cpu';
  }
  return null;
}

export function mapMarketProductToVersusItem(product: ProductRow): VersusItem | null {
  const specs = toSpecRecord(product.specs);
  const category = inferMarketComponentCategory(product, specs);
  if (!category) return null;

  const cpuName = readStringProp(specs, ['cpu', 'processor', 'CPU']);
  const gpuName = readStringProp(specs, ['gpu', 'vga', 'GPU']);
  const vramGb = readNumberProp(specs, ['vramGB', 'vram', 'VRAM']);
  const cores = readNumberProp(specs, ['cores', 'coreCount']);
  const ramGb = readNumberProp(specs, ['ramGB', 'ramGb', 'ram', 'RAM']);
  const ramType = readStringProp(specs, ['ramType', 'memoryType']);
  const socket = readStringProp(specs, ['socket', 'Socket']);
  const tdpWatts = readNumberProp(specs, ['tdpWatts', 'tdp', 'TDP', 'powerWatts']);
  const perfTier = normalizeScoreValue(readNumberProp(specs, ['performanceScore', 'perfScore', 'score']));
  const displaySummary = readStringProp(specs, ['display', 'screen', 'Layar']);

  const socName = readStringProp(specs, ['soc', 'SoC', 'chipset', 'Chipset', 'processor', 'cpu']);
  const socScore = normalizeScoreValue(readNumberProp(specs, ['socScore', 'chipsetScore', 'performanceScore', 'perfScore', 'score']));
  const storageGb = readNumberProp(specs, ['storageGB', 'storageGb', 'storage', 'rom', 'ROM']);
  const displayScore = normalizeScoreValue(readNumberProp(specs, ['displayScore']));
  const refreshRateHz = readNumberProp(specs, ['refreshRateHz', 'refreshRate', 'hz', 'Hz']);
  const panelType = readStringProp(specs, ['panelType', 'displayType', 'display', 'screen', 'Layar']);
  const batteryMah = readNumberProp(specs, ['batteryMah', 'batteryMAh', 'battery', 'Baterai']);
  const chargingWatt = readNumberProp(specs, ['chargingWatt', 'chargingWatts', 'fastChargingW', 'charging']);
  const cameraScore = normalizeScoreValue(readNumberProp(specs, ['cameraScore']));
  const cameraSummary = readStringProp(specs, ['camera', 'cameraSummary', 'Kamera']);

  const subtitleTokens =
    category === 'smartphone'
      ? [
          socName,
          ramGb !== undefined ? `${ramGb}GB RAM` : undefined,
          batteryMah !== undefined ? `${batteryMah} mAh` : undefined,
          chargingWatt !== undefined ? `${chargingWatt}W` : undefined,
        ].filter((token): token is string => Boolean(token))
      : [cpuName, gpuName, ramGb !== undefined ? `${ramGb} GB RAM` : undefined, socket].filter(
          (token): token is string => Boolean(token),
        );

  return {
    id: `mkt-${product.id}`,
    name: product.title,
    brand: product.seller_type === 'vicitech' ? 'ViciTech' : 'Mitra Terverifikasi',
    category,
    conditionLabel: product.stock_status === 'ready' ? 'Ready Stock Market' : product.stock_status === 'preorder' ? 'Pre-Order Market' : 'Habis',
    source: 'supabase_market',
    subtitle: subtitleTokens.join(' · ') || 'Produk Katalog Market ViciTech',
    marketSlug: product.slug || product.id,
    builderPartHint: null,
    specs: {
      performanceTier: perfTier,
      gamingScore: perfTier,
      multiCoreScore: perfTier,
      priceIdr: Number(product.price) || 1_000_000,
      tdpWatts,
      cores,
      vramGb,
      ramGb,
      ramType,
      socket,
      displaySummary,
      cpuName,
      gpuName,
      socName,
      socScore,
      storageGb,
      displayScore,
      refreshRateHz,
      panelType,
      batteryMah,
      chargingWatt,
      cameraScore,
      cameraSummary,
    },
  };
}

export function mergeVersusCatalog(
  hardwareComponents: readonly HardwareComponent[],
  marketProducts: readonly ProductRow[],
): Readonly<Record<VersusCategory, readonly VersusItem[]>> {
  const buckets: Record<VersusCategory, VersusItem[]> = {
    build: [],
    cpu: [],
    gpu: [],
    laptop: [],
    smartphone: [],
  };
  const seenNames: Record<VersusCategory, Set<string>> = {
    build: new Set(),
    cpu: new Set(),
    gpu: new Set(),
    laptop: new Set(),
    smartphone: new Set(),
  };

  const pushUnique = (item: VersusItem | null) => {
    if (!item) return;
    const key = item.name.trim().toLowerCase();
    if (!key || seenNames[item.category].has(key)) return;
    seenNames[item.category].add(key);
    buckets[item.category].push(item);
  };

  for (const product of marketProducts) {
    pushUnique(mapMarketProductToVersusItem(product));
  }
  for (const component of hardwareComponents) {
    pushUnique(mapHardwareComponentToVersusItem(component));
  }
  for (const category of VERSUS_CATEGORIES) {
    for (const curated of CURATED_VERSUS_CATALOG[category]) {
      pushUnique(curated);
    }
  }

  return buckets;
}
