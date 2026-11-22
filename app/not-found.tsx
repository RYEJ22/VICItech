import Link from 'next/link';
import { ArrowLeft, Compass, LayoutGrid } from 'lucide-react';
import type { ReactElement } from 'react';

export default function NotFound(): ReactElement {
  return (
    <main className="mx-auto grid min-h-[70vh] w-full max-w-3xl place-items-center px-4 pb-24 pt-12 md:pb-12">
      <section className="w-full rounded-xl border border-default bg-surface p-6 shadow-sm sm:p-8">
        <span className="vt-badge-sample">Rute Tidak Ditemukan · 404</span>
        <h1 className="mt-4 font-serif text-3xl font-semibold tracking-tight text-primary [text-wrap:balance]">
          Halaman yang Anda cari tidak tersedia.
        </h1>
        <p className="mt-3 max-w-[65ch] text-sm leading-relaxed text-secondary sm:text-base">
          Tautan mungkin sudah dipindahkan ke dalam Workspace modular ViciTech atau sedang dalam
          tahap pengembangan. Pilih salah satu tujuan utama di bawah ini.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/home"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent-cta px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-cta-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
          >
            <LayoutGrid className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            <span>Buka Workspace</span>
          </Link>
          <Link
            href="/community"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-default bg-subtle px-5 py-2.5 text-sm font-medium text-primary transition hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
          >
            <Compass className="h-4 w-4 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
            <span>Community Hub</span>
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
