import { slugifyProductTitle } from '@/lib/admin/products-validation';
import { getSupabaseBrowserClient, isSupabaseAuthConfigured } from '@/lib/supabase/client';
import { formatMediaFileSize, sanitizeMediaFileName } from './uploadMedia';

export const PRODUCT_IMAGES_BUCKET = 'product-images' as const;
export const FALLBACK_PRODUCT_MEDIA_BUCKET = 'post-media' as const;
export const MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_PRODUCT_IMAGES = 5;

export const ALLOWED_PRODUCT_IMAGE_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const PRODUCT_IMAGE_ACCEPT = ALLOWED_PRODUCT_IMAGE_MIMES.join(',');

const MIME_TO_EXTENSION: Readonly<Record<string, string>> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export type ProductImageValidationResult =
  | {
      readonly ok: true;
      readonly mimeType: string;
      readonly extension: string;
    }
  | {
      readonly ok: false;
      readonly error: string;
    };

export interface UploadProductImageParams {
  readonly file: File;
  readonly userId: string;
  readonly productSlug?: string;
}

export interface UploadedProductImage {
  readonly url: string;
  readonly path: string;
  readonly bucket: typeof PRODUCT_IMAGES_BUCKET | typeof FALLBACK_PRODUCT_MEDIA_BUCKET;
  readonly fileName: string;
  readonly size: number;
  readonly usedFallbackBucket: boolean;
}

export interface StorageObjectTarget {
  readonly bucket: typeof PRODUCT_IMAGES_BUCKET | typeof FALLBACK_PRODUCT_MEDIA_BUCKET;
  readonly path: string;
}

function isMissingBucketError(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes('bucket not found') || lower.includes('404');
}

export function validateProductImageFile(file: File): ProductImageValidationResult {
  const normalizedMime = file.type.toLowerCase().trim();
  const extension = MIME_TO_EXTENSION[normalizedMime];

  if (!extension) {
    return {
      ok: false,
      error: `Format "${file.name}" tidak didukung. Gunakan gambar JPG, PNG, atau WebP.`,
    };
  }

  if (file.size <= 0) {
    return {
      ok: false,
      error: `File "${file.name}" kosong dan tidak dapat diunggah.`,
    };
  }

  if (file.size > MAX_PRODUCT_IMAGE_BYTES) {
    return {
      ok: false,
      error: `Ukuran "${file.name}" (${formatMediaFileSize(file.size)}) melebihi batas maksimal 5MB (JPG, PNG, WebP).`,
    };
  }

  return {
    ok: true,
    mimeType: normalizedMime,
    extension,
  };
}

export async function uploadProductImageFile({
  file,
  userId,
  productSlug = 'produk',
}: UploadProductImageParams): Promise<UploadedProductImage> {
  if (!isSupabaseAuthConfigured) {
    throw new Error('Konfigurasi Supabase belum aktif untuk unggah foto produk.');
  }

  const cleanUserId = userId.trim();
  if (!cleanUserId) {
    throw new Error('Sesi admin tidak valid. Silakan login ulang untuk mengunggah foto.');
  }

  const validation = validateProductImageFile(file);
  if (!validation.ok) {
    throw new Error(validation.error);
  }

  const safeSlug = slugifyProductTitle(productSlug) || 'produk';
  const sanitizedFileName = sanitizeMediaFileName(file.name, validation.extension);
  const shortId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().slice(0, 8)
      : Date.now().toString(36);
  const primaryObjectPath = `products/${safeSlug}/${Date.now()}-${shortId}-${sanitizedFileName}`;

  const supabase = getSupabaseBrowserClient();
  const primaryUpload = await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .upload(primaryObjectPath, file, {
      contentType: validation.mimeType,
      upsert: false,
    });

  if (!primaryUpload.error) {
    const {
      data: { publicUrl },
    } = supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(primaryObjectPath);

    return {
      url: publicUrl,
      path: primaryObjectPath,
      bucket: PRODUCT_IMAGES_BUCKET,
      fileName: file.name,
      size: file.size,
      usedFallbackBucket: false,
    };
  }

  // Fallback seamlessly to `post-media` if `product-images` bucket migration hasn't been applied yet
  if (isMissingBucketError(primaryUpload.error.message)) {
    const fallbackObjectPath = `${cleanUserId}/products/${Date.now()}-${shortId}-${sanitizedFileName}`;
    const fallbackUpload = await supabase.storage
      .from(FALLBACK_PRODUCT_MEDIA_BUCKET)
      .upload(fallbackObjectPath, file, {
        contentType: validation.mimeType,
        upsert: false,
      });

    if (fallbackUpload.error) {
      throw new Error(`Gagal mengunggah "${file.name}": ${fallbackUpload.error.message}`);
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(FALLBACK_PRODUCT_MEDIA_BUCKET).getPublicUrl(fallbackObjectPath);

    return {
      url: publicUrl,
      path: fallbackObjectPath,
      bucket: FALLBACK_PRODUCT_MEDIA_BUCKET,
      fileName: file.name,
      size: file.size,
      usedFallbackBucket: true,
    };
  }

  throw new Error(`Gagal mengunggah "${file.name}" ke Storage: ${primaryUpload.error.message}`);
}

export function extractProductStorageTarget(rawUrl: string): StorageObjectTarget | null {
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed.startsWith('/')) return null;

  try {
    const parsed = new URL(trimmed);
    const match = parsed.pathname.match(
      /\/storage\/v1\/object\/public\/(product-images|post-media)\/(.+)$/,
    );
    if (!match || !match[1] || !match[2]) return null;

    const bucket = match[1];
    if (bucket !== PRODUCT_IMAGES_BUCKET && bucket !== FALLBACK_PRODUCT_MEDIA_BUCKET) {
      return null;
    }

    const decodedPath = decodeURIComponent(match[2]);
    if (!decodedPath) return null;

    return { bucket, path: decodedPath };
  } catch {
    return null;
  }
}

export async function deleteProductImageFromStorage(
  rawUrl: string,
): Promise<{ readonly ok: boolean; readonly error?: string }> {
  if (!isSupabaseAuthConfigured) {
    return { ok: true };
  }

  const target = extractProductStorageTarget(rawUrl);
  if (!target) {
    return { ok: true };
  }

  try {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.storage.from(target.bucket).remove([target.path]);
    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Gagal menghapus file dari Storage.',
    };
  }
}
