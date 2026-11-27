import type { ProductRow } from '@/lib/admin/products-validation';
import type { UserLanguage } from '@/lib/user-settings';

// ── Types & Sub-Categories ──

export const CAMERA_PRODUCTION_CATEGORY_ID = 'camera-production' as const;

export const CAMERA_PRODUCTION_SUBTYPES = [
  'camera',
  'lens',
  'gimbal',
  'lighting',
  'camera-rig',
  'tripod-fluid-head',
  'field-monitor',
] as const;

export type CameraProductionSubtype = (typeof CAMERA_PRODUCTION_SUBTYPES)[number];

export interface CameraProductionQcCheckpoint {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly status: 'pass' | 'simulated';
}

export interface CameraProductionSubtypeMeta {
  readonly id: CameraProductionSubtype;
  readonly labelId: string;
  readonly labelEn: string;
  readonly shortId: string;
  readonly shortEn: string;
}

export const CAMERA_PRODUCTION_SUBTYPE_META: Readonly<
  Record<CameraProductionSubtype, CameraProductionSubtypeMeta>
> = {
  camera: {
    id: 'camera',
    labelId: 'Kamera',
    labelEn: 'Camera',
    shortId: 'Kamera',
    shortEn: 'Camera',
  },
  lens: {
    id: 'lens',
    labelId: 'Lensa',
    labelEn: 'Lens',
    shortId: 'Lensa',
    shortEn: 'Lens',
  },
  gimbal: {
    id: 'gimbal',
    labelId: 'Gimbal',
    labelEn: 'Gimbal',
    shortId: 'Gimbal',
    shortEn: 'Gimbal',
  },
  lighting: {
    id: 'lighting',
    labelId: 'Lighting',
    labelEn: 'Lighting',
    shortId: 'Lighting',
    shortEn: 'Lighting',
  },
  'camera-rig': {
    id: 'camera-rig',
    labelId: 'Rig & Cage Kamera',
    labelEn: 'Camera Rig / Cage',
    shortId: 'Rig & Cage',
    shortEn: 'Rig & Cage',
  },
  'tripod-fluid-head': {
    id: 'tripod-fluid-head',
    labelId: 'Tripod & Fluid Head',
    labelEn: 'Tripod / Fluid Head',
    shortId: 'Tripod & Head',
    shortEn: 'Tripod & Head',
  },
  'field-monitor': {
    id: 'field-monitor',
    labelId: 'Field Monitor',
    labelEn: 'Field Monitor',
    shortId: 'Field Monitor',
    shortEn: 'Field Monitor',
  },
};

export function getCameraSubtypeLabel(
  subtype: CameraProductionSubtype,
  language: UserLanguage = 'id',
  short = false,
): string {
  const meta = CAMERA_PRODUCTION_SUBTYPE_META[subtype];
  if (language === 'en') {
    return short ? meta.shortEn : meta.labelEn;
  }
  return short ? meta.shortId : meta.labelId;
}

export function isCameraProductionSubtype(value: unknown): value is CameraProductionSubtype {
  return (
    typeof value === 'string' &&
    (CAMERA_PRODUCTION_SUBTYPES as readonly string[]).includes(value)
  );
}

// ── Metadata & Classification Helpers ──

function readJsonRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readStringField(record: Record<string, unknown>, key: string): string {
  const raw = record[key];
  if (typeof raw === 'string') return raw.trim();
  if (typeof raw === 'number' || typeof raw === 'boolean') return String(raw);
  return '';
}

export function isSampleCatalogProduct(
  product: Pick<ProductRow, 'id' | 'slug' | 'metadata' | 'specs'>,
): boolean {
  if (product.id.startsWith('sample-cam-') || product.slug.startsWith('sample-')) {
    return true;
  }
  const meta = readJsonRecord(product.metadata);
  const specs = readJsonRecord(product.specs);
  if (meta.is_sample === true || specs.is_sample === true) return true;
  const source = (
    readStringField(meta, 'data_source') || readStringField(specs, 'data_source')
  ).toLowerCase();
  return source === 'sample' || source === 'simulated';
}

