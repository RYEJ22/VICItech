import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import { PartnersDirectory } from '@/components/features/partners/partners-directory';
import { buildSupabasePartnersJsonLd, JsonLd } from '@/components/features/seo/json-ld';
import { PartnersPageHeader } from '@/components/i18n/LocalizedRouteHeaders';
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
      <PartnersPageHeader verifiedCount={verifiedCount} />

      <section aria-label="Direktori mitra ViciTech" className="mt-8">
        <PartnersDirectory initialPartners={partners} initialError={error} />
      </section>
    </main>
  );
}
