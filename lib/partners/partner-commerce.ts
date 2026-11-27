import type { PartnerRow } from '@/lib/admin/partners-validation';
import {
  formatIdr,
  PRODUCT_CATEGORY_LABELS,
  slugifyProductTitle,
} from '@/lib/admin/products-validation';
import type {
  ProductCategory,
  ProductRow,
  ProductStockStatus,
} from '@/lib/admin/products-validation';
import type { Json } from '@/types/database.types';

// ── Types ──

export type PartnerConditionGrade =
  | 'New Sealed'
  | 'Grade A · Like New'
  | 'Grade B · Tested'
  | 'Refurbished IoT QC';

export type PartnerListingStatus = 'published' | 'qc_queue';
export type PartnerSettlementStatus = 'settled' | 'pending_escrow' | 'qc_hold';

export interface PartnerAccountProfile {
  readonly id: string;
  readonly name: string;
  readonly city: string;
  readonly isVerified: boolean;
  readonly commissionRate: number;
  readonly source: 'live' | 'simulated_demo';
}

export interface PartnerListingRecord {
  readonly id: string;
  readonly partnerId: string;
  readonly partnerName: string;
  readonly partnerCity: string;
  readonly partnerVerified: boolean;
  readonly title: string;
  readonly category: ProductCategory;
  readonly price: number;
  readonly stockQuantity: number;
  readonly stockStatus: ProductStockStatus;
  readonly conditionGrade: PartnerConditionGrade;
  readonly specsSummary: string;
  readonly partnerNotes: string;
  readonly imageUrl: string;
  readonly listingStatus: PartnerListingStatus;
  readonly source: 'partner_local' | 'simulated_demo';
  readonly createdAt: string;
}

export interface PartnerLedgerEntry {
  readonly id: string;
  readonly orderRef: string;
  readonly partnerId: string;
  readonly partnerName: string;
  readonly partnerCity: string;
  readonly productTitle: string;
  readonly grossAmount: number;
  readonly commissionRate: number;
  readonly platformFee: number;
  readonly netPartnerAmount: number;
  readonly settlementStatus: PartnerSettlementStatus;
  readonly recordedAt: string;
  readonly auditHash: string;
  readonly dataSource: 'simulated_demo' | 'live';
}

export interface PartnerFinancialSummary {
  readonly partnerId: string;
  readonly partnerName: string;
  readonly partnerCity: string;
  readonly isVerified: boolean;
  readonly commissionRate: number;
  readonly activeListings: number;
  readonly transactionCount: number;
  readonly grossSales: number;
  readonly platformFee: number;
  readonly pendingEscrow: number;
  readonly settledPayout: number;
  readonly dataSource: 'simulated_demo' | 'live';
}

export interface PartnerAttributionMeta {
  readonly isPartnerListing: boolean;
  readonly partnerId: string;
  readonly partnerName: string;
  readonly partnerCity: string;
  readonly partnerVerified: boolean;
  readonly partnerNotes: string;
  readonly conditionGrade: string;
  readonly isSimulatedDemo: boolean;
  readonly isLocalPartnerListing: boolean;
}

export interface NewPartnerListingInput {
  readonly partner: PartnerAccountProfile;
  readonly title: string;
  readonly category: ProductCategory;
  readonly price: number;
  readonly stockQuantity: number;
  readonly stockStatus: ProductStockStatus;
  readonly conditionGrade: PartnerConditionGrade;
  readonly specsSummary: string;
  readonly partnerNotes: string;
}

// ── Constants & Demo Seeds ──

export const PARTNER_LISTINGS_STORAGE_KEY = 'vici_partner_listings_v1';
export const PARTNER_LISTINGS_UPDATED_EVENT = 'vicitech:partner-listings-updated';
export const LOCAL_PARTNER_ID_PREFIX = 'partner-listing-';

