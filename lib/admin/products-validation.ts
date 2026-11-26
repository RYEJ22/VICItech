import type { Json, Tables, TablesInsert, TablesUpdate } from '@/types/database.types';

export const MAX_PRODUCT_IMAGES = 5;

export const PRODUCT_CATEGORIES = [
  'pc-build',
  'laptop',
  'smartphone',
  'console',
  'handheld',
  'component',
  'accessory',
] as const;

export const PRODUCT_STOCK_STATUSES = ['ready', 'preorder', 'sold_out'] as const;

export const PRODUCT_SELLER_TYPES = ['vicitech', 'partner'] as const;

export type ProductRow = Tables<'products'> & {
  readonly image_url?: string | null;
  readonly gallery_urls?: readonly string[];
  readonly metadata?: Json;
};
export type ProductInsert = TablesInsert<'products'>;
export type ProductUpdate = TablesUpdate<'products'>;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];
export type ProductStockStatus = (typeof PRODUCT_STOCK_STATUSES)[number];
export type ProductSellerType = (typeof PRODUCT_SELLER_TYPES)[number];

export interface ProductSpecEntry {
  readonly id: string;
  readonly key: string;
  readonly value: string;
}

export interface PresetComponentEntry {
  readonly id: string;
  readonly slot: string;
  readonly name: string;
}

export interface ProductFormPayload {
  readonly title: string;
  readonly slug: string;
  readonly description: string;
  readonly price: string | number;
  readonly category: string;
  readonly seller_type: string;
  readonly stock_status: string;
  readonly images: readonly string[];
  readonly image_url?: string | null;
  readonly gallery_urls?: readonly string[];
  readonly specs: { readonly [key: string]: Json | undefined };
  readonly is_preset: boolean;
  readonly preset_components: readonly { readonly slot: string; readonly name: string }[];
  readonly reviewed_by_name: string;
  readonly reviewed_by_avatar: string;
  readonly review_quote: string;
  readonly review_video_url: string;
}

export type ActionResponse<T = void> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly error: string };

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const PRODUCT_CATEGORY_LABELS: Readonly<Record<ProductCategory, string>> = {
  'pc-build': 'PC Build',
  laptop: 'Laptop',
  smartphone: 'Smartphone',
  console: 'Consoles',
  handheld: 'Handhelds',
  component: 'Komponen',
  accessory: 'Aksesori',
};

export const STOCK_STATUS_LABELS: Readonly<Record<ProductStockStatus, string>> = {
  ready: 'Ready Stock',
  preorder: 'Pre-Order',
  sold_out: 'Habis',
};

export const SELLER_TYPE_LABELS: Readonly<Record<ProductSellerType, string>> = {
  vicitech: 'ViciTech Resmi',
  partner: 'Mitra Terverifikasi',
};

export function isProductCategory(value: unknown): value is ProductCategory {
  return typeof value === 'string' && (PRODUCT_CATEGORIES as readonly string[]).includes(value);
}

export function isProductStockStatus(value: unknown): value is ProductStockStatus {
  return typeof value === 'string' && (PRODUCT_STOCK_STATUSES as readonly string[]).includes(value);
}

export function isProductSellerType(value: unknown): value is ProductSellerType {
  return typeof value === 'string' && (PRODUCT_SELLER_TYPES as readonly string[]).includes(value);
}

export function slugifyProductTitle(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 140);
}

export function formatIdr(value: number | string | null | undefined): string {
  const num = Number(value);
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(num) ? num : 0);
}

function isJsonRecord(value: unknown): value is { readonly [key: string]: Json | undefined } {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseProductSpecs(specs: Json | undefined): ProductSpecEntry[] {
  if (!isJsonRecord(specs)) return [];
  return Object.entries(specs)
    .filter((entry): entry is [string, Json] => entry[1] !== undefined && entry[1] !== null)
    .map(([key, value], index) => ({
      id: `spec-${index}-${key}`,
      key,
      value:
        typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
          ? String(value)
          : JSON.stringify(value),
    }));
}

function coerceSpecScalar(raw: string): Json {
  const trimmed = raw.trim();
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(trimmed)) {
    const num = Number(trimmed);
    if (Number.isFinite(num)) return num;
  }
  return trimmed;
}

