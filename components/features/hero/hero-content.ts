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
  readonly eyebrow: string;
  readonly headline: string;
  readonly subheadline: string;
  readonly description: string;
  readonly primaryCta: HeroLink;
  readonly secondaryCta: HeroLink;
}

export const HERO_SLIDES: HeroSlides = [
  {
    src: '/images/hero/pc-rig.jpg',
    headline: 'Beli, rakit, dan upgrade PC & laptop tanpa rasa ragu.',
    subheadline:
      'Ekosistem Circular IT Indonesia dengan Toolkit Simulasi Presisi, protokol 15 titik Hybrid IoT QC (Simulated / Demo), dan ViciTech AI yang terhubung langsung ke katalog.',
    description: 'Workstation desktop dan rakitan PC kustom terkurasi ViciTech',
    primaryCta: { label: 'Jelajahi Market QC', href: '/market' },
    secondaryCta: { label: 'Mulai Rakit PC', href: '/builder' },
    objectPosition: '50% 50%',
    zoomOrigin: 'center',
  },
  {
    src: '/images/hero/thermal-paste.jpg',
    headline: 'Diagnostik presisi & pemantauan termal transparan.',
    subheadline:
      'Verifikasi kesehatan perangkat keras lewat protokol 15 titik Hybrid IoT QC (Simulated / Demo), log burn-in suhu CPU/GPU, serta analisis potensi upgrade RAM dan SSD.',
    description: 'Aplikasi pasta termal presisi dan inspeksi QC tingkat komponen',
    primaryCta: { label: 'Jelajahi Market QC', href: '/market' },
    secondaryCta: { label: 'Cek Serial IoT QC', href: '/qc-panel' },
    objectPosition: '50% 45%',
    zoomOrigin: 'top left',
  },
  {
    src: '/images/hero/repair-tech.jpg',
    headline: 'Perpanjang masa pakai setiap laptop, konsol, dan workstation Anda.',
    subheadline:
      'Cek ekspansi RAM dan slot NVMe maksimal, deteksi bottleneck CPU/GPU, dan tukar tambah perangkat lama dengan unit terverifikasi.',
    description: 'Layanan servis motherboard laptop dan perangkat oleh teknisi mitra ViciTech',
    primaryCta: { label: 'Jelajahi Market QC', href: '/market' },
    secondaryCta: { label: 'Mulai Rakit PC', href: '/builder' },
    objectPosition: '50% 40%',
    zoomOrigin: 'bottom right',
  },
  {
    src: '/images/hero/code-screen.jpg',
    headline: 'Konfigurasi cerdas untuk gamer, kreator, sekolah, dan bisnis.',
    subheadline:
      'Susun preset B2C, B2B, dan B2S lengkap dengan kalkulasi daya PSU real-time, simulasi bottleneck, dan estimasi buffer JIT 5%.',
    description: 'Mesin telemetri IoT QC, sertifikasi unit, dan pelacakan siklus perangkat',
    primaryCta: { label: 'Jelajahi Market QC', href: '/market' },
    secondaryCta: { label: 'Mulai Rakit PC', href: '/builder' },
    objectPosition: '50% 50%',
    zoomOrigin: 'top right',
  },
];

export const HERO_CONTENT: HeroContent = {
  eyebrow: 'Ekosistem Circular IT & Hardware Toolkit Indonesia',
  headline: 'Beli, rakit, dan upgrade PC & laptop tanpa rasa ragu.',
  subheadline:
    'Dari simulasi rakitan & bottleneck, verifikasi 15 titik Hybrid IoT QC (Simulated / Demo), hingga konsultasi ViciTech AI langsung ke katalog — semua dalam satu platform transparan.',
  description:
    'Dari simulasi rakitan & bottleneck, verifikasi 15 titik Hybrid IoT QC (Simulated / Demo), hingga konsultasi ViciTech AI langsung ke katalog — semua dalam satu platform transparan.',
  primaryCta: { label: 'Jelajahi Market QC', href: '/market' },
  secondaryCta: { label: 'Mulai Rakit PC', href: '/builder' },
};
