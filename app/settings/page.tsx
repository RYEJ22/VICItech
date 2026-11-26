import type { Metadata } from 'next';
import { SettingsPageHeader } from '@/components/i18n/LocalizedRouteHeaders';
import { SettingsHub } from '@/components/settings/SettingsHub';

export const metadata: Metadata = {
  title: 'Pengaturan & Privasi | ViciTech',
  description:
    'Atur preferensi tampilan, aksesibilitas (kontras tinggi, skala teks, kurangi gerakan), serta kontrol privasi & data pribadi (UU PDP) di ViciTech OS.',
};

export default function SettingsPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 pb-24 pt-8 sm:px-6 lg:px-8 lg:pt-10">
      <SettingsPageHeader />

      <div className="mt-8">
        <SettingsHub />
      </div>
    </main>
  );
}