export function specEntriesToJson(
  entries: readonly ProductSpecEntry[],
): { readonly [key: string]: Json | undefined } {
  const result: { [key: string]: Json | undefined } = {};
  for (const entry of entries) {
    const key = entry.key.trim();
    const value = entry.value.trim();
    if (!key || !value) continue;
    result[key] = coerceSpecScalar(value);
  }
  return result;
}

export function parseJsonObject(
  raw: string,
):
  | { readonly ok: true; readonly data: { readonly [key: string]: Json | undefined } }
  | { readonly ok: false; readonly error: string } {
  try {
    const parsed: unknown = JSON.parse(raw.trim() || '{}');
    if (!isJsonRecord(parsed)) {
      return { ok: false, error: 'Specs harus berupa objek JSON yang valid.' };
    }
    return { ok: true, data: parsed };
  } catch {
    return { ok: false, error: 'Format JSON specs tidak valid. Periksa tanda kutip dan koma.' };
  }
}

export function parsePresetComponents(raw: Json | undefined): PresetComponentEntry[] {
  if (!Array.isArray(raw)) return [];
  const items: PresetComponentEntry[] = [];
  raw.forEach((entry, index) => {
    if (!isJsonRecord(entry)) return;
    const slot = typeof entry.slot === 'string' ? entry.slot : '';
    const name = typeof entry.name === 'string' ? entry.name : '';
    if (!slot && !name) return;
    items.push({
      id: `preset-${index}`,
      slot,
      name,
    });
  });
  return items;
}

export function isValidMediaUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('/')) return !trimmed.startsWith('//');
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function readOptionalStringProp(record: object, key: string): string | null {
  for (const [entryKey, entryValue] of Object.entries(record)) {
    if (entryKey === key && typeof entryValue === 'string') {
      const trimmed = entryValue.trim();
      return trimmed || null;
    }
  }
  return null;
}

function readOptionalStringArrayProp(record: object, key: string): readonly string[] {
  for (const [entryKey, entryValue] of Object.entries(record)) {
    if (entryKey === key && Array.isArray(entryValue)) {
      const urls: string[] = [];
      for (const item of entryValue) {
        if (typeof item === 'string') {
          const trimmed = item.trim();
          if (trimmed) urls.push(trimmed);
        }
      }
      return urls;
    }
  }
  return [];
}

export function resolveProductImages(
  product: Pick<ProductRow, 'images' | 'image_url' | 'gallery_urls'>,
): string[] {
  const resolved: string[] = [];
  const pushValidUnique = (rawUrl: unknown) => {
    if (typeof rawUrl !== 'string') return;
    const trimmed = rawUrl.trim();
    if (!trimmed || !isValidMediaUrl(trimmed)) return;
    if (!resolved.includes(trimmed)) {
      resolved.push(trimmed);
    }
  };

  pushValidUnique(product.image_url);

  if (Array.isArray(product.gallery_urls)) {
    for (const url of product.gallery_urls) {
      pushValidUnique(url);
    }
  }

  if (Array.isArray(product.images)) {
    for (const url of product.images) {
      pushValidUnique(url);
    }
  }

  return resolved;
}

export function normalizeProductRecord(row: Tables<'products'>): ProductRow {
  const optionalImageUrl = readOptionalStringProp(row, 'image_url');
  const optionalGalleryUrls = readOptionalStringArrayProp(row, 'gallery_urls');
  const cleanImages = resolveProductImages({
    image_url: optionalImageUrl,
    gallery_urls: optionalGalleryUrls,
    images: row.images,
  });

  return {
    ...row,
    images: cleanImages,
    image_url: cleanImages[0] ?? null,
    gallery_urls: cleanImages,
  };
}

