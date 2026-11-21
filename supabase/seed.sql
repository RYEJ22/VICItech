-- =====================================================================================
-- ViciTech Demo Seed Script (SOP-17: Data Seeding & Demo Readiness)
-- Safe to re-run (idempotent via ON CONFLICT DO UPDATE). Contains zero real PII.
--
-- Out-of-band Demo Accounts (provision passwords outside repo via Supabase Auth UI):
--   1. Regular User      : demo-member@vicitech.local   (role: 'user')
--   2. Verified Builder  : demo-builder@vicitech.local  (role: 'user', badge: Builder)
-- =====================================================================================

begin;

-- -------------------------------------------------------------------------------------
-- 1. 5 Preset Setups in public.products (complete JSON specs, components & benchmarks)
-- -------------------------------------------------------------------------------------
insert into public.products (
  slug,
  title,
  description,
  price,
  category,
  seller_type,
  specs,
  images,
  stock_status,
  is_preset,
  preset_components,
  reviewed_by_name,
  review_quote,
  review_video_url
)
values
  (
    'preset-workstation-creator-1440p',
    'Preset Workstation Creator 1440p',
    'Rakitan siap kerja untuk rendering 1440p dan editing multi-track dengan uji burn-in termal 4 jam serta verifikasi JIT buffer PSU.',
    14950000,
    'pc-build',
    'vicitech',
    '{"cpu":"AMD Ryzen 5 7600","gpu":"NVIDIA RTX 4060 8 GB","ram":"32 GB DDR5-5600","storage":"1 TB NVMe PCIe 4.0","psu":"650 W 80+ Gold","tdp_watts":420,"qc_protocol":"15-Point IoT Bench"}'::jsonb,
    array['/images/hero/pc-rig.jpg'],
    'ready',
    true,
    '[{"slot":"CPU","name":"AMD Ryzen 5 7600"},{"slot":"GPU","name":"NVIDIA RTX 4060 8 GB"},{"slot":"RAM","name":"32 GB DDR5-5600 Dual Channel"},{"slot":"Storage","name":"1 TB NVMe Gen4 SSD"},{"slot":"PSU","name":"650 W 80+ Gold"}]'::jsonb,
    'Rizky Aditya (Verified Builder)',
    'Kurva kipas dan suplai daya sangat tenang di beban render kontinyu 1440p, suhu stabil di kisaran 68 C.',
    'https://www.youtube.com/watch?v=M7lc1UVf-VE'
  ),
  (
    'preset-labkom-cbt-hemat-daya',
    'Paket Pengadaan Labkom CBT Hemat Daya',
    'Konfigurasi desktop sekolah dan ruang ujian CBT dengan efisiensi daya tinggi, pembersihan data NIST 800-88, dan pelacakan serial QC terpusat.',
    5650000,
    'pc-build',
    'vicitech',
    '{"cpu":"Intel Core i3-12100","gpu":"Intel UHD 730","ram":"16 GB DDR4-3200","storage":"512 GB NVMe SSD","psu":"450 W 80+ Bronze","tdp_watts":145,"target_segment":"B2S Labkom"}'::jsonb,
    array['/images/hero/code-screen.jpg'],
    'ready',
    true,
    '[{"slot":"CPU","name":"Intel Core i3-12100"},{"slot":"Motherboard","name":"H610M Micro-ATX"},{"slot":"RAM","name":"16 GB DDR4-3200"},{"slot":"Storage","name":"512 GB NVMe SSD"},{"slot":"PSU","name":"450 W 80+ Bronze"}]'::jsonb,
    'Hendra Wijaya (CBT Lab Lead)',
    'Konsumsi listrik irit untuk pengadaan 30 sampai 40 seat sekaligus dengan suhu ruang ujian tetap terjaga.',
    'https://www.youtube.com/watch?v=aqz-KE-bpKQ'
  ),
  (
    'preset-esports-1080p-180hz',
    'Preset Esports 1080p 180Hz Ready',
    'Preset gaming kompetitif dengan frame-time konsisten 140+ FPS di 1080p High, airflow depan mesh, dan validasi bottleneck seimbang.',
    11400000,
    'pc-build',
    'vicitech',
    '{"cpu":"AMD Ryzen 5 5600","gpu":"Radeon RX 6600 8 GB","ram":"16 GB DDR4-3600","storage":"1 TB NVMe SSD","psu":"550 W 80+ Bronze","tdp_watts":310,"target_fps":"180 Hz Esports"}'::jsonb,
    array['/images/hero/pc-rig.jpg'],
    'ready',
    true,
    '[{"slot":"CPU","name":"AMD Ryzen 5 5600"},{"slot":"GPU","name":"AMD Radeon RX 6600 8 GB"},{"slot":"RAM","name":"16 GB DDR4-3600"},{"slot":"Storage","name":"1 TB NVMe SSD"},{"slot":"PSU","name":"550 W 80+ Bronze"}]'::jsonb,
    'Bagas Pratama (Verified Builder)',
    'Pilihan paling efisien untuk game kompetitif 1080p dengan margin PSU yang lega bila ingin upgrade GPU nanti.',
    'https://www.youtube.com/watch?v=M7lc1UVf-VE'
  ),
  (
    'preset-thinkpad-t14-dev-edition',
    'ThinkPad T14 Grade A+ Dev Refurbished',
    'Laptop enterprise bersertifikat QC 15-titik dengan repaste termal presisi, kesehatan baterai di atas 88%, dan kapasitas RAM siap upgrade hingga 48 GB.',
    6800000,
    'laptop',
    'vicitech',
    '{"cpu":"AMD Ryzen 5 PRO 4650U","ram":"16 GB DDR4 (Max 48 GB)","storage":"512 GB NVMe SSD","battery_health":"90%","grade":"Grade A+ QC Pass","tdp_watts":45}'::jsonb,
    array['/images/hero/thermal-paste.jpg'],
    'ready',
    true,
    '[{"slot":"Chassis","name":"ThinkPad T14 Gen 1 Grade A+"},{"slot":"Memory","name":"16 GB DDR4-3200 Soldered + Free SO-DIMM Slot"},{"slot":"Storage","name":"512 GB NVMe Gen3"},{"slot":"Thermal","name":"PTM7950 Fresh Repaste"}]'::jsonb,
    'Dewi Anggraini (Lead QC Technician)',
    'Keyboard taktil dan suhu CPU turun 7 C setelah repaste ulang di smart bench ViciTech Bandung.',
    'https://www.youtube.com/watch?v=aqz-KE-bpKQ'
  ),
  (
    'preset-ai-local-workstation-rtx4070s',
    'Workstation Local AI & 3D Render RTX 4070S',
    'Mesin riset LLM lokal, Blender Cycles, dan simulasi teknik dengan VRAM 12 GB serta RAM DDR5 dual-channel kapasitas besar.',
    24500000,
    'pc-build',
    'vicitech',
    '{"cpu":"Intel Core i5-14600K","gpu":"NVIDIA RTX 4070 Super 12 GB","ram":"64 GB DDR5-6000","storage":"2 TB NVMe Gen4","psu":"850 W 80+ Gold ATX 3.0","tdp_watts":520}'::jsonb,
    array['/images/hero/repair-tech.jpg'],
    'preorder',
    true,
    '[{"slot":"CPU","name":"Intel Core i5-14600K"},{"slot":"GPU","name":"NVIDIA RTX 4070 Super 12 GB"},{"slot":"RAM","name":"64 GB DDR5-6000"},{"slot":"Storage","name":"2 TB NVMe Gen4"},{"slot":"PSU","name":"850 W ATX 3.0 Gold"}]'::jsonb,
    'Rizky Aditya (Verified Builder)',
    'Stabil menjalankan inferensi model 7B-13B secara lokal sambil tetap dingin dan bebas throttling.',
    'https://www.youtube.com/watch?v=M7lc1UVf-VE'
  )
