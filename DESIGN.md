# DESIGN: ViciTech Design System

## 1. Arah Visual & Mode Permukaan
- **Karakter Visual:** *Clean Editorial Light-Mode* dengan neutral hangat (*warm stone/alabaster*), aksen oranye cerah (*vibrant orange*), dan kontras tinggi yang tajam serta fungsional.
- **Prinsip Utama:** Satu sistem visual terpadu dari halaman utama, katalog, hingga navigasi dan halaman autentikasi (*Sign-In/Sign-Up*).
- **Anti-Slop:** Dilarang memakai *gradient text*, *nested cards* berlapis-lapis, deretan kartu berukuran seragam tanpa hierarki, efek kaca/blur dekoratif berlebihan, dan teks abu-abu pudar di atas permukaan berwarna.

### Mode Permukaan (Surface Mode Mapping)
| Surface Mode | Rute & Modul | Tujuan Utama & Aturan Visual |
|---|---|---|
| **Persuade** | Welcome Page (`/`), Promo Banner (`/market`) | Hierarki jelas dengan satu primary CTA dominan, headline sans-serif tebal, foto perangkat keras asli dengan overlay kontras AA. |
| **Operate** | App Shell (`/home`), Community (`/community`), Katalog (`/market`), Mitra (`/partners`), DM (`/messages`), QC Panel (`/qc-panel`), Admin (`/admin/*`) | Keterbacaan maksimal untuk spesifikasi teknis, angka `tabular-nums`, badge transparansi sumber data (`Live ESP32`, `Simulated`, `Sample`), serta navigasi satu tangan di `360–414px`. |
| **Read** | Panduan komunitas, Creator Verdict, Protokol QC 15 titik | Panjang baris terkunci di `65–75ch`, spasi bernapas sebelum heading, tipografi bersih bebas gangguan. |
| **Experience** | Build showcase galeri, galeri unit *Refurbished*, media *Lightbox* | Bingkai gambar bebas distorsi (`CLS < 0.1`), lazy-load di bawah lipatan, fokus pada detail foto/video perangkat. |

### Evaluasi Kandidat Arah Visual & Rasional Pemilihan (SOP-02)
1. **Kandidat 1 (Dipilih): Clean Editorial Light-Mode & Unibody Hardware Hub**
   - *Palet & Tipografi:* Latar `#FAF9F6` / `#FFFFFF` / `#F3F1ED`, teks `#18181B` / `#52525B`, aksen `#EA580C`, unified Plus Jakarta Sans typography with tabular numerals.
   - *Rasional:* Kontras teks mencapai `16.83:1` (utama) dan `7.34:1` (sekunder), bebas biaya GPU blur berlebih di HP kelas menengah, memancarkan kredibilitas katalog teknis dan inspeksi *Quality Control* untuk pembeli B2C, sekolah (B2S), dan korporasi (B2B).
2. **Kandidat 2 (Ditolak): Cyberpunk Neon Dark-Mode**
   - *Alasan Penolakan:* Teks bercahaya di atas latar gelap memicu *halation* pada tabel spesifikasi padat dan mengurangi kesan transparan/obyektif pada inspeksi foto perangkat bekas.
3. **Kandidat 3 (Ditolak): Heavy Glassmorphic Gradient Dashboard**
   - *Alasan Penolakan:* Penggunaan `backdrop-filter: blur` dan kartu gradien dekoratif melanggar aturan performa (`INP`/`FPS` turun pada perangkat mobile) serta bertentangan dengan prinsip *anti-slop*.

## 2. Color Psychology & Palet Warna (Token Semantik)
Pendekatan psikologi warna ViciTech dirancang untuk menyeimbangkan **energi komunitas teknologi** dengan **kepercayaan transaksi marketplace & QC perangkat keras**:
- **Surface / Background (Kejujuran, Transparansi & Fokus):**
  - `--bg-canvas`: `#FAF9F6` *(Warm Alabaster)* — Memberikan kesan hangat, bersih, dan transparan seperti katalog editorial teknis tanpa menyilaukan mata.
  - `--bg-surface`: `#FFFFFF` *(Pure White)* — Latar kartu produk, panel QC, dan postingan agar foto perangkat keras dan spesifikasi tampil akurat.
  - `--bg-subtle`: `#F3F1ED` *(Warm Stone)* — Input field, latar sekunder, hover state, dan pemisah area navigasi.
