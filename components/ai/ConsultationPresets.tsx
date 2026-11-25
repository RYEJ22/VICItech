'use client';

import { Cpu, HardDrive, ShieldCheck, Wallet } from 'lucide-react';

const consultations = [
  { icon: Cpu, title: 'Rakit PC sesuai budget', description: 'Gaming, editing, atau kerja harian.', prompt: 'Bantu saya merakit PC sesuai budget dan kebutuhan. Tanyakan budget dan penggunaan saya terlebih dahulu.' },
  { icon: HardDrive, title: 'Cek upgrade laptop', description: 'Cari tahu potensi upgrade RAM dan SSD.', prompt: 'Saya ingin mengecek potensi upgrade RAM dan NVMe/SSD laptop. Informasi model apa yang perlu saya berikan?' },
  { icon: ShieldCheck, title: 'IoT QC & pembayaran', description: 'Pahami sertifikat, DP, dan Full Payment.', prompt: 'Jelaskan alur IoT Burn-In & Telemetry QC, sertifikat serial, dan opsi pembayaran DP atau Full Payment.' },
  { icon: Wallet, title: 'Pilih komponen', description: 'Tanya spesifikasi dan produk di katalog.', prompt: 'Bantu saya memilih komponen yang sesuai. Tanyakan kebutuhan dan kisaran anggaran saya.' },
];

export function ConsultationPresets() {
  return <aside className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1" aria-label="Topik konsultasi">
    {consultations.map(({ icon: Icon, title, description, prompt }) => <button key={title} type="button" onClick={() => window.dispatchEvent(new CustomEvent('vicitech:ai-prompt', { detail: prompt }))} className="vt-card-lift vt-motion-press flex min-h-[86px] items-start gap-3 rounded-2xl border border-[#E7E2DC] bg-white p-4 text-left shadow-sm transition-[transform,box-shadow,border-color] duration-motion-hover ease-natural hover:-translate-y-0.5 hover:border-[#EA580C]/35 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]/50">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#FFF7ED] text-[#C2410C]"><Icon size={19} aria-hidden="true" /></span>
      <span><span className="block text-sm font-bold text-[#18181B]">{title}</span><span className="mt-1 block text-xs leading-5 text-[#71717A]">{description}</span></span>
    </button>)}
  </aside>;
}