on conflict (slug) do update
set
  title = excluded.title,
  description = excluded.description,
  price = excluded.price,
  category = excluded.category,
  seller_type = excluded.seller_type,
  specs = excluded.specs,
  images = excluded.images,
  stock_status = excluded.stock_status,
  is_preset = excluded.is_preset,
  preset_components = excluded.preset_components,
  reviewed_by_name = excluded.reviewed_by_name,
  review_quote = excluded.review_quote,
  review_video_url = excluded.review_video_url,
  updated_at = now();

-- -------------------------------------------------------------------------------------
-- 2. 5 Verified Partners in public.partners (component stores & service centers)
-- -------------------------------------------------------------------------------------
insert into public.partners (
  id,
  name,
  type,
  address,
  city,
  gmaps_url,
  latitude,
  longitude,
  is_verified,
  whatsapp_number
)
values
  (
    '22222222-2222-4222-8222-222222222201',
    'ViciTech Hub Bandung',
    'service_center',
    'Jl. Dipatiukur No. 40, Coblong',
    'Bandung',
    'https://maps.google.com/?q=-6.8935,107.6152',
    -6.893500,
    107.615200,
    true,
    '628000000101'
  ),
  (
    '22222222-2222-4222-8222-222222222202',
    'Mitra Diagnostik Jakarta Selatan',
    'service_center',
    'Jl. Fatmawati Raya No. 88, Cilandak',
    'Jakarta',
    'https://maps.google.com/?q=-6.2882,106.7966',
    -6.288200,
    106.796600,
    true,
    '628000000102'
  ),
  (
    '22222222-2222-4222-8222-222222222203',
    'Mitra Regional Tasikmalaya & Priangan',
    'service_center',
    'Jl. HZ Mustofa No. 115, Tawang',
    'Tasikmalaya',
    'https://maps.google.com/?q=-7.3274,108.2207',
    -7.327400,
    108.220700,
    true,
    '628000000103'
  ),
  (
    '22222222-2222-4222-8222-222222222204',
    'Mitra Komponen Hardware Surabaya',
    'toko_komponen',
    'Jl. Dharmahusada No. 64, Gubeng',
    'Surabaya',
    'https://maps.google.com/?q=-7.2658,112.7586',
    -7.265800,
    112.758600,
    true,
    '628000000104'
  ),
  (
    '22222222-2222-4222-8222-222222222205',
    'Mitra Komponen & Servis Yogyakarta',
    'toko_komponen',
    'Jl. Kaliurang KM 6.5, Sleman',
    'Yogyakarta',
    'https://maps.google.com/?q=-7.7525,110.3821',
    -7.752500,
    110.382100,
    true,
    '628000000105'
  )
