# ROADMAP ViciTech

Baca hanya bagian modul yang sedang dikerjakan. Centang modul di bagian Status setelah semua poin Definition of Done terpenuhi. Aturan kerja ada di `docs/ai/`; nomor SOP di bawah merujuk ke `docs/ai/WORKFLOW_SKILLS.md`. Setiap modul yang mengubah schema wajib menyertakan `types/database.types.ts` hasil generate ulang.

## Status

**Fase 1**
- [x] 1.1 Auth & Cache Hardening
- [x] 1.2 Global Navigation Bar
- [x] 1.4 Welcome Page
- [ ] 1.3 Real-Time Notification System

**Fase 2**
- [ ] 2.1 Multi-Category & Sub-Tag Feed
- [ ] 2.2 Media Upload (Foto & Video Pendek)
- [ ] 2.3 Integrated Backsound Audio
- [ ] 2.4 Gaming LFG (Mabar) & Benchmark Widget

**Fase 3**
- [x] 3.1 Skema Database Katalog (products)
- [ ] 3.2 Etalase Utama (/market) & Kategori
- [ ] 3.3 Product Detail Page
- [ ] 3.4 Preset Setup & Creator Verdict Badge

**Fase 4**
- [ ] 4.1 YouTube Embed Integration
- [ ] 4.2 Direktori Mitra & Google Maps (/partners)
- [x] 4.3 Cross-Platform Social Share & Dynamic OG

**Fase 5**
- [x] 5.1 Audit Keamanan RLS & Validasi Input
- [x] 5.2 Optimasi Performa & Responsivitas Mobile
- [x] 5.3 Data Seeding & Pitching Readiness

## Jadwal

Asumsi mulai Senin, 23 November 2026. Estimasi untuk satu developer penuh waktu; kalikan 2 jika paruh waktu. Minggu 5 dan 6 jatuh di libur Natal dan Tahun Baru: cek kalender libur dan geser jika perlu.

| Fase | Minggu | Tanggal | Fokus |
|---|---|---|---|
| 0 | Sebelum Minggu 1 | 18 sampai 22 Nov 2026 | Setup toolkit (setengah hari) |
| 1 | 1 sampai 2 | 23 Nov sampai 4 Des 2026 | Stabilisasi inti, navigasi, welcome page, notifikasi |
| 2 | 3 sampai 4 | 7 sampai 18 Des 2026 | Community Hub |
| 3 | 5 sampai 6 | 21 Des 2026 sampai 1 Jan 2027 | E-commerce /market dan preset setup |
| 4 | 7 sampai 8 | 4 sampai 15 Jan 2027 | Integrasi eksternal, peta mitra, share dan OG |
| 5 | 9 sampai 10 | 18 sampai 29 Jan 2027 | Audit keamanan, optimasi, kesiapan kompetisi |

---

# Fase 1: Stabilisasi Inti & Kerangka Navigasi Global

Fokus: memastikan fondasi aplikasi bersih dari bug lama dan pengguna baru bisa menavigasi seluruh pilar ViciTech tanpa tersesat.

Urutan pengerjaan: 1.1, 1.2, 1.4, 1.3. Welcome Page butuh login dan rute `/community` yang stabil. Notifikasi dikerjakan terakhir karena paling kompleks.

## 1.1 Auth & Cache Hardening
**Estimasi:** 2 hari. **Jadwal:** Senin sampai Selasa, 23 sampai 24 Nov.
**SOP:** 08, 11, 18. **Alat:** skill `signup`, Impeccable `harden`.

**Spesifikasi teknis (database dan backend)**
- Audit trigger `handle_new_user` di Supabase Auth agar otomatis membuat baris di tabel `profiles`.
- Pastikan RLS `profiles` mengizinkan SELECT publik dan UPDATE khusus pemilik akun.

**Spesifikasi antarmuka (frontend)**
- Tambahkan tombol "Force Logout / Reset Session" tersembunyi atau penanganan error token kadaluwarsa di halaman login.
- Redirect otomatis pasca-login ke `/community`.

