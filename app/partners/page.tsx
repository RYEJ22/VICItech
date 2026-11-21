import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, MapPin, MessageSquare, ShieldCheck } from 'lucide-react';
import type { ReactElement } from 'react';
import {
  PARTNER_FILTERS,
  PARTNER_PREVIEW_ITEMS,
} from '@/components/features/route-preview/route-preview-content';
import { RoutePreviewExplorer } from '@/components/features/route-preview/route-preview-drawer';
import { buildPartnersLocalBusinessJsonLd, JsonLd } from '@/components/features/seo/json-ld';
import { ShareMenu } from '@/components/features/share/share-menu';

export const metadata: Metadata = {
  title: 'Service Center & Mitra Terverifikasi | ViciTech OS',
  description:
    'Direktori toko komponen dan pusat servis hardware terverifikasi ViciTech untuk rakitan PC, perbaikan laptop, dan Trade-In.',
  alternates: {
    canonical: '/partners',
  },
  openGraph: {
    title: 'Service Center & Mitra Terverifikasi | ViciTech OS',
    description:
      'Direktori toko komponen dan pusat servis hardware terverifikasi ViciTech untuk rakitan PC, perbaikan laptop, dan Trade-In.',
    url: '/partners',
    images: ['/images/hero/repair-tech.jpg'],
  },
};

export default function PartnersPage(): ReactElement {
  return (
    <main className="mx-auto min-h-[75vh] w-full max-w-7xl px-4 pb-24 pt-8 sm:px-6 sm:pt-12 md:pb-16">
      <JsonLd data={buildPartnersLocalBusinessJsonLd(PARTNER_PREVIEW_ITEMS)} />
      <section className="rounded-xl border border-default bg-surface p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="vt-badge-sample">Direktori Peta Fase 4 Segera Hadir · Sample Mitra</span>
          <Link
            href="/qc-panel"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-default bg-subtle px-3.5 py-2 text-xs font-medium text-primary transition hover:border-accent-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
          >
            <ShieldCheck className="h-4 w-4 text-status-live" strokeWidth={1.75} aria-hidden="true" />
            <span>Panel IoT QC Bench</span>
          </Link>
        </div>

        <h1 className="mt-5 font-serif text-3xl font-semibold tracking-tight text-primary [text-wrap:balance] sm:text-4xl lg:text-5xl">
          Toko komponen dan service center tepercaya.
        </h1>
        <p className="mt-3 max-w-[68ch] text-base leading-relaxed text-secondary">
          Peta Google Maps interaktif dan daftar mitra resmi dibuka pada Fase 4. Untuk kebutuhan
          servis mendesak, inspeksi IoT QC, atau pengajuan Trade-In sekarang, hubungi tim kami lewat
          pesan langsung atau buka portal Trade-In.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link
            href="/messages"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent-primary px-5 py-2.5 text-sm font-semibold text-primary transition hover:bg-accent-hover hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
          >
            <MessageSquare className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            <span>Chat Teknisi via DM</span>
          </Link>
          <Link
            href="/home?tab=tradein"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-default bg-subtle px-5 py-2.5 text-sm font-medium text-primary transition hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
          >
            <MapPin className="h-4 w-4 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
            <span>Ajukan Inspeksi Trade-In</span>
            <ArrowRight className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
          </Link>
          <ShareMenu
            title="Service Center & Mitra Terverifikasi ViciTech"
            text="Temukan toko komponen dan pusat servis hardware terverifikasi ViciTech."
            url="/partners"
            label="Bagikan Direktori"
          />
        </div>
      </section>

      <section aria-label="Pratinjau direktori mitra" className="mt-8">
        <RoutePreviewExplorer
          kind="partners"
          filters={PARTNER_FILTERS}
          items={PARTNER_PREVIEW_ITEMS}
          badgeText="Sample Mitra"
          drawerTitle="Direktori Mitra & Filter Kota"
          drawerDescription="Integrasi koordinat Google Maps dan nomor WhatsApp terverifikasi rilis di Fase 4. Saat ini Anda dapat memilih kota layanan untuk meninjau cakupan hub yang direncanakan."
          searchPlaceholder="Cari kota, hub QC Bandung, service center, atau lab B2S…"
        />
      </section>
    </main>
  );
}