export function resolveCameraProductionSubtype(
  product: Pick<ProductRow, 'title' | 'description' | 'metadata' | 'specs'>,
): CameraProductionSubtype | null {
  const meta = readJsonRecord(product.metadata);
  const specs = readJsonRecord(product.specs);

  const explicit = meta.gear_subtype ?? specs.gear_subtype;
  if (isCameraProductionSubtype(explicit)) {
    return explicit;
  }

  const haystack = `${product.title} ${product.description}`.toLowerCase();
  if (/\b(field monitor|on-camera monitor|shinobi|portkeys|feelworld|ninja v|smallhd)\b/.test(haystack)) {
    return 'field-monitor';
  }
  if (/\b(fluid head|tripod|video head|monopod|freeblazer|manfrotto|sachtler)\b/.test(haystack)) {
    return 'tripod-fluid-head';
  }
  if (/\b(camera cage|rig kit|camera rig|shoulder rig|15mm rod|black mamba|tilta cage|smallrig cage)\b/.test(haystack)) {
    return 'camera-rig';
  }
  if (/\b(gimbal|stabilizer|rs 4|rs 3|zhiyun|weebill)\b/.test(haystack)) {
    return 'gimbal';
  }
  if (/\b(cob light|studio light|led light|amaran|aputure|godox|nanlite|bi-color)\b/.test(haystack)) {
    return 'lighting';
  }
  if (/\b(lens|lensa|dg dn|gm ii|rf \d+mm|fe \d+mm|f\/1\.4|f\/2\.8)\b/.test(haystack)) {
    return 'lens';
  }
  if (/\b(cinema line|mirrorless|fx30|fx3|a7 iv|a7s iii|bmpcc|lumix s5|kamera)\b/.test(haystack)) {
    return 'camera';
  }

  return null;
}

export function isCameraProductionProduct(
  product: Pick<ProductRow, 'title' | 'description' | 'category' | 'metadata' | 'specs'>,
): boolean {
  const meta = readJsonRecord(product.metadata);
  const specs = readJsonRecord(product.specs);
  if (meta.gear_domain === CAMERA_PRODUCTION_CATEGORY_ID || specs.gear_domain === CAMERA_PRODUCTION_CATEGORY_ID) {
    return true;
  }
  if (product.category === 'accessory' || product.category === 'component') {
    return resolveCameraProductionSubtype(product) !== null;
  }
  return false;
}

// ── Tailored QC Checkpoints ──

