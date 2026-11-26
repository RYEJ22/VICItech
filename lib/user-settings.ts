export type UserLanguage = 'id' | 'en';
export type TextScale = 'normal' | 'large' | 'xlarge';
export type ThemeMode = 'light' | 'dark';
export type PixelIntensity = 'standard' | 'subtle';
export type TemperatureUnit = 'C' | 'F';
export type NavbarScrollBehavior = 'collapse' | 'keep-labels';
export type MobileDensity = 'comfortable' | 'compact';
export type ComfortPresetId = 'balanced' | 'readability' | 'obsidian';

export interface UserSettings {
  readonly theme: ThemeMode;
  readonly language: UserLanguage;
  readonly pixelIntensity: PixelIntensity;
  readonly highContrast: boolean;
  readonly textScale: TextScale;
  readonly reducedMotion: boolean;
  readonly temperatureUnit: TemperatureUnit;
  readonly compactNumbers: boolean;
  readonly showSourceBadges: boolean;
  readonly navbarScrollBehavior: NavbarScrollBehavior;
  readonly mobileDensity: MobileDensity;
  readonly updatedAt?: string;
  readonly deletionRequestedAt?: string | null;
}

export const THEME_STORAGE_KEY = 'vici_theme';
export const LANGUAGE_STORAGE_KEY = 'vici_language';
export const USER_SETTINGS_STORAGE_KEY = 'vici_user_settings';
export const USER_SETTINGS_UPDATED_EVENT = 'vicitech:user-settings-updated';

export const DEFAULT_USER_SETTINGS: UserSettings = {
  theme: 'light',
  language: 'id',
  pixelIntensity: 'standard',
  highContrast: false,
  textScale: 'normal',
  reducedMotion: false,
  temperatureUnit: 'C',
  compactNumbers: false,
  showSourceBadges: true,
  navbarScrollBehavior: 'collapse',
  mobileDensity: 'comfortable',
  deletionRequestedAt: null,
};

export const COMFORT_PRESET_PATCHES: Readonly<Record<ComfortPresetId, Partial<UserSettings>>> = {
  balanced: {
    theme: 'light',
    pixelIntensity: 'standard',
    highContrast: false,
    textScale: 'normal',
    reducedMotion: false,
    compactNumbers: false,
    showSourceBadges: true,
    navbarScrollBehavior: 'collapse',
    mobileDensity: 'comfortable',
  },
  readability: {
    theme: 'light',
    pixelIntensity: 'subtle',
    highContrast: true,
    textScale: 'large',
    reducedMotion: true,
    compactNumbers: false,
    showSourceBadges: true,
    navbarScrollBehavior: 'keep-labels',
    mobileDensity: 'comfortable',
  },
  obsidian: {
    theme: 'dark',
    pixelIntensity: 'standard',
    highContrast: false,
    textScale: 'normal',
    reducedMotion: false,
    navbarScrollBehavior: 'collapse',
    mobileDensity: 'compact',
  },
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
  const pixelIntensity: PixelIntensity = raw.pixelIntensity === 'subtle' ? 'subtle' : 'standard';
  const textScale: TextScale =
    raw.textScale === 'large' || raw.textScale === 'xlarge' ? raw.textScale : 'normal';
  const temperatureUnit: TemperatureUnit = raw.temperatureUnit === 'F' ? 'F' : 'C';
  const navbarScrollBehavior: NavbarScrollBehavior =
    raw.navbarScrollBehavior === 'keep-labels' ? 'keep-labels' : 'collapse';
  const mobileDensity: MobileDensity = raw.mobileDensity === 'compact' ? 'compact' : 'comfortable';

  return {
    theme,
    language,
    pixelIntensity,
    highContrast: raw.highContrast === true,
    textScale,
    reducedMotion: raw.reducedMotion === true,
    temperatureUnit,
    compactNumbers: raw.compactNumbers === true,
    showSourceBadges: raw.showSourceBadges !== false,
    navbarScrollBehavior,
    mobileDensity,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : undefined,
    deletionRequestedAt:
      typeof raw.deletionRequestedAt === 'string' ? raw.deletionRequestedAt : null,
  };
}

