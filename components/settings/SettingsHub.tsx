'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Check,
  CheckCircle2,
  Cookie,
  Download,
  Eye,
  Globe,
  Hash,
  Layers,
  LoaderCircle,
  Monitor,
  Moon,
  Navigation,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Sun,
  Tag,
  Thermometer,
  Trash2,
  Type,
  Wand2,
  X,
} from 'lucide-react';
import { getSupabaseBrowserClient, isSupabaseAuthConfigured } from '@/lib/supabase/client';
import { useLanguage } from '@/components/providers/LanguageProvider';
import {
  COMFORT_PRESET_PATCHES,
  DEFAULT_USER_SETTINGS,
  LANGUAGE_STORAGE_KEY,
  THEME_STORAGE_KEY,
  USER_SETTINGS_STORAGE_KEY,
  USER_SETTINGS_UPDATED_EVENT,
  formatIdrPreference,
  formatTelemetryMetric,
  formatTemperature,
  getStoredUserSettings,
  mergeRemoteUserSettings,
  resolveActiveComfortPreset,
  saveStoredUserSettings,
  type ComfortPresetId,
  type MobileDensity,
  type NavbarScrollBehavior,
  type PixelIntensity,
  type TemperatureUnit,
  type TextScale,
  type ThemeMode,
  type UserLanguage,
  type UserSettings,
} from '@/lib/user-settings';

// ── Static Option Descriptors ──

