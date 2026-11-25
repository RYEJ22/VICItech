"use client";

import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
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
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 ${
        checked ? "bg-accent-primary" : "bg-subtle"
      }`}
    >
      <span
        className={`inline-flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      >
        {checked ? <Check className="h-3 w-3 text-accent-primary" aria-hidden="true" /> : null}
      </span>
    </button>
  );
}

export function CookieConsentBanner() {
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

    window.addEventListener("vicitech:open-cookie-settings", handleOpenSettings);
    return () => {
      window.removeEventListener("vicitech:open-cookie-settings", handleOpenSettings);
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
      aria-label="Pengaturan cookie ViciTech"
      className="fixed inset-x-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-[70] mx-auto w-[calc(100vw_-_1.5rem)] max-h-[80dvh] max-w-3xl overflow-y-auto rounded-2xl border border-default bg-surface p-5 shadow-lift sm:inset-x-6 sm:bottom-6 sm:w-auto sm:p-6"
    >
      {isSettingsOpen ? (
        <div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-sans text-2xl font-bold tracking-tight text-primary">Atur Preferensi Cookie</h2>
              <p className="mt-1 text-sm leading-relaxed text-secondary">
                Pilih cookie tambahan yang boleh digunakan. Cookie esensial selalu aktif untuk menjaga keamanan akun dan checkout.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsVisible(false)}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-secondary transition-colors hover:bg-subtle hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
              aria-label="Tutup pengaturan cookie"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <div className="mt-5 divide-y divide-default">
            <div className="flex items-center justify-between gap-4 py-3">
              <div>
                <p className="text-sm font-semibold text-primary">Cookie Esensial</p>
                <p className="mt-0.5 text-xs leading-relaxed text-secondary">Wajib untuk keamanan autentikasi dan checkout.</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Toggle checked label="Cookie Esensial selalu aktif" disabled />
                <span className="inline-flex min-h-8 items-center rounded-full bg-subtle px-3 text-xs font-semibold text-secondary">
                  Wajib
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <div>
                <p className="text-sm font-semibold text-primary">Preferensi &amp; Rakitan</p>
                <p className="mt-0.5 text-xs leading-relaxed text-secondary">Menyimpan draft rakitan PC dan item yang baru dilihat.</p>
              </div>
              <Toggle
                checked={preferences.preferences}
                label="Preferensi dan Rakitan"
                onChange={() => setPreferences((current) => ({ ...current, preferences: !current.preferences }))}
              />
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <div>
                <p className="text-sm font-semibold text-primary">Analitik &amp; Performa</p>
                <p className="mt-0.5 text-xs leading-relaxed text-secondary">Membantu kami memahami penggunaan situs secara anonim.</p>
              </div>
              <Toggle
                checked={preferences.analytics}
                label="Analitik dan Performa"
                onChange={() => setPreferences((current) => ({ ...current, analytics: !current.analytics }))}
              />
            </div>
          </div>

          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => savePreferences(preferences)}
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-accent-primary px-5 text-sm font-semibold text-primary transition-colors hover:bg-accent-hover hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2"
            >
              Simpan Preferensi
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_12rem] sm:items-center sm:gap-8">
          <div>
            <h2 className="font-sans text-2xl font-bold tracking-tight text-primary sm:text-3xl">Pilihan Cookie Anda</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-secondary">
              ViciTech menggunakan cookie untuk keamanan, menyimpan preferensi rakitan PC, dan meningkatkan performa situs. Anda dapat mengatur pilihan kapan saja.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => savePreferences({ analytics: true, preferences: true })}
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-accent-primary px-5 text-sm font-semibold text-primary transition-colors hover:bg-accent-hover hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2"
            >
              Terima Semua
            </button>
            <button
              type="button"
              onClick={() => savePreferences(DEFAULT_PREFERENCES)}
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-default bg-surface px-5 text-sm font-semibold text-primary transition-colors hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2"
            >
              Esensial Saja
            </button>
            <button
              type="button"
              onClick={() => {
                const consent = getCookieConsent();
                setPreferences(consent
                  ? { analytics: consent.analytics, preferences: consent.preferences }
                  : DEFAULT_PREFERENCES);
                setIsSettingsOpen(true);
              }}
              className="inline-flex min-h-11 items-center justify-center rounded-lg px-4 text-sm font-medium text-secondary transition-colors hover:bg-subtle hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
            >
              Atur Preferensi
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
