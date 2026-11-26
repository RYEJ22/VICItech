import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, MapPin, MessageSquare, ShieldCheck } from 'lucide-react';
import type { ReactElement } from 'react';
import { PartnersDirectory } from '@/components/features/partners/partners-directory';
import { buildSupabasePartnersJsonLd, JsonLd } from '@/components/features/seo/json-ld';
import { ShareMenu } from '@/components/features/share/share-menu';
import { listPublicPartners } from '@/lib/partners/partners';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Service Center & Mitra Terverifikasi | ViciTech',
  description:
    'Direktori toko komponen dan pusat servis hardware terverifikasi ViciTech untuk rakitan PC, perbaikan laptop, dan Trade-In.',
  alternates: {
    canonical: '/partners',
  },
  openGraph: {
    title: 'Service Center & Mitra Terverifikasi | ViciTech',
    description:
      'Direktori toko komponen dan pusat servis hardware terverifikasi ViciTech untuk rakitan PC, perbaikan laptop, dan Trade-In.',
    url: '/partners',
    images: ['/images/hero/repair-tech.jpg'],
  },
};

export default async function PartnersPage(): Promise<ReactElement> {
  const { partners, error } = await listPublicPartners();
  const verifiedCount = partners.filter((partner) => partner.is_verified).length;

  return (
    <main className="mx-auto min-h-[75vh] w-full max-w-7xl px-4 pb-24 pt-8 sm:px-6 sm:pt-12">
      <JsonLd data={buildSupabasePartnersJsonLd(partners)} />
      <section className="rounded-xl border border-default bg-surface p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {verifiedCount > 0 ? (
            <span className="vt-badge-live">{verifiedCount} Mitra Terverifikasi</span>
          ) : (
            <span className="vt-badge-live">Direktori Mitra ViciTech</span>
          )}
          <Link
            href="/qc-panel"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-default bg-subtle px-3.5 py-2 text-xs font-medium text-primary transition hover:border-accent-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
          >
            <ShieldCheck className="h-4 w-4 text-status-live" strokeWidth={1.75} aria-hidden="true" />
            <span>Panel IoT QC Bench</span>
          </Link>
        </div>

        <h1 className="mt-5 font-sans text-3xl font-bold tracking-tight text-primary [text-wrap:balance] sm:text-4xl lg:text-5xl">
          Toko komponen dan service center tepercaya.
        </h1>
        <p className="mt-3 max-w-[68ch] text-base leading-relaxed text-secondary">
          Temukan mitra perakitan PC, pusat perbaikan laptop, dan titik inspeksi fisik Trade-In
          terverifikasi di kota Anda. Hubungi teknisi kami lewat pesan langsung atau cek lokasi
          Google Maps masing-masing mitra di bawah ini.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link
            href="/messages"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent-cta px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-cta-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
          >
            <MessageSquare className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            <span>Chat Teknisi via DM</span>
          </Link>
          <Link
            href="/trade-in"
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

      <section aria-label="Direktori mitra ViciTech" className="mt-8">
        <PartnersDirectory initialPartners={partners} initialError={error} />
      </section>
    </main>
  );
}
