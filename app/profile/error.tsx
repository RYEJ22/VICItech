'use client';

import type { ReactElement } from 'react';
import Link from 'next/link';
import { RefreshCw, ShieldAlert } from 'lucide-react';

interface ProfileErrorProps {
  readonly error: Error & { readonly digest?: string | undefined };
  readonly reset: () => void;
}

export default function ProfileError({ reset }: ProfileErrorProps): ReactElement {
  return (
    <main className="grid min-h-[65vh] place-items-center bg-canvas px-4 py-12 text-primary">
      <section
        role="alert"
        className="w-full max-w-lg rounded-xl border border-default bg-surface p-8 text-center shadow-sm"
      >
        <ShieldAlert className="mx-auto h-10 w-10 text-status-danger" strokeWidth={1.75} aria-hidden="true" />
        <h1 className="mt-4 font-serif text-2xl font-semibold text-primary">
          Gagal memuat Profil &amp; Akun
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-secondary">
          Terjadi kendala saat mengambil data profil atau pesanan. Coba muat ulang halaman beberapa saat lagi.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="vt-btn-tactile inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent-cta px-5 py-2 text-sm font-semibold text-white hover:bg-accent-cta-hover"
          >
            <RefreshCw className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            <span>Coba Lagi</span>
          </button>
          <Link
            href="/"
            className="vt-btn-tactile inline-flex min-h-11 items-center rounded-lg border border-default bg-surface px-4 py-2 text-sm font-medium text-primary hover:bg-subtle"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </section>
    </main>
  );
}
