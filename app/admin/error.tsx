'use client';

import { AlertCircle, ArrowLeft, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import type { ReactElement } from 'react';

interface AdminErrorProps {
  readonly error: Error & { readonly digest?: string };
  readonly reset: () => void;
}

export default function AdminError({ error, reset }: AdminErrorProps): ReactElement {
  return (
    <section
      role="alert"
      className="mx-auto my-8 max-w-xl rounded-2xl border border-default bg-surface p-6 shadow-sm sm:p-8"
    >
      <div className="flex items-start gap-4">
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-status-danger/25 bg-red-50 text-status-danger">
          <AlertCircle className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
        </span>
        <div>
          <h1 className="tracking-tight font-sans text-xl font-bold text-primary">
            Terjadi gangguan saat memuat workspace admin
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-secondary">
            {error.message || 'Muat ulang modul ini atau kembali ke ringkasan admin.'}
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent-cta px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-cta-hover"
        >
          <RotateCcw className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
          <span>Coba Lagi</span>
        </button>
        <Link
          href="/admin"
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-default bg-canvas px-4 py-2 text-sm font-medium text-primary transition hover:bg-subtle"
        >
          <ArrowLeft className="h-4 w-4 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
          <span>Ke Overview</span>
        </Link>
      </div>
    </section>
  );
}