export const PARTNER_CONDITION_GRADES: readonly PartnerConditionGrade[] = [
  'New Sealed',
  'Grade A · Like New',
  'Grade B · Tested',
  'Refurbished IoT QC',
];

const CATEGORY_IMAGE_MAP: Readonly<Record<ProductCategory, string>> = {
  'pc-build': '/images/hero/pc-rig.jpg',
  laptop: '/images/hero/code-screen.jpg',
  smartphone: '/images/hero/repair-tech.jpg',
  console: '/images/hero/pc-rig.jpg',
  handheld: '/images/hero/code-screen.jpg',
  component: '/images/hero/thermal-paste.jpg',
  accessory: '/images/hero/repair-tech.jpg',
};

export const DEMO_PARTNER_PROFILES: readonly PartnerAccountProfile[] = [
  {
    id: 'demo-partner-nusantara',
    name: 'Nusantara Rig Studio',
    city: 'Jakarta Selatan',
    isVerified: true,
    commissionRate: 0.065,
    source: 'simulated_demo',
  },
  {
    id: 'demo-partner-bandung-lab',
    name: 'Bandung Silicon Lab',
    city: 'Bandung',
    isVerified: true,
    commissionRate: 0.07,
    source: 'simulated_demo',
  },
  {
    id: 'demo-partner-surabaya-hub',
    name: 'Surabaya Gear Hub',
    city: 'Surabaya',
    isVerified: true,
    commissionRate: 0.06,
    source: 'simulated_demo',
  },
];

export const DEMO_PARTNER_LISTINGS: readonly PartnerListingRecord[] = [
  {
    id: 'partner-listing-demo-b650e',
    partnerId: 'demo-partner-nusantara',
    partnerName: 'Nusantara Rig Studio',
    partnerCity: 'Jakarta Selatan',
    partnerVerified: true,
    title: 'ASUS ROG Strix B650E-F WiFi · Partner Batch',
    category: 'component',
    price: 4650000,
    stockQuantity: 4,
    stockStatus: 'ready',
    conditionGrade: 'New Sealed',
    specsSummary: 'socket: AM5, form_factor: ATX, warranty: 3 Tahun Resmi',
    partnerNotes: 'Unit segel resmi distributor Indonesia; siap kirim & inspeksi IoT QC.',
    imageUrl: '/images/hero/thermal-paste.jpg',
    listingStatus: 'published',
    source: 'simulated_demo',
    createdAt: '2026-11-20T09:15:00.000Z',
  },
  {
    id: 'partner-listing-demo-t14g3',
    partnerId: 'demo-partner-bandung-lab',
    partnerName: 'Bandung Silicon Lab',
    partnerCity: 'Bandung',
    partnerVerified: true,
    title: 'Lenovo ThinkPad T14 Gen 3 · Partner Refurb QC',
    category: 'laptop',
    price: 9250000,
    stockQuantity: 3,
    stockStatus: 'ready',
    conditionGrade: 'Refurbished IoT QC',
    specsSummary: 'cpu: Ryzen 7 PRO 6850U, ram: 16 GB LPDDR5, storage: 512 GB NVMe, battery_health: 92%',
    partnerNotes: 'Lolos repaste thermal & burn-in 4 jam di bengkel mitra Bandung.',
    imageUrl: '/images/hero/code-screen.jpg',
    listingStatus: 'published',
    source: 'simulated_demo',
    createdAt: '2026-11-22T14:30:00.000Z',
  },
  {
    id: 'partner-listing-demo-q1pro',
    partnerId: 'demo-partner-surabaya-hub',
    partnerName: 'Surabaya Gear Hub',
    partnerCity: 'Surabaya',
    partnerVerified: true,
    title: 'Keychron Q1 Pro CNC Aluminum Wireless',
    category: 'accessory',
    price: 2790000,
    stockQuantity: 6,
    stockStatus: 'ready',
    conditionGrade: 'Grade A · Like New',
    specsSummary: 'connectivity: Bluetooth 5.1 / USB-C, chassis: CNC 6063 Aluminum',
    partnerNotes: 'Lengkap keycaps cadangan & kabel coiled; QC switch dan stabiliser verified.',
    imageUrl: '/images/hero/repair-tech.jpg',
    listingStatus: 'published',
    source: 'simulated_demo',
    createdAt: '2026-11-24T11:05:00.000Z',
  },
];