**Definition of Done**
- Tester/user baru bisa mendaftar, login, dan langsung muncul nama profil aslinya (bukan fallback) tanpa konflik cache.

## 1.2 Global Navigation Bar
**Estimasi:** 2 hari. **Jadwal:** Rabu sampai Kamis, 25 sampai 26 Nov.
**SOP:** 03, 05, 18. **Alat:** UI/UX Pro Max (`--domain ux` navigasi, `--stack nextjs`), Impeccable `shape`, `layout`, `adapt`.

**Spesifikasi teknis**
- Setup struktur rute dasar Next.js App Router: `/community`, `/market`, `/partners`, `/messages`. Tambahkan juga `/` untuk Welcome Page (modul 1.4).
- Rute yang belum ada isinya (mis. `/market`, `/partners`) mendapat halaman placeholder, bukan 404.

**Spesifikasi antarmuka**
- Header sticky responsif dengan logo ViciTech.
- Menu utama: Community, Market, Service & Mitra, DM (dengan badge jumlah pesan belum dibaca).
- Bottom Navigation Bar khusus tampilan mobile.

**Definition of Done**
- Perpindahan antar halaman berjalan mulus tanpa reload penuh, dan indikator menu aktif terlihat jelas.

## 1.4 Welcome Page (Landing Page)
**Estimasi:** 3 hari. **Jadwal:** Jumat 27 Nov sampai Selasa 1 Des.
**SOP:** 14, 19, 02, 13, 03, 04, 06, 15, 18. **Alat:** skill `product-marketing` (isi konteks dulu), `site-architecture`, `copywriting`, `humanizer`, UI/UX Pro Max `--design-system`, Impeccable `shape`, `critique`, `polish`, skill `seo-audit`, Playwright untuk tes slider (fake clock, reduced motion).
**Rincian harian:** Jumat = wireframe, copywriting, struktur seksi. Senin = bangun hero (slider, tes browser), 4 pilar, cara kerja, CTA penutup, footer. Selasa = responsif 360 sampai 414px, redirect user login, metadata, QA.

**Spesifikasi teknis**
- Rute publik `/` (`app/page.tsx`) tanpa perlu login.
- Cek sesi di server dengan Supabase server client. Jika sudah login, redirect ke `/community`.
- Tidak butuh tabel baru. Statistik opsional (jumlah member dan postingan) lewat query count sederhana jika RLS mengizinkan, dengan fallback ke teks statis.
- Metadata dasar: title, description, `og:image` statis. OG dinamis dikerjakan di modul 4.3.
- Hero memakai background image slider (SOP-19): Server Component `hero.tsx` untuk teks dan CTA, leaf Client Component `hero-slider.tsx` untuk animasi (Ken Burns `transform: scale` dan cross-fade `opacity`, 4 slide, tiap slide 6 sampai 8 detik).
- Aset: `/images/hero/pc-rig.jpg`, `/images/hero/thermal-paste.jpg`, `/images/hero/repair-tech.jpg`, `/images/hero/code-screen.jpg`.
- Hanya slide pertama yang `priority` (LCP di bawah 2,5 dtk); slide lain lazy dan baru dipasang satu langkah sebelum tampil.
- `prefers-reduced-motion: reduce` mematikan zoom dan fade sepenuhnya dan menampilkan gambar pertama yang statis (CSS dan JS).
- Semua timer dibersihkan saat unmount, dijeda, tab tersembunyi, atau reduced motion. CLS di bawah 0,1.
- Overlay Warm Alabaster di atas foto dengan kontras teks minimal 4,5:1 terhadap piksel foto paling gelap, diverifikasi di 360, 768, 1024, 1440, dan 1920px.
- Tombol CTA mengarah ke rute login dan daftar yang sudah ada dari modul 1.1.

