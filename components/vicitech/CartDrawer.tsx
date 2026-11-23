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
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]/60';

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
      className="fixed inset-0 z-[72] flex justify-end bg-black/40"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-title"
        className="flex h-full w-full max-w-md flex-col border-l border-[#E4E4E7] bg-[#FAF9F6] text-[#18181B] shadow-2xl"
      >
        <header className="flex items-center justify-between gap-3 border-b border-[#E4E4E7] bg-white px-4 py-3.5 sm:px-5 sm:py-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[#E4E4E7] bg-[#FAF9F6] text-[#EA580C]">
              <ShoppingCart className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2
                  id="cart-drawer-title"
                  className="font-serif text-lg font-semibold text-[#18181B]"
                >
                  Keranjang Belanja
                </h2>
                {totalItems > 0 && (
                  <span className="rounded-full bg-[#EA580C]/10 px-2 py-0.5 font-mono text-xs font-semibold text-[#EA580C]">
                    {totalItems}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#71717A]">
                Unit Market &amp; komponen tersimpan
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {items.length > 0 && (
              <button
                type="button"
                onClick={onClearCart}
                className={`min-h-9 rounded-lg px-2.5 text-xs font-medium text-[#71717A] transition hover:bg-[#F3F1ED] hover:text-red-600 ${focusRing}`}
              >
                Kosongkan
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup keranjang belanja"
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[#E4E4E7] bg-[#FAF9F6] text-[#18181B] transition hover:bg-[#F3F1ED] ${focusRing}`}
            >
              <X className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-[#E4E4E7] bg-white p-6 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-[#F3F1ED] text-[#EA580C]">
                <ShoppingCart className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
              </span>
              <h3 className="mt-4 font-serif text-lg font-semibold text-[#18181B]">
                Keranjang masih kosong
              </h3>
              <p className="mt-1.5 max-w-[30ch] text-xs leading-relaxed text-[#71717A]">
                Tambahkan PC rakitan, laptop lolos IoT QC, atau komponen dari katalog Market untuk mulai checkout.
              </p>
              <Link
                href="/market"
                onClick={onClose}
                className={`vt-btn-tactile mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-[#EA580C] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#C2410C] ${focusRing}`}
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
                    className="rounded-xl border border-[#E4E4E7] bg-white p-3.5 shadow-sm"
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
                          className="h-16 w-16 shrink-0 rounded-lg border border-[#E4E4E7] bg-[#F3F1ED] object-cover"
                        />
                      ) : (
                        <span className="grid h-16 w-16 shrink-0 place-items-center rounded-lg border border-[#E4E4E7] bg-[#F3F1ED] text-[#71717A]">
                          <Package className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
                        </span>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[#71717A]">
                          {item.category && (
                            <span className="font-medium text-[#18181B]">
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
                            className={`mt-0.5 line-clamp-2 block text-sm font-semibold leading-snug text-[#18181B] hover:text-[#EA580C] ${focusRing}`}
                          >
                            {displayTitle}
                          </Link>
                        ) : (
                          <p className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug text-[#18181B]">
                            {displayTitle}
                          </p>
                        )}

                        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
                          <span className="rounded-md border border-[#E4E4E7] bg-[#FAF9F6] px-1.5 py-0.5 text-[10px] font-medium text-[#71717A]">
                            {isPreset ? 'Preset Builder · +5% JIT' : 'Ready Stock Market'}
                          </span>
                          <span className="font-mono text-sm font-semibold tabular-nums text-[#18181B]">
                            {formatIdr(lineTotal)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3 border-t border-[#E4E4E7] pt-2.5">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.id, qty - 1)}
                          aria-label={
                            qty <= 1
                              ? `Hapus ${displayTitle} dari keranjang`
                              : `Kurangi jumlah ${displayTitle}`
                          }
                          className={`grid h-9 w-9 place-items-center rounded-lg border border-[#E4E4E7] bg-[#FAF9F6] text-[#18181B] transition hover:bg-[#F3F1ED] ${focusRing}`}
                        >
                          <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                        <span
                          className="min-w-[2rem] text-center font-mono text-xs font-semibold tabular-nums text-[#18181B]"
                          aria-label={`Jumlah ${qty}`}
                        >
                          {qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.id, qty + 1)}
                          aria-label={`Tambah jumlah ${displayTitle}`}
                          className={`grid h-9 w-9 place-items-center rounded-lg border border-[#E4E4E7] bg-[#FAF9F6] text-[#18181B] transition hover:bg-[#F3F1ED] ${focusRing}`}
                        >
                          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                        {qty > 1 && (
                          <span className="ml-1 font-mono text-[11px] text-[#71717A]">
                            @{formatIdr(unitPrice)}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => onRemoveItem(item.id)}
                        aria-label={`Hapus ${displayTitle}`}
                        className={`inline-flex min-h-9 items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-[#71717A] transition hover:bg-red-50 hover:text-red-600 ${focusRing}`}
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
          <footer className="space-y-3 border-t border-[#E4E4E7] bg-white p-4 sm:p-5">
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center justify-between text-[#71717A]">
                <span>Subtotal ({totalItems} item)</span>
                <AnimatedNumber
                  value={totalPrice}
                  format="currency"
                  className="font-mono font-semibold text-[#18181B]"
                />
              </div>
              {estimatedJitBuffer > 0 ? (
                <div className="flex items-center justify-between text-xs text-[#71717A]">
                  <span>Estimasi JIT Buffer (5% item Preset Builder)</span>
                  <span className="font-mono font-medium text-[#18181B]">
                    +{formatIdr(estimatedJitBuffer)}
                  </span>
                </div>
              ) : (
                <p className="text-[11px] text-[#71717A]">
                  Barang Ready Stock Market bebas biaya JIT Buffer 5%.
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={onCheckout}
              className={`vt-btn-tactile flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#EA580C] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#C2410C] ${focusRing}`}
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