export const IMMUTABLE_PARTNER_LEDGER_ENTRIES: readonly PartnerLedgerEntry[] = [
  {
    id: 'LDG-2026-0419',
    orderRef: 'VT-ORD-2611-8841',
    partnerId: 'demo-partner-nusantara',
    partnerName: 'Nusantara Rig Studio',
    partnerCity: 'Jakarta Selatan',
    productTitle: 'ASUS ROG Strix B650E-F WiFi · Partner Batch',
    grossAmount: 9300000,
    commissionRate: 0.065,
    platformFee: 604500,
    netPartnerAmount: 8695500,
    settlementStatus: 'settled',
    recordedAt: '2026-11-25T16:40:00.000Z',
    auditHash: '0x9f4c81e2...7b21a8',
    dataSource: 'simulated_demo',
  },
  {
    id: 'LDG-2026-0418',
    orderRef: 'VT-ORD-2611-8837',
    partnerId: 'demo-partner-bandung-lab',
    partnerName: 'Bandung Silicon Lab',
    partnerCity: 'Bandung',
    productTitle: 'Lenovo ThinkPad T14 Gen 3 · Partner Refurb QC',
    grossAmount: 9250000,
    commissionRate: 0.07,
    platformFee: 647500,
    netPartnerAmount: 8602500,
    settlementStatus: 'settled',
    recordedAt: '2026-11-24T19:12:00.000Z',
    auditHash: '0x4b12d09c...e3190f',
    dataSource: 'simulated_demo',
  },
  {
    id: 'LDG-2026-0416',
    orderRef: 'VT-ORD-2611-8829',
    partnerId: 'demo-partner-nusantara',
    partnerName: 'Nusantara Rig Studio',
    partnerCity: 'Jakarta Selatan',
    productTitle: 'Custom SFF Workstation RTX 4070 Super (Partner)',
    grossAmount: 24500000,
    commissionRate: 0.065,
    platformFee: 1592500,
    netPartnerAmount: 22907500,
    settlementStatus: 'pending_escrow',
    recordedAt: '2026-11-26T10:08:00.000Z',
    auditHash: '0x71de04ac...98cc41',
    dataSource: 'simulated_demo',
  },
  {
    id: 'LDG-2026-0415',
    orderRef: 'VT-ORD-2611-8824',
    partnerId: 'demo-partner-surabaya-hub',
    partnerName: 'Surabaya Gear Hub',
    partnerCity: 'Surabaya',
    productTitle: 'Keychron Q1 Pro CNC Aluminum Wireless',
    grossAmount: 5580000,
    commissionRate: 0.06,
    platformFee: 334800,
    netPartnerAmount: 5245200,
    settlementStatus: 'settled',
    recordedAt: '2026-11-23T13:50:00.000Z',
    auditHash: '0x2c8a77f1...09be54',
    dataSource: 'simulated_demo',
  },
  {
    id: 'LDG-2026-0414',
    orderRef: 'VT-ORD-2611-8818',
    partnerId: 'demo-partner-bandung-lab',
    partnerName: 'Bandung Silicon Lab',
    partnerCity: 'Bandung',
    productTitle: 'Thermal Grizzly & Noctua Cooling Service Kit',
    grossAmount: 3600000,
    commissionRate: 0.07,
    platformFee: 252000,
    netPartnerAmount: 3348000,
    settlementStatus: 'qc_hold',
    recordedAt: '2026-11-26T15:22:00.000Z',
    auditHash: '0x8e53ab19...44fa02',
    dataSource: 'simulated_demo',
  },
  {
    id: 'LDG-2026-0412',
    orderRef: 'VT-ORD-2611-8809',
    partnerId: 'demo-partner-surabaya-hub',
    partnerName: 'Surabaya Gear Hub',
    partnerCity: 'Surabaya',
    productTitle: 'Corsair RM850e ATX 3.0 Modular PSU',
    grossAmount: 4200000,
    commissionRate: 0.06,
    platformFee: 252000,
    netPartnerAmount: 3948000,
    settlementStatus: 'pending_escrow',
    recordedAt: '2026-11-27T07:45:00.000Z',
    auditHash: '0xa301f7c4...66d2e1',
    dataSource: 'simulated_demo',
  },
];

