'use client';

import { useEffect, useMemo } from 'react';
import type { ReactElement } from 'react';
import Link from 'next/link';
import { Minus, Package, Plus, ShoppingCart, Trash2, X } from 'lucide-react';
import type { MarketCartItem } from '@/context/CheckoutContext';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';

interface CartDrawerProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly items: readonly MarketCartItem[];
  readonly totalItems: number;
  readonly totalPrice: number;
  readonly onUpdateQuantity: (id: string, nextQuantity: number) => void;
  readonly onRemoveItem: (id: string) => void;
  readonly onClearCart: () => void;
  readonly onCheckout: () => void;
}

const formatIdr = (amount: number): string =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.round(amount || 0)));

const focusRing =
  'vt-motion-press focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50';

export function CartDrawer({
  isOpen,
  onClose,
  items,
  totalItems,
  totalPrice,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onCheckout,
}: CartDrawerProps): ReactElement | null {
  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return undefined;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onClose]);

  const estimatedJitBuffer = useMemo(() => {
    let presetSubtotal = 0;
    for (const item of items) {
      const isPreset =
        item.source === 'preset_builder' ||
        String(item.type || '').toLowerCase() === 'preset_builder';
      if (isPreset) {
        const qty = Math.max(1, Number(item.quantity ?? item.qty) || 1);
        const unit = Math.max(0, Number(item.price) || 0);
        presetSubtotal += unit * qty;
      }
    }
    return Math.round(presetSubtotal * 0.05);
  }, [items]);

  if (!isOpen) return null;

  return (
    <div
      className="vt-backdrop-enter fixed inset-0 z-[72] flex justify-end bg-black/40"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-title"
        className="vt-panel-enter flex h-[100dvh] max-h-[100dvh] w-full max-w-md flex-col border-l border-default bg-canvas text-primary shadow-floating"
      >
        <header className="flex items-center justify-between gap-3 border-b border-default bg-surface px-4 py-3.5 sm:px-5 sm:py-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-default bg-canvas text-accent-primary">
              <ShoppingCart className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2
                  id="cart-drawer-title"
                  className="font-sans text-lg font-bold tracking-tight text-primary"
                >
                  Keranjang Belanja
                </h2>
                {totalItems > 0 && (
                  <span key={`cart-total-${totalItems}`} className="vt-motion-pop rounded-full bg-accent-subtle px-2 py-0.5 font-mono text-xs font-semibold tabular-nums text-accent-primary">
                    {totalItems}
                  </span>
                )}
              </div>
              <p className="text-xs text-secondary">
                Unit Market &amp; komponen tersimpan
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {items.length > 0 && (
              <button
                type="button"
                onClick={onClearCart}
                className={`min-h-9 rounded-lg px-2.5 text-xs font-medium text-secondary transition-colors hover:bg-subtle hover:text-status-danger ${focusRing}`}
              >
                Kosongkan
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup keranjang belanja"
              className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-default bg-canvas text-primary transition-colors hover:bg-subtle ${focusRing}`}
            >
              <X className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-default bg-surface p-6 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-subtle text-accent-primary">
                <ShoppingCart className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
              </span>
              <h3 className="mt-4 font-sans text-lg font-bold tracking-tight text-primary">
                Keranjang masih kosong
              </h3>
              <p className="mt-1.5 max-w-[30ch] text-xs leading-relaxed text-secondary">
                Tambahkan PC rakitan, laptop lolos IoT QC, atau komponen dari katalog Market untuk mulai checkout.
              </p>
              <Link
                href="/market"
                onClick={onClose}
                className={`vt-btn-tactile mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-accent-primary px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 ease-smooth hover:bg-accent-hover active:scale-[0.98] ${focusRing}`}
              >
                Jelajahi Market
              </Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {items.map((item) => {
                const qty = Math.max(1, Number(item.quantity ?? item.qty) || 1);
                const unitPrice = Math.max(0, Number(item.price) || 0);
                const lineTotal = unitPrice * qty;
                const displayTitle = item.title || item.name || 'Produk ViciTech';
                const isPreset =
                  item.source === 'preset_builder' ||
                  String(item.type || '').toLowerCase() === 'preset_builder';
                const productHref = item.slug
                  ? `/market/${encodeURIComponent(item.slug)}`
                  : null;

                return (
                  <li
                    key={item.id}
                    className="vt-card-lift rounded-xl border border-default bg-surface p-3.5 shadow-card"
                  >
                    <div className="flex items-start gap-3">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={displayTitle}
                          width={64}
                          height={64}
                          loading="lazy"
                          decoding="async"
                          className="h-16 w-16 shrink-0 rounded-lg border border-default bg-subtle object-cover"
                        />
                      ) : (
                        <span className="grid h-16 w-16 shrink-0 place-items-center rounded-lg border border-default bg-subtle text-secondary">
                          <Package className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
                        </span>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-secondary">
                          {item.category && (
                            <span className="font-medium text-primary">
                              {item.category}
                            </span>
                          )}
                          <span>·</span>
                          <span>
                            {item.seller_type === 'partner'
                              ? 'Mitra Terverifikasi'
                              : 'ViciTech Official'}
                          </span>
                        </div>

                        {productHref ? (
                          <Link
                            href={productHref}
                            onClick={onClose}
                            className={`mt-0.5 line-clamp-2 block text-sm font-semibold leading-snug text-primary hover:text-accent-primary ${focusRing}`}
                          >
                            {displayTitle}
                          </Link>
                        ) : (
                          <p className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug text-primary">
                            {displayTitle}
                          </p>
                        )}

                        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
                          <span className="rounded-md border border-default bg-canvas px-1.5 py-0.5 text-[10px] font-medium text-secondary">
                            {isPreset ? 'Preset Builder · +5% JIT' : 'Ready Stock Market'}
                          </span>
                          <span className="font-mono text-sm font-semibold tabular-nums text-primary">
                            {formatIdr(lineTotal)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3 border-t border-default pt-2.5">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.id, qty - 1)}
                          aria-label={
                            qty <= 1
                              ? `Hapus ${displayTitle} dari keranjang`
                              : `Kurangi jumlah ${displayTitle}`
                          }
                          className={`grid h-10 w-10 place-items-center rounded-lg border border-default bg-canvas text-primary transition-colors hover:bg-subtle sm:h-9 sm:w-9 ${focusRing}`}
                        >
                          <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                        <span
                          key={qty}
                          className="vt-num-pop min-w-[2rem] text-center font-mono text-xs font-semibold tabular-nums text-primary"
                          aria-label={`Jumlah ${qty}`}
                        >
                          {qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.id, qty + 1)}
                          aria-label={`Tambah jumlah ${displayTitle}`}
                          className={`grid h-10 w-10 place-items-center rounded-lg border border-default bg-canvas text-primary transition-colors hover:bg-subtle sm:h-9 sm:w-9 ${focusRing}`}
                        >
                          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                        {qty > 1 && (
                          <span className="ml-1 font-mono text-[11px] tabular-nums text-secondary">
                            @{formatIdr(unitPrice)}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => onRemoveItem(item.id)}
                        aria-label={`Hapus ${displayTitle}`}
                        className={`inline-flex min-h-9 items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-secondary transition-colors hover:bg-red-50 hover:text-status-danger ${focusRing}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Hapus</span>
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <footer className="space-y-3 border-t border-default bg-surface p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-5">
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center justify-between text-secondary">
                <span>Subtotal ({totalItems} item)</span>
                <AnimatedNumber
                  value={totalPrice}
                  format="currency"
                  className="font-mono font-semibold tabular-nums text-primary"
                />
              </div>
              {estimatedJitBuffer > 0 ? (
                <div className="flex items-center justify-between text-xs text-secondary">
                  <span>Estimasi JIT Buffer (5% item Preset Builder)</span>
                  <span className="font-mono font-medium tabular-nums text-primary">
                    +{formatIdr(estimatedJitBuffer)}
                  </span>
                </div>
              ) : (
                <p className="text-[11px] text-secondary">
                  Barang Ready Stock Market bebas biaya JIT Buffer 5%.
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={onCheckout}
              className={`vt-btn-tactile flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent-primary px-5 py-3 text-sm font-semibold text-white transition-all duration-200 ease-smooth hover:bg-accent-hover active:scale-[0.98] ${focusRing}`}
            >
              <ShoppingCart className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              <span>Lanjut ke Pembayaran</span>
            </button>
          </footer>
        )}
      </aside>
    </div>
  );
}

export default CartDrawer;
