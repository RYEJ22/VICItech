export type ManualDeviceType = 'laptop' | 'desktop';

export type ManualRamType =
  | 'unknown'
  | 'ddr4_slot'
  | 'ddr5_slot'
  | 'lpddr_soldered'
  | 'ddr3_slot';

export type ManualStorageType = 'hdd' | 'sata_ssd' | 'nvme';

export type ManualUseCase = 'office' | 'editing' | 'gaming' | 'school_lab';

export interface ManualUpgradeInput {
  readonly deviceType: ManualDeviceType;
  readonly modelName: string;
  readonly currentRamGb: number;
  readonly ramType: ManualRamType;
  readonly storageType: ManualStorageType;
  readonly currentStorageGb: number;
  readonly useCase: ManualUseCase;
}

export interface ManualUpgradeWarning {
  readonly tone: 'ok' | 'warn' | 'critical';
  readonly title: string;
  readonly detail: string;
}

export interface ManualUpgradeAnalysis {
  readonly deviceLabel: string;
  readonly score: number;
  readonly grade: readonly ['A' | 'B' | 'C' | 'D', string];
  readonly ramTargetGb: number;
  readonly ramMaxCeilingGb: number;
  readonly ramPathText: string;
  readonly storageTargetText: string;
  readonly platformNote: string;
  readonly warnings: readonly ManualUpgradeWarning[];
  readonly costRange: {
    readonly minIdr: number;
    readonly maxIdr: number;
    readonly breakdown: readonly string[];
  };
  readonly perfBoostPct: number;
  readonly perfGainHeadline: string;
  readonly perfGainDetail: string;
  readonly aiPrompt: string;
}

export const MANUAL_RAM_TYPE_LABELS: Readonly<Record<ManualRamType, string>> = {
  unknown: 'Belum tahu (estimasi aman)',
  ddr4_slot: 'DDR4 (Ada Slot Upgrade)',
  ddr5_slot: 'DDR5 (Ada Slot Upgrade)',
  lpddr_soldered: 'LPDDR4x / LPDDR5 (Tersolder)',
  ddr3_slot: 'DDR3 / DDR3L (Generasi Lama)',
};

export const MANUAL_STORAGE_TYPE_LABELS: Readonly<Record<ManualStorageType, string>> = {
  hdd: 'HDD Mekanis (2.5" / 3.5")',
  sata_ssd: 'SATA SSD (2.5" / M.2 SATA)',
  nvme: 'NVMe M.2 SSD',
};

export const MANUAL_USE_CASE_LABELS: Readonly<Record<ManualUseCase, string>> = {
  office: 'Kuliah / Office',
  editing: 'Editing Foto & Video',
  gaming: 'Gaming & Esports',
  school_lab: 'Lab Sekolah / CBT',
};

function formatCapacity(gb: number): string {
  return gb >= 1000 ? `${(gb / 1000).toFixed(gb % 1000 ? 1 : 0)} TB` : `${gb} GB`;
}

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Menghitung jalur upgrade maksimal, peringatan bottleneck, dan estimasi biaya
 * secara deterministik untuk perangkat di luar daftar preset.
 */
