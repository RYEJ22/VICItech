import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Clock,
  Cookie,
  Database,
  FileCheck2,
  MessageSquareWarning,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { CookiePreferencesPanel } from '@/components/cookies/CookiePreferencesPanel';

export const metadata: Metadata = {
  title: 'Kebijakan Cookie & Privasi (UU PDP) | ViciTech',
  description:
    'Kebijakan penggunaan cookie, pelindungan data pribadi sesuai UU No. 27 Tahun 2022 (UU PDP), retensi data, moderasi komunitas, dan hak pengguna di ViciTech.',
};

export default function CookiesAndPrivacyPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 pb-28 pt-8 sm:px-6 lg:px-8 lg:pt-12">
      <header className="max-w-3xl">
        <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.18em] text-[#EA580C]">
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          Kepatuhan UU No. 27 Tahun 2022 (UU PDP)
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#18181B] sm:text-4xl">
          Kebijakan Cookie &amp; Pelindungan Data Pribadi
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[#52525B] sm:text-base">
          ViciTech berkomitmen melindungi data pribadi pengguna secara transparan sesuai{' '}
          <strong className="font-semibold text-[#18181B]">
            Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP)
          </strong>
          . Halaman ini menjelaskan bagaimana kami menggunakan cookie, memproses data, dan menjamin
          hak privasi Anda.
        </p>
      </header>

      <div className="mt-8 space-y-6">
        <CookiePreferencesPanel />

        <div className="grid gap-6 md:grid-cols-2">
          <article className="rounded-2xl border border-[#E4E4E7] bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#FFF7ED] text-[#EA580C]">
                <Database className="h-4 w-4" aria-hidden="true" />
              </span>
              <h2 className="text-base font-bold text-[#18181B]">
                1. Tujuan Pengumpulan &amp; Pemrosesan Data
              </h2>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-[#52525B]">
              ViciTech hanya mengumpulkan data yang relevan dan proporsional untuk menjalankan
              layanan ekosistem Circular IT, meliputi:
            </p>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-[#52525B]">
              <li>Autentikasi akun, profil publik, dan keamanan akses pengguna.</li>
              <li>
                Pemrosesan pesanan Market, verifikasi pembayaran, garansi, serta penerbitan catatan
                IoT QC.
              </li>
              <li>
                Penyimpanan draft Smart Preset Builder, riwayat konsultasi AI, dan preferensi
                antarmuka.
              </li>
              <li>
                Interaksi sosial pada Komunitas, Pesan Langsung (DM), serta peninjauan laporan
                validasi pengguna di{' '}
                <Link
                  href="/feedback"
                  className="font-semibold text-[#C2410C] underline underline-offset-2 hover:text-[#EA580C]"
                >
                  /feedback
                </Link>
                .
              </li>
            </ul>
          </article>

          <article className="rounded-2xl border border-[#E4E4E7] bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#FFF7ED] text-[#EA580C]">
                <Cookie className="h-4 w-4" aria-hidden="true" />
              </span>
              <h2 className="text-base font-bold text-[#18181B]">
                2. Kategori Cookie &amp; Penyimpanan Lokal
              </h2>
            </div>
            <div className="mt-3 space-y-3 text-sm leading-relaxed text-[#52525B]">
              <div className="rounded-xl border border-[#EEEAE5] bg-[#FAF9F6] p-3.5">
                <p className="font-semibold text-[#18181B]">Esensial (Wajib Aktif)</p>
                <p className="mt-1 text-xs leading-relaxed text-[#52525B]">
                  Menjaga sesi masuk (auth session), perlindungan keamanan permintaan, isi keranjang
                  belanja, serta penyimpanan pilihan persetujuan cookie (
                  <code className="font-mono text-[#18181B]">vici_cookie_consent</code>).
                </p>
              </div>
              <div className="rounded-xl border border-[#EEEAE5] bg-[#FAF9F6] p-3.5">
                <p className="font-semibold text-[#18181B]">Preferensi &amp; Analitik (Opsional)</p>
                <p className="mt-1 text-xs leading-relaxed text-[#52525B]">
                  Menyimpan draft rakitan PC, filter modul, serta pengukuran performa antarmuka
                  secara agregat. Kategori ini hanya aktif berdasarkan persetujuan eksplisit Anda.
                </p>
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-[#E4E4E7] bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#FFF7ED] text-[#EA580C]">
                <Clock className="h-4 w-4" aria-hidden="true" />
              </span>
              <h2 className="text-base font-bold text-[#18181B]">3. Batas Retensi Data</h2>
            </div>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[#52525B]">
              <li>
                <strong className="font-semibold text-[#18181B]">Data Akun &amp; Profil:</strong>{' '}
                Disimpan selama akun aktif atau hingga pengguna mengajukan permintaan penghapusan
                akun.
              </li>
              <li>
                <strong className="font-semibold text-[#18181B]">
                  Data Transaksi &amp; Garansi IoT QC:
                </strong>{' '}
                Disimpan maksimal 5 tahun atau mengikuti masa berlaku garansi serta kewajiban
                pembukuan sesuai peraturan perundang-undangan Indonesia.
              </li>
              <li>
                <strong className="font-semibold text-[#18181B]">
                  Preferensi Lokal &amp; Sesi Chat AI:
                </strong>{' '}
                Tersimpan di peramban perangkat Anda dan dapat dibersihkan kapan saja melalui tombol{' '}
                <em>Reset Obrolan</em> atau pengaturan browser.
              </li>
              <li>
                <strong className="font-semibold text-[#18181B]">Data Umpan Balik (/feedback):</strong>{' '}
                Disimpan maksimal 12 bulan untuk evaluasi kualitas produk, lalu dianonimkan atau
                dihapus secara berkala.
              </li>
            </ul>
          </article>

          <article className="rounded-2xl border border-[#E4E4E7] bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#FFF7ED] text-[#EA580C]">
                <MessageSquareWarning className="h-4 w-4" aria-hidden="true" />
              </span>
              <h2 className="text-base font-bold text-[#18181B]">
                4. Kebijakan Penghapusan Konten di /community
              </h2>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-[#52525B]">
              Untuk menjaga ruang diskusi teknis yang aman dan patuh terhadap UU PDP, ViciTech
              menerapkan mekanisme penghapusan konten berikut pada{' '}
              <Link
                href="/community"
                className="font-semibold text-[#C2410C] underline underline-offset-2 hover:text-[#EA580C]"
              >
                /community
              </Link>
              :
            </p>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-[#52525B]">
              <li>
                Pengguna berhak menghapus postingan atau komentar miliknya sendiri secara langsung.
              </li>
              <li>
                ViciTech berhak menurunkan konten yang mempublikasikan data pribadi pihak lain tanpa
                izin (<em>doxxing</em>), nomor telepon/alamat pribadi, penipuan, spam, atau melanggar
                hukum.
              </li>
              <li>
                Permintaan peninjauan atau penghapusan konten bermasalah dapat dikirimkan melalui{' '}
                <Link
                  href="/feedback"
                  className="font-semibold text-[#C2410C] underline underline-offset-2 hover:text-[#EA580C]"
                >
                  halaman Umpan Balik
                </Link>{' '}
                dan akan ditindaklanjuti maksimal 3×24 jam kerja.
              </li>
            </ul>
          </article>
        </div>

        <article className="rounded-2xl border border-[#E4E4E7] bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#FFF7ED] text-[#EA580C]">
              <UserCheck className="h-4 w-4" aria-hidden="true" />
            </span>
            <h2 className="text-base font-bold text-[#18181B]">
              5. Hak Subjek Data Pribadi Anda (UU PDP)
            </h2>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-[#52525B]">
            Sesuai ketentuan Pasal 5 hingga Pasal 13 UU No. 27 Tahun 2022 tentang Pelindungan Data
            Pribadi, Anda memiliki hak penuh atas data pribadi Anda di ViciTech:
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-[#EEEAE5] bg-[#FAF9F6] p-4">
              <p className="text-sm font-semibold text-[#18181B]">Hak Akses Data</p>
              <p className="mt-1 text-xs leading-relaxed text-[#52525B]">
                Memperoleh kejelasan identitas, dasar pemrosesan, serta salinan data pribadi Anda
                yang tersimpan di sistem ViciTech.
              </p>
            </div>
            <div className="rounded-xl border border-[#EEEAE5] bg-[#FAF9F6] p-4">
              <p className="text-sm font-semibold text-[#18181B]">Hak Koreksi &amp; Pembaruan</p>
              <p className="mt-1 text-xs leading-relaxed text-[#52525B]">
                Memperbarui atau memperbaiki ketidakakuratan data profil Anda secara mandiri melalui{' '}
                <Link
                  href="/profile"
                  className="font-semibold text-[#C2410C] underline underline-offset-2 hover:text-[#EA580C]"
                >
                  /profile
                </Link>
                .
              </p>
            </div>
            <div className="rounded-xl border border-[#EEEAE5] bg-[#FAF9F6] p-4">
              <p className="text-sm font-semibold text-[#18181B]">
                Hak Penghapusan &amp; Penarikan Persetujuan
              </p>
              <p className="mt-1 text-xs leading-relaxed text-[#52525B]">
                Menarik persetujuan cookie opsional kapan saja di halaman ini atau mengajukan
                penghapusan data akun secara permanen.
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#EEEAE5] bg-[#FAF9F6] p-4">
            <div className="flex items-start gap-2.5">
              <FileCheck2 className="mt-0.5 h-4 w-4 shrink-0 text-[#EA580C]" aria-hidden="true" />
              <p className="text-xs leading-relaxed text-[#52525B]">
                Untuk permintaan resmi terkait akses, koreksi, atau penghapusan data pribadi (UU
                PDP), silakan ajukan melalui formulir validasi dengan kategori{' '}
                <strong className="font-semibold text-[#18181B]">Lainnya</strong>.
              </p>
            </div>
            <Link
              href="/feedback"
              className="vt-motion-press inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl bg-[#EA580C] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#C2410C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]/60 focus-visible:ring-offset-2"
            >
              Ajukan Permintaan Data
            </Link>
          </div>
        </article>
      </div>
    </main>
  );
}
