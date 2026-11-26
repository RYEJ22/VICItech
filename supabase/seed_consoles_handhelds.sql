-- =====================================================================================
-- ViciTech OS Optional Seed: Sample Consoles & Handheld PCs Catalog Items
-- Run manually AFTER applying 20261126_catalog_metadata_expansion.sql.
-- Safe to re-run: uses ON CONFLICT (slug) DO NOTHING.
-- =====================================================================================

insert into public.products (
  slug,
  title,
  description,
  price,
  category,
  seller_type,
  stock_status,
  specs,
  metadata,
  images,
  is_preset,
  preset_components
)
values
  (
    'ps5-slim-disc-edition-qc',
    'PlayStation 5 Slim Disc Edition 1TB (IoT QC Grade A+)',
    'Unit PlayStation 5 Slim Disc Edition 1TB terkurasi ViciTech. Telah melalui pengecekan termal, drive optik, HDMI 2.1, serta pengujian DualSense bebas drift.',
    7850000,
    'console',
    'vicitech',
    'ready',
    '{"cpu": "AMD Ryzen Zen 2 8-Core", "gpu": "AMD RDNA 2 10.28 TFLOPS", "ram": "16 GB GDDR6", "storage": "1 TB Custom NVMe SSD", "grade": "Grade A+ Refurbished", "qc_protocol": "15-Titik IoT QC"}'::jsonb,
    '{"display": "Output hingga 4K 120Hz / VRR (HDMI 2.1)", "storage_type": "Custom PCIe Gen4 NVMe SSD + Slot M.2 Ekspansi", "controller_condition": "DualSense Original · Bebas Stick Drift (Uji Deadzone < 3%)", "firmware_status": "Official Firmware Terbaru (Clean · Non-Mod)"}'::jsonb,
    '{}'::text[],
    false,
    '[]'::jsonb
  ),
  (
    'nintendo-switch-oled-64gb-white-qc',
    'Nintendo Switch OLED 64GB White (Refurbished Grade A)',
    'Nintendo Switch OLED 64GB dengan layar OLED 7 inci mulus tanpa burn-in, dock HDMI lengkap, dan Joy-Con lulus uji akurasi analog.',
    4350000,
    'console',
    'vicitech',
    'ready',
    '{"chipset": "NVIDIA Custom Tegra X1", "storage": "64 GB Internal + microSDXC", "grade": "Grade A Refurbished", "qc_protocol": "15-Titik IoT QC"}'::jsonb,
    '{"display": "7.0 inci OLED 720p (60Hz · Bebas Burn-In)", "battery_wh": "16 Wh (Estimasi 4.5–9 jam)", "storage_type": "64 GB eMMC + Slot microSD hingga 2TB", "controller_condition": "Joy-Con L/R Original · Rail Kokoh & Bebas Drift", "firmware_status": "Official Nintendo OS Terbaru (Clean · Online Ready)"}'::jsonb,
    '{}'::text[],
    false,
    '[]'::jsonb
  ),
  (
    'steam-deck-oled-512gb-qc',
    'Steam Deck OLED 512GB (Handheld PC · IoT QC)',
    'Handheld PC Valve Steam Deck OLED 512GB dengan layar HDR 90Hz, baterai 50Wh, dan efisiensi APU 6nm. Cocok untuk library Steam & indie gaming portabel.',
    8950000,
    'handheld',
    'vicitech',
    'ready',
    '{"cpu": "AMD Zen 2 4C/8T (6nm APU)", "gpu": "AMD RDNA 2 (8 CU)", "ram": "16 GB LPDDR5 6400 MT/s", "storage": "512 GB NVMe SSD", "grade": "Grade A+ Curated", "qc_protocol": "15-Titik IoT QC"}'::jsonb,
    '{"display": "7.4 inci HDR OLED 1280x800 (90Hz · 1000 nits peak)", "battery_wh": "50 Wh (Kesehatan Baterai 98%)", "storage_type": "M.2 2230 NVMe PCIe Gen3 + Slot microSD UHS-I", "controller_condition": "Analog, Trackpad & Trigger Responsif · Deadzone Normal", "firmware_status": "SteamOS 3.6 Official Stable (Factory Reset)"}'::jsonb,
    '{}'::text[],
    false,
    '[]'::jsonb
  ),
  (
    'asus-rog-ally-z1-extreme-512gb-qc',
    'ASUS ROG Ally Z1 Extreme 512GB (Windows Handheld PC)',
    'Handheld PC Windows 11 bertenaga AMD Ryzen Z1 Extreme dengan layar 120Hz VRR. Lulus uji kestabilan termal 25W/30W Turbo dan sanitasi OS bersih.',
    9250000,
    'handheld',
    'vicitech',
    'preorder',
    '{"cpu": "AMD Ryzen Z1 Extreme (8C/16T Zen 4)", "gpu": "AMD RDNA 3 (12 CU)", "ram": "16 GB LPDDR5 6400 MT/s", "storage": "512 GB PCIe 4.0 NVMe SSD", "grade": "Grade A+ Curated", "qc_protocol": "15-Titik IoT QC"}'::jsonb,
    '{"display": "7.0 inci FHD IPS 120Hz FreeSync Premium (500 nits)", "battery_wh": "40 Wh (Kesehatan Baterai 96%)", "storage_type": "M.2 2230 PCIe Gen4 NVMe SSD", "controller_condition": "Stick & Hall-Effect Trigger Lulus Kalibrasi Armoury Crate", "firmware_status": "Windows 11 Home Ori + BIOS & MCU Terbaru"}'::jsonb,
    '{}'::text[],
    false,
    '[]'::jsonb
  )
on conflict (slug) do nothing;
