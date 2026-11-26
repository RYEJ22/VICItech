import type { Metadata } from 'next';
import { ViciChatInterface } from '@/components/ai/ViciChatInterface';
import { ConsultationPresets } from '@/components/ai/ConsultationPresets';

export const metadata: Metadata = {
  title: 'Konsultan Rakitan AI | ViciTech',
  description: 'Konsultasi rakitan PC, upgrade laptop, dan layanan ViciTech bersama AI.',
};

export default function KonsultanAiPage() {
  return <main className="mx-auto max-w-7xl px-4 pb-24 pt-8 sm:px-6 lg:px-8 lg:pt-12">
    <div className="max-w-3xl">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent-primary">Toolkit ViciTech</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-primary [text-wrap:balance] sm:text-4xl">Konsultan Rakitan AI</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-secondary sm:text-base">Temukan arah rakitan PC, cek opsi upgrade laptop, dan pahami layanan ViciTech bersama konsultan hardware.</p>
    </div>
    <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(240px,0.72fr)_minmax(0,1.6fr)]">
      <ConsultationPresets />
      <div className="min-w-0"><ViciChatInterface variant="page" /><p className="mt-3 px-1 text-xs leading-5 text-secondary">Ketersediaan dan harga perangkat mengikuti katalog ViciTech Market saat konsultasi dimulai.</p></div>
    </div>
  </main>;
}
