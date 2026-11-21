# Product

<!-- impeccable:product-schema 1 -->

## Platform

web (Next.js App Router, mobile-first `360px–1440px`)

## Users

- **PC Builders & Hardware Enthusiasts:** Pengguna yang meriset komponen, mengecek potensi *bottleneck*, merancang *preset setup*, dan berbagi rakitan di komunitas.
- **Second-Hand & Refurbished Hardware Buyers:** Pembeli laptop atau komponen bekas yang mencari jaminan kualitas transparan dan terverifikasi QC ("anti-zonk").
- **Gamers & Creators:** Pengguna yang mencari rekomendasi perangkat siap pakai berdasarkan *Creator Verdict*, melihat benchmark FPS, serta mencari teman mabar (LFG).
- **Everyday Users & B2B Partners:** Pengguna atau mitra toko/teknisi yang ingin melakukan *trade-in* (tukar tambah), daur ulang perangkat lama, atau mendaftarkan layanan servis terverifikasi.

## Product Purpose

ViciTech menyatukan alur riset hardware, analisis kompatibilitas, perencanaan rakitan, komunitas, dan transaksi dalam satu ekosistem **Circular IT Economy**. Platform ini menjembatani pasar perangkat keras baru maupun bekas melalui proses *trade-in* yang terukur, pengujian *Quality Control* (QC) berbasis telemetri ESP32, dan pelacakan siklus hidup perangkat yang transparan.

## Positioning

Berbeda dari *marketplace* atau forum teknologi biasa, ViciTech memosisikan diri sebagai pusat **Circular IT terpercaya** di Indonesia. Keunggulan utamanya terletak pada transparansi data teknis: memisahkan secara tegas antara data katalog contoh (*Sample*), profil uji simulasi admin (*Simulated QC*), dan pembacaan sensor fisik secara langsung (*Live ESP32 Telemetry*) untuk menekan risiko pembelian perangkat keras bekas.

## Measure of Success

- **Konversi Trade-In & Sirkularitas:** Tingginya rasio perangkat lama yang berhasil ditukar tambah atau diperbarui siklus pakainya.
- **Kepercayaan QC (Anti-Zonk):** Rendahnya tingkat pengembalian barang pada perangkat yang telah lulus profil pengujian QC ViciTech.
- **Keterlibatan Komunitas & Market:** Interaksi aktif pada diskusi multi-kategori, fitur LFG satu klik, dan konsultasi rakitan via DM real-time.
- **Kesiapan Demo & Produksi:** Alur *end-to-end* berjalan mulus dengan pemisahan hak akses RLS yang ketat dan data realistis.

## Operating Context

Aplikasi web ini menggabungkan empat pilar utama dalam satu *app shell* terpadu:
1. **Hardware & QC Tools:** Perpustakaan komponen (*Hardware Library*), *Bottleneck & Upgrade Analyzer*, *Comparison Arena*, *Preset Builder*, serta panel *Quality Control* (ESP32 & simulasi).
2. **Marketplace (`/market`):** Etalase rakitan PC, laptop, smartphone, dan komponen dengan filter budget, spesifikasi teknis terstruktur, serta paket *Preset Setup* berlabel *Creator Verdict*.
3. **Community & LFG (`/community`):** Feed diskusi lintas kategori (*Hardware, Gaming, Dev, Creative, Meme*), unggah foto/video pendek, *backsound* audio bebas hak cipta, dan lobi ajakan mabar (LFG) yang terhubung langsung ke DM.
4. **Partners & Direct Messaging (`/partners`, `/messages`):** Direktori toko komponen dan *service center* terverifikasi berbasis peta, serta sistem obrolan DM dan notifikasi real-time.

## Capabilities and Constraints

- **Arsitektur & Auth:** Dibangun di atas Next.js App Router dan Supabase (Auth `@supabase/ssr`, Postgres dengan RLS ketat, Storage, dan Realtime). Aksi yang berkaitan dengan akun, pesanan, dan DM terlindungi autentikasi server.
- **Transparansi Sumber Data (Wajib):**
  - **Sample Data:** Katalog awal, harga referensi, skor performa, dan sebagian data akun merupakan data contoh; spesifikasi wajib diverifikasi terhadap *datasheet* pabrikan sebelum dijadikan acuan pembelian nyata.
  - **Simulated QC:** Profil pengujian QC dan simulasi telemetri yang dibuat admin harus selalu diberi label `Simulated` dan tidak boleh ditampilkan sebagai pembacaan sensor fisik.
  - **Live ESP32 Telemetry:** Data yang berasal dari perangkat keras sensor ESP32 diklasifikasikan sebagai sumber data `Live` yang terpisah.
- **Batas Implementasi Bertahap:** Fitur lanjutan (seperti *checkout* tervalidasi server, notifikasi real-time, media upload, hingga direktori mitra) dikembangkan bertahap sesuai fase di `docs/ROADMAP.md`. Beberapa alur kalkulasi *quote* atau *trade-in* tahap awal berjalan di *client-side state* sebelum dipindahkan ke mutasi server.

## Brand Commitments

- **Identitas Merek:** Pertahankan nama **ViciTech** secara konsisten.
- **Sistem Visual Terpadu:** Mengusung estetika **Clean Editorial Light-Mode** dengan latar neutral hangat (`#FAF9F6`), aksen oranye cerah (`#EA580C`), dan *editorial serif headers* di seluruh halaman—termasuk navigasi global dan komponen autentikasi (*Sign-In / Sign-Up*).
- **Kejujuran Teknis & Bahasa:** Gunakan bahasa Indonesia yang santai, lugas, dan rapi dengan tetap mempertahankan istilah teknis baku (*GPU, RAM, FPS, Bottleneck, Telemetry*). Jaga transparansi mutlak pada label sumber data (`Live ESP32`, `Simulated`, `Sample`).

## Evidence on Hand

- Dokumentasi setup dan perilaku aplikasi: `vicitech-app/README.md`.
- Kode sumber aktif: `vicitech-app/app/` dan `vicitech-app/components/`.
- Skema aturan teknis dan SOP pengembangan: `docs/ai/CORE_CONTEXT.md`, `docs/ai/CODING_STANDARDS.md`, dan `docs/ai/WORKFLOW_SKILLS.md`[cite: 2, 11, 12, 13].
- Tidak ada testimoni pelanggan, statistik pengguna produksi, atau klaim pengujian lab pihak ketiga yang terverifikasi; dilarang mengarang data tersebut (patuhi aturan *anti-slop*).

## Product Principles

- **Satu Alur Terpadu:** Satukan riset hardware, analisis *bottleneck*, perbandingan, komunitas, dan pembelian tanpa membuat pengguna tersesat antar-fitur.
- **Kontinuitas Navigasi:** Pastikan perpindahan antar-modul di *app shell* maupun navigasi rute terasa seragam, cepat, dan mudah dijangkau di layar mobile (`360–414px`)[cite: 7, 13].
- **Kejelasan Sumber Data:** Selalu tampilkan status keaslian data hardware dan telemetri QC secara jujur di antarmuka.
- **Keamanan & Kepemilikan Data:** Kunci seluruh mutasi sensitif, pesanan, dan pesan privat pada pengguna yang terautentikasi melalui validasi server dan kebijakan RLS[cite: 11, 13].