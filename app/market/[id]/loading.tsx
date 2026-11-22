import type { ReactElement } from 'react';

export default function MarketProductLoading(): ReactElement {
  return (
    <main
      aria-label="Memuat detail produk"
      className="mx-auto min-h-[75vh] w-full max-w-7xl space-y-10 px-4 pb-20 pt-6 sm:px-6 sm:pt-8"
    >
      <div className="skeleton-metallic h-5 w-72 max-w-full rounded-md" />

      <div className="grid gap-8 lg:grid-cols-12">
        <div className="space-y-3 lg:col-span-7">
          <div className="skeleton-metallic aspect-[4/3] w-full rounded-xl" />
          <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-5">
            <div className="skeleton-metallic aspect-[4/3] w-full rounded-lg" />
            <div className="skeleton-metallic aspect-[4/3] w-full rounded-lg" />
            <div className="skeleton-metallic aspect-[4/3] w-full rounded-lg" />
            <div className="skeleton-metallic aspect-[4/3] w-full rounded-lg" />
          </div>
        </div>

        <div className="space-y-4 rounded-xl border border-default bg-surface p-6 lg:col-span-5">
          <div className="skeleton-metallic h-5 w-40 rounded-md" />
          <div className="skeleton-metallic h-9 w-5/6 rounded-md" />
          <div className="skeleton-metallic h-9 w-1/2 rounded-md" />
          <div className="skeleton-metallic h-16 w-full rounded-md" />
          <div className="grid grid-cols-2 gap-2.5">
            <div className="skeleton-metallic h-14 w-full rounded-lg" />
            <div className="skeleton-metallic h-14 w-full rounded-lg" />
          </div>
          <div className="grid gap-2.5 pt-2 sm:grid-cols-2">
            <div className="skeleton-metallic h-12 w-full rounded-lg" />
            <div className="skeleton-metallic h-12 w-full rounded-lg" />
          </div>
        </div>
      </div>

      <div className="space-y-4 border-t border-default pt-10">
        <div className="skeleton-metallic h-8 w-64 rounded-md" />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="skeleton-metallic h-80 w-full rounded-xl" />
          <div className="skeleton-metallic h-80 w-full rounded-xl" />
          <div className="skeleton-metallic h-80 w-full rounded-xl" />
          <div className="skeleton-metallic h-80 w-full rounded-xl" />
        </div>
      </div>
    </main>
  );
}
