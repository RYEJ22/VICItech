export const PROFILE_ACCENT_SWATCHES = [
  { hex: '#C2410C', label: 'Oranye ViciTech' },
  { hex: '#0F766E', label: 'Teal Studio' },
  { hex: '#1D4ED8', label: 'Biru Cobalt' },
  { hex: '#7C3AED', label: 'Ungu Kreator' },
  { hex: '#18181B', label: 'Charcoal Editorial' },
] as const;

export const DEFAULT_PROFILE_ACCENT_COLOR = '#C2410C' as const;

export const PROFILE_BANNER_PRESET_IDS = [
  'alabaster-grid',
  'ember-horizon',
  'graphite-circuit',
  'emerald-bench',
  'indigo-blueprint',
] as const;

export type ProfileBannerPresetId = (typeof PROFILE_BANNER_PRESET_IDS)[number];

export const PROFILE_BANNER_PRESETS: readonly {
  readonly id: ProfileBannerPresetId;
  readonly value: `preset:${ProfileBannerPresetId}`;
  readonly label: string;
}[] = [
  { id: 'alabaster-grid', value: 'preset:alabaster-grid', label: 'Alabaster Grid' },
  { id: 'ember-horizon', value: 'preset:ember-horizon', label: 'Senja ViciTech' },
  { id: 'graphite-circuit', value: 'preset:graphite-circuit', label: 'Sirkuit Grafit' },
  { id: 'emerald-bench', value: 'preset:emerald-bench', label: 'Smart Bench Emerald' },
  { id: 'indigo-blueprint', value: 'preset:indigo-blueprint', label: 'Cetak Biru Teknis' },
];

export const PROFILE_TABS = ['overview', 'orders', 'settings'] as const;
export type ProfileTabId = (typeof PROFILE_TABS)[number];

export const PROFILE_USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;
export const PROFILE_ACCENT_REGEX = /^#[0-9A-Fa-f]{6}$/;
export const MAX_BIO_LENGTH = 160;
export const MAX_STATUS_LENGTH = 60;
export const MAX_FEATURED_RIG_LENGTH = 100;
export const MAX_DISPLAY_NAME_LENGTH = 80;

export interface UnifiedProfile {
  readonly id: string;
  readonly username: string;
  readonly displayName: string;
  readonly avatarUrl: string | null;
  readonly bannerUrl: string | null;
  readonly bio: string | null;
  readonly statusText: string | null;
  readonly accentColor: string;
  readonly featuredRig: string | null;
  readonly role: string;
  readonly createdAt: string | null;
  readonly updatedAt: string | null;
}

export interface ProfileFormDraft {
  readonly username: string;
  readonly displayName: string;
  readonly avatarUrl: string;
  readonly bannerUrl: string;
  readonly bio: string;
  readonly statusText: string;
  readonly accentColor: string;
  readonly featuredRig: string;
}

export interface ProfileAuthFallback {
  readonly id?: string | undefined;
  readonly email?: string | undefined;
  readonly createdAt?: string | undefined;
  readonly metadata?: unknown | undefined;
}

export type ProfileValidationResult =
  | {
      readonly ok: true;
      readonly normalized: ProfileFormDraft;
    }
  | {
      readonly ok: false;
      readonly error: string;
    };

export interface ProfileCommunityPost {
  readonly id: string;
  readonly title: string;
  readonly category: string;
  readonly likesCount: number;
  readonly mediaUrls: readonly string[];
  readonly createdAt: string;
}

export interface ProfileSavedPreset {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly qty: number;
  readonly unitTotal: number;
  readonly partsCount: number;
  readonly createdAt: string;
}

export interface ProfileSharedBuild {
  readonly id: string;
  readonly title: string;
  readonly createdAt: string;
}

export interface ProfileOrderItemSummary {
  readonly name: string;
  readonly label: string | null;
  readonly quantity: number;
  readonly unitPrice: number;
}

export interface ProfileOrderRecord {
  readonly id: string;
  readonly orderNumber: string | null;
  readonly productName: string;
  readonly status: string;
  readonly totalPrice: number;
  readonly serialNumber: string | null;
  readonly cancelReason: string | null;
  readonly cancelledAt: string | null;
  readonly itemsSummary: readonly ProfileOrderItemSummary[];
  readonly createdAt: string;
}

