export type NonEmptyReadonlyArray<T> = readonly [T, ...T[]];

export type DataBadgeVariant = 'live' | 'simulated' | 'sample';

export type ShowcaseIconKey = 'shield' | 'lock' | 'sliders' | 'refresh' | 'layers' | 'cpu';

export interface TechnicalCallout {
  readonly id: string;
  readonly position: 'top-left' | 'bottom-left' | 'top-right' | 'bottom-right';
  readonly badgeVariant: DataBadgeVariant;
  readonly badgeLabel: string;
  readonly title: string;
  readonly summary: string;
  readonly iconKey: ShowcaseIconKey;
  readonly targetModule: string;
  readonly targetView?: string;
}

export interface WorkflowStepCard {
  readonly id: string;
  readonly phaseLabel: string;
  readonly title: string;
  readonly summary: string;
  readonly deliverables: readonly [string, string];
  readonly imageSrc: string;
  readonly imageAlt: string;
  readonly actionLabel: string;
  readonly targetModule: string;
  readonly targetView?: string;
}

export interface ShowcasePillarRow {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly tags: readonly [string, string, string];
  readonly badgeVariant: DataBadgeVariant;
  readonly badgeLabel: string;
  readonly previewSrc: string;
  readonly previewAlt: string;
  readonly actionLabel: string;
  readonly targetModule?: string;
  readonly targetHref?: string;
}

export const SHOWCASE_MANIFESTO = {
  badgeLabel: 'Ekosistem Circular IT ViciTech',
  headline: 'Transparansi perangkat keras dari perakitan hingga verifikasi.',
  subtitle:
    'Satu alur terhubung untuk membandingkan spesifikasi, merakit PC sesuai daya, dan memeriksa kesehatan hardware sebelum dibeli.',
  ctaLabel: 'Mulai Rakit PC',
  ctaModule: 'builder',
  secondaryLabel: 'Jelajahi Market',
  secondaryHref: '/market',
} as const;

export const TECHNICAL_CALLOUTS: NonEmptyReadonlyArray<TechnicalCallout> = [
  {
    id: 'callout-esp32',
    position: 'top-left',
    badgeVariant: 'live',
    badgeLabel: 'Live ESP32',
    title: 'Telemetri IoT QC 15 Titik',
    summary: 'Suhu CPU/GPU dan voltase terekam otomatis selama uji burn-in di bench.',
    iconKey: 'shield',
    targetModule: 'qc',
  },
  {
    id: 'callout-nist',
    position: 'bottom-left',
    badgeVariant: 'simulated',
    badgeLabel: 'Simulated QC',
    title: 'Sanitasi Data NIST 800-88',
    summary: 'Penghapusan data permanen untuk unit enterprise, sekolah, dan Trade-In.',
    iconKey: 'lock',
    targetModule: 'qc',
  },
  {
    id: 'callout-jit',
    position: 'top-right',
    badgeVariant: 'sample',
    badgeLabel: 'Sample',
    title: 'Kalkulasi Daya & JIT 5%',
    summary: 'Validasi soket, kapasitas PSU, dan buffer pengadaan otomatis saat merakit.',
    iconKey: 'sliders',
    targetModule: 'builder',
  },
  {
    id: 'callout-tradein',
    position: 'bottom-right',
    badgeVariant: 'sample',
    badgeLabel: 'Sample',
    title: 'Trade-In & Refurbished Grade A+',
    summary: 'Tukar perangkat lama menjadi kredit upgrade ke unit bekas terverifikasi.',
    iconKey: 'refresh',
    targetModule: 'tradein',
  },
];