**Spesifikasi antarmuka**
1. Header publik: logo ViciTech, link anchor (Fitur, Cara Kerja), tombol Masuk dan Daftar. Berbeda dari header aplikasi di modul 1.2.
2. Hero: headline (serif editorial), sub-headline, CTA utama "Gabung Sekarang" (aksen oranye, teks gelap agar kontras lolos AA), CTA kedua "Lihat Market", dan background image slider dengan tombol jeda/putar berukuran minimal 44px.
3. Empat pilar: Community, Market, Service & Mitra, DM, masing-masing satu kalimat penjelasan.
4. Cara kerja: 3 langkah (Daftar, Gabung dan ngobrol, Rakit/beli/servis).
5. Preview atau social proof: screenshot feed atau angka statistik komunitas yang nyata.
6. CTA penutup dan footer (link navigasi, sosial media, copyright).
- Tombol CTA berukuran tap minimal 44px.
- `/market` belum ada sampai Fase 3: arahkan "Lihat Market" ke placeholder dari 1.2 atau beri label "Segera hadir".

**Draft copy (boleh diganti)**
- Headline: "Satu tempat buat rakit, main, dan ngoprek."
- Sub-headline: "ViciTech menghubungkan builder, gamer, dan teknisi: diskusi, belanja rakitan, sampai cari tempat servis terpercaya."
- CTA: "Gabung Sekarang" dan "Lihat Market".

**Definition of Done**
- Pengunjung baru yang membuka `/` paham apa itu ViciTech dalam sekitar 5 detik dan bisa langsung klik Daftar atau Masuk.
- User yang sudah login dan membuka `/` otomatis dialihkan ke `/community`.
- Tidak ada horizontal overflow di layar 360 sampai 414px.
- Gambar hero tampil cepat dan seksi di bawahnya dimuat lazy.
- Hero slider lolos tes browser: hydration tanpa warning, pindah slide tiap interval, jeda/putar, tab tersembunyi, reduced motion saat load dan saat runtime, tepat satu interval di Strict Mode, nol interval setelah unmount.

## 1.3 Real-Time Notification System
**Estimasi:** 3 hari. **Jadwal:** Rabu sampai Jumat, 2 sampai 4 Des. Hari ketiga juga buffer dan tes end-to-end seluruh Fase 1.
**SOP:** 08, 09, 06, 18. **Alat:** skill `supabase-rls-policies`, `postgresql-code-review`.
**Rincian harian:** Rabu = tabel `notifications`, trigger like dan komentar, aktifkan Realtime. Kamis = ikon lonceng, popover, "Tandai semua dibaca", klik notif menuju postingan/chat.

**Spesifikasi teknis**
- Buat tabel `notifications` (`id`, `user_id`, `actor_id`, `type` ['like', 'comment', 'dm', 'system'], `entity_id`, `is_read`, `created_at`).
- Buat Database Trigger otomatis saat ada like atau komentar baru.
- Aktifkan Supabase Realtime pada tabel `notifications`.

**Spesifikasi antarmuka**
- Ikon lonceng di header dengan titik merah (unread badge).
- Anchored Popover (dropdown) menampilkan daftar notif terbaru, avatar pelaku, dan tombol "Tandai semua dibaca".
- Klik notif langsung mengarahkan ke postingan/chat terkait.

**Definition of Done**
- Saat user A me-like atau komen postingan user B, lonceng user B langsung menyala detik itu juga tanpa refresh.

---

# Fase 2: Ekspansi Community Hub (Multi-Kategori, Media, Audio & Gaming)

Fokus: mengubah feed standar menjadi pusat interaksi harian yang kaya visual, audio, dan komunitas gaming.

## 2.1 Multi-Category & Sub-Tag Feed
**Estimasi:** 2 hari. **Jadwal:** Minggu 3, Senin sampai Selasa, 7 sampai 8 Des.
**SOP:** 09, 03, 04, 18. **Alat:** `postgresql-optimization`, skill `onboarding` (empty state), UI/UX Pro Max (`--domain ux` tabs dan loading), Impeccable `layout`.

**Spesifikasi teknis**
- Tambah kolom `category` (hardware, gaming, dev, creative, meme) dan `tags` (text[]) di tabel `community_posts`.
- Buat indeks pencarian pada kolom `category`.

