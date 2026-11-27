import type { ProfileBannerPresetId } from './profile-types';
import { PROFILE_BANNER_PRESET_IDS, isPresetBannerValue } from './profile-types';

// ── Types ──

export type BannerMediaType = 'video' | 'image' | 'preset';
export type BannerPosition = 'top' | 'center' | 'bottom';
export type BannerScrimStrength = 'subtle' | 'balanced' | 'strong';
export type AvatarFrameStyle = 'classic' | 'pixel' | 'corners' | 'double' | 'minimal';
export type ProfileAccentTrimStyle =
  | 'none'
  | 'top-rail'
  | 'left-stripe'
  | 'corner-ticks'
  | 'full-frame';
export type ProfileBadgeStyle = 'solid' | 'outline' | 'pixel';
export type ProfileSinPresetId =
  | 'none'
  | 'pride'
  | 'greed'
  | 'wrath'
  | 'sloth'
  | 'envy'
  | 'gluttony'
  | 'lust';
export type SampleVideoCanvasMode =
  | 'ruby-telemetry'
  | 'code-matrix'
  | 'thermal-flow'
  | 'workshop-bench';

export interface ProfileVisualCustomization {
  readonly bannerKind: BannerMediaType;
  readonly bannerId: string;
  readonly videoUrl: string | null;
  readonly videoPosterUrl: string | null;
  readonly imageUrl: string | null;
  readonly presetId: ProfileBannerPresetId;
  readonly bannerPosition: BannerPosition;
  readonly bannerScrim: BannerScrimStrength;
  readonly avatarFrame: AvatarFrameStyle;
  readonly accentTrim: ProfileAccentTrimStyle;
  readonly badgeStyle: ProfileBadgeStyle;
  readonly customRoleLine: string;
  readonly sinPreset: ProfileSinPresetId;
}

export interface BannerCatalogItem {
  readonly id: string;
  readonly mediaType: BannerMediaType;
  readonly label: { readonly id: string; readonly en: string };
  readonly presetId?: ProfileBannerPresetId;
  readonly imageUrl?: string;
  readonly posterUrl?: string;
  readonly sampleCanvasMode?: SampleVideoCanvasMode;
  readonly isSample?: boolean;
}

export interface SinPresetMeta {
  readonly id: ProfileSinPresetId;
  readonly label: { readonly id: string; readonly en: string };
  readonly personaTag: { readonly id: string; readonly en: string };
  readonly description: { readonly id: string; readonly en: string };
  readonly lightAccent: string;
  readonly darkAccent: string;
  readonly recommendedAccent: string;
}

// ── Constants ──

export const MAX_CUSTOM_ROLE_LINE_LENGTH = 48;
export const MAX_INLINE_VIDEO_BYTES = 2.5 * 1024 * 1024;
export const MAX_UPLOAD_VIDEO_BYTES = 15 * 1024 * 1024;
export const PROFILE_STYLE_STORAGE_PREFIX = 'vici_profile_style_v1:';
export const PROFILE_STYLE_UPDATED_EVENT = 'vicitech:profile-style-updated';

export const DEFAULT_PROFILE_VISUAL_STYLE: ProfileVisualCustomization = {
  bannerKind: 'preset',
  bannerId: 'preset:alabaster-grid',
  videoUrl: null,
  videoPosterUrl: null,
  imageUrl: null,
  presetId: 'alabaster-grid',
  bannerPosition: 'center',
  bannerScrim: 'balanced',
  avatarFrame: 'classic',
  accentTrim: 'none',
  badgeStyle: 'outline',
  customRoleLine: '',
  sinPreset: 'none',
};

