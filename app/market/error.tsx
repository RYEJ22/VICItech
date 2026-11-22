'use client';

import Link from 'next/link';
import { AlertCircle, RotateCcw } from 'lucide-react';
import type { ReactElement } from 'react';

interface MarketErrorProps {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}

export default function MarketError({ error, reset }: MarketErrorProps): ReactElement {
  return (
    <main className="mx-auto grid min-h-[65vh] w-full max-w-3xl place-items-center px-4 pb-24 pt-12 md:pb-12">
      <section
        role="alert"
        className="w-full rounded-xl border border-default bg-surface p-6 shadow-sm sm:p-8"
      >
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-1 h-5 w-5 shrink-0 text-status-danger" strokeWidth={1.75} aria-hidden="true" />
          <div>
            <h1 className="font-serif text-2xl font-semibold text-primary">
              Halaman Market tidak dapat dimuat
            </h1>
            <p className="mt-2 max-w-[65ch] text-sm leading-relaxed text-secondary">
              {error.message || 'Terjadi gangguan sementara saat memuat pratinjau katalog market.'}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={reset}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent-cta px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-cta-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
              >
                <RotateCcw className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                <span>Muat Ulang Halaman</span>
              </button>
              <Link
                href="/home"
                className="inline-flex min-h-11 items-center rounded-lg border border-default bg-subtle px-4 py-2 text-sm font-medium text-primary transition hover:bg-canvas"
              >
                Kembali ke Workspace
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
