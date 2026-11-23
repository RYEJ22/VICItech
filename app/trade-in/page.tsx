import type { Metadata } from 'next';
import { TradeInRouteView } from '@/components/vicitech/StandaloneModuleHost';

export const metadata: Metadata = {
  title: 'Trade-In & Refurbished | ViciTech',
  description:
    'Hitung estimasi tukar tambah perangkat IT satuan atau massal dan telusuri unit refurbished terverifikasi 15 titik inspeksi IoT QC.',
  alternates: {
    canonical: '/trade-in',
  },
};

export default function TradeInPage() {
  return <TradeInRouteView />;
}