export const BANNER_CATALOG_ITEMS: readonly BannerCatalogItem[] = [
  {
    id: 'video:ruby-telemetry',
    mediaType: 'video',
    label: { id: 'Loop Telemetri Ruby', en: 'Ruby Telemetry Loop' },
    posterUrl: '/images/hero/pc-rig.jpg',
    sampleCanvasMode: 'ruby-telemetry',
    isSample: true,
  },
  {
    id: 'video:code-matrix',
    mediaType: 'video',
    label: { id: 'Aliran Kode Terminal', en: 'Terminal Code Pulse' },
    posterUrl: '/images/hero/code-screen.jpg',
    sampleCanvasMode: 'code-matrix',
    isSample: true,
  },
  {
    id: 'video:thermal-flow',
    mediaType: 'video',
    label: { id: 'Aliran Termal Lab', en: 'Thermal Bench Flow' },
    posterUrl: '/images/hero/thermal-paste.jpg',
    sampleCanvasMode: 'thermal-flow',
    isSample: true,
  },
  {
    id: 'video:workshop-bench',
    mediaType: 'video',
    label: { id: 'Sapuan Smart Bench', en: 'Smart Bench Sweep' },
    posterUrl: '/images/hero/repair-tech.jpg',
    sampleCanvasMode: 'workshop-bench',
    isSample: true,
  },
  {
    id: 'image:pc-rig',
    mediaType: 'image',
    label: { id: 'Rig PC Kustom', en: 'Custom PC Rig' },
    imageUrl: '/images/hero/pc-rig.jpg',
  },
  {
    id: 'image:code-screen',
    mediaType: 'image',
    label: { id: 'Terminal Dev', en: 'Dev Terminal' },
    imageUrl: '/images/hero/code-screen.jpg',
  },
  {
    id: 'image:repair-tech',
    mediaType: 'image',
    label: { id: 'Lab Perangkat Keras', en: 'Hardware Lab' },
    imageUrl: '/images/hero/repair-tech.jpg',
  },
  {
    id: 'image:thermal-paste',
    mediaType: 'image',
    label: { id: 'Presisi Termal', en: 'Thermal Precision' },
    imageUrl: '/images/hero/thermal-paste.jpg',
  },
  {
    id: 'preset:alabaster-grid',
    mediaType: 'preset',
    presetId: 'alabaster-grid',
    label: { id: 'Alabaster Grid', en: 'Alabaster Grid' },
  },
  {
    id: 'preset:ember-horizon',
    mediaType: 'preset',
    presetId: 'ember-horizon',
    label: { id: 'Senja ViciTech', en: 'Ember Horizon' },
  },
  {
    id: 'preset:graphite-circuit',
    mediaType: 'preset',
    presetId: 'graphite-circuit',
    label: { id: 'Sirkuit Grafit', en: 'Graphite Circuit' },
  },
  {
    id: 'preset:emerald-bench',
    mediaType: 'preset',
    presetId: 'emerald-bench',
    label: { id: 'Smart Bench Emerald', en: 'Emerald Smart Bench' },
  },
  {
    id: 'preset:indigo-blueprint',
    mediaType: 'preset',
    presetId: 'indigo-blueprint',
    label: { id: 'Cetak Biru Teknis', en: 'Technical Blueprint' },
  },
];

export const SEVEN_DEADLY_SINS_PRESETS: readonly SinPresetMeta[] = [
  {
    id: 'none',
    label: { id: 'Standar', en: 'Default' },
    personaTag: { id: '', en: '' },
    description: { id: 'Tampilan bersih tanpa trim khusus.', en: 'Clean look without persona trim.' },
    lightAccent: '#C2410C',
    darkAccent: '#E11D48',
    recommendedAccent: '#C2410C',
  },
  {
    id: 'pride',
    label: { id: 'Pride', en: 'Pride' },
    personaTag: { id: 'Arsitek Rig Utama', en: 'Sovereign Rig Architect' },
    description: { id: 'Aksen emas obsidian untuk rig flagship.', en: 'Obsidian gold trim for flagship builds.' },
    lightAccent: '#B45309',
    darkAccent: '#F59E0B',
    recommendedAccent: '#B45309',
  },
  {
    id: 'greed',
    label: { id: 'Greed', en: 'Greed' },
    personaTag: { id: 'Kolektor Spek & OC', en: 'Spec Collector & OC' },
    description: { id: 'Trim zamrud untuk pemburu spek tinggi.', en: 'Emerald trim for spec-hungry builders.' },
    lightAccent: '#047857',
    darkAccent: '#10B981',
    recommendedAccent: '#047857',
  },
  {
    id: 'wrath',
    label: { id: 'Wrath', en: 'Wrath' },
    personaTag: { id: 'Penguji Beban Maksimal', en: 'Max-TDP Striker' },
    description: { id: 'Merah menyala untuk stres tes ekstrem.', en: 'Crimson signal trim for stress-testers.' },
    lightAccent: '#DC2626',
    darkAccent: '#E11D48',
    recommendedAccent: '#DC2626',
  },
  {
    id: 'sloth',
    label: { id: 'Sloth', en: 'Sloth' },
    personaTag: { id: 'Rakitan Senyap Zero-dB', en: 'Zero-dB Silent Build' },
    description: { id: 'Nada slate tenang untuk sistem sunyi.', en: 'Calm slate finish for silent acoustic rigs.' },
    lightAccent: '#475569',
    darkAccent: '#94A3B8',
    recommendedAccent: '#475569',
  },
  {
    id: 'envy',
    label: { id: 'Envy', en: 'Envy' },
    personaTag: { id: 'Part Langka & Custom Loop', en: 'Rare Parts & Loop' },
    description: { id: 'Teal presisi untuk modder & loop kustom.', en: 'Precision teal trim for custom loop modders.' },
    lightAccent: '#0F766E',
    darkAccent: '#14B8A6',
    recommendedAccent: '#0F766E',
  },
  {
    id: 'gluttony',
    label: { id: 'Gluttony', en: 'Gluttony' },
    personaTag: { id: 'RAM & Storage Tanpa Batas', en: 'Max RAM & Storage' },
    description: { id: 'Oranye hangat untuk workstation masif.', en: 'Amber-orange trim for heavy workstations.' },
    lightAccent: '#C2410C',
    darkAccent: '#FB923C',
    recommendedAccent: '#C2410C',
  },
  {
    id: 'lust',
    label: { id: 'Lust', en: 'Lust' },
    personaTag: { id: 'Kurator Estetika Showcase', en: 'Showcase Curator' },
    description: { id: 'Magenta-ruby untuk setup visual terbaik.', en: 'Ruby-magenta trim for aesthetic showcases.' },
    lightAccent: '#BE185D',
    darkAccent: '#F43F5E',
    recommendedAccent: '#BE185D',
  },
];

