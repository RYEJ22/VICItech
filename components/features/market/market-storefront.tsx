'use client';

import {
  AlertCircle,
  ArrowUpDown,
  Layers,
  Package,
  RotateCcw,
  Search,
  ShoppingCart,
  Sliders,
} from 'lucide-react';
import { useEffect, useId, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import { useCheckout } from '@/context/CheckoutContext';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import {
  isProductCategory,
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_LABELS,
} from '@/lib/admin/products-validation';
import type {
  ProductCategory,
  ProductRow,
  ProductStockStatus,
} from '@/lib/admin/products-validation';
import { getProductTrustBadge } from '@/lib/market/product-presenter';
import { MarketProductCard } from './market-product-card';

type SortOption = 'newest' | 'price_asc' | 'price_desc';

interface MarketStorefrontProps {
  readonly initialProducts: readonly ProductRow[];
  readonly initialCategory?: string;
  readonly initialError?: string | null;
  readonly onOpenLibrary?: () => void;
  readonly onOpenBuilder?: () => void;
}

const STOCK_FILTER_OPTIONS: readonly {
  readonly id: 'all' | ProductStockStatus;
  readonly label: string;
}[] = [
  { id: 'all', label: 'Semua Stok' },
  { id: 'ready', label: 'Ready Stock' },
  { id: 'preorder', label: 'Pre-Order' },
];

export function MarketStorefront({
  initialProducts,
  initialCategory = 'all',
  initialError = null,
  onOpenLibrary,
  onOpenBuilder,
}: MarketStorefrontProps): ReactElement {
  const [selectedCategory, setSelectedCategory] = useState<'all' | ProductCategory>(() =>
    isProductCategory(initialCategory) ? initialCategory : 'all',
  );
  const [stockFilter, setStockFilter] = useState<'all' | ProductStockStatus>('all');
  const [iotQcOnly, setIotQcOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 250);

  const { totalCartItems, totalCartPrice, triggerCartCheckout } = useCheckout();

  const searchInputId = useId();
  const sortSelectId = useId();

  useEffect(() => {
    if (isProductCategory(initialCategory)) {
      setSelectedCategory(initialCategory);
    } else if (initialCategory === 'all') {
      setSelectedCategory('all');
    }
  }, [initialCategory]);

  const categoryCounts = useMemo(() => {
    const counts: Record<ProductCategory, number> = {
      'pc-build': 0,
      laptop: 0,
      smartphone: 0,
      component: 0,
      accessory: 0,
    };
    for (const item of initialProducts) {
      counts[item.category] += 1;
    }
    return counts;
  }, [initialProducts]);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = debouncedQuery.trim().toLowerCase();

    const filtered = initialProducts.filter((product) => {
      if (selectedCategory !== 'all' && product.category !== selectedCategory) return false;
      if (stockFilter !== 'all' && product.stock_status !== stockFilter) return false;
      if (iotQcOnly && !getProductTrustBadge(product).hasVerifiedQc) return false;
      if (!normalizedQuery) return true;

      const specsValues =
        product.specs && typeof product.specs === 'object' && !Array.isArray(product.specs)
          ? Object.values(product.specs).map(String).join(' ')
          : '';
      const haystack = `${product.title} ${product.description} ${PRODUCT_CATEGORY_LABELS[product.category]} ${specsValues}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });

    const sorted = [...filtered];
    if (sortBy === 'price_asc') {
      sorted.sort((a, b) => Number(a.price) - Number(b.price));
    } else if (sortBy === 'price_desc') {
      sorted.sort((a, b) => Number(b.price) - Number(a.price));
    } else {
      sorted.sort((a, b) => b.created_at.localeCompare(a.created_at));
    }
    return sorted;
  }, [debouncedQuery, initialProducts, iotQcOnly, selectedCategory, sortBy, stockFilter]);

  const hasActiveFilters =
    selectedCategory !== 'all' ||
    stockFilter !== 'all' ||
    iotQcOnly ||
    debouncedQuery.trim().length > 0;

  const resetFilters = () => {
    setSelectedCategory('all');
    setStockFilter('all');
    setIotQcOnly(false);
    setSortBy('newest');
    setQuery('');
  };

  return (
    <div className="mx-auto max-w-shell space-y-8 px-4 py-10 sm:px-6 sm:py-12">
      {totalCartItems > 0 && (
        <div
          role="region"
          aria-label="Ringkasan keranjang Market"
          className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#EA580C]/30 bg-[#FFFFFF] px-5 py-4"
        >
          <div className="flex flex-wrap items-center gap-3 text-sm text-[#18181B]">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#FAF9F6] text-[#EA580C]">
              <ShoppingCart className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            </span>
            <div>
              <p className="font-semibold">
                Keranjang Belanja:{' '}
                <AnimatedNumber value={totalCartItems} format="number" /> item
              </p>
              <p className="text-xs text-[#71717A]">
                Subtotal estimasi:{' '}
                <AnimatedNumber
                  value={totalCartPrice}
                  format="currency"
                  className="font-semibold text-[#18181B]"
                />
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={triggerCartCheckout}
            className="vt-btn-tactile inline-flex min-h-11 items-center gap-2 rounded-full bg-accent-cta px-5 py-2 text-xs font-semibold text-accent-foreground hover:bg-accent-cta-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]/60"
          >
            <ShoppingCart className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            <span>Lanjut Checkout</span>
          </button>
        </div>
      )}

      {initialError && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-status-danger/30 bg-[#FFFFFF] p-4 text-sm text-[#18181B]"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-status-danger" strokeWidth={1.75} aria-hidden="true" />
          <p>{initialError}</p>
        </div>
      )}

      {/* Search, Stock Status, IoT QC Toggle & Categories without nested borders */}
      <div className="space-y-5 border-b border-[#E4E4E7] pb-7">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative flex-1">
            <label htmlFor={searchInputId} className="sr-only">
              Cari produk di ViciTech Market
            </label>
            <Search
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#71717A]"
              strokeWidth={1.75}
              aria-hidden="true"
            />
            <input
              id={searchInputId}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari PC build, ThinkPad, GPU, atau komponen…"
              className="min-h-11 w-full rounded-full border border-[#E4E4E7] bg-[#FFFFFF] py-2.5 pl-11 pr-4 text-sm text-[#18181B] outline-none transition placeholder:text-[#71717A]/75 focus:border-[#EA580C] focus:ring-2 focus:ring-[#EA580C]/15"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div role="group" aria-label="Filter ketersediaan stok" className="inline-flex flex-wrap gap-1.5">
              {STOCK_FILTER_OPTIONS.map((option) => {
                const active = stockFilter === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setStockFilter(option.id)}
                    className={`min-h-10 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]/60 ${
                      active
                        ? 'bg-[#18181B] font-semibold text-white'
                        : 'border border-[#E4E4E7] bg-[#FFFFFF] text-[#71717A] hover:bg-[#F3F1ED] hover:text-[#18181B]'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            <ToggleSwitch
              compact
              label="Lulus IoT QC"
              checked={iotQcOnly}
              onChange={setIotQcOnly}
            />

            <div className="flex items-center gap-2">
              <label htmlFor={sortSelectId} className="sr-only">
                Urutkan produk
              </label>
              <span className="inline-flex items-center gap-1.5 text-xs text-[#71717A]">
                <ArrowUpDown className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
              </span>
              <select
                id={sortSelectId}
                value={sortBy}
                onChange={(event) => {
                  const value = event.target.value;
                  if (value === 'newest' || value === 'price_asc' || value === 'price_desc') {
                    setSortBy(value);
                  }
                }}
                className="min-h-10 rounded-full border border-[#E4E4E7] bg-[#FFFFFF] px-3.5 py-1.5 text-xs font-medium text-[#18181B] outline-none transition focus:border-[#EA580C] focus:ring-2 focus:ring-[#EA580C]/15"
              >
                <option value="newest">Terbaru</option>
                <option value="price_asc">Harga Terendah</option>
                <option value="price_desc">Harga Tertinggi</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div
            role="tablist"
            aria-label="Filter kategori produk market"
            className="flex flex-wrap gap-2"
          >
            <button
              type="button"
              role="tab"
              aria-selected={selectedCategory === 'all'}
              onClick={() => setSelectedCategory('all')}
              className={`inline-flex min-h-10 items-center gap-2 rounded-full px-4 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]/60 ${
                selectedCategory === 'all'
                  ? 'bg-[#18181B] font-semibold text-white'
                  : 'border border-[#E4E4E7] bg-[#FFFFFF] font-medium text-[#71717A] hover:bg-[#F3F1ED] hover:text-[#18181B]'
              }`}
            >
              <span>Semua Kategori</span>
              <span className="font-mono text-xs tabular-nums opacity-80">
                {initialProducts.length}
              </span>
            </button>

            {PRODUCT_CATEGORIES.map((category) => {
              const active = selectedCategory === category;
              const count = categoryCounts[category];
              return (
                <button
                  key={category}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSelectedCategory(category)}
                  className={`inline-flex min-h-10 items-center gap-2 rounded-full px-4 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]/60 ${
                    active
                      ? 'bg-[#18181B] font-semibold text-white'
                      : 'border border-[#E4E4E7] bg-[#FFFFFF] font-medium text-[#71717A] hover:bg-[#F3F1ED] hover:text-[#18181B]'
                  }`}
                >
                  <span>{PRODUCT_CATEGORY_LABELS[category]}</span>
                  <span className="font-mono text-xs tabular-nums opacity-80">{count}</span>
                </button>
              );
            })}
          </div>

          <p className="text-xs font-medium text-[#71717A]">
            Menampilkan{' '}
            <AnimatedNumber
              value={filteredProducts.length}
              format="number"
              className="font-semibold text-[#18181B]"
            />{' '}
            produk
          </p>
        </div>
      </div>

      {/* Product Grid or Empty States */}
      {initialProducts.length === 0 ? (
        <section
          aria-live="polite"
          className="rounded-2xl border border-[#E4E4E7] bg-[#FFFFFF] p-10 text-center"
        >
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#FAF9F6] text-[#EA580C]">
            <Package className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
          </div>
          <h2 className="mt-4 font-serif text-2xl font-semibold text-[#18181B]">
            Belum ada produk di etalase Market
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-[#71717A]">
            Admin dapat menambahkan produk baru atau paket preset melalui panel Admin. Anda tetap
            dapat menjelajahi komponen di Hardware Library atau merakit unit di Preset Builder.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {onOpenLibrary && (
              <button
                type="button"
                onClick={onOpenLibrary}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#E4E4E7] bg-[#FFFFFF] px-5 py-2.5 text-sm font-medium text-[#18181B] transition-colors hover:bg-[#F3F1ED] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]/60"
              >
                <Layers className="h-4 w-4 text-[#EA580C]" strokeWidth={1.75} aria-hidden="true" />
                <span>Buka Hardware Library</span>
              </button>
            )}
            {onOpenBuilder && (
              <button
                type="button"
                onClick={onOpenBuilder}
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-accent-cta px-5 py-2.5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-cta-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]/60"
              >
                <Sliders className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                <span>Buka Preset Builder</span>
              </button>
            )}
          </div>
        </section>
      ) : filteredProducts.length === 0 ? (
        <section
          aria-live="polite"
          className="rounded-2xl border border-[#E4E4E7] bg-[#FFFFFF] p-10 text-center"
        >
          <p className="font-serif text-2xl font-semibold text-[#18181B]">
            Produk tidak ditemukan
          </p>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-[#71717A]">
            Tidak ada produk yang cocok dengan kata kunci atau filter yang dipilih. Atur ulang
            filter untuk menampilkan semua produk di etalase ViciTech Market.
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-accent-cta px-5 py-2.5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-cta-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]/60"
            >
              <RotateCcw className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              <span>Reset Filter</span>
            </button>
          )}
        </section>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {filteredProducts.map((product, index) => (
            <MarketProductCard
              key={product.id}
              product={product}
              isPriorityImage={index === 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}