**Spesifikasi antarmuka**
- Filter pill tabs horizontal di atas feed ("Semua", "Hardware & Rakit", "Gaming & Mabar", "Dev & Coding", "Desain & Kreatif", "Meme Tech").
- Pemilih kategori wajib saat membuat postingan baru.

**Definition of Done**
- Klik tab "Gaming & Mabar" hanya menampilkan postingan kategori gaming dengan loading state (skeleton) yang halus.

## 2.2 Media Upload (Foto & Video Pendek)
**Estimasi:** 3 hari. **Jadwal:** Minggu 3, Rabu sampai Jumat, 9 sampai 11 Des.
**SOP:** 08, 03, 05, 16, 18. **Alat:** `supabase-rls-policies` (bucket), Impeccable `adapt` dan `optimize`.

**Spesifikasi teknis**
- Buat Storage Bucket `post-media` di Supabase dengan policy publik baca dan upload khusus authenticated user.
- Tambah kolom `media_urls` (text[]) dan `media_type` (image / video) di `community_posts`.

**Spesifikasi antarmuka**
- Dropzone upload di form Create Post dengan preview gambar/video sebelum diposting.
- Kompresi gambar sisi client sebelum upload agar hemat kuota.
- Lightbox modal saat foto diklik di feed, dan video player bersih dengan kontrol standar. Lightbox adalah pengecualian yang diizinkan untuk modal tengah layar.

**Definition of Done**
- User bisa mengunggah foto setup atau klip gameplay pendek (maks. 15 sampai 30 MB) dan langsung tampil tajam di feed.

## 2.3 Integrated Backsound Audio
**Estimasi:** 2 hari. **Jadwal:** Minggu 4, Senin sampai Selasa, 14 sampai 15 Des.
**SOP:** 08, 06, 18. **Alat:** `supabase-rls-policies` (bucket), Impeccable `animate`.

**Spesifikasi teknis**
- Buat Storage Bucket `audio-tracks` berisi koleksi musik bebas hak cipta (royalty-free).
- Tambah kolom `audio_url` dan `audio_title` di `community_posts`.

**Spesifikasi antarmuka**
- Tombol "Tambah Backsound" saat upload postingan foto.
- Mini audio bar di kartu postingan dengan tombol Play/Pause dan judul lagu yang bergulir.

**Definition of Done**
- Postingan foto showcase bisa diputar dengan musik latar tanpa mengganggu alur scroll feed.

## 2.4 Gaming LFG (Mabar) & Benchmark Widget
**Estimasi:** 3 hari. **Jadwal:** Minggu 4, Rabu sampai Jumat, 16 sampai 18 Des.
**SOP:** 09, 03, 06, 18. **Alat:** `postgresql-code-review`, Impeccable `critique`.

**Spesifikasi teknis**
- Tambah tipe postingan opsional `is_lfg` (boolean) dan metadata JSON `lfg_details` (game, rank, slots_needed, status).

**Spesifikasi antarmuka**
- Widget "Active Mabar Lobbies" di sidebar kanan.
- Kartu LFG punya tombol cepat "Gabung / DM Host" yang langsung membuka room DM dengan template pesan otomatis ("Halo, slot mabar masih ada?").

**Catatan implementasi**
- Jika "Gabung / DM Host" membuat percakapan baru sekaligus pesan template, lakukan atomik lewat satu fungsi RPC.
- Pengurangan slot saat ada yang bergabung memakai update kondisional atau RPC agar tidak melebihi `slots_needed`.

**Definition of Done**
- Gamer bisa bikin ajakan mabar dan langsung terhubung ke ruang obrolan DM hanya dengan 1 klik.

---

# Fase 3: Arsitektur E-Commerce (/market) & Preset Setup

Fokus: membangun etalase produk terdedikasi yang profesional untuk monetisasi rakitan PC dan produk kurasi.

## 3.1 Skema Database Katalog (products)
**Estimasi:** 2 hari. **Jadwal:** Minggu 5, Senin sampai Selasa, 21 sampai 22 Des.
**SOP:** 08, 09, 18. **Alat:** `supabase-rls-policies`, `postgresql-code-review`.

