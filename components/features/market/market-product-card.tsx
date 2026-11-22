'use client';

import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import type { ReactElement } from 'react';
import type { ProductRow } from '@/lib/admin/products-validation';
import {
  formatIdr,
  getProductHref,
  getProductPrimaryImage,
  getProductTrustBadge,
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
  const href = getProductHref(product);
  const primaryImage = getProductPrimaryImage(product);
  const stockMeta = getStockMeta(product.stock_status);
  const trustBadge = getProductTrustBadge(product);
  const trustBadgeClass = getTrustBadgeClassName(trustBadge.tone);

  return (
    <article
      className={`group overflow-hidden rounded-2xl border border-[#E4E4E7] bg-[#FFFFFF] transition-colors hover:border-[#EA580C]/45 ${className}`}
    >
      <Link
        href={href}
        className="flex h-full flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#EA580C]/60"
      >
        {/* 1. Foto bersih + 2. Maksimal 1 badge status terpenting */}
        <div className="relative aspect-[4/3] w-full overflow-hidden border-b border-[#E4E4E7] bg-[#FAF9F6]">
          <MarketProductImage
            src={primaryImage}
            alt={product.title}
            category={product.category}
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 90vw"
            isPriority={isPriorityImage}
            className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />

          <div className="pointer-events-none absolute left-3 top-3">
            {stockMeta.isAvailable ? (
              <span className={trustBadgeClass}>
                <ShieldCheck className="h-3 w-3 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                <span>{trustBadge.label}</span>
              </span>
            ) : (
              <span className="vt-badge-sample">Habis</span>
            )}
          </div>
        </div>

        {/* 3. Nama Produk + 4. Harga */}
        <div className="flex flex-1 flex-col justify-between gap-4 p-5">
          <h3 className="line-clamp-2 font-serif text-base font-semibold leading-snug text-[#18181B] transition-colors group-hover:text-[#EA580C] [text-wrap:balance] sm:text-lg">
            {product.title}
          </h3>
          <p className="font-mono text-base font-semibold tabular-nums text-[#18181B] sm:text-lg">
            {formatIdr(product.price)}
          </p>
        </div>
      </Link>
    </article>
  );
}
