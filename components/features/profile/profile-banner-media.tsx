'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { isPresetBannerValue } from '@/lib/profile/profile-types';
import type { ProfileBannerPresetId } from '@/lib/profile/profile-types';
import {
  findBannerCatalogItem,
  isValidImageBannerUrl,
  isValidVideoBannerUrl,
} from '@/lib/profile/profile-customization';
import type {
  BannerPosition,
  BannerScrimStrength,
  ProfileVisualCustomization,
  SampleVideoCanvasMode,
} from '@/lib/profile/profile-customization';
import styles from './profile-hub.module.css';

interface ProfileBannerMediaProps {
  readonly bannerUrl: string | null;
  readonly visualStyle: ProfileVisualCustomization;
  readonly displayName: string;
  readonly isPreview?: boolean;
  readonly animateVideo?: boolean;
  readonly className?: string;
}

const PRESET_CLASS_MAP: Readonly<Record<ProfileBannerPresetId, string | undefined>> = {
  'alabaster-grid': styles.preset_alabaster_grid,
  'ember-horizon': styles.preset_ember_horizon,
  'graphite-circuit': styles.preset_graphite_circuit,
  'emerald-bench': styles.preset_emerald_bench,
  'indigo-blueprint': styles.preset_indigo_blueprint,
};

const OBJECT_POSITION_MAP: Readonly<Record<BannerPosition, string>> = {
  top: 'object-[50%_15%]',
  center: 'object-center',
  bottom: 'object-[50%_85%]',
};

const SCRIM_CLASS_MAP: Readonly<Record<BannerScrimStrength, string | undefined>> = {
  subtle: styles.scrimSubtle,
  balanced: styles.scrimBalanced,
  strong: styles.scrimStrong,
};

const SAMPLE_ACCENT_COLORS: Readonly<Record<SampleVideoCanvasMode, string>> = {
  'ruby-telemetry': '#E11D48',
  'code-matrix': '#EA580C',
  'thermal-flow': '#10B981',
  'workshop-bench': '#38BDF8',
};

function checkReducedMotionPreference(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }
  const attrReduced = document.documentElement.getAttribute('data-reduced-motion') === 'true';
  const mediaReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return attrReduced || mediaReduced;
}

