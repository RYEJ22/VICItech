'use client';

import Link from 'next/link';
import { AlertTriangle, ArrowLeft, LayoutGrid, RotateCcw } from 'lucide-react';
import { useEffect, type ReactElement } from 'react';

interface GlobalErrorProps {
  readonly error: Error & { readonly digest?: string };
  readonly reset: () => void;
}

export default function GlobalRouteError({ error, reset }: GlobalErrorProps): ReactElement {
  useEffect(() => {
    console.error('[ViciTech OS] Unhandled route error:', error);
  }, [error]);

  return (
    <main className="mx-auto grid min-h-[70vh] w-full max-w-3xl place-items-center px-4 pb-24 pt-12 md:pb-12">
      <section className="w-full rounded-xl border border-default bg-surface p-6 shadow-sm sm:p-8">
        <span className="inline-flex items-center gap-1.5 rounded-md border border-status-danger/30 bg-status-danger/10 px-2.5 py-1 text-xs font-semibold text-primary">
          <AlertTriangle className="h-3.5 w-3.5 text-status-danger" strokeWidth={1.75} aria-hidden="true" />
          <span>Terjadi Gangguan Sistem</span>
        </span>
        <h1 className="mt-4 font-serif text-3xl font-semibold tracking-tight text-primary [text-wrap:balance]">
          Halaman ini gagal dimuat untuk sementara.
        </h1>
        <p className="mt-3 max-w-[65ch] text-sm leading-relaxed text-secondary sm:text-base">
          Jangan khawatir—data akun dan sesi Anda tetap aman. Coba muat ulang bagian ini atau kembali ke
          Workspace utama ViciTech.
        </p>
        {error?.digest && (
          <p className="mt-3 font-mono text-xs text-secondary">
            Kode referensi: {error.digest}
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent-primary px-5 py-2.5 text-sm font-semibold text-primary transition hover:bg-accent-hover hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
          >
            <RotateCcw className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            <span>Coba Lagi</span>
          </button>
          <Link
            href="/home"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-default bg-subtle px-5 py-2.5 text-sm font-medium text-primary transition hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
          >
            <LayoutGrid className="h-4 w-4 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
            <span>Buka Workspace</span>
          </Link>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-default bg-surface px-4 py-2.5 text-sm font-medium text-secondary transition hover:bg-subtle hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            <span>Halaman Awal</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