export function getCameraProductionQcCheckpoints(
  product: Pick<ProductRow, 'title' | 'description' | 'metadata' | 'specs'>,
  language: UserLanguage = 'id',
): readonly CameraProductionQcCheckpoint[] {
  const subtype = resolveCameraProductionSubtype(product);
  if (!subtype) return [];

  const specs = readJsonRecord(product.specs);
  const meta = readJsonRecord(product.metadata);
  const read = (key: string, fallbackId: string, fallbackEn: string): string => {
    const val = readStringField(specs, key) || readStringField(meta, key);
    if (val) return val;
    return language === 'en' ? fallbackEn : fallbackId;
  };
  const isEn = language === 'en';
  const status: 'pass' | 'simulated' =
    readStringField(specs, 'qc_telemetry_source').toLowerCase() === 'esp32' ? 'pass' : 'simulated';

  switch (subtype) {
    case 'camera-rig':
      return [
        {
          id: 'rig-compat',
          label: isEn ? 'Compatible Body / System Fit' : 'Kesesuaian Bodi / Sistem',
          value: read('compatible_body', 'Terkalibrasi & Presisi', 'Calibrated Exact Fit'),
          status,
        },
        {
          id: 'rig-threads',
          label: isEn ? 'Thread Standards (1/4"-20 & 3/8"-16 ARRI)' : 'Standar Ulir (1/4"-20 & 3/8"-16 ARRI)',
          value: read('thread_standards', '1/4"-20 & 3/8"-16 ARRI · Bebas Aus', '1/4"-20 & 3/8"-16 ARRI · Clean Threads'),
          status,
        },
        {
          id: 'rig-rods',
          label: isEn ? '15mm Rod & Handle Integrity' : 'Integritas Rod 15mm & Handle',
          value: read('rod_handle_integrity', 'Kunci Dual 15mm Rapat · Zero Play', 'Dual 15mm Clamps Solid · Zero Play'),
          status,
        },
        {
          id: 'rig-alignment',
          label: isEn ? 'Structural Alignment Check' : 'Uji Keselarasan Struktural',
          value: read('structural_alignment', 'Toleransi <= 0.05 mm · Lurus Presisi', '<= 0.05 mm Tolerance · True Square'),
          status,
        },
      ];

    case 'tripod-fluid-head':
      return [
        {
          id: 'tripod-payload',
          label: isEn ? 'Max Payload Rating (kg)' : 'Beban Maksimal (kg)',
          value: read('max_payload_kg', '10.0 kg Static Load Lulus', '10.0 kg Static Load Verified'),
          status,
        },
        {
          id: 'tripod-height',
          label: isEn ? 'Max Working Height' : 'Tinggi Kerja Maksimal',
          value: read('max_height_cm', '197 cm · Stabil Tanpa Flex', '197 cm · Zero Leg Flex'),
          status,
        },
        {
          id: 'tripod-fluid',
          label: isEn ? 'Fluid Pan / Tilt Smoothness' : 'Kehalusan Fluid Pan / Tilt',
          value: read('fluid_pan_tilt', 'Damping 4-Step Halus · Bebas Stutter', '4-Step Smooth Drag · Zero Stutter'),
          status,
        },
        {
          id: 'tripod-locks',
          label: isEn ? 'Leg Locks & Quick-Release Plate' : 'Kunci Kaki & Quick-Release Plate',
          value: read('leg_lock_qr_condition', 'Flip-Lock Rapat · Plate 501PL Presisi', 'Tight Leg Locks · 501PL Plate Locked'),
          status,
        },
      ];

    case 'field-monitor':
      return [
        {
          id: 'mon-brightness',
          label: isEn ? 'Screen Size & Brightness (nits)' : 'Ukuran Layar & Kecerahan (nits)',
          value: read('screen_brightness', '7.0" · 2200 nits Daylight Terukur', '7.0" · 2200 nits Daylight Measured'),
          status,
        },
        {
          id: 'mon-ports',
          label: isEn ? 'HDMI / SDI Port & Loop-Through Test' : 'Tes Port HDMI / SDI & Loop-Through',
          value: read('hdmi_sdi_loop', '4K60 HDMI In/Out & Loop-Through Lulus', '4K60 HDMI In/Out & Loop-Through Pass'),
          status,
        },
        {
          id: 'mon-panel',
          label: isEn ? 'Dead-Pixel & Panel Uniformity Check' : 'Cek Dead-Pixel & Panel Layar',
          value: read('panel_pixel_check', '0 Dead Pixel · Rec.709 ΔE < 1.5', '0 Dead Pixels · Rec.709 ΔE < 1.5'),
          status,
        },
        {
          id: 'mon-power',
          label: isEn ? 'NP-F Battery Plate & DC Power Status' : 'Status Daya NP-F / DC Input',
          value: read('power_npf_dc', 'NP-F Latch Rapat & 12V DC Stabil', 'NP-F Plate Tight & 12V DC Stable'),
          status,
        },
      ];

    case 'camera':
      return [
        {
          id: 'cam-sensor',
          label: isEn ? 'Sensor & Mount Inspection' : 'Inspeksi Sensor & Mount',
          value: read('sensor_mount', 'Bersih Bebas Debu & Hot Pixel', 'Clean · Zero Dust or Hot Pixels'),
          status,
        },
        {
          id: 'cam-shutter',
          label: isEn ? 'Shutter / Thermal Burn-In Check' : 'Cek Shutter & Uji Termal 4K',
          value: read('thermal_recording', '4K60 60 mnt Stabil Tanpa Overheat', '4K60 60 min Stable · No Overheat'),
          status,
        },
        {
          id: 'cam-ports',
          label: isEn ? 'HDMI, Audio & Card Slot Check' : 'Port HDMI, Audio & Slot Kartu',
          value: read('connectivity', 'Full-Size HDMI & Dual Slot Lulus', 'Full-Size HDMI & Dual Slots Pass'),
          status,
        },
      ];

    case 'lens':
      return [
        {
          id: 'lens-optics',
          label: isEn ? 'Optics Clarity (Fog / Fungus / Dust)' : 'Kejernihan Optik (Bebas Jamur / Fog)',
          value: read('optics_check', 'Optik 100% Bersih · Coating Utuh', '100% Clean Glass · Intact Coating'),
          status,
        },
        {
          id: 'lens-af',
          label: isEn ? 'AF Motor & Aperture Ring Check' : 'Motor AF & Ring Diafragma',
          value: read('af_aperture', 'AF Responsif · Blade Kering Presisi', 'Snappy AF · Oil-Free Blades'),
          status,
        },
      ];

    case 'gimbal':
      return [
        {
          id: 'gimbal-axis',
          label: isEn ? '3-Axis Motor Balance & Calibration' : 'Kalibrasi & Torsi Motor 3-Axis',
          value: read('payload_axis', 'Payload 4.5 kg · Auto-Lock Halus', '4.5 kg Payload · Smooth Auto-Locks'),
          status,
        },
        {
          id: 'gimbal-battery',
          label: isEn ? 'Battery Grip & PD Charging Check' : 'Baterai Grip & Pengisian PD',
          value: read('battery_health', '98% Health · Fast Charge PD Lulus', '98% Health · PD Fast Charge Pass'),
          status,
        },
      ];

    case 'lighting':
      return [
        {
          id: 'light-cri',
          label: isEn ? 'Output & Color Accuracy (CRI/TLCI)' : 'Output Daya & Akurasi Warna (CRI/TLCI)',
          value: read('output_cri', '200 W · CRI 95+ / TLCI 98+', '200 W · CRI 95+ / TLCI 98+'),
          status,
        },
        {
          id: 'light-cooling',
          label: isEn ? 'Thermal Fan & Bowens Mount Lock' : 'Kipas Pendingin & Kunci Bowens Mount',
          value: read('cooling', 'Silent Fan <= 28 dBA · Bowens Rapat', 'Silent Fan <= 28 dBA · Bowens Solid'),
          status,
        },
      ];
  }
}