export function resolveActiveComfortPreset(settings: UserSettings): ComfortPresetId | null {
  const presetIds: readonly ComfortPresetId[] = ['balanced', 'readability', 'obsidian'];
  for (const id of presetIds) {
    const patch = COMFORT_PRESET_PATCHES[id];
    const matches = (Object.keys(patch) as (keyof UserSettings)[]).every(
      (key) => settings[key] === patch[key],
    );
    if (matches) {
      return id;
    }
  }
  return null;
}

export function formatTemperature(
  celsius: number | string | null | undefined,
  unit: TemperatureUnit = 'C',
  decimals = 1,
): string {
  if (celsius === null || celsius === undefined || celsius === '') {
    return '—';
  }
  const numeric = Number(celsius);
  if (!Number.isFinite(numeric)) {
    return '—';
  }
  if (unit === 'F') {
    const fahrenheit = (numeric * 9) / 5 + 32;
    return `${fahrenheit.toFixed(decimals)} °F`;
  }
  return `${numeric.toFixed(decimals)} °C`;
}

export function formatTelemetryMetric(
  value: number | string | null | undefined,
  options: {
    readonly compact?: boolean;
    readonly unit?: string;
    readonly language?: UserLanguage;
  } = {},
): string {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return '—';
  }
  const suffix = options.unit ? ` ${options.unit}` : '';
  const locale = options.language === 'en' ? 'en-US' : 'id-ID';
  if (options.compact && Math.abs(numeric) >= 1000) {
    const compactValue = new Intl.NumberFormat(locale, {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(numeric);
    return `${compactValue}${suffix}`;
  }
  const standardValue = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  }).format(numeric);
  return `${standardValue}${suffix}`;
}

export function formatIdrPreference(
  amount: number,
  compact = false,
  language: UserLanguage = 'id',
): string {
  if (!Number.isFinite(amount)) {
    return '—';
  }
  if (compact) {
    const abs = Math.abs(amount);
    if (abs >= 1_000_000_000) {
      const scaled = (amount / 1_000_000_000).toFixed(1).replace(/\.0$/, '');
      return language === 'en' ? `Rp ${scaled}B` : `Rp ${scaled.replace('.', ',')} M`;
    }
    if (abs >= 1_000_000) {
      const scaled = (amount / 1_000_000).toFixed(1).replace(/\.0$/, '');
      return language === 'en' ? `Rp ${scaled}M` : `Rp ${scaled.replace('.', ',')} jt`;
    }
    if (abs >= 1_000) {
      const scaled = Math.round(amount / 1_000);
      return language === 'en' ? `Rp ${scaled}K` : `Rp ${scaled} rb`;
    }
  }
  return `Rp ${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(Math.round(amount))}`;
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

export function getStoredLanguage(): UserLanguage {
  if (typeof window === 'undefined') {
    return 'id';
  }

  try {
    const direct = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (direct === 'en' || direct === 'id') {
      return direct;
    }
    const rawSettings = window.localStorage.getItem(USER_SETTINGS_STORAGE_KEY);
    if (rawSettings) {
      const parsed: unknown = JSON.parse(rawSettings);
      if (isRecord(parsed) && parsed.language === 'en') {
        return 'en';
      }
    }
  } catch {
    return 'id';
  }

  return 'id';
}

export function getStoredUserSettings(): UserSettings | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(USER_SETTINGS_STORAGE_KEY);
    const directTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    const directLang = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (!raw) {
      if (
        directTheme === 'dark' ||
        directTheme === 'light' ||
        directLang === 'en' ||
        directLang === 'id'
      ) {
        return {
          ...DEFAULT_USER_SETTINGS,
          theme: directTheme === 'dark' ? 'dark' : 'light',
          language: directLang === 'en' ? 'en' : 'id',
        };
      }
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    const normalized = normalizeUserSettings(parsed);
    return {
      ...normalized,
      theme: directTheme === 'dark' || directTheme === 'light' ? directTheme : normalized.theme,
      language: directLang === 'en' || directLang === 'id' ? directLang : normalized.language,
    };
  } catch {
    return null;
  }
}

