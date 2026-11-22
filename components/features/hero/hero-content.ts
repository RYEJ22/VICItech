export type ZoomOrigin =
  | 'center'
  | 'top left'
  | 'top right'
  | 'bottom left'
  | 'bottom right';

export type NonEmptyReadonlyArray<T> = readonly [T, ...T[]];

export interface HeroLink {
  readonly label: string;
  readonly href: string;
}

export interface HeroSlide {
  /** Path under `/public`. */
  readonly src: string;
  /** Primary display headline for the slide. */
  readonly headline: string;
  /** Supporting subheadline copy for the slide. */
  readonly subheadline: string;
  /** Maintainer note / accessible description of the visual scene. */
  readonly description: string;
  /** Primary workspace CTA destination. */
  readonly primaryCta: HeroLink;
  /** Secondary hardware library CTA destination. */
  readonly secondaryCta: HeroLink;
  /** CSS `object-position`. Keeps the subject in frame on narrow screens. */
  readonly objectPosition: string;
  /** Ken Burns zoom anchor. Vary it per slide so the motion never feels repetitive. */
  readonly zoomOrigin: ZoomOrigin;
}

export type HeroSlides = NonEmptyReadonlyArray<HeroSlide>;

export interface HeroContent {
  readonly headline: string;
  readonly subheadline: string;
  readonly description: string;
  readonly primaryCta: HeroLink;
  readonly secondaryCta: HeroLink;
}

export const HERO_SLIDES: HeroSlides = [
  {
    src: '/images/hero/pc-rig.jpg',
    headline: 'Welcome to ViciTech — your circular tech ecosystem.',
    subheadline:
      'From custom PCs and laptops to smartphones and accessories—build, diagnose, upgrade, and extend the life of all your gear in one place.',
    description: 'High-performance desktop workstations and custom PC builds',
    primaryCta: { label: 'Enter Workspace', href: '/home' },
    secondaryCta: { label: 'Explore Library', href: '/market?view=catalog' },
    objectPosition: '50% 50%',
    zoomOrigin: 'center',
  },
  {
    src: '/images/hero/thermal-paste.jpg',
    headline: 'Precision diagnostics & thermal lifecycle care.',
    subheadline:
      'Verify hardware health with 15-point IoT quality control, live burn-in telemetry, and component-level upgrade intelligence.',
    description: 'Precision thermal application and component-level diagnostics',
    primaryCta: { label: 'Enter Workspace', href: '/home' },
    secondaryCta: { label: 'Explore Library', href: '/market?view=catalog' },
    objectPosition: '50% 45%',
    zoomOrigin: 'top left',
  },
  {
    src: '/images/hero/repair-tech.jpg',
    headline: 'Extend the life of every laptop, phone, and workstation.',
    subheadline:
      'Check maximum RAM and NVMe expansion, find CPU/GPU bottlenecks, and trade in retired devices for certified refurbished hardware.',
    description: 'Professional laptop and mobile device motherboard servicing',
    primaryCta: { label: 'Enter Workspace', href: '/home' },
    secondaryCta: { label: 'Explore Library', href: '/market?view=catalog' },
    objectPosition: '50% 40%',
    zoomOrigin: 'bottom right',
  },
  {
    src: '/images/hero/code-screen.jpg',
    headline: 'Connected hardware intelligence for creators, labs, and fleets.',
    subheadline:
      'Configure tailored B2C, B2B, and B2S presets with live wattage estimation, verified QC certificates, and circular buyback tracking.',
    description: 'IoT telemetry engine, QC certification, and multi-device lifecycle tracking',
    primaryCta: { label: 'Enter Workspace', href: '/home' },
    secondaryCta: { label: 'Explore Library', href: '/market?view=catalog' },
    objectPosition: '50% 50%',
    zoomOrigin: 'top right',
  },
];

export const HERO_CONTENT: HeroContent = {
  headline: 'Welcome to ViciTech — your circular tech ecosystem.',
  subheadline:
    'From custom PCs and laptops to smartphones and accessories—build, diagnose, upgrade, and extend the life of all your gear in one place.',
  description:
    'From custom PCs and laptops to smartphones and accessories—build, diagnose, upgrade, and extend the life of all your gear in one place.',
  primaryCta: { label: 'Enter Workspace', href: '/home' },
  secondaryCta: { label: 'Explore Library', href: '/market?view=catalog' },
};