// ── Helpers & Normalization ──

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readStr(rec: Record<string, unknown>, key: string): string {
  const val = rec[key];
  return typeof val === 'string' ? val.trim() : '';
}

export function mergePartnerProfiles(
  livePartners: readonly PartnerRow[],
): readonly PartnerAccountProfile[] {
  const seenNames = new Set<string>();
  const combined: PartnerAccountProfile[] = [];

  for (const row of livePartners) {
    const cleanName = row.name.trim();
    if (!cleanName) continue;
    seenNames.add(cleanName.toLowerCase());
    combined.push({
      id: row.id,
      name: cleanName,
      city: row.city.trim() || 'Indonesia',
      isVerified: Boolean(row.is_verified),
      commissionRate: 0.065,
      source: 'live',
    });
  }

  for (const demo of DEMO_PARTNER_PROFILES) {
    if (!seenNames.has(demo.name.toLowerCase())) {
      combined.push(demo);
    }
  }

  return combined;
}

function normalizeStoredListing(raw: unknown): PartnerListingRecord | null {
  if (!isRecord(raw)) return null;
  const id = readStr(raw, 'id');
  const title = readStr(raw, 'title');
  const partnerName = readStr(raw, 'partnerName');
  if (!id || !title || !partnerName) return null;

  const rawCategory = readStr(raw, 'category');
  const category: ProductCategory =
    rawCategory in PRODUCT_CATEGORY_LABELS ? (rawCategory as ProductCategory) : 'component';
  const rawStockStatus = readStr(raw, 'stockStatus');
  const stockStatus: ProductStockStatus =
    rawStockStatus === 'preorder' || rawStockStatus === 'sold_out' ? rawStockStatus : 'ready';
  const rawGrade = readStr(raw, 'conditionGrade');
  const conditionGrade: PartnerConditionGrade = (PARTNER_CONDITION_GRADES as readonly string[]).includes(
    rawGrade,
  )
    ? (rawGrade as PartnerConditionGrade)
    : 'Grade A · Like New';

  const priceNum = Number(raw.price);
  const qtyNum = Number(raw.stockQuantity);

  return {
    id,
    partnerId: readStr(raw, 'partnerId') || 'demo-partner-nusantara',
    partnerName,
    partnerCity: readStr(raw, 'partnerCity') || 'Indonesia',
    partnerVerified: raw.partnerVerified !== false,
    title: title.slice(0, 120),
    category,
    price: Number.isFinite(priceNum) && priceNum >= 0 ? Math.round(priceNum) : 0,
    stockQuantity: Number.isFinite(qtyNum) && qtyNum >= 0 ? Math.round(qtyNum) : 1,
    stockStatus,
    conditionGrade,
    specsSummary: readStr(raw, 'specsSummary').slice(0, 240),
    partnerNotes: readStr(raw, 'partnerNotes').slice(0, 280),
    imageUrl: readStr(raw, 'imageUrl') || CATEGORY_IMAGE_MAP[category],
    listingStatus: raw.listingStatus === 'qc_queue' ? 'qc_queue' : 'published',
    source: 'partner_local',
    createdAt: readStr(raw, 'createdAt') || new Date().toISOString(),
  };
}