// ── Helpers & Validation ──

const DATA_VIDEO_URL_RE = /^data:video\/(?:mp4|webm);base64,[A-Za-z0-9+/=]+$/i;
const DATA_IMAGE_URL_RE = /^data:image\/(?:jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/i;
const VIDEO_PATH_EXT_RE = /\.(?:mp4|webm)(?:$|[?#])/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function getSinPresetMeta(id: ProfileSinPresetId): SinPresetMeta {
  return SEVEN_DEADLY_SINS_PRESETS.find((item) => item.id === id) ?? SEVEN_DEADLY_SINS_PRESETS[0]!;
}

export function findBannerCatalogItem(bannerId: string): BannerCatalogItem | undefined {
  return BANNER_CATALOG_ITEMS.find((item) => item.id === bannerId);
}

export function isValidVideoBannerUrl(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return false;
  if (DATA_VIDEO_URL_RE.test(trimmed) || trimmed.startsWith('blob:')) {
    return true;
  }
  if (trimmed.startsWith('/videos/') && VIDEO_PATH_EXT_RE.test(trimmed)) {
    return true;
  }
  try {
    const parsed = new URL(trimmed);
    const allowedOrigin =
      parsed.protocol === 'https:' ||
      (parsed.protocol === 'http:' &&
        (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1'));
    if (!allowedOrigin) return false;
    return VIDEO_PATH_EXT_RE.test(parsed.pathname);
  } catch {
    return false;
  }
}

export function isValidImageBannerUrl(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('/images/') || DATA_IMAGE_URL_RE.test(trimmed)) {
    return true;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:') return true;
    return (
      parsed.protocol === 'http:' &&
      (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')
    );
  } catch {
    return false;
  }
}

export function normalizeProfileVisualStyle(raw: unknown): ProfileVisualCustomization {
  if (!isRecord(raw)) {
    return DEFAULT_PROFILE_VISUAL_STYLE;
  }

  const bannerKind: BannerMediaType =
    raw.bannerKind === 'video' || raw.bannerKind === 'image' || raw.bannerKind === 'preset'
      ? raw.bannerKind
      : 'preset';

  const rawBannerId = typeof raw.bannerId === 'string' ? raw.bannerId.trim() : '';
  const rawPresetId = typeof raw.presetId === 'string' ? raw.presetId.trim() : '';
  const presetId: ProfileBannerPresetId = (PROFILE_BANNER_PRESET_IDS as readonly string[]).includes(
    rawPresetId,
  )
    ? (rawPresetId as ProfileBannerPresetId)
    : isPresetBannerValue(rawBannerId)
      ? (rawBannerId.slice('preset:'.length) as ProfileBannerPresetId)
      : 'alabaster-grid';

  const rawVideoUrl = typeof raw.videoUrl === 'string' ? raw.videoUrl.trim() : '';
  const rawPosterUrl = typeof raw.videoPosterUrl === 'string' ? raw.videoPosterUrl.trim() : '';
  const rawImageUrl = typeof raw.imageUrl === 'string' ? raw.imageUrl.trim() : '';

  const bannerPosition: BannerPosition =
    raw.bannerPosition === 'top' || raw.bannerPosition === 'bottom' ? raw.bannerPosition : 'center';
  const bannerScrim: BannerScrimStrength =
    raw.bannerScrim === 'subtle' || raw.bannerScrim === 'strong' ? raw.bannerScrim : 'balanced';
  const avatarFrame: AvatarFrameStyle =
    raw.avatarFrame === 'pixel' ||
    raw.avatarFrame === 'corners' ||
    raw.avatarFrame === 'double' ||
    raw.avatarFrame === 'minimal'
      ? raw.avatarFrame
      : 'classic';

  const rawSin = typeof raw.sinPreset === 'string' ? raw.sinPreset : 'none';
  const sinPreset: ProfileSinPresetId = SEVEN_DEADLY_SINS_PRESETS.some((s) => s.id === rawSin)
    ? (rawSin as ProfileSinPresetId)
    : 'none';

  const accentTrim: ProfileAccentTrimStyle =
    raw.accentTrim === 'none' ||
    raw.accentTrim === 'top-rail' ||
    raw.accentTrim === 'left-stripe' ||
    raw.accentTrim === 'corner-ticks' ||
    raw.accentTrim === 'full-frame'
      ? raw.accentTrim
      : sinPreset !== 'none'
        ? 'top-rail'
        : 'none';

  const badgeStyle: ProfileBadgeStyle =
    raw.badgeStyle === 'solid' || raw.badgeStyle === 'pixel' ? raw.badgeStyle : 'outline';

  const customRoleLine =
    typeof raw.customRoleLine === 'string'
      ? raw.customRoleLine.trim().slice(0, MAX_CUSTOM_ROLE_LINE_LENGTH)
      : '';

  const catalogMatch = findBannerCatalogItem(rawBannerId);
  let resolvedBannerId = rawBannerId || `preset:${presetId}`;
  if (bannerKind === 'preset' && !isPresetBannerValue(resolvedBannerId)) {
    resolvedBannerId = `preset:${presetId}`;
  } else if (bannerKind === 'video' && catalogMatch?.mediaType === 'video') {
    resolvedBannerId = catalogMatch.id;
  } else if (bannerKind === 'video' && !isValidVideoBannerUrl(rawVideoUrl) && !catalogMatch) {
    resolvedBannerId = 'video:ruby-telemetry';
  }

  return {
    bannerKind,
    bannerId: resolvedBannerId,
    videoUrl: rawVideoUrl && isValidVideoBannerUrl(rawVideoUrl) ? rawVideoUrl : null,
    videoPosterUrl: rawPosterUrl && isValidImageBannerUrl(rawPosterUrl) ? rawPosterUrl : null,
    imageUrl: rawImageUrl && isValidImageBannerUrl(rawImageUrl) ? rawImageUrl : null,
    presetId,
    bannerPosition,
    bannerScrim,
    avatarFrame,
    accentTrim,
    badgeStyle,
    customRoleLine,
    sinPreset,
  };
}

function resolveStorageKey(userId: string): string {
  return `${PROFILE_STYLE_STORAGE_PREFIX}${userId.trim() || 'default'}`;
}

export function loadProfileVisualStyle(userId: string): ProfileVisualCustomization {
  if (typeof window === 'undefined') {
    return DEFAULT_PROFILE_VISUAL_STYLE;
  }
  try {
    const raw = window.localStorage.getItem(resolveStorageKey(userId));
    if (!raw) return DEFAULT_PROFILE_VISUAL_STYLE;
    const parsed: unknown = JSON.parse(raw);
    return normalizeProfileVisualStyle(parsed);
  } catch {
    return DEFAULT_PROFILE_VISUAL_STYLE;
  }
}

export function saveProfileVisualStyle(
  userId: string,
  style: ProfileVisualCustomization,
): { readonly saved: ProfileVisualCustomization; readonly strippedInlineVideo: boolean } {
  const normalized = normalizeProfileVisualStyle(style);
  if (typeof window === 'undefined') {
    return { saved: normalized, strippedInlineVideo: false };
  }

  const key = resolveStorageKey(userId);
  let persisted = normalized;
  let strippedInlineVideo = false;

  // Avoid saving ephemeral blob URLs across reloads while preserving current in-memory preview
  const isBlobVideo = Boolean(persisted.videoUrl?.startsWith('blob:'));
  const toPersist: ProfileVisualCustomization = isBlobVideo
    ? { ...persisted, videoUrl: null }
    : persisted;

  try {
    window.localStorage.setItem(key, JSON.stringify(toPersist));
  } catch {
    strippedInlineVideo = Boolean(toPersist.videoUrl?.startsWith('data:video/'));
    const compactCopy: ProfileVisualCustomization = {
      ...toPersist,
      videoUrl: strippedInlineVideo ? null : toPersist.videoUrl,
    };
    persisted = compactCopy;
    try {
      window.localStorage.setItem(key, JSON.stringify(compactCopy));
    } catch {
      // Ignore quota errors cleanly; state remains active for current session
    }
  }

  window.dispatchEvent(
    new CustomEvent(PROFILE_STYLE_UPDATED_EVENT, {
      detail: { userId: userId.trim() || 'default', style: normalized },
    }),
  );

  return { saved: normalized, strippedInlineVideo };
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Gagal membaca file video.'));
      }
    };
    reader.onerror = () => reject(new Error('Gagal membaca file video.'));
    reader.readAsDataURL(file);
  });
}