- **Text (Keterbacaan & Otoritas):**
  - `--text-primary`: `#18181B` *(Deep Charcoal)* — Judul, harga, dan data utama.
  - `--text-secondary`: `#52525B` *(Muted Zinc)* — Metadata, label spesifikasi, dan keterangan pendukung.
- **Brand Accent (Energi, Antusiasme & Arah Aksi):**
  - `--accent-primary`: `#EA580C` *(Vibrant Tech Orange)* — Menyimbolkan kreativitas *PC builder*, antusiasme komunitas, dan daya tarik aksi. Digunakan secara disiplin *hanya* untuk tombol CTA utama, indikator tab aktif, dan sorotan interaktif (termasuk tombol *Sign-In* agar menyatu dengan identitas brand).
  - `--accent-hover`: `#C2410C` *(Deep Burnt Orange)* — State hover/pressed untuk tombol utama.
  - `--accent-subtle`: `#FFF7ED` *(Soft Peach Tint)* — Latar sorotan ringan untuk tugas rekomendasi (*role-aware featured card*).
  - `--accent-foreground`: `#FFFFFF` — Teks di atas tombol hover `--accent-hover` atau ikon CTA besar; gunakan `--text-primary` (`#18181B`) untuk teks kecil/normal langsung di atas `#EA580C` agar kontras tetap memenuhi WCAG AA.
  - `--border-default`: `#E4E2DD` *(Warm Border)* — Garis pemisah tipis `1px`.
- **Status Fungsional & Telemetri Data (Kepercayaan & Peringatan):**
  - `--status-live`: `#059669` *(Emerald — Live ESP32 Telemetry)* — Menyimbolkan validitas sensor perangkat keras aktif secara real-time.
  - `--status-simulated`: `#0284C7` *(Tech Blue — Simulated QC / Admin)* — Menyimbolkan simulasi terkontrol yang terpisah secara jujur dari sensor fisik.
  - `--status-sample`: `#D97706` *(Warm Amber — Sample Data / Catalog)* — Penanda transparan bahwa harga, skor, atau spesifikasi masih berupa data contoh.
  - `--status-danger`: `#DC2626` *(Crimson)* — Error validasi dan konfirmasi aksi destruktif permanen.

### Audit Kontras Token (WCAG 2.2 AA: >= 4.5:1 Teks Normal, >= 3.0:1 UI/Teks Besar)
| Pasangan Token | Hex Foreground / Background | Rasio Terhitung | Status |
|---|---|---|---|
| `--text-primary` di atas `--bg-canvas` | `#18181B` / `#FAF9F6` | **16.83 : 1** | Pass (AAA) |
| `--text-primary` di atas `--bg-surface` | `#18181B` / `#FFFFFF` | **17.72 : 1** | Pass (AAA) |
| `--text-primary` di atas `--bg-subtle` | `#18181B` / `#F3F1ED` | **15.71 : 1** | Pass (AAA) |
| `--text-secondary` di atas `--bg-canvas` | `#52525B` / `#FAF9F6` | **7.34 : 1** | Pass (AAA) |
| `--text-secondary` di atas `--bg-surface` | `#52525B` / `#FFFFFF` | **7.73 : 1** | Pass (AAA) |
| `--text-secondary` di atas `--bg-subtle` | `#52525B` / `#F3F1ED` | **6.85 : 1** | Pass (AA) |
| `--text-primary` di atas `--accent-primary` | `#18181B` / `#EA580C` | **4.98 : 1** | Pass (AA) |
| `#FFFFFF` di atas `--accent-hover` | `#FFFFFF` / `#C2410C` | **5.18 : 1** | Pass (AA) |
| `#FFFFFF` di atas `--accent-primary` | `#FFFFFF` / `#EA580C` | **3.56 : 1** | Large Text / UI Only (>= 18px atau bold >= 14pt) |
| Badge Live (`.vt-badge-live`) | `#065F46` / `#ECFDF5` (aksen `#059669`) | **7.29 : 1** | Pass (AAA) |
| Badge Simulated (`.vt-badge-simulated`) | `#075985` / `#F0F9FF` (aksen `#0284C7`) | **7.09 : 1** | Pass (AAA) |
| Badge Sample (`.vt-badge-sample`) | `#92400E` / `#FFFBEB` (aksen `#D97706`) | **6.84 : 1** | Pass (AA) |
| Danger Notice | `#991B1B` / `#FEF2F2` (atau `#FFFFFF` / `#DC2626`) | **7.60 : 1** (`4.83 : 1` solid) | Pass (AA/AAA) |

