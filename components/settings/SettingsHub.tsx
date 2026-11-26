'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Cookie,
  Download,
  Eye,
  Globe,
  LoaderCircle,
  Monitor,
  Moon,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Sun,
  Trash2,
  Type,
  X,
} from 'lucide-react';
import { getSupabaseBrowserClient, isSupabaseAuthConfigured } from '@/lib/supabase/client';
import { useLanguage } from '@/components/providers/LanguageProvider';
import {
  DEFAULT_USER_SETTINGS,
  LANGUAGE_STORAGE_KEY,
  THEME_STORAGE_KEY,
  USER_SETTINGS_STORAGE_KEY,
  USER_SETTINGS_UPDATED_EVENT,
  getStoredUserSettings,
  mergeRemoteUserSettings,
  saveStoredUserSettings,
  type TextScale,
  type ThemeMode,
  type UserLanguage,
  type UserSettings,
} from '@/lib/user-settings';

const THEME_OPTIONS: readonly {
  readonly value: ThemeMode;
  readonly label: string;
  readonly sub: string;
}[] = [
  { value: 'light', label: 'Mode Terang', sub: 'Default · Ceramic Light' },
  { value: 'dark', label: 'Mode Gelap', sub: 'Pixel Obsidian UI' },
];

const TEXT_SCALE_OPTIONS: readonly {
  readonly value: TextScale;
  readonly label: string;
  readonly sample: string;
}[] = [
  { value: 'normal', label: 'Normal', sample: '100%' },
  { value: 'large', label: 'Besar', sample: '112.5%' },
  { value: 'xlarge', label: 'Ekstra Besar', sample: '125%' },
];

const LANGUAGE_OPTIONS: readonly {
  readonly value: UserLanguage;
  readonly label: string;
  readonly sub: string;
}[] = [
  { value: 'id', label: 'Bahasa Indonesia', sub: 'ID (Utama)' },
  { value: 'en', label: 'English', sub: 'EN (Preferensi)' },
];