export const WORKFLOW_STEP_CARDS: NonEmptyReadonlyArray<WorkflowStepCard> = [
  {
    id: 'step-riset',
    phaseLabel: '01 · Riset Spesifikasi',
    title: 'Cek Spek & Potensi Upgrade',
    summary:
      'Bandingkan perangkat berdampingan sekaligus cek batas slot RAM dan NVMe sebelum membeli.',
    deliverables: ['Komparasi spesifikasi bersih', 'Cek ekspansi RAM & SSD'],
    imageSrc: '/images/hero/pc-rig.jpg',
    imageAlt: 'Workstation desktop custom ViciTech siap analisis upgrade',
    actionLabel: 'Buka Upgrade Analyzer',
    targetModule: 'library',
    targetView: 'upgrade',
  },
  {
    id: 'step-konfigurasi',
    phaseLabel: '02 · Konfigurasi Sistem',
    title: 'Rakit Preset & Cek Bottleneck',
    summary:
      'Susun paket PC dengan pengecekan soket, TDP PSU, dan keseimbangan performa CPU/GPU.',
    deliverables: ['Validasi soket & daya otomatis', 'Estimasi FPS dan bottleneck'],
    imageSrc: '/images/hero/code-screen.jpg',
    imageAlt: 'Layar analitik kompatibilitas dan konfigurasi sistem hardware',
    actionLabel: 'Buka Preset Builder',
    targetModule: 'builder',
  },
  {
    id: 'step-verifikasi',
    phaseLabel: '03 · Verifikasi IoT QC',
    title: 'Uji Burn-In & Sertifikat Serial',
    summary:
      'Setiap unit terikat nomor seri VICI untuk pelacakan suhu dan status kelulusan 15 titik QC.',
    deliverables: ['Log telemetri suhu & voltase', 'Verifikasi seri anti-zonk'],
    imageSrc: '/images/hero/thermal-paste.jpg',
    imageAlt: 'Aplikasi thermal paste presisi dan inspeksi QC hardware',
    actionLabel: 'Buka Panel IoT QC',
    targetModule: 'qc',
  },
  {
    id: 'step-sirkular',
    phaseLabel: '04 · Dukungan Sirkular',
    title: 'Trade-In & Mitra Servis Lokal',
    summary:
      'Ajukan valuasi tukar tambah perangkat lama dan terhubung ke pusat servis mitra tepercaya.',
    deliverables: ['Estimasi nilai Trade-In transparan', 'Direktori toko & servis mitra'],
    imageSrc: '/images/hero/repair-tech.jpg',
    imageAlt: 'Teknisi memperbaiki laptop dan motherboard di pusat servis ViciTech',
    actionLabel: 'Buka Portal Trade-In',
    targetModule: 'tradein',
  },
];

export const SHOWCASE_PILLAR_ROWS: NonEmptyReadonlyArray<ShowcasePillarRow> = [
  {
    id: 'pillar-library',
    title: 'Hardware Library & Upgrade',
    description:
      'Bandingkan CPU, GPU, laptop, dan cek batas ekspansi slot RAM maupun NVMe.',
    tags: ['Katalog Terbuka', 'Cek Slot', 'Komparasi'],
    badgeVariant: 'sample',
    badgeLabel: 'Sample Catalog',
    previewSrc: '/images/hero/pc-rig.jpg',
    previewAlt: 'Pratinjau katalog PC dan komponen ViciTech',
    actionLabel: 'Buka Library',
    targetModule: 'library',
  },
  {
    id: 'pillar-qc',
    title: 'Panel IoT QC & Telemetri',
    description:
      'Lacak nomor seri dengan pemisahan jujur antara sensor ESP32 fisik dan simulasi admin.',
    tags: ['15-Point QC', 'NIST Wipe', 'Serial Lookup'],
    badgeVariant: 'live',
    badgeLabel: 'Live ESP32',
    previewSrc: '/images/hero/thermal-paste.jpg',
    previewAlt: 'Pratinjau inspeksi QC dan pendinginan presisi',
    actionLabel: 'Lacak QC Serial',
    targetModule: 'qc',
  },
  {
    id: 'pillar-market',
    title: 'Etalase Market & Preset',
    description:
      'PC rakitan siap pakai dan laptop terkurasi untuk kreator, gaming, kantor, dan lab sekolah.',
    tags: ['Ready Stock', 'IoT Verified', 'JIT Buffer'],
    badgeVariant: 'sample',
    badgeLabel: 'Sample Preview',
    previewSrc: '/images/hero/code-screen.jpg',
    previewAlt: 'Pratinjau konfigurasi sistem dan preset rakitan',
    actionLabel: 'Lihat Market',
    targetHref: '/market',
  },
  {
    id: 'pillar-partners',
    title: 'Service Center & Mitra Lokal',
    description:
      'Temukan teknisi perbaikan laptop/PC dan toko komponen resmi di berbagai kota.',
    tags: ['Mitra Lokal', 'Servis Lab', 'Konsultasi DM'],
    badgeVariant: 'sample',
    badgeLabel: 'Sample Mitra',
    previewSrc: '/images/hero/repair-tech.jpg',
    previewAlt: 'Pratinjau layanan teknisi dan pusat servis mitra',
    actionLabel: 'Direktori Mitra',
    targetHref: '/partners',
  },
];
