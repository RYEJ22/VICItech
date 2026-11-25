'use client';

import { ChevronLeft, ChevronRight, Layers, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import type { ReactElement } from 'react';
import type { ProductCategory } from '@/lib/admin/products-validation';
import { getTrustBadgeClassName, type MarketTrustBadge } from '@/lib/market/product-presenter';
import { MarketProductImage } from './market-product-image';
import styles from './product-gallery.module.css';

interface ProductGalleryProps {
  readonly title: string;
  readonly category: ProductCategory;
  readonly images: readonly string[];
  readonly trustBadge: MarketTrustBadge;
  readonly isPreset: boolean;
}

export function ProductGallery({
  title,
  category,
  images,
  trustBadge,
  isPreset,
}: ProductGalleryProps): ReactElement {
  const [activeIndex, setActiveIndex] = useState(0);
  const safeIndex = images.length > 0 && activeIndex < images.length ? activeIndex : 0;
  const activeSrc = images[safeIndex] ?? null;

  const trustBadgeClass = getTrustBadgeClassName(trustBadge.tone);

  const handlePrev = () => {
    if (images.length <= 1) return;
    setActiveIndex((current) => (current - 1 + images.length) % images.length);
  };

  const handleNext = () => {
    if (images.length <= 1) return;
    setActiveIndex((current) => (current + 1) % images.length);
  };

  return (
    <div className="space-y-3">
      <div className="group relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-default bg-surface shadow-sm">
        <div
          key={activeSrc ?? 'fallback'}
          className={`relative h-full w-full ${styles.stageImage ?? ''}`}
        >
          <MarketProductImage
            src={activeSrc}
            alt={images.length > 1 ? `${title} - Foto ${safeIndex + 1}` : title}
            category={category}
            sizes="(min-width: 1024px) 58vw, 100vw"
            isPriority
            className="object-cover transition-transform duration-motion-hover ease-natural group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        </div>

        <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap items-center gap-2">
          <span className={`${trustBadgeClass} shadow-sm`}>
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
            <span>{trustBadge.label}</span>
          </span>
          {isPreset && (
            <span className="inline-flex items-center gap-1 rounded-md border border-default bg-surface px-2.5 py-0.5 text-xs font-medium text-primary shadow-sm">
              <Layers className="h-3.5 w-3.5 text-accent-hover" strokeWidth={1.75} aria-hidden="true" />
              <span>Preset Terkurasi</span>
            </span>
          )}
        </div>

        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Foto sebelumnya"
              className="vt-motion-press absolute left-3 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-default bg-surface/90 text-primary shadow-sm transition-[transform,background-color] duration-motion-fast ease-natural hover:bg-surface active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
            >
              <ChevronLeft className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={handleNext}
              aria-label="Foto berikutnya"
              className="vt-motion-press absolute right-3 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-default bg-surface/90 text-primary shadow-sm transition-[transform,background-color] duration-motion-fast ease-natural hover:bg-surface active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
            >
              <ChevronRight className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
            </button>

            <span
              aria-live="polite"
              className="pointer-events-none absolute bottom-3 right-3 rounded-full border border-default bg-surface/95 px-2.5 py-1 font-mono text-xs font-semibold tabular-nums text-primary shadow-sm"
            >
              {safeIndex + 1} / {images.length}
            </span>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div
          role="group"
          aria-label="Galeri foto produk"
          className="grid grid-cols-4 gap-2.5 sm:grid-cols-5"
        >
          {images.map((imageUrl, idx) => {
            const isSelected = idx === safeIndex;
            return (
              <button
                key={`${imageUrl}-${idx}`}
                type="button"
                aria-pressed={isSelected}
                aria-label={`Tampilkan foto ${idx + 1} dari ${images.length}`}
                onClick={() => setActiveIndex(idx)}
                className={`vt-motion-press relative aspect-[4/3] min-h-11 w-full overflow-hidden rounded-lg bg-canvas transition-[opacity,transform] duration-motion-fast ease-natural active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60 ${
                  isSelected
                    ? 'border-2 border-accent-primary ring-2 ring-accent-primary/20'
                    : 'border border-default opacity-75 hover:opacity-100'
                }`}
              >
                <MarketProductImage
                  src={imageUrl}
                  alt={`${title} - Foto ${idx + 1}`}
                  category={category}
                  sizes="(min-width: 1024px) 12vw, 25vw"
                  showEmptyLabel={false}
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