function extractVideoPosterFrame(objectUrl: string): Promise<string> {
  if (typeof document === 'undefined') {
    return Promise.resolve('/images/hero/pc-rig.jpg');
  }

  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';

    let settled = false;
    const finish = (poster: string) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      video.removeAttribute('src');
      video.load();
      resolve(poster);
    };

    const timeoutId = window.setTimeout(() => finish('/images/hero/pc-rig.jpg'), 2500);

    video.onloadeddata = () => {
      const seekTarget = Number.isFinite(video.duration) && video.duration > 0.2 ? 0.15 : 0;
      try {
        video.currentTime = seekTarget;
      } catch {
        // Seek not supported; capture immediately
        captureFrame();
      }
    };

    const captureFrame = () => {
      try {
        const vw = video.videoWidth || 960;
        const vh = video.videoHeight || 384;
        const scale = Math.min(1, 960 / vw, 384 / vh);
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(vw * scale));
        canvas.height = Math.max(1, Math.round(vh * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          finish('/images/hero/pc-rig.jpg');
          return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        let dataUrl = canvas.toDataURL('image/webp', 0.8);
        if (!dataUrl.startsWith('data:image/webp')) {
          dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        }
        finish(dataUrl);
      } catch {
        finish('/images/hero/pc-rig.jpg');
      }
    };

    video.onseeked = captureFrame;
    video.onerror = () => finish('/images/hero/pc-rig.jpg');
    video.src = objectUrl;
  });
}