**Spesifikasi teknis**
- Buat tabel `products` (`id`, `slug` [unique], `title`, `description`, `price`, `category`, `seller_type` ['vicitech', 'partner'], `specs` [jsonb], `images` [text[]], `stock_status`, `created_at`).
- Amankan RLS: publik bisa SELECT, hanya admin ViciTech yang bisa INSERT/UPDATE/DELETE.

**Spesifikasi antarmuka**
- Halaman Admin sederhana (`/admin/products`) atau input via Supabase dashboard untuk menambah dan mengedit produk dengan cepat.
- Form tambah dan edit produk di halaman admin memakai Side Drawer di desktop.

**Definition of Done**
- Data produk tersimpan rapi dengan spesifikasi fleksibel (bisa menyesuaikan spek PC, laptop, maupun komponen satuan).

## 3.2 Etalase Utama (/market) & Kategori (/market/[category])
**Estimasi:** 3 hari. **Jadwal:** Minggu 5, Rabu sampai Jumat, 23 sampai 25 Des.
**SOP:** 03, 04, 18. **Alat:** skill `cro`, UI/UX Pro Max (`--domain ux` dan `product`), Impeccable `critique` dan `polish`.

**Spesifikasi teknis**
- Query filtering dinamis berdasarkan kategori (pc-build, laptop, smartphone, component), rentang harga (`min_price`, `max_price`), dan pencarian kata kunci.

**Spesifikasi antarmuka**
- Hero banner promo rakitan ViciTech.
- Grid kartu produk responsif menampilkan foto utama, harga format Rupiah, badge penjual (Official ViciTech vs Mitra), dan spesifikasi inti.
- Sidebar filter harga dan kategori di desktop. Di mobile, filter tampil sebagai Bottom Sheet.

**Definition of Done**
- User bisa menyaring produk berdasarkan kategori dan budget dengan hasil instan.

## 3.3 Product Detail Page (/market/product/[slug])
**Estimasi:** 3 hari. **Jadwal:** Minggu 6, Senin sampai Rabu, 28 sampai 30 Des.
**SOP:** 03, 15, 18. **Alat:** skill `schema` (JSON-LD Product), `seo-audit`, `cro`.

**Spesifikasi teknis**
- Dynamic routing Next.js berdasarkan slug.
- Query relasi produk serupa (Related Products) berdasarkan kategori yang sama.

**Spesifikasi antarmuka**
- Galeri foto interaktif (thumbnail di bawah/samping).
- Tabel spesifikasi teknis lengkap yang dirender otomatis dari kolom `specs` JSON.
- Tombol CTA utama: "Konsultasi & Pesan via DM" (untuk rakitan ViciTech) atau "Beli di Toko Mitra" (untuk barang endorse).

**Definition of Done**
- Setiap produk memiliki halaman khusus yang lengkap, informatif, dan siap dibagikan URL-nya.

## 3.4 Preset Setup & Creator Verdict Badge
**Estimasi:** 2 hari. **Jadwal:** Minggu 6, Kamis sampai Jumat, 31 Des sampai 1 Jan.
**SOP:** 13, 03, 18. **Alat:** skill `copywriting`, `humanizer`.

**Spesifikasi teknis**
- Tambah kolom di `products`: `is_preset` (boolean), `preset_components` (jsonb), `reviewed_by_name` (text), `reviewed_by_avatar` (text), `review_quote` (text).

**Spesifikasi antarmuka**
- Pill badge "Reviewed by [Nama Kreator]" di kartu etalase. Tanda centang memakai ikon SVG dari library ikon proyek, bukan karakter Unicode.
- Creator Verdict Box di halaman detail produk: foto reviewer, kutipan ulasan, dan rincian daftar komponen penyusun paket rakitan.

**Definition of Done**
- Pembeli bisa melihat daftar lengkap komponen dalam satu paket rakitan beserta validasi dari kreator/teknisi.

---

# Fase 4: Integrasi Eksternal, Peta Mitra & Mesin Virality

Fokus: menghubungkan ViciTech dengan ekosistem luar (YouTube, Google Maps, dan media sosial).

