import {
  formatIdr,
  parsePresetComponents,
  parseProductSpecs,
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_LABELS,
  resolveProductImages,
  SELLER_TYPE_LABELS,
  STOCK_STATUS_LABELS,
} from '@/lib/admin/products-validation';
import type {
  PresetComponentEntry,
  ProductCategory,
  ProductRow,
  ProductStockStatus,
} from '@/lib/admin/products-validation';

export {
  formatIdr,
  parsePresetComponents,
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_LABELS,
  SELLER_TYPE_LABELS,
  STOCK_STATUS_LABELS,
};

export type { PresetComponentEntry, ProductCategory, ProductRow, ProductStockStatus };

export interface MarketSpecItem {
  readonly id: string;
  readonly key: string;
  readonly label: string;
  readonly value: string;
}

export type MarketBadgeTone = 'live' | 'simulated' | 'sample' | 'neutral';

export interface MarketTrustBadge {
  readonly label: string;
  readonly tone: MarketBadgeTone;
  readonly hasVerifiedQc: boolean;
}

export function getTrustBadgeClassName(tone: MarketBadgeTone): string {
  switch (tone) {
    case 'live':
      return 'vt-badge-live';
    case 'simulated':
      return 'vt-badge-simulated';
    case 'sample':
      return 'vt-badge-sample';
    case 'neutral':
      return 'inline-flex items-center gap-1.5 rounded-md border border-default bg-surface px-2 py-0.5 text-xs font-semibold text-primary';
  }
}

export interface MarketStockMeta {
  readonly label: string;
  readonly shortLabel: string;
  readonly badgeClass: string;
  readonly isAvailable: boolean;
}

export interface MarketCheckoutItem {
  readonly id: string;
  readonly label: string;
  readonly name: string;
  readonly spec: string;
  readonly unitPrice: number;
}

export interface MarketCheckoutPayload {
  readonly id: string;
  readonly title: string;
  readonly price: number;
  readonly type: 'direct_buy' | 'preset_builder';
  readonly specs: { readonly [key: string]: string };
  readonly items: readonly MarketCheckoutItem[];
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const SPEC_LABEL_MAP: Readonly<Record<string, string>> = {
  cpu: 'Prosesor (CPU)',
  gpu: 'Kartu Grafis (GPU)',
  ram: 'Memori (RAM)',
  storage: 'Penyimpanan',
  psu: 'Power Supply (PSU)',
  tdp_watts: 'Estimasi Daya (TDP)',
  qc_protocol: 'Protokol IoT QC',
  battery_health: 'Kesehatan Baterai',
  grade: 'Grade Kondisi',
  target_segment: 'Segmen Pengguna',
  target_fps: 'Target Performa',
  motherboard: 'Motherboard',
  display: 'Layar',
  cooling: 'Sistem Pendingin',
  case: 'Casing',
  chassis: 'Casing / Sasis',
  warranty: 'Garansi',
  weight: 'Bobot',
  chipset: 'Chipset',
  camera: 'Kamera',
  charging: 'Pengisian Daya',
  connectivity: 'Konektivitas',
  socket: 'Soket',
  form_factor: 'Form Factor',
  vram: 'Memori Video (VRAM)',
  refresh_rate: 'Refresh Rate',
};

const HIGHLIGHT_SPEC_PRIORITY: readonly string[] = [
  'cpu',
  'gpu',
  'ram',
  'storage',
  'grade',
  'battery_health',
  'tdp_watts',
  'chipset',
  'display',
  'psu',
];

const CATEGORY_SUMMARY_FALLBACKS: Readonly<Record<ProductCategory, string>> = {
  'pc-build':
    'Paket rakitan PC terkurasi lengkap dengan pengecekan stabilitas beban kerja dan dukungan Preset Builder ViciTech.',
  laptop:
    'Unit laptop teruji kesiapan baterai, termal, serta ekspansi memori dan penyimpanan oleh teknisi ViciTech.',
  smartphone:
    'Perangkat mobile tersertifikasi pengecekan layar, kesehatan baterai, pengisian daya, dan sanitasi data aman.',
  component:
    'Komponen hardware terverifikasi kompatibilitas soket, daya TDP, dan performa benchmark ViciTech.',
  accessory:
    'Aksesori dan periferal penunjang produktivitas dengan standar pengecekan kelayakan fungsi ViciTech.',
};

export function isUuid(value: string): boolean {
  return UUID_REGEX.test(value.trim());
}

export function getProductHref(product: Pick<ProductRow, 'id' | 'slug'>): string {
  const identifier = product.slug.trim() || product.id.trim();
  return `/market/${encodeURIComponent(identifier)}`;
}

export function getCategoryLabel(category: ProductRow['category']): string {
  return PRODUCT_CATEGORY_LABELS[category] ?? category;
}

export function getSellerLabel(sellerType: ProductRow['seller_type']): string {
  return SELLER_TYPE_LABELS[sellerType] ?? sellerType;
}

export function getStockMeta(status: ProductRow['stock_status']): MarketStockMeta {
  switch (status) {
    case 'ready':
      return {
        label: 'Ready Stock · Siap Kirim',
        shortLabel: STOCK_STATUS_LABELS.ready,
        badgeClass: 'vt-badge-live',
        isAvailable: true,
      };
    case 'preorder':
      return {
        label: 'Pre-Order · Perakitan Terjadwal',
        shortLabel: STOCK_STATUS_LABELS.preorder,
        badgeClass: 'vt-badge-sample',
        isAvailable: true,
      };
    case 'sold_out':
      return {
        label: 'Stok Habis',
        shortLabel: STOCK_STATUS_LABELS.sold_out,
        badgeClass:
          'inline-flex items-center gap-1 rounded-md border border-status-danger/30 bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-status-danger',
        isAvailable: false,
      };
  }
}

export function getProductValidImages(
  product: Pick<ProductRow, 'images' | 'image_url' | 'gallery_urls'>,
): readonly string[] {
  return resolveProductImages(product);
}

export function getProductPrimaryImage(
  product: Pick<ProductRow, 'images' | 'image_url' | 'gallery_urls'>,
): string | null {
  const images = getProductValidImages(product);
  return images[0] ?? null;
}

export function isOptimizedImageSrc(src: string): boolean {
  const trimmed = src.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('/')) return !trimmed.startsWith('//');
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' && parsed.hostname.toLowerCase().endsWith('.supabase.co');
  } catch {
    return false;
  }
}

