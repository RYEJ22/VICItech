'use client';

import Image from 'next/image';
import { Cpu, Headphones, ImageOff, Laptop, Smartphone, Wrench } from 'lucide-react';
import { useState } from 'react';
import type { ReactElement } from 'react';
import type { ProductCategory } from '@/lib/admin/products-validation';
import { isOptimizedImageSrc } from '@/lib/market/product-presenter';

interface MarketProductImageProps {
  readonly src: string | null;
  readonly alt: string;
  readonly category: ProductCategory;
  readonly sizes: string;
  readonly isPriority?: boolean;
  readonly className?: string;
  readonly showEmptyLabel?: boolean;
}

function CategoryFallbackIcon({ category }: { readonly category: ProductCategory }): ReactElement {
  const iconClass = 'h-10 w-10 text-secondary';
  switch (category) {
    case 'pc-build':
      return <Cpu className={iconClass} strokeWidth={1.5} aria-hidden="true" />;
    case 'laptop':
      return <Laptop className={iconClass} strokeWidth={1.5} aria-hidden="true" />;
    case 'smartphone':
      return <Smartphone className={iconClass} strokeWidth={1.5} aria-hidden="true" />;
    case 'component':
      return <Wrench className={iconClass} strokeWidth={1.5} aria-hidden="true" />;
    case 'accessory':
      return <Headphones className={iconClass} strokeWidth={1.5} aria-hidden="true" />;
  }
}

export function MarketProductImage({
  src,
  alt,
  category,
  sizes,
  isPriority = false,
  className = 'object-cover',
  showEmptyLabel = true,
}: MarketProductImageProps): ReactElement {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showFallback = !src || failedSrc === src;

  if (showFallback) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-canvas p-4 text-center">
        {failedSrc ? (
          <ImageOff className="h-9 w-9 text-secondary" strokeWidth={1.5} aria-hidden="true" />
        ) : (
          <CategoryFallbackIcon category={category} />
        )}
        {showEmptyLabel && (
          <span className="text-xs font-medium text-secondary">Foto produk belum tersedia</span>
        )}
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={isPriority}
      unoptimized={!isOptimizedImageSrc(src)}
      onError={() => setFailedSrc(src)}
      className={className}
    />
  );
}