export const ORDER_CANCEL_REASONS: readonly string[] = [
  'Salah pilih spesifikasi',
  'Ubah metode pembayaran',
  'Ingin ganti produk lain',
  'Lainnya',
] as const;

export interface OrderStatusMeta {
  readonly label: string;
  readonly badgeClass: string;
  readonly canCancel: boolean;
  readonly isCancelled: boolean;
}

export function getOrderStatusMeta(rawStatus: string): OrderStatusMeta {
  const normalized = rawStatus.trim().toLowerCase();

  if (normalized === 'cancelled' || normalized === 'canceled' || normalized === 'dibatalkan') {
    return {
      label: 'Dibatalkan',
      badgeClass: 'border-red-200 bg-red-50 text-red-700',
      canCancel: false,
      isCancelled: true,
    };
  }

  if (
    normalized === 'completed' ||
    normalized === 'done' ||
    normalized === 'delivered' ||
    normalized === 'selesai'
  ) {
    return {
      label: 'Selesai',
      badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-800',
      canCancel: false,
      isCancelled: false,
    };
  }

  if (normalized === 'shipped' || normalized === 'in_transit' || normalized === 'dikirim') {
    return {
      label: 'Dikirim',
      badgeClass: 'border-sky-200 bg-sky-50 text-sky-800',
      canCancel: false,
      isCancelled: false,
    };
  }

  if (
    normalized === 'processing' ||
    normalized === 'qc_in_progress' ||
    normalized === 'diproses'
  ) {
    return {
      label: 'Diproses',
      badgeClass: 'border-amber-200 bg-amber-50 text-amber-800',
      canCancel: true,
      isCancelled: false,
    };
  }

  if (
    normalized === 'pending' ||
    normalized === 'unpaid' ||
    normalized === 'awaiting_payment' ||
    normalized === 'menunggu pembayaran'
  ) {
    return {
      label: 'Menunggu Pembayaran',
      badgeClass: 'border-[#EA580C]/25 bg-[#FFF7ED] text-[#C2410C]',
      canCancel: true,
      isCancelled: false,
    };
  }

  if (normalized === 'pending_qc' || normalized === 'iot stress-test pending') {
    return {
      label: 'Menunggu Uji QC',
      badgeClass: 'border-[#EA580C]/25 bg-[#FFF7ED] text-[#C2410C]',
      canCancel: true,
      isCancelled: false,
    };
  }

  return {
    label: rawStatus.trim() || 'Diproses',
    badgeClass: 'border-[#E4E4E7] bg-[#F3F1ED] text-[#18181B]',
    canCancel: false,
    isCancelled: false,
  };
}

export interface ProfileQcReportRecord {
  readonly id: string;
  readonly overallStatus: string;
  readonly environment: string;
  readonly createdAt: string;
}

export interface ProfileWorkspaceData {
  readonly posts: readonly ProfileCommunityPost[];
  readonly sharedBuilds: readonly ProfileSharedBuild[];
  readonly presets: readonly ProfileSavedPreset[];
  readonly orders: readonly ProfileOrderRecord[];
  readonly qcReports: readonly ProfileQcReportRecord[];
  readonly stats: {
    readonly communityPosts: number;
    readonly savedPresets: number;
    readonly sharedBuilds: number;
  };
}

function toRecord(raw: unknown): Readonly<Record<string, unknown>> {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return {};
  }
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    result[k] = v;
  }
  return result;
}

function readCleanStr(rec: Readonly<Record<string, unknown>>, keys: readonly string[]): string | null {
  for (const key of keys) {
    const val = rec[key];
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (trimmed) return trimmed;
    }
  }
  return null;
}

