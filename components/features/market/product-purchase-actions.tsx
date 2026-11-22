'use client';

import Link from 'next/link';
import { RefreshCw, ShoppingBag, ShoppingCart, Sliders } from 'lucide-react';
import type { ReactElement } from 'react';
import { ShareMenu } from '@/components/features/share/share-menu';
import { useCheckout } from '@/context/CheckoutContext';
import type { ProductRow } from '@/lib/admin/products-validation';
import {
  buildCheckoutPayloadFromProduct,
  canOpenInPresetBuilder,
  canSimulateTradeIn,
  getCategoryLabel,
  getProductPrimaryImage,
  getProductSummary,
  getStockMeta,
} from '@/lib/market/product-presenter';

interface ProductPurchaseActionsProps {
  readonly product: ProductRow;
  readonly canonicalPath: string;
}

export function ProductPurchaseActions({
  product,
  canonicalPath,
}: ProductPurchaseActionsProps): ReactElement {
  const { addToCart, triggerCheckout } = useCheckout();
  const stockMeta = getStockMeta(product.stock_status);
  const showBuilderCta = canOpenInPresetBuilder(product);
  const showTradeInCta = canSimulateTradeIn(product);
  const primaryImage = getProductPrimaryImage(product);
  const checkoutPayload = buildCheckoutPayloadFromProduct(product);

  const handleBuyNow = () => {
    if (!stockMeta.isAvailable) return;
    triggerCheckout(checkoutPayload);
  };

  const handleAddToCart = () => {
    if (!stockMeta.isAvailable) return;
    addToCart({
      ...checkoutPayload,
      slug: product.slug,
      category: getCategoryLabel(product.category),
      image: primaryImage,
    });
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <button
          type="button"
          onClick={handleBuyNow}
          disabled={!stockMeta.isAvailable}
          className="vt-btn-tactile inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-accent-cta px-5 py-3 text-sm font-semibold text-accent-foreground shadow-sm hover:bg-accent-cta-hover disabled:cursor-not-allowed disabled:bg-subtle disabled:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
        >
          <ShoppingBag className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
          <span>{stockMeta.isAvailable ? 'Beli Sekarang' : 'Stok Sedang Habis'}</span>
        </button>

        <button
          type="button"
          onClick={handleAddToCart}
          disabled={!stockMeta.isAvailable}
          className="vt-btn-tactile inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-default bg-surface px-5 py-3 text-sm font-semibold text-primary hover:border-accent-primary/50 hover:bg-subtle disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
        >
          <ShoppingCart className="h-4 w-4 shrink-0 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
          <span>Tambah ke Keranjang</span>
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 pt-1">
        {showBuilderCta && (
          <Link
            href={`/home?tab=builder&productId=${encodeURIComponent(product.id)}`}
            className="vt-btn-tactile inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-default bg-subtle px-4 py-2 text-xs font-medium text-primary hover:border-accent-primary/50 hover:bg-accent-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
          >
            <Sliders className="h-4 w-4 shrink-0 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
            <span>Buka di Preset Builder</span>
          </Link>
        )}

        {showTradeInCta && (
          <Link
            href="/home?tab=tradein"
            className="vt-btn-tactile inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-default bg-subtle px-4 py-2 text-xs font-medium text-primary hover:border-accent-primary/50 hover:bg-accent-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
          >
            <RefreshCw className="h-4 w-4 shrink-0 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
            <span>Simulasi Trade-In</span>
          </Link>
        )}

        <ShareMenu
          title={product.title}
          text={getProductSummary(product)}
          url={canonicalPath}
          label="Bagikan"
        />
      </div>
    </div>
  );
}
