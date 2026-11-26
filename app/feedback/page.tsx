import type { Metadata } from 'next';
import Link from 'next/link';
import { ClipboardCheck, Lock, ShieldCheck, Sparkles } from 'lucide-react';
import { FeedbackForm } from '@/components/feedback/FeedbackForm';

export const metadata: Metadata = {
  title: 'Umpan Balik & Validasi Pengguna | ViciTech',
  description:
    'Sampaikan saran fitur, laporan bug, atau testimoni pengalaman Anda menggunakan ekosistem ViciTech OS.',
};

export default function FeedbackPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 pb-28 pt-8 sm:px-6 lg:px-8 lg:pt-12">
      <header className="max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#EA580C]">
          Validasi Pengguna ViciTech OS
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#18181B] sm:text-4xl">
          Umpan Balik &amp; Laporan Uji Coba
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[#52525B] sm:text-base">
          Bantu kami menyempurnakan Smart Preset Builder, Bottleneck Analyzer, Upgrade Analyzer,
          Market, dan Konsultan AI. Setiap laporan Anda menjadi bukti validasi pengembangan ViciTech.
        </p>
      </header>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(260px,0.75fr)]">
        <FeedbackForm />

        <aside aria-label="Informasi pengelolaan umpan balik" className="space-y-4">
          <div className="rounded-2xl border border-[#E4E4E7] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#FFF7ED] text-[#EA580C]">
                <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
              </span>
              <h2 className="text-sm font-bold text-[#18181B]">Bagaimana Masukan Diproses?</h2>
            </div>
            <ul className="mt-3 space-y-2.5 text-xs leading-relaxed text-[#52525B]">
              <li className="flex gap-2">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#EA580C]" aria-hidden="true" />
                <span>
                  <strong className="font-semibold text-[#18181B]">Saran Fitur &amp; Testimoni</strong>{' '}
                  menjadi dasar prioritas roadmap rilis ViciTech berikutnya.
                </span>
              </li>
              <li className="flex gap-2">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#EA580C]" aria-hidden="true" />
                <span>
                  <strong className="font-semibold text-[#18181B]">Laporan Bug</strong> diverifikasi
                  oleh tim teknis berdasarkan modul yang Anda pilih.
                </span>
              </li>
              <li className="flex gap-2">
                <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#EA580C]" aria-hidden="true" />
                <span>
                  <strong className="font-semibold text-[#18181B]">Privasi Terjaga</strong> — data
                  masukan dibatasi aksesnya hanya untuk admin terverifikasi.
                </span>
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-[#E4E4E7] bg-[#FAF9F6] p-5">
            <h2 className="text-sm font-bold text-[#18181B]">Pelindungan Data Pribadi (UU PDP)</h2>
            <p className="mt-1.5 text-xs leading-relaxed text-[#52525B]">
              Pengisian nama atau kontak bersifat opsional. Anda juga dapat menggunakan formulir ini
              untuk mengajukan permintaan akses, koreksi, atau penghapusan data pribadi maupun
              penghapusan konten di Komunitas.
            </p>
            <Link
              href="/cookies"
              className="mt-3 inline-flex min-h-9 items-center text-xs font-semibold text-[#C2410C] underline underline-offset-2 hover:text-[#EA580C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]/60 rounded"
            >
              Baca Kebijakan Cookie &amp; Privasi (UU PDP)
            </Link>
          </div>
        </aside>
      </div>
    </main>
  );
}
