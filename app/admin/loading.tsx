import { LoaderCircle } from 'lucide-react';
import type { ReactElement } from 'react';

export default function AdminLoading(): ReactElement {
  return (
    <div role="status" aria-live="polite" className="space-y-6">
      <div className="flex items-center gap-2 text-sm font-medium text-secondary">
        <LoaderCircle
          className="h-4 w-4 animate-spin text-accent-primary"
          strokeWidth={1.75}
          aria-hidden="true"
        />
        <span>Memuat modul Admin Workspace…</span>
      </div>

      <div aria-hidden="true" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div
            key={item}
            className="h-32 rounded-xl border border-default bg-surface p-5 shadow-sm"
          >
            <div className="skeleton-metallic h-4 w-28" />
            <div className="skeleton-metallic mt-4 h-8 w-44" />
            <div className="skeleton-metallic mt-3 h-3 w-36" />
          </div>
        ))}
      </div>

      <div
        aria-hidden="true"
        className="h-80 rounded-xl border border-default bg-surface p-5 shadow-sm"
      >
        <div className="skeleton-metallic h-5 w-48" />
        <div className="mt-5 space-y-3">
          {[0, 1, 2, 3].map((row) => (
            <div key={row} className="skeleton-metallic h-12 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
