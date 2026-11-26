'use client';

import Link from 'next/link';
import { Check, ShieldCheck, ShoppingCart } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { MouseEvent, ReactElement } from 'react';
import { useCheckout } from '@/context/CheckoutContext';
import { RevealOnScroll } from '@/components/ui/RevealOnScroll';
import type { ProductRow } from '@/lib/admin/products-validation';
import {
  buildCheckoutPayloadFromProduct,
  formatIdr,
  getCategoryLabel,
  getHighlightSpecs,
  getProductHref,
  getProductPrimaryImage,
  getProductTrustBadge,
  getSellerLabel,
  getStockMeta,
  getTrustBadgeClassName,
} from '@/lib/market/product-presenter';
import { MarketProductImage } from './market-product-image';

interface MarketProductCardProps {
  readonly product: ProductRow;
  readonly isPriorityImage?: boolean;
  readonly className?: string;
}

export function MarketProductCard({
  product,
  isPriorityImage = false,
  className = '',
}: MarketProductCardProps): ReactElement {
  const { addToCart, triggerCheckout } = useCheckout();
  const [justAdded, setJustAdded] = useState(false);
  const href = getProductHref(product);
  const primaryImage = getProductPrimaryImage(product);
  const stockMeta = getStockMeta(product.stock_status);
  const trustBadge = getProductTrustBadge(product);
  const specs = getHighlightSpecs(product, 3);

  const trustBadgeClass = getTrustBadgeClassName(trustBadge.tone);

  useEffect(() => {
    if (!justAdded) return undefined;
    const timer = window.setTimeout(() => setJustAdded(false), 1400);
    return () => window.clearTimeout(timer);
  }, [justAdded]);

  const handleQuickAdd = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!stockMeta.isAvailable) return;

    const checkoutPayload = buildCheckoutPayloadFromProduct(product);
    addToCart({
      ...checkoutPayload,
      name: product.title,
      slug: product.slug,
      category: getCategoryLabel(product.category),
      image: primaryImage,
      seller_type: product.seller_type,
      source: 'market',
    });
    setJustAdded(true);
  };

  const handleBuyNow = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!stockMeta.isAvailable) return;

    triggerCheckout(buildCheckoutPayloadFromProduct(product));
  };

  return (
    <RevealOnScroll
      as="article"
      className={`vt-card-lift group flex h-full flex-col overflow-hidden rounded-xl border border-default bg-surface shadow-card transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:border-strong hover:shadow-card-hover motion-reduce:transition-none motion-reduce:hover:transform-none ${className}`}
    >
      <Link
        href={href}
        className="relative block aspect-[16/10] w-full shrink-0 overflow-hidden border-b border-default bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-primary/60 sm:aspect-[4/3]"
      >
        <MarketProductImage
          src={primaryImage}
          alt={product.title}
          category={product.category}
          sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 90vw"
          isPriority={isPriorityImage}
          className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />

        <div className="pointer-events-none absolute inset-x-2.5 top-2.5 flex flex-wrap items-start justify-between gap-1.5">
          <span className={`${trustBadgeClass} shadow-sm`}>
            <ShieldCheck className="h-3 w-3 shrink-0" strokeWidth={1.75} aria-hidden="true" />
            <span>{trustBadge.label}</span>
          </span>
          <span className={`${stockMeta.badgeClass} shadow-sm`}>{stockMeta.shortLabel}</span>
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-3.5 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-1.5 text-[11px] text-secondary">
          <span className="font-semibold uppercase tracking-wide text-accent-cta">
            {getCategoryLabel(product.category)}
          </span>
          <span className="font-medium">{getSellerLabel(product.seller_type)}</span>
        </div>

        <Link
          href={href}
          className="mt-1.5 block rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
        >
          <h3 className="min-h-[2.75rem] line-clamp-2 font-sans text-sm font-bold leading-snug tracking-tight text-primary transition-colors group-hover:text-accent-cta [text-wrap:balance] sm:min-h-[3rem] sm:text-base">
            {product.title}
          </h3>
        </Link>

        {specs.length > 0 && (
          <ul
            aria-label="Ringkasan spesifikasi utama"
            className="mt-3 flex flex-wrap gap-1.5"
          >
            {specs.map((spec) => (
              <li
                key={spec.id}
                title={`${spec.label}: ${spec.value}`}
                className="inline-flex max-w-full items-center gap-1 rounded-md border border-default bg-canvas px-2 py-1 text-[11px]"
              >
                <span className="shrink-0 font-medium text-secondary">{spec.label.split(' ')[0]}:</span>
                <span className="truncate font-mono font-semibold text-primary">{spec.value}</span>
              </li>
            ))}
          </ul>
        )}

        {/* Bottom-aligned Price & Action Footer */}
        <div className="mt-auto space-y-2.5 border-t border-default pt-3.5">
          <div className="flex items-baseline justify-between gap-2 pt-0.5">
            <p className="text-xs font-medium text-secondary">Harga</p>
            <p className="truncate font-mono text-base font-bold tabular-nums text-primary sm:text-lg">
              {formatIdr(product.price)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleQuickAdd}
              disabled={!stockMeta.isAvailable}
              aria-label={
                stockMeta.isAvailable
                  ? `Tambah ${product.title} ke keranjang`
                  : `${product.title} sedang habis`
              }
              className="vt-motion-press vt-btn-tactile inline-flex min-h-10 items-center justify-center gap-1 rounded-lg border border-default bg-canvas px-2 py-1.5 text-xs font-semibold text-primary transition-all duration-200 ease-smooth hover:border-strong hover:bg-subtle active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-subtle disabled:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50"
            >
              {justAdded ? (
                <Check className="h-3.5 w-3.5 shrink-0 text-status-live" strokeWidth={2} aria-hidden="true" />
              ) : (
                <ShoppingCart className="h-3.5 w-3.5 shrink-0 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
              )}
              <span key={justAdded ? 'added' : 'ready'} className={justAdded ? 'vt-motion-pop' : ''}>
                {!stockMeta.isAvailable ? 'Habis' : justAdded ? 'Masuk' : '+ Keranjang'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleBuyNow}
              disabled={!stockMeta.isAvailable}
              aria-label={
                stockMeta.isAvailable
                  ? `Beli sekarang ${product.title}`
                  : `${product.title} sedang habis`
              }
              className="vt-motion-press vt-btn-tactile inline-flex min-h-10 items-center justify-center rounded-lg bg-accent-primary px-2 py-1.5 text-xs font-semibold text-white transition-all duration-200 ease-smooth hover:bg-accent-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-subtle disabled:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50"
            >
              <span>{!stockMeta.isAvailable ? 'Stok Habis' : 'Beli Sekarang'}</span>
            </button>
          </div>
        </div>
      </div>
    </RevealOnScroll>
  );
}
