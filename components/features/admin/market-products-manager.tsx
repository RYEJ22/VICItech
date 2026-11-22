'use client';

import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Package,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import type { ReactElement } from 'react';
import {
  deleteProductAction,
  updateProductStockAction,
} from '@/app/admin/products/actions';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import {
  formatIdr,
  isProductStockStatus,
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_LABELS,
  PRODUCT_STOCK_STATUSES,
  resolveProductImages,
  SELLER_TYPE_LABELS,
  STOCK_STATUS_LABELS,
} from '@/lib/admin/products-validation';
import type {
  ProductCategory,
  ProductRow,
  ProductStockStatus,
} from '@/lib/admin/products-validation';

const AdminConfirmDialog = dynamic(
  () => import('./admin-confirm-dialog').then((mod) => mod.AdminConfirmDialog),
  { ssr: false },
);
const ProductEditorDrawer = dynamic(
  () => import('./product-editor-drawer').then((mod) => mod.ProductEditorDrawer),
  { ssr: false },
);

const PAGE_SIZE = 20;

interface MarketProductsManagerProps {
  readonly initialProducts: readonly ProductRow[];
  readonly initialError?: string | null;
}

function stockBadgeStyle(status: ProductStockStatus): string {
  if (status === 'ready') return 'vt-badge-live';
  if (status === 'preorder') return 'vt-badge-sample';
  return 'inline-flex items-center rounded-md border border-status-danger/30 bg-red-50 px-2 py-0.5 text-xs font-semibold text-status-danger';
}