export function isMissingImageColumnError(
  error: { readonly code?: string | undefined; readonly message?: string | undefined } | null,
): boolean {
  if (!error) return false;
  if (error.code === '42703' || error.code === 'PGRST204') return true;
  const message = (error.message ?? '').toLowerCase();
  return (
    message.includes('image_url') ||
    message.includes('gallery_urls')
  );
}

export function validateProductPayload(
  input: ProductFormPayload,
):
  | {
      readonly ok: true;
      readonly data: ProductInsert;
      readonly imageColumns: {
        readonly image_url: string | null;
        readonly gallery_urls: readonly string[];
      };
    }
  | { readonly ok: false; readonly error: string } {
  const title = input.title.trim();
  if (title.length < 2 || title.length > 180) {
    return { ok: false, error: 'Nama produk wajib diisi antara 2 hingga 180 karakter.' };
  }

  const normalizedSlug = slugifyProductTitle(input.slug || title);
  if (!SLUG_REGEX.test(normalizedSlug) || normalizedSlug.length < 2 || normalizedSlug.length > 180) {
    return { ok: false, error: 'Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung (-).' };
  }

  if (!isProductCategory(input.category)) {
    return { ok: false, error: 'Pilih kategori produk yang valid.' };
  }
  if (!isProductSellerType(input.seller_type)) {
    return { ok: false, error: 'Pilih tipe penjual yang valid.' };
  }
  if (!isProductStockStatus(input.stock_status)) {
    return { ok: false, error: 'Pilih status stok produk yang valid.' };
  }

  const price = Number(input.price);
  if (!Number.isFinite(price) || price < 0) {
    return { ok: false, error: 'Harga harus berupa angka non-negatif dalam IDR.' };
  }

  const rawImageInputs: readonly string[] = [
    ...(typeof input.image_url === 'string' && input.image_url.trim()
      ? [input.image_url]
      : []),
    ...(Array.isArray(input.gallery_urls) ? input.gallery_urls : []),
    ...input.images,
  ];

  const cleanImages: string[] = [];
  for (const rawUrl of rawImageInputs) {
    const url = rawUrl.trim();
    if (!url) continue;
    if (!isValidMediaUrl(url)) {
      return { ok: false, error: `URL gambar tidak valid: ${url}` };
    }
    if (!cleanImages.includes(url)) {
      cleanImages.push(url);
    }
  }

  if (cleanImages.length > MAX_PRODUCT_IMAGES) {
    return { ok: false, error: `Maksimal ${MAX_PRODUCT_IMAGES} foto per produk.` };
  }

  if (!isJsonRecord(input.specs)) {
    return { ok: false, error: 'Specs produk harus berbentuk objek JSON.' };
  }

  const cleanPresetComponents = input.is_preset
    ? input.preset_components
        .map((row) => ({
          slot: row.slot.trim(),
          name: row.name.trim(),
        }))
        .filter((row) => row.slot.length > 0 && row.name.length > 0)
    : [];

  const reviewedByAvatar = input.reviewed_by_avatar.trim();
  if (reviewedByAvatar && !isValidMediaUrl(reviewedByAvatar)) {
    return { ok: false, error: 'URL avatar reviewer harus diawali https://, http://, atau /.' };
  }

  const reviewVideoUrl = input.review_video_url.trim();
  if (reviewVideoUrl && !isValidMediaUrl(reviewVideoUrl)) {
    return { ok: false, error: 'URL video review harus diawali https:// atau http://.' };
  }

  return {
    ok: true,
    data: {
      title,
      slug: normalizedSlug,
      description: input.description.trim(),
      price: Math.round(price),
      category: input.category,
      seller_type: input.seller_type,
      stock_status: input.stock_status,
      images: cleanImages,
      specs: input.specs,
      is_preset: Boolean(input.is_preset),
      preset_components: cleanPresetComponents,
      reviewed_by_name: input.reviewed_by_name.trim() || null,
      reviewed_by_avatar: reviewedByAvatar || null,
      review_quote: input.review_quote.trim() || null,
      review_video_url: reviewVideoUrl || null,
    },
    imageColumns: {
      image_url: cleanImages[0] ?? null,
      gallery_urls: cleanImages,
    },
  };
}
