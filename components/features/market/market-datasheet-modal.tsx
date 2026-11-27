'use client';

import Link from 'next/link';
import {
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  ShoppingCart,
  Store,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { useCheckout } from '@/context/CheckoutContext';
import type { ProductRow } from '@/lib/admin/products-validation';
import {
  getCameraProductionQcCheckpoints,
  getCameraSubtypeLabel,
  isCameraProductionProduct,
  isSampleCatalogProduct,
  resolveCameraProductionSubtype,
} from '@/lib/market/camera-production';
import {
  buildCheckoutPayloadFromProduct,
  formatIdr,
  getCategoryLabel,
  getFormattedProductMetadata,
  getFormattedProductSpecs,
  getProductHref,
  getProductPrimaryImage,
  getProductSummary,
  getProductTrustBadge,
  getStockMeta,
  getTrustBadgeClassName,
} from '@/lib/market/product-presenter';
import { extractPartnerAttribution } from '@/lib/partners/partner-commerce';

interface MarketDatasheetModalProps {
  readonly product: ProductRow | null;
  readonly onClose: () => void;
}

export function MarketDatasheetModal({
  product,
  onClose,
}: MarketDatasheetModalProps): ReactElement | null {
  const { t, language, isEnglish } = useLanguage();
  const { addToCart } = useCheckout();
  const [added, setAdded] = useState(false);

  useEffect(() => {
    setAdded(false);
  }, [product?.id]);

  useEffect(() => {
    if (!product) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose, product]);

  if (!product) return null;

  const m = t.routes.market;
  const href = getProductHref(product);
  const stockMeta = getStockMeta(product.stock_status);
  const trustBadge = getProductTrustBadge(product);
  const trustClass = getTrustBadgeClassName(trustBadge.tone);
  const isCamProd = isCameraProductionProduct(product);
  const subtype = resolveCameraProductionSubtype(product);
  const partnerAttribution = extractPartnerAttribution(product);
  const isSample = isSampleCatalogProduct(product) || partnerAttribution.isSimulatedDemo;
  const specs = getFormattedProductSpecs(product, language);
  const metadata = getFormattedProductMetadata(product, language);
  const seenKeys = new Set(specs.map((item) => item.key.toLowerCase()));
  const mergedSpecs = [
    ...specs,
    ...metadata.filter((item) => !seenKeys.has(item.key.toLowerCase())),
  ];
  const qcCheckpoints = getCameraProductionQcCheckpoints(product, language);
  const categoryText = isCamProd
    ? subtype
      ? `${m.categoryCameraProduction} · ${getCameraSubtypeLabel(subtype, language)}`
      : m.categoryCameraProduction
    : getCategoryLabel(product.category);

  const handleAddToCart = () => {
    if (!stockMeta.isAvailable) return;
    const checkoutPayload = buildCheckoutPayloadFromProduct(product);
    addToCart({
      ...checkoutPayload,
      name: product.title,
      slug: product.slug,
      category: categoryText,
      image: getProductPrimaryImage(product),
      seller_type: product.seller_type,
      source: 'market',
    });
    setAdded(true);
  };

  return (
    <div
      className="vt-backdrop-enter fixed inset-0 z-[80] flex items-end justify-center bg-black/55 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="market-datasheet-title"
        onClick={(event) => event.stopPropagation()}
        className="vt-dialog-enter flex max-h-[88dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-default bg-surface shadow-floating sm:rounded-xl"
      >
        {/* Modal Header */}
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-default px-4 py-3.5 sm:px-6 sm:py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-accent-primary">
              {categoryText}
            </p>
            <h2
              id="market-datasheet-title"
              className="mt-0.5 break-words font-sans text-base font-bold leading-snug text-primary sm:text-lg"
            >
              {product.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={m.datasheetCloseAria}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-default bg-canvas text-primary transition-colors hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50"
          >
            <X className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-default bg-canvas p-3.5 sm:p-4">
            <div className="min-w-0">
              <p className="text-xs font-medium text-secondary">
                {isEnglish ? 'Reference Price' : 'Harga Referensi'}
              </p>
              <p className="mt-0.5 font-mono text-xl font-bold tabular-nums text-primary sm:text-2xl">
                {formatIdr(product.price)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span data-badge-essential={isSample ? 'true' : undefined} className={trustClass}>
                <ShieldCheck className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span>{trustBadge.label}</span>
              </span>
              <span className={stockMeta.badgeClass}>{stockMeta.shortLabel}</span>
            </div>
          </div>

          <p className="text-xs leading-relaxed text-secondary sm:text-sm">
            {getProductSummary(product)}
          </p>

          {partnerAttribution.isPartnerListing && (
            <div className="space-y-2 rounded-xl border border-accent-primary/30 bg-accent-subtle p-3.5 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 font-bold text-primary">
                  <Store className="h-4 w-4 text-accent-cta" aria-hidden="true" />
                  <span>
                    {isEnglish ? 'Partner' : 'Mitra'}: {partnerAttribution.partnerName} (
                    {partnerAttribution.partnerCity})
                  </span>
                </span>
                <span className="rounded border border-default bg-surface px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-primary">
                  Partner Listing
                </span>
              </div>
              {partnerAttribution.conditionGrade && (
                <p className="font-mono text-[11px] font-semibold text-accent-hover">
                  {isEnglish ? 'Condition' : 'Kondisi'}: {partnerAttribution.conditionGrade}
                </p>
              )}
              {partnerAttribution.partnerNotes && (
                <p className="text-secondary">{partnerAttribution.partnerNotes}</p>
              )}
            </div>
          )}

          {/* Tailored QC Checkpoints */}
          {qcCheckpoints.length > 0 && (
            <section aria-labelledby="datasheet-qc-heading" className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3
                  id="datasheet-qc-heading"
                  className="text-xs font-bold uppercase tracking-wider text-accent-primary"
                >
                  {m.datasheetQcHeading}
                </h3>
                <span
                  data-badge-essential="true"
                  className={isSample ? 'vt-badge-simulated' : 'vt-badge-live'}
                >
                  {isSample ? 'Simulated / Demo' : 'Live QC'}
                </span>
              </div>
              <ul className="divide-y divide-default overflow-hidden rounded-xl border border-default bg-surface">
                {qcCheckpoints.map((cp) => (
                  <li
                    key={cp.id}
                    className="grid grid-cols-1 gap-1 px-3.5 py-2.5 text-xs sm:grid-cols-5 sm:items-center sm:gap-3"
                  >
                    <span className="flex items-start gap-2 font-medium text-primary sm:col-span-2">
                      <CheckCircle2
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-status-live"
                        aria-hidden="true"
                      />
                      <span>{cp.label}</span>
                    </span>
                    <span className="break-words font-mono font-semibold tabular-nums text-secondary sm:col-span-3 sm:text-right">
                      {cp.value}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Full Technical Specs */}
          {mergedSpecs.length > 0 && (
            <section aria-labelledby="datasheet-specs-heading" className="space-y-2.5">
              <h3
                id="datasheet-specs-heading"
                className="text-xs font-bold uppercase tracking-wider text-secondary"
              >
                {m.datasheetSpecsHeading}
              </h3>
              <dl className="divide-y divide-default overflow-hidden rounded-xl border border-default bg-surface">
                {mergedSpecs.map((spec) => (
                  <div
                    key={spec.id}
                    className="grid grid-cols-1 gap-0.5 px-3.5 py-2.5 text-xs odd:bg-canvas/65 even:bg-surface sm:grid-cols-5 sm:gap-3 sm:text-sm"
                  >
                    <dt className="font-medium text-secondary sm:col-span-2">{spec.label}</dt>
                    <dd className="break-words font-mono font-semibold tabular-nums text-primary sm:col-span-3">
                      {spec.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {isSample && (
            <p className="rounded-lg border border-default bg-canvas px-3.5 py-2.5 text-xs leading-relaxed text-secondary">
              {m.cameraSampleNotice}
            </p>
          )}
        </div>

        {/* Modal Footer */}
        <div
          className={`grid shrink-0 grid-cols-1 gap-2 border-t border-default bg-surface px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 ${
            partnerAttribution.isLocalPartnerListing ? '' : 'sm:grid-cols-2'
          }`}
        >
          {!partnerAttribution.isLocalPartnerListing && (
            <Link
              href={href}
              onClick={onClose}
              className="vt-motion-press inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-default bg-canvas px-4 text-xs font-semibold text-primary transition-colors hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50"
            >
              <ExternalLink className="h-3.5 w-3.5 text-accent-primary" aria-hidden="true" />
              <span>{m.datasheetOpenDetail}</span>
            </Link>
          )}
          <button
            type="button"
            disabled={!stockMeta.isAvailable}
            onClick={handleAddToCart}
            className="vt-motion-press inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-accent-primary px-4 text-xs font-semibold text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50"
          >
            {added ? (
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ShoppingCart className="h-4 w-4" aria-hidden="true" />
            )}
            <span>
              {!stockMeta.isAvailable
                ? isEnglish
                  ? 'Out of Stock'
                  : 'Stok Habis'
                : added
                  ? isEnglish
                    ? 'Added to Cart'
                    : 'Masuk Keranjang'
                  : isEnglish
                    ? 'Add to Cart'
                    : '+ Keranjang'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
