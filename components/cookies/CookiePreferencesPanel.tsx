'use client';

import { useEffect, useState } from 'react';
import { Check, CheckCircle2, SlidersHorizontal } from 'lucide-react';
import {
  COOKIE_CONSENT_STORAGE_KEY,
  getCookieConsent,
  setCookieConsent,
  type CookieConsentPreferences,
} from '@/lib/cookie-consent';

type OptionalPreferences = Omit<CookieConsentPreferences, 'essential' | 'updatedAt'>;

const INITIAL_OPTIONAL: OptionalPreferences = {
  analytics: false,
  preferences: false,
};

function PreferenceSwitch({
  checked,
  label,
  disabled = false,
  onChange,
}: {
  readonly checked: boolean;
  readonly label: string;
  readonly disabled?: boolean;
  readonly onChange?: () => void;
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
        checked ? 'bg-[#EA580C]' : 'bg-[#E4E4E7]'
      }`}
    >
      <span
        className={`inline-flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      >
        {checked ? <Check className="h-3 w-3 text-[#EA580C]" aria-hidden="true" /> : null}
      </span>
    </button>
  );
}

export function CookiePreferencesPanel() {
  const [savedConsent, setSavedConsent] = useState<CookieConsentPreferences | null>(null);
  const [draft, setDraft] = useState<OptionalPreferences>(INITIAL_OPTIONAL);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    const sync = () => {
      const current = getCookieConsent();
      setSavedConsent(current);
      if (current) {
        setDraft({
          analytics: current.analytics,
          preferences: current.preferences,
        });
      }
    };

    sync();
    window.addEventListener('vicitech:consent-updated', sync);
    return () => window.removeEventListener('vicitech:consent-updated', sync);
  }, []);

  function persist(next: OptionalPreferences): void {
    const stored = setCookieConsent(next);
    setSavedConsent(stored);
    setDraft(next);
    setJustSaved(true);
    window.setTimeout(() => setJustSaved(false), 3500);
  }

  const formattedUpdatedAt = savedConsent?.updatedAt
    ? new Date(savedConsent.updatedAt).toLocaleString('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : null;

  return (
    <section
      aria-label="Panel pengaturan preferensi cookie"
      className="rounded-2xl border border-[#E4E4E7] bg-white p-5 shadow-sm sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#FFF7ED] text-[#EA580C]">
            <SlidersHorizontal className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-[#18181B]">
              Pengaturan Preferensi Cookie Anda
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-[#52525B]">
              Preferensi disimpan di peramban Anda pada kunci{' '}
              <code className="rounded bg-[#F3F1ED] px-1.5 py-0.5 font-mono text-[11px] text-[#18181B]">
                {COOKIE_CONSENT_STORAGE_KEY}
              </code>
              .
            </p>
          </div>
        </div>
        <span className="inline-flex items-center rounded-full border border-[#E4E4E7] bg-[#FAF9F6] px-3 py-1 text-xs font-medium text-[#52525B]">
          {formattedUpdatedAt ? `Tersimpan: ${formattedUpdatedAt}` : 'Belum dikonfigurasi'}
        </span>
      </div>

      <div className="mt-5 divide-y divide-[#EEEAE5]">
        <div className="flex items-center justify-between gap-4 py-3.5">
          <div>
            <p className="text-sm font-semibold text-[#18181B]">Cookie Esensial</p>
            <p className="mt-0.5 text-xs leading-relaxed text-[#52525B]">
              Diperlukan untuk sesi login Supabase, keamanan CSRF, isi keranjang belanja, dan alur
              pembayaran. Tidak dapat dinonaktifkan.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <PreferenceSwitch checked disabled label="Cookie Esensial selalu aktif" />
            <span className="inline-flex min-h-7 items-center rounded-full bg-[#F3F1ED] px-2.5 text-[11px] font-semibold text-[#52525B]">
              Wajib
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 py-3.5">
          <div>
            <p className="text-sm font-semibold text-[#18181B]">Cookie Preferensi &amp; Rakitan</p>
            <p className="mt-0.5 text-xs leading-relaxed text-[#52525B]">
              Menyimpan draft Smart Preset Builder, riwayat sesi Konsultan AI, serta filter pencarian
              perangkat agar tidak hilang saat berpindah halaman.
            </p>
          </div>
          <PreferenceSwitch
            checked={draft.preferences}
            label="Aktifkan Cookie Preferensi dan Rakitan"
            onChange={() =>
              setDraft((current) => ({ ...current, preferences: !current.preferences }))
            }
          />
        </div>

        <div className="flex items-center justify-between gap-4 py-3.5">
          <div>
            <p className="text-sm font-semibold text-[#18181B]">Analitik &amp; Performa</p>
            <p className="mt-0.5 text-xs leading-relaxed text-[#52525B]">
              Membantu kami memantau kecepatan muat dan stabilitas modul secara agregat tanpa
              menjual data pribadi ke pihak ketiga.
            </p>
          </div>
          <PreferenceSwitch
            checked={draft.analytics}
            label="Aktifkan Cookie Analitik dan Performa"
            onChange={() =>
              setDraft((current) => ({ ...current, analytics: !current.analytics }))
            }
          />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#EEEAE5] pt-4">
        <div aria-live="polite" className="min-h-5">
          {justSaved ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#15803D]">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Preferensi cookie berhasil disimpan.
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => persist({ analytics: false, preferences: false })}
            className="vt-motion-press inline-flex min-h-10 items-center justify-center rounded-xl border border-[#E4E4E7] bg-[#FAF9F6] px-4 text-xs font-semibold text-[#18181B] transition-colors hover:bg-[#F3F1ED] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]/60"
          >
            Esensial Saja
          </button>
          <button
            type="button"
            onClick={() => persist({ analytics: true, preferences: true })}
            className="vt-motion-press inline-flex min-h-10 items-center justify-center rounded-xl border border-[#EA580C]/30 bg-[#FFF7ED] px-4 text-xs font-semibold text-[#C2410C] transition-colors hover:bg-[#FFEDD5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]/60"
          >
            Terima Semua
          </button>
          <button
            type="button"
            onClick={() => persist(draft)}
            className="vt-motion-press inline-flex min-h-10 items-center justify-center rounded-xl bg-[#EA580C] px-5 text-xs font-semibold text-white transition-colors hover:bg-[#C2410C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]/60 focus-visible:ring-offset-2"
          >
            Simpan Pilihan
          </button>
        </div>
      </div>
    </section>
  );
}
