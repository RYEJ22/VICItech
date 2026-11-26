export type UserLanguage = 'id' | 'en';
export type TextScale = 'normal' | 'large' | 'xlarge';

export interface UserSettings {
  readonly language: UserLanguage;
  readonly highContrast: boolean;
  readonly textScale: TextScale;
  readonly reducedMotion: boolean;
  readonly updatedAt?: string;
  readonly deletionRequestedAt?: string | null;
}

export const USER_SETTINGS_STORAGE_KEY = 'vici_user_settings';
export const USER_SETTINGS_UPDATED_EVENT = 'vicitech:user-settings-updated';

export const DEFAULT_USER_SETTINGS: UserSettings = {
  language: 'id',
  highContrast: false,
  textScale: 'normal',
  reducedMotion: false,
  deletionRequestedAt: null,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function normalizeUserSettings(raw: unknown): UserSettings {
  if (!isRecord(raw)) {
    return DEFAULT_USER_SETTINGS;
  }

  const language: UserLanguage = raw.language === 'en' ? 'en' : 'id';
  const textScale: TextScale =
    raw.textScale === 'large' || raw.textScale === 'xlarge' ? raw.textScale : 'normal';

  return {
    language,
    highContrast: raw.highContrast === true,
    textScale,
    reducedMotion: raw.reducedMotion === true,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : undefined,
    deletionRequestedAt:
      typeof raw.deletionRequestedAt === 'string' ? raw.deletionRequestedAt : null,
  };
}

export function getStoredUserSettings(): UserSettings | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(USER_SETTINGS_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return normalizeUserSettings(parsed);
  } catch {
    return null;
  }
}

export function applyUserSettingsToDocument(settings: UserSettings): void {
  if (typeof document === 'undefined') {
    return;
  }

  const root = document.documentElement;

  if (settings.highContrast) {
    root.setAttribute('data-high-contrast', 'true');
  } else {
    root.removeAttribute('data-high-contrast');
  }

  if (settings.textScale !== 'normal') {
    root.setAttribute('data-text-scale', settings.textScale);
  } else {
    root.removeAttribute('data-text-scale');
  }

  if (settings.reducedMotion) {
    root.setAttribute('data-reduced-motion', 'true');
  } else {
    root.removeAttribute('data-reduced-motion');
  }

  root.setAttribute('data-language', settings.language);
}

export function saveStoredUserSettings(next: UserSettings): UserSettings {
  const normalized: UserSettings = {
    ...normalizeUserSettings(next),
    updatedAt: new Date().toISOString(),
  };

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(USER_SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
    } catch {
      // Abaikan kegagalan storage pada mode privasi ketat.
    }
    applyUserSettingsToDocument(normalized);
    window.dispatchEvent(new CustomEvent(USER_SETTINGS_UPDATED_EVENT, { detail: normalized }));
  }

  return normalized;
}
