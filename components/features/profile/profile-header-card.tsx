'use client';

import type { CSSProperties, ReactElement } from 'react';
import Link from 'next/link';
import {
  Camera,
  CheckCircle2,
  Cpu,
  Edit3,
  LogOut,
  MessageSquare,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import {
  DEFAULT_PROFILE_ACCENT_COLOR,
  formatProfileJoinDate,
  resolveBannerMode,
  resolveProfileRoleLabel,
} from '@/lib/profile/profile-types';
import type { ProfileBannerPresetId, UnifiedProfile } from '@/lib/profile/profile-types';
import styles from './profile-hub.module.css';

interface ProfileHeaderCardProps {
  readonly profile: UnifiedProfile;
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

const PRESET_CLASS_MAP: Readonly<Record<ProfileBannerPresetId, string | undefined>> = {
  'alabaster-grid': styles.preset_alabaster_grid,
  'ember-horizon': styles.preset_ember_horizon,
  'graphite-circuit': styles.preset_graphite_circuit,
  'emerald-bench': styles.preset_emerald_bench,
  'indigo-blueprint': styles.preset_indigo_blueprint,
};

const focusRing =
  'vt-motion-press focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas';

export function ProfileHeaderCard({
  profile,
  stats,
  isOwner,
  isPreview = false,
  isSigningOut = false,
  onEditProfile,
  onQuickAvatarPick,
  onSignOut,
}: ProfileHeaderCardProps): ReactElement {
  const banner = resolveBannerMode(profile.bannerUrl);
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

  return (
    <section
      style={accentStyle}
      aria-label={isPreview ? 'Pratinjau kartu profil' : `Kartu profil ${profile.displayName}`}
      className="overflow-hidden rounded-xl border border-default bg-surface shadow-sm"
    >
      {/* Cover Banner */}
      <div
        className={`relative h-36 w-full overflow-hidden rounded-t-xl sm:h-44 ${
          banner.kind === 'preset' ? PRESET_CLASS_MAP[banner.presetId] ?? '' : 'bg-subtle'
        }`}
      >
        {banner.kind === 'image' && (
          <img
            src={banner.src}
            alt={`Banner profil ${profile.displayName}`}
            width={1200}
            height={384}
            decoding="async"
            className="h-full w-full object-cover"
          />
        )}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/25"
        />
        {isPreview && (
          <span className="absolute left-3 top-3 rounded-md border border-default bg-surface px-3 py-1.5 font-mono text-[11px] font-semibold text-primary shadow-card">
            Pratinjau Langsung
          </span>
        )}
      </div>

      {/* Identity & Stats Body */}
      <div className="px-5 pb-6 pt-4 sm:px-7 sm:pt-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="-mt-14 flex min-w-0 flex-col gap-3 sm:-mt-16 sm:flex-row sm:items-end sm:gap-5">
            {/* Overlapping Circular Avatar */}
            <div className={`relative shrink-0 self-start rounded-full ${styles.avatarWrapper ?? ''}`}>
              <div
                className={`relative h-24 w-24 overflow-hidden rounded-full bg-surface sm:h-28 sm:w-28 ${styles.avatarFrame ?? ''} ${styles.avatarAccentRing ?? ''}`}
              >
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={`Foto profil ${profile.displayName}`}
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
              </div>

              {isOwner && !isPreview && onQuickAvatarPick && (
                <button
                  type="button"
                  onClick={onQuickAvatarPick}
                  aria-label="Ubah foto profil"
                  className={`absolute inset-0 grid place-items-center rounded-full bg-black/55 text-white ${styles.cameraOverlay ?? ''} ${focusRing}`}
                >
                  <Camera className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
                </button>
              )}
            </div>

            {/* Name, Username, Role Badge & Discord-style Status Pill */}
            <div className="min-w-0 pt-1">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <h1 className="min-w-0 truncate font-sans text-2xl font-bold tracking-tight text-primary [text-wrap:balance] sm:text-3xl">
                  {profile.displayName}
                </h1>
                <span
                  className={`inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold ${
                    roleLabel === 'Admin'
                      ? 'border-accent-primary/30 bg-accent-subtle text-accent-cta'
                      : roleLabel === 'Builder'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                        : 'border-default bg-subtle text-primary'
                  }`}
                >
                  {roleLabel === 'Admin' ? (
                    <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                  )}
                  <span>{roleLabel}</span>
                </span>
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm text-secondary">
                  @{profile.username || 'anggota'}
                </span>
                {profile.statusText && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-default bg-canvas px-3 py-0.5 text-xs font-medium text-primary">
                    <span
                      aria-hidden="true"
                      className={`h-2 w-2 rounded-full ${styles.statusDot ?? ''}`}
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
                      <span>Edit Profil</span>
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
                      <span>{isSigningOut ? 'Keluar…' : 'Keluar'}</span>
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
                    <span>Kirim Pesan (DM)</span>
                  </Link>
                )
              )}
            </div>
          )}
        </div>

        {/* Bio & Featured Rig Tag */}
        <div className="mt-4 space-y-2.5">
          {profile.bio ? (
            <p className="max-w-[70ch] whitespace-pre-line text-sm leading-relaxed text-secondary">
              {profile.bio}
            </p>
          ) : (
            <p className="text-sm text-secondary">
              {isOwner
                ? 'Tambahkan bio singkat di tab Kustomisasi & Pengaturan agar anggota lain mengenal rakitan Anda.'
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
            <dt className="text-[11px] font-medium leading-tight text-secondary">Postingan Komunitas</dt>
            <dd className="text-lg font-semibold text-primary">
              <AnimatedNumber value={stats.communityPosts} format="number" />
            </dd>
          </div>
          <div className="flex min-h-20 min-w-0 flex-col justify-between gap-2 rounded-lg border border-default bg-canvas px-2.5 py-2.5 sm:min-h-24 sm:px-3">
            <dt className="text-[11px] font-medium leading-tight text-secondary">Preset Tersimpan</dt>
            <dd className="text-lg font-semibold text-primary">
              <AnimatedNumber value={stats.savedPresets} format="number" />
            </dd>
          </div>
          <div className="col-span-2 flex min-h-20 min-w-0 flex-col justify-between gap-2 rounded-lg border border-default bg-canvas px-2.5 py-2.5 sm:col-span-1 sm:min-h-24 sm:px-3">
            <dt className="flex items-center gap-1 text-[11px] font-medium leading-tight text-secondary">
              <Sparkles className="h-3 w-3 shrink-0 text-accent-cta" strokeWidth={1.75} aria-hidden="true" />
              <span>Bergabung</span>
            </dt>
            <dd className="truncate font-mono text-xs font-semibold text-primary sm:text-sm">
              {formatProfileJoinDate(profile.createdAt)}
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
