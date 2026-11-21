import type { ReactElement } from 'react';

export default function RootLoading(): ReactElement {
  return (
    <main
      aria-label="Memuat halaman ViciTech"
      className="mx-auto min-h-[70vh] w-full max-w-6xl space-y-6 px-4 pb-24 pt-10 sm:px-6 md:pb-12"
    >
      <div className="space-y-4 rounded-xl border border-default bg-surface p-6 sm:p-8">
        <div className="skeleton-metallic h-7 w-48" />
        <div className="skeleton-metallic h-10 w-2/3" />
        <div className="skeleton-metallic h-4 w-1/2" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="skeleton-metallic h-44 w-full" />
        <div className="skeleton-metallic h-44 w-full" />
      </div>
    </main>
  );
}