/** Validates a local MP4/WebM file, extracts a static poster thumbnail, and prepares inline storage when compact. */
export async function prepareLocalVideoBannerFile(file: File): Promise<{
  readonly videoUrl: string;
  readonly persistedVideoUrl: string | null;
  readonly posterUrl: string;
  readonly oversizedForStorage: boolean;
}> {
  const normalizedType = file.type.toLowerCase().trim();
  const isAllowed = normalizedType === 'video/mp4' || normalizedType === 'video/webm';
  if (!isAllowed) {
    throw new Error('Format video tidak didukung. Pilih file .mp4 atau .webm.');
  }
  if (file.size <= 0) {
    throw new Error('File video kosong dan tidak dapat diputar.');
  }
  if (file.size > MAX_UPLOAD_VIDEO_BYTES) {
    throw new Error('Ukuran video melebihi batas maksimal 15 MB.');
  }

  const objectUrl = URL.createObjectURL(file);
  const posterUrl = await extractVideoPosterFrame(objectUrl);

  if (file.size <= MAX_INLINE_VIDEO_BYTES) {
    try {
      const dataUrl = await readFileAsDataUrl(file);
      URL.revokeObjectURL(objectUrl);
      return {
        videoUrl: dataUrl,
        persistedVideoUrl: dataUrl,
        posterUrl,
        oversizedForStorage: false,
      };
    } catch {
      return {
        videoUrl: objectUrl,
        persistedVideoUrl: null,
        posterUrl,
        oversizedForStorage: true,
      };
    }
  }

  return {
    videoUrl: objectUrl,
    persistedVideoUrl: null,
    posterUrl,
    oversizedForStorage: true,
  };
}
