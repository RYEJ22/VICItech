'use client';

import { LoaderCircle, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { ReactElement } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

interface AdminSignOutButtonProps {
  readonly compact?: boolean;
  readonly className?: string;
}

export function AdminSignOutButton({
  compact = false,
  className = '',
}: AdminSignOutButtonProps): ReactElement {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState('');

  const handleSignOut = async () => {
    setIsSigningOut(true);
    setError('');
    try {
      const { error: signOutError } = await getSupabaseBrowserClient().auth.signOut();
      if (signOutError) throw signOutError;
      router.replace('/admin/login');
      router.refresh();
    } catch (signOutError: unknown) {
      setError(
        signOutError instanceof Error ? signOutError.message : 'Gagal keluar dari sesi admin.',
      );
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={() => void handleSignOut()}
        disabled={isSigningOut}
        className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-default bg-surface px-3.5 py-2 text-sm font-medium text-primary transition hover:border-status-danger/45 hover:bg-red-50 hover:text-status-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60 disabled:cursor-wait disabled:opacity-55 ${className}`}
      >
        {isSigningOut ? (
          <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={1.75} aria-hidden="true" />
        ) : (
          <LogOut className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
        )}
        <span>{compact ? 'Keluar' : 'Keluar'}</span>
      </button>
      {error ? (
        <span role="alert" className="text-xs text-status-danger">
          {error}
        </span>
      ) : null}
    </div>
  );
}

export default AdminSignOutButton;
