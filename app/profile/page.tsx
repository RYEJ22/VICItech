import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import { ProfileAccountHub } from '@/components/features/profile/profile-account-hub';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Profil & Akun | ViciTech',
  description:
    'Kelola kartu profil publik, kustomisasi avatar & banner, postingan komunitas, preset rakitan, dan pesanan Market Anda di ViciTech.',
};

interface ProfilePageProps {
  readonly searchParams?:
    | Promise<{
        readonly tab?: string | string[] | undefined;
      }>
    | {
        readonly tab?: string | string[] | undefined;
      };
}

export default async function ProfilePage({ searchParams }: ProfilePageProps): Promise<ReactElement> {
  const resolved = await Promise.resolve(searchParams);
  const rawTab = Array.isArray(resolved?.tab) ? resolved.tab[0] : resolved?.tab;

  return <ProfileAccountHub mode="self" initialTab={rawTab} />;
}
