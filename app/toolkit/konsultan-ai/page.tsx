import type { Metadata } from 'next';
import { ViciChatInterface } from '@/components/ai/ViciChatInterface';
import { ConsultationPresets } from '@/components/ai/ConsultationPresets';
import {
  KonsultanAiDisclaimer,
  KonsultanAiPageHeader,
} from '@/components/i18n/LocalizedRouteHeaders';

export const metadata: Metadata = {
  title: 'Konsultan Rakitan AI | ViciTech',
  description: 'Konsultasi rakitan PC, upgrade laptop, dan layanan ViciTech bersama AI.',
};

export default function KonsultanAiPage() {
  return <main className="mx-auto max-w-7xl px-4 pb-24 pt-8 sm:px-6 lg:px-8 lg:pt-12">
    <KonsultanAiPageHeader />
    <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(240px,0.72fr)_minmax(0,1.6fr)]">
      <ConsultationPresets />
      <div className="min-w-0"><ViciChatInterface variant="page" /><KonsultanAiDisclaimer /></div>
    </div>
  </main>;
}
