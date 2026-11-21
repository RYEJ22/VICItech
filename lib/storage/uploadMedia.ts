import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export const MEDIA_BUCKET = 'post-media' as const;
export const MAX_MEDIA_FILE_BYTES = 30 * 1024 * 1024;
export const MAX_IMAGE_ATTACHMENTS = 4;

export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const ALLOWED_VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/webm',
] as const;

export const ALLOWED_MEDIA_MIME_TYPES = [
  ...ALLOWED_IMAGE_MIME_TYPES,
  ...ALLOWED_VIDEO_MIME_TYPES,
] as const;

export const MEDIA_ACCEPT_ATTRIBUTE = ALLOWED_MEDIA_MIME_TYPES.join(',');

export type UploadMediaType = 'image' | 'video';
export type UploadMediaContext = 'community' | 'dm' | 'products';

export interface UploadedMediaResult {
  readonly url: string;
  readonly path: string;
  readonly mediaType: UploadMediaType;
  readonly fileName: string;
  readonly size: number;
}

export type MediaValidationResult =
  | {
      readonly ok: true;
      readonly mediaType: UploadMediaType;
      readonly mimeType: string;
    }
  | {
      readonly ok: false;
      readonly error: string;
    };

export interface UploadMediaFileParams {
  readonly file: File;
  readonly userId: string;
  readonly context: UploadMediaContext;
}

const MIME_TO_DEFAULT_EXTENSION: Readonly<Record<string, string>> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
};

export function formatMediaFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function sanitizeMediaFileName(name: string, fallbackExt = 'bin'): string {
  const trimmed = name.trim();
  const lastDot = trimmed.lastIndexOf('.');
  const rawBase = lastDot > 0 ? trimmed.slice(0, lastDot) : trimmed;
  const rawExt = lastDot > 0 ? trimmed.slice(lastDot + 1) : '';

  const safeBase =
    rawBase
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'media';

  const safeExt =
    rawExt
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 8) || fallbackExt;

  return `${safeBase}.${safeExt}`;
}

export function validateMediaFile(file: File): MediaValidationResult {
  const normalizedMime = file.type.toLowerCase().trim();

  if ((ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(normalizedMime)) {
    if (file.size <= 0) {
      return { ok: false, error: 'File gambar kosong dan tidak dapat diunggah.' };
    }
    if (file.size > MAX_MEDIA_FILE_BYTES) {
      return {
        ok: false,
        error: `Ukuran gambar "${file.name}" (${formatMediaFileSize(file.size)}) melebihi batas 30 MB.`,
      };
    }
    return { ok: true, mediaType: 'image', mimeType: normalizedMime };
  }

  if ((ALLOWED_VIDEO_MIME_TYPES as readonly string[]).includes(normalizedMime)) {
    if (file.size <= 0) {
      return { ok: false, error: 'File video kosong dan tidak dapat diunggah.' };
    }
    if (file.size > MAX_MEDIA_FILE_BYTES) {
      return {
        ok: false,
        error: `Ukuran video "${file.name}" (${formatMediaFileSize(file.size)}) melebihi batas 30 MB.`,
      };
    }
    return { ok: true, mediaType: 'video', mimeType: normalizedMime };
  }

  return {
    ok: false,
    error: `Format "${file.name}" tidak didukung. Pilih gambar JPG, PNG, WebP atau video MP4, WebM.`,
  };
}

export async function uploadMediaFile({
  file,
  userId,
  context,
}: UploadMediaFileParams): Promise<UploadedMediaResult> {
  const cleanUserId = userId.trim();
  if (!cleanUserId) {
    throw new Error('Silakan masuk terlebih dahulu sebelum mengunggah foto atau video.');
  }

  const validation = validateMediaFile(file);
  if (!validation.ok) {
    throw new Error(validation.error);
  }

  const fallbackExt = MIME_TO_DEFAULT_EXTENSION[validation.mimeType] ?? 'bin';
  const sanitizedFileName = sanitizeMediaFileName(file.name, fallbackExt);
  const shortId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().slice(0, 6)
      : Math.random().toString(36).slice(2, 8);
  const objectPath = `${cleanUserId}/${context}/${Date.now()}-${shortId}-${sanitizedFileName}`;

  const supabase = getSupabaseBrowserClient();
  const { error: uploadError } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(objectPath, file, {
      contentType: validation.mimeType,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Gagal mengunggah "${file.name}" ke Storage: ${uploadError.message}`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(objectPath);

  return {
    url: publicUrl,
    path: objectPath,
    mediaType: validation.mediaType,
    fileName: file.name,
    size: file.size,
  };
}