const QC_SERIAL_PATTERN = /^VICI-[A-Z]{3}-\d{4}-\d{4}$/;

export function getProductTrustBadge(product: ProductRow): MarketTrustBadge {
  const entries = parseProductSpecs(product.specs);
  const specMap = new Map(
    entries.map((entry) => [entry.key.trim().toLowerCase(), entry.value.trim()]),
  );

  const telemetrySource = (specMap.get('qc_telemetry_source') ?? '').toLowerCase();
  const liveFlag = (specMap.get('live_esp32') ?? '').toLowerCase();
  const qcSerial = (specMap.get('qc_serial') ?? '').toUpperCase();

  if (
    telemetrySource === 'esp32' ||
    liveFlag === 'true' ||
    QC_SERIAL_PATTERN.test(qcSerial)
  ) {
    return { label: 'Live ESP32 QC', tone: 'live', hasVerifiedQc: true };
  }

  const gradeValue = specMap.get('grade');
  if (gradeValue) {
    return { label: gradeValue, tone: 'neutral', hasVerifiedQc: true };
  }

  const qcProtocol = specMap.get('qc_protocol');
  if (qcProtocol) {
    return { label: 'Standar QC 15-Titik', tone: 'neutral', hasVerifiedQc: true };
  }

  if (product.seller_type === 'vicitech') {
    return { label: 'Kurasi ViciTech', tone: 'neutral', hasVerifiedQc: false };
  }

  return { label: 'Mitra Terverifikasi', tone: 'neutral', hasVerifiedQc: false };
}

