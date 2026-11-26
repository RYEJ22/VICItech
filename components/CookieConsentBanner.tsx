"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, ShieldCheck, X } from "lucide-react";
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
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]/60 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 ${
        checked ? "bg-[#EA580C]" : "bg-[#E4E4E7]"
      }`}
    >
      <span
        className={`inline-flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      >
        {checked ? <Check className="h-3 w-3 text-[#EA580C]" aria-hidden="true" /> : null}
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
      aria-label="Pengaturan cookie ViciTech"
      className="fixed inset-x-3 bottom-[calc(8.75rem+env(safe-area-inset-bottom))] z-[60] max-h-[75dvh] overflow-y-auto rounded-2xl border border-[#E4E4E7] bg-white p-4 shadow-[0_18px_48px_rgba(24,24,27,0.14)] sm:inset-x-auto sm:bottom-5 sm:left-5 sm:w-[440px] sm:p-5"
    >
      {isSettingsOpen ? (
        <div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#EA580C]">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                UU PDP &amp; Privasi
              </p>
              <h2 className="mt-1 font-sans text-lg font-bold tracking-tight text-[#18181B]">
                Atur Preferensi Cookie
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-[#52525B]">
                Cookie esensial selalu aktif untuk autentikasi, keamanan sesi, dan checkout. Anda dapat mengatur cookie opsional kapan saja.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsVisible(false)}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#52525B] transition-colors hover:bg-[#F3F1ED] hover:text-[#18181B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]/60"
              aria-label="Tutup pengaturan cookie"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="mt-4 divide-y divide-[#EEEAE5]">
            <div className="flex items-center justify-between gap-3 py-3">
              <div>
                <p className="text-sm font-semibold text-[#18181B]">Cookie Esensial</p>
                <p className="mt-0.5 text-xs leading-relaxed text-[#52525B]">
                  Wajib untuk login, keranjang belanja, dan keamanan transaksi.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Toggle checked label="Cookie Esensial selalu aktif" disabled />
                <span className="inline-flex min-h-7 items-center rounded-full bg-[#F3F1ED] px-2.5 text-[11px] font-semibold text-[#52525B]">
                  Wajib
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 py-3">
              <div>
                <p className="text-sm font-semibold text-[#18181B]">Preferensi &amp; Rakitan</p>
                <p className="mt-0.5 text-xs leading-relaxed text-[#52525B]">
                  Menyimpan draft Preset Builder, filter katalog, dan preferensi antarmuka.
                </p>
              </div>
              <Toggle
                checked={preferences.preferences}
                label="Preferensi dan Rakitan"
                onChange={() =>
                  setPreferences((current) => ({ ...current, preferences: !current.preferences }))
                }
              />
            </div>
            <div className="flex items-center justify-between gap-3 py-3">
              <div>
                <p className="text-sm font-semibold text-[#18181B]">Analitik &amp; Performa</p>
                <p className="mt-0.5 text-xs leading-relaxed text-[#52525B]">
                  Membantu kami mengevaluasi keandalan halaman secara agregat dan anonim.
                </p>
              </div>
              <Toggle
                checked={preferences.analytics}
                label="Analitik dan Performa"
                onChange={() =>
                  setPreferences((current) => ({ ...current, analytics: !current.analytics }))
                }
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#EEEAE5] pt-3">
            <Link
              href="/cookies"
              onClick={() => setIsVisible(false)}
              className="text-xs font-semibold text-[#C2410C] underline underline-offset-2 hover:text-[#EA580C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]/60 rounded"
            >
              Baca Kebijakan Cookie &amp; UU PDP
            </Link>
            <button
              type="button"
              onClick={() => savePreferences(preferences)}
              className="vt-motion-press inline-flex min-h-10 items-center justify-center rounded-xl bg-[#EA580C] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#C2410C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]/60 focus-visible:ring-offset-2"
            >
              Simpan Preferensi
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#EA580C]">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Privasi &amp; Cookie
              </p>
              <h2 className="mt-1 font-sans text-base font-bold tracking-tight text-[#18181B]">
                Pilihan Cookie Anda
              </h2>
            </div>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-[#52525B]">
            ViciTech menggunakan cookie esensial untuk keamanan sesi serta cookie preferensi untuk menyimpan draft rakitan. Lihat detail selengkapnya di{" "}
            <Link
              href="/cookies"
              className="font-semibold text-[#C2410C] underline underline-offset-2 hover:text-[#EA580C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]/60 rounded"
            >
              Kebijakan Cookie &amp; Privasi
            </Link>
            .
          </p>
          <div className="mt-3.5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => savePreferences({ analytics: true, preferences: true })}
              className="vt-motion-press inline-flex min-h-10 flex-1 items-center justify-center rounded-xl bg-[#EA580C] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#C2410C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]/60 focus-visible:ring-offset-2"
            >
              Terima Semua
            </button>
            <button
              type="button"
              onClick={() => savePreferences(DEFAULT_PREFERENCES)}
              className="vt-motion-press inline-flex min-h-10 flex-1 items-center justify-center rounded-xl border border-[#E4E4E7] bg-[#FAF9F6] px-4 text-xs font-semibold text-[#18181B] transition-colors hover:bg-[#F3F1ED] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]/60 focus-visible:ring-offset-2"
            >
              Esensial Saja
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
              className="inline-flex min-h-9 w-full items-center justify-center rounded-lg px-3 text-xs font-medium text-[#52525B] transition-colors hover:bg-[#F3F1ED] hover:text-[#18181B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]/60"
            >
              Atur Preferensi
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
