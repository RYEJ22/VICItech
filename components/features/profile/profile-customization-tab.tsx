'use client';

import { useRef, useState } from 'react';
import type { ChangeEvent, CSSProperties, FormEvent, ReactElement } from 'react';
import {
  Check,
  ImagePlus,
  LoaderCircle,
  Save,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  MAX_BIO_LENGTH,
  MAX_FEATURED_RIG_LENGTH,
  MAX_STATUS_LENGTH,
  PROFILE_ACCENT_SWATCHES,
  PROFILE_BANNER_PRESETS,
  isPresetBannerValue,
  validateProfileDraft,
} from '@/lib/profile/profile-types';
import type {
  ProfileBannerPresetId,
  ProfileFormDraft,
  UnifiedProfile,
} from '@/lib/profile/profile-types';
import { saveProfileCustomization } from '@/lib/profile/profile-service';
import {
  PROFILE_MEDIA_ACCEPT,
  uploadProfileMediaFile,
} from '@/lib/storage/uploadProfileMedia';
import { ProfileHeaderCard } from './profile-header-card';
import styles from './profile-hub.module.css';

interface ProfileCustomizationTabProps {
  readonly userId: string;
  readonly profile: UnifiedProfile;
  readonly stats: {
    readonly communityPosts: number;
    readonly savedPresets: number;
  };
  readonly onSaved: (updated: UnifiedProfile, message: string) => void;
}

const PRESET_CLASS_MAP: Readonly<Record<ProfileBannerPresetId, string | undefined>> = {
  'alabaster-grid': styles.preset_alabaster_grid,
  'ember-horizon': styles.preset_ember_horizon,
  'graphite-circuit': styles.preset_graphite_circuit,
  'emerald-bench': styles.preset_emerald_bench,
  'indigo-blueprint': styles.preset_indigo_blueprint,
};

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas';
const fieldClass = `min-h-11 w-full rounded-lg border border-default bg-canvas px-3.5 py-2.5 text-sm text-primary placeholder:text-secondary ${focusRing}`;