## 4.1 YouTube Embed Integration
**Estimasi:** 2 hari. **Jadwal:** Minggu 7, Senin sampai Selasa, 4 sampai 5 Jan.
**SOP:** 03, 05, 18. **Alat:** Impeccable `adapt`.

**Spesifikasi teknis**
- Tambah kolom `youtube_url` di `community_posts` dan `review_video_url` di `products`.
- Buat fungsi helper untuk mengekstrak `video_id` dari berbagai format URL YouTube (`youtu.be`, `youtube.com/watch`, shorts).

**Spesifikasi antarmuka**
- Komponen `YouTubeEmbed` responsif (rasio 16:9).
- Di Community Feed: video langsung bisa diputar di dalam kartu postingan.
- Di Product Detail Page: video benchmark / review kreator tampil di tab khusus "Video Review & FPS Test".

**Definition of Done**
- Video YouTube ter-render otomatis tanpa merusak layout di desktop maupun mobile.

## 4.2 Direktori Mitra & Google Maps (/partners)
**Estimasi:** 4 hari. **Jadwal:** Minggu 7 Rabu sampai Minggu 8 Senin, 6 sampai 11 Jan.
**SOP:** 08, 03, 15, 18. **Alat:** `supabase-rls-policies`, skill `schema` (LocalBusiness), `seo-audit`.

**Spesifikasi teknis**
- Buat tabel `partners` (`id`, `name`, `type` ['toko_komponen', 'service_center'], `address`, `city`, `gmaps_url`, `latitude`, `longitude`, `is_verified`, `whatsapp_number`).

**Spesifikasi antarmuka**
- Halaman `/partners` berisi daftar toko komponen dan tempat servis terpercaya.
- Filter berdasarkan kota dan jenis layanan.
- Embed peta lokasi interaktif, tombol "Buka di Google Maps" dan "Chat Teknisi".

**Definition of Done**
- User yang mengalami kerusakan hardware bisa langsung menemukan tempat servis terverifikasi di kotanya.

## 4.3 Cross-Platform Social Share & Dynamic OG
**Estimasi:** 3 hari. **Jadwal:** Minggu 8, Selasa sampai Kamis, 12 sampai 14 Jan. Jumat 15 Jan = buffer dan tes Fase 4.
**SOP:** 15, 13, 18. **Alat:** skill `schema`, `seo-audit`, `social`, `launch`.

**Spesifikasi teknis**
- Implementasi fungsi `generateMetadata` di `app/market/product/[slug]/page.tsx` dan `app/post/[id]/page.tsx` untuk menyuntikkan Open Graph tags (`og:title`, `og:image`, `og:description`).

**Spesifikasi antarmuka**
- Komponen tombol Share universal.
- Mobile: memanggil `navigator.share()` (menu share bawaan HP).
- Desktop: Anchored Popover (bukan modal) berisi tombol share langsung ke WhatsApp, X, Telegram, dan Copy Link dengan toast notifikasi. Jika `navigator.share()` tidak tersedia di mobile, tampilkan Bottom Sheet.

**Definition of Done**
- Saat link produk atau postingan ViciTech ditempel di WhatsApp/Discord, langsung muncul preview gambar dan judul produk secara otomatis.

---

# Fase 5: Audit Keamanan, Optimasi & Kesiapan Kompetisi

Fokus: memastikan aplikasi tahan banting saat dites banyak orang dan siap dipresentasikan ke juri lomba atau mitra bisnis.

## 5.1 Audit Keamanan RLS & Validasi Input
**Estimasi:** 3 hari. **Jadwal:** Minggu 9, Senin sampai Rabu, 18 sampai 20 Jan.
**SOP:** 10, 08, 18. **Alat:** skill `security-audit` (jalankan di branch terpisah dan sisakan waktu membaca hasil), `supabase-rls-policies`.

