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

  const { totalCartItems, totalCartPrice, openCart, triggerCartCheckout } = useCheckout();

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
      console: 0,
      handheld: 0,
      component: 0,
      accessory: 0,
    };
    for (const item of initialProducts) {
      counts[item.category] = (counts[item.category] ?? 0) + 1;
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
      const metadataValues =
        product.metadata && typeof product.metadata === 'object' && !Array.isArray(product.metadata)
          ? Object.values(product.metadata).map(String).join(' ')
          : '';
      const haystack = `${product.title} ${product.description} ${PRODUCT_CATEGORY_LABELS[product.category]} ${specsValues} ${metadataValues}`.toLowerCase();
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
    <div className="mx-auto min-w-0 max-w-7xl space-y-4 overflow-x-clip px-4 pb-24 pt-4 sm:space-y-6 sm:px-6 sm:pb-24 sm:pt-8 lg:px-8">
      {(onOpenLibrary || onOpenBuilder) && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-default bg-surface p-3 shadow-sm sm:gap-4 sm:p-5">
          <p className="line-clamp-2 max-w-[68ch] text-xs leading-relaxed text-secondary sm:text-sm">
            Pilih unit rakitan siap pakai, laptop lulus IoT QC, atau komponen terverifikasi. Klik
            kartu produk mana saja untuk melihat detail lengkap, spesifikasi, dan produk serupa.
          </p>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            {onOpenLibrary && (
              <button
                type="button"
                onClick={onOpenLibrary}
                className="vt-motion-press vt-btn-tactile inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-default bg-subtle px-3 py-2 text-xs font-medium text-primary hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60 sm:min-h-11 sm:flex-initial sm:px-4 sm:text-sm"
              >
                <Layers className="h-4 w-4 text-accent-hover" strokeWidth={1.75} aria-hidden="true" />
                <span>Buka Library &amp; Spek</span>
              </button>
            )}
            {onOpenBuilder && (
              <button
                type="button"
                onClick={onOpenBuilder}
                className="vt-motion-press vt-btn-tactile inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-accent-cta px-3 py-2 text-xs font-semibold text-accent-foreground hover:bg-accent-cta-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60 sm:min-h-11 sm:flex-initial sm:px-4 sm:text-sm"
              >
                <Sliders className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                <span>Buka Preset Builder</span>
              </button>
            )}
          </div>
        </div>
      )}

      {totalCartItems > 0 && (
        <div
          role="region"
          aria-label="Ringkasan keranjang Market"
          className="vt-pop flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent-primary/35 bg-accent-subtle px-3 py-2.5 shadow-sm sm:px-4 sm:py-3"
        >
          <div className="flex flex-wrap items-center gap-2.5 text-sm text-primary">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-surface text-accent-cta shadow-sm">
              <ShoppingCart className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            </span>
            <div>
              <p className="font-semibold">
                Keranjang Belanja:{' '}
                <AnimatedNumber value={totalCartItems} format="number" /> item
              </p>
              <p className="text-xs text-secondary">
                Subtotal estimasi:{' '}
                <AnimatedNumber
                  value={totalCartPrice}
                  format="currency"
                  className="font-semibold text-primary"
                />
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={openCart}
              className="vt-motion-press vt-btn-tactile inline-flex min-h-11 items-center gap-2 rounded-lg border border-default bg-surface px-3.5 py-2 text-xs font-semibold text-primary hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
            >
              <span>Lihat Keranjang</span>
            </button>
            <button
              type="button"
              onClick={triggerCartCheckout}
              className="vt-motion-press vt-btn-tactile inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent-cta px-4 py-2 text-xs font-semibold text-accent-foreground shadow-sm hover:bg-accent-cta-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
            >
              <ShoppingCart className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              <span>Lanjut Checkout</span>
            </button>
          </div>
        </div>
      )}

      {initialError && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-status-danger/30 bg-surface p-4 text-sm text-primary shadow-sm"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-status-danger" strokeWidth={1.75} aria-hidden="true" />
          <p>{initialError}</p>
        </div>
      )}

      {/* Sticky Frosted-Glass Search, Filter Controls & Category Pills */}
      <div className="vt-glass-bar sticky top-14 z-20 space-y-2.5 rounded-xl border border-default p-3 shadow-card sm:space-y-3 sm:p-4 md:top-[76px]">
        <div className="flex flex-col gap-2 sm:gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative flex-1">
            <label htmlFor={searchInputId} className="sr-only">
              Cari produk di ViciTech Market
            </label>
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary"
              strokeWidth={1.75}
              aria-hidden="true"
            />
            <input
              id={searchInputId}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari PC build, ThinkPad, PS5, Steam Deck, GPU, atau komponen…"
              className="vt-form-control min-h-10 w-full rounded-lg border border-default bg-subtle py-2 pl-10 pr-4 text-sm text-primary outline-none transition placeholder:text-secondary/75 focus:border-accent-primary focus:bg-surface focus:ring-2 focus:ring-accent-primary/20 sm:min-h-11 sm:py-2.5"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5">
            <div
              role="group"
              aria-label="Filter ketersediaan stok"
              className="no-scrollbar inline-flex max-w-full flex-nowrap gap-0.5 overflow-x-auto rounded-lg border border-default bg-subtle p-0.5 sm:gap-1 sm:p-1"
            >
              {STOCK_FILTER_OPTIONS.map((option) => {
                const active = stockFilter === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setStockFilter(option.id)}
                    className={`vt-motion-press vt-btn-tactile min-h-8 shrink-0 whitespace-nowrap rounded-md px-2.5 py-1 text-[11px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50 sm:min-h-9 sm:px-3 sm:py-1.5 sm:text-xs ${
                      active
                        ? 'bg-accent-primary font-semibold text-white'
                        : 'text-secondary hover:bg-surface hover:text-primary'
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
              <span className="inline-flex items-center gap-1.5 text-xs text-secondary">
                <ArrowUpDown className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                <span className="hidden sm:inline">Urutkan:</span>
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
                className="vt-form-control min-h-10 rounded-lg border border-default bg-subtle px-3 py-2 text-xs font-medium text-primary outline-none transition focus:border-accent-primary focus:bg-surface focus:ring-2 focus:ring-accent-primary/20 sm:min-h-11"
              >
                <option value="newest">Terbaru</option>
                <option value="price_asc">Harga Terendah</option>
                <option value="price_desc">Harga Tertinggi</option>
              </select>
            </div>
          </div>
        </div>

        {/* Category Filter Pills (with mobile right-edge fade cue) + Live Count */}
        <div className="flex flex-col gap-2 border-t border-default pt-2.5 md:flex-row md:items-center md:justify-between md:gap-3">
          <div className="relative min-w-0 flex-1">
            <div
              role="tablist"
              aria-label="Filter kategori produk market"
              className="no-scrollbar flex flex-nowrap gap-1.5 overflow-x-auto pb-0.5 pr-8 md:flex-wrap md:overflow-visible md:pb-0 md:pr-0"
            >
              <button
                type="button"
                role="tab"
                aria-selected={selectedCategory === 'all'}
                onClick={() => setSelectedCategory('all')}
                className={`vt-motion-press vt-btn-tactile inline-flex min-h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60 sm:min-h-10 sm:gap-2 sm:px-4 ${
                  selectedCategory === 'all'
                    ? 'bg-accent-cta font-semibold text-accent-foreground hover:bg-accent-cta-hover'
                    : 'border border-default bg-canvas font-medium text-secondary hover:bg-subtle hover:text-primary'
                }`}
              >
                <span>Semua</span>
                <span className="font-mono text-[11px] tabular-nums opacity-85">
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
                    className={`vt-motion-press vt-btn-tactile inline-flex min-h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60 sm:min-h-10 sm:gap-2 sm:px-4 ${
                      active
                        ? 'bg-accent-cta font-semibold text-accent-foreground hover:bg-accent-cta-hover'
                        : 'border border-default bg-canvas font-medium text-secondary hover:bg-subtle hover:text-primary'
                    }`}
                  >
                    <span>{PRODUCT_CATEGORY_LABELS[category]}</span>
                    <span className="font-mono text-[11px] tabular-nums opacity-85">{count}</span>
                  </button>
                );
              })}
            </div>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-surface to-transparent md:hidden"
            />
          </div>

          <div className="flex shrink-0 items-center justify-between gap-2 md:justify-end">
            <p className="text-xs font-medium text-secondary">
              Menampilkan{' '}
              <AnimatedNumber
                value={filteredProducts.length}
                format="number"
                className="font-semibold text-primary"
              />{' '}
              produk
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex min-h-8 items-center gap-1 rounded-full px-2.5 text-xs font-semibold text-accent-cta hover:bg-accent-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
              >
                <RotateCcw className="h-3 w-3" aria-hidden="true" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Product Grid or Empty States */}
      {initialProducts.length === 0 ? (
        <section
          aria-live="polite"
          className="rounded-xl border border-default bg-surface p-5 text-center shadow-sm sm:p-10"
        >
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-default bg-subtle text-accent-hover">
            <Package className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
          </div>
          <h2 className="tracking-tight mt-4 font-sans text-2xl font-bold text-primary">
            Belum ada produk di etalase Market
          </h2>
          <p className="mx-auto mt-2 max-w-[65ch] text-sm leading-relaxed text-secondary">
            Admin dapat menambahkan produk baru atau paket preset melalui panel Admin Market
            Products. Sementara itu, Anda dapat mengeksplorasi komponen di Hardware Library atau
            merakit unit custom di Preset Builder.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {onOpenLibrary && (
              <button
                type="button"
                onClick={onOpenLibrary}
                className="vt-motion-press vt-btn-tactile inline-flex min-h-11 items-center gap-2 rounded-lg border border-default bg-subtle px-5 py-2.5 text-sm font-medium text-primary hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
              >
                <Layers className="h-4 w-4 text-accent-hover" strokeWidth={1.75} aria-hidden="true" />
                <span>Buka Hardware Library</span>
              </button>
            )}
            {onOpenBuilder && (
              <button
                type="button"
                onClick={onOpenBuilder}
                className="vt-motion-press vt-btn-tactile inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent-cta px-5 py-2.5 text-sm font-semibold text-accent-foreground hover:bg-accent-cta-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
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
          className="rounded-xl border border-default bg-surface p-6 text-center shadow-card sm:p-12"
        >
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl border border-default bg-canvas text-accent-primary">
            <Search className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
          </div>
          <h2 className="mt-4 font-sans text-xl font-bold tracking-tight text-primary sm:text-2xl">
            Produk tidak ditemukan
          </h2>
          <p className="mx-auto mt-2 max-w-[58ch] text-sm leading-relaxed text-secondary">
            {debouncedQuery.trim()
              ? `Tidak ada produk yang cocok dengan pencarian “${debouncedQuery.trim()}” pada filter aktif.`
              : 'Belum ada unit pada kombinasi kategori dan status stok yang Anda pilih.'}{' '}
            Atur ulang filter untuk kembali melihat seluruh etalase ViciTech Market.
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="vt-motion-press vt-btn-tactile mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent-primary px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 ease-smooth hover:bg-accent-hover active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50"
            >
              <RotateCcw className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              <span>Reset Filter</span>
            </button>
          )}
        </section>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
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
