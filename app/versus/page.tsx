import type { Metadata } from 'next';
import { VersusRouteView } from '@/components/vicitech/StandaloneModuleHost';
import { listMarketProducts } from '@/lib/market/products';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Versus Arena | ViciTech',
  description:
    'Bandingkan spesifikasi CPU, GPU, rakitan PC, laptop, dan smartphone secara berdampingan lengkap dengan analisis nilai performa.',
  alternates: {
    canonical: '/versus',
  },
};

export default async function VersusPage() {
  const { products } = await listMarketProducts();

  return <VersusRouteView marketProducts={products} />;
}
