import type { Metadata } from 'next';
import { BottleneckRouteView } from '@/components/vicitech/StandaloneModuleHost';
import { listMarketProducts } from '@/lib/market/products';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Bottleneck Analyzer | ViciTech',
  description:
    'Hitung keseimbangan performa CPU, GPU, dan RAM untuk skenario gaming atau rendering serta dapatkan rekomendasi penyeimbangan komponen.',
  alternates: {
    canonical: '/bottleneck',
  },
};

export default async function BottleneckPage() {
  const { products } = await listMarketProducts();
  return <BottleneckRouteView marketProducts={products} />;
}
