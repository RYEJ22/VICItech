import type { ReactElement } from 'react';

export default function AdminLoading(): ReactElement {
  return (
    <div role="status" aria-live="polite" className="space-y-6 pb-24">
      <span className="sr-only">Memuat modul Admin Workspace…</span>

      <div aria-hidden="true" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div
            key={item}
            className="h-32 rounded-2xl border border-default bg-surface p-5 shadow-sm"
          >
            <div className="h-4 w-28 animate-pulse rounded bg-subtle" />
            <div className="mt-4 h-8 w-44 animate-pulse rounded bg-subtle" />
            <div className="mt-3 h-3 w-36 animate-pulse rounded bg-subtle" />
          </div>
        ))}
      </div>

      <div
        aria-hidden="true"
        className="rounded-2xl border border-default bg-surface p-5 shadow-sm"
      >
        <div className="h-5 w-48 animate-pulse rounded bg-subtle" />
        <div className="mt-5 space-y-3">
          {[0, 1, 2, 3, 4].map((row) => (
            <div key={row} className="h-12 w-full animate-pulse rounded-xl bg-subtle" />
          ))}
        </div>
      </div>
    </div>
  );
}
