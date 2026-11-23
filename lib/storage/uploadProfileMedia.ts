import { getSupabaseBrowserClient, isSupabaseAuthConfigured } from '@/lib/supabase/client';
import { formatMediaFileSize, sanitizeMediaFileName } from './uploadMedia';

export const PROFILE_MEDIA_BUCKET = 'profile-media' as const;
export const FALLBACK_PROFILE_MEDIA_BUCKET = 'post-media' as const;
export const MAX_PROFILE_MEDIA_BYTES = 3 * 1024 * 1024;

export const ALLOWED_PROFILE_IMAGE_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const PROFILE_MEDIA_ACCEPT = ALLOWED_PROFILE_IMAGE_MIMES.join(',');

const MIME_TO_EXTENSION: Readonly<Record<string, string>> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export type ProfileMediaKind = 'avatar' | 'banner';

export type ProfileMediaValidationResult =
  | {
      readonly ok: true;
      readonly mimeType: string;
      readonly extension: string;
    }
  | {
      readonly ok: false;
      readonly error: string;
    };

export interface UploadProfileMediaParams {
  readonly file: File;
  readonly userId: string;
  readonly kind: ProfileMediaKind;
}

export interface UploadedProfileMedia {
  readonly url: string;
  readonly path: string;
  readonly bucket: typeof PROFILE_MEDIA_BUCKET | typeof FALLBACK_PROFILE_MEDIA_BUCKET | 'inline-data';
  readonly usedFallbackBucket: boolean;
}

function shouldTryFallbackStorage(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('bucket not found') ||
    lower.includes('404') ||
    lower.includes('row-level security') ||
    lower.includes('unauthorized') ||
    lower.includes('permission')
  );
}

async function compressProfileImageToDataUrl(
  file: File,
  kind: ProfileMediaKind,
): Promise<string> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('Pemrosesan gambar hanya tersedia di browser.');
  }

  const maxWidth = kind === 'avatar' ? 320 : 1200;
  const maxHeight = kind === 'avatar' ? 320 : 480;

  return new Promise<string>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      try {
        let targetW = img.naturalWidth || maxWidth;
        let targetH = img.naturalHeight || maxHeight;
        const scale = Math.min(1, maxWidth / targetW, maxHeight / targetH);
        targetW = Math.max(1, Math.round(targetW * scale));
        targetH = Math.max(1, Math.round(targetH * scale));

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Gagal menyiapkan kanvas gambar.'));
          return;
        }
        ctx.drawImage(img, 0, 0, targetW, targetH);
        let dataUrl = canvas.toDataURL('image/webp', 0.84);
        if (!dataUrl.startsWith('data:image/webp')) {
          dataUrl = canvas.toDataURL('image/jpeg', 0.84);
        }
        resolve(dataUrl);
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Gagal mengompres gambar profil.'));
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`File gambar "${file.name}" tidak dapat dibaca.`));
    };
    img.src = objectUrl;
  });
}

export function validateProfileMediaFile(file: File): ProfileMediaValidationResult {
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

  if (file.size > MAX_PROFILE_MEDIA_BYTES) {
    return {
      ok: false,
      error: `Ukuran "${file.name}" (${formatMediaFileSize(file.size)}) melebihi batas maksimal 3 MB.`,
    };
  }

  return {
    ok: true,
    mimeType: normalizedMime,
    extension,
  };
}

export async function uploadProfileMediaFile({
  file,
  userId,
  kind,
}: UploadProfileMediaParams): Promise<UploadedProfileMedia> {
  if (!isSupabaseAuthConfigured) {
    throw new Error('Konfigurasi Supabase belum aktif untuk mengunggah media profil.');
  }

  const cleanUserId = userId.trim();
  if (!cleanUserId) {
    throw new Error('Silakan masuk terlebih dahulu untuk mengunggah media profil.');
  }

  const validation = validateProfileMediaFile(file);
  if (!validation.ok) {
    throw new Error(validation.error);
  }

  const sanitizedName = sanitizeMediaFileName(file.name, validation.extension);
  const shortId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().slice(0, 8)
      : Date.now().toString(36);
  const objectPath = `${cleanUserId}/${kind}/${Date.now()}-${shortId}-${sanitizedName}`;

  const supabase = getSupabaseBrowserClient();
  const primaryUpload = await supabase.storage
    .from(PROFILE_MEDIA_BUCKET)
    .upload(objectPath, file, {
      contentType: validation.mimeType,
      upsert: true,
    });

  if (!primaryUpload.error) {
    const {
      data: { publicUrl },
    } = supabase.storage.from(PROFILE_MEDIA_BUCKET).getPublicUrl(objectPath);

    return {
      url: publicUrl,
      path: objectPath,
      bucket: PROFILE_MEDIA_BUCKET,
      usedFallbackBucket: false,
    };
  }

  if (shouldTryFallbackStorage(primaryUpload.error.message)) {
    const fallbackPath = `${cleanUserId}/profile-${kind}/${Date.now()}-${shortId}-${sanitizedName}`;
    const fallbackUpload = await supabase.storage
      .from(FALLBACK_PROFILE_MEDIA_BUCKET)
      .upload(fallbackPath, file, {
        contentType: validation.mimeType,
        upsert: true,
      });

    if (!fallbackUpload.error) {
      const {
        data: { publicUrl },
      } = supabase.storage.from(FALLBACK_PROFILE_MEDIA_BUCKET).getPublicUrl(fallbackPath);

      return {
        url: publicUrl,
        path: fallbackPath,
        bucket: FALLBACK_PROFILE_MEDIA_BUCKET,
        usedFallbackBucket: true,
      };
    }

    // Jika bucket Storage belum dibuat atau terkendala RLS, simpan dalam format Data URL terkompresi
    const inlineDataUrl = await compressProfileImageToDataUrl(file, kind);
    return {
      url: inlineDataUrl,
      path: `inline/${cleanUserId}/${kind}`,
      bucket: 'inline-data',
      usedFallbackBucket: true,
    };
  }

  throw new Error(`Gagal mengunggah gambar ke Storage: ${primaryUpload.error.message}`);
}
