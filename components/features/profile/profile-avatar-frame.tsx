'use client';

import { useEffect, useState } from 'react';
import type { CSSProperties, ReactElement, ReactNode } from 'react';
import {
  DEFAULT_PROFILE_VISUAL_STYLE,
  PROFILE_STYLE_STORAGE_PREFIX,
  PROFILE_STYLE_UPDATED_EVENT,
  loadProfileVisualStyle,
  normalizeProfileVisualStyle,
} from '@/lib/profile/profile-customization';
import type {
  AvatarFrameStyle,
  ProfileSinPresetId,
  ProfileVisualCustomization,
} from '@/lib/profile/profile-customization';
import styles from './avatar-frame.module.css';

interface ProfileAvatarFrameProps {
  readonly userId?: string | null | undefined;
  readonly visualStyle?: ProfileVisualCustomization | undefined;
  readonly frameStyle?: AvatarFrameStyle | undefined;
  readonly sinPreset?: ProfileSinPresetId | undefined;
  readonly accentColor?: string | null | undefined;
  readonly size?: 'sm' | 'md' | 'xl' | undefined;
  readonly sizeClassName?: string | undefined;
  readonly className?: string | undefined;
  readonly children: ReactNode;
}

const FRAME_CLASS_MAP: Readonly<Record<AvatarFrameStyle, string | undefined>> = {
  classic: styles.frameClassic,
  double: styles.frameDouble,
  corners: styles.frameCorners,
  'luminous-glow': styles.frameLuminousGlow,
  'rotating-beam': styles.frameRotatingBeam,
  'pulse-aura': styles.framePulseAura,
};

const SIN_CLASS_MAP: Readonly<Record<ProfileSinPresetId, string | undefined>> = {
  none: undefined,
  pride: styles.sin_pride,
  greed: styles.sin_greed,
  wrath: styles.sin_wrath,
  sloth: styles.sin_sloth,
  envy: styles.sin_envy,
  gluttony: styles.sin_gluttony,
  lust: styles.sin_lust,
};

const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;

export function ProfileAvatarFrame({
  userId,
  visualStyle,
  frameStyle,
  sinPreset,
  accentColor,
  size = 'md',
  sizeClassName = 'h-10 w-10',
  className = '',
  children,
}: ProfileAvatarFrameProps): ReactElement {
  const cleanUserId = userId?.trim() ?? '';
  const shouldAutoHydrate = !visualStyle && !frameStyle && Boolean(cleanUserId);
  const [storedStyle, setStoredStyle] = useState<ProfileVisualCustomization>(
    DEFAULT_PROFILE_VISUAL_STYLE,
  );

  // Hydrate client-side from localStorage so SSR output matches initial paint
  useEffect(() => {
    if (!shouldAutoHydrate || typeof window === 'undefined') {
      return undefined;
    }

    setStoredStyle(loadProfileVisualStyle(cleanUserId));

    const handleLocalUpdate = (event: Event) => {
      if (
        event instanceof CustomEvent &&
        typeof event.detail === 'object' &&
        event.detail !== null
      ) {
        const detail = event.detail as Record<string, unknown>;
        const targetId = typeof detail.userId === 'string' ? detail.userId.trim() : '';
        if (targetId === cleanUserId && detail.style) {
          setStoredStyle(normalizeProfileVisualStyle(detail.style));
        }
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === `${PROFILE_STYLE_STORAGE_PREFIX}${cleanUserId}`) {
        setStoredStyle(loadProfileVisualStyle(cleanUserId));
      }
    };

    window.addEventListener(PROFILE_STYLE_UPDATED_EVENT, handleLocalUpdate);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(PROFILE_STYLE_UPDATED_EVENT, handleLocalUpdate);
      window.removeEventListener('storage', handleStorage);
    };
  }, [cleanUserId, shouldAutoHydrate]);

  const resolvedBase = visualStyle ?? storedStyle;
  const activeFrame: AvatarFrameStyle = frameStyle ?? resolvedBase.avatarFrame;
  const activeSin: ProfileSinPresetId = sinPreset ?? resolvedBase.sinPreset;
  const candidateAccent = accentColor ?? resolvedBase.accentColor;

  const sizeClass =
    size === 'sm' ? styles.sizeSm ?? '' : size === 'xl' ? styles.sizeXl ?? '' : styles.sizeMd ?? '';
  const frameClass = FRAME_CLASS_MAP[activeFrame] ?? styles.frameClassic ?? '';
  const sinClass = SIN_CLASS_MAP[activeSin] ?? '';

  const rootStyle: CSSProperties & Record<`--${string}`, string> = {};
  if (candidateAccent && HEX_COLOR_RE.test(candidateAccent.trim())) {
    rootStyle['--av-profile-accent'] = candidateAccent.trim().toUpperCase();
  }

  return (
    <span
      style={rootStyle}
      className={`${styles.root ?? ''} ${sizeClass} ${frameClass} ${sinClass} ${sizeClassName} ${className}`}
    >
      <span className={styles.inner}>{children}</span>
      {activeFrame === 'corners' && (
        <>
          <span aria-hidden="true" className={`${styles.bracket ?? ''} ${styles.bracketTL ?? ''}`} />
          <span aria-hidden="true" className={`${styles.bracket ?? ''} ${styles.bracketTR ?? ''}`} />
          <span aria-hidden="true" className={`${styles.bracket ?? ''} ${styles.bracketBL ?? ''}`} />
          <span aria-hidden="true" className={`${styles.bracket ?? ''} ${styles.bracketBR ?? ''}`} />
        </>
      )}
    </span>
  );
}