on conflict (id) do update
set
  name = excluded.name,
  type = excluded.type,
  address = excluded.address,
  city = excluded.city,
  gmaps_url = excluded.gmaps_url,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  is_verified = excluded.is_verified,
  whatsapp_number = excluded.whatsapp_number,
  updated_at = now();

-- -------------------------------------------------------------------------------------
-- 3. Sample QC units + telemetry sources (esp32 vs admin_simulation) for live tracking demo
-- -------------------------------------------------------------------------------------
insert into public.qc_logs (
  serial_number,
  device_name,
  status,
  burnin_hours,
  score,
  order_id,
  stress_test_status,
  cpu_temp_c,
  gpu_temp_c,
  stability_score,
  shipping_status,
  certificate_id
)
values
  (
    'VICI-SRV-2026-9042',
    'Preset Workstation Creator 1440p',
    'Pass',
    4,
    98,
    'VT-PO-2026-0412',
    'Complete',
    68.40,
    65.10,
    98.20,
    'Ready to ship',
    'VT-CERT-2026-9042A1'
  ),
  (
    'VICI-LTP-2026-4410',
    'ThinkPad T14 Grade A+ Dev Refurbished',
    'Pass',
    4,
    96,
    'VT-PO-2026-0402',
    'Complete',
    71.20,
    60.50,
    96.40,
    'Shipped',
    'VT-CERT-2026-4410B2'
  ),
  (
    'VICI-DSK-2026-3108',
    'Paket Pengadaan Labkom CBT Hemat Daya',
    'In Progress',
    2,
    null,
    'VT-PO-2026-0419',
    'Running',
    58.90,
    49.00,
    97.60,
    'In QC',
    null
  )
