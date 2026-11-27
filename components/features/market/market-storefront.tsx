'use client';

import {
  AlertCircle,
  ArrowUpDown,
  Camera,
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
import { useLanguage } from '@/components/providers/LanguageProvider';
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
import {
  CAMERA_PRODUCTION_CATEGORY_ID,
  CAMERA_PRODUCTION_SUBTYPES,
  getCameraSubtypeLabel,
  isCameraProductionProduct,
  isSampleCatalogProduct,
  resolveCameraProductionSubtype,
  SAMPLE_CAMERA_PRODUCTION_PRODUCTS,
  type CameraProductionSubtype,
} from '@/lib/market/camera-production';
import { getProductTrustBadge } from '@/lib/market/product-presenter';
import {
  PARTNER_LISTINGS_STORAGE_KEY,
  PARTNER_LISTINGS_UPDATED_EVENT,
  getCombinedPartnerListings,
  partnerListingToProductRow,
} from '@/lib/partners/partner-commerce';
import { MarketDatasheetModal } from './market-datasheet-modal';
import { MarketProductCard } from './market-product-card';

type SortOption = 'newest' | 'price_asc' | 'price_desc';
type StorefrontCategoryFilter = 'all' | ProductCategory | typeof CAMERA_PRODUCTION_CATEGORY_ID;

function isStorefrontCategoryFilter(value: string): value is StorefrontCategoryFilter {
  return (
    value === 'all' ||
    value === CAMERA_PRODUCTION_CATEGORY_ID ||
    isProductCategory(value)
  );
}

const EN_CATEGORY_LABELS: Readonly<Record<ProductCategory, string>> = {
  'pc-build': 'PC Build',
  laptop: 'Laptop',
  smartphone: 'Smartphone',
  console: 'Consoles',
  handheld: 'Handhelds',
  component: 'Components',
  accessory: 'Accessories',
};

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
  const { t, language, isEnglish } = useLanguage();
  const m = t.routes.market;
  const [selectedCategory, setSelectedCategory] = useState<StorefrontCategoryFilter>(() =>
    isStorefrontCategoryFilter(initialCategory) ? initialCategory : 'all',
  );
  const [selectedCameraSubtype, setSelectedCameraSubtype] = useState<'all' | CameraProductionSubtype>('all');
  const [datasheetProduct, setDatasheetProduct] = useState<ProductRow | null>(null);
  const [stockFilter, setStockFilter] = useState<'all' | ProductStockStatus>('all');
  const [iotQcOnly, setIotQcOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [query, setQuery] = useState('');
  const [partnerProducts, setPartnerProducts] = useState<readonly ProductRow[]>([]);
  const debouncedQuery = useDebouncedValue(query, 250);

  const { totalCartItems, totalCartPrice, openCart, triggerCartCheckout } = useCheckout();

  const searchInputId = useId();
  const sortSelectId = useId();

  useEffect(() => {
    const syncPartnerListings = () => {
      setPartnerProducts(getCombinedPartnerListings().map(partnerListingToProductRow));
    };
    syncPartnerListings();

    const handleStorage = (event: StorageEvent) => {
      if (event.key === PARTNER_LISTINGS_STORAGE_KEY) {
        syncPartnerListings();
      }
    };

    window.addEventListener(PARTNER_LISTINGS_UPDATED_EVENT, syncPartnerListings);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(PARTNER_LISTINGS_UPDATED_EVENT, syncPartnerListings);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  useEffect(() => {
    if (isStorefrontCategoryFilter(initialCategory)) {
      setSelectedCategory(initialCategory);
    }
  }, [initialCategory]);

  useEffect(() => {
    if (selectedCategory !== CAMERA_PRODUCTION_CATEGORY_ID) {
      setSelectedCameraSubtype('all');
    }
  }, [selectedCategory]);

  const catalogProducts = useMemo(() => {
    const hasLiveCameraGear = initialProducts.some((item) => isCameraProductionProduct(item));
    const baseProducts = hasLiveCameraGear
      ? initialProducts
      : [...initialProducts, ...SAMPLE_CAMERA_PRODUCTION_PRODUCTS];
    if (partnerProducts.length === 0) return baseProducts;
    const seenIds = new Set(baseProducts.map((item) => item.id));
    const uniquePartnerProducts = partnerProducts.filter((item) => !seenIds.has(item.id));
    return [...uniquePartnerProducts, ...baseProducts];
  }, [initialProducts, partnerProducts]);

  const categoryCounts = useMemo(() => {
    const counts: Record<ProductCategory | typeof CAMERA_PRODUCTION_CATEGORY_ID, number> = {
      'pc-build': 0,
      laptop: 0,
      smartphone: 0,
      console: 0,
      handheld: 0,
      [CAMERA_PRODUCTION_CATEGORY_ID]: 0,
      component: 0,
      accessory: 0,
    };
    for (const item of catalogProducts) {
      if (isCameraProductionProduct(item)) {
        counts[CAMERA_PRODUCTION_CATEGORY_ID] += 1;
        if (!isSampleCatalogProduct(item)) {
          counts[item.category] = (counts[item.category] ?? 0) + 1;
        }
      } else {
        counts[item.category] = (counts[item.category] ?? 0) + 1;
      }
    }
    return counts;
  }, [catalogProducts]);

  const cameraSubtypeCounts = useMemo(() => {
    const counts: Record<CameraProductionSubtype, number> = {
      camera: 0,
      lens: 0,
      gimbal: 0,
      lighting: 0,
      'camera-rig': 0,
      'tripod-fluid-head': 0,
      'field-monitor': 0,
    };
    for (const item of catalogProducts) {
      const subtype = resolveCameraProductionSubtype(item);
      if (subtype) {
        counts[subtype] += 1;
      }
    }
    return counts;
  }, [catalogProducts]);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = debouncedQuery.trim().toLowerCase();

    const filtered = catalogProducts.filter((product) => {
      const isCamProd = isCameraProductionProduct(product);
      const isSample = isSampleCatalogProduct(product);

      if (selectedCategory === CAMERA_PRODUCTION_CATEGORY_ID) {
        if (!isCamProd) return false;
        if (
          selectedCameraSubtype !== 'all' &&
          resolveCameraProductionSubtype(product) !== selectedCameraSubtype
        ) {
          return false;
        }
      } else if (selectedCategory !== 'all') {
        if (isSample && isCamProd) return false;
        if (product.category !== selectedCategory) return false;
      }

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
      const subtype = resolveCameraProductionSubtype(product);
      const subtypeText = subtype
        ? `${getCameraSubtypeLabel(subtype, 'id')} ${getCameraSubtypeLabel(subtype, 'en')}`
        : '';
      const haystack = `${product.title} ${product.description} ${PRODUCT_CATEGORY_LABELS[product.category]} ${isCamProd ? 'kamera produksi camera production' : ''} ${subtypeText} ${specsValues} ${metadataValues}`.toLowerCase();
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
  }, [
    catalogProducts,
    debouncedQuery,
    iotQcOnly,
    selectedCameraSubtype,
    selectedCategory,
    sortBy,
    stockFilter,
  ]);

  const hasActiveFilters =
    selectedCategory !== 'all' ||
    selectedCameraSubtype !== 'all' ||
    stockFilter !== 'all' ||
    iotQcOnly ||
    debouncedQuery.trim().length > 0;

  const hasVisibleSampleItems = useMemo(
    () => filteredProducts.some((item) => isSampleCatalogProduct(item)),
    [filteredProducts],
  );

  const resetFilters = () => {
    setSelectedCategory('all');
    setSelectedCameraSubtype('all');
    setStockFilter('all');
    setIotQcOnly(false);
    setSortBy('newest');
    setQuery('');
  };

  return (
    <div className="mx-auto min-w-0 max-w-7xl space-y-4 overflow-x-clip px-4 pb-24 pt-4 sm:space-y-6 sm:px-6 sm:pb-24 sm:pt-8 lg:px-8">
      {(onOpenLibrary || onOpenBuilder) && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-default bg-surface p-3 shadow-sm sm:gap-4 sm:p-5">
          <p className="max-w-[70ch] text-xs leading-relaxed text-secondary sm:text-sm">
            {m.bannerSummary}
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
              placeholder={m.searchPlaceholder}
              className="vt-form-control min-h-10 w-full rounded-lg border border-default bg-subtle py-2 pl-10 pr-4 text-sm text-primary outline-none transition placeholder:text-secondary/75 focus:border-accent-primary focus:bg-surface focus:ring-2 focus:ring-accent-primary/20 sm:min-h-11 sm:py-2.5"
            />
          </div>

          <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
            <div
              role="group"
              aria-label="Filter ketersediaan stok"
              className="grid w-full grid-cols-3 gap-1 rounded-lg border border-default bg-subtle p-1 sm:inline-flex sm:w-auto"
            >
              {STOCK_FILTER_OPTIONS.map((option) => {
                const active = stockFilter === option.id;
                const stockLabel =
                  option.id === 'ready'
                    ? m.stockReady
                    : option.id === 'preorder'
                      ? m.stockPreorder
                      : m.stockAll;
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setStockFilter(option.id)}
                    className={`vt-motion-press vt-btn-tactile min-h-11 shrink-0 whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50 sm:min-h-9 sm:px-3 ${
                      active
                        ? 'bg-accent-primary font-semibold text-white'
                        : 'text-secondary hover:bg-surface hover:text-primary'
                    }`}
                  >
                    {stockLabel}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2.5 sm:justify-start">
              <ToggleSwitch
                compact
                label={m.qcToggle}
                checked={iotQcOnly}
                onChange={setIotQcOnly}
              />

              <div className="flex items-center gap-2">
                <label htmlFor={sortSelectId} className="sr-only">
                  {m.sortLabel}
                </label>
                <span className="inline-flex items-center gap-1.5 text-xs text-secondary">
                  <ArrowUpDown className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                  <span className="hidden sm:inline">{m.sortLabel}</span>
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
                  className="vt-form-control min-h-11 rounded-lg border border-default bg-subtle px-3 py-2 text-xs font-medium text-primary outline-none transition focus:border-accent-primary focus:bg-surface focus:ring-2 focus:ring-accent-primary/20"
                >
                  <option value="newest">{m.sortNewest}</option>
                  <option value="price_asc">{m.sortPriceAsc}</option>
                  <option value="price_desc">{m.sortPriceDesc}</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Category Filter Pills (with mobile right-edge fade cue) + Live Count */}
        <div className="flex flex-col gap-2.5 border-t border-default pt-2.5 md:flex-row md:items-center md:justify-between md:gap-3">
          <div className="relative -mx-3 min-w-0 flex-1 sm:mx-0">
            <div
              role="tablist"
              aria-label="Filter kategori produk market"
              className="no-scrollbar flex flex-nowrap gap-2 overflow-x-auto px-3 pb-0.5 pr-9 sm:px-0 md:flex-wrap md:overflow-visible md:pb-0 md:pr-0"
            >
              <button
                type="button"
                role="tab"
                aria-selected={selectedCategory === 'all'}
                onClick={() => setSelectedCategory('all')}
                className={`vt-motion-press vt-btn-tactile inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60 sm:min-h-10 sm:gap-2 sm:px-4 ${
                  selectedCategory === 'all'
                    ? 'bg-accent-cta font-semibold text-accent-foreground hover:bg-accent-cta-hover'
                    : 'border border-default bg-canvas font-medium text-secondary hover:bg-subtle hover:text-primary'
                }`}
              >
                <span>{m.categoryAll}</span>
                <span className="font-mono text-[11px] tabular-nums opacity-85">
                  {catalogProducts.length}
                </span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={selectedCategory === CAMERA_PRODUCTION_CATEGORY_ID}
                onClick={() => setSelectedCategory(CAMERA_PRODUCTION_CATEGORY_ID)}
                className={`vt-motion-press vt-btn-tactile inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60 sm:min-h-10 sm:gap-2 sm:px-4 ${
                  selectedCategory === CAMERA_PRODUCTION_CATEGORY_ID
                    ? 'bg-accent-cta font-semibold text-accent-foreground hover:bg-accent-cta-hover'
                    : 'border border-default bg-canvas font-medium text-secondary hover:bg-subtle hover:text-primary'
                }`}
              >
                <Camera className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                <span>{m.categoryCameraProduction}</span>
                <span className="font-mono text-[11px] tabular-nums opacity-85">
                  {categoryCounts[CAMERA_PRODUCTION_CATEGORY_ID]}
                </span>
              </button>

              {PRODUCT_CATEGORIES.map((category) => {
                const active = selectedCategory === category;
                const count = categoryCounts[category];
                const label = isEnglish
                  ? EN_CATEGORY_LABELS[category]
                  : PRODUCT_CATEGORY_LABELS[category];
                return (
                  <button
                    key={category}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setSelectedCategory(category)}
                    className={`vt-motion-press vt-btn-tactile inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60 sm:min-h-10 sm:gap-2 sm:px-4 ${
                      active
                        ? 'bg-accent-cta font-semibold text-accent-foreground hover:bg-accent-cta-hover'
                        : 'border border-default bg-canvas font-medium text-secondary hover:bg-subtle hover:text-primary'
                    }`}
                  >
                    <span>{label}</span>
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
              {m.showingPrefix}{' '}
              <AnimatedNumber
                value={filteredProducts.length}
                format="number"
                className="font-semibold text-primary"
              />{' '}
              {m.showingUnit}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex min-h-10 items-center gap-1 rounded-full px-3 text-xs font-semibold text-accent-cta hover:bg-accent-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
              >
                <RotateCcw className="h-3 w-3" aria-hidden="true" />
                <span>{m.reset}</span>
              </button>
            )}
          </div>
        </div>

        {/* Camera & Production Sub-Category Bar */}
        {selectedCategory === CAMERA_PRODUCTION_CATEGORY_ID && (
          <div className="space-y-2 border-t border-default pt-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs leading-relaxed text-secondary">{m.cameraFilterDesc}</p>
              {hasVisibleSampleItems && (
                <span data-badge-essential="true" className="vt-badge-sample shrink-0">
                  Sample · Simulated QC
                </span>
              )}
            </div>
            <div className="relative -mx-3 sm:mx-0">
              <div
                role="group"
                aria-label={m.cameraFilterHeading}
                className="no-scrollbar flex flex-nowrap gap-1.5 overflow-x-auto px-3 pb-0.5 pr-8 sm:px-0 md:flex-wrap md:overflow-visible md:pb-0 md:pr-0"
              >
                <button
                  type="button"
                  aria-pressed={selectedCameraSubtype === 'all'}
                  onClick={() => setSelectedCameraSubtype('all')}
                  className={`vt-motion-press inline-flex min-h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50 ${
                    selectedCameraSubtype === 'all'
                      ? 'bg-accent-primary text-white'
                      : 'border border-default bg-surface text-secondary hover:bg-subtle hover:text-primary'
                  }`}
                >
                  <span>{m.cameraSubtypeAll}</span>
                  <span className="font-mono text-[11px] tabular-nums opacity-85">
                    {categoryCounts[CAMERA_PRODUCTION_CATEGORY_ID]}
                  </span>
                </button>
                {CAMERA_PRODUCTION_SUBTYPES.map((subtype) => {
                  const active = selectedCameraSubtype === subtype;
                  return (
                    <button
                      key={subtype}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setSelectedCameraSubtype(subtype)}
                      className={`vt-motion-press inline-flex min-h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50 ${
                        active
                          ? 'bg-accent-primary text-white'
                          : 'border border-default bg-surface text-secondary hover:bg-subtle hover:text-primary'
                      }`}
                    >
                      <span>{getCameraSubtypeLabel(subtype, language, true)}</span>
                      <span className="font-mono text-[11px] tabular-nums opacity-85">
                        {cameraSubtypeCounts[subtype]}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 right-0 w-7 bg-gradient-to-l from-surface to-transparent md:hidden"
              />
            </div>
          </div>
        )}
      </div>

      {/* Honest Sample Notice when viewing fallback Camera & Production items */}
      {selectedCategory === CAMERA_PRODUCTION_CATEGORY_ID && hasVisibleSampleItems && (
        <p className="rounded-xl border border-default bg-surface px-4 py-3 text-xs leading-relaxed text-secondary shadow-sm">
          {m.cameraSampleNotice}
        </p>
      )}

      {/* Product Grid or Empty States */}
      {catalogProducts.length === 0 ? (
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
              onOpenDatasheet={setDatasheetProduct}
            />
          ))}
        </div>
      )}

      <MarketDatasheetModal
        product={datasheetProduct}
        onClose={() => setDatasheetProduct(null)}
      />
    </div>
  );
}
