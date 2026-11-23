'use client';

import Link from 'next/link';
import { Check, ShieldCheck, ShoppingCart } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { MouseEvent, ReactElement } from 'react';
import { useCheckout } from '@/context/CheckoutContext';
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
  const { addToCart } = useCheckout();
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

  return (
    <article
      className={`vt-card-interactive group flex flex-col justify-between overflow-hidden rounded-xl border border-default bg-surface shadow-sm hover:border-accent-primary/40 hover:shadow-md ${className}`}
    >
      <div>
        <Link
          href={href}
          className="relative block aspect-[4/3] w-full overflow-hidden border-b border-default bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-primary/60"
        >
          <MarketProductImage
            src={primaryImage}
            alt={product.title}
            category={product.category}
            sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 85vw"
            isPriority={isPriorityImage}
            className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />

          <div className="pointer-events-none absolute inset-x-2.5 top-2.5 flex flex-wrap items-start justify-between gap-1.5">
            <span className={`${trustBadgeClass} shadow-sm`}>
              <ShieldCheck className="h-3 w-3 shrink-0" strokeWidth={1.75} aria-hidden="true" />
              <span>{trustBadge.label}</span>
            </span>
            <span className={`${stockMeta.badgeClass} shadow-sm`}>{stockMeta.shortLabel}</span>
          </div>
        </Link>

        <div className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs text-secondary">
            <span className="font-medium">{getCategoryLabel(product.category)}</span>
            <span>{getSellerLabel(product.seller_type)}</span>
          </div>

          <Link
            href={href}
            className="mt-1.5 block rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
          >
            <h3 className="line-clamp-2 font-serif text-base font-semibold leading-snug text-primary transition-colors group-hover:text-accent-cta [text-wrap:balance] sm:text-lg">
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

      <div className="flex items-end justify-between gap-3 border-t border-default px-4 pb-4 pt-3">
        <div className="min-w-0">
          <p className="text-xs text-secondary">Harga</p>
          <p className="truncate font-mono text-base font-bold tabular-nums text-primary sm:text-lg">
            {formatIdr(product.price)}
          </p>
        </div>

        <button
          type="button"
          onClick={handleQuickAdd}
          disabled={!stockMeta.isAvailable}
          aria-label={
            stockMeta.isAvailable
              ? `Tambah ${product.title} ke keranjang`
              : `${product.title} sedang habis`
          }
          className="vt-btn-tactile inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-accent-cta px-3.5 py-2 text-xs font-semibold text-accent-foreground hover:bg-accent-cta-hover disabled:cursor-not-allowed disabled:bg-subtle disabled:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
        >
          {justAdded ? (
            <Check className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden="true" />
          ) : (
            <ShoppingCart className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
          )}
          <span>{!stockMeta.isAvailable ? 'Habis' : justAdded ? 'Ditambahkan' : '+ Keranjang'}</span>
        </button>
      </div>
    </article>
  );
}
