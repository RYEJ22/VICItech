import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import { SiteFooter } from '@/components/features/footer/site-footer';
import { PartnerWorkspace } from '@/components/features/partner/partner-workspace';
import { listPublicPartners } from '@/lib/partners/partners';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Portal Mitra & Katalog Partner | ViciTech OS',
  description:
    'Tambah produk mitra dengan atribusi otomatis ke Market ViciTech dan pantau status keuangan mitra secara read-only.',
};

export default async function PartnerWorkspacePage(): Promise<ReactElement> {
  const { partners } = await listPublicPartners(60);

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-primary antialiased">
      <main className="min-w-0 flex-1 overflow-x-clip">
        <PartnerWorkspace initialPartners={partners} />
      </main>
      <SiteFooter />
    </div>
  );
}
