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
  const specs = getHighlightSpecs(product, 2);

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
      className={`vt-card-lift group flex h-full flex-col justify-between overflow-hidden rounded-xl border border-default bg-surface shadow-sm ${className}`}
    >
      <div>
        <Link
          href={href}
          className="relative block aspect-[16/10] w-full overflow-hidden border-b border-default bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-primary/60 sm:aspect-[4/3]"
        >
          <MarketProductImage
            src={primaryImage}
            alt={product.title}
            category={product.category}
            sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 85vw"
            isPriority={isPriorityImage}
            className="object-cover transition-transform duration-motion-hover ease-natural group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />

          <div className="pointer-events-none absolute inset-x-2.5 top-2.5 flex flex-wrap items-start justify-between gap-1.5">
            <span className={`${trustBadgeClass} shadow-sm`}>
              <ShieldCheck className="h-3 w-3 shrink-0" strokeWidth={1.75} aria-hidden="true" />
              <span>{trustBadge.label}</span>
            </span>
            <span className={`${stockMeta.badgeClass} shadow-sm`}>{stockMeta.shortLabel}</span>
          </div>
        </Link>

        <div className="p-3 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs text-secondary">
            <span className="font-medium">{getCategoryLabel(product.category)}</span>
            <span>{getSellerLabel(product.seller_type)}</span>
          </div>

          <Link
            href={href}
            className="mt-1.5 block rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
          >
            <h3 className="tracking-tight line-clamp-2 font-sans text-base font-bold leading-snug text-primary transition-colors group-hover:text-accent-cta [text-wrap:balance] sm:text-lg">
              {product.title}
            </h3>
          </Link>

          {specs.length > 0 && (
            <dl className="mt-3 grid grid-cols-2 gap-1.5">
              {specs.map((spec) => (
                <div
                  key={spec.id}
                  className="min-w-0 rounded-md border border-default bg-canvas px-2.5 py-1.5"
                >
                  <dt className="truncate text-[11px] text-secondary">{spec.label}</dt>
                  <dd className="mt-0.5 truncate font-mono text-xs font-medium text-primary">
                    {spec.value}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>

      <div className="space-y-2 border-t border-default px-3 pb-3 pt-2.5 sm:space-y-2.5 sm:px-4 sm:pb-4 sm:pt-3">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-xs text-secondary">Harga</p>
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
            className="vt-motion-press vt-btn-tactile inline-flex min-h-9 items-center justify-center gap-1 rounded-lg border border-default bg-canvas px-1.5 py-1.5 text-[11px] font-semibold text-primary hover:border-accent-primary/40 hover:bg-subtle disabled:cursor-not-allowed disabled:bg-subtle disabled:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60 sm:min-h-10 sm:gap-1.5 sm:px-2.5 sm:py-2 sm:text-xs"
          >
            {justAdded ? (
              <Check className="h-3.5 w-3.5 shrink-0 text-status-live" strokeWidth={2} aria-hidden="true" />
            ) : (
              <ShoppingCart className="h-3.5 w-3.5 shrink-0 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
            )}
            <span key={justAdded ? 'added' : 'ready'} className={justAdded ? 'vt-motion-pop' : ''}>
              {!stockMeta.isAvailable ? 'Habis' : justAdded ? 'Ditambahkan' : '+ Keranjang'}
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
            className="vt-motion-press vt-btn-tactile inline-flex min-h-9 items-center justify-center rounded-lg bg-accent-cta px-1.5 py-1.5 text-[11px] font-semibold text-accent-foreground hover:bg-accent-cta-hover disabled:cursor-not-allowed disabled:bg-subtle disabled:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60 sm:min-h-10 sm:px-2.5 sm:py-2 sm:text-xs"
          >
            <span>{!stockMeta.isAvailable ? 'Stok Habis' : 'Beli Sekarang'}</span>
          </button>
        </div>
      </div>
    </RevealOnScroll>
  );
}
