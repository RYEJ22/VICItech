'use client';

import { useRef, useState } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import {
  Check,
  Film,
  ImagePlus,
  Link2,
  LoaderCircle,
  Sparkles,
  Video,
} from 'lucide-react';
import { useLanguage } from '@/components/providers/LanguageProvider';
import {
  BANNER_CATALOG_ITEMS,
  isValidVideoBannerUrl,
} from '@/lib/profile/profile-customization';
import type { ProfileBannerPresetId } from '@/lib/profile/profile-types';
import type {
  BannerCatalogItem,
  BannerMediaType,
  ProfileVisualCustomization,
} from '@/lib/profile/profile-customization';
import styles from './profile-hub.module.css';

interface BannerGridSelectorProps {
  readonly visualDraft: ProfileVisualCustomization;
  readonly uploadedImageUrl: string;
  readonly uploadingImage: boolean;
  readonly uploadingVideo: boolean;
  readonly disabled: boolean;
  readonly onSelectCatalogItem: (item: BannerCatalogItem) => void;
  readonly onSelectUploadedImage: () => void;
  readonly onTriggerImageUpload: () => void;
  readonly onSelectCustomVideoFile: (file: File) => Promise<void>;
  readonly onApplyCustomVideoUrl: (url: string) => void;
}

type BannerFilterTab = 'all' | BannerMediaType;

const PRESET_CLASS_MAP: Readonly<Record<string, string | undefined>> = {
  'alabaster-grid': styles.preset_alabaster_grid,
  'ember-horizon': styles.preset_ember_horizon,
  'graphite-circuit': styles.preset_graphite_circuit,
  'emerald-bench': styles.preset_emerald_bench,
  'indigo-blueprint': styles.preset_indigo_blueprint,
};

const focusRing =
  'vt-motion-press focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas';

