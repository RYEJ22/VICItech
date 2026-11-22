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
    <div className="mx-auto max-w-shell space-y-6 px-4 py-8 sm:px-6">
      {(onOpenLibrary || onOpenBuilder) && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-default bg-surface p-5 shadow-sm">
          <p className="max-w-[68ch] text-sm leading-relaxed text-secondary">
            Pilih unit rakitan siap pakai, laptop lulus IoT QC, atau komponen terverifikasi. Klik
            kartu produk mana saja untuk melihat detail lengkap, spesifikasi, dan produk serupa.
          </p>
          <div className="flex flex-wrap gap-2">
            {onOpenLibrary && (
              <button
                type="button"
                onClick={onOpenLibrary}
                className="vt-btn-tactile inline-flex min-h-11 items-center gap-2 rounded-lg border border-default bg-subtle px-4 py-2 text-sm font-medium text-primary hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
              >
                <Layers className="h-4 w-4 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
                <span>Buka Library &amp; Spek</span>
              </button>
            )}
            {onOpenBuilder && (
              <button
                type="button"
                onClick={onOpenBuilder}
                className="vt-btn-tactile inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent-cta px-4 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent-cta-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
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
          className="vt-pop flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent-primary/35 bg-accent-subtle px-4 py-3 shadow-sm"
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

          <button
            type="button"
            onClick={triggerCartCheckout}
            className="vt-btn-tactile inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent-cta px-4 py-2 text-xs font-semibold text-accent-foreground shadow-sm hover:bg-accent-cta-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
          >
            <ShoppingCart className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            <span>Lanjut Checkout</span>
          </button>
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

      {/* Search, Stock Status, IoT QC Toggle & Sort Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-default bg-surface p-4 shadow-sm xl:flex-row xl:items-center xl:justify-between">
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
            placeholder="Cari PC build, ThinkPad, GPU, atau komponen…"
            className="min-h-11 w-full rounded-lg border border-default bg-canvas py-2.5 pl-10 pr-4 text-sm text-primary outline-none transition placeholder:text-secondary/75 focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div
            role="group"
            aria-label="Filter ketersediaan stok"
            className="inline-flex flex-wrap gap-1 rounded-lg border border-default bg-subtle p-1"
          >
            {STOCK_FILTER_OPTIONS.map((option) => {
              const active = stockFilter === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setStockFilter(option.id)}
                  className={`vt-btn-tactile min-h-11 rounded-md px-3 py-1.5 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60 ${
                    active
                      ? 'bg-accent-cta font-semibold text-accent-foreground'
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
              className="min-h-11 rounded-lg border border-default bg-canvas px-3 py-2 text-xs font-medium text-primary outline-none transition focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20"
            >
              <option value="newest">Terbaru</option>
              <option value="price_asc">Harga Terendah</option>
              <option value="price_desc">Harga Tertinggi</option>
            </select>
          </div>
        </div>
      </div>

      {/* Category Filter Pills + Live Count */}
      <div className="flex flex-wrap items-center justify-between gap-3">
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
            className={`vt-btn-tactile inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60 ${
              selectedCategory === 'all'
                ? 'bg-accent-cta font-semibold text-accent-foreground hover:bg-accent-cta-hover'
                : 'border border-default bg-surface font-medium text-secondary hover:bg-subtle hover:text-primary'
            }`}
          >
            <span>Semua Kategori</span>
            <span className="font-mono text-xs tabular-nums opacity-85">
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
                className={`vt-btn-tactile inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60 ${
                  active
                    ? 'bg-accent-cta font-semibold text-accent-foreground hover:bg-accent-cta-hover'
                    : 'border border-default bg-surface font-medium text-secondary hover:bg-subtle hover:text-primary'
                }`}
              >
                <span>{PRODUCT_CATEGORY_LABELS[category]}</span>
                <span className="font-mono text-xs tabular-nums opacity-85">{count}</span>
              </button>
            );
          })}
        </div>

        <p className="text-xs font-medium text-secondary">
          Menampilkan{' '}
          <AnimatedNumber
            value={filteredProducts.length}
            format="number"
            className="font-semibold text-primary"
          />{' '}
          produk
        </p>
      </div>

      {/* Product Grid or Empty States */}
      {initialProducts.length === 0 ? (
        <section
          aria-live="polite"
          className="rounded-xl border border-default bg-surface p-8 text-center shadow-sm sm:p-10"
        >
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-default bg-subtle text-accent-primary">
            <Package className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
          </div>
          <h2 className="mt-4 font-serif text-2xl font-semibold text-primary">
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
                className="vt-btn-tactile inline-flex min-h-11 items-center gap-2 rounded-lg border border-default bg-subtle px-5 py-2.5 text-sm font-medium text-primary hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
              >
                <Layers className="h-4 w-4 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
                <span>Buka Hardware Library</span>
              </button>
            )}
            {onOpenBuilder && (
              <button
                type="button"
                onClick={onOpenBuilder}
                className="vt-btn-tactile inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent-cta px-5 py-2.5 text-sm font-semibold text-accent-foreground hover:bg-accent-cta-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
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
          className="rounded-xl border border-default bg-surface p-8 text-center shadow-sm sm:p-10"
        >
          <p className="font-serif text-2xl font-semibold text-primary">
            Produk tidak ditemukan
          </p>
          <p className="mx-auto mt-2 max-w-[65ch] text-sm leading-relaxed text-secondary">
            Tidak ada produk yang cocok dengan kata kunci atau filter yang dipilih. Atur ulang
            filter untuk menampilkan semua produk di etalase ViciTech Market.
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="vt-btn-tactile mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent-cta px-5 py-2.5 text-sm font-semibold text-accent-foreground hover:bg-accent-cta-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
            >
              <RotateCcw className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              <span>Reset Filter</span>
            </button>
          )}
        </section>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