function SettingsSwitch({
  checked,
  label,
  onChange,
}: {
  readonly checked: boolean;
  readonly label: string;
  readonly onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50 focus-visible:ring-offset-2 ${
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

interface AuthUserSummary {
  readonly id: string;
  readonly email: string | null;
  readonly displayName: string;
}

export function SettingsHub() {
  const { t } = useLanguage();
  const s = t.settings;
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_USER_SETTINGS);
  const [authUser, setAuthUser] = useState<AuthUserSummary | null>(null);
  const [osPrefersReducedMotion, setOsPrefersReducedMotion] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'local-only'>('idle');
  const [exporting, setExporting] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [submittingDelete, setSubmittingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setOsPrefersReducedMotion(prefersReduced);

    const stored = getStoredUserSettings();
    if (stored) {
      setSettings(stored);
    } else if (prefersReduced) {
      setSettings({ ...DEFAULT_USER_SETTINGS, reducedMotion: true });
    }

    const handleExternalUpdate = () => {
      const latest = getStoredUserSettings();
      if (latest) {
        setSettings(latest);
      }
    };
    const handleStorage = (event: StorageEvent) => {
      if (
        event.key === USER_SETTINGS_STORAGE_KEY ||
        event.key === THEME_STORAGE_KEY ||
        event.key === LANGUAGE_STORAGE_KEY
      ) {
        handleExternalUpdate();
      }
    };
    window.addEventListener(USER_SETTINGS_UPDATED_EVENT, handleExternalUpdate);
    window.addEventListener('storage', handleStorage);

    if (!isSupabaseAuthConfigured) {
      return () => {
        window.removeEventListener(USER_SETTINGS_UPDATED_EVENT, handleExternalUpdate);
        window.removeEventListener('storage', handleStorage);
      };
    }

    let active = true;
    const supabase = getSupabaseBrowserClient();

    async function loadAccountAndSettings(): Promise<void> {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!active || !user) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, display_name, username, settings')
          .eq('id', user.id)
          .maybeSingle();

        if (!active) return;

        const displayName =
          (typeof profile?.display_name === 'string' && profile.display_name.trim()) ||
          (typeof profile?.full_name === 'string' && profile.full_name.trim()) ||
          (typeof profile?.username === 'string' && profile.username.trim()
            ? `@${profile.username.trim()}`
            : '') ||
          user.email ||
          'Anggota ViciTech';

        setAuthUser({
          id: user.id,
          email: user.email ?? null,
          displayName,
        });

        if (
          profile?.settings &&
          typeof profile.settings === 'object' &&
          Object.keys(profile.settings).length > 0
        ) {
          const remote = mergeRemoteUserSettings(profile.settings, getStoredUserSettings());
          setSettings(remote);
          saveStoredUserSettings(remote);
        }
      } catch {
        // Tetap berjalan menggunakan preferensi lokal jika sesi belum tersedia.
      }
    }

    void loadAccountAndSettings();
    return () => {
      active = false;
      window.removeEventListener(USER_SETTINGS_UPDATED_EVENT, handleExternalUpdate);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  useEffect(() => {
    if (!deleteModalOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submittingDelete) {
        setDeleteModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteModalOpen, submittingDelete]);

  async function updateSettings(patch: Partial<UserSettings>): Promise<void> {
    const merged: UserSettings = {
      ...settings,
      ...patch,
    };
    const saved = saveStoredUserSettings(merged);
    setSettings(saved);

    if (!authUser || !isSupabaseAuthConfigured) {
      setSyncStatus('local-only');
      return;
    }

    setSyncStatus('saving');
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase
        .from('profiles')
        .update({
          settings: saved,
          updated_at: new Date().toISOString(),
        })
        .eq('id', authUser.id);

      setSyncStatus(error ? 'local-only' : 'saved');
    } catch {
      setSyncStatus('local-only');
    }
  }

  async function handleExportMyData(): Promise<void> {
    if (exporting) return;
    if (!authUser || !isSupabaseAuthConfigured) {
      setExportNotice('Silakan masuk ke akun Anda terlebih dahulu untuk mengekspor data pribadi.');
      return;
    }

    setExporting(true);
    setExportNotice(null);
    try {
      const supabase = getSupabaseBrowserClient();

      const [profileResult, ordersResult, postsByUserResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, username, full_name, display_name, bio, role, settings, created_at, updated_at')
          .eq('id', authUser.id)
          .maybeSingle(),
        supabase
          .from('orders')
          .select('*')
          .eq('user_id', authUser.id)
          .order('created_at', { ascending: false })
          .limit(200),
        supabase
          .from('community_posts')
          .select('*')
          .eq('user_id', authUser.id)
          .order('created_at', { ascending: false })
          .limit(200),
      ]);

      let communityPosts = postsByUserResult.data ?? [];
      if (postsByUserResult.error) {
        const fallbackPosts = await supabase
          .from('community_posts')
          .select('*')
          .eq('author_id', authUser.id)
          .order('created_at', { ascending: false })
          .limit(200);
        communityPosts = fallbackPosts.data ?? [];
      }

      const payload = {
        exportedAt: new Date().toISOString(),
        regulationReference: 'UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP)',
        account: {
          id: authUser.id,
          email: authUser.email,
        },
        profile: profileResult.data ?? null,
        orders: ordersResult.data ?? [],
        communityPosts,
        localSettings: settings,
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      const dateStamp = new Date().toISOString().slice(0, 10);
      anchor.href = url;
      anchor.download = `vicitech-data-saya-${dateStamp}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);

      setExportNotice(
        `Ringkasan data Anda (${(ordersResult.data ?? []).length} pesanan, ${communityPosts.length} postingan komunitas) berhasil diunduh.`,
      );
    } catch {
      setExportNotice('Gagal menyiapkan ekspor data. Silakan coba beberapa saat lagi.');
    } finally {
      setExporting(false);
    }
  }

  async function handleSubmitDeletionRequest(): Promise<void> {
    if (submittingDelete) return;
    setDeleteError(null);

    if (deleteConfirmText.trim().toUpperCase() !== 'HAPUS') {
      setDeleteError('Ketik kata HAPUS pada kolom konfirmasi untuk melanjutkan.');
      return;
    }

    if (!authUser || !isSupabaseAuthConfigured) {
      setDeleteError('Anda harus masuk ke akun terlebih dahulu untuk mengajukan penghapusan data.');
      return;
    }

    setSubmittingDelete(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const requestedAt = new Date().toISOString();
      const reasonText = deleteReason.trim()
        ? ` Alasan pengguna: ${deleteReason.trim()}`
        : '';

      const { error: feedbackError } = await supabase.from('user_feedback').insert({
        user_id: authUser.id,
        category: 'Lainnya',
        rating: 3,
        page_module: 'Penghapusan Akun / Data (UU PDP)',
        contact_name: authUser.email || authUser.displayName,
        message: `[PERMINTAAN PENGHAPUSAN AKUN / DATA UU PDP] Pengguna ${authUser.displayName} (${authUser.email ?? authUser.id}) mengajukan penghapusan akun dan data pribadi pada ${requestedAt}.${reasonText}`,
      });

      if (feedbackError) {
        setDeleteError(
          'Permintaan belum dapat dikirim ke server. Silakan coba lagi atau ajukan melalui halaman /feedback.',
        );
        return;
      }

      await updateSettings({ deletionRequestedAt: requestedAt });
      setDeleteModalOpen(false);
      setDeleteConfirmText('');
      setDeleteReason('');
    } catch {
      setDeleteError('Terjadi gangguan jaringan saat mengirim permintaan penghapusan.');
    } finally {
      setSubmittingDelete(false);
    }
  }

  const formattedDeletionDate = settings.deletionRequestedAt
    ? new Date(settings.deletionRequestedAt).toLocaleString('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : null;

  return (
    <div className="space-y-6">
      {/* ── Section 1: Tampilan & Aksesibilitas ── */}
      <section
        aria-labelledby="settings-display-heading"
        className="rounded-xl border border-default bg-surface p-5 shadow-card sm:p-7"
      >
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-default pb-4">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent-subtle text-accent-primary">
              <Eye className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2
                id="settings-display-heading"
                className="text-lg font-bold tracking-tight text-primary"
              >
                {s.displayTitle}
              </h2>
              <p className="mt-0.5 text-xs leading-relaxed text-secondary">
                {s.displayDesc}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              aria-live="polite"
              className="inline-flex items-center gap-1.5 rounded-md border border-default bg-canvas px-3 py-1 text-xs font-medium text-secondary"
            >
              {syncStatus === 'saving' ? (
                <>
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin text-accent-primary" aria-hidden="true" />
                  {s.syncSaving}
                </>
              ) : syncStatus === 'saved' ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-status-live" aria-hidden="true" />
                  {s.syncSaved}
                </>
              ) : authUser ? (
                s.syncActive
              ) : (
                s.syncLocal
              )}
            </span>

            <button
              type="button"
              onClick={() => void updateSettings(DEFAULT_USER_SETTINGS)}
              className="vt-motion-press inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-default bg-canvas px-3 text-xs font-medium text-secondary transition-all duration-200 ease-smooth hover:bg-subtle hover:text-primary active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              {s.resetBtn}
            </button>
          </div>
        </div>

        <div className="divide-y divide-default">
          {/* Tema Tampilan */}
          <div className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-lg">
              <div className="flex items-center gap-2">
                <Monitor className="h-4 w-4 text-accent-primary" aria-hidden="true" />
                <p className="text-sm font-semibold text-primary">{s.themeTitle}</p>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-secondary">
                {s.themeDescPrefix}
                <strong className="font-semibold text-primary">{s.themeDescHighlight}</strong>
                {s.themeDescSuffix}
              </p>
            </div>
            <div
              role="group"
              aria-label={s.themeTitle}
              className="grid grid-cols-2 gap-1.5 rounded-lg border border-default bg-subtle p-1"
            >
              {THEME_OPTIONS.map((opt) => {
                const selected = settings.theme === opt.value;
                const optLabel = opt.value === 'dark' ? s.themeDarkLabel : s.themeLightLabel;
                const optSub = opt.value === 'dark' ? s.themeDarkSub : s.themeLightSub;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => void updateSettings({ theme: opt.value })}
                    aria-pressed={selected}
                    className={`vt-motion-press flex min-h-11 items-center gap-2 rounded-md px-3 py-1.5 text-left text-xs font-semibold transition-all duration-200 ease-smooth active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50 ${
                      selected
                        ? 'bg-accent-primary text-white shadow-card'
                        : 'text-secondary hover:bg-surface hover:text-primary'
                    }`}
                  >
                    {opt.value === 'dark' ? (
                      <Moon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    ) : (
                      <Sun className="h-4 w-4 shrink-0" aria-hidden="true" />
                    )}
                    <span className="min-w-0">
                      <span className="block leading-tight">{optLabel}</span>
                      <span
                        className={`block text-[10px] font-normal leading-tight ${
                          selected ? 'text-white/90' : 'text-secondary'
                        }`}
                      >
                        {optSub}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bahasa */}
          <div className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-lg">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-accent-primary" aria-hidden="true" />
                <p className="text-sm font-semibold text-primary">{s.langTitle}</p>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-secondary">
                {s.langDesc}
              </p>
            </div>
            <div
              role="group"
              aria-label={s.langTitle}
              className="inline-flex rounded-lg border border-default bg-subtle p-1"
            >
              {LANGUAGE_OPTIONS.map((opt) => {
                const selected = settings.language === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => void updateSettings({ language: opt.value })}
                    aria-pressed={selected}
                    className={`vt-motion-press min-h-9 rounded-md px-3.5 text-xs font-semibold transition-all duration-200 ease-smooth active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50 ${
                      selected
                        ? 'bg-accent-primary text-white shadow-card'
                        : 'text-secondary hover:text-primary'
                    }`}
                  >
                    {opt.value === 'en' ? s.langEnSub : s.langIdSub}
                  </button>
                );
              })}
            </div>
          </div>

          {/* High Contrast */}
          <div className="flex items-center justify-between gap-4 py-5">
            <div className="max-w-lg">
              <p className="text-sm font-semibold text-primary">{s.contrastTitle}</p>
              <p className="mt-1 text-xs leading-relaxed text-secondary">
                {s.contrastDesc}
              </p>
            </div>
            <SettingsSwitch
              checked={settings.highContrast}
              label={s.contrastAria}
              onChange={() => void updateSettings({ highContrast: !settings.highContrast })}
            />
          </div>

          {/* Text Scaling */}
          <div className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-lg">
              <div className="flex items-center gap-2">
                <Type className="h-4 w-4 text-accent-primary" aria-hidden="true" />
                <p className="text-sm font-semibold text-primary">{s.textScaleTitle}</p>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-secondary">
                {s.textScaleDesc}
              </p>
            </div>
            <div
              role="group"
              aria-label={s.textScaleTitle}
              className="grid grid-cols-3 gap-1.5 rounded-lg border border-default bg-subtle p-1"
            >
              {TEXT_SCALE_OPTIONS.map((option) => {
                const selected = settings.textScale === option.value;
                const scaleLabel =
                  option.value === 'large'
                    ? s.scaleLarge
                    : option.value === 'xlarge'
                      ? s.scaleXLarge
                      : s.scaleNormal;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => void updateSettings({ textScale: option.value })}
                    aria-pressed={selected}
                    className={`vt-motion-press min-h-10 rounded-md px-3 py-1.5 text-center text-xs font-semibold transition-all duration-200 ease-smooth active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50 ${
                      selected
                        ? 'bg-accent-primary text-white shadow-card'
                        : 'text-secondary hover:bg-surface hover:text-primary'
                    }`}
                  >
                    <span className="block">{scaleLabel}</span>
                    <span
                      className={`block font-mono text-[10px] font-normal tabular-nums ${
                        selected ? 'text-white/90' : 'text-secondary'
                      }`}
                    >
                      {option.sample}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reduced Motion */}
          <div className="flex items-center justify-between gap-4 py-5">
            <div className="max-w-lg">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-accent-primary" aria-hidden="true" />
                <p className="text-sm font-semibold text-primary">{s.motionTitle}</p>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-secondary">
                {s.motionDescPrefix}
                <strong className="font-semibold text-primary">
                  {osPrefersReducedMotion ? s.motionReduced : s.motionStandard}
                </strong>
                .
              </p>
            </div>
            <SettingsSwitch
              checked={settings.reducedMotion}
              label={s.motionAria}
              onChange={() => void updateSettings({ reducedMotion: !settings.reducedMotion })}
            />
          </div>
        </div>
      </section>

      {/* ── Section 2: Privasi & Data Akun (UU PDP) ── */}
      <section
        aria-labelledby="settings-privacy-heading"
        className="rounded-xl border border-default bg-surface p-5 shadow-card sm:p-7"
      >
        <div className="flex items-start gap-3 border-b border-default pb-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent-subtle text-accent-primary">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2
              id="settings-privacy-heading"
              className="text-lg font-bold tracking-tight text-primary"
            >
              {s.privacyTitle}
            </h2>
            <p className="mt-0.5 text-xs leading-relaxed text-secondary">
              {s.privacyDesc}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {/* Card 1: Pengaturan Cookie */}
          <div className="flex flex-col justify-between rounded-xl border border-default bg-canvas p-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-bold text-primary">
                <Cookie className="h-4 w-4 text-accent-primary" aria-hidden="true" />
                <span>{s.cookieCardTitle}</span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-secondary">
                {s.cookieCardDesc}
              </p>
            </div>
            <Link
              href="/cookies"
              className="vt-motion-press mt-4 inline-flex min-h-10 items-center justify-center rounded-lg border border-default bg-surface px-4 text-xs font-semibold text-primary transition-all duration-200 ease-smooth hover:border-strong hover:bg-subtle active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50"
            >
              {s.cookieCardBtn}
            </Link>
          </div>

          {/* Card 2: Ekspor Data Saya */}
          <div className="flex flex-col justify-between rounded-xl border border-default bg-canvas p-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-bold text-primary">
                <Download className="h-4 w-4 text-accent-primary" aria-hidden="true" />
                <span>{s.exportCardTitle}</span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-secondary">
                {s.exportCardDesc}
              </p>
            </div>
            {authUser ? (
              <button
                type="button"
                onClick={() => void handleExportMyData()}
                disabled={exporting}
                className="vt-motion-press mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-accent-primary px-4 text-xs font-semibold text-white transition-all duration-200 ease-smooth hover:bg-accent-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50 focus-visible:ring-offset-2"
              >
                {exporting ? (
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                <span>{exporting ? s.exportPreparing : s.exportBtn}</span>
              </button>
            ) : (
              <Link
                href="/login"
                className="vt-motion-press mt-4 inline-flex min-h-10 items-center justify-center rounded-lg border border-default bg-surface px-4 text-xs font-semibold text-primary transition-all duration-200 ease-smooth hover:bg-subtle active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50"
              >
                {s.exportLoginBtn}
              </Link>
            )}
          </div>

          {/* Card 3: Ajukan Penghapusan Akun / Data */}
          <div className="flex flex-col justify-between rounded-xl border border-red-200 bg-red-50/40 p-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-bold text-primary">
                <Trash2 className="h-4 w-4 text-status-danger" aria-hidden="true" />
                <span>{s.deleteCardTitle}</span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-secondary">
                {s.deleteCardDesc}
              </p>
            </div>
            {authUser ? (
              <button
                type="button"
                onClick={() => {
                  setDeleteError(null);
                  setDeleteModalOpen(true);
                }}
                className="vt-motion-press mt-4 inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-red-300 bg-surface px-4 text-xs font-semibold text-red-700 transition-all duration-200 ease-smooth hover:bg-red-50 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{s.deleteBtn}</span>
              </button>
            ) : (
              <Link
                href="/login"
                className="vt-motion-press mt-4 inline-flex min-h-10 items-center justify-center rounded-lg border border-red-200 bg-surface px-4 text-xs font-semibold text-red-700 transition-all duration-200 ease-smooth hover:bg-red-50 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60"
              >
                {s.deleteLoginBtn}
              </Link>
            )}
          </div>
        </div>

        {exportNotice ? (
          <p
            aria-live="polite"
            className="mt-4 rounded-xl border border-default bg-canvas px-4 py-3 text-xs font-medium text-primary"
          >
            {exportNotice}
          </p>
        ) : null}

        {formattedDeletionDate ? (
          <div
            role="status"
            className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs leading-relaxed text-amber-950"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
            <span>
              Permintaan penghapusan akun / data Anda telah tercatat pada{' '}
              <strong>{formattedDeletionDate}</strong> dan sedang menunggu verifikasi tim admin
              ViciTech (maksimal 3×24 jam kerja).
            </span>
          </div>
        ) : null}
      </section>

      {/* ── Modal Konfirmasi Penghapusan Akun / Data ── */}
      {deleteModalOpen ? (
        <div
          className="vt-backdrop-enter fixed inset-0 z-[80] flex items-center justify-center bg-black/55 p-4"
          onClick={() => {
            if (!submittingDelete) setDeleteModalOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-account-modal-title"
            onClick={(event) => event.stopPropagation()}
            className="vt-dialog-enter w-full max-w-md rounded-xl border border-default bg-surface p-5 shadow-floating sm:p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-red-50 text-status-danger">
                  <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h3
                    id="delete-account-modal-title"
                    className="text-base font-bold text-primary"
                  >
                    Konfirmasi Penghapusan Data
                  </h3>
                  <p className="text-xs text-secondary">Hak Penghapusan Data Pribadi (UU PDP)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                disabled={submittingDelete}
                aria-label="Tutup dialog konfirmasi"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-secondary hover:bg-subtle hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <p className="mt-4 text-xs leading-relaxed text-secondary">
              Tindakan ini akan mencatat permintaan penghapusan akun{' '}
              <strong className="font-semibold text-primary">
                {authUser?.email || authUser?.displayName}
              </strong>{' '}
              untuk diverifikasi oleh admin ViciTech. Data transaksi yang masih terikat garansi
              aktif akan diproses sesuai batas retensi hukum.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label
                  htmlFor="delete-reason-input"
                  className="block text-xs font-semibold text-primary"
                >
                  Alasan (Opsional)
                </label>
                <textarea
                  id="delete-reason-input"
                  rows={2}
                  maxLength={300}
                  value={deleteReason}
                  onChange={(event) => setDeleteReason(event.target.value)}
                  placeholder="Contoh: Tidak lagi menggunakan layanan ini"
                  className="mt-1.5 w-full resize-none rounded-lg border border-default bg-subtle px-3 py-2 text-xs text-primary placeholder:text-secondary focus-visible:border-accent-primary focus-visible:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50"
                />
              </div>

              <div>
                <label
                  htmlFor="delete-confirm-input"
                  className="block text-xs font-semibold text-primary"
                >
                  Ketik <span className="font-mono text-red-700">HAPUS</span> untuk mengonfirmasi
                </label>
                <input
                  id="delete-confirm-input"
                  type="text"
                  value={deleteConfirmText}
                  onChange={(event) => setDeleteConfirmText(event.target.value)}
                  placeholder="HAPUS"
                  autoComplete="off"
                  className="mt-1.5 min-h-10 w-full rounded-lg border border-default bg-subtle px-3 font-mono text-sm text-primary placeholder:text-secondary focus-visible:border-status-danger focus-visible:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60"
                />
              </div>
            </div>

            {deleteError ? (
              <p role="alert" className="mt-3 text-xs font-medium text-red-700">
                {deleteError}
              </p>
            ) : null}

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                disabled={submittingDelete}
                className="inline-flex min-h-10 items-center justify-center rounded-lg border border-default bg-canvas px-4 text-xs font-semibold text-primary hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => void handleSubmitDeletionRequest()}
                disabled={submittingDelete || deleteConfirmText.trim().toUpperCase() !== 'HAPUS'}
                className="vt-motion-press inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg bg-status-danger px-4 text-xs font-semibold text-white transition-all duration-200 ease-smooth hover:bg-red-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60 focus-visible:ring-offset-2"
              >
                {submittingDelete ? (
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                <span>{submittingDelete ? 'Mengirim…' : 'Kirim Permintaan Penghapusan'}</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
