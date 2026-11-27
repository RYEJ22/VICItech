'use client';

import Image from 'next/image';
import {
  Aperture,
  Box,
  Camera,
  Compass,
  Cpu,
  Crosshair,
  Gamepad2,
  Headphones,
  ImageOff,
  Laptop,
  Monitor,
  Smartphone,
  Sun,
  Wrench,
} from 'lucide-react';
import { useState } from 'react';
import type { ReactElement } from 'react';
import { useLanguage } from '@/components/providers/LanguageProvider';
import type { ProductCategory } from '@/lib/admin/products-validation';
import {
  getCameraSubtypeLabel,
  type CameraProductionSubtype,
} from '@/lib/market/camera-production';
import { isOptimizedImageSrc } from '@/lib/market/product-presenter';

interface MarketProductImageProps {
  readonly src: string | null;
  readonly alt: string;
  readonly category: ProductCategory;
  readonly sizes: string;
  readonly isPriority?: boolean;
  readonly className?: string;
  readonly showEmptyLabel?: boolean;
  readonly gearSubtype?: CameraProductionSubtype | null;
  readonly isSample?: boolean;
}

function CameraSubtypeIcon({ subtype }: { readonly subtype: CameraProductionSubtype }): ReactElement {
  const iconClass = 'h-10 w-10 text-accent-primary';
  switch (subtype) {
    case 'camera':
      return <Camera className={iconClass} strokeWidth={1.5} aria-hidden="true" />;
    case 'lens':
      return <Aperture className={iconClass} strokeWidth={1.5} aria-hidden="true" />;
    case 'gimbal':
      return <Compass className={iconClass} strokeWidth={1.5} aria-hidden="true" />;
    case 'lighting':
      return <Sun className={iconClass} strokeWidth={1.5} aria-hidden="true" />;
    case 'camera-rig':
      return <Box className={iconClass} strokeWidth={1.5} aria-hidden="true" />;
    case 'tripod-fluid-head':
      return <Crosshair className={iconClass} strokeWidth={1.5} aria-hidden="true" />;
    case 'field-monitor':
      return <Monitor className={iconClass} strokeWidth={1.5} aria-hidden="true" />;
  }
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
    case 'console':
    case 'handheld':
      return <Gamepad2 className={iconClass} strokeWidth={1.5} aria-hidden="true" />;
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
  gearSubtype = null,
  isSample = false,
}: MarketProductImageProps): ReactElement {
  const { language, isEnglish } = useLanguage();
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showFallback = !src || failedSrc === src;

  if (showFallback) {
    return (
      <div className="vt-grid-bg flex h-full w-full flex-col items-center justify-center gap-2 bg-canvas p-4 text-center">
        {failedSrc ? (
          <ImageOff className="h-9 w-9 text-secondary" strokeWidth={1.5} aria-hidden="true" />
        ) : gearSubtype ? (
          <CameraSubtypeIcon subtype={gearSubtype} />
        ) : (
          <CategoryFallbackIcon category={category} />
        )}
        {showEmptyLabel && (
          <span className="text-xs font-medium text-secondary">
            {gearSubtype
              ? `${getCameraSubtypeLabel(gearSubtype, language)}${isSample ? ' · Sample' : ''}`
              : isEnglish
                ? 'Product photo unavailable'
                : 'Foto produk belum tersedia'}
          </span>
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
