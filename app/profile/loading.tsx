import type { ReactElement } from 'react';

export default function ProfileLoading(): ReactElement {
  return (
    <main className="min-h-[65vh] bg-canvas px-4 py-8 sm:px-6" aria-label="Memuat Profil dan Akun">
      <div className="mx-auto max-w-shell space-y-5">
        <div className="h-52 animate-pulse rounded-xl border border-default bg-surface" />
        <div className="h-12 w-80 max-w-full animate-pulse rounded-lg bg-surface" />
        <div className="grid gap-5 md:grid-cols-2">
          <div className="h-44 animate-pulse rounded-xl border border-default bg-surface" />
          <div className="h-44 animate-pulse rounded-xl border border-default bg-surface" />
        </div>
      </div>
    </main>
  );
}
