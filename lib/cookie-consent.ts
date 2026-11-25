export interface CookieConsentPreferences {
  readonly essential: true;
  readonly analytics: boolean;
  readonly preferences: boolean;
  readonly updatedAt: string;
}

const COOKIE_NAME = "vicitech_cookie_consent";

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

export function getCookieConsent(): CookieConsentPreferences | null {
  if (typeof document === "undefined") {
    return null;
  }

  const cookie = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`));

  if (!cookie) {
    return null;
  }

  try {
    const encodedValue = cookie.slice(COOKIE_NAME.length + 1);
    const parsedValue: unknown = JSON.parse(decodeURIComponent(encodedValue));
    return isCookieConsentPreferences(parsedValue) ? parsedValue : null;
  } catch {
    return null;
  }
}

export function setCookieConsent(
  prefs: Omit<CookieConsentPreferences, "essential" | "updatedAt">,
): void {
  if (typeof document === "undefined") {
    return;
  }

  const consent: CookieConsentPreferences = {
    essential: true,
    analytics: prefs.analytics,
    preferences: prefs.preferences,
    updatedAt: new Date().toISOString(),
  };

  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(JSON.stringify(consent))}; Path=/; Max-Age=15552000; SameSite=Lax`;
  window.dispatchEvent(new Event("vicitech:consent-updated"));
}

export function hasConsent(category: "essential" | "analytics" | "preferences"): boolean {
  if (category === "essential") {
    return true;
  }

  return getCookieConsent()?.[category] ?? false;
}