export function ProfileBannerMedia({
  bannerUrl,
  visualStyle,
  displayName,
  isPreview = false,
  animateVideo = true,
  className = '',
}: ProfileBannerMediaProps): ReactElement {
  const { isEnglish } = useLanguage();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);

  // Sync reduced-motion preference on mount so SSR output always matches initial hydration
  useEffect(() => {
    const updatePreference = () => {
      setReducedMotion(checkReducedMotionPreference());
    };
    updatePreference();

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    mediaQuery.addEventListener('change', updatePreference);

    const observer = new MutationObserver(updatePreference);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-reduced-motion'],
    });

    return () => {
      mediaQuery.removeEventListener('change', updatePreference);
      observer.disconnect();
    };
  }, []);

  const resolvedMedia = useMemo(() => {
    const catalogItem = findBannerCatalogItem(visualStyle.bannerId);
    const positionClass = OBJECT_POSITION_MAP[visualStyle.bannerPosition] ?? 'object-center';

    if (visualStyle.bannerKind === 'video') {
      const sampleMode =
        catalogItem?.mediaType === 'video' ? catalogItem.sampleCanvasMode : undefined;
      const customVideoSrc =
        visualStyle.videoUrl && isValidVideoBannerUrl(visualStyle.videoUrl)
          ? visualStyle.videoUrl
          : null;
      const posterSrc =
        (visualStyle.videoPosterUrl && isValidImageBannerUrl(visualStyle.videoPosterUrl)
          ? visualStyle.videoPosterUrl
          : catalogItem?.posterUrl) ?? '/images/hero/pc-rig.jpg';

      return {
        kind: 'video' as const,
        videoSrc: customVideoSrc,
        sampleMode: customVideoSrc ? undefined : (sampleMode ?? 'ruby-telemetry'),
        posterSrc,
        positionClass,
      };
    }

    if (visualStyle.bannerKind === 'image') {
      const candidate = visualStyle.imageUrl || catalogItem?.imageUrl || bannerUrl || '';
      if (candidate && isValidImageBannerUrl(candidate)) {
        return {
          kind: 'image' as const,
          src: candidate,
          positionClass,
        };
      }
    }

    // Preserve uploaded Supabase image banner when user has default visual preset
    const fallbackUploadedBanner = bannerUrl?.trim() ?? '';
    if (
      visualStyle.bannerId === 'preset:alabaster-grid' &&
      fallbackUploadedBanner &&
      !isPresetBannerValue(fallbackUploadedBanner) &&
      isValidImageBannerUrl(fallbackUploadedBanner)
    ) {
      return {
        kind: 'image' as const,
        src: fallbackUploadedBanner,
        positionClass,
      };
    }

    return {
      kind: 'preset' as const,
      presetId: visualStyle.presetId,
      positionClass,
    };
  }, [bannerUrl, visualStyle]);

  useEffect(() => {
    setVideoFailed(false);
  }, [resolvedMedia]);

  // Pause active video immediately when reduced-motion turns on
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    if (reducedMotion || !animateVideo) {
      videoEl.pause();
    }
  }, [animateVideo, reducedMotion]);

  // Power sample video loops with a CSP-safe local canvas captureStream
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl || resolvedMedia.kind !== 'video') {
      return undefined;
    }

    if (resolvedMedia.videoSrc || !resolvedMedia.sampleMode) {
      return undefined;
    }

    if (reducedMotion || !animateVideo || typeof window === 'undefined') {
      videoEl.srcObject = null;
      return undefined;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 240;
    const ctx = canvas.getContext('2d');
    if (!ctx || typeof canvas.captureStream !== 'function') {
      return undefined;
    }

    let cancelled = false;
    let frameHandle = 0;
    let lastDraw = 0;
    let stream: MediaStream | null = null;
    const startTime = performance.now();
    const accent = SAMPLE_ACCENT_COLORS[resolvedMedia.sampleMode];

    const img = new Image();
    img.src = resolvedMedia.posterSrc;

    const renderFrame = (now: number) => {
      if (cancelled) return;
      if (now - lastDraw >= 40) {
        lastDraw = now;
        const elapsed = (now - startTime) / 1000;
        const w = canvas.width;
        const h = canvas.height;

        ctx.fillStyle = '#09090b';
        ctx.fillRect(0, 0, w, h);

        if (img.complete && img.naturalWidth > 0) {
          const driftX = Math.sin(elapsed * 0.55) * 14;
          const driftY = Math.cos(elapsed * 0.42) * 8;
          const scale = Math.max((w + 36) / img.naturalWidth, (h + 24) / img.naturalHeight);
          const drawW = img.naturalWidth * scale;
          const drawH = img.naturalHeight * scale;
          const drawX = (w - drawW) / 2 + driftX;
          const drawY = (h - drawH) / 2 + driftY;
          ctx.drawImage(img, drawX, drawY, drawW, drawH);
        }

        // Subtle pixel hardware overlay matching ViciTech aesthetic
        ctx.fillStyle = 'rgba(9, 9, 11, 0.34)';
        ctx.fillRect(0, 0, w, h);

        const scanX = ((elapsed * 140) % (w + 180)) - 90;
        const sweepGrad = ctx.createLinearGradient(scanX - 70, 0, scanX + 70, 0);
        sweepGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        sweepGrad.addColorStop(0.5, `${accent}55`);
        sweepGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = sweepGrad;
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = `${accent}AA`;
        ctx.fillRect(0, h - 3, ((elapsed * 180) % w), 3);
      }
      frameHandle = window.requestAnimationFrame(renderFrame);
    };

    try {
      frameHandle = window.requestAnimationFrame(renderFrame);
      stream = canvas.captureStream(24);
      videoEl.srcObject = stream;
      void videoEl.play().catch(() => {
        // Poster thumbnail underneath stays visible if autoplay is blocked
      });
    } catch {
      // Poster thumbnail underneath stays visible
    }

    return () => {
      cancelled = true;
      if (frameHandle) window.cancelAnimationFrame(frameHandle);
      if (stream) {
        for (const track of stream.getTracks()) {
          track.stop();
        }
      }
      if (videoEl.srcObject) {
        videoEl.srcObject = null;
      }
    };
  }, [animateVideo, reducedMotion, resolvedMedia]);

  const shouldRenderMotionVideo =
    resolvedMedia.kind === 'video' && !reducedMotion && animateVideo && !videoFailed;

  const scrimClass = SCRIM_CLASS_MAP[visualStyle.bannerScrim] ?? styles.scrimBalanced ?? '';

  return (
    <div
      className={`relative h-36 w-full overflow-hidden rounded-t-xl sm:h-44 ${
        resolvedMedia.kind === 'preset' ? PRESET_CLASS_MAP[resolvedMedia.presetId] ?? '' : 'bg-subtle'
      } ${className}`}
    >
      {resolvedMedia.kind === 'image' && (
        <img
          src={resolvedMedia.src}
          alt={
            isEnglish
              ? `Profile banner for ${displayName}`
              : `Banner profil ${displayName}`
          }
          width={1200}
          height={384}
          decoding="async"
          className={`h-full w-full object-cover ${resolvedMedia.positionClass}`}
        />
      )}

      {resolvedMedia.kind === 'video' && (
        <>
          <img
            src={resolvedMedia.posterSrc}
            alt={
              isEnglish
                ? `Video banner frame for ${displayName}`
                : `Bingkai banner video ${displayName}`
            }
            width={1200}
            height={384}
            decoding="async"
            className={`h-full w-full object-cover ${resolvedMedia.positionClass}`}
          />
          {shouldRenderMotionVideo && (
            <video
              ref={videoRef}
              key={resolvedMedia.videoSrc ?? resolvedMedia.sampleMode}
              src={resolvedMedia.videoSrc ?? undefined}
              poster={resolvedMedia.posterSrc}
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
              aria-hidden="true"
              onError={() => setVideoFailed(true)}
              className={`absolute inset-0 h-full w-full object-cover ${resolvedMedia.positionClass}`}
            />
          )}
        </>
      )}

      <div aria-hidden="true" className={`pointer-events-none absolute inset-0 ${scrimClass}`} />

      <div className="pointer-events-none absolute left-3 top-3 right-3 flex flex-wrap items-center justify-between gap-2">
        {isPreview ? (
          <span className="rounded-md border border-default bg-surface/95 px-2.5 py-1 font-mono text-[11px] font-semibold text-primary shadow-sm">
            {isEnglish ? 'Live Preview' : 'Pratinjau Langsung'}
          </span>
        ) : (
          <span />
        )}

        {resolvedMedia.kind === 'video' && (
          <span className="inline-flex items-center gap-1.5 rounded-md border border-white/25 bg-black/70 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-white">
            <span>{reducedMotion ? (isEnglish ? 'Static Frame' : 'Bingkai Statis') : 'VIDEO'}</span>
          </span>
        )}
      </div>
    </div>
  );
}