export function loadStoredPartnerListings(): readonly PartnerListingRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(PARTNER_LISTINGS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const normalized: PartnerListingRecord[] = [];
    for (const item of parsed) {
      const record = normalizeStoredListing(item);
      if (record) normalized.push(record);
    }
    return normalized;
  } catch {
    return [];
  }
}

export function getCombinedPartnerListings(): readonly PartnerListingRecord[] {
  const stored = loadStoredPartnerListings();
  const seenIds = new Set(stored.map((item) => item.id));
  const demos = DEMO_PARTNER_LISTINGS.filter((item) => !seenIds.has(item.id));
  return [...stored, ...demos];
}

export function addPartnerListing(
  input: NewPartnerListingInput,
): { readonly ok: true; readonly listing: PartnerListingRecord } | { readonly ok: false; readonly error: string } {
  const title = input.title.trim();
  if (title.length < 4) {
    return { ok: false, error: 'Judul produk minimal 4 karakter.' };
  }
  if (!Number.isFinite(input.price) || input.price < 10_000) {
    return { ok: false, error: 'Harga produk minimal Rp 10.000.' };
  }
  if (!Number.isFinite(input.stockQuantity) || input.stockQuantity < 0) {
    return { ok: false, error: 'Jumlah stok tidak boleh negatif.' };
  }

  const nowIso = new Date().toISOString();
  const shortId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().slice(0, 8)
      : Date.now().toString(36);

  const listing: PartnerListingRecord = {
    id: `${LOCAL_PARTNER_ID_PREFIX}${Date.now()}-${shortId}`,
    partnerId: input.partner.id,
    partnerName: input.partner.name,
    partnerCity: input.partner.city,
    partnerVerified: input.partner.isVerified,
    title: title.slice(0, 120),
    category: input.category,
    price: Math.round(input.price),
    stockQuantity: Math.round(input.stockQuantity),
    stockStatus: input.stockQuantity === 0 ? 'sold_out' : input.stockStatus,
    conditionGrade: input.conditionGrade,
    specsSummary: input.specsSummary.trim().slice(0, 240),
    partnerNotes: input.partnerNotes.trim().slice(0, 280),
    imageUrl: CATEGORY_IMAGE_MAP[input.category],
    listingStatus: 'published',
    source: 'partner_local',
    createdAt: nowIso,
  };

  if (typeof window !== 'undefined') {
    const existing = loadStoredPartnerListings();
    const updated = [listing, ...existing].slice(0, 40);
    window.localStorage.setItem(PARTNER_LISTINGS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent(PARTNER_LISTINGS_UPDATED_EVENT, { detail: updated }));
  }

  return { ok: true, listing };
}

export function removeLocalPartnerListing(listingId: string): void {
  if (typeof window === 'undefined') return;
  const existing = loadStoredPartnerListings();
  const next = existing.filter((item) => item.id !== listingId);
  window.localStorage.setItem(PARTNER_LISTINGS_STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(PARTNER_LISTINGS_UPDATED_EVENT, { detail: next }));
}

function parseSpecsSummary(specsSummary: string, conditionGrade: string): Record<string, Json> {
  const result: Record<string, Json> = {
    grade: conditionGrade,
    qc_protocol: 'Mitra & 15-Titik ViciTech IoT QC',
  };
  const segments = specsSummary
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  for (const segment of segments) {
    const colonIndex = segment.indexOf(':');
    if (colonIndex > 0) {
      const rawKey = segment.slice(0, colonIndex).trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_');
      const rawVal = segment.slice(colonIndex + 1).trim();
      if (rawKey && rawVal) {
        result[rawKey] = rawVal;
      }
    } else if (!result.spesifikasi) {
      result.spesifikasi = segment;
    }
  }
  return result;
}

