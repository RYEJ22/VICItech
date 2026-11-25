import Link from 'next/link';
import { ArrowLeft, ShoppingBag, Sliders } from 'lucide-react';
import type { ReactElement } from 'react';

export default function MarketProductNotFound(): ReactElement {
  return (
    <main className="mx-auto grid min-h-[70vh] w-full max-w-3xl place-items-center px-4 pb-24 pt-12 md:pb-16">
      <section className="w-full rounded-xl border border-default bg-surface p-6 shadow-sm sm:p-8">
        <span className="vt-badge-sample">Produk Tidak Ditemukan · 404</span>
        <h1 className="mt-4 font-sans text-3xl font-bold tracking-tight text-primary [text-wrap:balance]">
          Produk yang Anda cari tidak tersedia.
        </h1>
        <p className="mt-3 max-w-[65ch] text-sm leading-relaxed text-secondary sm:text-base">
          Tautan produk mungkin sudah berubah, dihapus oleh admin katalog, atau ID/slug yang
          dimasukkan belum terdaftar di ViciTech Market.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/market"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent-cta px-5 py-2.5 text-sm font-semibold text-accent-foreground transition hover:bg-accent-cta-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            <span>Kembali ke Market</span>
          </Link>
          <Link
            href="/builder"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-default bg-subtle px-5 py-2.5 text-sm font-medium text-primary transition hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
          >
            <Sliders className="h-4 w-4 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
            <span>Buka Preset Builder</span>
          </Link>
          <Link
            href="/market?view=catalog"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-default bg-surface px-4 py-2.5 text-sm font-medium text-secondary transition hover:bg-subtle hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
          >
            <ShoppingBag className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            <span>Hardware Library</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
