export type UserLanguage = 'id' | 'en';
export type TextScale = 'normal' | 'large' | 'xlarge';
export type ThemeMode = 'light' | 'dark';

export interface UserSettings {
  readonly theme: ThemeMode;
  readonly language: UserLanguage;
  readonly highContrast: boolean;
  readonly textScale: TextScale;
  readonly reducedMotion: boolean;
  readonly updatedAt?: string;
  readonly deletionRequestedAt?: string | null;
}

export const THEME_STORAGE_KEY = 'vici_theme';
export const USER_SETTINGS_STORAGE_KEY = 'vici_user_settings';
export const USER_SETTINGS_UPDATED_EVENT = 'vicitech:user-settings-updated';

export const DEFAULT_USER_SETTINGS: UserSettings = {
  theme: 'light',
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

  const theme: ThemeMode = raw.theme === 'dark' ? 'dark' : 'light';
  const language: UserLanguage = raw.language === 'en' ? 'en' : 'id';
  const textScale: TextScale =
    raw.textScale === 'large' || raw.textScale === 'xlarge' ? raw.textScale : 'normal';

  return {
    theme,
    language,
    highContrast: raw.highContrast === true,
    textScale,
    reducedMotion: raw.reducedMotion === true,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : undefined,
    deletionRequestedAt:
      typeof raw.deletionRequestedAt === 'string' ? raw.deletionRequestedAt : null,
  };
}

export function getStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') {
    return 'light';
  }

  try {
    const direct = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (direct === 'dark' || direct === 'light') {
      return direct;
    }
    const rawSettings = window.localStorage.getItem(USER_SETTINGS_STORAGE_KEY);
    if (rawSettings) {
      const parsed: unknown = JSON.parse(rawSettings);
      if (isRecord(parsed) && parsed.theme === 'dark') {
        return 'dark';
      }
    }
  } catch {
    return 'light';
  }

  return 'light';
}

export function getStoredUserSettings(): UserSettings | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(USER_SETTINGS_STORAGE_KEY);
    const directTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (!raw) {
      if (directTheme === 'dark' || directTheme === 'light') {
        return { ...DEFAULT_USER_SETTINGS, theme: directTheme };
      }
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    const normalized = normalizeUserSettings(parsed);
    if (directTheme === 'dark' || directTheme === 'light') {
      return { ...normalized, theme: directTheme };
    }
    return normalized;
  } catch {
    return null;
  }
}

export function mergeRemoteUserSettings(
  remoteRaw: unknown,
  localFallback?: UserSettings | null,
): UserSettings {
  const normalized = normalizeUserSettings(remoteRaw);
  const remoteHasTheme =
    isRecord(remoteRaw) && (remoteRaw.theme === 'dark' || remoteRaw.theme === 'light');

  if (remoteHasTheme) {
    return normalized;
  }

  return {
    ...normalized,
    theme: localFallback?.theme ?? getStoredTheme(),
  };
}

export function applyUserSettingsToDocument(settings: UserSettings): void {
  if (typeof document === 'undefined') {
    return;
  }

  const root = document.documentElement;
  const isDark = settings.theme === 'dark';

  root.setAttribute('data-theme', settings.theme);
  root.classList.toggle('dark', isDark);

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
      window.localStorage.setItem(THEME_STORAGE_KEY, normalized.theme);
      window.localStorage.setItem(USER_SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
    } catch {
      // Abaikan kegagalan storage pada mode privasi ketat.
    }
    applyUserSettingsToDocument(normalized);
    window.dispatchEvent(new CustomEvent(USER_SETTINGS_UPDATED_EVENT, { detail: normalized }));
  }

  return normalized;
}

export function setStoredTheme(theme: ThemeMode): UserSettings {
  const current = getStoredUserSettings() ?? DEFAULT_USER_SETTINGS;
  return saveStoredUserSettings({
    ...current,
    theme,
  });
}