on conflict (serial_number) do update
set
  device_name = excluded.device_name,
  status = excluded.status,
  burnin_hours = excluded.burnin_hours,
  score = excluded.score,
  order_id = excluded.order_id,
  stress_test_status = excluded.stress_test_status,
  cpu_temp_c = excluded.cpu_temp_c,
  gpu_temp_c = excluded.gpu_temp_c,
  stability_score = excluded.stability_score,
  shipping_status = excluded.shipping_status,
  certificate_id = excluded.certificate_id,
  updated_at = now();

insert into public.telemetry_logs (
  id,
  serial_number,
  order_id,
  cpu_temp_c,
  gpu_temp_c,
  fan_rpm,
  voltage_stability,
  stability_score,
  stress_test_status,
  burnin_hours,
  source
)
values
  (
    '33333333-3333-4333-8333-333333333301',
    'VICI-SRV-2026-9042',
    'VT-PO-2026-0412',
    68.40,
    65.10,
    1480,
    99.10,
    98.20,
    'Complete',
    4,
    'esp32'
  ),
  (
    '33333333-3333-4333-8333-333333333302',
    'VICI-LTP-2026-4410',
    'VT-PO-2026-0402',
    71.20,
    60.50,
    1820,
    98.30,
    96.40,
    'Complete',
    4,
    'admin_simulation'
  ),
  (
    '33333333-3333-4333-8333-333333333303',
    'VICI-DSK-2026-3108',
    'VT-PO-2026-0419',
    58.90,
    49.00,
    1220,
    99.40,
    97.60,
    'Running',
    2,
    'esp32'
  )
on conflict (id) do update
set
  cpu_temp_c = excluded.cpu_temp_c,
  gpu_temp_c = excluded.gpu_temp_c,
  fan_rpm = excluded.fan_rpm,
  voltage_stability = excluded.voltage_stability,
  stability_score = excluded.stability_score,
  stress_test_status = excluded.stress_test_status,
  burnin_hours = excluded.burnin_hours,
  source = excluded.source;

-- -------------------------------------------------------------------------------------
-- 4. 10 Community Posts across categories (requires at least one existing auth.users row)
-- -------------------------------------------------------------------------------------
do $$
declare
  v_demo_user_id uuid;