export function BannerGridSelector({
  visualDraft,
  uploadedImageUrl,
  uploadingImage,
  uploadingVideo,
  disabled,
  onSelectCatalogItem,
  onSelectUploadedImage,
  onTriggerImageUpload,
  onSelectCustomVideoFile,
  onApplyCustomVideoUrl,
}: BannerGridSelectorProps): ReactElement {
  const { language, isEnglish } = useLanguage();
  const [filterTab, setFilterTab] = useState<BannerFilterTab>('all');
  const [videoUrlInput, setVideoUrlInput] = useState(() =>
    visualDraft.bannerKind === 'video' &&
    visualDraft.bannerId === 'custom-video' &&
    visualDraft.videoUrl &&
    !visualDraft.videoUrl.startsWith('data:') &&
    !visualDraft.videoUrl.startsWith('blob:')
      ? visualDraft.videoUrl
      : '',
  );
  const [urlError, setUrlError] = useState('');
  const videoFileInputRef = useRef<HTMLInputElement | null>(null);

  const hasCustomVideo =
    visualDraft.bannerKind === 'video' &&
    visualDraft.bannerId === 'custom-video' &&
    Boolean(visualDraft.videoUrl || visualDraft.videoPosterUrl);

  const hasUploadedImage = Boolean(uploadedImageUrl && !uploadedImageUrl.startsWith('preset:'));

  const filteredItems = BANNER_CATALOG_ITEMS.filter((item) =>
    filterTab === 'all' ? true : item.mediaType === filterTab,
  );

  const filterTabs: readonly {
    readonly id: BannerFilterTab;
    readonly label: string;
    readonly count: number;
  }[] = [
    {
      id: 'all',
      label: isEnglish ? 'All' : 'Semua',
      count: BANNER_CATALOG_ITEMS.length + (hasCustomVideo ? 1 : 0) + (hasUploadedImage ? 1 : 0),
    },
    {
      id: 'video',
      label: 'Video',
      count:
        BANNER_CATALOG_ITEMS.filter((i) => i.mediaType === 'video').length +
        (hasCustomVideo ? 1 : 0),
    },
    {
      id: 'image',
      label: isEnglish ? 'Image' : 'Gambar',
      count:
        BANNER_CATALOG_ITEMS.filter((i) => i.mediaType === 'image').length +
        (hasUploadedImage ? 1 : 0),
    },
    {
      id: 'preset',
      label: 'Preset',
      count: BANNER_CATALOG_ITEMS.filter((i) => i.mediaType === 'preset').length,
    },
  ];

  const handleVideoFileChange = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setUrlError('');
    await onSelectCustomVideoFile(file);
  };

  const handleApplyVideoUrl = (): void => {
    const cleaned = videoUrlInput.trim();
    if (!cleaned) {
      setUrlError(
        isEnglish
          ? 'Enter an .mp4 or .webm HTTPS URL first.'
          : 'Masukkan URL video .mp4 atau .webm terlebih dahulu.',
      );
      return;
    }
    if (!isValidVideoBannerUrl(cleaned)) {
      setUrlError(
        isEnglish
          ? 'Video URL must use HTTPS (or /videos/...) and end with .mp4 or .webm.'
          : 'URL video harus memakai HTTPS (atau /videos/...) dan berakhiran .mp4 atau .webm.',
      );
      return;
    }
    setUrlError('');
    onApplyCustomVideoUrl(cleaned);
  };

  return (
    <div className="box-border w-full max-w-full min-w-0 space-y-3">
      {/* Media Type Filter Pills */}
      <div
        className="flex flex-wrap items-center gap-2"
        role="group"
        aria-label={isEnglish ? 'Filter banner media types' : 'Filter tipe media banner'}
      >
        {filterTabs.map((tab) => {
          const active = filterTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              aria-pressed={active}
              onClick={() => setFilterTab(tab.id)}
              className={`vt-btn-tactile inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold ${focusRing} ${
                active
                  ? 'border-accent-primary bg-accent-cta text-white'
                  : 'border-default bg-canvas text-secondary hover:bg-subtle hover:text-primary'
              }`}
            >
              <span>{tab.label}</span>
              <span className="font-mono text-[11px] opacity-85">({tab.count})</span>
            </button>
          );
        })}
      </div>

      {/* Visual Banner Grid Selector */}
      <div className="grid w-full max-w-full min-w-0 grid-cols-2 gap-2.5 sm:grid-cols-3">
        {hasCustomVideo && (filterTab === 'all' || filterTab === 'video') && (
          <button
            type="button"
            aria-pressed={visualDraft.bannerKind === 'video' && visualDraft.bannerId === 'custom-video'}
            onClick={() =>
              visualDraft.videoUrl && onApplyCustomVideoUrl(visualDraft.videoUrl)
            }
            className={`vt-btn-tactile group flex min-h-11 min-w-0 flex-col overflow-hidden rounded-lg border text-left ${
              styles.bannerTile ?? ''
            } ${styles.bannerTileActive ?? ''} ${focusRing}`}
          >
            <span className="relative block h-16 w-full overflow-hidden bg-subtle sm:h-20">
              <img
                src={visualDraft.videoPosterUrl || '/images/hero/pc-rig.jpg'}
                alt={isEnglish ? 'Custom video banner preview' : 'Pratinjau video banner kustom'}
                className="h-full w-full object-cover"
              />
              <span
                className={`absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase ${
                  styles.mediaBadgeVideo ?? ''
                }`}
              >
                <Video className="h-2.5 w-2.5" aria-hidden="true" />
                <span>VIDEO</span>
              </span>
              <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-accent-cta text-white shadow-sm">
                <Check className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />
              </span>
            </span>
            <span className="block w-full truncate px-2.5 py-2 text-xs font-semibold text-primary">
              {isEnglish ? 'Custom Video' : 'Video Kustom'}
            </span>
          </button>
        )}

        {hasUploadedImage && (filterTab === 'all' || filterTab === 'image') && (
          <button
            type="button"
            aria-pressed={visualDraft.bannerKind === 'image' && visualDraft.bannerId === 'custom-image'}
            onClick={onSelectUploadedImage}
            className={`vt-btn-tactile group flex min-h-11 min-w-0 flex-col overflow-hidden rounded-lg border text-left ${
              styles.bannerTile ?? ''
            } ${
              visualDraft.bannerKind === 'image' && visualDraft.bannerId === 'custom-image'
                ? styles.bannerTileActive ?? ''
                : ''
            } ${focusRing}`}
          >
            <span className="relative block h-16 w-full overflow-hidden bg-subtle sm:h-20">
              <img
                src={uploadedImageUrl}
                alt={isEnglish ? 'Uploaded image banner' : 'Gambar banner unggahan'}
                className="h-full w-full object-cover"
              />
              <span
                className={`absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase ${
                  styles.mediaBadgeImage ?? ''
                }`}
              >
                <span>IMAGE</span>
              </span>
              {visualDraft.bannerKind === 'image' && visualDraft.bannerId === 'custom-image' && (
                <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-accent-cta text-white shadow-sm">
                  <Check className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />
                </span>
              )}
            </span>
            <span className="block w-full truncate px-2.5 py-2 text-xs font-semibold text-primary">
              {isEnglish ? 'Uploaded Image' : 'Gambar Unggahan'}
            </span>
          </button>
        )}

        {filteredItems.map((item) => {
          const isSelected = visualDraft.bannerId === item.id;
          const badgeClass =
            item.mediaType === 'video'
              ? styles.mediaBadgeVideo
              : item.mediaType === 'image'
                ? styles.mediaBadgeImage
                : styles.mediaBadgePreset;
          const presetKey: ProfileBannerPresetId = item.presetId ?? 'alabaster-grid';
          const thumbImage = item.mediaType === 'video' ? item.posterUrl : item.imageUrl;

          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelectCatalogItem(item)}
              className={`vt-btn-tactile group flex min-h-11 min-w-0 flex-col overflow-hidden rounded-lg border text-left ${
                styles.bannerTile ?? ''
              } ${isSelected ? styles.bannerTileActive ?? '' : ''} ${focusRing}`}
            >
              <span
                className={`relative block h-16 w-full overflow-hidden sm:h-20 ${
                  item.mediaType === 'preset' ? PRESET_CLASS_MAP[presetKey] ?? '' : 'bg-subtle'
                }`}
              >
                {thumbImage && (
                  <img
                    src={thumbImage}
                    alt={item.label[language]}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                  />
                )}
                <span
                  className={`absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase ${
                    badgeClass ?? ''
                  }`}
                >
                  {item.mediaType === 'video' && <Video className="h-2.5 w-2.5" aria-hidden="true" />}
                  <span>{item.mediaType.toUpperCase()}</span>
                </span>
                {item.isSample && (
                  <span className="absolute bottom-1.5 left-1.5 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-white">
                    Sample
                  </span>
                )}
                {isSelected && (
                  <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-accent-cta text-white shadow-sm">
                    <Check className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />
                  </span>
                )}
              </span>

              <span className="flex w-full min-w-0 items-center justify-between gap-1.5 px-2.5 py-2">
                <span className="truncate text-xs font-semibold text-primary">
                  {item.label[language]}
                </span>
                {item.mediaType === 'preset' && (
                  <Sparkles className="h-3 w-3 shrink-0 text-secondary" aria-hidden="true" />
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* Upload Custom Image or Video (.mp4 / .webm) + Direct URL */}
      <div className="box-border w-full max-w-full min-w-0 space-y-2.5 rounded-lg border border-default bg-canvas p-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={disabled || uploadingImage || uploadingVideo}
            onClick={onTriggerImageUpload}
            className={`vt-btn-tactile inline-flex min-h-11 items-center gap-2 rounded-lg border border-default bg-surface px-3.5 py-2 text-xs font-semibold text-primary hover:bg-subtle disabled:opacity-60 ${focusRing}`}
          >
            {uploadingImage ? (
              <LoaderCircle className="h-4 w-4 animate-spin text-accent-cta" aria-hidden="true" />
            ) : (
              <ImagePlus className="h-4 w-4 text-accent-cta" strokeWidth={1.75} aria-hidden="true" />
            )}
            <span>
              {uploadingImage
                ? isEnglish
                  ? 'Uploading image…'
                  : 'Mengunggah gambar…'
                : isEnglish
                  ? 'Upload Image'
                  : 'Unggah Gambar'}
            </span>
          </button>

          <input
            ref={videoFileInputRef}
            type="file"
            accept="video/mp4,video/webm"
            onChange={(e) => void handleVideoFileChange(e)}
            className="sr-only"
            id="profile-video-banner-upload"
          />
          <button
            type="button"
            disabled={disabled || uploadingVideo || uploadingImage}
            onClick={() => videoFileInputRef.current?.click()}
            className={`vt-btn-tactile inline-flex min-h-11 items-center gap-2 rounded-lg border border-default bg-surface px-3.5 py-2 text-xs font-semibold text-primary hover:bg-subtle disabled:opacity-60 ${focusRing}`}
          >
            {uploadingVideo ? (
              <LoaderCircle className="h-4 w-4 animate-spin text-accent-cta" aria-hidden="true" />
            ) : (
              <Film className="h-4 w-4 text-accent-cta" strokeWidth={1.75} aria-hidden="true" />
            )}
            <span>
              {uploadingVideo
                ? isEnglish
                  ? 'Processing video…'
                  : 'Memproses video…'
                : isEnglish
                  ? 'Upload Video (.mp4/.webm)'
                  : 'Unggah Video (.mp4/.webm)'}
            </span>
          </button>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-lg border border-default bg-surface px-3 focus-within:ring-2 focus-within:ring-accent-primary/60">
            <Link2 className="h-4 w-4 shrink-0 text-secondary" aria-hidden="true" />
            <input
              type="url"
              value={videoUrlInput}
              onChange={(e) => {
                setVideoUrlInput(e.target.value);
                if (urlError) setUrlError('');
              }}
              placeholder={
                isEnglish
                  ? 'Optional: paste https://...mp4 or .webm video URL'
                  : 'Opsional: tempel URL video https://...mp4 atau .webm'
              }
              aria-label={isEnglish ? 'Custom video banner URL' : 'URL banner video kustom'}
              className="min-w-0 w-full bg-transparent py-2 text-xs text-primary outline-none placeholder:text-secondary"
            />
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={handleApplyVideoUrl}
            className={`vt-btn-tactile inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg border border-default bg-surface px-3.5 py-2 text-xs font-semibold text-primary hover:bg-subtle disabled:opacity-60 ${focusRing}`}
          >
            {isEnglish ? 'Use Video URL' : 'Pakai URL Video'}
          </button>
        </div>

        {urlError && (
          <p role="alert" className="text-xs font-medium text-red-700">
            {urlError}
          </p>
        )}
      </div>
    </div>
  );
}
