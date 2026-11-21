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
  headline:
    'Kami menghadirkan transparansi perangkat keras presisi untuk builder, gamer, sekolah, dan armada bisnis.',
  ctaLabel: 'Mulai Rakit di Workspace',
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
    title: 'Protokol QC 15 Titik & Telemetri Burn-In',
    summary: 'Suhu CPU/GPU, stabilitas voltase, dan sertifikat serial tercatat langsung dari bench uji.',
    iconKey: 'shield',
    targetModule: 'qc',
  },
  {
    id: 'callout-nist',
    position: 'bottom-left',
    badgeVariant: 'simulated',
    badgeLabel: 'Simulated QC',
    title: 'Sanitasi Data Standar NIST 800-88',
    summary: 'Penghapusan data permanen untuk unit enterprise B2B, sekolah B2S, dan unit Trade-In.',
    iconKey: 'lock',
    targetModule: 'qc',
  },
  {
    id: 'callout-jit',
    position: 'top-right',
    badgeVariant: 'sample',
    badgeLabel: 'Sample',
    title: 'Buffer Pengadaan JIT 5% (B2S & B2B)',
    summary: 'Kalkulasi stok cadangan dan daya listrik otomatis agar pengadaan lab tetap bebas kendala.',
    iconKey: 'sliders',
    targetModule: 'builder',
  },
  {
    id: 'callout-tradein',
    position: 'bottom-right',
    badgeVariant: 'sample',
    badgeLabel: 'Sample',
    title: 'Valuasi Trade-In & Refurbished Grade A+',
    summary: 'Ubah perangkat lama menjadi kredit upgrade ke laptop bisnis atau komponen tersertifikasi.',
    iconKey: 'refresh',
    targetModule: 'tradein',
  },
];

export const WORKFLOW_STEP_CARDS: NonEmptyReadonlyArray<WorkflowStepCard> = [
  {
    id: 'step-riset',
    phaseLabel: 'Tahap Riset',
    title: 'Analisis Spek & Potensi Upgrade',
    summary:
      'Bandingkan ponsel, laptop, desktop, dan aksesori secara berdampingan sekaligus cek jumlah slot RAM dan NVMe maksimum.',
    deliverables: ['Komparasi hingga 4 perangkat', 'Cek kapasitas ekspansi slot'],
    imageSrc: '/images/hero/pc-rig.jpg',
    imageAlt: 'Workstation desktop custom ViciTech siap analisis upgrade',
    actionLabel: 'Buka Hardware Library',
    targetModule: 'library',
    targetView: 'upgrade',
  },
  {
    id: 'step-konfigurasi',
    phaseLabel: 'Tahap Konfigurasi',
    title: 'Rakit Preset & Simulasi Bottleneck',
    summary:
      'Susun paket PC B2C, workstation kantor B2B, atau pengadaan lab CBT sekolah B2S dengan hitung TDP PSU dan bottleneck CPU/GPU.',
    deliverables: ['Estimasi beban daya & FPS', 'Buffer pengadaan JIT 5%'],
    imageSrc: '/images/hero/code-screen.jpg',
    imageAlt: 'Layar analitik kompatibilitas dan konfigurasi sistem hardware',
    actionLabel: 'Susun di Preset Builder',
    targetModule: 'builder',
  },
  {
    id: 'step-verifikasi',
    phaseLabel: 'Tahap Verifikasi QC',
    title: 'Uji Burn-In & Sertifikasi Telemetri',
    summary:
      'Setiap perangkat yang dirakit atau direkondisi melewati 15 titik pengecekan dan terikat kode serial VICI-XXX untuk verifikasi publik.',
    deliverables: ['Log telemetri suhu & voltase', 'Sertifikat digital anti-zonk'],
    imageSrc: '/images/hero/thermal-paste.jpg',
    imageAlt: 'Aplikasi thermal paste presisi dan inspeksi QC hardware',
    actionLabel: 'Cek Serial IoT QC',
    targetModule: 'qc',
  },
  {
    id: 'step-sirkular',
    phaseLabel: 'Tahap Ekosistem',
    title: 'Trade-In Sirkular & Mitra Servis',
    summary:
      'Tukar tambah aset lama secara satuan maupun massal dan temukan pusat servis atau toko komponen terpercaya di jaringan mitra.',
    deliverables: ['Estimasi valuasi tukar tambah', 'Terhubung ke DM & teknisi mitra'],
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
      'Katalog terpadu untuk membandingkan smartphone, laptop bisnis, GPU/CPU desktop, dan memeriksa batas upgrade RAM/NVMe.',
    tags: ['4 Kategori Utama', 'Kalkulator Ekspansi', 'Perbandingan Spek'],
    badgeVariant: 'sample',
    badgeLabel: 'Sample Catalog',
    previewSrc: '/images/hero/pc-rig.jpg',
    previewAlt: 'Pratinjau katalog PC dan komponen ViciTech',
    actionLabel: 'Buka Library',
    targetModule: 'library',
  },
  {
    id: 'pillar-qc',
    title: 'IoT Smart Bench & QC Engine',
    description:
      'Pelacakan nomor serial dengan pemisahan tegas antara sensor ESP32 fisik (Live) dan profil uji simulasi admin.',
    tags: ['15-Point Protocol', 'NIST 800-88 Wipe', 'QR Verification'],
    badgeVariant: 'live',
    badgeLabel: 'Live ESP32',
    previewSrc: '/images/hero/thermal-paste.jpg',
    previewAlt: 'Pratinjau inspeksi QC dan pendinginan presisi',
    actionLabel: 'Lacak QC Serial',
    targetModule: 'qc',
  },
  {
    id: 'pillar-market',
    title: 'Curated Market & Presets',
    description:
      'Etalase rakitan siap pakai untuk gaming, kreator, kantor, dan lab sekolah dengan validasi kompatibilitas menyeluruh.',
    tags: ['Preset B2C / B2B / B2S', 'JIT 5% Buffer', 'Creator Verdict'],
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
      'Jaringan teknisi perbaikan laptop/PC dan mitra komponen terverifikasi untuk konsultasi langsung serta inspeksi Trade-In.',
    tags: ['Hub Bandung & Jaksel', 'Support Lab B2S', 'Konsultasi DM'],
    badgeVariant: 'sample',
    badgeLabel: 'Sample Mitra',
    previewSrc: '/images/hero/repair-tech.jpg',
    previewAlt: 'Pratinjau layanan teknisi dan pusat servis mitra',
    actionLabel: 'Direktori Mitra',
    targetHref: '/partners',
  },
];
