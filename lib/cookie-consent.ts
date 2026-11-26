export interface CookieConsentPreferences {
  readonly essential: true;
  readonly analytics: boolean;
  readonly preferences: boolean;
  readonly updatedAt: string;
}

export const COOKIE_CONSENT_STORAGE_KEY = "vici_cookie_consent";
const LEGACY_COOKIE_NAME = "vicitech_cookie_consent";

function isCookieConsentPreferences(value: unknown): value is CookieConsentPreferences {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  return (
    "essential" in value && value.essential === true &&
    "analytics" in value && typeof value.analytics === "boolean" &&
    "preferences" in value && typeof value.preferences === "boolean" &&
    "updatedAt" in value && typeof value.updatedAt === "string"
  );
}

function readLegacyCookie(): CookieConsentPreferences | null {
  if (typeof document === "undefined") {
    return null;
  }

  const cookie = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${LEGACY_COOKIE_NAME}=`));

  if (!cookie) {
    return null;
  }

  try {
    const encodedValue = cookie.slice(LEGACY_COOKIE_NAME.length + 1);
    const parsedValue: unknown = JSON.parse(decodeURIComponent(encodedValue));
    return isCookieConsentPreferences(parsedValue) ? parsedValue : null;
  } catch {
    return null;
  }
}

export function getCookieConsent(): CookieConsentPreferences | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (isCookieConsentPreferences(parsed)) {
        return parsed;
      }
    }
  } catch {
    // Abaikan kegagalan akses localStorage pada mode privasi ketat.
  }

  const legacy = readLegacyCookie();
  if (legacy) {
    try {
      window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(legacy));
    } catch {
      // Abaikan jika penyimpanan lokal tidak tersedia.
    }
  }
  return legacy;
}

export function setCookieConsent(
  prefs: Omit<CookieConsentPreferences, "essential" | "updatedAt">,
): CookieConsentPreferences | null {
  if (typeof window === "undefined") {
    return null;
  }

  const consent: CookieConsentPreferences = {
    essential: true,
    analytics: prefs.analytics,
    preferences: prefs.preferences,
    updatedAt: new Date().toISOString(),
  };

  try {
    window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(consent));
  } catch {
    // Abaikan jika localStorage penuh atau diblokir.
  }

  if (typeof document !== "undefined") {
    document.cookie = `${LEGACY_COOKIE_NAME}=${encodeURIComponent(JSON.stringify(consent))}; Path=/; Max-Age=15552000; SameSite=Lax`;
  }

  window.dispatchEvent(new Event("vicitech:consent-updated"));
  return consent;
}

export function hasConsent(category: "essential" | "analytics" | "preferences"): boolean {
  if (category === "essential") {
    return true;
  }

  return getCookieConsent()?.[category] ?? false;
}

export function openCookieSettingsModal(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event("vicitech:open-cookie-settings"));
}