begin
  select id into v_demo_user_id
  from auth.users
  order by created_at asc
  limit 1;

  if v_demo_user_id is null then
    raise notice 'Skipping community_posts seed: create a demo auth.users account first, then re-run seed.sql.';
    return;
  end if;

  insert into public.community_posts (
    id,
    user_id,
    title,
    content,
    category,
    tags,
    is_lfg,
    lfg_details,
    likes_count
  )
  values
    (
      '11111111-1111-4111-8111-111111111101',
      v_demo_user_id,
      'Rakit PC Esports 1080p di Bawah Rp 12 Juta',
      'Kombinasi Ryzen 5 5600 + RX 6600 menjaga frame time stabil di atas 140 FPS pada suhu load di bawah 66 C. #RTX #Ryzen5 #BudgetBuild',
      'hardware',
      array['Ryzen5', 'RX6600', 'BudgetBuild'],
      false,
      null,
      94
    ),
    (
      '11111111-1111-4111-8111-111111111102',
      v_demo_user_id,
      'Workstation Editing 4K Senyap 35 dB',
      'Penyesuaian kurva kipas intake dan exhaust menjaga kebisingan tetap rendah saat render Adobe Premiere berdurasi panjang. #SilentBuild #CreatorRig',
      'creative',
      array['CreatorRig', 'SilentBuild', 'Workflow4K'],
      false,
      null,
      152
    ),
    (
      '11111111-1111-4111-8111-111111111103',
      v_demo_user_id,
      'Mabar Valorant & CS2 Malam Ini (Server Jakarta)',
      'Butuh 2 pemain role Controller/Sentinel untuk custom scrim santai jam 20.00 WIB. Langsung klik DM untuk koordinasi lobby.',
      'gaming',
      array['LFG', 'Valorant', 'Mabar'],
      true,
      '{"game":"Valorant","rank":"Gold–Platinum","slots_needed":2,"status":"open"}'::jsonb,
      46
    ),
    (
      '11111111-1111-4111-8111-111111111104',
      v_demo_user_id,
      'Setup Docker + Local LLM 7B di ThinkPad T14 Refurbished',
      'Upgrade RAM ke 32 GB DDR4 membuat container backend dan database lokal berjalan lancar tanpa swap berlebih.',
      'dev',
      array['ThinkPad', 'Docker', 'LocalDev'],
      false,
      null,
      118
    ),
    (
      '11111111-1111-4111-8111-111111111105',
      v_demo_user_id,
      'Cara Mencegah Thermal Throttling di Lab Sekolah 36 Unit',
      'Pembersihan filter debu per semester dan repaste CPU di atas usia tiga tahun menurunkan suhu puncak lab CBT hingga 9 C.',
      'hardware',
      array['CBTSetup', 'LabMaintenance', 'Thermal'],
      false,
      null,
      203
    ),
    (
      '11111111-1111-4111-8111-111111111106',
      v_demo_user_id,
      'Rekap Indeks Harga GPU Bekas Tersertifikasi Minggu Ini',
      'Unit RTX 4060 dan RTX 3060 Ti Grade A menunjukkan pasokan stabil di Hub Bandung dengan garansi inspeksi 15 titik.',
      'news',
      array['HargaGPU', 'RefurbishedQC'],
      false,
      null,
      89
    ),
    (
      '11111111-1111-4111-8111-111111111107',
      v_demo_user_id,
      'Checklist Jaringan & UPS untuk 30 PC Ujian Serentak',
      'Pembagian beban UPS per 6 unit dan switch gigabit managed mencegah drop tegangan ketika seluruh lab menyala bersamaan.',
      'troubleshooting',
      array['CBTSetup', 'UPS', 'Jaringan'],
      false,
      null,
      144
    ),
    (
      '11111111-1111-4111-8111-111111111108',
      v_demo_user_id,
      'Mabar Apex Legends Ranked — Butuh IGL Santai',
      'Sesi malam ini mencari satu rekan skuad dengan komunikasi Discord jernih dan ping stabil di server SG.',
      'gaming',
      array['ApexLegends', 'LFG'],
      true,
      '{"game":"Apex Legends","rank":"Platinum","slots_needed":1,"status":"open"}'::jsonb,
      39
    ),
    (
      '11111111-1111-4111-8111-111111111109',
      v_demo_user_id,
      'Eksperimen Script Monitoring Suhu ESP32 ke Dashboard QC',
      'Membaca sensor DHT22 + NTC langsung ke endpoint telemetry dengan payload terkalibrasi setiap 10 detik.',
      'dev',
      array['ESP32', 'Telemetry', 'IoT'],
      false,
      null,
      131
    ),
    (
      '11111111-1111-4111-8111-111111111110',
      v_demo_user_id,
      'Meme Rakit PC: Lupa Pasang I/O Shield Setelah Baut Selesai',
      'Momen klasik teknisi akhir pekan—kabel sudah rapi, eh pelat belakang motherboard masih tertinggal di kotak.',
      'meme',
      array['PCMeme', 'RakitPC'],
      false,
      null,
      215
    )
  on conflict (id) do update
  set
    title = excluded.title,
    content = excluded.content,
    category = excluded.category,
    tags = excluded.tags,
    is_lfg = excluded.is_lfg,
    lfg_details = excluded.lfg_details,
    likes_count = excluded.likes_count;
end
$$;

commit;
