'use client';

import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, CSSProperties, FormEvent, ReactElement } from 'react';
import {
  Check,
  Flame,
  LoaderCircle,
  Save,
  Trash2,
  Upload,
} from 'lucide-react';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { isSupabaseAuthConfigured } from '@/lib/supabase/client';
import {
  MAX_BIO_LENGTH,
  MAX_FEATURED_RIG_LENGTH,
  MAX_STATUS_LENGTH,
  PROFILE_ACCENT_SWATCHES,
  isPresetBannerValue,
  isValidHttpOrLocalUrl,
  validateProfileDraft,
} from '@/lib/profile/profile-types';
import type { ProfileFormDraft, UnifiedProfile } from '@/lib/profile/profile-types';
import {
  DEFAULT_PROFILE_VISUAL_STYLE,
  MAX_CUSTOM_ROLE_LINE_LENGTH,
  SEVEN_DEADLY_SINS_PRESETS,
  prepareLocalVideoBannerFile,
  saveProfileVisualStyle,
} from '@/lib/profile/profile-customization';
import type {
  AvatarFrameStyle,
  BannerCatalogItem,
  BannerPosition,
  BannerScrimStrength,
  ProfileSinPresetId,
  ProfileVisualCustomization,
} from '@/lib/profile/profile-customization';
import { saveProfileCustomization } from '@/lib/profile/profile-service';
import {
  PROFILE_MEDIA_ACCEPT,
  uploadProfileMediaFile,
} from '@/lib/storage/uploadProfileMedia';
import { BannerGridSelector } from './banner-grid-selector';
import { ProfileBannerMedia } from './profile-banner-media';
import { ProfileHeaderCard } from './profile-header-card';
import styles from './profile-hub.module.css';

interface ProfileCustomizationTabProps {
  readonly userId: string;
  readonly profile: UnifiedProfile;
  readonly visualStyle?: ProfileVisualCustomization | undefined;
  readonly stats: {
    readonly communityPosts: number;
    readonly savedPresets: number;
  };
  readonly onSaved: (updated: UnifiedProfile, message: string) => void;
  readonly onVisualStyleSaved?: ((next: ProfileVisualCustomization) => void) | undefined;
}

const focusRing =
  'vt-motion-press focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas';
const fieldClass =
  'vt-form-control min-h-11 w-full max-w-full min-w-0 box-border rounded-lg border border-default bg-canvas px-3.5 py-2.5 text-sm text-primary placeholder:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60';

function toSupabaseSafeBannerUrl(
  rawDraftBanner: string,
  visual: ProfileVisualCustomization,
): string {
  const trimmed = rawDraftBanner.trim();
  if (trimmed && (isPresetBannerValue(trimmed) || isValidHttpOrLocalUrl(trimmed))) {
    return trimmed;
  }
  return `preset:${visual.presetId}`;
}

