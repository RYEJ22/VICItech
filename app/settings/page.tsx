import type { Metadata } from 'next';
import { SettingsHub } from '@/components/settings/SettingsHub';

export const metadata: Metadata = {
  title: 'Pengaturan & Privasi | ViciTech',
  description:
    'Atur preferensi tampilan, aksesibilitas (kontras tinggi, skala teks, kurangi gerakan), serta kontrol privasi & data pribadi (UU PDP) di ViciTech OS.',
};

export default function SettingsPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 pb-24 pt-8 sm:px-6 lg:px-8 lg:pt-12">
      <header className="max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#EA580C]">
          Pusat Pengaturan ViciTech OS
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#18181B] sm:text-4xl">
          Pengaturan &amp; Privasi Akun
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[#52525B] sm:text-base">
          Sesuaikan kenyamanan visual, aksesibilitas antarmuka, serta hak pelindungan data pribadi
          Anda dalam satu tempat.
        </p>
      </header>

      <div className="mt-8">
        <SettingsHub />
      </div>
    </main>
  );
}
