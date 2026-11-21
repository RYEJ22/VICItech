import type { ReactElement } from 'react';

export default function PartnersLoading(): ReactElement {
  return (
    <main
      aria-label="Memuat direktori mitra"
      className="mx-auto min-h-[75vh] w-full max-w-7xl space-y-6 px-4 pb-24 pt-8 sm:px-6 sm:pt-12 md:pb-16"
    >
      <div className="space-y-4 rounded-xl border border-default bg-surface p-6 sm:p-8">
        <div className="skeleton-metallic h-6 w-56" />
        <div className="skeleton-metallic h-10 w-3/4" />
        <div className="skeleton-metallic h-4 w-2/3" />
        <div className="flex gap-3 pt-2">
          <div className="skeleton-metallic h-11 w-44" />
          <div className="skeleton-metallic h-11 w-52" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="skeleton-metallic h-56 w-full" />
        <div className="skeleton-metallic h-56 w-full" />
      </div>
    </main>
  );
}
