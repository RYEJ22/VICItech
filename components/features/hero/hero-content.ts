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
    headline: 'PC & laptop anti-zonk, teruji IoT QC 15 titik.',
    subheadline:
      'Beli rakitan siap kirim, cek kompatibilitas komponen, dan tukar tambah perangkat dengan laporan telemetri nyata.',
    description: 'Workstation desktop dan rakitan PC kustom terkurasi ViciTech',
    primaryCta: { label: 'Jelajahi Market QC', href: '/market' },
    secondaryCta: { label: 'Mulai Rakit PC', href: '/home?tab=builder' },
    objectPosition: '50% 50%',
    zoomOrigin: 'center',
  },
  {
    src: '/images/hero/thermal-paste.jpg',
    headline: 'Diagnostik presisi berbasis telemetri nyata.',
    subheadline:
      'Pantau log burn-in suhu CPU/GPU dan voltase langsung dari sensor bench uji sebelum perangkat dikirim.',
    description: 'Aplikasi pasta termal presisi dan inspeksi QC tingkat komponen',
    primaryCta: { label: 'Jelajahi Market QC', href: '/market' },
    secondaryCta: { label: 'Cek Serial IoT QC', href: '/qc-panel' },
    objectPosition: '50% 45%',
    zoomOrigin: 'top left',
  },
  {
    src: '/images/hero/repair-tech.jpg',
    headline: 'Perpanjang masa pakai perangkat keras Anda.',
    subheadline:
      'Uji kapasitas ekspansi RAM/SSD, analisis bottleneck, dan tukar tambah laptop lama ke unit terverifikasi.',
    description: 'Layanan servis motherboard laptop dan perangkat oleh teknisi mitra ViciTech',
    primaryCta: { label: 'Jelajahi Market QC', href: '/market' },
    secondaryCta: { label: 'Mulai Rakit PC', href: '/home?tab=builder' },
    objectPosition: '50% 40%',
    zoomOrigin: 'bottom right',
  },
  {
    src: '/images/hero/code-screen.jpg',
    headline: 'Rakit cerdas untuk kreator, lab, dan bisnis.',
    subheadline:
      'Susun konfigurasi B2C, B2B, dan B2S lengkap dengan kalkulasi daya PSU otomatis dan sertifikat QC digital.',
    description: 'Mesin telemetri IoT QC, sertifikasi unit, dan pelacakan siklus perangkat',
    primaryCta: { label: 'Jelajahi Market QC', href: '/market' },
    secondaryCta: { label: 'Mulai Rakit PC', href: '/home?tab=builder' },
    objectPosition: '50% 50%',
    zoomOrigin: 'top right',
  },
];

export const HERO_CONTENT: HeroContent = {
  headline: 'PC & laptop anti-zonk, teruji IoT QC 15 titik.',
  subheadline:
    'Beli rakitan siap kirim, cek kompatibilitas komponen, dan tukar tambah perangkat dengan laporan telemetri nyata.',
  description:
    'Beli rakitan siap kirim, cek kompatibilitas komponen, dan tukar tambah perangkat dengan laporan telemetri nyata.',
  primaryCta: { label: 'Jelajahi Market QC', href: '/market' },
  secondaryCta: { label: 'Mulai Rakit PC', href: '/home?tab=builder' },
};
