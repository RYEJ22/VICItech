import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import ViciTechApp from '@/components/vicitech/ViciTechApp';

export const metadata: Metadata = {
  title: 'Community Hub | ViciTech OS',
  description:
    'Diskusi hardware, showcase rakitan PC, troubleshooting, dan panduan komunitas ViciTech.',
  alternates: {
    canonical: '/community',
  },
  openGraph: {
    title: 'Community Hub | ViciTech OS',
    description:
      'Diskusi hardware, showcase rakitan PC, troubleshooting, dan panduan komunitas ViciTech.',
    url: '/community',
    images: ['/images/hero/pc-rig.jpg'],
  },
};

export default function CommunityPage(): ReactElement {
  return <ViciTechApp initialModule="community" />;
}