// ── Sample / Fallback Storefront Entries (Honestly Badged Sample / Simulated) ──

export const SAMPLE_CAMERA_PRODUCTION_PRODUCTS: readonly ProductRow[] = [
  {
    id: 'sample-cam-rig-smallrig-fx3',
    slug: 'sample-smallrig-black-mamba-camera-cage-15mm-rig',
    title: 'SmallRig Black Mamba Camera Cage & 15mm Rail Rig Kit',
    description:
      'Kit rig dan cage CNC aluminum untuk sistem mirrorless & cinema compact dengan standar ulir 1/4"-20, 3/8"-16 ARRI locating holes, rel 15mm dual-rod, dan top handle ergonomis. Entri katalog sampel dengan simulasi inspeksi QC struktural ViciTech.',
    price: 3450000,
    category: 'accessory',
    seller_type: 'vicitech',
    stock_status: 'ready',
    is_preset: false,
    preset_components: [],
    images: [],
    image_url: null,
    gallery_urls: [],
    specs: {
      gear_domain: CAMERA_PRODUCTION_CATEGORY_ID,
      gear_subtype: 'camera-rig',
      compatible_body: 'Sony FX3 / FX30 / A7 IV / A7S III',
      thread_standards: '1/4"-20 & 3/8"-16 ARRI Locating',
      rod_handle_integrity: 'Lulus · Dual 15mm Rail Lock & Top Handle Solid',
      structural_alignment: '0.05 mm Toleransi CNC · Bebas Twist',
      material: 'CNC Aluminum Alloy 6061-T6',
      weight: '410 g',
      qc_telemetry_source: 'simulated',
      qc_protocol: 'Simulasi QC Rig 4-Titik (Sample)',
      data_source: 'Sample',
    },
    metadata: {
      gear_domain: CAMERA_PRODUCTION_CATEGORY_ID,
      gear_subtype: 'camera-rig',
      is_sample: true,
      data_source: 'Sample',
      compatible_body: 'Sony FX3 / FX30 / A7 IV / A7S III',
      thread_standards: '1/4"-20 & 3/8"-16 ARRI Locating',
      rod_handle_integrity: 'Dual 15mm Carbon/Alu Rail Clamp · Zero Play',
      structural_alignment: '0.05 mm Toleransi · Baseplate Arca-Swiss Presisi',
    },
    reviewed_by_name: 'Tim Produksi & QC ViciTech (Sample)',
    reviewed_by_avatar: null,
    review_quote:
      'Semua ulir 1/4"-20 dan 3/8"-16 ARRI diperiksa dengan thread gauge serta uji torsi clamp rod 15mm tanpa celah.',
    review_video_url: null,
    created_at: '2026-11-26T10:00:00.000Z',
    updated_at: '2026-11-26T10:00:00.000Z',
  },
  {
    id: 'sample-cam-tripod-freeblazer-carbon',
    slug: 'sample-smallrig-freeblazer-carbon-tripod-fluid-head',
    title: 'SmallRig FreeBlazer Heavy-Duty Carbon Tripod & Fluid Head',
    description:
      'Tripod serat karbon one-step lock dengan fluid video head 75mm bowl untuk rig cinema hingga 10 kg. Entri katalog sampel dengan simulasi pengujian beban payload, kehalusan pan/tilt, dan kondisi quick-release plate.',
    price: 5850000,
    category: 'accessory',
    seller_type: 'vicitech',
    stock_status: 'ready',
    is_preset: false,
    preset_components: [],
    images: [],
    image_url: null,
    gallery_urls: [],
    specs: {
      gear_domain: CAMERA_PRODUCTION_CATEGORY_ID,
      gear_subtype: 'tripod-fluid-head',
      max_payload_kg: '10.0 kg',
      max_height_cm: '197 cm',
      fluid_pan_tilt: 'Lulus · Damping Pan 360° & Tilt +90°/-60° Halus',
      leg_lock_qr_condition: 'Lulus · FreeSpeed Flip-Lock & Plate 501PL Rapat',
      head_mount: '75 mm Half-Ball Bowl · Manfrotto 501PL / RS Quick-Release',
      weight: '3.8 kg',
      qc_telemetry_source: 'simulated',
      qc_protocol: 'Simulasi QC Tripod & Fluid Head (Sample)',
      data_source: 'Sample',
    },
    metadata: {
      gear_domain: CAMERA_PRODUCTION_CATEGORY_ID,
      gear_subtype: 'tripod-fluid-head',
      is_sample: true,
      data_source: 'Sample',
      max_payload_kg: '10.0 kg (Counterbalance 4-Step)',
      max_height_cm: '197 cm (Min 94 cm)',
      fluid_pan_tilt: 'Pan & Tilt Bebas Stutter pada Suhu Ruangan',
      leg_lock_qr_condition: 'Kunci Kaki 1-Step Rapat · Safety Pin QR Utuh',
    },
    reviewed_by_name: 'Tim Produksi & QC ViciTech (Sample)',
    reviewed_by_avatar: null,
    review_quote:
      'Uji beban statis 10 kg dan panning lambat 180° bebas sentakan; tuas flip-lock dan pengunci 501PL tetap presisi.',
    review_video_url: null,
    created_at: '2026-11-26T09:50:00.000Z',
    updated_at: '2026-11-26T09:50:00.000Z',
  },
  {
    id: 'sample-cam-monitor-portkeys-lh7p',
    slug: 'sample-portkeys-lh7p-7-inch-2200nit-field-monitor',
    title: 'Portkeys LH7P 7" 2200-Nit Daylight HDR Field Monitor',
    description:
      'Field monitor layar sentuh 7 inci ultra-terang 2200 nits untuk syuting outdoor dengan 4K HDMI input/output loop-through, custom 3D LUT, dan kontrol kamera nirkabel. Entri katalog sampel dengan simulasi cek dead-pixel & daya NP-F/DC.',
    price: 6200000,
    category: 'accessory',
    seller_type: 'vicitech',
    stock_status: 'ready',
    is_preset: false,
    preset_components: [],
    images: [],
    image_url: null,
    gallery_urls: [],
    specs: {
      gear_domain: CAMERA_PRODUCTION_CATEGORY_ID,
      gear_subtype: 'field-monitor',
      screen_brightness: '7.0" IPS 1080p · 2200 nits',
      hdmi_sdi_loop: 'Lulus · 4K30 HDMI In/Out Loop-Through (Dual Port Tested)',
      panel_pixel_check: '0 Dead Pixel · 100% Rec.709 ΔE < 1.4',
      power_npf_dc: 'Lulus · Sony NP-F Plate + 7–24V DC Input & 5V USB Out',
      monitoring_tools: 'Waveform, Vectorscope, False Color, Peaking, 3D LUT',
      weight: '245 g',
      qc_telemetry_source: 'simulated',
      qc_protocol: 'Simulasi QC Field Monitor (Sample)',
      data_source: 'Sample',
    },
    metadata: {
      gear_domain: CAMERA_PRODUCTION_CATEGORY_ID,
      gear_subtype: 'field-monitor',
      is_sample: true,
      data_source: 'Sample',
      screen_brightness: '7.0" Full HD · 2200 nits Daylight Viewable',
      hdmi_sdi_loop: 'HDMI In/Out Handshake 4K & Loop-Through Stabil',
      panel_pixel_check: '0 Dead/Stuck Pixel · Backlight Uniform',
      power_npf_dc: 'NP-F Battery Latch & DC Barrel 12V Stabil (11 W)',
    },
    reviewed_by_name: 'Tim Produksi & QC ViciTech (Sample)',
    reviewed_by_avatar: null,
    review_quote:
      'Layar 2200 nits terbaca jelas di bawah matahari langsung; port HDMI loop-through dan jalur daya NP-F/DC lulus uji beban.',
    review_video_url: null,
    created_at: '2026-11-26T09:40:00.000Z',
    updated_at: '2026-11-26T09:40:00.000Z',
  },
  {
    id: 'sample-cam-body-sony-fx30',
    slug: 'sample-sony-fx30-super35-cinema-camera-body',
    title: 'Sony FX30 Super 35 Cinema Line Camera Body (Grade A+)',
    description:
      'Kamera produksi Super 35 10-bit 4:2:2 dengan Dual Base ISO 800/2500, pendingin kipas aktif internal, dan bodi siap rig tanpa cage wajib. Entri katalog sampel referensi.',
    price: 26500000,
    category: 'accessory',
    seller_type: 'vicitech',
    stock_status: 'ready',
    is_preset: false,
    preset_components: [],
    images: [],
    image_url: null,
    gallery_urls: [],
    specs: {
      gear_domain: CAMERA_PRODUCTION_CATEGORY_ID,
      gear_subtype: 'camera',
      sensor_mount: '26 MP APS-C / Super 35 · Sony E-Mount',
      thermal_recording: '4K60 10-bit 4:2:2 · Kipas Aktif Stabil 60 mnt',
      connectivity: 'Full-Size HDMI Type-A · Dual CFexpress A / SD UHS-II',
      weight: '562 g',
      qc_telemetry_source: 'simulated',
      qc_protocol: 'Simulasi QC Kamera 15-Titik (Sample)',
      data_source: 'Sample',
    },
    metadata: {
      gear_domain: CAMERA_PRODUCTION_CATEGORY_ID,
      gear_subtype: 'camera',
      is_sample: true,
      data_source: 'Sample',
    },
    reviewed_by_name: null,
    reviewed_by_avatar: null,
    review_quote: null,
    review_video_url: null,
    created_at: '2026-11-26T09:30:00.000Z',
    updated_at: '2026-11-26T09:30:00.000Z',
  },
  {
    id: 'sample-cam-lens-sigma-24-70-ii',
    slug: 'sample-sigma-24-70mm-f28-dg-dn-ii-art-e-mount',
    title: 'Sigma 24-70mm f/2.8 DG DN II Art (Sony E-Mount)',
    description:
      'Lensa zoom standar flagship untuk foto dan produksi video dengan motor HLA cepat, aperture ring de-clickable, serta inspeksi optik bebas jamur/debu. Entri katalog sampel referensi.',
    price: 17900000,
    category: 'accessory',
    seller_type: 'partner',
    stock_status: 'ready',
    is_preset: false,
    preset_components: [],
    images: [],
    image_url: null,
    gallery_urls: [],
    specs: {
      gear_domain: CAMERA_PRODUCTION_CATEGORY_ID,
      gear_subtype: 'lens',
      aperture_mount: 'f/2.8 Konstan · Sony E-Mount · Filter 82 mm',
      optics_check: '100% Bersih · Zero Fog / Fungus / Scratch',
      af_aperture: 'HLA Linear Motor · De-Clickable Aperture Ring',
      weight: '745 g',
      qc_telemetry_source: 'simulated',
      qc_protocol: 'Simulasi QC Optik Lensa (Sample)',
      data_source: 'Sample',
    },
    metadata: {
      gear_domain: CAMERA_PRODUCTION_CATEGORY_ID,
      gear_subtype: 'lens',
      is_sample: true,
      data_source: 'Sample',
    },
    reviewed_by_name: null,
    reviewed_by_avatar: null,
    review_quote: null,
    review_video_url: null,
    created_at: '2026-11-26T09:20:00.000Z',
    updated_at: '2026-11-26T09:20:00.000Z',
  },
  {
    id: 'sample-cam-gimbal-dji-rs4-pro',
    slug: 'sample-dji-rs4-pro-carbon-gimbal-combo',
    title: 'DJI RS 4 Pro 3-Axis Carbon Fiber Gimbal Combo',
    description:
      'Stabilizer 3-axis serat karbon dengan payload hingga 4.5 kg, kunci axis otomatis generasi ke-2, dan native vertical shooting untuk kamera cinema & mirrorless. Entri katalog sampel referensi.',
    price: 13450000,
    category: 'accessory',
    seller_type: 'vicitech',
    stock_status: 'ready',
    is_preset: false,
    preset_components: [],
    images: [],
    image_url: null,
    gallery_urls: [],
    specs: {
      gear_domain: CAMERA_PRODUCTION_CATEGORY_ID,
      gear_subtype: 'gimbal',
      payload_axis: '4.5 kg Payload · 3-Axis Automated Locks',
      battery_health: '99% · Hingga 13 Jam Operasi (PD Fast Charge)',
      connectivity: 'Bluetooth Shutter · Dual RSA / NATO Ports',
      weight: '1.24 kg',
      qc_telemetry_source: 'simulated',
      qc_protocol: 'Simulasi QC Gimbal & Kalibrasi IMU (Sample)',
      data_source: 'Sample',
    },
    metadata: {
      gear_domain: CAMERA_PRODUCTION_CATEGORY_ID,
      gear_subtype: 'gimbal',
      is_sample: true,
      data_source: 'Sample',
    },
    reviewed_by_name: null,
    reviewed_by_avatar: null,
    review_quote: null,
    review_video_url: null,
    created_at: '2026-11-26T09:10:00.000Z',
    updated_at: '2026-11-26T09:10:00.000Z',
  },
  {
    id: 'sample-cam-light-amaran-200xs',
    slug: 'sample-aputure-amaran-200xs-bicolor-cob-light',
    title: 'Aputure Amaran 200x S Bi-Color 200W COB Studio Light',
    description:
      'Lampu studio COB 200W bi-color 2700K–6500K dengan spektrum LED SSI tinggi, Bowens mount universal, dan kontrol Sidus Link. Entri katalog sampel referensi.',
    price: 5350000,
    category: 'accessory',
    seller_type: 'partner',
    stock_status: 'preorder',
    is_preset: false,
    preset_components: [],
    images: [],
    image_url: null,
    gallery_urls: [],
    specs: {
      gear_domain: CAMERA_PRODUCTION_CATEGORY_ID,
      gear_subtype: 'lighting',
      output_cri: '200 W · 2700K–6500K · CRI 95+ / TLCI 98+',
      cooling: 'Silent Active Fan <= 28 dBA · Bowens Mount',
      connectivity: 'Sidus Link Bluetooth App · 48V DC / AC Input',
      weight: '1.56 kg',
      qc_telemetry_source: 'simulated',
      qc_protocol: 'Simulasi QC Output & Termal Lighting (Sample)',
      data_source: 'Sample',
    },
    metadata: {
      gear_domain: CAMERA_PRODUCTION_CATEGORY_ID,
      gear_subtype: 'lighting',
      is_sample: true,
      data_source: 'Sample',
    },
    reviewed_by_name: null,
    reviewed_by_avatar: null,
    review_quote: null,
    review_video_url: null,
    created_at: '2026-11-26T09:00:00.000Z',
    updated_at: '2026-11-26T09:00:00.000Z',
  },
];

export function findSampleCameraProductionProduct(identifier: string): ProductRow | null {
  const cleaned = identifier.trim().toLowerCase();
  if (!cleaned) return null;
  return (
    SAMPLE_CAMERA_PRODUCTION_PRODUCTS.find(
      (item) => item.id.toLowerCase() === cleaned || item.slug.toLowerCase() === cleaned,
    ) ?? null
  );
}