export function partnerListingToProductRow(listing: PartnerListingRecord): ProductRow {
  const slugBase = slugifyProductTitle(listing.title) || 'partner-product';
  const slugSuffix = listing.id.slice(-8).toLowerCase().replace(/[^a-z0-9]/g, '') || 'mitra';
  const specs = parseSpecsSummary(listing.specsSummary, listing.conditionGrade);
  const metadata: Record<string, Json> = {
    partner_id: listing.partnerId,
    partner_name: listing.partnerName,
    partner_city: listing.partnerCity,
    partner_verified: listing.partnerVerified,
    partner_notes: listing.partnerNotes,
    condition_grade: listing.conditionGrade,
    listing_source: listing.source,
    stock_quantity: listing.stockQuantity,
  };

  const descriptionParts = [
    listing.partnerNotes,
    listing.specsSummary ? `Spesifikasi: ${listing.specsSummary}.` : '',
    `Disediakan oleh mitra resmi ${listing.partnerName} (${listing.partnerCity}).`,
  ].filter(Boolean);

  return {
    id: listing.id,
    slug: `${slugBase}-${slugSuffix}`,
    title: listing.title,
    description: descriptionParts.join(' '),
    price: listing.price,
    category: listing.category,
    seller_type: 'partner',
    specs,
    metadata,
    images: [listing.imageUrl],
    image_url: listing.imageUrl,
    gallery_urls: [listing.imageUrl],
    stock_status: listing.stockStatus,
    is_preset: false,
    preset_components: [],
    reviewed_by_name: listing.partnerName,
    reviewed_by_avatar: null,
    review_quote: listing.partnerNotes || null,
    review_video_url: null,
    created_at: listing.createdAt,
    updated_at: listing.createdAt,
  };
}

export function extractPartnerAttribution(product: ProductRow): PartnerAttributionMeta {
  const metadata = isRecord(product.metadata) ? product.metadata : {};
  const metaPartnerName = readStr(metadata, 'partner_name');
  const partnerName =
    metaPartnerName ||
    (product.seller_type === 'partner'
      ? product.reviewed_by_name?.trim() || 'Mitra Resmi ViciTech'
      : '');

  const isPartnerListing = product.seller_type === 'partner' || Boolean(metaPartnerName);
  const listingSource = readStr(metadata, 'listing_source');
  const isLocalPartnerListing = product.id.startsWith(LOCAL_PARTNER_ID_PREFIX);

  return {
    isPartnerListing,
    partnerId: readStr(metadata, 'partner_id'),
    partnerName,
    partnerCity: readStr(metadata, 'partner_city') || 'Indonesia',
    partnerVerified: metadata.partner_verified !== false,
    partnerNotes: readStr(metadata, 'partner_notes') || product.review_quote?.trim() || '',
    conditionGrade: readStr(metadata, 'condition_grade'),
    isSimulatedDemo: listingSource === 'simulated_demo' || listingSource === 'partner_local',
    isLocalPartnerListing,
  };
}

