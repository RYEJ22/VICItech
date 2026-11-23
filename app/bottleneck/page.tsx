import type { Metadata } from 'next';
import { BottleneckRouteView } from '@/components/vicitech/StandaloneModuleHost';

export const metadata: Metadata = {
  title: 'Bottleneck Analyzer | ViciTech',
  description:
    'Hitung keseimbangan performa CPU, GPU, dan RAM untuk skenario gaming atau rendering serta dapatkan rekomendasi penyeimbangan komponen.',
  alternates: {
    canonical: '/bottleneck',
  },
};

export default function BottleneckPage() {
  return <BottleneckRouteView />;
}
