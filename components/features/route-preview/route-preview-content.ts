export type RoutePreviewKind = 'market' | 'partners';

export interface PreviewFilterOption {
  readonly id: string;
  readonly label: string;
}

export interface RoutePreviewItem {
  readonly id: string;
  readonly categoryId: string;
  readonly categoryLabel: string;
  readonly title: string;
  readonly subtitle: string;
  readonly specPrimary: string;
  readonly specSecondary: string;
  readonly metricLabel: string;
  readonly metricValue: string;
  readonly actionLabel: string;
  readonly actionHref: string;
  readonly isFeatured?: boolean;
}

export const MARKET_FILTERS: readonly [PreviewFilterOption, ...PreviewFilterOption[]] = [
  { id: 'all', label: 'Semua Kategori' },
  { id: 'pc-build', label: 'Rakitan PC' },
  { id: 'laptop', label: 'Laptop QC' },
  { id: 'smartphone', label: 'Smartphone' },
  { id: 'camera-production', label: 'Kamera & Produksi' },
  { id: 'component', label: 'Komponen' },
];

export const MARKET_PREVIEW_ITEMS: readonly [RoutePreviewItem, ...RoutePreviewItem[]] = [
  {
    id: 'mk-creator-1440',
    categoryId: 'pc-build',
    categoryLabel: 'Rakitan PC Kurasi',
    title: 'Preset Workstation Creator 1440p',
    subtitle:
      'Konfigurasi siap rakit dengan verifikasi daya PSU, simulasi bottleneck CPU/GPU, dan inspeksi QC burn-in sebelum kirim.',
    specPrimary: 'Estimasi TDP 420 W',
    specSecondary: 'Lolos 15-Point Stress Test',
    metricLabel: 'Referensi Paket',
    metricValue: 'Rp 14.950.000',
    actionLabel: 'Ubah di Preset Builder',
    actionHref: '/builder',
    isFeatured: true,
  },
  {
    id: 'mk-cbt-school',
    categoryId: 'pc-build',
    categoryLabel: 'B2S Lab Sekolah',
    title: 'Paket Pengadaan Labkom CBT Hemat Daya',
    subtitle:
      'Dirancang untuk sekolah dan lab ujian dengan buffer stok JIT 5%, pelacakan serial QC, dan garansi unit terintegrasi.',
    specPrimary: 'Skalabilitas 10–100 Unit',
    specSecondary: 'Data Wipe NIST 800-88',
    metricLabel: 'Referensi Per Unit',
    metricValue: 'Rp 5.650.000',
    actionLabel: 'Susun Kebutuhan Lab',
    actionHref: '/builder',
  },
  {
    id: 'mk-esports-1080p',
    categoryId: 'pc-build',
    categoryLabel: 'Preset Gaming 1080p',
    title: 'Preset Esports 1080p 180Hz Ready',
    subtitle:
      'Rakitan gaming hemat daya dengan kurva kipas senyap, uji frame-time stabil, dan opsi tukar tambah GPU lama.',
    specPrimary: '140+ FPS Esports 1080p',
    specSecondary: 'Reviewed by Verified Builder',
    metricLabel: 'Referensi Paket',
    metricValue: 'Rp 11.400.000',
    actionLabel: 'Buka di Preset Builder',
    actionHref: '/builder',
  },
  {
    id: 'mk-thinkpad-t14',
    categoryId: 'laptop',
    categoryLabel: 'Laptop Refurbished QC',
    title: 'ThinkPad T14 Business Refurbished',
    subtitle:
      'Unit enterprise tersortir dengan laporan kesehatan baterai, suhu termal aktual, dan potensi upgrade RAM/NVMe.',
    specPrimary: 'Up to 48 GB RAM',
    specSecondary: 'Thermal Repasted Grade A',
    metricLabel: 'Referensi Harga',
    metricValue: 'Rp 6.800.000',
    actionLabel: 'Cek Potensi Upgrade',
    actionHref: '/market?view=upgrade',
  },
  {
    id: 'mk-mobile-qc',
    categoryId: 'smartphone',
    categoryLabel: 'Smartphone Tersertifikasi',
    title: 'Perangkat Mobile Uji Baterai & Layar',
    subtitle:
      'Ponsel bekas terkurasi dengan pengecekan siklus baterai, fungsi kamera, pengisian daya cepat, dan penghapusan data aman.',
    specPrimary: 'Cek Siklus Baterai',
    specSecondary: 'Zero Dead Pixel Check',
    metricLabel: 'Valuasi Trade-In',
    metricValue: 'Mulai Rp 3.200.000',
    actionLabel: 'Hitung Trade-In',
    actionHref: '/trade-in',
  },
  {
    id: 'mk-gpu-rtx4060',
    categoryId: 'component',
    categoryLabel: 'Komponen Satuan',
    title: 'Komponen GPU, RAM & NVMe Teruji',
    subtitle:
      'Bandingkan spesifikasi teknis, TDP, skor performa, dan kesesuaian slot motherboard sebelum membeli atau melakukan upgrade.',
    specPrimary: 'Bandingkan 4 Unit Sekaligus',
    specSecondary: 'Skor Bottleneck & FPS',
    metricLabel: 'Rentang Katalog',
    metricValue: '12+ Kategori Part',
    actionLabel: 'Buka Hardware Library',
    actionHref: '/market?view=catalog',
  },
  {
    id: 'mk-camera-production',
    categoryId: 'camera-production',
    categoryLabel: 'Kamera & Produksi (Sample)',
    title: 'Kamera, Lensa, Rig/Cage, Tripod Fluid Head & Field Monitor',
    subtitle:
      'Katalog produksi video & foto terkurasi mencakup bodi kamera, lensa, gimbal, lighting, camera cage 15mm, tripod fluid head, dan field monitor high-bright.',
    specPrimary: 'Ulir 1/4"-20 · 3/8"-16 ARRI · 2200 nits',
    specSecondary: 'Sample · Simulated QC Checkpoints',
    metricLabel: 'Rentang Gear',
    metricValue: '7 Sub-Kategori Produksi',
    actionLabel: 'Lihat Kamera & Produksi',
    actionHref: '/market?category=camera-production',
  },
];