const THEME_OPTIONS: readonly ThemeMode[] = ['light', 'dark'];
const PIXEL_INTENSITY_OPTIONS: readonly PixelIntensity[] = ['standard', 'subtle'];
const TEXT_SCALE_OPTIONS: readonly { readonly value: TextScale; readonly sample: string }[] = [
  { value: 'normal', sample: '100%' },
  { value: 'large', sample: '112.5%' },
  { value: 'xlarge', sample: '125%' },
];
const LANGUAGE_OPTIONS: readonly UserLanguage[] = ['id', 'en'];
const TEMP_UNIT_OPTIONS: readonly TemperatureUnit[] = ['C', 'F'];
const NAV_SCROLL_OPTIONS: readonly NavbarScrollBehavior[] = ['collapse', 'keep-labels'];
const MOBILE_DENSITY_OPTIONS: readonly MobileDensity[] = ['comfortable', 'compact'];
const COMFORT_PRESETS: readonly ComfortPresetId[] = ['balanced', 'readability', 'obsidian'];

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
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors after:absolute after:-inset-x-1 after:-inset-y-2 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50 focus-visible:ring-offset-2 ${
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
  const { t, isEnglish } = useLanguage();
  const s = t.settings;
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_USER_SETTINGS);
  const [authUser, setAuthUser] = useState<AuthUserSummary | null>(null);
  const [osPrefersReducedMotion, setOsPrefersReducedMotion] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'local-only'>('idle');
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [resetNotice, setResetNotice] = useState<string | null>(null);
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
    setResetNotice(null);
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
      const { data: profile, error: readError } = await supabase
        .from('profiles')
        .select('settings')
        .eq('id', authUser.id)
        .maybeSingle();
      if (readError) {
        setSyncStatus('local-only');
        return;
      }
      const existingSettings =
        profile?.settings && typeof profile.settings === 'object' && !Array.isArray(profile.settings)
          ? profile.settings
          : {};
      const { error } = await supabase
        .from('profiles')
        .update({
          settings: { ...existingSettings, ...saved },
          updated_at: new Date().toISOString(),
        })
        .eq('id', authUser.id);

      setSyncStatus(error ? 'local-only' : 'saved');
    } catch {
      setSyncStatus('local-only');
    }
  }

  async function handleConfirmResetDefaults(): Promise<void> {
    setConfirmResetOpen(false);
    await updateSettings({
      ...DEFAULT_USER_SETTINGS,
      deletionRequestedAt: settings.deletionRequestedAt ?? null,
    });
    setResetNotice(s.resetDoneNotice);
  }

  async function handleExportMyData(): Promise<void> {
    if (exporting) return;
    if (!authUser || !isSupabaseAuthConfigured) {
      setExportNotice(
        isEnglish
          ? 'Please sign in to your account first to export your personal data.'
          : 'Silakan masuk ke akun Anda terlebih dahulu untuk mengekspor data pribadi.',
      );
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
        isEnglish
          ? `Your data archive (${(ordersResult.data ?? []).length} orders, ${communityPosts.length} community posts) has been downloaded.`
          : `Ringkasan data Anda (${(ordersResult.data ?? []).length} pesanan, ${communityPosts.length} postingan komunitas) berhasil diunduh.`,
      );
    } catch {
      setExportNotice(
        isEnglish
          ? 'Unable to prepare data export right now. Please try again shortly.'
          : 'Gagal menyiapkan ekspor data. Silakan coba beberapa saat lagi.',
      );
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

  const activePreset = resolveActiveComfortPreset(settings);
  const formattedDeletionDate = settings.deletionRequestedAt
    ? new Date(settings.deletionRequestedAt).toLocaleString(isEnglish ? 'en-US' : 'id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : null;

  const previewTemp = formatTemperature(64.0, settings.temperatureUnit, 1);
  const previewFan = formatTelemetryMetric(1850, {
    compact: settings.compactNumbers,
    unit: 'RPM',
    language: settings.language,
  });
  const previewPrice = formatIdrPreference(12500000, settings.compactNumbers, settings.language);

  return (
    <div className="space-y-6">
      {/* ── Section 0: Quick Comfort Presets & Safe Reset ── */}
      <section
        aria-labelledby="settings-presets-heading"
        className="rounded-xl border border-default bg-surface p-5 shadow-card sm:p-7"
      >
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-default pb-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent-subtle text-accent-primary">
              <Wand2 className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2
                  id="settings-presets-heading"
                  className="text-lg font-bold tracking-tight text-primary"
                >
                  {s.presetsTitle}
                </h2>
                <span className="vt-pixel-tag rounded border border-default bg-canvas px-2 py-0.5 text-secondary">
                  {activePreset ? s.presetActive : s.presetCustom}
                </span>
              </div>
              <p className="mt-0.5 text-xs leading-relaxed text-secondary">{s.presetsDesc}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              aria-live="polite"
              className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-default bg-canvas px-3 py-1 text-xs font-medium text-secondary"
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
              onClick={() => {
                setResetNotice(null);
                setConfirmResetOpen((open) => !open);
              }}
              aria-expanded={confirmResetOpen}
              className="vt-motion-press inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-default bg-canvas px-3.5 text-xs font-semibold text-secondary transition-all duration-200 ease-smooth hover:bg-subtle hover:text-primary active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{s.resetBtn}</span>
            </button>
          </div>
        </div>

        {/* Inline Safe Reset Confirmation */}
        {confirmResetOpen ? (
          <div
            role="region"
            aria-label={s.resetBtn}
            className="mt-4 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5 sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="text-xs leading-relaxed text-amber-950">{s.resetConfirmPrompt}</p>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setConfirmResetOpen(false)}
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-default bg-surface px-3.5 text-xs font-semibold text-primary hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50"
              >
                {s.resetCancelAction}
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmResetDefaults()}
                className="vt-motion-press inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-accent-primary px-4 text-xs font-semibold text-white transition-all hover:bg-accent-hover active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{s.resetConfirmAction}</span>
              </button>
            </div>
          </div>
        ) : null}

        {resetNotice ? (
          <p
            role="status"
            aria-live="polite"
            className="mt-4 flex items-center gap-2 rounded-lg border border-default bg-canvas px-3.5 py-2.5 text-xs font-medium text-primary"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0 text-status-live" aria-hidden="true" />
            <span>{resetNotice}</span>
          </p>
        ) : null}

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {COMFORT_PRESETS.map((presetId) => {
            const isSelected = activePreset === presetId;
            const title =
              presetId === 'readability'
                ? s.presetReadabilityTitle
                : presetId === 'obsidian'
                  ? s.presetObsidianTitle
                  : s.presetBalancedTitle;
            const desc =
              presetId === 'readability'
                ? s.presetReadabilityDesc
                : presetId === 'obsidian'
                  ? s.presetObsidianDesc
                  : s.presetBalancedDesc;
            const Icon =
              presetId === 'readability' ? Eye : presetId === 'obsidian' ? Moon : Sun;

            return (
              <button
                key={presetId}
                type="button"
                aria-pressed={isSelected}
                onClick={() => {
                  setConfirmResetOpen(false);
                  void updateSettings(COMFORT_PRESET_PATCHES[presetId]);
                }}
                className={`vt-motion-press flex min-h-11 flex-col justify-between rounded-xl border p-4 text-left transition-all duration-200 ease-smooth active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50 ${
                  isSelected
                    ? 'border-accent-primary bg-accent-subtle shadow-card'
                    : 'border-default bg-canvas hover:border-strong hover:bg-subtle'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
                      isSelected
                        ? 'bg-accent-primary text-white'
                        : 'bg-surface text-accent-primary border border-default'
                    }`}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  {isSelected ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                      <Check className="h-3 w-3" aria-hidden="true" />
                      {s.presetActive}
                    </span>
                  ) : null}
                </div>
                <div className="mt-3">
                  <p className="text-sm font-bold text-primary">{title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-secondary">{desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Section 1: Appearance & Pixel UX ── */}
      <section
        aria-labelledby="settings-display-heading"
        className="rounded-xl border border-default bg-surface p-5 shadow-card sm:p-7"
      >
        <div className="flex items-start gap-3 border-b border-default pb-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent-subtle text-accent-primary">
            <SlidersHorizontal className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2
              id="settings-display-heading"
              className="text-lg font-bold tracking-tight text-primary"
            >
              {s.displayTitle}
            </h2>
            <p className="mt-0.5 text-xs leading-relaxed text-secondary">{s.displayDesc}</p>
          </div>
        </div>

        <div className="divide-y divide-default">
          {/* Theme */}
          <div
            data-settings-row="true"
            className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="max-w-lg min-w-0">
              <div className="flex items-center gap-2">
                <Monitor className="h-4 w-4 shrink-0 text-accent-primary" aria-hidden="true" />
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
              className="grid shrink-0 grid-cols-1 gap-1.5 rounded-lg border border-default bg-subtle p-1 min-[380px]:grid-cols-2"
            >
              {THEME_OPTIONS.map((value) => {
                const selected = settings.theme === value;
                const optLabel = value === 'dark' ? s.themeDarkLabel : s.themeLightLabel;
                const optSub = value === 'dark' ? s.themeDarkSub : s.themeLightSub;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => void updateSettings({ theme: value })}
                    aria-pressed={selected}
                    className={`vt-motion-press flex min-h-11 items-center gap-2 rounded-md px-3 py-1.5 text-left text-xs font-semibold transition-all duration-200 ease-smooth active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50 ${
                      selected
                        ? 'bg-accent-primary text-white shadow-card'
                        : 'text-secondary hover:bg-surface hover:text-primary'
                    }`}
                  >
                    {value === 'dark' ? (
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

          {/* Pixel UI Accent Intensity */}
          <div
            data-settings-row="true"
            className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="max-w-lg min-w-0">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 shrink-0 text-accent-primary" aria-hidden="true" />
                <p className="text-sm font-semibold text-primary">{s.pixelIntensityTitle}</p>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-secondary">
                {s.pixelIntensityDesc}
              </p>
            </div>
            <div
              role="group"
              aria-label={s.pixelIntensityTitle}
              className="grid shrink-0 grid-cols-1 gap-1.5 rounded-lg border border-default bg-subtle p-1 min-[380px]:grid-cols-2"
            >
              {PIXEL_INTENSITY_OPTIONS.map((value) => {
                const selected = settings.pixelIntensity === value;
                const optLabel = value === 'subtle' ? s.pixelSubtleLabel : s.pixelStandardLabel;
                const optSub = value === 'subtle' ? s.pixelSubtleSub : s.pixelStandardSub;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => void updateSettings({ pixelIntensity: value })}
                    aria-pressed={selected}
                    className={`vt-motion-press min-h-11 rounded-md px-3.5 py-1.5 text-left text-xs font-semibold transition-all duration-200 ease-smooth active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50 ${
                      selected
                        ? 'bg-accent-primary text-white shadow-card'
                        : 'text-secondary hover:bg-surface hover:text-primary'
                    }`}
                  >
                    <span className="block leading-tight">{optLabel}</span>
                    <span
                      className={`block text-[10px] font-normal leading-tight ${
                        selected ? 'text-white/90' : 'text-secondary'
                      }`}
                    >
                      {optSub}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Text Scale */}
          <div
            data-settings-row="true"
            className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="max-w-lg min-w-0">
              <div className="flex items-center gap-2">
                <Type className="h-4 w-4 shrink-0 text-accent-primary" aria-hidden="true" />
                <p className="text-sm font-semibold text-primary">{s.textScaleTitle}</p>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-secondary">{s.textScaleDesc}</p>
            </div>
            <div
              role="group"
              aria-label={s.textScaleTitle}
              className="grid shrink-0 grid-cols-1 gap-1.5 rounded-lg border border-default bg-subtle p-1 min-[380px]:grid-cols-3"
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
                    className={`vt-motion-press min-h-11 rounded-md px-3 py-1.5 text-center text-xs font-semibold transition-all duration-200 ease-smooth active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50 ${
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

          {/* High Contrast */}
          <div
            data-settings-row="true"
            className="flex items-center justify-between gap-4 py-5"
          >
            <div className="max-w-lg min-w-0">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 shrink-0 text-accent-primary" aria-hidden="true" />
                <p className="text-sm font-semibold text-primary">{s.contrastTitle}</p>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-secondary">{s.contrastDesc}</p>
            </div>
            <SettingsSwitch
              checked={settings.highContrast}
              label={s.contrastAria}
              onChange={() => void updateSettings({ highContrast: !settings.highContrast })}
            />
          </div>

          {/* Reduced Motion */}
          <div
            data-settings-row="true"
            className="flex items-center justify-between gap-4 py-5"
          >
            <div className="max-w-lg min-w-0">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 shrink-0 text-accent-primary" aria-hidden="true" />
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

      {/* ── Section 2: Language & Telemetry Readout ── */}
      <section
        aria-labelledby="settings-telemetry-heading"
        className="rounded-xl border border-default bg-surface p-5 shadow-card sm:p-7"
      >
        <div className="flex items-start gap-3 border-b border-default pb-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent-subtle text-accent-primary">
            <Activity className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2
              id="settings-telemetry-heading"
              className="text-lg font-bold tracking-tight text-primary"
            >
              {s.telemetrySectionTitle}
            </h2>
            <p className="mt-0.5 text-xs leading-relaxed text-secondary">
              {s.telemetrySectionDesc}
            </p>
          </div>
        </div>

        <div className="divide-y divide-default">
          {/* Global Language */}
          <div
            data-settings-row="true"
            className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="max-w-lg min-w-0">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 shrink-0 text-accent-primary" aria-hidden="true" />
                <p className="text-sm font-semibold text-primary">{s.langTitle}</p>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-secondary">{s.langDesc}</p>
            </div>
            <div
              role="group"
              aria-label={s.langTitle}
              className="grid shrink-0 grid-cols-2 gap-1.5 rounded-lg border border-default bg-subtle p-1"
            >
              {LANGUAGE_OPTIONS.map((code) => {
                const selected = settings.language === code;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => void updateSettings({ language: code })}
                    aria-pressed={selected}
                    className={`vt-motion-press min-h-11 rounded-md px-3.5 text-xs font-semibold transition-all duration-200 ease-smooth active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50 ${
                      selected
                        ? 'bg-accent-primary text-white shadow-card'
                        : 'text-secondary hover:bg-surface hover:text-primary'
                    }`}
                  >
                    {code === 'en' ? s.langEnSub : s.langIdSub}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Temperature Unit */}
          <div
            data-settings-row="true"
            className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="max-w-lg min-w-0">
              <div className="flex items-center gap-2">
                <Thermometer className="h-4 w-4 shrink-0 text-accent-primary" aria-hidden="true" />
                <p className="text-sm font-semibold text-primary">{s.tempUnitTitle}</p>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-secondary">{s.tempUnitDesc}</p>
            </div>
            <div
              role="group"
              aria-label={s.tempUnitTitle}
              className="grid shrink-0 grid-cols-2 gap-1.5 rounded-lg border border-default bg-subtle p-1"
            >
              {TEMP_UNIT_OPTIONS.map((unit) => {
                const selected = settings.temperatureUnit === unit;
                return (
                  <button
                    key={unit}
                    type="button"
                    onClick={() => void updateSettings({ temperatureUnit: unit })}
                    aria-pressed={selected}
                    className={`vt-motion-press min-h-11 rounded-md px-3.5 font-mono text-xs font-semibold transition-all duration-200 ease-smooth active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50 ${
                      selected
                        ? 'bg-accent-primary text-white shadow-card'
                        : 'text-secondary hover:bg-surface hover:text-primary'
                    }`}
                  >
                    {unit === 'F' ? s.tempFahrenheitLabel : s.tempCelsiusLabel}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Compact Numbers */}
          <div
            data-settings-row="true"
            className="flex items-center justify-between gap-4 py-5"
          >
            <div className="max-w-lg min-w-0">
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 shrink-0 text-accent-primary" aria-hidden="true" />
                <p className="text-sm font-semibold text-primary">{s.compactNumbersTitle}</p>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-secondary">
                {s.compactNumbersDesc}
              </p>
            </div>
            <SettingsSwitch
              checked={settings.compactNumbers}
              label={s.compactNumbersAria}
              onChange={() => void updateSettings({ compactNumbers: !settings.compactNumbers })}
            />
          </div>

          {/* Data-Source Badge Visibility */}
          <div
            data-settings-row="true"
            className="flex items-center justify-between gap-4 py-5"
          >
            <div className="max-w-lg min-w-0">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 shrink-0 text-accent-primary" aria-hidden="true" />
                <p className="text-sm font-semibold text-primary">{s.sourceBadgesTitle}</p>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-secondary">
                {s.sourceBadgesDesc}
              </p>
            </div>
            <SettingsSwitch
              checked={settings.showSourceBadges}
              label={s.sourceBadgesAria}
              onChange={() =>
                void updateSettings({ showSourceBadges: !settings.showSourceBadges })
              }
            />
          </div>
        </div>

        {/* Live Telemetry & Readout Preview */}
        <div className="mt-2 rounded-xl border border-default bg-canvas p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-secondary">
              <span className="vt-pixel-led bg-accent-primary" aria-hidden="true" />
              <span>{s.readoutPreviewTitle}</span>
            </span>
            {settings.showSourceBadges ? (
              <span className="vt-badge-simulated">Simulated / Demo</span>
            ) : (
              <span className="text-[11px] text-secondary">{s.readoutPreviewBadgesMinimal}</span>
            )}
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="flex items-center justify-between gap-2 rounded-lg border border-default bg-surface px-3 py-2 sm:block">
              <p className="text-[11px] text-secondary">{s.readoutPreviewTemp}</p>
              <p className="font-mono text-sm font-bold tabular-nums text-primary sm:mt-0.5">
                {previewTemp}
              </p>
            </div>
            <div className="flex items-center justify-between gap-2 rounded-lg border border-default bg-surface px-3 py-2 sm:block">
              <p className="text-[11px] text-secondary">{s.readoutPreviewFan}</p>
              <p className="font-mono text-sm font-bold tabular-nums text-primary sm:mt-0.5">
                {previewFan}
              </p>
            </div>
            <div className="flex items-center justify-between gap-2 rounded-lg border border-default bg-surface px-3 py-2 sm:block">
              <p className="text-[11px] text-secondary">{s.readoutPreviewPrice}</p>
              <p className="font-mono text-sm font-bold tabular-nums text-accent-primary sm:mt-0.5">
                {previewPrice}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 3: Navigation & Mobile Comfort ── */}
      <section
        aria-labelledby="settings-nav-heading"
        className="rounded-xl border border-default bg-surface p-5 shadow-card sm:p-7"
      >
        <div className="flex items-start gap-3 border-b border-default pb-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent-subtle text-accent-primary">
            <Smartphone className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2
              id="settings-nav-heading"
              className="text-lg font-bold tracking-tight text-primary"
            >
              {s.navSectionTitle}
            </h2>
            <p className="mt-0.5 text-xs leading-relaxed text-secondary">{s.navSectionDesc}</p>
          </div>
        </div>

        <div className="divide-y divide-default">
          {/* Navbar Scroll Behavior */}
          <div
            data-settings-row="true"
            className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="max-w-lg min-w-0">
              <div className="flex items-center gap-2">
                <Navigation className="h-4 w-4 shrink-0 text-accent-primary" aria-hidden="true" />
                <p className="text-sm font-semibold text-primary">{s.navScrollTitle}</p>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-secondary">{s.navScrollDesc}</p>
            </div>
            <div
              role="group"
              aria-label={s.navScrollTitle}
              className="grid shrink-0 grid-cols-1 gap-1.5 rounded-lg border border-default bg-subtle p-1 min-[380px]:grid-cols-2"
            >
              {NAV_SCROLL_OPTIONS.map((behavior) => {
                const selected = settings.navbarScrollBehavior === behavior;
                const optLabel =
                  behavior === 'keep-labels' ? s.navScrollKeepLabel : s.navScrollCollapseLabel;
                const optSub =
                  behavior === 'keep-labels' ? s.navScrollKeepSub : s.navScrollCollapseSub;
                return (
                  <button
                    key={behavior}
                    type="button"
                    onClick={() => void updateSettings({ navbarScrollBehavior: behavior })}
                    aria-pressed={selected}
                    className={`vt-motion-press min-h-11 rounded-md px-3.5 py-1.5 text-left text-xs font-semibold transition-all duration-200 ease-smooth active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50 ${
                      selected
                        ? 'bg-accent-primary text-white shadow-card'
                        : 'text-secondary hover:bg-surface hover:text-primary'
                    }`}
                  >
                    <span className="block leading-tight">{optLabel}</span>
                    <span
                      className={`block text-[10px] font-normal leading-tight ${
                        selected ? 'text-white/90' : 'text-secondary'
                      }`}
                    >
                      {optSub}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mobile Density */}
          <div
            data-settings-row="true"
            className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="max-w-lg min-w-0">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 shrink-0 text-accent-primary" aria-hidden="true" />
                <p className="text-sm font-semibold text-primary">{s.mobileDensityTitle}</p>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-secondary">
                {s.mobileDensityDesc}
              </p>
            </div>
            <div
              role="group"
              aria-label={s.mobileDensityTitle}
              className="grid shrink-0 grid-cols-1 gap-1.5 rounded-lg border border-default bg-subtle p-1 min-[380px]:grid-cols-2"
            >
              {MOBILE_DENSITY_OPTIONS.map((density) => {
                const selected = settings.mobileDensity === density;
                const optLabel =
                  density === 'compact'
                    ? s.mobileDensityCompactLabel
                    : s.mobileDensityComfortableLabel;
                const optSub =
                  density === 'compact'
                    ? s.mobileDensityCompactSub
                    : s.mobileDensityComfortableSub;
                return (
                  <button
                    key={density}
                    type="button"
                    onClick={() => void updateSettings({ mobileDensity: density })}
                    aria-pressed={selected}
                    className={`vt-motion-press min-h-11 rounded-md px-3.5 py-1.5 text-left text-xs font-semibold transition-all duration-200 ease-smooth active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50 ${
                      selected
                        ? 'bg-accent-primary text-white shadow-card'
                        : 'text-secondary hover:bg-surface hover:text-primary'
                    }`}
                  >
                    <span className="block leading-tight">{optLabel}</span>
                    <span
                      className={`block text-[10px] font-normal leading-tight ${
                        selected ? 'text-white/90' : 'text-secondary'
                      }`}
                    >
                      {optSub}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <p className="mt-2 flex items-start gap-2 rounded-lg border border-default bg-canvas px-3.5 py-2.5 text-xs leading-relaxed text-secondary">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-status-live" aria-hidden="true" />
          <span>{s.touchTargetNote}</span>
        </p>
      </section>

      {/* ── Section 4: Privasi & Data Akun (UU PDP) ── */}
      <section
        aria-labelledby="settings-privacy-heading"
        className="rounded-xl border border-default bg-surface p-5 shadow-card sm:p-7"
      >
        <div className="flex items-start gap-3 border-b border-default pb-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent-subtle text-accent-primary">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2
              id="settings-privacy-heading"
              className="text-lg font-bold tracking-tight text-primary"
            >
              {s.privacyTitle}
            </h2>
            <p className="mt-0.5 text-xs leading-relaxed text-secondary">{s.privacyDesc}</p>
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
              className="vt-motion-press mt-4 inline-flex min-h-11 items-center justify-center rounded-lg border border-default bg-surface px-4 text-xs font-semibold text-primary transition-all duration-200 ease-smooth hover:border-strong hover:bg-subtle active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50"
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
                className="vt-motion-press mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-accent-primary px-4 text-xs font-semibold text-white transition-all duration-200 ease-smooth hover:bg-accent-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50 focus-visible:ring-offset-2"
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
                className="vt-motion-press mt-4 inline-flex min-h-11 items-center justify-center rounded-lg border border-default bg-surface px-4 text-xs font-semibold text-primary transition-all duration-200 ease-smooth hover:bg-subtle active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50"
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
                className="vt-motion-press mt-4 inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-red-300 bg-surface px-4 text-xs font-semibold text-red-700 transition-all duration-200 ease-smooth hover:bg-red-50 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{s.deleteBtn}</span>
              </button>
            ) : (
              <Link
                href="/login"
                className="vt-motion-press mt-4 inline-flex min-h-11 items-center justify-center rounded-lg border border-red-200 bg-surface px-4 text-xs font-semibold text-red-700 transition-all duration-200 ease-smooth hover:bg-red-50 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60"
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
            className="vt-dialog-enter max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-xl border border-default bg-surface p-5 shadow-floating sm:p-6"
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
                    {s.deleteModalTitle}
                  </h3>
                  <p className="text-xs text-secondary">{s.deleteModalSub}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                disabled={submittingDelete}
                aria-label="Tutup dialog konfirmasi"
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-secondary hover:bg-subtle hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <p className="mt-4 text-xs leading-relaxed text-secondary">
              Tindakan ini akan mencatat permintaan penghapusan akun{' '}
              <strong className="break-all font-semibold text-primary">
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
                  className="mt-1.5 min-h-11 w-full rounded-lg border border-default bg-subtle px-3 font-mono text-sm text-primary placeholder:text-secondary focus-visible:border-status-danger focus-visible:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60"
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
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-default bg-canvas px-4 text-xs font-semibold text-primary hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50"
              >
                {s.deleteCancel}
              </button>
              <button
                type="button"
                onClick={() => void handleSubmitDeletionRequest()}
                disabled={submittingDelete || deleteConfirmText.trim().toUpperCase() !== 'HAPUS'}
                className="vt-motion-press inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-status-danger px-4 text-xs font-semibold text-white transition-all duration-200 ease-smooth hover:bg-red-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60 focus-visible:ring-offset-2"
              >
                {submittingDelete ? (
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                <span>{submittingDelete ? s.deleteSending : s.deleteSubmit}</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
