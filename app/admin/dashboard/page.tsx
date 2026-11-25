'use client';

import {
  Activity,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Eye,
  LoaderCircle,
  RefreshCw,
  Search,
  ShoppingBag,
  Trash2,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { isJsonRecord } from '@/lib/admin/orders';
import type { AdminOrder, AdminOrderStats, JsonValue, OrderStatus } from '@/lib/admin/orders';
import { formatIdr } from '@/lib/admin/products-validation';
import { AdminConfirmDialog } from '@/components/features/admin/admin-confirm-dialog';

const OrderDetailsDialog = dynamic(
  () => import('@/components/vicitech/admin/OrderDetailsDialog').then((mod) => mod.OrderDetailsDialog),
  { ssr: false },
);

const DEFAULT_PAGE_SIZE = 25;

const STATUSES: readonly { readonly value: OrderStatus; readonly label: string }[] = [
  { value: 'pending_qc', label: 'Menunggu IoT QC' },
  { value: 'qc_in_progress', label: 'IoT QC Berjalan' },
  { value: 'completed', label: 'Selesai' },
  { value: 'cancelled', label: 'Dibatalkan' },
];

interface OrdersApiResponse {
  readonly orders?: readonly AdminOrder[];
  readonly total?: number;
  readonly pageSize?: number;
  readonly stats?: AdminOrderStats;
  readonly error?: string;
  readonly order?: { readonly id: string; readonly status: OrderStatus };
}

function getOrderType(order: AdminOrder, summary: { [key: string]: JsonValue }): string {
  const type = String(order.order_type || summary.type || '').toLowerCase();
  if (type.includes('refurb') || type.includes('trade_in')) return 'Refurbished';
  if (type.includes('direct')) return 'Direct';
  if (type.includes('preset') || Array.isArray(summary.items)) return 'Preset';
  return 'Order';
}

function summarizeJson(value: JsonValue): string {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return JSON.stringify(value);
}

function getOrderSummary(order: AdminOrder, summary: { [key: string]: JsonValue }): string {
  const orderItems = Array.isArray(order.items)
    ? order.items
    : Array.isArray(summary.items)
      ? summary.items
      : [];
  const items = orderItems
    .map((item) => (isJsonRecord(item) ? item.name || item.title : null))
    .filter((name): name is string => typeof name === 'string');
  const components = isJsonRecord(summary.components)
    ? Object.entries(summary.components).map(([name, value]) => `${name}: ${summarizeJson(value)}`)
    : [];
  const specs = isJsonRecord(summary.specs)
    ? Object.entries(summary.specs)
        .filter(([, value]) => value !== null && value !== '')
        .map(([name, value]) => `${name}: ${summarizeJson(value)}`)
    : [];
  const details = Array.from(new Set([...items, ...components, ...specs]));
  return details.length ? details.join(' · ') : order.product_name || '—';
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function statusBadgeClass(status: string | null | undefined): string {
  const normalized = (status || '').toLowerCase();
  if (normalized === 'completed' || normalized === 'shipped' || normalized === 'ready to ship') {
    return 'vt-badge-live';
  }
  if (normalized === 'cancelled') {
    return 'inline-flex items-center rounded-md border border-status-danger/30 bg-red-50 px-2 py-0.5 text-xs font-semibold text-status-danger';
  }
  if (normalized === 'qc_in_progress' || normalized.includes('testing') || normalized.includes('production')) {
    return 'vt-badge-simulated';
  }
  return 'vt-badge-sample';
}

export default function AdminDashboardPage(): ReactElement {
  const [orders, setOrders] = useState<readonly AdminOrder[]>([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<AdminOrderStats>({
    totalOrders: 0,
    totalRevenue: 0,
    pendingQcCount: 0,
  });
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 250);
  const [statusFilter, setStatusFilter] = useState('all');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [activeOrderId, setActiveOrderId] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<AdminOrder | null>(null);
  const [isDeletingOrder, setIsDeletingOrder] = useState(false);
  const [deleteOrderError, setDeleteOrderError] = useState('');
  const handleCloseOrderDetails = useCallback(() => setSelectedOrder(null), []);

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/orders?page=${page}`, { cache: 'no-store' });
      const result = (await response.json()) as OrdersApiResponse;
      if (!response.ok) throw new Error(result.error || 'Gagal memuat daftar order.');
      setOrders(Array.isArray(result.orders) ? result.orders : []);
      setTotal(Number(result.total) || 0);
      if (typeof result.pageSize === 'number' && result.pageSize > 0) {
        setPageSize(result.pageSize);
      }
      setStats({
        totalOrders: Number(result.stats?.totalOrders) || 0,
        totalRevenue: Number(result.stats?.totalRevenue) || 0,
        pendingQcCount: Number(result.stats?.pendingQcCount) || 0,
      });
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : 'Gagal memuat daftar order.');
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const updateStatus = async (orderId: string, status: OrderStatus) => {
    setActiveOrderId(orderId);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/admin/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status }),
      });
      const result = (await response.json()) as OrdersApiResponse;
      if (!response.ok || !result.order) {
        throw new Error(result.error || 'Gagal memperbarui status order.');
      }
      const updatedOrder = result.order;
      const previousStatus = orders.find((order) => order.id === orderId)?.status;
      setOrders((current) =>
        current.map((order) =>
          order.id === orderId ? { ...order, status: updatedOrder.status } : order,
        ),
      );
      if (previousStatus !== updatedOrder.status) {
        setStats((current) => ({
          ...current,
          pendingQcCount:
            current.pendingQcCount +
            (updatedOrder.status === 'pending_qc' ? 1 : 0) -
            (previousStatus === 'pending_qc' ? 1 : 0),
        }));
      }
      if (result.stats) {
        setStats({
          totalOrders: Number(result.stats.totalOrders) || 0,
          totalRevenue: Number(result.stats.totalRevenue) || 0,
          pendingQcCount: Number(result.stats.pendingQcCount) || 0,
        });
      }
      setNotice(`Status order diperbarui menjadi ${STATUSES.find((s) => s.value === status)?.label ?? status}.`);
    } catch (updateError: unknown) {
      setError(updateError instanceof Error ? updateError.message : 'Gagal memperbarui status order.');
    } finally {
      setActiveOrderId('');
    }
  };

  const deleteCancelledOrder = async () => {
    if (!orderToDelete || orderToDelete.status !== 'cancelled' || isDeletingOrder) return;
    setIsDeletingOrder(true);
    setDeleteOrderError('');
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(orderToDelete.id)}`, { method: 'DELETE' });
      const result = await response.json() as { readonly success?: boolean; readonly error?: string };
      if (!response.ok || result.success !== true) {
        throw new Error(result.error || 'Gagal menghapus pesanan.');
      }
      setOrders((current) => current.filter((order) => order.id !== orderToDelete.id));
      setTotal((current) => Math.max(0, current - 1));
      setStats((current) => ({ ...current, totalOrders: Math.max(0, current.totalOrders - 1) }));
      setSelectedOrder((current) => current?.id === orderToDelete.id ? null : current);
      setNotice('Pesanan yang dibatalkan berhasil dihapus.');
      setOrderToDelete(null);
    } catch (deleteError: unknown) {
      setDeleteOrderError(deleteError instanceof Error ? deleteError.message : 'Gagal menghapus pesanan.');
    } finally {
      setIsDeletingOrder(false);
    }
  };

  const filteredOrders = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();
    return orders.filter((order) => {
      if (statusFilter !== 'all' && (order.status || '') !== statusFilter) return false;
      if (!query) return true;
      const summary = isJsonRecord(order.order_summary) ? order.order_summary : {};
      const buyer = isJsonRecord(order.customer_info)
        ? order.customer_info
        : isJsonRecord(summary.buyerDetails)
          ? summary.buyerDetails
          : {};
      return `${order.order_number || order.id} ${order.product_name || ''} ${String(
        buyer.fullName || buyer.name || '',
      )} ${String(buyer.phone || buyer.whatsapp || '')}`
        .toLowerCase()
        .includes(query);
    });
  }, [debouncedSearch, orders, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-accent-primary">
            <ShoppingBag className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            <span>Operasi Transaksi</span>
          </span>
          <h1 className="mt-1.5 font-sans text-2xl font-bold tracking-tight text-primary sm:text-3xl">
            Manajemen Pesanan Pelanggan
          </h1>
          <p className="mt-1 max-w-[65ch] text-sm text-secondary">
            Tinjau checkout pelanggan B2C, B2B, dan pengadaan B2S lalu kelola status proses IoT QC.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadOrders()}
          disabled={isLoading}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-default bg-surface px-4 py-2 text-sm font-medium text-primary shadow-sm transition hover:border-accent-primary/45 hover:bg-accent-subtle disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 text-accent-primary ${isLoading ? 'animate-spin' : ''}`}
            strokeWidth={1.75}
            aria-hidden="true"
          />
          <span>Muat Ulang</span>
        </button>
      </header>

      {/* Bento KPI Strip */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <article className="rounded-xl border border-ink bg-ink p-5 text-white shadow-sm">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/70">
            <ShoppingBag className="h-4 w-4 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
            <span>Total Pendapatan</span>
          </p>
          <p className="mt-2.5 text-2xl font-semibold sm:text-3xl">
            <AnimatedNumber value={stats.totalRevenue} format="currency" />
          </p>
          <p className="mt-1 text-xs text-white/70">Tidak termasuk order yang dibatalkan</p>
        </article>

        <article className="rounded-xl border border-default bg-surface p-5 shadow-sm">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-secondary">
            <ClipboardList className="h-4 w-4 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
            <span>Total Pesanan</span>
          </p>
          <p className="mt-2.5 text-2xl font-semibold text-primary sm:text-3xl">
            <AnimatedNumber value={stats.totalOrders} format="number" />
          </p>
          <p className="mt-1 text-xs text-secondary">Seluruh status transaksi</p>
        </article>

        <article className="rounded-xl border border-default bg-accent-subtle p-5 shadow-sm sm:col-span-2 xl:col-span-1">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent-hover">
            <Activity className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            <span>Menunggu IoT QC</span>
          </p>
          <p className="mt-2.5 text-2xl font-semibold text-primary sm:text-3xl">
            <AnimatedNumber value={stats.pendingQcCount} format="number" />
          </p>
          <p className="mt-1 text-xs text-secondary">Menunggu antrean stress test</p>
        </article>
      </div>

      {/* Feedback */}
      {error ? (
        <p
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-status-danger/30 bg-red-50 p-3.5 text-sm text-status-danger"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
          <span>{error}</span>
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

      {/* Filter Toolbar */}
      <div className="grid gap-3 rounded-xl border border-default bg-surface p-4 shadow-sm md:grid-cols-[minmax(220px,1fr)_220px]">
        <div className="relative">
          <label htmlFor="orders-search" className="sr-only">
            Cari ID order, nama pelanggan, atau produk
          </label>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary"
            strokeWidth={1.75}
            aria-hidden="true"
          />
          <input
            id="orders-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari Order ID, pelanggan, atau produk…"
            className="min-h-11 w-full rounded-lg border border-default bg-canvas py-2 pl-9 pr-3 text-sm text-primary outline-none placeholder:text-secondary/65 focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20"
          />
        </div>

        <label>
          <span className="sr-only">Filter status order</span>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="min-h-11 w-full rounded-lg border border-default bg-canvas px-3 py-2 text-sm text-primary outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20"
          >
            <option value="all">Semua Status</option>
            {STATUSES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Table + Pagination Container */}
      <div className="overflow-hidden rounded-xl border border-default bg-surface shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-default bg-canvas/60 px-4 py-3">
          <p className="text-xs font-medium text-secondary">
            Menampilkan <strong className="font-mono text-primary">{filteredOrders.length}</strong> dari{' '}
            <strong className="font-mono text-primary">{total.toLocaleString('id-ID')}</strong> order
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(0, current - 1))}
              disabled={page === 0 || isLoading}
              aria-label="Halaman order sebelumnya"
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-default bg-surface text-primary transition hover:border-accent-primary/45 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            </button>
            <span className="font-mono text-xs tabular-nums text-secondary">
              Halaman {page + 1} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((current) => current + 1)}
              disabled={isLoading || (page + 1) * pageSize >= total}
              aria-label="Halaman order berikutnya"
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-default bg-surface text-primary transition hover:border-accent-primary/45 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 px-4 py-12 text-sm text-secondary">
            <LoaderCircle className="h-4 w-4 animate-spin text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
            <span>Memuat data pesanan…</span>
          </div>
        ) : filteredOrders.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-secondary">
            Tidak ada order yang cocok dengan filter saat ini.
          </p>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full table-auto text-left text-sm">
                <thead className="border-b border-default bg-canvas text-[11px] font-semibold uppercase tracking-wider text-secondary">
                  <tr>
                    <th scope="col" className="px-4 py-3">ID Pesanan &amp; Tanggal</th>
                    <th scope="col" className="px-4 py-3">Pelanggan</th>
                    <th scope="col" className="px-4 py-3">Tipe &amp; Ringkasan</th>
                    <th scope="col" className="px-4 py-3">Total</th>
                    <th scope="col" className="px-4 py-3">Status</th>
                    <th scope="col" className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-default">
                  {filteredOrders.map((order) => {
                    const summary = isJsonRecord(order.order_summary) ? order.order_summary : {};
                    const buyer = isJsonRecord(order.customer_info)
                      ? order.customer_info
                      : isJsonRecord(summary.buyerDetails)
                        ? summary.buyerDetails
                        : {};
                    const orderId = order.order_number || order.id;
                    const status = order.status || '';
                    const isUpdating = activeOrderId === order.id;

                    return (
                      <tr key={order.id} className="transition-colors hover:bg-canvas/70">
                        <td className="whitespace-nowrap px-4 py-3.5">
                          <span className="block font-mono text-xs font-semibold text-primary">
                            {orderId}
                          </span>
                          <span className="mt-0.5 block text-xs text-secondary">
                            {formatDate(order.created_at)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="block font-medium text-primary">
                            {String(buyer.fullName || buyer.name || '—')}
                          </span>
                          <span className="mt-0.5 block font-mono text-xs text-secondary">
                            {String(buyer.phone || buyer.whatsapp || buyer.email || 'Detail tidak tersedia')}
                          </span>
                        </td>
                        <td className="max-w-[300px] px-4 py-3.5">
                          <span className="inline-block rounded-md border border-default bg-canvas px-2 py-0.5 text-[11px] font-semibold text-primary">
                            {getOrderType(order, summary)}
                          </span>
                          <p className="mt-1 truncate text-xs text-secondary">
                            {getOrderSummary(order, summary)}
                          </p>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 font-mono font-semibold tabular-nums text-primary">
                          {formatIdr(order.total_price)}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex flex-col items-start gap-1.5">
                            <span className={`${statusBadgeClass(status)} whitespace-nowrap`}>
                              {STATUSES.find((option) => option.value === status)?.label ||
                                status ||
                                'Tidak diketahui'}
                            </span>
                            <div className="flex items-center gap-2">
                              <select
                                value={STATUSES.some((option) => option.value === status) ? status : ''}
                                onChange={(event) => {
                                  const nextStatus = STATUSES.find(
                                    (option) => option.value === event.target.value,
                                  );
                                  if (nextStatus) void updateStatus(order.id, nextStatus.value);
                                }}
                                disabled={isUpdating}
                                aria-label={`Ubah status order ${orderId}`}
                                className="min-h-11 min-w-[150px] whitespace-nowrap rounded-lg border border-default bg-canvas px-2.5 py-1.5 text-xs font-medium text-primary outline-none focus:border-accent-primary disabled:opacity-50"
                              >
                                {!STATUSES.some((option) => option.value === status) ? (
                                  <option value="" disabled>
                                    {status || 'Pilih status'}
                                  </option>
                                ) : null}
                                {STATUSES.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                              {isUpdating ? (
                                <LoaderCircle
                                  className="h-4 w-4 animate-spin text-accent-primary"
                                  strokeWidth={1.75}
                                  aria-hidden="true"
                                />
                              ) : null}
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 text-right">
                          <div className="inline-flex items-center justify-end gap-2">
                            {status === 'cancelled' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setDeleteOrderError('');
                                  setOrderToDelete(order);
                                }}
                                disabled={isDeletingOrder}
                                className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-red-200 bg-canvas px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                              >
                                {isDeletingOrder && orderToDelete?.id === order.id
                                  ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                                  : <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}
                                <span>Hapus</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setSelectedOrder(order)}
                              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-default bg-canvas px-3 py-2 text-xs font-semibold text-primary transition hover:border-accent-primary/45 hover:bg-accent-subtle"
                            >
                              <Eye className="h-3.5 w-3.5 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
                              <span>Detail</span>
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
              {filteredOrders.map((order) => {
                const summary = isJsonRecord(order.order_summary) ? order.order_summary : {};
                const buyer = isJsonRecord(order.customer_info)
                  ? order.customer_info
                  : isJsonRecord(summary.buyerDetails)
                    ? summary.buyerDetails
                    : {};
                const orderId = order.order_number || order.id;
                const status = order.status || '';
                return (
                  <li key={order.id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-mono text-xs font-semibold text-primary">{orderId}</p>
                        <p className="mt-1 font-semibold text-primary">
                          {String(buyer.fullName || buyer.name || 'Pelanggan')}
                        </p>
                        <p className="text-xs text-secondary">{formatDate(order.created_at)}</p>
                      </div>
                      <p className="shrink-0 font-mono text-sm font-semibold tabular-nums text-primary">
                        {formatIdr(order.total_price)}
                      </p>
                    </div>

                    <p className="text-xs text-secondary">{getOrderSummary(order, summary)}</p>

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <select
                        value={STATUSES.some((option) => option.value === status) ? status : ''}
                        onChange={(event) => {
                          const nextStatus = STATUSES.find(
                            (option) => option.value === event.target.value,
                          );
                          if (nextStatus) void updateStatus(order.id, nextStatus.value);
                        }}
                        disabled={activeOrderId === order.id}
                        aria-label={`Ubah status order ${orderId}`}
                        className="min-h-11 min-w-[150px] whitespace-nowrap rounded-lg border border-default bg-canvas px-3 py-2 text-xs font-medium text-primary"
                      >
                        {!STATUSES.some((option) => option.value === status) ? (
                          <option value="" disabled>
                            {status || 'Pilih status'}
                          </option>
                        ) : null}
                        {STATUSES.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>

                      <div className="flex flex-wrap gap-2">
                        {status === 'cancelled' && (
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteOrderError('');
                              setOrderToDelete(order);
                            }}
                            disabled={isDeletingOrder}
                            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-red-200 bg-canvas px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                          >
                            {isDeletingOrder && orderToDelete?.id === order.id
                              ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                              : <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}
                            <span>Hapus</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(order)}
                          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-default bg-canvas px-3.5 py-2 text-xs font-semibold text-primary hover:border-accent-primary/45 hover:bg-accent-subtle"
                        >
                          <Eye className="h-3.5 w-3.5 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
                          <span>Detail</span>
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

      {selectedOrder ? (
        <OrderDetailsDialog order={selectedOrder} onClose={handleCloseOrderDetails} />
      ) : null}
      <AdminConfirmDialog
        open={Boolean(orderToDelete)}
        title="Hapus Pesanan Permanen"
        description="Yakin ingin menghapus pesanan yang dibatalkan ini secara permanen?"
        confirmLabel="Hapus"
        isBusy={isDeletingOrder}
        errorMessage={deleteOrderError}
        onConfirm={() => void deleteCancelledOrder()}
        onCancel={() => {
          if (!isDeletingOrder) {
            setOrderToDelete(null);
            setDeleteOrderError('');
          }
        }}
      />
    </section>
  );
}
