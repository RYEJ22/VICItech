'use client';

import type { CSSProperties, ReactElement } from 'react';
import Link from 'next/link';
import {
  Camera,
  CheckCircle2,
  Cpu,
  Edit3,
  Flame,
  LogOut,
  MessageSquare,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import {
  DEFAULT_PROFILE_ACCENT_COLOR,
  formatProfileJoinDate,
  resolveProfileRoleLabel,
} from '@/lib/profile/profile-types';
import type { UnifiedProfile } from '@/lib/profile/profile-types';
import {
  DEFAULT_PROFILE_VISUAL_STYLE,
  getSinPresetMeta,
} from '@/lib/profile/profile-customization';
import {
  AvatarFrameStyle,
  ProfileBadgeStyle,
  ProfileSinPresetId,
  ProfileVisualCustomization,
} from '@/lib/profile/profile-customization';
import { ProfileAvatarFrame } from './profile-avatar-frame';
import { ProfileBannerMedia } from './profile-banner-media';
import styles from './profile-hub.module.css';

interface ProfileHeaderCardProps {
  readonly profile: UnifiedProfile;
  readonly visualStyle?: ProfileVisualCustomization | undefined;
  readonly stats: {
    readonly communityPosts: number;
    readonly savedPresets: number;
  };
  readonly isOwner: boolean;
  readonly isPreview?: boolean | undefined;
  readonly isSigningOut?: boolean | undefined;
  readonly onEditProfile?: (() => void) | undefined;
  readonly onQuickAvatarPick?: (() => void) | undefined;
  readonly onSignOut?: (() => void) | undefined;
}

const BADGE_STYLE_CLASS_MAP: Readonly<Record<ProfileBadgeStyle, string | undefined>> = {
  solid: styles.badgeSolid,
  outline: styles.badgeOutline,
  pixel: styles.badgePixel,
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

const focusRing =
  'vt-motion-press focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas';

function formatLocalizedJoinDate(iso: string | null, isEnglish: boolean): string {
  if (!isEnglish) return formatProfileJoinDate(iso);
  if (!iso) return 'Active Member';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Active Member';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function ProfileHeaderCard({
  profile,
  visualStyle,
  stats,
  isOwner,
  isPreview = false,
  isSigningOut = false,
  onEditProfile,
  onQuickAvatarPick,
  onSignOut,
}: ProfileHeaderCardProps): ReactElement {
  const { language, isEnglish } = useLanguage();
  const activeStyle = visualStyle ?? DEFAULT_PROFILE_VISUAL_STYLE;
  const sinMeta = getSinPresetMeta(activeStyle.sinPreset);
  const sinClass = SIN_CLASS_MAP[sinMeta.id];
  const hasSinPreset = sinMeta.id !== 'none';
  const roleLabel = resolveProfileRoleLabel(profile.role);

  const initials =
    profile.displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('') || 'VT';

  const accentStyle: CSSProperties & Record<`--${string}`, string | number> = {
    '--profile-accent': profile.accentColor || DEFAULT_PROFILE_ACCENT_COLOR,
  };

  const avatarShapeClass =
    activeStyle.avatarFrame === 'corners' ? 'rounded-lg' : 'rounded-full';
  const badgeVariantClass = BADGE_STYLE_CLASS_MAP[activeStyle.badgeStyle] ?? styles.badgeOutline ?? '';
  const trimCardClass =
    activeStyle.accentTrim === 'left-stripe'
      ? styles.trimLeftStripe ?? ''
      : activeStyle.accentTrim === 'full-frame'
        ? styles.trimFullFrame ?? ''
        : '';
  const showTopRail =
    activeStyle.accentTrim === 'top-rail' ||
    (hasSinPreset && activeStyle.accentTrim === 'none');
  const showCardCornerTicks = activeStyle.accentTrim === 'corner-ticks';

  return (
    <section
      style={accentStyle}
      aria-label={
        isPreview
          ? isEnglish
            ? 'Profile card preview'
            : 'Pratinjau kartu profil'
          : isEnglish
            ? `Profile card for ${profile.displayName}`
            : `Kartu profil ${profile.displayName}`
      }
      className={`box-border w-full max-w-full min-w-0 overflow-hidden rounded-xl border border-default bg-surface shadow-sm ${
        styles.trimCard ?? ''
      } ${trimCardClass} ${
        hasSinPreset ? `${styles.sinCard ?? ''} ${sinClass ?? ''}` : ''
      }`}
    >
      {showTopRail && <div aria-hidden="true" className={styles.trimTopRail} />}

      {showCardCornerTicks && (
        <>
          <span
            aria-hidden="true"
            className={`left-1.5 top-1.5 border-l-2 border-t-2 ${styles.trimCornerPip ?? ''}`}
          />
          <span
            aria-hidden="true"
            className={`right-1.5 top-1.5 border-r-2 border-t-2 ${styles.trimCornerPip ?? ''}`}
          />
          <span
            aria-hidden="true"
            className={`bottom-1.5 left-1.5 border-b-2 border-l-2 ${styles.trimCornerPip ?? ''}`}
          />
          <span
            aria-hidden="true"
            className={`bottom-1.5 right-1.5 border-b-2 border-r-2 ${styles.trimCornerPip ?? ''}`}
          />
        </>
      )}

      {/* Cover Banner (Video / Image / Preset) */}
      <ProfileBannerMedia
        bannerUrl={profile.bannerUrl}
        visualStyle={activeStyle}
        displayName={profile.displayName}
        isPreview={isPreview}
      />

      {/* Identity & Stats Body */}
      <div className="px-4 pb-6 pt-4 sm:px-7 sm:pt-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="-mt-14 flex min-w-0 flex-col gap-3 sm:-mt-16 sm:flex-row sm:items-end sm:gap-5">
            {/* Overlapping Avatar */}
            <div className={`relative shrink-0 self-start ${avatarShapeClass} ${styles.avatarWrapper ?? ''}`}>
              <ProfileAvatarFrame
                visualStyle={activeStyle}
                accentColor={profile.accentColor}
                size="xl"
                sizeClassName="h-24 w-24 sm:h-28 sm:w-28"
              >
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={
                      isEnglish
                        ? `Avatar for ${profile.displayName}`
                        : `Foto profil ${profile.displayName}`
                    }
                    width={112}
                    height={112}
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="grid h-full w-full place-items-center bg-accent-subtle font-sans text-2xl font-semibold text-accent-cta sm:text-3xl">
                    {initials}
                  </span>
                )}
              </ProfileAvatarFrame>

              {isOwner && !isPreview && onQuickAvatarPick && (
                <button
                  type="button"
                  onClick={onQuickAvatarPick}
                  aria-label={isEnglish ? 'Change profile photo' : 'Ubah foto profil'}
                  className={`absolute inset-0 z-10 grid place-items-center bg-black/55 text-white ${avatarShapeClass} ${styles.cameraOverlay ?? ''} ${focusRing}`}
                >
                  <Camera className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
                </button>
              )}
            </div>

            {/* Name, Username, Role Badge, 7 Deadly Sins Persona & Status */}
            <div className="min-w-0 pt-1">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <h1 className="min-w-0 truncate font-sans text-2xl font-bold tracking-tight text-primary [text-wrap:balance] sm:text-3xl">
                  {profile.displayName}
                </h1>
                <span
                  className={`inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold ${
                    activeStyle.badgeStyle === 'pixel'
                      ? badgeVariantClass
                      : roleLabel === 'Admin'
                        ? badgeVariantClass
                        : roleLabel === 'Builder'
                          ? 'border-emerald-600/30 bg-emerald-500/15 text-emerald-700'
                          : badgeVariantClass
                  }`}
                >
                  {roleLabel === 'Admin' ? (
                    <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                  )}
                  <span>{roleLabel}</span>
                </span>

                {hasSinPreset && (
                  <span
                    className={`inline-flex max-w-full shrink-0 items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[11px] font-semibold ${
                      activeStyle.badgeStyle === 'solid'
                        ? styles.badgeSolid ?? ''
                        : activeStyle.badgeStyle === 'pixel'
                          ? `${styles.sinBadge ?? ''} ${styles.badgePixel ?? ''}`
                          : styles.sinBadge ?? ''
                    }`}
                  >
                    <Flame className="h-3 w-3 shrink-0" strokeWidth={2} aria-hidden="true" />
                    <span className="truncate">
                      {sinMeta.label[language]} · {sinMeta.personaTag[language]}
                    </span>
                  </span>
                )}
              </div>

              <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-2">
                <span className="font-mono text-sm text-secondary">
                  @{profile.username || (isEnglish ? 'member' : 'anggota')}
                </span>
                {activeStyle.customRoleLine && (
                  <span
                    className={`inline-flex max-w-full items-center rounded-md border px-2.5 py-0.5 font-mono text-xs font-semibold ${badgeVariantClass}`}
                  >
                    <span className="truncate">{activeStyle.customRoleLine}</span>
                  </span>
                )}
                {profile.statusText && (
                  <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-default bg-canvas px-3 py-0.5 text-xs font-medium text-primary">
                    <span
                      aria-hidden="true"
                      className={`h-2 w-2 shrink-0 rounded-full ${styles.statusDot ?? ''}`}
                    />
                    <span className="truncate max-w-[24ch]">{profile.statusText}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Primary Actions */}
          {!isPreview && (
            <div className="flex flex-wrap items-center gap-2.5">
              {isOwner ? (
                <>
                  {onEditProfile && (
                    <button
                      type="button"
                      onClick={onEditProfile}
                      className={`vt-btn-tactile inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-accent-cta px-4 py-2 text-sm font-semibold text-white hover:bg-accent-cta-hover ${focusRing}`}
                    >
                      <Edit3 className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                      <span>{isEnglish ? 'Edit Profile' : 'Edit Profil'}</span>
                    </button>
                  )}
                  {onSignOut && (
                    <button
                      type="button"
                      onClick={onSignOut}
                      disabled={isSigningOut}
                      className={`vt-btn-tactile inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-default bg-surface px-4 py-2 text-sm font-medium text-secondary hover:bg-subtle hover:text-primary disabled:opacity-50 ${focusRing}`}
                    >
                      <LogOut className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                      <span>
                        {isSigningOut
                          ? isEnglish
                            ? 'Signing out…'
                            : 'Keluar…'
                          : isEnglish
                            ? 'Sign Out'
                            : 'Keluar'}
                      </span>
                    </button>
                  )}
                </>
              ) : (
                profile.username && (
                  <Link
                    href={`/messages?to=${encodeURIComponent(profile.username)}`}
                    className={`vt-btn-tactile inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-accent-cta px-5 py-2 text-sm font-semibold text-white hover:bg-accent-cta-hover ${focusRing}`}
                  >
                    <MessageSquare className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                    <span>{isEnglish ? 'Send Message (DM)' : 'Kirim Pesan (DM)'}</span>
                  </Link>
                )
              )}
            </div>
          )}
        </div>

        {/* Bio & Featured Rig Tag */}
        <div className="mt-4 space-y-2.5">
          {profile.bio ? (
            <p className="max-w-[70ch] whitespace-pre-line break-words text-sm leading-relaxed text-secondary">
              {profile.bio}
            </p>
          ) : (
            <p className="text-sm text-secondary">
              {isOwner
                ? isEnglish
                  ? 'Add a short bio in Customization & Settings so members know your build focus.'
                  : 'Tambahkan bio singkat di tab Kustomisasi & Pengaturan agar anggota lain mengenal rakitan Anda.'
                : isEnglish
                  ? 'No bio yet.'
                  : 'Belum ada bio.'}
            </p>
          )}

          {profile.featuredRig && (
            <div className="inline-flex max-w-full items-center gap-2 rounded-lg border border-default bg-canvas px-3 py-1.5 font-mono text-xs text-primary">
              <Cpu className="h-3.5 w-3.5 shrink-0 text-accent-cta" strokeWidth={1.75} aria-hidden="true" />
              <span className="truncate">{profile.featuredRig}</span>
            </div>
          )}
        </div>

        {/* Compact Stats Row */}
        <dl className="mt-5 grid grid-cols-2 gap-2 border-t border-default pt-4 sm:grid-cols-3 sm:gap-3">
          <div className="flex min-h-20 min-w-0 flex-col justify-between gap-2 rounded-lg border border-default bg-canvas px-2.5 py-2.5 sm:min-h-24 sm:px-3">
            <dt className="text-[11px] font-medium leading-tight text-secondary">
              {isEnglish ? 'Community Posts' : 'Postingan Komunitas'}
            </dt>
            <dd className="font-mono text-lg font-semibold tabular-nums text-primary">
              <AnimatedNumber value={stats.communityPosts} format="number" />
            </dd>
          </div>
          <div className="flex min-h-20 min-w-0 flex-col justify-between gap-2 rounded-lg border border-default bg-canvas px-2.5 py-2.5 sm:min-h-24 sm:px-3">
            <dt className="text-[11px] font-medium leading-tight text-secondary">
              {isEnglish ? 'Saved Presets' : 'Preset Tersimpan'}
            </dt>
            <dd className="font-mono text-lg font-semibold tabular-nums text-primary">
              <AnimatedNumber value={stats.savedPresets} format="number" />
            </dd>
          </div>
          <div className="col-span-2 flex min-h-20 min-w-0 flex-col justify-between gap-2 rounded-lg border border-default bg-canvas px-2.5 py-2.5 sm:col-span-1 sm:min-h-24 sm:px-3">
            <dt className="flex items-center gap-1 text-[11px] font-medium leading-tight text-secondary">
              <Sparkles className="h-3 w-3 shrink-0 text-accent-cta" strokeWidth={1.75} aria-hidden="true" />
              <span>{isEnglish ? 'Joined' : 'Bergabung'}</span>
            </dt>
            <dd className="truncate font-mono text-xs font-semibold text-primary sm:text-sm">
              {formatLocalizedJoinDate(profile.createdAt, isEnglish)}
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