export function mergeRemoteUserSettings(
  remoteRaw: unknown,
  localFallback?: UserSettings | null,
): UserSettings {
  const normalized = normalizeUserSettings(remoteRaw);
  const record = isRecord(remoteRaw) ? remoteRaw : {};
  const remoteHasTheme = record.theme === 'dark' || record.theme === 'light';
  const remoteHasLanguage = record.language === 'en' || record.language === 'id';
  const remoteHasPixelIntensity =
    record.pixelIntensity === 'standard' || record.pixelIntensity === 'subtle';
  const remoteHasTempUnit = record.temperatureUnit === 'C' || record.temperatureUnit === 'F';
  const remoteHasCompactNumbers = typeof record.compactNumbers === 'boolean';
  const remoteHasSourceBadges = typeof record.showSourceBadges === 'boolean';
  const remoteHasNavbarScroll =
    record.navbarScrollBehavior === 'collapse' || record.navbarScrollBehavior === 'keep-labels';
  const remoteHasMobileDensity =
    record.mobileDensity === 'comfortable' || record.mobileDensity === 'compact';

  return {
    ...normalized,
    theme: remoteHasTheme ? normalized.theme : (localFallback?.theme ?? getStoredTheme()),
    language: remoteHasLanguage
      ? normalized.language
      : (localFallback?.language ?? getStoredLanguage()),
    pixelIntensity: remoteHasPixelIntensity
      ? normalized.pixelIntensity
      : (localFallback?.pixelIntensity ?? DEFAULT_USER_SETTINGS.pixelIntensity),
    temperatureUnit: remoteHasTempUnit
      ? normalized.temperatureUnit
      : (localFallback?.temperatureUnit ?? DEFAULT_USER_SETTINGS.temperatureUnit),
    compactNumbers: remoteHasCompactNumbers
      ? normalized.compactNumbers
      : (localFallback?.compactNumbers ?? DEFAULT_USER_SETTINGS.compactNumbers),
    showSourceBadges: remoteHasSourceBadges
      ? normalized.showSourceBadges
      : (localFallback?.showSourceBadges ?? DEFAULT_USER_SETTINGS.showSourceBadges),
    navbarScrollBehavior: remoteHasNavbarScroll
      ? normalized.navbarScrollBehavior
      : (localFallback?.navbarScrollBehavior ?? DEFAULT_USER_SETTINGS.navbarScrollBehavior),
    mobileDensity: remoteHasMobileDensity
      ? normalized.mobileDensity
      : (localFallback?.mobileDensity ?? DEFAULT_USER_SETTINGS.mobileDensity),
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

  if (settings.pixelIntensity === 'subtle') {
    root.setAttribute('data-pixel-intensity', 'subtle');
  } else {
    root.removeAttribute('data-pixel-intensity');
  }

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

  if (settings.temperatureUnit === 'F') {
    root.setAttribute('data-temp-unit', 'F');
  } else {
    root.removeAttribute('data-temp-unit');
  }

  if (settings.compactNumbers) {
    root.setAttribute('data-compact-numbers', 'true');
  } else {
    root.removeAttribute('data-compact-numbers');
  }

  if (!settings.showSourceBadges) {
    root.setAttribute('data-source-badges', 'minimal');
  } else {
    root.removeAttribute('data-source-badges');
  }

  if (settings.navbarScrollBehavior === 'keep-labels') {
    root.setAttribute('data-navbar-scroll', 'keep-labels');
  } else {
    root.removeAttribute('data-navbar-scroll');
  }

  if (settings.mobileDensity === 'compact') {
    root.setAttribute('data-mobile-density', 'compact');
  } else {
    root.removeAttribute('data-mobile-density');
  }

  root.lang = settings.language;
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
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, normalized.language);
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

export function setStoredLanguage(language: UserLanguage): UserSettings {
  const current = getStoredUserSettings() ?? DEFAULT_USER_SETTINGS;
  return saveStoredUserSettings({
    ...current,
    language,
  });
}