export function computePartnerFinancialSummaries(
  entries: readonly PartnerLedgerEntry[],
  partners: readonly PartnerAccountProfile[],
  listings: readonly PartnerListingRecord[],
): readonly PartnerFinancialSummary[] {
  const summaryMap = new Map<
    string,
    {
      partnerId: string;
      partnerName: string;
      partnerCity: string;
      isVerified: boolean;
      commissionRate: number;
      activeListings: number;
      transactionCount: number;
      grossSales: number;
      platformFee: number;
      pendingEscrow: number;
      settledPayout: number;
      dataSource: 'simulated_demo' | 'live';
    }
  >();

  const ensurePartner = (
    partnerId: string,
    fallbackName: string,
    fallbackCity: string,
    commissionRate = 0.065,
    dataSource: 'simulated_demo' | 'live' = 'simulated_demo',
    isVerified = true,
  ) => {
    const existing = summaryMap.get(partnerId);
    if (existing) return existing;
    const created = {
      partnerId,
      partnerName: fallbackName,
      partnerCity: fallbackCity,
      isVerified,
      commissionRate,
      activeListings: 0,
      transactionCount: 0,
      grossSales: 0,
      platformFee: 0,
      pendingEscrow: 0,
      settledPayout: 0,
      dataSource,
    };
    summaryMap.set(partnerId, created);
    return created;
  };

  for (const partner of partners) {
    ensurePartner(
      partner.id,
      partner.name,
      partner.city,
      partner.commissionRate,
      partner.source,
      partner.isVerified,
    );
  }

  for (const listing of listings) {
    const target = ensurePartner(listing.partnerId, listing.partnerName, listing.partnerCity);
    if (listing.stockStatus !== 'sold_out') {
      target.activeListings += 1;
    }
  }

  for (const entry of entries) {
    const target = ensurePartner(
      entry.partnerId,
      entry.partnerName,
      entry.partnerCity,
      entry.commissionRate,
      entry.dataSource,
    );
    target.transactionCount += 1;
    target.grossSales += entry.grossAmount;
    target.platformFee += entry.platformFee;
    if (entry.settlementStatus === 'settled') {
      target.settledPayout += entry.netPartnerAmount;
    } else {
      target.pendingEscrow += entry.netPartnerAmount;
    }
  }

  return [...summaryMap.values()].sort((a, b) => b.grossSales - a.grossSales);
}

export function buildPartnerAuditCsv(
  summaries: readonly PartnerFinancialSummary[],
  entries: readonly PartnerLedgerEntry[],
  isEnglish: boolean,
): string {
  const headerSummary = isEnglish
    ? ['Partner ID', 'Partner Name', 'City', 'Commission %', 'Active SKUs', 'Gross Sales (IDR)', 'Platform Fee (IDR)', 'Pending Escrow (IDR)', 'Settled Payout (IDR)', 'Source']
    : ['ID Mitra', 'Nama Mitra', 'Kota', 'Komisi %', 'Produk Aktif', 'Penjualan Kotor (IDR)', 'Komisi Platform (IDR)', 'Dana Escrow Tertahan (IDR)', 'Dana Cair (IDR)', 'Sumber Data'];

  const headerLedger = isEnglish
    ? ['Ledger ID', 'Date ISO', 'Order Ref', 'Partner', 'Product', 'Gross (IDR)', 'Fee (IDR)', 'Net Payout (IDR)', 'Settlement Status', 'Audit Hash', 'Mode']
    : ['ID Ledger', 'Tanggal ISO', 'Ref Pesanan', 'Mitra', 'Produk', 'Kotor (IDR)', 'Komisi (IDR)', 'Hak Mitra (IDR)', 'Status Pencairan', 'Hash Audit', 'Mode'];

  const rows: (string | number)[][] = [
    [isEnglish ? 'ViciTech Partner Financial Audit (Read-Only)' : 'Audit Keuangan Mitra ViciTech (Hanya Baca)'],
    [],
    headerSummary,
    ...summaries.map((s) => [
      s.partnerId,
      s.partnerName,
      s.partnerCity,
      `${(s.commissionRate * 100).toFixed(1)}%`,
      s.activeListings,
      s.grossSales,
      s.platformFee,
      s.pendingEscrow,
      s.settledPayout,
      s.dataSource === 'live' ? 'Live' : 'Simulated / Demo',
    ]),
    [],
    headerLedger,
    ...entries.map((e) => [
      e.id,
      e.recordedAt,
      e.orderRef,
      e.partnerName,
      e.productTitle,
      e.grossAmount,
      e.platformFee,
      e.netPartnerAmount,
      e.settlementStatus,
      e.auditHash,
      'Immutable Ledger · Simulated Demo',
    ]),
  ];

  return (
    '\uFEFF' +
    rows
      .map((row) =>
        row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(','),
      )
      .join('\r\n')
  );
}

export function formatLedgerDate(iso: string, isEnglish: boolean): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(isEnglish ? 'en-US' : 'id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export { formatIdr };