export const PARTNER_FILTERS: readonly [PreviewFilterOption, ...PreviewFilterOption[]] = [
  { id: 'all', label: 'Semua Kota' },
  { id: 'bandung', label: 'Bandung' },
  { id: 'jakarta', label: 'Jakarta' },
  { id: 'tasikmalaya', label: 'Tasikmalaya' },
  { id: 'surabaya', label: 'Surabaya' },
  { id: 'yogyakarta', label: 'Yogyakarta' },
];

export const PARTNER_PREVIEW_ITEMS: readonly [RoutePreviewItem, ...RoutePreviewItem[]] = [
  {
    id: 'pt-bandung-hub',
    categoryId: 'bandung',
    categoryLabel: 'QC Hub & Service Center',
    title: 'ViciTech Hub Bandung',
    subtitle:
      'Pusat pengujian IoT Smart Bench ESP32, repaste termal presisi, perakitan PC kurasi, dan titik inspeksi fisik program Trade-In.',
    specPrimary: 'Burn-In Telemetry 4 Jam',
    specSecondary: 'Penjemputan Fleet B2B/B2S',
    metricLabel: 'Estimasi Antrean',
    metricValue: '1–2 Hari Kerja',
    actionLabel: 'Cek Serial QC',
    actionHref: '/qc-panel',
    isFeatured: true,
  },
  {
    id: 'pt-jaksel-lab',
    categoryId: 'jakarta',
    categoryLabel: 'Service Center & Motherboard Repair',
    title: 'Mitra Diagnostik Jakarta Selatan',
    subtitle:
      'Spesialis diagnosa motherboard laptop, penggantian konektor daya, uji stabilitas GPU, dan konsultasi upgrade RAM/NVMe.',
    specPrimary: 'Diagnosa Level Komponen',
    specSecondary: 'Data Sanitization Tersedia',
    metricLabel: 'Cakupan Layanan',
    metricValue: 'PC, Laptop, Mobile',
    actionLabel: 'Konsultasi via DM',
    actionHref: '/messages',
  },
  {
    id: 'pt-tasikmalaya-b2s',
    categoryId: 'tasikmalaya',
    categoryLabel: 'Mitra Pendidikan & Lab CBT',
    title: 'Mitra Regional Tasikmalaya & Priangan',
    subtitle:
      'Dukungan perakitan massal lab sekolah (B2S), pengecekan kelayakan perangkat ujian CBT, serta layanan tukar tambah unit lama.',
    specPrimary: 'Support Lab Sekolah (B2S)',
    specSecondary: 'Inspeksi Unit On-Site',
    metricLabel: 'Fokus Layanan',
    metricValue: 'B2S & Trade-In Lokal',
    actionLabel: 'Buka Portal Trade-In',
    actionHref: '/trade-in',
  },
  {
    id: 'pt-surabaya-parts',
    categoryId: 'surabaya',
    categoryLabel: 'Toko Komponen Terkurasi',
    title: 'Mitra Komponen Hardware Surabaya',
    subtitle:
      'Penyediaan komponen PC desktop, PSU tersertifikasi efisiensi, dan modul pendingin dengan pencocokan katalog ViciTech Library.',
    specPrimary: 'Komponen PC & Pendingin',
    specSecondary: 'Sinkronisasi Spec Library',
    metricLabel: 'Status Direktori',
    metricValue: 'Integrasi Peta Fase 4',
    actionLabel: 'Jelajahi Katalog',
    actionHref: '/market?view=catalog',
  },
  {
    id: 'pt-yogyakarta-hub',
    categoryId: 'yogyakarta',
    categoryLabel: 'Toko Komponen & Upgrade Lab',
    title: 'Mitra Komponen & Servis Yogyakarta',
    subtitle:
      'Pusat upgrade RAM/NVMe laptop kampus, perakitan workstation riset, dan titik verifikasi fisik Trade-In DIY & Jawa Tengah.',
    specPrimary: 'Upgrade RAM/NVMe Kilat',
    specSecondary: 'Verifikasi Trade-In On-Site',
    metricLabel: 'Cakupan Layanan',
    metricValue: 'DIY & Jawa Tengah',
    actionLabel: 'Jelajahi Katalog',
    actionHref: '/market?view=catalog',
  },
];