export function MarketProductsManager({
  initialProducts,
  initialError = null,
}: MarketProductsManagerProps): ReactElement {
  const [products, setProducts] = useState<readonly ProductRow[]>(initialProducts);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 250);
  const [categoryFilter, setCategoryFilter] = useState<'all' | ProductCategory>('all');
  const [stockFilter, setStockFilter] = useState<'all' | ProductStockStatus>('all');
  const [presetOnly, setPresetOnly] = useState(false);
  const [page, setPage] = useState(1);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductRow | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<ProductRow | null>(null);
  const [deleteError, setDeleteError] = useState('');

  const [busyId, setBusyId] = useState('');
  const [errorMessage, setErrorMessage] = useState(initialError ?? '');
  const [notice, setNotice] = useState('');
  const [isPending, startTransition] = useTransition();

  const filteredProducts = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();
    return products.filter((item) => {
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      if (stockFilter !== 'all' && item.stock_status !== stockFilter) return false;
      if (presetOnly && !item.is_preset) return false;
      if (!query) return true;
      return `${item.title} ${item.slug}`.toLowerCase().includes(query);
    });
  }, [categoryFilter, debouncedSearch, presetOnly, products, stockFilter]);

  useEffect(() => {
    setPage(1);
  }, [categoryFilter, debouncedSearch, presetOnly, stockFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedProducts = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredProducts.slice(start, start + PAGE_SIZE);
  }, [filteredProducts, safePage]);

  const handleCloseDrawer = useCallback(() => {
    setDrawerOpen(false);
    setEditingProduct(null);
  }, []);

  const handleCancelDelete = useCallback(() => {
    setDeletingProduct(null);
    setDeleteError('');
  }, []);

  const counts = useMemo(() => {
    const ready = products.filter((item) => item.stock_status === 'ready').length;
    const preorderOrOut = products.length - ready;
    const presets = products.filter((item) => item.is_preset).length;
    return { total: products.length, ready, preorderOrOut, presets };
  }, [products]);

  const openCreateDrawer = () => {
    setEditingProduct(null);
    setDrawerOpen(true);
  };

  const openEditDrawer = (item: ProductRow) => {
    setEditingProduct(item);
    setDrawerOpen(true);
  };

  const handleSaved = (saved: ProductRow, mode: 'create' | 'edit') => {
    setProducts((current) =>
      mode === 'create'
        ? [saved, ...current]
        : current.map((row) => (row.id === saved.id ? saved : row)),
    );
    setDrawerOpen(false);
    setEditingProduct(null);
    setErrorMessage('');
    setNotice(
      mode === 'create'
        ? `Produk "${saved.title}" berhasil ditambahkan ke Market.`
        : `Perubahan pada "${saved.title}" telah disimpan.`,
    );
  };

  const handleQuickStockChange = (item: ProductRow, nextStatusRaw: string) => {
    if (!isProductStockStatus(nextStatusRaw) || nextStatusRaw === item.stock_status) return;
    setBusyId(item.id);
    setErrorMessage('');
    setNotice('');
    startTransition(async () => {
      const result = await updateProductStockAction(item.id, nextStatusRaw);
      setBusyId('');
      if (!result.success) {
        setErrorMessage(result.error);
        return;
      }
      setProducts((current) =>
        current.map((row) => (row.id === item.id ? result.data : row)),
      );
      setNotice(
        `Stok "${item.title}" diubah menjadi ${STOCK_STATUS_LABELS[result.data.stock_status]}.`,
      );
    });
  };

  const handleConfirmDelete = () => {
    if (!deletingProduct) return;
    const target = deletingProduct;
    setDeleteError('');
    setBusyId(target.id);
    startTransition(async () => {
      const result = await deleteProductAction(target.id);
      setBusyId('');
      if (!result.success) {
        setDeleteError(result.error);
        return;
      }
      setProducts((current) => current.filter((row) => row.id !== target.id));
      setDeletingProduct(null);
      setNotice(`Produk "${target.title}" telah dihapus permanen.`);
    });
  };

  const resetFilters = () => {
    setSearch('');
    setCategoryFilter('all');
    setStockFilter('all');
    setPresetOnly(false);
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-accent-primary">
            <Package className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            <span>Katalog Market &amp; Preset</span>
          </span>
          <h1 className="mt-1.5 font-serif text-2xl font-semibold tracking-tight text-primary sm:text-3xl">
            Manajemen Produk Market
          </h1>
          <p className="mt-1 max-w-[65ch] text-sm text-secondary">
            Kelola produk Storefront, preset rakitan, spesifikasi JSONB, media, dan status ketersediaan stok.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateDrawer}
          className="vt-btn-tactile inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent-cta px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-accent-cta-hover"
        >
          <Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
          <span>Tambah Produk</span>
        </button>
      </header>

      {/* Bento KPI Strip */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border border-default bg-ink p-4 text-white shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-white/70">Total Produk</p>
          <p className="mt-2 text-3xl font-semibold">
            <AnimatedNumber value={counts.total} format="number" />
          </p>
          <p className="mt-1 text-xs text-white/70">Terdaftar di `public.products`</p>
        </article>
        <article className="rounded-xl border border-default bg-surface p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-secondary">Stok Siap</p>
          <p className="mt-2 text-3xl font-semibold text-primary">
            <AnimatedNumber value={counts.ready} format="number" />
          </p>
          <p className="mt-1 text-xs text-secondary">Siap checkout langsung</p>
        </article>
        <article className="rounded-xl border border-default bg-surface p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-secondary">Pre-Order / Habis</p>
          <p className="mt-2 text-3xl font-semibold text-primary">
            <AnimatedNumber value={counts.preorderOrOut} format="number" />
          </p>
          <p className="mt-1 text-xs text-secondary">Butuh restok atau perakitan</p>
        </article>
        <article className="rounded-xl border border-default bg-accent-subtle p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-accent-hover">Preset Rakitan</p>
          <p className="mt-2 text-3xl font-semibold text-primary">
            <AnimatedNumber value={counts.presets} format="number" />
          </p>
          <p className="mt-1 text-xs text-secondary">Tampil di showcase preset build</p>
        </article>
      </div>

      {/* Feedback Banners */}
      {errorMessage ? (
        <p
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-status-danger/30 bg-red-50 p-3.5 text-sm text-status-danger"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
          <span>{errorMessage}</span>
        </p>
      ) : null}

      {notice ? (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-xl border border-default bg-surface p-3.5 text-sm text-primary shadow-sm"
        >
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-status-live" strokeWidth={1.75} aria-hidden="true" />
            <span>{notice}</span>
          </span>
          <button
            type="button"
            onClick={() => setNotice('')}
            className="text-xs font-medium text-secondary hover:text-primary"
          >
            Tutup
          </button>
        </div>
      ) : null}

      {/* Filter Bar */}
      <div className="grid gap-3 rounded-xl border border-default bg-surface p-4 shadow-sm md:grid-cols-[minmax(220px,1fr)_180px_180px_auto]">
        <div className="relative">
          <label htmlFor="products-search" className="sr-only">
            Cari judul atau slug produk
          </label>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary"
            strokeWidth={1.75}
            aria-hidden="true"
          />
          <input
            id="products-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari judul atau slug produk…"
            className="min-h-11 w-full rounded-lg border border-default bg-canvas py-2 pl-9 pr-3 text-sm text-primary outline-none placeholder:text-secondary/65 focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20"
          />
        </div>

        <label>
          <span className="sr-only">Filter kategori</span>
          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value as 'all' | ProductCategory)}
            className="min-h-11 w-full rounded-lg border border-default bg-canvas px-3 py-2 text-sm text-primary outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20"
          >
            <option value="all">Semua Kategori</option>
            {PRODUCT_CATEGORIES.map((item) => (
              <option key={item} value={item}>
                {PRODUCT_CATEGORY_LABELS[item]}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="sr-only">Filter status stok</span>
          <select
            value={stockFilter}
            onChange={(event) => setStockFilter(event.target.value as 'all' | ProductStockStatus)}
            className="min-h-11 w-full rounded-lg border border-default bg-canvas px-3 py-2 text-sm text-primary outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20"
          >
            <option value="all">Semua Stok</option>
            {PRODUCT_STOCK_STATUSES.map((item) => (
              <option key={item} value={item}>
                {STOCK_STATUS_LABELS[item]}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-2">
          <ToggleSwitch
            compact
            label="Hanya Preset"
            checked={presetOnly}
            onChange={setPresetOnly}
          />

          {(search || categoryFilter !== 'all' || stockFilter !== 'all' || presetOnly) ? (
            <button
              type="button"
              onClick={resetFilters}
              aria-label="Reset semua filter produk"
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-default bg-canvas text-secondary transition hover:border-accent-primary/45 hover:text-primary"
            >
              <RefreshCw className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Results Container */}
      <div className="overflow-hidden rounded-xl border border-default bg-surface shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-default bg-canvas/60 px-4 py-3 text-xs font-medium text-secondary">
          <span>
            Menampilkan <strong className="font-mono text-primary">{paginatedProducts.length}</strong> dari{' '}
            <strong className="font-mono text-primary">{filteredProducts.length}</strong> produk
            {filteredProducts.length !== products.length
              ? ` (total ${products.length})`
              : ''}
          </span>
          {totalPages > 1 ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={safePage <= 1}
                aria-label="Halaman produk sebelumnya"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-default bg-surface text-primary transition hover:border-accent-primary/45 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              </button>
              <span className="font-mono text-xs tabular-nums text-secondary">
                Halaman {safePage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={safePage >= totalPages}
                aria-label="Halaman produk berikutnya"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-default bg-surface text-primary transition hover:border-accent-primary/45 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </div>

        {filteredProducts.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="font-serif text-lg font-semibold text-primary">
              {products.length ? 'Tidak ada produk yang cocok dengan filter' : 'Belum ada produk di katalog'}
            </p>
            <p className="mx-auto mt-1.5 max-w-[56ch] text-sm text-secondary">
              {products.length
                ? 'Ubah kata kunci pencarian atau reset filter untuk melihat seluruh produk.'
                : 'Tambahkan produk pertama atau jalankan supabase/seed.sql untuk mengisi 5 preset demo.'}
            </p>
            <div className="mt-5 flex justify-center gap-2">
              {products.length ? (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex min-h-11 items-center rounded-lg border border-default bg-canvas px-4 py-2 text-sm font-medium text-primary hover:bg-subtle"
                >
                  Reset Filter
                </button>
              ) : (
                <button
                  type="button"
                  onClick={openCreateDrawer}
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent-cta px-4 py-2 text-sm font-semibold text-white hover:bg-accent-cta-hover"
                >
                  <Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                  <span>Tambah Produk Pertama</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Desktop Responsive Table */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full table-auto text-left text-sm">
                <thead className="border-b border-default bg-canvas text-[11px] font-semibold uppercase tracking-wider text-secondary">
                  <tr>
                    <th scope="col" className="px-4 py-3">Produk &amp; Slug</th>
                    <th scope="col" className="px-4 py-3">Kategori</th>
                    <th scope="col" className="px-4 py-3">Harga</th>
                    <th scope="col" className="px-4 py-3">Status Stok</th>
                    <th scope="col" className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-default">
                  {paginatedProducts.map((item) => {
                    const resolvedImages = resolveProductImages(item);
                    const thumb = resolvedImages[0];
                    const rowBusy = isPending && busyId === item.id;
                    return (
                      <tr key={item.id} className="transition-colors hover:bg-canvas/70">
                        <td className="max-w-[380px] px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-default bg-canvas">
                              {thumb ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={thumb}
                                  alt={item.title}
                                  width={48}
                                  height={48}
                                  loading="lazy"
                                  decoding="async"
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <span className="grid h-full w-full place-items-center text-secondary">
                                  <Package className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
                                </span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-primary">{item.title}</p>
                              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                                <span className="truncate font-mono text-xs text-secondary">
                                  {item.slug}
                                </span>
                                {resolvedImages.length > 1 ? (
                                  <span className="rounded-md border border-default bg-canvas px-1.5 py-0.5 font-mono text-[10px] font-medium tabular-nums text-secondary">
                                    {resolvedImages.length} foto
                                  </span>
                                ) : null}
                                {item.is_preset ? (
                                  <span className="inline-flex items-center gap-1 rounded-md border border-accent-primary/25 bg-accent-subtle px-1.5 py-0.5 text-[10px] font-semibold uppercase text-accent-hover">
                                    Preset
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5">
                          <span className="block text-xs font-semibold text-primary">
                            {PRODUCT_CATEGORY_LABELS[item.category]}
                          </span>
                          <span className="block text-xs text-secondary">
                            {SELLER_TYPE_LABELS[item.seller_type]}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 font-mono font-semibold tabular-nums text-primary">
                          {formatIdr(item.price)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className={stockBadgeStyle(item.stock_status)}>
                              {STOCK_STATUS_LABELS[item.stock_status]}
                            </span>
                            <select
                              value={item.stock_status}
                              disabled={rowBusy}
                              onChange={(event) => handleQuickStockChange(item, event.target.value)}
                              aria-label={`Ubah stok ${item.title}`}
                              className="min-h-11 rounded-lg border border-default bg-canvas px-2.5 py-1.5 text-xs font-medium text-primary outline-none focus:border-accent-primary disabled:opacity-50"
                            >
                              {PRODUCT_STOCK_STATUSES.map((statusOption) => (
                                <option key={statusOption} value={statusOption}>
                                  {STOCK_STATUS_LABELS[statusOption]}
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 text-right">
                          <div className="inline-flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openEditDrawer(item)}
                              disabled={rowBusy}
                              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-default bg-canvas px-3 py-2 text-xs font-semibold text-primary transition hover:border-accent-primary/50 hover:bg-accent-subtle"
                            >
                              <Edit3 className="h-3.5 w-3.5 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDeleteError('');
                                setDeletingProduct(item);
                              }}
                              disabled={rowBusy}
                              aria-label={`Hapus produk ${item.title}`}
                              className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-default bg-canvas text-secondary transition hover:border-status-danger/45 hover:bg-red-50 hover:text-status-danger disabled:opacity-50"
                            >
                              <Trash2 className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile & Tablet Cards */}
            <ul className="divide-y divide-default lg:hidden">
              {paginatedProducts.map((item) => {
                const rowBusy = isPending && busyId === item.id;
                return (
                  <li key={item.id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={stockBadgeStyle(item.stock_status)}>
                            {STOCK_STATUS_LABELS[item.stock_status]}
                          </span>
                          {item.is_preset ? (
                            <span className="rounded-md border border-accent-primary/25 bg-accent-subtle px-1.5 py-0.5 text-[10px] font-semibold uppercase text-accent-hover">
                              Preset
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1.5 font-semibold text-primary">{item.title}</p>
                        <p className="truncate font-mono text-xs text-secondary">{item.slug}</p>
                      </div>
                      <p className="shrink-0 font-mono text-sm font-semibold tabular-nums text-primary">
                        {formatIdr(item.price)}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <select
                        value={item.stock_status}
                        disabled={rowBusy}
                        onChange={(event) => handleQuickStockChange(item, event.target.value)}
                        aria-label={`Ubah stok ${item.title}`}
                        className="min-h-11 rounded-lg border border-default bg-canvas px-3 py-2 text-xs font-medium text-primary"
                      >
                        {PRODUCT_STOCK_STATUSES.map((statusOption) => (
                          <option key={statusOption} value={statusOption}>
                            {STOCK_STATUS_LABELS[statusOption]}
                          </option>
                        ))}
                      </select>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditDrawer(item)}
                          disabled={rowBusy}
                          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-default bg-canvas px-3.5 py-2 text-xs font-semibold text-primary hover:border-accent-primary/45 hover:bg-accent-subtle"
                        >
                          <Edit3 className="h-3.5 w-3.5 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteError('');
                            setDeletingProduct(item);
                          }}
                          disabled={rowBusy}
                          aria-label={`Hapus produk ${item.title}`}
                          className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-default bg-canvas text-secondary hover:border-status-danger/45 hover:bg-red-50 hover:text-status-danger"
                        >
                          <Trash2 className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      {drawerOpen ? (
        <ProductEditorDrawer
          open={drawerOpen}
          product={editingProduct}
          onClose={handleCloseDrawer}
          onSaved={handleSaved}
        />
      ) : null}

      {deletingProduct ? (
        <AdminConfirmDialog
          open={Boolean(deletingProduct)}
          title="Hapus Produk Permanen?"
          description={`Produk "${deletingProduct.title}" (/${deletingProduct.slug}) akan dihapus dari public.products dan tidak lagi tampil di Market.`}
          confirmLabel="Hapus Produk"
          isBusy={Boolean(isPending && busyId === deletingProduct.id)}
          errorMessage={deleteError}
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
        />
      ) : null}
    </section>
  );
}
