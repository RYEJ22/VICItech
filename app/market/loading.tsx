import type { ReactElement } from 'react';

const SKELETON_CARDS = Array.from({ length: 8 }, (_, index) => index);
const SKELETON_PILLS = Array.from({ length: 7 }, (_, index) => index);

export default function MarketLoading(): ReactElement {
  return (
    <main
      aria-label="Memuat etalase market"
      aria-busy="true"
      className="mx-auto min-h-[75vh] w-full max-w-shell space-y-5 px-3 pb-24 pt-6 sm:px-6 sm:pt-10"
    >
      {/* Sticky Filter & Category Bar Shimmer */}
      <div className="space-y-3 rounded-2xl border border-default bg-surface p-3.5 shadow-sm sm:p-4">
        <div className="flex flex-col gap-2.5 xl:flex-row xl:items-center">
          <div className="skeleton-metallic h-11 flex-1 rounded-xl" />
          <div className="flex flex-wrap items-center gap-2">
            <div className="skeleton-metallic h-10 w-56 rounded-xl" />
            <div className="skeleton-metallic h-10 w-32 rounded-xl" />
            <div className="skeleton-metallic h-10 w-36 rounded-xl" />
          </div>
        </div>
        <div className="flex gap-2 overflow-hidden border-t border-default pt-3">
          {SKELETON_PILLS.map((pill) => (
            <div key={pill} className="skeleton-metallic h-9 w-24 shrink-0 rounded-full" />
          ))}
        </div>
      </div>

      {/* Product Card Grid Shimmer matching 1 / 2 / 3 / 4 columns */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
        {SKELETON_CARDS.map((card) => (
          <div
            key={card}
            className="flex flex-col overflow-hidden rounded-2xl border border-default bg-surface shadow-sm"
          >
            <div className="skeleton-metallic aspect-[16/10] w-full rounded-none sm:aspect-[4/3]" />
            <div className="flex flex-1 flex-col space-y-3 p-4">
              <div className="flex justify-between gap-2">
                <div className="skeleton-metallic h-3.5 w-20" />
                <div className="skeleton-metallic h-3.5 w-24" />
              </div>
              <div className="space-y-1.5">
                <div className="skeleton-metallic h-4 w-11/12" />
                <div className="skeleton-metallic h-4 w-2/3" />
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                <div className="skeleton-metallic h-6 w-24 rounded-md" />
                <div className="skeleton-metallic h-6 w-20 rounded-md" />
                <div className="skeleton-metallic h-6 w-28 rounded-md" />
              </div>
              <div className="mt-auto space-y-2.5 border-t border-default pt-3">
                <div className="flex items-baseline justify-between">
                  <div className="skeleton-metallic h-3.5 w-12" />
                  <div className="skeleton-metallic h-5 w-28" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="skeleton-metallic h-10 rounded-xl" />
                  <div className="skeleton-metallic h-10 rounded-xl" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
