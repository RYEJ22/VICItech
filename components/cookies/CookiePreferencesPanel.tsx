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
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 ${
        checked ? 'bg-accent-primary' : 'bg-border-strong'
      }`}
    >
      <span
        className={`inline-flex h-5 w-5 items-center justify-center rounded-full bg-surface shadow-sm transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      >
        {checked ? <Check className="h-3 w-3 text-accent-primary" aria-hidden="true" /> : null}
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
      className="rounded-xl border border-default bg-surface p-5 shadow-card sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent-subtle text-accent-primary">
            <SlidersHorizontal className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-primary">
              Pengaturan Preferensi Cookie Anda
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-secondary">
              Preferensi disimpan di peramban Anda pada kunci{' '}
              <code className="rounded bg-subtle px-1.5 py-0.5 font-mono text-[11px] text-primary">
                {COOKIE_CONSENT_STORAGE_KEY}
              </code>
              .
            </p>
          </div>
        </div>
        <span className="inline-flex items-center rounded-md border border-default bg-canvas px-3 py-1 text-xs font-medium text-secondary">
          {formattedUpdatedAt ? `Tersimpan: ${formattedUpdatedAt}` : 'Belum dikonfigurasi'}
        </span>
      </div>

      <div className="mt-5 divide-y divide-default">
        <div className="flex items-center justify-between gap-4 py-3.5">
          <div>
            <p className="text-sm font-semibold text-primary">Cookie Esensial</p>
            <p className="mt-0.5 text-xs leading-relaxed text-secondary">
              Diperlukan untuk sesi login Supabase, keamanan CSRF, isi keranjang belanja, dan alur
              pembayaran. Tidak dapat dinonaktifkan.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <PreferenceSwitch checked disabled label="Cookie Esensial selalu aktif" />
            <span className="inline-flex min-h-7 items-center rounded-md bg-subtle px-2.5 text-[11px] font-semibold text-secondary">
              Wajib
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 py-3.5">
          <div>
            <p className="text-sm font-semibold text-primary">Cookie Preferensi &amp; Rakitan</p>
            <p className="mt-0.5 text-xs leading-relaxed text-secondary">
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
            <p className="text-sm font-semibold text-primary">Analitik &amp; Performa</p>
            <p className="mt-0.5 text-xs leading-relaxed text-secondary">
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

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-default pt-4">
        <div aria-live="polite" className="min-h-5">
          {justSaved ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Preferensi cookie berhasil disimpan.
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => persist({ analytics: false, preferences: false })}
            className="vt-motion-press inline-flex min-h-10 items-center justify-center rounded-lg border border-default bg-canvas px-4 text-xs font-semibold text-primary transition-all duration-200 ease-smooth hover:bg-subtle active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50"
          >
            Esensial Saja
          </button>
          <button
            type="button"
            onClick={() => persist({ analytics: true, preferences: true })}
            className="vt-motion-press inline-flex min-h-10 items-center justify-center rounded-lg border border-accent-primary/30 bg-accent-subtle px-4 text-xs font-semibold text-accent-hover transition-all duration-200 ease-smooth hover:bg-accent-primary/15 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50"
          >
            Terima Semua
          </button>
          <button
            type="button"
            onClick={() => persist(draft)}
            className="vt-motion-press inline-flex min-h-10 items-center justify-center rounded-lg bg-accent-primary px-5 text-xs font-semibold text-white transition-all duration-200 ease-smooth hover:bg-accent-hover active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50 focus-visible:ring-offset-2"
          >
            Simpan Pilihan
          </button>
        </div>
      </div>
    </section>
  );
}