export function analyzeManualUpgrade(input: ManualUpgradeInput): ManualUpgradeAnalysis {
  const cleanModel = input.modelName.trim();
  const deviceLabel =
    cleanModel || (input.deviceType === 'laptop' ? 'Laptop Kustom Anda' : 'PC Desktop Kustom Anda');
  const currentRam = Math.max(4, Math.min(128, Math.round(Number(input.currentRamGb) || 8)));
  const currentStorage = Math.max(120, Math.round(Number(input.currentStorageGb) || 256));

  const recommendedRamByUseCase: Record<ManualUseCase, number> = {
    office: 16,
    school_lab: 16,
    gaming: 32,
    editing: 32,
  };
  const idealRam = recommendedRamByUseCase[input.useCase];

  // Hitung plafon & target RAM
  let ramMaxCeilingGb = currentRam;
  let ramTargetGb = currentRam;
  let ramPathText = '';

  if (input.ramType === 'lpddr_soldered') {
    ramMaxCeilingGb = currentRam;
    ramTargetGb = currentRam;
    ramPathText = `Terkunci di ${currentRam} GB (LPDDR tersolder permanen di motherboard)`;
  } else if (input.ramType === 'ddr3_slot') {
    ramMaxCeilingGb = 16;
    ramTargetGb = Math.min(16, Math.max(currentRam, idealRam >= 16 ? 16 : 8));
    ramPathText =
      ramTargetGb > currentRam
        ? `Upgrade dari ${currentRam} GB ke ${ramTargetGb} GB DDR3L dual-channel (batas umum platform DDR3 adalah 16 GB)`
        : `Sudah mencapai batas optimal platform DDR3 (${currentRam} GB)`;
  } else if (input.ramType === 'ddr5_slot') {
    ramMaxCeilingGb = input.deviceType === 'desktop' ? 128 : 64;
    ramTargetGb = Math.min(ramMaxCeilingGb, Math.max(currentRam, idealRam));
    ramPathText =
      ramTargetGb > currentRam
        ? `Naik dari ${currentRam} GB ke ${ramTargetGb} GB (plafon hingga ${ramMaxCeilingGb} GB DDR5)`
        : `Sudah memadai di ${currentRam} GB, tersedia ruang ekspansi hingga ${ramMaxCeilingGb} GB DDR5`;
  } else if (input.ramType === 'ddr4_slot') {
    ramMaxCeilingGb = input.deviceType === 'desktop' ? 64 : 40;
    ramTargetGb = Math.min(ramMaxCeilingGb, Math.max(currentRam, idealRam));
    ramPathText =
      ramTargetGb > currentRam
        ? `Naik dari ${currentRam} GB ke ${ramTargetGb} GB DDR4 dual-channel (plafon umum ${ramMaxCeilingGb} GB)`
        : `Sudah memadai di ${currentRam} GB, masih bisa diekspansi hingga ${ramMaxCeilingGb} GB DDR4`;
  } else {
    // 'unknown'
    ramMaxCeilingGb = input.deviceType === 'desktop' ? 64 : 32;
    ramTargetGb = Math.min(ramMaxCeilingGb, Math.max(currentRam, idealRam));
    ramPathText =
      ramTargetGb > currentRam
        ? `Disarankan naik dari ${currentRam} GB ke ${ramTargetGb} GB (perlu cek tipe & slot kosong via Task Manager/BIOS)`
        : `Kapasitas ${currentRam} GB saat ini sudah memadai; maksimal umum hingga ${ramMaxCeilingGb} GB jika tidak tersolder`;
  }

  // Hitung target upgrade penyimpanan
  let storageUpgradeMin = 0;
  let storageUpgradeMax = 0;
  let storageTargetText = '';
  const needsLargerDriveForUseCase =
    (input.useCase === 'editing' || input.useCase === 'gaming') && currentStorage < 1000;

  if (input.storageType === 'hdd') {
    const targetCap = needsLargerDriveForUseCase ? '1 TB SSD' : '512 GB – 1 TB SSD';
    storageTargetText = `Ganti atau tambah ${targetCap} (${input.deviceType === 'desktop' ? 'NVMe M.2 / SATA SSD' : 'NVMe M.2 atau SATA SSD 2.5"'}) untuk OS & aplikasi`;
    storageUpgradeMin = needsLargerDriveForUseCase ? 1100000 : 620000;
    storageUpgradeMax = needsLargerDriveForUseCase ? 1650000 : 1250000;
  } else if (currentStorage < 512) {
    const targetCap = needsLargerDriveForUseCase ? '1 TB NVMe SSD' : '512 GB – 1 TB NVMe / SATA SSD';
    storageTargetText = `Ekspansi dari ${formatCapacity(currentStorage)} ke ${targetCap} agar tidak kehabisan ruang kerja & cache`;
    storageUpgradeMin = 680000;
    storageUpgradeMax = 1450000;
  } else if (needsLargerDriveForUseCase) {
    storageTargetText = `Tambah atau ganti ke 1 TB – 2 TB NVMe Gen4 SSD untuk aset proyek ${MANUAL_USE_CASE_LABELS[input.useCase]}`;
    storageUpgradeMin = 1250000;
    storageUpgradeMax = 2500000;
  } else {
    storageTargetText = `${MANUAL_STORAGE_TYPE_LABELS[input.storageType]} ${formatCapacity(currentStorage)} sudah mencukupi untuk ${MANUAL_USE_CASE_LABELS[input.useCase]}`;
  }

  // Hitung estimasi biaya RAM
  const addedRamGb = Math.max(0, ramTargetGb - currentRam);
  let ramMin = 0;
  let ramMax = 0;
  if (addedRamGb > 0) {
    const perGbLow =
      input.ramType === 'ddr5_slot'
        ? 48000
        : input.ramType === 'ddr3_slot'
          ? 24000
          : 35000;
    const perGbHigh =
      input.ramType === 'ddr5_slot'
        ? 62000
        : input.ramType === 'ddr3_slot'
          ? 34000
          : 52000;
    ramMin = Math.round((addedRamGb * perGbLow) / 10000) * 10000;
    ramMax = Math.round((addedRamGb * perGbHigh) / 10000) * 10000;
    if (input.ramType === 'unknown') {
      ramMax += 150000;
    }
  }

  const serviceMin = ramMin + storageUpgradeMin > 0 ? 100000 : 0;
  const serviceMax = ramMin + storageUpgradeMin > 0 ? 250000 : 0;
  const totalMin = ramMin + storageUpgradeMin + serviceMin;
  const totalMax = ramMax + storageUpgradeMax + serviceMax;

  const breakdown: string[] = [];
  if (addedRamGb > 0) {
    breakdown.push(`Penambahan/penggantian RAM +${addedRamGb} GB: ${formatRupiah(ramMin)} – ${formatRupiah(ramMax)}`);
  }
  if (storageUpgradeMin > 0) {
    breakdown.push(`Upgrade/penambahan SSD: ${formatRupiah(storageUpgradeMin)} – ${formatRupiah(storageUpgradeMax)}`);
  }
  if (serviceMin > 0) {
    breakdown.push(`Estimasi jasa pemasangan, kloning OS & repaste opsional: ${formatRupiah(serviceMin)} – ${formatRupiah(serviceMax)}`);
  }
  if (breakdown.length === 0) {
    breakdown.push('Konfigurasi RAM & penyimpanan Anda saat ini sudah memadai untuk kebutuhan utama.');
  }

  // Peringatan bottleneck
  const warnings: ManualUpgradeWarning[] = [];

  if (input.storageType === 'hdd') {
    warnings.push({
      tone: 'critical',
      title: 'Bottleneck I/O Parah pada HDD Mekanis',
      detail: 'Sistem operasi modern di HDD sering mengalami disk usage 100%, booting lambat 1–2 menit, dan stuttering. Migrasi OS ke SSD wajib menjadi prioritas pertama.',
    });
  }

  if (currentRam < idealRam) {
    if (input.ramType === 'lpddr_soldered') {
      warnings.push({
        tone: 'critical',
        title: `RAM ${currentRam} GB Terkunci Permanen untuk ${MANUAL_USE_CASE_LABELS[input.useCase]}`,
        detail: `Untuk beban ${MANUAL_USE_CASE_LABELS[input.useCase]} disarankan minimal ${idealRam} GB, tetapi RAM LPDDR tersolder tidak dapat ditambah. Pertimbangkan opsi Trade-In unit jika aplikasi sering force-close.`,
      });
    } else {
      warnings.push({
        tone: 'warn',
        title: `RAM ${currentRam} GB di Bawah Rekomendasi (${idealRam} GB)`,
        detail: `Membuka banyak tab browser, render timeline, atau aplikasi ${MANUAL_USE_CASE_LABELS[input.useCase]} akan cepat memicu swap ke disk sehingga terasa patah-patah.`,
      });
    }
  }

  if (input.ramType === 'unknown') {
    warnings.push({
      tone: 'warn',
      title: 'Verifikasi Tipe & Slot RAM Kosong Sebelum Membeli',
      detail: 'Buka Task Manager → tab Performance → Memory di Windows untuk melihat Speed, Form Factor (SODIMM/DIMM), dan Slots used agar modul baru kompatibel.',
    });
  }

  if (input.ramType === 'ddr3_slot') {
    warnings.push({
      tone: 'warn',
      title: 'Platform Generasi Lawas (DDR3)',
      detail: 'Upgrade ke SSD + RAM 8–16 GB masih terasa sangat membantu untuk Office/Lab CBT, namun tidak disarankan berinvestasi terlalu besar jika dipakai editing berat atau gaming modern.',
    });
  }

  if (input.deviceType === 'laptop' && storageUpgradeMin > 0 && input.storageType !== 'hdd') {
    warnings.push({
      tone: 'ok',
      title: 'Cek Jumlah Slot M.2 Laptop',
      detail: 'Sebagian laptop tipis hanya memiliki 1 slot M.2 NVMe. Jika hanya 1 slot, upgrade dilakukan dengan mengganti SSD lama dan mengkloning data via enclosure NVMe USB-C.',
    });
  }

  if (input.deviceType === 'desktop') {
    warnings.push({
      tone: 'ok',
      title: 'Ruang Upgrade GPU & Pendinginan Desktop',
      detail: 'PC Desktop umumnya mengizinkan penambahan kartu grafis (GPU) PCIe x16 dan PSU lebih besar apabila dibutuhkan untuk Gaming atau Editing berat.',
    });
  }

  // Hitung skor potensi upgrade (0-100)
  const ramScore =
    input.ramType === 'lpddr_soldered'
      ? 0
      : input.ramType === 'ddr3_slot'
        ? 18
        : input.deviceType === 'desktop'
          ? 34
          : 28;
  const storageScore = input.storageType === 'hdd' ? 36 : input.deviceType === 'desktop' ? 34 : 26;
  const computeScore = input.deviceType === 'desktop' ? 24 : input.ramType === 'ddr3_slot' ? 4 : 10;
  const score = Math.min(96, Math.max(18, ramScore + storageScore + computeScore));
  const grade: readonly ['A' | 'B' | 'C' | 'D', string] =
    score >= 75
      ? ['A', 'Potensi ekspansi sangat luas']
      : score >= 55
        ? ['B', 'Ruang upgrade RAM & SSD memadai']
        : score >= 35
          ? ['C', 'Ruang upgrade terbatas']
          : ['D', 'Sebagian besar komponen terkunci'];

  // Indikator kenaikan performa
  let perfBoostPct = 15;
  if (input.storageType === 'hdd') perfBoostPct += 55;
  else if (storageUpgradeMin > 0) perfBoostPct += 20;
  if (addedRamGb >= 16) perfBoostPct += 35;
  else if (addedRamGb >= 8) perfBoostPct += 25;
  perfBoostPct = Math.min(95, perfBoostPct);

  const perfGainHeadline =
    totalMin === 0
      ? 'Konfigurasi sudah optimal'
      : input.storageType === 'hdd'
        ? `Hingga +${perfBoostPct}% responsivitas sistem & booting 4× lebih cepat`
        : `Estimasi +${perfBoostPct}% kelancaran multitasking & loading proyek`;

  const perfGainDetail =
    totalMin === 0
      ? 'Tidak ada bottleneck memori atau penyimpanan kritis pada profil penggunaan ini.'
      : `Kombinasi target ${ramTargetGb} GB RAM & ${input.storageType === 'hdd' ? 'migrasi OS ke SSD' : 'ekspansi SSD'} mengurangi freeze dan bottleneck I/O saat ${MANUAL_USE_CASE_LABELS[input.useCase]}.`;

  const platformNote =
    input.deviceType === 'desktop'
      ? 'Desktop PC: bebas ganti/tambah PSU, GPU diskrit PCIe x16, hingga 2–4 drive SATA/NVMe (tergantung motherboard & ukuran casing).'
      : 'Laptop: CPU dan GPU umumnya tersolder ke motherboard; fokus peningkatan paling efektif ada pada RAM dan SSD NVMe/SATA.';

  const aiPrompt = [
    `Halo ViciTech AI, tolong bantu analisis detail opsi upgrade dan ketersediaan stok part untuk perangkat saya:`,
    `- Jenis perangkat: ${input.deviceType === 'laptop' ? 'Laptop' : 'PC Desktop'}`,
    `- Merek & model: ${deviceLabel}`,
    `- RAM saat ini: ${currentRam} GB (${MANUAL_RAM_TYPE_LABELS[input.ramType]})`,
    `- Penyimpanan saat ini: ${formatCapacity(currentStorage)} (${MANUAL_STORAGE_TYPE_LABELS[input.storageType]})`,
    `- Kebutuhan utama: ${MANUAL_USE_CASE_LABELS[input.useCase]}`,
    `Apakah slot RAM & SSD pada seri ini mendukung target upgrade ${ramTargetGb} GB RAM, komponen apa yang paling pas di katalog ViciTech, serta estimasi biaya pasangnya?`,
  ].join('\n');

  return {
    deviceLabel,
    score,
    grade,
    ramTargetGb,
    ramMaxCeilingGb,
    ramPathText,
    storageTargetText,
    platformNote,
    warnings,
    costRange: {
      minIdr: totalMin,
      maxIdr: totalMax,
      breakdown,
    },
    perfBoostPct,
    perfGainHeadline,
    perfGainDetail,
    aiPrompt,
  };
}