export function ProfileCustomizationTab({
  userId,
  profile,
  stats,
  onSaved,
}: ProfileCustomizationTabProps): ReactElement {
  const [draft, setDraft] = useState<ProfileFormDraft>(() => ({
    username: profile.username,
    displayName: profile.displayName,
    avatarUrl: profile.avatarUrl ?? '',
    bannerUrl: profile.bannerUrl ?? 'preset:alabaster-grid',
    bio: profile.bio ?? '',
    statusText: profile.statusText ?? '',
    accentColor: profile.accentColor,
    featuredRig: profile.featuredRig ?? '',
  }));
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [uploadNotice, setUploadNotice] = useState('');

  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const bannerInputRef = useRef<HTMLInputElement | null>(null);

  const livePreviewProfile: UnifiedProfile = {
    ...profile,
    username: draft.username.trim() || profile.username,
    displayName: draft.displayName.trim() || profile.displayName,
    avatarUrl: draft.avatarUrl.trim() || null,
    bannerUrl: draft.bannerUrl.trim() || null,
    bio: draft.bio.trim() || null,
    statusText: draft.statusText.trim() || null,
    accentColor: draft.accentColor,
    featuredRig: draft.featuredRig.trim() || null,
  };

  const handleUpload = async (
    event: ChangeEvent<HTMLInputElement>,
    kind: 'avatar' | 'banner',
  ): Promise<void> => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setFormError('');
    setUploadNotice('');
    if (kind === 'avatar') setUploadingAvatar(true);
    else setUploadingBanner(true);

    try {
      const uploaded = await uploadProfileMediaFile({ file, userId, kind });
      const nextDraft: ProfileFormDraft = {
        ...draft,
        username: draft.username.trim() || profile.username,
        displayName: draft.displayName.trim() || profile.displayName,
        ...(kind === 'avatar' ? { avatarUrl: uploaded.url } : { bannerUrl: uploaded.url }),
      };
      setDraft(nextDraft);

      // Langsung simpan URL avatar/banner baru ke tabel profiles di Supabase agar langsung aktif
      const saveRes = await saveProfileCustomization(userId, nextDraft);
      if (!saveRes.ok) {
        setFormError(saveRes.error);
        return;
      }

      setDraft({
        username: saveRes.profile.username,
        displayName: saveRes.profile.displayName,
        avatarUrl: saveRes.profile.avatarUrl ?? '',
        bannerUrl: saveRes.profile.bannerUrl ?? 'preset:alabaster-grid',
        bio: saveRes.profile.bio ?? '',
        statusText: saveRes.profile.statusText ?? '',
        accentColor: saveRes.profile.accentColor,
        featuredRig: saveRes.profile.featuredRig ?? '',
      });
      const successMsg =
        kind === 'avatar'
          ? 'Foto profil berhasil diunggah dan diperbarui.'
          : 'Banner profil berhasil diunggah dan diperbarui.';
      setUploadNotice(successMsg);
      onSaved(saveRes.profile, successMsg);
    } catch (uploadErr: unknown) {
      setFormError(
        uploadErr instanceof Error ? uploadErr.message : 'Gagal mengunggah gambar profil.',
      );
    } finally {
      if (kind === 'avatar') setUploadingAvatar(false);
      else setUploadingBanner(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setFormError('');

    const validation = validateProfileDraft(draft);
    if (!validation.ok) {
      setFormError(validation.error);
      return;
    }

    setIsSaving(true);
    try {
      const result = await saveProfileCustomization(userId, validation.normalized);
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      setDraft({
        username: result.profile.username,
        displayName: result.profile.displayName,
        avatarUrl: result.profile.avatarUrl ?? '',
        bannerUrl: result.profile.bannerUrl ?? 'preset:alabaster-grid',
        bio: result.profile.bio ?? '',
        statusText: result.profile.statusText ?? '',
        accentColor: result.profile.accentColor,
        featuredRig: result.profile.featuredRig ?? '',
      });
      onSaved(
        result.profile,
        'Perubahan profil dan kustomisasi berhasil disimpan.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      {/* Left: Customization Form */}
      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-xl border border-default bg-surface p-5 shadow-sm lg:col-span-7 sm:p-6"
      >
        <div className="border-b border-default pb-3">
          <h2 className="tracking-tight font-sans text-xl font-bold text-primary">
            Kustomisasi &amp; Pengaturan Profil
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-secondary sm:text-sm">
            Atur tampilan kartu profil publik, foto, banner latar, status singkat, dan perangkat utama Anda.
          </p>
        </div>

        {/* Avatar Uploader */}
        <div className="space-y-2.5">
          <p className="text-sm font-medium text-primary">Foto Profil (JPG/PNG/WebP · Maks 3 MB)</p>
          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={avatarInputRef}
              type="file"
              accept={PROFILE_MEDIA_ACCEPT}
              onChange={(e) => void handleUpload(e, 'avatar')}
              className="sr-only"
              id="profile-avatar-upload"
            />
            <button
              type="button"
              disabled={uploadingAvatar || isSaving}
              onClick={() => avatarInputRef.current?.click()}
              className={`vt-btn-tactile inline-flex min-h-11 items-center gap-2 rounded-lg border border-default bg-canvas px-4 py-2 text-xs font-semibold text-primary hover:bg-subtle disabled:opacity-60 sm:text-sm ${focusRing}`}
            >
              {uploadingAvatar ? (
                <LoaderCircle className="h-4 w-4 animate-spin text-accent-cta" aria-hidden="true" />
              ) : (
                <Upload className="h-4 w-4 text-accent-cta" strokeWidth={1.75} aria-hidden="true" />
              )}
              <span>{uploadingAvatar ? 'Mengunggah foto…' : 'Unggah Foto Profil'}</span>
            </button>
            {draft.avatarUrl && (
              <button
                type="button"
                onClick={() => setDraft((prev) => ({ ...prev, avatarUrl: '' }))}
                className={`vt-btn-tactile inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-default bg-surface px-3 py-2 text-xs font-medium text-secondary hover:text-status-danger ${focusRing}`}
              >
                <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                <span>Hapus Foto</span>
              </button>
            )}
          </div>
        </div>

        {/* Banner Uploader & Curated Presets */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-primary">
              Banner / Latar Belakang (JPG/PNG/WebP · Maks 3 MB)
            </p>
            <input
              ref={bannerInputRef}
              type="file"
              accept={PROFILE_MEDIA_ACCEPT}
              onChange={(e) => void handleUpload(e, 'banner')}
              className="sr-only"
              id="profile-banner-upload"
            />
            <button
              type="button"
              disabled={uploadingBanner || isSaving}
              onClick={() => bannerInputRef.current?.click()}
              className={`vt-btn-tactile inline-flex min-h-11 items-center gap-2 rounded-lg border border-default bg-canvas px-3.5 py-2 text-xs font-semibold text-primary hover:bg-subtle disabled:opacity-60 ${focusRing}`}
            >
              {uploadingBanner ? (
                <LoaderCircle className="h-4 w-4 animate-spin text-accent-cta" aria-hidden="true" />
              ) : (
                <ImagePlus className="h-4 w-4 text-accent-cta" strokeWidth={1.75} aria-hidden="true" />
              )}
              <span>{uploadingBanner ? 'Mengunggah banner…' : 'Unggah Banner Kustom'}</span>
            </button>
          </div>

          <div>
            <p className="mb-2 text-xs text-secondary">Atau pilih tema banner editorial terkurasi:</p>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
              {PROFILE_BANNER_PRESETS.map((preset) => {
                const selected = draft.bannerUrl === preset.value;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setDraft((prev) => ({ ...prev, bannerUrl: preset.value }))}
                    className={`vt-btn-tactile group flex min-h-11 flex-col overflow-hidden rounded-lg border text-left ${focusRing} ${
                      selected ? 'border-accent-cta ring-2 ring-accent-primary/25' : 'border-default'
                    }`}
                  >
                    <span className={`block h-9 w-full ${PRESET_CLASS_MAP[preset.id] ?? ''}`} />
                    <span className="block truncate px-2 py-1 text-[11px] font-medium text-primary">
                      {preset.label}
                    </span>
                  </button>
                );
              })}
            </div>
            {!isPresetBannerValue(draft.bannerUrl) && draft.bannerUrl && (
              <p className="mt-2 text-xs text-secondary">
                Saat ini menggunakan gambar banner unggahan Anda sendiri.
              </p>
            )}
          </div>
        </div>

        {/* Text Fields */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="pf-display-name" className="mb-1.5 block text-sm font-medium text-primary">
              Nama Tampilan
            </label>
            <input
              id="pf-display-name"
              type="text"
              value={draft.displayName}
              maxLength={80}
              required
              onChange={(e) => setDraft((prev) => ({ ...prev, displayName: e.target.value }))}
              className={fieldClass}
            />
          </div>

          <div>
            <label htmlFor="pf-username" className="mb-1.5 block text-sm font-medium text-primary">
              Username
            </label>
            <div className="flex min-h-11 items-center rounded-lg border border-default bg-canvas px-3 focus-within:ring-2 focus-within:ring-accent-primary/60">
              <span className="font-mono text-sm text-secondary">@</span>
              <input
                id="pf-username"
                type="text"
                value={draft.username}
                maxLength={20}
                required
                pattern="[a-z0-9_]{3,20}"
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''),
                  }))
                }
                className="w-full bg-transparent px-2 py-2 font-mono text-sm text-primary outline-none"
              />
            </div>
            <p className="mt-1 text-[11px] text-secondary">
              3–20 huruf kecil, angka, atau garis bawah (_).
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <label htmlFor="pf-status" className="font-medium text-primary">
                Status Singkat
              </label>
              <span className="font-mono text-[11px] text-secondary">
                {draft.statusText.length}/{MAX_STATUS_LENGTH}
              </span>
            </div>
            <input
              id="pf-status"
              type="text"
              value={draft.statusText}
              maxLength={MAX_STATUS_LENGTH}
              placeholder="Contoh: Lagi rakit PC 10jt"
              onChange={(e) => setDraft((prev) => ({ ...prev, statusText: e.target.value }))}
              className={fieldClass}
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <label htmlFor="pf-rig" className="font-medium text-primary">
                Perangkat Utama
              </label>
              <span className="font-mono text-[11px] text-secondary">
                {draft.featuredRig.length}/{MAX_FEATURED_RIG_LENGTH}
              </span>
            </div>
            <input
              id="pf-rig"
              type="text"
              value={draft.featuredRig}
              maxLength={MAX_FEATURED_RIG_LENGTH}
              placeholder="Contoh: Acer Aspire Lite / RTX 4060"
              onChange={(e) => setDraft((prev) => ({ ...prev, featuredRig: e.target.value }))}
              className={`${fieldClass} font-mono`}
            />
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <label htmlFor="pf-bio" className="font-medium text-primary">
              Bio Singkat
            </label>
            <span className="font-mono text-[11px] text-secondary">
              {draft.bio.length}/{MAX_BIO_LENGTH}
            </span>
          </div>
          <textarea
            id="pf-bio"
            rows={3}
            value={draft.bio}
            maxLength={MAX_BIO_LENGTH}
            placeholder="Ceritakan minat rakitan PC, laptop, atau proyek lab Anda..."
            onChange={(e) => setDraft((prev) => ({ ...prev, bio: e.target.value }))}
            className={`${fieldClass} resize-y`}
          />
        </div>

        {/* Profile Accent Swatches */}
        <div>
          <p className="mb-2 text-sm font-medium text-primary">Warna Aksen Profil</p>
          <div className="flex flex-wrap items-center gap-2.5" role="group" aria-label="Pilih warna aksen profil">
            {PROFILE_ACCENT_SWATCHES.map((swatch) => {
              const active = draft.accentColor.toUpperCase() === swatch.hex;
              const swatchStyle: CSSProperties & Record<`--${string}`, string | number> = {
                '--swatch-color': swatch.hex,
              };
              return (
                <button
                  key={swatch.hex}
                  type="button"
                  style={swatchStyle}
                  aria-label={swatch.label}
                  aria-pressed={active}
                  title={swatch.label}
                  onClick={() => setDraft((prev) => ({ ...prev, accentColor: swatch.hex }))}
                  className={`vt-btn-tactile grid h-11 w-11 place-items-center rounded-full border-2 text-white ${styles.swatchButton ?? ''} ${focusRing} ${
                    active ? 'border-primary ring-2 ring-accent-primary/40' : 'border-surface'
                  }`}
                >
                  {active && <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </div>

        {formError && (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-800 sm:text-sm">
            {formError}
          </p>
        )}

        {uploadNotice && !formError && (
          <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-900 sm:text-sm">
            {uploadNotice}
          </p>
        )}

        <div className="border-t border-default pt-4">
          <button
            type="submit"
            disabled={isSaving || uploadingAvatar || uploadingBanner}
            className={`vt-btn-tactile inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-accent-cta px-6 py-2.5 text-sm font-semibold text-white hover:bg-accent-cta-hover disabled:cursor-wait disabled:opacity-60 ${focusRing}`}
          >
            {isSaving ? (
              <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            )}
            <span>{isSaving ? 'Menyimpan Perubahan…' : 'Simpan Perubahan'}</span>
          </button>
        </div>
      </form>

      {/* Right: Live Profile Card Preview */}
      <div className="space-y-3 lg:col-span-5 lg:sticky lg:top-24 lg:self-start">
        <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
          Pratinjau Kartu Profil
        </p>
        <ProfileHeaderCard
          profile={livePreviewProfile}
          stats={stats}
          isOwner
          isPreview
        />
      </div>
    </div>
  );
}