export function formatSpecLabel(rawKey: string): string {
  const normalized = rawKey.trim().toLowerCase();
  const known = SPEC_LABEL_MAP[normalized];
  if (known) return known;

  const words = rawKey
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return 'Spesifikasi';
  return words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export function formatSpecValue(rawKey: string, rawValue: string): string {
  const trimmed = rawValue.trim();
  const lowerKey = rawKey.trim().toLowerCase();

  if (trimmed === 'true') return 'Ya';
  if (trimmed === 'false') return 'Tidak';
  if (lowerKey === 'tdp_watts' && /^\d+(?:\.\d+)?$/.test(trimmed)) {
    return `${trimmed} W`;
  }
  return trimmed;
}

export function getFormattedProductSpecs(
  product: Pick<ProductRow, 'specs'>,
): readonly MarketSpecItem[] {
  const entries = parseProductSpecs(product.specs);
  return entries
    .map((entry) => ({
      id: entry.id,
      key: entry.key.trim(),
      label: formatSpecLabel(entry.key),
      value: formatSpecValue(entry.key, entry.value),
    }))
    .filter((item) => item.value.length > 0);
}

export function getHighlightSpecs(
  product: Pick<ProductRow, 'specs'>,
  maxItems = 4,
): readonly MarketSpecItem[] {
  const all = getFormattedProductSpecs(product);
  if (all.length === 0 || maxItems <= 0) return [];

  const picked: MarketSpecItem[] = [];
  const usedIds = new Set<string>();

  for (const priorityKey of HIGHLIGHT_SPEC_PRIORITY) {
    const match = all.find((item) => item.key.toLowerCase() === priorityKey);
    if (match && !usedIds.has(match.id)) {
      picked.push(match);
      usedIds.add(match.id);
      if (picked.length >= maxItems) return picked;
    }
  }

  for (const item of all) {
    if (!usedIds.has(item.id)) {
      picked.push(item);
      usedIds.add(item.id);
      if (picked.length >= maxItems) break;
    }
  }

  return picked;
}

export function getProductSummary(product: ProductRow): string {
  const desc = product.description.trim();
  if (!desc) {
    return CATEGORY_SUMMARY_FALLBACKS[product.category];
  }
  if (desc.length <= 180) return desc;

  const clipped = desc.slice(0, 177);
  const lastSpace = clipped.lastIndexOf(' ');
  const prefix = lastSpace > 110 ? clipped.slice(0, lastSpace) : clipped;
  return `${prefix}…`;
}

export function canOpenInPresetBuilder(
  product: Pick<ProductRow, 'category' | 'is_preset'>,
): boolean {
  return product.is_preset || product.category === 'pc-build' || product.category === 'component';
}

export function canSimulateTradeIn(product: Pick<ProductRow, 'category'>): boolean {
  return (
    product.category === 'pc-build' ||
    product.category === 'laptop' ||
    product.category === 'smartphone'
  );
}

export function rankRecommendedProducts(
  currentProduct: ProductRow,
  sameCategoryRows: readonly ProductRow[],
  fallbackRows: readonly ProductRow[],
  limit = 8,
): { readonly items: readonly ProductRow[]; readonly hasSameCategory: boolean } {
  const targetPrice = Number(currentProduct.price) || 0;
  const seen = new Set<string>([currentProduct.id]);

  const uniqueSame = sameCategoryRows.filter((row) => {
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });

  const sortedSame = [...uniqueSame].sort((a, b) => {
    const aOut = a.stock_status === 'sold_out' ? 1 : 0;
    const bOut = b.stock_status === 'sold_out' ? 1 : 0;
    if (aOut !== bOut) return aOut - bOut;

    const aDiff = Math.abs((Number(a.price) || 0) - targetPrice);
    const bDiff = Math.abs((Number(b.price) || 0) - targetPrice);
    if (aDiff !== bDiff) return aDiff - bDiff;

    return b.created_at.localeCompare(a.created_at);
  });

  const uniqueFallback = fallbackRows.filter((row) => {
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });

  const sortedFallback = [...uniqueFallback].sort((a, b) => {
    const aOut = a.stock_status === 'sold_out' ? 1 : 0;
    const bOut = b.stock_status === 'sold_out' ? 1 : 0;
    if (aOut !== bOut) return aOut - bOut;

    return b.created_at.localeCompare(a.created_at);
  });

  const combined = [...sortedSame, ...sortedFallback].slice(0, Math.max(0, limit));
  return {
    items: combined,
    hasSameCategory: sortedSame.length > 0,
  };
}

export function buildCheckoutPayloadFromProduct(product: ProductRow): MarketCheckoutPayload {
  const formattedSpecs = getFormattedProductSpecs(product);
  const specsRecord: { [key: string]: string } = {};
  for (const item of formattedSpecs) {
    specsRecord[item.label] = item.value;
  }

  const presetItems = parsePresetComponents(product.preset_components);
  const highlightSummary = formattedSpecs
    .slice(0, 3)
    .map((item) => `${item.label}: ${item.value}`)
    .join(' · ');
  const fallbackSpec =
    highlightSummary ||
    presetItems
      .slice(0, 3)
      .map((entry) => `${entry.slot}: ${entry.name}`)
      .join(' · ');

  const unitPrice = Number(product.price) || 0;

  return {
    id: product.id,
    title: product.title,
    price: unitPrice,
    type: 'direct_buy',
    specs: specsRecord,
    items: [
      {
        id: product.id,
        label: getCategoryLabel(product.category),
        name: product.title,
        spec: fallbackSpec,
        unitPrice,
      },
    ],
  };
}
