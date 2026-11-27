import type { Metadata } from 'next';
import { ViciChatInterface } from '@/components/ai/ViciChatInterface';
import { ConsultationPresets } from '@/components/ai/ConsultationPresets';
import {
  KonsultanAiDisclaimer,
  KonsultanAiPageHeader,
} from '@/components/i18n/LocalizedRouteHeaders';
import chatStyles from '@/components/ai/vici-chat.module.css';

export const metadata: Metadata = {
  title: 'Konsultan Rakitan AI | ViciTech',
  description: 'Konsultasi rakitan PC, upgrade laptop, dan layanan ViciTech bersama AI.',
};

export default function KonsultanAiPage() {
  return (
    <main
      className={`${chatStyles.pageMain} box-border mx-auto flex w-full max-w-7xl min-w-0 flex-col overflow-x-clip px-3 pb-2 pt-3 sm:px-6 sm:pb-4 sm:pt-6 lg:px-8 lg:pb-12 lg:pt-10`}
    >
      <KonsultanAiPageHeader />
      <div className="mt-2.5 flex min-h-0 flex-1 flex-col gap-2.5 sm:mt-4 sm:gap-4 lg:mt-8 lg:grid lg:flex-none lg:grid-cols-[minmax(240px,0.72fr)_minmax(0,1.6fr)] lg:items-start lg:gap-6">
        <ConsultationPresets />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:block">
          <ViciChatInterface variant="page" />
          <KonsultanAiDisclaimer />
        </div>
      </div>
    </main>
  );
}