const DATA_IMAGE_URL_RE = /^data:image\/(?:jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/i;

export function isValidHttpOrLocalUrl(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return false;
  if (DATA_IMAGE_URL_RE.test(trimmed)) return true;
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

export function isPresetBannerValue(raw: string | null | undefined): raw is `preset:${ProfileBannerPresetId}` {
  if (!raw || !raw.startsWith('preset:')) return false;
  const candidate = raw.slice('preset:'.length);
  return (PROFILE_BANNER_PRESET_IDS as readonly string[]).includes(candidate);
}

export function resolveBannerMode(
  bannerUrl: string | null,
): { readonly kind: 'image'; readonly src: string } | { readonly kind: 'preset'; readonly presetId: ProfileBannerPresetId } {
  const trimmed = bannerUrl?.trim() ?? '';
  if (isPresetBannerValue(trimmed)) {
    const rawId = trimmed.slice('preset:'.length);
    const matched = PROFILE_BANNER_PRESET_IDS.find((id) => id === rawId);
    return { kind: 'preset', presetId: matched ?? 'alabaster-grid' };
  }
  if (trimmed && isValidHttpOrLocalUrl(trimmed)) {
    return { kind: 'image', src: trimmed };
  }
  return { kind: 'preset', presetId: 'alabaster-grid' };
}

export function resolveProfileRoleLabel(role: string): 'Admin' | 'Builder' | 'Member' {
  const lower = role.trim().toLowerCase();
  if (lower === 'admin') return 'Admin';
  if (lower === 'creator' || lower === 'builder') return 'Builder';
  return 'Member';
}

export function normalizeProfileRecord(
  raw: unknown,
  authFallback?: ProfileAuthFallback,
): UnifiedProfile {
  const row = toRecord(raw);
  const rowId = readCleanStr(row, ['id']);
  // Hanya gunakan authFallback apabila row milik user yang sama (atau row belum memiliki id pada mode self)
  const canUseAuthFallback = Boolean(
    authFallback && (!rowId || (authFallback.id && rowId === authFallback.id)),
  );
  const safeFallback = canUseAuthFallback ? authFallback : undefined;
  const meta = toRecord(safeFallback?.metadata);

  const id = rowId ?? safeFallback?.id ?? '';
  const emailPrefix = (safeFallback?.email ?? '').split('@')[0] ?? 'member';
  const sanitizedEmailPrefix = emailPrefix.toLowerCase().replace(/[^a-z0-9_]/g, '') || 'member';
  const usernameRaw =
    readCleanStr(row, ['username']) ??
    readCleanStr(meta, ['username', 'preferred_username']) ??
    sanitizedEmailPrefix.slice(0, 20);
  const username = usernameRaw.toLowerCase();

  const displayName =
    readCleanStr(row, ['display_name', 'full_name']) ??
    readCleanStr(meta, ['full_name', 'display_name', 'name']) ??
    username ??
    'Anggota ViciTech';

  const avatarUrl =
    readCleanStr(row, ['avatar_url']) ?? readCleanStr(meta, ['avatar_url']);
  const bannerRaw =
    readCleanStr(row, ['banner_url']) ?? readCleanStr(meta, ['banner_url']);
  const bioRaw = readCleanStr(row, ['bio']) ?? readCleanStr(meta, ['bio']);
  const statusRaw =
    readCleanStr(row, ['status_text']) ?? readCleanStr(meta, ['status_text']);
  const accentRaw =
    readCleanStr(row, ['accent_color']) ?? readCleanStr(meta, ['accent_color']);
  const rigRaw =
    readCleanStr(row, ['featured_rig']) ?? readCleanStr(meta, ['featured_rig']);

  const accentColor =
    accentRaw && PROFILE_ACCENT_REGEX.test(accentRaw)
      ? accentRaw.toUpperCase()
      : DEFAULT_PROFILE_ACCENT_COLOR;

  const createdAt =
    readCleanStr(row, ['created_at']) ??
    safeFallback?.createdAt ??
    readCleanStr(row, ['updated_at']);
  const updatedAt = readCleanStr(row, ['updated_at']);
  const role = readCleanStr(row, ['role']) ?? 'user';

  return {
    id,
    username,
    displayName,
    avatarUrl: avatarUrl && isValidHttpOrLocalUrl(avatarUrl) ? avatarUrl : null,
    bannerUrl:
      bannerRaw && (isPresetBannerValue(bannerRaw) || isValidHttpOrLocalUrl(bannerRaw))
        ? bannerRaw
        : null,
    bio: bioRaw ? bioRaw.slice(0, MAX_BIO_LENGTH) : null,
    statusText: statusRaw ? statusRaw.slice(0, MAX_STATUS_LENGTH) : null,
    accentColor,
    featuredRig: rigRaw ? rigRaw.slice(0, MAX_FEATURED_RIG_LENGTH) : null,
    role,
    createdAt,
    updatedAt,
  };
}

export function profileToDraft(profile: UnifiedProfile): ProfileFormDraft {
  return {
    username: profile.username,
    displayName: profile.displayName,
    avatarUrl: profile.avatarUrl ?? '',
    bannerUrl: profile.bannerUrl ?? 'preset:alabaster-grid',
    bio: profile.bio ?? '',
    statusText: profile.statusText ?? '',
    accentColor: profile.accentColor,
    featuredRig: profile.featuredRig ?? '',
  };
}

export function validateProfileDraft(draft: ProfileFormDraft): ProfileValidationResult {
  const username = draft.username.trim().toLowerCase();
  const displayName = draft.displayName.trim();
  const avatarUrl = draft.avatarUrl.trim();
  const bannerUrl = draft.bannerUrl.trim();
  const bio = draft.bio.trim();
  const statusText = draft.statusText.trim();
  const accentColor = draft.accentColor.trim().toUpperCase() || DEFAULT_PROFILE_ACCENT_COLOR;
  const featuredRig = draft.featuredRig.trim();

  if (!PROFILE_USERNAME_REGEX.test(username)) {
    return {
      ok: false,
      error: 'Username harus 3–20 karakter dan hanya boleh huruf kecil, angka, atau garis bawah (_).',
    };
  }

  if (!displayName || displayName.length > MAX_DISPLAY_NAME_LENGTH) {
    return {
      ok: false,
      error: `Nama tampilan wajib diisi (maksimal ${MAX_DISPLAY_NAME_LENGTH} karakter).`,
    };
  }

  if (bio.length > MAX_BIO_LENGTH) {
    return {
      ok: false,
      error: `Bio maksimal ${MAX_BIO_LENGTH} karakter.`,
    };
  }

  if (statusText.length > MAX_STATUS_LENGTH) {
    return {
      ok: false,
      error: `Status singkat maksimal ${MAX_STATUS_LENGTH} karakter.`,
    };
  }

  if (featuredRig.length > MAX_FEATURED_RIG_LENGTH) {
    return {
      ok: false,
      error: `Perangkat utama maksimal ${MAX_FEATURED_RIG_LENGTH} karakter.`,
    };
  }

  if (!PROFILE_ACCENT_REGEX.test(accentColor)) {
    return {
      ok: false,
      error: 'Format warna aksen profil tidak valid.',
    };
  }

  if (avatarUrl && !isValidHttpOrLocalUrl(avatarUrl)) {
    return {
      ok: false,
      error: 'URL foto profil harus berupa tautan HTTPS yang valid.',
    };
  }

  if (bannerUrl && !isPresetBannerValue(bannerUrl) && !isValidHttpOrLocalUrl(bannerUrl)) {
    return {
      ok: false,
      error: 'URL banner harus berupa preset valid atau tautan HTTPS.',
    };
  }

  return {
    ok: true,
    normalized: {
      username,
      displayName,
      avatarUrl,
      bannerUrl: bannerUrl || 'preset:alabaster-grid',
      bio,
      statusText,
      accentColor,
      featuredRig,
    },
  };
}

export function formatProfileJoinDate(iso: string | null): string {
  if (!iso) return 'Anggota Aktif';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Anggota Aktif';
  return new Intl.DateTimeFormat('id-ID', {
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatProfileFullDate(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatProfileIdr(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.max(0, Math.round(amount)) : 0;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(safe);
}

export function parseProfileTabParam(
  raw: string | null | undefined,
  isOwner: boolean,
): ProfileTabId {
  if (isOwner && (raw === 'orders' || raw === 'trade')) return 'orders';
  if (isOwner && raw === 'settings') return 'settings';
  return 'overview';
}