export function ProfileCustomizationTab({
  userId,
  profile,
  visualStyle,
  stats,
  onSaved,
  onVisualStyleSaved,
}: ProfileCustomizationTabProps): ReactElement {
  const { language, isEnglish } = useLanguage();
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
  const [visualDraft, setVisualDraft] = useState<ProfileVisualCustomization>(
    () => visualStyle ?? DEFAULT_PROFILE_VISUAL_STYLE,
  );
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [uploadNotice, setUploadNotice] = useState('');

  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const bannerInputRef = useRef<HTMLInputElement | null>(null);
  const hasEditedVisualRef = useRef(false);

  // Sync visual style once hydrated from localStorage without clobbering active edits
  useEffect(() => {
    if (!visualStyle || hasEditedVisualRef.current) return;
    setVisualDraft(visualStyle);
  }, [visualStyle]);

  const updateVisualDraft = (
    updater: (prev: ProfileVisualCustomization) => ProfileVisualCustomization,
  ): void => {
    hasEditedVisualRef.current = true;
    setVisualDraft(updater);
  };

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

      let savedVisual = visualDraft;
      if (kind === 'banner') {
        const updatedVisual: ProfileVisualCustomization = {
          ...visualDraft,
          bannerKind: 'image',
          bannerId: 'custom-image',
          imageUrl: uploaded.url,
        };
        hasEditedVisualRef.current = true;
        setVisualDraft(updatedVisual);
        savedVisual = saveProfileVisualStyle(userId, updatedVisual).saved;
        onVisualStyleSaved?.(savedVisual);
      }

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
          ? isEnglish
            ? 'Profile photo uploaded and updated.'
            : 'Foto profil berhasil diunggah dan diperbarui.'
          : isEnglish
            ? 'Profile banner uploaded and updated.'
            : 'Banner profil berhasil diunggah dan diperbarui.';
      setUploadNotice(successMsg);
      onSaved(saveRes.profile, successMsg);
    } catch (uploadErr: unknown) {
      setFormError(
        uploadErr instanceof Error
          ? uploadErr.message
          : isEnglish
            ? 'Failed to upload profile image.'
            : 'Gagal mengunggah gambar profil.',
      );
    } finally {
      if (kind === 'avatar') setUploadingAvatar(false);
      else setUploadingBanner(false);
    }
  };

  const handleSelectCatalogItem = (item: BannerCatalogItem): void => {
    setFormError('');
    setUploadNotice('');
    if (item.mediaType === 'video') {
      updateVisualDraft((prev) => ({
        ...prev,
        bannerKind: 'video',
        bannerId: item.id,
        videoUrl: null,
        videoPosterUrl: item.posterUrl ?? '/images/hero/pc-rig.jpg',
      }));
      return;
    }

    if (item.mediaType === 'image') {
      updateVisualDraft((prev) => ({
        ...prev,
        bannerKind: 'image',
        bannerId: item.id,
        imageUrl: item.imageUrl ?? '/images/hero/pc-rig.jpg',
      }));
      return;
    }

    const nextPreset = item.presetId ?? 'alabaster-grid';
    updateVisualDraft((prev) => ({
      ...prev,
      bannerKind: 'preset',
      bannerId: item.id,
      presetId: nextPreset,
    }));
    setDraft((prev) => ({ ...prev, bannerUrl: item.id }));
  };

  const handleSelectUploadedImage = (): void => {
    if (!draft.avatarUrl && (!draft.bannerUrl || isPresetBannerValue(draft.bannerUrl))) return;
    if (!draft.bannerUrl || isPresetBannerValue(draft.bannerUrl)) return;
    updateVisualDraft((prev) => ({
      ...prev,
      bannerKind: 'image',
      bannerId: 'custom-image',
      imageUrl: draft.bannerUrl,
    }));
  };

  const handleSelectCustomVideoFile = async (file: File): Promise<void> => {
    setFormError('');
    setUploadNotice('');
    setUploadingVideo(true);
    try {
      const prepared = await prepareLocalVideoBannerFile(file);
      updateVisualDraft((prev) => ({
        ...prev,
        bannerKind: 'video',
        bannerId: 'custom-video',
        videoUrl: prepared.videoUrl,
        videoPosterUrl: prepared.posterUrl,
      }));
      setUploadNotice(
        prepared.oversizedForStorage
          ? isEnglish
            ? 'Video banner preview is playing now. Files over 2.5 MB fall back to their extracted static thumbnail after page reload.'
            : 'Video banner langsung diputar. File di atas 2,5 MB akan otomatis memakai bingkai thumbnail statis setelah halaman dimuat ulang.'
          : isEnglish
            ? 'Local .mp4/.webm video banner ready—click Save Changes to persist.'
            : 'Video banner .mp4/.webm siap—klik Simpan Perubahan untuk menyimpan.',
      );
    } catch (videoErr: unknown) {
      setFormError(
        videoErr instanceof Error
          ? videoErr.message
          : isEnglish
            ? 'Unable to process video banner file.'
            : 'Gagal memproses file video banner.',
      );
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleApplyCustomVideoUrl = (url: string): void => {
    setFormError('');
    updateVisualDraft((prev) => ({
      ...prev,
      bannerKind: 'video',
      bannerId: 'custom-video',
      videoUrl: url,
      videoPosterUrl: prev.videoPosterUrl || '/images/hero/pc-rig.jpg',
    }));
    setUploadNotice(
      isEnglish
        ? 'Video URL applied to live preview—click Save Changes to persist.'
        : 'URL video diterapkan ke pratinjau—klik Simpan Perubahan untuk menyimpan.',
    );
  };

  const handleSelectSinPreset = (presetId: ProfileSinPresetId, recommendedAccent: string): void => {
    updateVisualDraft((prev) => ({ ...prev, sinPreset: presetId }));
    if (presetId !== 'none') {
      setDraft((prev) => ({ ...prev, accentColor: recommendedAccent }));
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setFormError('');
    setUploadNotice('');

    const sanitizedDraft: ProfileFormDraft = {
      ...draft,
      bannerUrl: toSupabaseSafeBannerUrl(draft.bannerUrl, visualDraft),
    };

    const validation = validateProfileDraft(sanitizedDraft);
    if (!validation.ok) {
      setFormError(validation.error);
      return;
    }

    setIsSaving(true);
    try {
      const { saved: savedVisual, strippedInlineVideo } = saveProfileVisualStyle(
        userId,
        visualDraft,
      );
      onVisualStyleSaved?.(savedVisual);
      hasEditedVisualRef.current = false;

      if (!isSupabaseAuthConfigured) {
        const localUpdated: UnifiedProfile = {
          ...profile,
          username: validation.normalized.username,
          displayName: validation.normalized.displayName,
          avatarUrl: validation.normalized.avatarUrl || null,
          bannerUrl: validation.normalized.bannerUrl || null,
          bio: validation.normalized.bio || null,
          statusText: validation.normalized.statusText || null,
          accentColor: validation.normalized.accentColor,
          featuredRig: validation.normalized.featuredRig || null,
        };
        const msg = isEnglish
          ? 'Profile styling saved to this device.'
          : 'Pengaturan tampilan profil tersimpan di perangkat ini.';
        onSaved(localUpdated, msg);
        return;
      }

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
      const baseMsg = isEnglish
        ? 'Profile and visual customization saved.'
        : 'Perubahan profil dan kustomisasi berhasil disimpan.';
      const quotaNote = strippedInlineVideo
        ? isEnglish
          ? ' (Large video kept static thumbnail fallback.)'
          : ' (Video besar disimpan dengan bingkai statis.)'
        : '';
      onSaved(result.profile, `${baseMsg}${quotaNote}`);
    } finally {
      setIsSaving(false);
    }
  };

  const positionOptions: readonly { readonly id: BannerPosition; readonly label: string }[] = [
    { id: 'top', label: isEnglish ? 'Top' : 'Atas' },
    { id: 'center', label: isEnglish ? 'Center' : 'Tengah' },
    { id: 'bottom', label: isEnglish ? 'Bottom' : 'Bawah' },
  ];

  const scrimOptions: readonly { readonly id: BannerScrimStrength; readonly label: string }[] = [
    { id: 'subtle', label: isEnglish ? 'Subtle' : 'Ringan' },
    { id: 'balanced', label: isEnglish ? 'Balanced' : 'Seimbang' },
    { id: 'strong', label: isEnglish ? 'Strong' : 'Gelap' },
  ];

  const avatarFrameOptions: readonly { readonly id: AvatarFrameStyle; readonly label: string }[] = [
    { id: 'classic', label: isEnglish ? 'Classic Ring' : 'Lingkar Klasik' },
    { id: 'pixel', label: isEnglish ? 'Pixel Frame' : 'Bingkai Pixel' },
    { id: 'double', label: isEnglish ? 'Double Bezel' : 'Bezel Ganda' },
    { id: 'minimal', label: 'Minimal' },
  ];

  return (
    <div className="box-border grid w-full max-w-full min-w-0 gap-6 lg:grid-cols-12">
      {/* Left: Customization Form */}
      <form
        onSubmit={handleSubmit}
        className="box-border w-full max-w-full min-w-0 space-y-6 rounded-xl border border-default bg-surface p-4 shadow-sm sm:p-6 lg:col-span-7"
      >
        <div className="border-b border-default pb-3">
          <h2 className="tracking-tight font-sans text-xl font-bold text-primary">
            {isEnglish ? 'Profile Customization & Styling' : 'Kustomisasi & Pengaturan Profil'}
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-secondary sm:text-sm">
            {isEnglish
              ? 'Customize video or image banners, focal alignment, avatar frame, role line, and 7 Deadly Sins profile presets.'
              : 'Atur banner video atau gambar, posisi fokus, bingkai avatar, baris peran, serta preset tema 7 Deadly Sins.'}
          </p>
        </div>

        {/* Avatar Uploader + Frame Style */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-primary">
            {isEnglish
              ? 'Profile Photo (JPG/PNG/WebP · Max 3 MB)'
              : 'Foto Profil (JPG/PNG/WebP · Maks 3 MB)'}
          </p>
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
              <span>
                {uploadingAvatar
                  ? isEnglish
                    ? 'Uploading photo…'
                    : 'Mengunggah foto…'
                  : isEnglish
                    ? 'Upload Profile Photo'
                    : 'Unggah Foto Profil'}
              </span>
            </button>
            {draft.avatarUrl && (
              <button
                type="button"
                onClick={() => setDraft((prev) => ({ ...prev, avatarUrl: '' }))}
                className={`vt-btn-tactile inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-default bg-surface px-3 py-2 text-xs font-medium text-secondary hover:text-status-danger ${focusRing}`}
              >
                <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                <span>{isEnglish ? 'Remove Photo' : 'Hapus Foto'}</span>
              </button>
            )}
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-secondary">
              {isEnglish ? 'Avatar Frame Style' : 'Gaya Bingkai Avatar'}
            </p>
            <div
              className="grid grid-cols-2 gap-2 sm:grid-cols-4"
              role="group"
              aria-label={isEnglish ? 'Avatar frame style' : 'Gaya bingkai avatar'}
            >
              {avatarFrameOptions.map((opt) => {
                const active = visualDraft.avatarFrame === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      updateVisualDraft((prev) => ({ ...prev, avatarFrame: opt.id }))
                    }
                    className={`vt-btn-tactile min-h-11 rounded-lg border px-2.5 py-2 text-xs font-semibold ${focusRing} ${
                      active
                        ? 'border-accent-primary bg-accent-cta text-white'
                        : 'border-default bg-canvas text-primary hover:bg-subtle'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Visual Banner Grid Selector + Live Strip Preview + Alignment & Scrim */}
        <div className="space-y-3 border-t border-default pt-5">
          <div>
            <p className="text-sm font-medium text-primary">
              {isEnglish
                ? 'Banner Grid Selector (Video / Image / Editorial Preset)'
                : 'Pemilih Grid Banner (Video / Gambar / Preset Editorial)'}
            </p>
            <p className="mt-0.5 text-xs text-secondary">
              {isEnglish
                ? 'Pick a sample animated video loop, upload your own .mp4/.webm, or choose a static preset.'
                : 'Pilih loop video demo, unggah file .mp4/.webm sendiri, atau gunakan preset editorial.'}
            </p>
          </div>

          <div className="overflow-hidden rounded-xl border border-default">
            <ProfileBannerMedia
              bannerUrl={draft.bannerUrl || null}
              visualStyle={visualDraft}
              displayName={draft.displayName || profile.displayName}
              isPreview
              className="!h-28 sm:!h-32"
            />
          </div>

          <input
            ref={bannerInputRef}
            type="file"
            accept={PROFILE_MEDIA_ACCEPT}
            onChange={(e) => void handleUpload(e, 'banner')}
            className="sr-only"
            id="profile-banner-upload"
          />

          <BannerGridSelector
            visualDraft={visualDraft}
            uploadedImageUrl={draft.bannerUrl}
            uploadingImage={uploadingBanner}
            uploadingVideo={uploadingVideo}
            disabled={isSaving}
            onSelectCatalogItem={handleSelectCatalogItem}
            onSelectUploadedImage={handleSelectUploadedImage}
            onTriggerImageUpload={() => bannerInputRef.current?.click()}
            onSelectCustomVideoFile={handleSelectCustomVideoFile}
            onApplyCustomVideoUrl={handleApplyCustomVideoUrl}
          />

          <div className="grid gap-3 pt-1 sm:grid-cols-2">
            <div>
              <p className="mb-1.5 text-xs font-medium text-secondary">
                {isEnglish ? 'Banner Focal Alignment' : 'Posisi Fokus Banner'}
              </p>
              <div
                className="grid grid-cols-3 gap-2"
                role="group"
                aria-label={isEnglish ? 'Banner vertical alignment' : 'Posisi vertikal banner'}
              >
                {positionOptions.map((opt) => {
                  const active = visualDraft.bannerPosition === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() =>
                        updateVisualDraft((prev) => ({ ...prev, bannerPosition: opt.id }))
                      }
                      className={`vt-btn-tactile min-h-11 rounded-lg border px-2 py-1.5 text-xs font-semibold ${focusRing} ${
                        active
                          ? 'border-accent-primary bg-accent-cta text-white'
                          : 'border-default bg-canvas text-primary hover:bg-subtle'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-xs font-medium text-secondary">
                {isEnglish ? 'Banner Overlay Scrim' : 'Kekuatan Scrim / Gelap Banner'}
              </p>
              <div
                className="grid grid-cols-3 gap-2"
                role="group"
                aria-label={isEnglish ? 'Banner overlay scrim' : 'Kekuatan overlay banner'}
              >
                {scrimOptions.map((opt) => {
                  const active = visualDraft.bannerScrim === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() =>
                        updateVisualDraft((prev) => ({ ...prev, bannerScrim: opt.id }))
                      }
                      className={`vt-btn-tactile min-h-11 rounded-lg border px-2 py-1.5 text-xs font-semibold ${focusRing} ${
                        active
                          ? 'border-accent-primary bg-accent-cta text-white'
                          : 'border-default bg-canvas text-primary hover:bg-subtle'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* 7 Deadly Sins Profile Presets */}
        <div className="space-y-2.5 border-t border-default pt-5">
          <div>
            <p className="flex items-center gap-1.5 text-sm font-medium text-primary">
              <Flame className="h-4 w-4 text-accent-cta" strokeWidth={1.75} aria-hidden="true" />
              <span>
                {isEnglish ? '7 Deadly Sins Profile Presets' : 'Preset Tema 7 Deadly Sins'}
              </span>
            </p>
            <p className="mt-0.5 text-xs text-secondary">
              {isEnglish
                ? 'Applies an instant persona badge, trim rail, and harmonized accent across Light, Dark Ruby, and High-Contrast modes.'
                : 'Menerapkan lencana persona, garis trim atas, dan aksen serasi di Mode Terang, Gelap Ruby, dan Kontras Tinggi.'}
            </p>
          </div>

          <div
            className="grid grid-cols-2 gap-2.5 sm:grid-cols-4"
            role="group"
            aria-label={isEnglish ? '7 Deadly Sins presets' : 'Preset 7 Deadly Sins'}
          >
            {SEVEN_DEADLY_SINS_PRESETS.map((preset) => {
              const active = visualDraft.sinPreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => handleSelectSinPreset(preset.id, preset.recommendedAccent)}
                  className={`vt-btn-tactile flex min-h-11 min-w-0 flex-col items-start justify-between overflow-hidden rounded-lg border text-left ${focusRing} ${
                    active
                      ? 'border-accent-primary bg-accent-subtle ring-2 ring-accent-primary/25'
                      : 'border-default bg-canvas hover:bg-subtle'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className="block h-1.5 w-full"
                    style={{ backgroundColor: preset.lightAccent }}
                  />
                  <span className="w-full min-w-0 px-2.5 py-2">
                    <span className="flex items-center justify-between gap-1 text-xs font-bold text-primary">
                      <span className="truncate">{preset.label[language]}</span>
                      {active && <Check className="h-3.5 w-3.5 shrink-0 text-accent-cta" aria-hidden="true" />}
                    </span>
                    <span className="mt-0.5 block truncate font-mono text-[10px] text-secondary">
                      {preset.personaTag[language] || preset.description[language]}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Identity & Role Line Fields */}
        <div className="grid gap-4 border-t border-default pt-5 sm:grid-cols-2">
          <div>
            <label htmlFor="pf-display-name" className="mb-1.5 block text-sm font-medium text-primary">
              {isEnglish ? 'Display Name' : 'Nama Tampilan'}
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
                className="min-w-0 w-full bg-transparent px-2 py-2 font-mono text-sm text-primary outline-none"
              />
            </div>
            <p className="mt-1 text-[11px] text-secondary">
              {isEnglish
                ? '3–20 lowercase letters, numbers, or underscores (_).'
                : '3–20 huruf kecil, angka, atau garis bawah (_).'}
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <label htmlFor="pf-role-line" className="font-medium text-primary">
                {isEnglish ? 'Custom Role / Title Line' : 'Baris Peran / Gelar Kustom'}
              </label>
              <span className="font-mono text-[11px] text-secondary">
                {visualDraft.customRoleLine.length}/{MAX_CUSTOM_ROLE_LINE_LENGTH}
              </span>
            </div>
            <input
              id="pf-role-line"
              type="text"
              value={visualDraft.customRoleLine}
              maxLength={MAX_CUSTOM_ROLE_LINE_LENGTH}
              placeholder={
                isEnglish ? 'e.g. Thermal Modder · Bench Lead' : 'Contoh: Spesialis Airflow · SFF Builder'
              }
              onChange={(e) =>
                updateVisualDraft((prev) => ({ ...prev, customRoleLine: e.target.value }))
              }
              className={`${fieldClass} font-mono`}
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <label htmlFor="pf-status" className="font-medium text-primary">
                {isEnglish ? 'Short Status' : 'Status Singkat'}
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
              placeholder={isEnglish ? 'e.g. Tuning 10M IDR ITX build' : 'Contoh: Lagi rakit PC 10jt'}
              onChange={(e) => setDraft((prev) => ({ ...prev, statusText: e.target.value }))}
              className={fieldClass}
            />
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <label htmlFor="pf-rig" className="font-medium text-primary">
              {isEnglish ? 'Featured Rig' : 'Perangkat Utama'}
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
            placeholder={
              isEnglish ? 'e.g. Ryzen 5 7600 · RTX 4060' : 'Contoh: Acer Aspire Lite / RTX 4060'
            }
            onChange={(e) => setDraft((prev) => ({ ...prev, featuredRig: e.target.value }))}
            className={`${fieldClass} font-mono`}
          />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <label htmlFor="pf-bio" className="font-medium text-primary">
              {isEnglish ? 'Short Bio' : 'Bio Singkat'}
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
            placeholder={
              isEnglish
                ? 'Share your PC build focus, laptop tuning, or hardware lab notes...'
                : 'Ceritakan minat rakitan PC, laptop, atau proyek lab Anda...'
            }
            onChange={(e) => setDraft((prev) => ({ ...prev, bio: e.target.value }))}
            className={`${fieldClass} resize-y`}
          />
        </div>

        {/* Profile Accent Swatches */}
        <div>
          <p className="mb-2 text-sm font-medium text-primary">
            {isEnglish ? 'Profile Accent Color' : 'Warna Aksen Profil'}
          </p>
          <div
            className="flex flex-wrap items-center gap-2.5"
            role="group"
            aria-label={isEnglish ? 'Select profile accent color' : 'Pilih warna aksen profil'}
          >
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
          <p
            role="alert"
            className="rounded-lg border border-red-300 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-800 sm:text-sm"
          >
            {formError}
          </p>
        )}

        {uploadNotice && !formError && (
          <p
            role="status"
            className="rounded-lg border border-emerald-300 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-900 sm:text-sm"
          >
            {uploadNotice}
          </p>
        )}

        <div className="border-t border-default pt-4">
          <button
            type="submit"
            disabled={isSaving || uploadingAvatar || uploadingBanner || uploadingVideo}
            className={`vt-btn-tactile inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent-cta px-6 py-2.5 text-sm font-semibold text-white hover:bg-accent-cta-hover disabled:cursor-wait disabled:opacity-60 sm:w-auto ${focusRing}`}
          >
            {isSaving ? (
              <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            )}
            <span>
              {isSaving
                ? isEnglish
                  ? 'Saving Changes…'
                  : 'Menyimpan Perubahan…'
                : isEnglish
                  ? 'Save Changes'
                  : 'Simpan Perubahan'}
            </span>
          </button>
        </div>
      </form>

      {/* Right: Live Profile Card Preview */}
      <div className="box-border w-full max-w-full min-w-0 space-y-3 lg:sticky lg:top-24 lg:col-span-5 lg:self-start">
        <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
          {isEnglish ? 'Profile Card Preview' : 'Pratinjau Kartu Profil'}
        </p>
        <ProfileHeaderCard
          profile={livePreviewProfile}
          visualStyle={visualDraft}
          stats={stats}
          isOwner
          isPreview
        />
      </div>
    </div>
  );
}
