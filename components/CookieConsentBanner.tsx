"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, ShieldCheck, X } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import {
  getCookieConsent,
  setCookieConsent,
  type CookieConsentPreferences,
} from "@/lib/cookie-consent";

type OptionalPreferences = Omit<CookieConsentPreferences, "essential" | "updatedAt">;

const DEFAULT_PREFERENCES: OptionalPreferences = {
  analytics: false,
  preferences: false,
};

function Toggle({
  checked,
  label,
  onChange,
  disabled = false,
}: {
  readonly checked: boolean;
  readonly label: string;
  readonly onChange?: () => void;
  readonly disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 ${
        checked ? "bg-accent-primary" : "bg-border-strong"
      }`}
    >
      <span
        className={`inline-flex h-5 w-5 items-center justify-center rounded-full bg-surface shadow-sm transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      >
        {checked ? <Check className="h-3 w-3 text-accent-primary" aria-hidden="true" /> : null}
      </span>
    </button>
  );
}

export function CookieConsentBanner() {
  const { isEnglish } = useLanguage();
  const [isVisible, setIsVisible] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [preferences, setPreferences] = useState<OptionalPreferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    setIsVisible(getCookieConsent() === null);

    const handleOpenSettings = () => {
      const consent = getCookieConsent();
      setPreferences(
        consent
          ? { analytics: consent.analytics, preferences: consent.preferences }
          : DEFAULT_PREFERENCES,
      );
      setIsSettingsOpen(true);
      setIsVisible(true);
    };

    const handleConsentUpdated = () => {
      const consent = getCookieConsent();
      if (consent) {
        setPreferences({ analytics: consent.analytics, preferences: consent.preferences });
        setIsVisible(false);
        setIsSettingsOpen(false);
      }
    };

    window.addEventListener("vicitech:open-cookie-settings", handleOpenSettings);
    window.addEventListener("vicitech:consent-updated", handleConsentUpdated);
    return () => {
      window.removeEventListener("vicitech:open-cookie-settings", handleOpenSettings);
      window.removeEventListener("vicitech:consent-updated", handleConsentUpdated);
    };
  }, []);

  const savePreferences = (nextPreferences: OptionalPreferences) => {
    setCookieConsent(nextPreferences);
    setIsVisible(false);
    setIsSettingsOpen(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <aside
      aria-label={isEnglish ? "ViciTech cookie preferences" : "Pengaturan cookie ViciTech"}
      className="box-border fixed inset-x-3 bottom-[calc(8.75rem+env(safe-area-inset-bottom))] z-[60] max-h-[75dvh] overflow-y-auto rounded-xl border border-default bg-surface p-4 shadow-floating sm:inset-x-auto sm:bottom-5 sm:left-5 sm:w-[440px] sm:p-5"
    >
      {isSettingsOpen ? (
        <div>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-accent-primary">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                {isEnglish ? "Privacy & UU PDP" : "UU PDP & Privasi"}
              </p>
              <h2 className="mt-1 font-sans text-lg font-bold tracking-tight text-primary">
                {isEnglish ? "Manage Cookie Preferences" : "Atur Preferensi Cookie"}
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-secondary">
                {isEnglish
                  ? "Essential cookies are always active for authentication, session security, and checkout. You can adjust optional cookies anytime."
                  : "Cookie esensial selalu aktif untuk autentikasi, keamanan sesi, dan checkout. Anda dapat mengatur cookie opsional kapan saja."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsVisible(false)}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-secondary transition-colors hover:bg-subtle hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50"
              aria-label={isEnglish ? "Close cookie settings" : "Tutup pengaturan cookie"}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="mt-4 divide-y divide-default">
            <div className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-primary">
                  {isEnglish ? "Essential Cookies" : "Cookie Esensial"}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-secondary">
                  {isEnglish
                    ? "Required for sign-in, shopping cart, and transaction security."
                    : "Wajib untuk login, keranjang belanja, dan keamanan transaksi."}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Toggle
                  checked
                  label={isEnglish ? "Essential cookies always enabled" : "Cookie Esensial selalu aktif"}
                  disabled
                />
                <span className="inline-flex min-h-7 items-center rounded-md bg-subtle px-2.5 text-[11px] font-semibold text-secondary">
                  {isEnglish ? "Required" : "Wajib"}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-primary">
                  {isEnglish ? "Preferences & Builds" : "Preferensi & Rakitan"}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-secondary">
                  {isEnglish
                    ? "Saves Preset Builder drafts, catalog filters, and interface preferences."
                    : "Menyimpan draft Preset Builder, filter katalog, dan preferensi antarmuka."}
                </p>
              </div>
              <Toggle
                checked={preferences.preferences}
                label={isEnglish ? "Preferences and Builds" : "Preferensi dan Rakitan"}
                onChange={() =>
                  setPreferences((current) => ({ ...current, preferences: !current.preferences }))
                }
              />
            </div>
            <div className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-primary">
                  {isEnglish ? "Analytics & Performance" : "Analitik & Performa"}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-secondary">
                  {isEnglish
                    ? "Helps us measure page reliability anonymously in aggregate."
                    : "Membantu kami mengevaluasi keandalan halaman secara agregat dan anonim."}
                </p>
              </div>
              <Toggle
                checked={preferences.analytics}
                label={isEnglish ? "Analytics and Performance" : "Analitik dan Performa"}
                onChange={() =>
                  setPreferences((current) => ({ ...current, analytics: !current.analytics }))
                }
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-default pt-3">
            <Link
              href="/cookies"
              onClick={() => setIsVisible(false)}
              className="rounded text-xs font-semibold text-accent-hover underline underline-offset-2 hover:text-accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50"
            >
              {isEnglish ? "Read Cookie & Privacy Policy" : "Baca Kebijakan Cookie & UU PDP"}
            </Link>
            <button
              type="button"
              onClick={() => savePreferences(preferences)}
              className="vt-motion-press inline-flex min-h-11 items-center justify-center rounded-lg bg-accent-primary px-4 text-xs font-semibold text-white transition-all duration-200 ease-smooth hover:bg-accent-hover active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50 focus-visible:ring-offset-2"
            >
              {isEnglish ? "Save Preferences" : "Simpan Preferensi"}
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-accent-primary">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                {isEnglish ? "Privacy & Cookies" : "Privasi & Cookie"}
              </p>
              <h2 className="mt-1 font-sans text-base font-bold tracking-tight text-primary">
                {isEnglish ? "Your Cookie Choices" : "Pilihan Cookie Anda"}
              </h2>
            </div>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-secondary">
            {isEnglish
              ? "ViciTech uses essential cookies for session security and preference cookies to remember build drafts. Review full details in our "
              : "ViciTech menggunakan cookie esensial untuk keamanan sesi serta cookie preferensi untuk menyimpan draft rakitan. Lihat detail selengkapnya di "}
            <Link
              href="/cookies"
              className="rounded font-semibold text-accent-hover underline underline-offset-2 hover:text-accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50"
            >
              {isEnglish ? "Cookie & Privacy Policy" : "Kebijakan Cookie & Privasi"}
            </Link>
            .
          </p>
          <div className="mt-3.5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => savePreferences({ analytics: true, preferences: true })}
              className="vt-motion-press inline-flex min-h-11 flex-1 items-center justify-center rounded-lg bg-accent-primary px-4 text-xs font-semibold text-white transition-all duration-200 ease-smooth hover:bg-accent-hover active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50 focus-visible:ring-offset-2"
            >
              {isEnglish ? "Accept All" : "Terima Semua"}
            </button>
            <button
              type="button"
              onClick={() => savePreferences(DEFAULT_PREFERENCES)}
              className="vt-motion-press inline-flex min-h-11 flex-1 items-center justify-center rounded-lg border border-default bg-canvas px-4 text-xs font-semibold text-primary transition-all duration-200 ease-smooth hover:bg-subtle active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50 focus-visible:ring-offset-2"
            >
              {isEnglish ? "Essential Only" : "Esensial Saja"}
            </button>
            <button
              type="button"
              onClick={() => {
                const consent = getCookieConsent();
                setPreferences(
                  consent
                    ? { analytics: consent.analytics, preferences: consent.preferences }
                    : DEFAULT_PREFERENCES,
                );
                setIsSettingsOpen(true);
              }}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-lg px-3 text-xs font-medium text-secondary transition-colors hover:bg-subtle hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50 sm:min-h-9"
            >
              {isEnglish ? "Manage Preferences" : "Atur Preferensi"}
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
