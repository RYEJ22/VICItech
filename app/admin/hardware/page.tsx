'use client';

import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Edit3,
  LoaderCircle,
  Plus,
  Power,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { formatIdr } from '@/lib/admin/products-validation';
import {
  deleteHardwareComponent,
  HARDWARE_CATEGORIES,
  listHardwareComponents,
  updateHardwareComponent,
} from '@/lib/hardware/components';
import type {
  HardwareCategory,
  HardwareComponent,
  HardwareCondition,
} from '@/lib/hardware/components';

const AdminConfirmDialog = dynamic(
  () => import('@/components/features/admin/admin-confirm-dialog').then((mod) => mod.AdminConfirmDialog),
  { ssr: false },
);

const PAGE_SIZE = 25;

type ConditionFilter = 'all' | HardwareCondition;

function conditionLabel(condition: HardwareCondition): string {
  if (condition === 'brand_new') return 'Baru';
  if (condition === 'refurbished_qc_passed') return 'Refurbished QC';
  return 'Bekas';
}

function conditionBadgeClass(condition: HardwareCondition): string {
  if (condition === 'brand_new') return 'vt-badge-live';
  if (condition === 'refurbished_qc_passed') return 'vt-badge-simulated';
  return 'vt-badge-sample';
}

export default function HardwareInventoryPage(): ReactElement {
  const [components, setComponents] = useState<readonly HardwareComponent[]>([]);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 250);
  const [category, setCategory] = useState<'all' | HardwareCategory>('all');
  const [condition, setCondition] = useState<ConditionFilter>('all');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [notice, setNotice] = useState('');

  const [deletingItem, setDeletingItem] = useState<HardwareComponent | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const handleCancelDelete = useCallback(() => {
    setDeletingItem(null);
    setDeleteError('');
  }, []);

  const loadComponents = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      setComponents(await listHardwareComponents());
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Gagal memuat inventori hardware.',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadComponents();
  }, [loadComponents]);

  const filtered = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();
    return components.filter((item) => {
      const matchesQuery = !query || `${item.name} ${item.brand}`.toLowerCase().includes(query);
      return (
        matchesQuery &&
        (category === 'all' || item.category === category) &&
        (condition === 'all' || item.condition === condition)
      );
    });
  }, [components, debouncedSearch, category, condition]);

  useEffect(() => {
    setPage(1);
  }, [category, condition, debouncedSearch]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedComponents = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, safePage]);

  const lowStock = useMemo(
    () => components.filter((item) => item.stock_quantity < 5).length,
    [components],
  );
  const activeCount = useMemo(
    () => components.filter((item) => item.is_active).length,
    [components],
  );

  const toggleActive = async (item: HardwareComponent) => {
    setBusyId(item.id);
    setErrorMessage('');
    setNotice('');
    try {
      const updated = await updateHardwareComponent(item.id, { is_active: !item.is_active });
      setComponents((current) =>
        current.map((component) => (component.id === item.id ? updated : component)),
      );
      setNotice(`${item.name} sekarang berstatus ${updated.is_active ? 'Aktif' : 'Non-aktif'}.`);
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Gagal mengubah status komponen.',
      );
    } finally {
      setBusyId('');
    }
  };

  const confirmDelete = async () => {
    if (!deletingItem) return;
    const target = deletingItem;
    setBusyId(target.id);
    setDeleteError('');
    try {
      await deleteHardwareComponent(target.id);
      setComponents((current) => current.filter((component) => component.id !== target.id));
      setDeletingItem(null);
      setNotice(`${target.name} berhasil dihapus dari registry hardware.`);
    } catch (error: unknown) {
      setDeleteError(
        error instanceof Error ? error.message : 'Gagal menghapus komponen hardware.',
      );
    } finally {
      setBusyId('');
    }
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-accent-primary">
            <Cpu className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            <span>Registry Komponen PC</span>
          </span>
          <h1 className="mt-1.5 font-serif text-2xl font-semibold tracking-tight text-primary sm:text-3xl">
            Inventori Hardware &amp; Spesifikasi
          </h1>
          <p className="mt-1 max-w-[65ch] text-sm text-secondary">
            Kelola spesifikasi CPU, GPU, RAM, PSU, stok unit, skor benchmark, dan visibilitas Preset Builder.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadComponents()}
            disabled={isLoading}
            aria-label="Muat ulang inventori hardware"
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-default bg-surface text-primary shadow-sm transition hover:border-accent-primary/45 hover:bg-accent-subtle disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 text-accent-primary ${isLoading ? 'animate-spin' : ''}`}
              strokeWidth={1.75}
              aria-hidden="true"
            />
          </button>
          <Link
            href="/admin/hardware/new"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent-cta px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-cta-hover"
          >
            <Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            <span>Tambah Hardware</span>
          </Link>
        </div>
      </header>

      {/* Bento KPI Strip */}
      <div className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-xl border border-ink bg-ink p-4 text-white shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-white/70">Total Komponen</p>
          <p className="mt-2 font-mono text-3xl font-semibold tabular-nums">
            {components.length.toLocaleString('id-ID')}
          </p>
          <p className="mt-1 text-xs text-white/70">Terdaftar di `hardware_components`</p>
        </article>
        <article className="rounded-xl border border-default bg-accent-subtle p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-accent-hover">
            Stok Rendah (&lt; 5)
          </p>
          <p className="mt-2 font-mono text-3xl font-semibold tabular-nums text-primary">
            {lowStock.toLocaleString('id-ID')}
          </p>
          <p className="mt-1 text-xs text-secondary">Perlu restok pengadaan JIT</p>
        </article>
        <article className="rounded-xl border border-default bg-surface p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-secondary">
            Komponen Aktif
          </p>
          <p className="mt-2 font-mono text-3xl font-semibold tabular-nums text-primary">
            {activeCount.toLocaleString('id-ID')}
          </p>
          <p className="mt-1 text-xs text-secondary">Tersedia di PC Builder</p>
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

      {/* Filters */}
      <div className="grid gap-3 rounded-xl border border-default bg-surface p-4 shadow-sm md:grid-cols-[minmax(220px,1fr)_190px_210px]">
        <div className="relative">
          <label htmlFor="hardware-search" className="sr-only">
            Cari nama komponen atau brand
          </label>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary"
            strokeWidth={1.75}
            aria-hidden="true"
          />
          <input
            id="hardware-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari nama komponen atau brand…"
            className="min-h-11 w-full rounded-lg border border-default bg-canvas py-2 pl-9 pr-3 text-sm text-primary outline-none placeholder:text-secondary/65 focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20"
          />
        </div>

        <label>
          <span className="sr-only">Filter kategori hardware</span>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value as 'all' | HardwareCategory)}
            className="min-h-11 w-full rounded-lg border border-default bg-canvas px-3 py-2 text-sm text-primary outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20"
          >
            <option value="all">Semua Kategori</option>
            {HARDWARE_CATEGORIES.map((item) => (
              <option value={item} key={item}>
                {item.toUpperCase()}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="sr-only">Filter kondisi</span>
          <select
            value={condition}
            onChange={(event) => setCondition(event.target.value as ConditionFilter)}
            className="min-h-11 w-full rounded-lg border border-default bg-canvas px-3 py-2 text-sm text-primary outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20"
          >
            <option value="all">Semua Kondisi</option>
            <option value="brand_new">Baru</option>
            <option value="refurbished_qc_passed">Refurbished (Lulus QC)</option>
            <option value="used">Bekas</option>
          </select>
        </label>
      </div>

      {/* Responsive Table / Cards */}
      <div className="overflow-hidden rounded-xl border border-default bg-surface shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-default bg-canvas/60 px-4 py-3 text-xs font-medium text-secondary">
          <span>
            Menampilkan <strong className="font-mono text-primary">{paginatedComponents.length}</strong> dari{' '}
            <strong className="font-mono text-primary">{filtered.length}</strong> komponen
            {filtered.length !== components.length
              ? ` (total ${components.length})`
              : ''}
          </span>
          {totalPages > 1 ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={safePage <= 1}
                aria-label="Halaman komponen sebelumnya"
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
                aria-label="Halaman komponen berikutnya"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-default bg-surface text-primary transition hover:border-accent-primary/45 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 px-4 py-12 text-sm text-secondary">
            <LoaderCircle className="h-4 w-4 animate-spin text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
            <span>Memuat registry hardware…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="font-serif text-lg font-semibold text-primary">
              {components.length ? 'Tidak ada komponen yang sesuai' : 'Registry hardware masih kosong'}
            </p>
            <Link
              href="/admin/hardware/new"
              className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent-cta px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-cta-hover"
            >
              <Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              <span>Tambah Komponen Hardware</span>
            </Link>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full table-auto text-left text-sm">
                <thead className="border-b border-default bg-canvas text-[11px] font-semibold uppercase tracking-wider text-secondary">
                  <tr>
                    <th scope="col" className="px-4 py-3">Komponen / Brand</th>
                    <th scope="col" className="px-4 py-3">Kategori</th>
                    <th scope="col" className="px-4 py-3">Harga</th>
                    <th scope="col" className="px-4 py-3">Stok &amp; Skor</th>
                    <th scope="col" className="px-4 py-3">Kondisi &amp; Status</th>
                    <th scope="col" className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-default">
                  {paginatedComponents.map((item) => {
                    const rowBusy = busyId === item.id;
                    return (
                      <tr key={item.id} className="transition-colors hover:bg-canvas/70">
                        <td className="max-w-[320px] px-4 py-3.5">
                          <span className="block font-semibold text-primary">{item.name}</span>
                          <span className="mt-0.5 block text-xs text-secondary">
                            {item.brand}
                            {item.architecture ? ` · ${item.architecture}` : ''}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5">
                          <span className="rounded-md border border-accent-primary/25 bg-accent-subtle px-2.5 py-1 text-xs font-semibold uppercase text-accent-hover">
                            {item.category}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 font-mono font-semibold tabular-nums text-primary">
                          {formatIdr(item.base_price)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 font-mono text-xs tabular-nums">
                          <span
                            className={`block font-semibold ${
                              item.stock_quantity < 5 ? 'text-status-danger' : 'text-primary'
                            }`}
                          >
                            Stok: {item.stock_quantity}
                          </span>
                          <span className="mt-0.5 block text-secondary">
                            Skor: {item.performance_score.toLocaleString('id-ID')}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5">
                          <span className={conditionBadgeClass(item.condition)}>
                            {conditionLabel(item.condition)}
                          </span>
                          <span
                            className={`mt-1 block text-[11px] font-medium ${
                              item.is_active ? 'text-status-live' : 'text-secondary'
                            }`}
                          >
                            {item.is_active ? 'Aktif di Katalog' : 'Non-aktif'}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 text-right">
                          <div className="inline-flex items-center justify-end gap-2">
                            <Link
                              href={`/admin/hardware/${item.id}/edit`}
                              aria-label={`Edit ${item.name}`}
                              className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-default bg-canvas text-primary transition hover:border-accent-primary/45 hover:bg-accent-subtle"
                            >
                              <Edit3 className="h-4 w-4 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
                            </Link>
                            <button
                              type="button"
                              onClick={() => void toggleActive(item)}
                              disabled={rowBusy}
                              aria-label={`${item.is_active ? 'Non-aktifkan' : 'Aktifkan'} ${item.name}`}
                              className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-default bg-canvas text-primary transition hover:border-accent-primary/45 hover:bg-accent-subtle disabled:opacity-50"
                            >
                              {rowBusy ? (
                                <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={1.75} aria-hidden="true" />
                              ) : (
                                <Power className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDeleteError('');
                                setDeletingItem(item);
                              }}
                              disabled={rowBusy}
                              aria-label={`Hapus ${item.name}`}
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

            <ul className="divide-y divide-default lg:hidden">
              {paginatedComponents.map((item) => {
                const rowBusy = busyId === item.id;
                return (
                  <li key={item.id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span className="rounded-md border border-accent-primary/25 bg-accent-subtle px-2 py-0.5 text-[11px] font-semibold uppercase text-accent-hover">
                          {item.category}
                        </span>
                        <p className="mt-1.5 font-semibold text-primary">{item.name}</p>
                        <p className="text-xs text-secondary">{item.brand}</p>
                      </div>
                      <p className="shrink-0 font-mono text-sm font-semibold tabular-nums text-primary">
                        {formatIdr(item.base_price)}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-mono text-secondary">
                        Stok: <strong className="text-primary">{item.stock_quantity}</strong> · Skor:{' '}
                        <strong className="text-primary">{item.performance_score}</strong>
                      </span>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/hardware/${item.id}/edit`}
                          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-default bg-canvas px-3 py-2 text-xs font-semibold text-primary"
                        >
                          <Edit3 className="h-3.5 w-3.5 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
                          <span>Edit</span>
                        </Link>
                        <button
                          type="button"
                          onClick={() => void toggleActive(item)}
                          disabled={rowBusy}
                          className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-default bg-canvas text-primary"
                          aria-label={`${item.is_active ? 'Non-aktifkan' : 'Aktifkan'} ${item.name}`}
                        >
                          <Power className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteError('');
                            setDeletingItem(item);
                          }}
                          disabled={rowBusy}
                          aria-label={`Hapus ${item.name}`}
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

      {deletingItem ? (
        <AdminConfirmDialog
          open={Boolean(deletingItem)}
          title="Hapus Komponen Hardware?"
          description={`Komponen "${deletingItem.name}" akan dihapus permanen dari inventori registry.`}
          confirmLabel="Hapus Komponen"
          isBusy={Boolean(busyId === deletingItem.id)}
          errorMessage={deleteError}
          onConfirm={() => void confirmDelete()}
          onCancel={handleCancelDelete}
        />
      ) : null}
    </section>
  );
}