## 3. Tipografi & Skala
- **Font Utama (Sans):** `Plus Jakarta Sans` (`var(--font-sans)`) — Digunakan untuk semua headline, judul bagian, kartu, navigasi, tombol, deskripsi modul, dan diskusi komunitas pada bobot 400, 500, 600, 700, dan 800.
- **Hierarki Judul:** Headline hero, judul bagian, dan judul kartu memakai bobot 700 atau 800 dengan `letter-spacing: -0.02em`.
- **Angka & Telemetri:** Gunakan `Plus Jakarta Sans` dengan `font-variant-numeric: tabular-nums` untuk harga Rupiah, skor bottleneck, pembacaan sensor ESP32, dan spesifikasi teknis.
- **Skala Tipografi:**
  - `xs` (`12px` / `16px`), `sm` (`14px` / `20px`), `base` (`16px` / `24px`), `lg` (`18px` / `28px`), `xl` (`20px` / `28px`), `2xl` (`24px` / `32px`), `3xl` (`30px` / `36px`), `4xl`–`5xl` (`36px–48px` display hero dengan `line-height: 1.1` & `letter-spacing: -0.02em`).
- **Aturan Keterbacaan:** Maksimal panjang baris paragraf `65–75ch`; heading menggunakan `text-wrap: balance`.

## 4. Layout, Spacing, Gerakan & Interaksi
- **Mobile-First Breakpoints:** Uji wajib di lebar `360px`, `414px`, `768px`, `1024px`, `1440px` tanpa *horizontal overflow*.
- **Spacing Grid:** Basis kelipatan `4px` (`4, 8, 12, 16, 20, 24, 32, 48, 64px`), jarak aman antar kontrol minimal `8px`.
- **Hierarki Kartu & Navigasi:**
  - Tugas utama berdasarkan peran pengguna (*role-aware*) diberi penekanan visual lebih besar di bagian atas sebelum direktori modul lengkap.
  - Navigasi tingkat rute dan navigasi modul dalam *app shell* menggunakan label, warna, dan gaya kontrol yang seragam.
  - Bottom Navigation mobile dibatasi maksimal `5` item dengan `env(safe-area-inset-bottom)`.
- **Radius Sudut:** Kartu `12px` (`rounded-xl`), tombol & input `8px` (`rounded-lg`), badge status data `6px` (`rounded-md`), pill filter `9999px` (`rounded-full`).
- **Target Sentuh:** Semua tombol, tab, dan ikon interaktif minimal `44x44px` dengan jarak antar elemen minimal `8px`.
- **Aturan Overlay (Wajib Patuh):**
  - **Bottom Sheet:** Wajib di mobile (`< 768px`) untuk filter katalog, filter kota mitra, dan menu aksi.
  - **Side Drawer:** Wajib di desktop dan dashboard (`>= 768px`) untuk form edit produk/QC admin dan panel detail spesifikasi.
  - **Anchored Popover:** Wajib untuk dropdown notifikasi, ringkasan status data, dan menu *Share* di desktop.
  - **Modal Tengah Layar:** Hanya diizinkan untuk *Lightbox* media (foto/video) dan konfirmasi aksi destruktif permanen.
- **Referensi Gerakan (Motion Budget — Properti `transform` & `opacity` saja):**
  - Feedback hover/press/toggle: `150–200ms ease-out`.
  - Popover & reveal kecil: `200–300ms ease-out` (exit lebih cepat: `150–200ms ease-in`).
  - Hero slide cross-fade: `1200–2000ms ease-in-out`, dwell `6000–8000ms`, Ken Burns scale maksimal `1.15`, dilengkapi kontrol jeda/putar (`44x44px`) dan fallback statis untuk `prefers-reduced-motion: reduce`.

## 5. Ikonografi & Transparansi Data
- **Library Ikon:** `Lucide React` — Gunakan ketebalan stroke seragam (`1.75px`).
- **Larangan:** Dilarang menggunakan emoji atau simbol karakter Unicode (seperti `✓`) sebagai ikon antarmuka.
- **Aturan Badge Sumber Data:** Setiap komponen yang menampilkan hasil uji QC atau harga katalog wajib menyertakan badge status (`Live ESP32` lewat `.vt-badge-live`, `Simulated` lewat `.vt-badge-simulated`, atau `Sample` lewat `.vt-badge-sample`) menggunakan token warna pada Bagian 2.
