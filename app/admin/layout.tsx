import type { Metadata } from 'next';
import { headers } from 'next/headers';
import type { ReactElement, ReactNode } from 'react';
import { AdminShell } from '@/components/features/admin/admin-shell';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Admin Workspace | ViciTech OS',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminLayout({
  children,
}: Readonly<{ children: ReactNode }>): Promise<ReactElement> {
  const headerList = await headers();
  if (headerList.get('x-admin-pathname') === '/admin/login') {
    return <>{children}</>;
  }

  let adminEmail: string | null = null;
  let adminDisplayName: string | null = null;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      adminEmail = user.email ?? null;
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, full_name')
        .eq('id', user.id)
        .maybeSingle();
      adminDisplayName = profile?.full_name || profile?.display_name || null;
    }
  } catch {
    // Middleware handles strict admin verification; fallback gracefully when rendering shell metadata.
  }

  return (
    <AdminShell adminEmail={adminEmail} adminDisplayName={adminDisplayName}>
      {children}
    </AdminShell>
  );
}