**Spesifikasi teknis**
- Periksa ulang seluruh Row Level Security (RLS) di tabel `profiles`, `community_posts`, `messages`, `notifications`, `products`, dan `partners`.
- Batasi ukuran maksimal file di Supabase Storage agar tidak disalahgunakan.
- Sanitasi input teks pada form komentar dan postingan untuk mencegah error rendering.
- Penanganan halaman error kustom (`not-found.tsx` dan `error.tsx`).

**Definition of Done**
- Tidak ada user yang bisa mengedit/menghapus postingan, produk, atau membaca DM milik orang lain.

## 5.2 Optimasi Performa & Responsivitas Mobile
**Estimasi:** 3 hari. **Jadwal:** Minggu 9 Kamis sampai Minggu 10 Senin, 21 sampai 25 Jan.
**SOP:** 16, 05, 04, 18. **Alat:** Impeccable `audit`, `harden`, `adapt`, `optimize`; UI/UX Pro Max (checklist sebelum rilis); `postgresql-optimization`.

**Spesifikasi teknis dan antarmuka**
- Implementasi `next/image` atau atribut `loading="lazy"` pada semua gambar feed dan katalog.
- Pagination / Infinite Scroll pada Community Feed agar tidak memuat ratusan postingan sekaligus.
- Uji tampilan di layar kecil (360 sampai 414px) untuk memastikan tidak ada elemen terpotong atau horizontal overflow.

**Definition of Done**
- Skor performa loading cepat dan tampilan di HP sama nyamannya dengan di laptop.

## 5.3 Data Seeding & Pitching Readiness
**Estimasi:** 3 hari. **Jadwal:** Minggu 10, Selasa sampai Kamis, 26 sampai 28 Jan. Jumat 29 Jan = gladi resik demo.
**SOP:** 17, 13, 18. **Alat:** `humanizer`, `community-marketing`, `social`, `launch`; huashu-design jika membuat deck atau video demo.

**Spesifikasi teknis**
- Isi database dengan data realistis: minimal 5 Preset Setup lengkap dengan spek JSON dan video benchmark; minimal 10 postingan komunitas lintas kategori; minimal 5 data toko mitra dan service center.
- Siapkan 2 akun demo siap pakai (User Biasa dan Verified Builder) untuk simulasi real-time DM dan notifikasi saat demonstrasi langsung di depan juri/mitra.

**Definition of Done**
- Platform terlihat hidup, profesional, dan siap didemonstrasikan kapan saja tanpa bergantung pada data kosong.

---

# Catatan Keputusan dan Pertanyaan Terbuka

**Keputusan**
- Modul 1.4 (Welcome Page) adalah tambahan baru. Penomoran 1.1 sampai 1.3 tidak diubah.
- Rute `/` ditambahkan ke struktur rute 1.2.
- OG statis dipasang di `/` (1.4); OG dinamis per produk dan postingan di 4.3.
- Tanda centang pada badge "Reviewed by" memakai ikon SVG, bukan karakter Unicode.
- Hero (1.4) memakai tombol jeda/putar karena konten bergerak otomatis lebih dari 5 detik (WCAG 2.2.2).
- Spesifikasi awal menyebut modal untuk tombol share (4.3) dan sidebar filter (3.2). Diganti Anchored Popover dan Bottom Sheet sesuai aturan overlay di `CODING_STANDARDS.md` bagian 9. Lightbox media (2.2) tetap modal.
- Tulis lintas tabel yang wajib atomik memakai RPC, dan tipe database selalu hasil generate Supabase.

**Pertanyaan terbuka (konfirmasi sebelum modul terkait)**
- Tailwind sudah terkonfirmasi. Versi mayornya v3 atau v4, dan apakah shadcn/ui terpasang? (1.2, 1.4)
- Versi Next.js yang terpasang: prop gambar LCP bernama `priority` atau `preload`? (1.4)
- Apakah `lucide-react` sudah terpasang dan file di `public/images/hero/` sudah ada? (1.4)
- Nama rute login dan daftar yang dipakai CTA Welcome Page. (1.4)
- Siapa yang boleh menulis ke tabel `partners` dan bucket `audio-tracks`? Asumsi: hanya admin ViciTech. (2.3, 4.2)
