import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Cpu,
  MapPin,
  Package,
  ShieldCheck,
  ShoppingBag,
} from 'lucide-react';
import Link from 'next/link';
import type { ReactElement } from 'react';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { RevenueLineChart } from '@/components/admin/RevenueLineChart';
import { getAdminOverviewData } from '@/lib/admin/overview';
import { formatIdr } from '@/lib/admin/products-validation';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
}

function qcStatusBadge(status: string): string {
  if (status === 'Pass') return 'vt-badge-live';
  if (status === 'In Progress') return 'vt-badge-simulated';
  return 'vt-badge-sample';
}

function qcStatusLabel(status: string): string {
  if (status === 'Pass') return 'Lulus IoT QC';
  if (status === 'In Progress') return 'Burn-In Berjalan';
  return status || 'Menunggu';
}

export default async function AdminOverviewPage(): Promise<ReactElement> {
  const supabase = await createClient();
  const overview = await getAdminOverviewData(supabase);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-accent-primary">
            <ShieldCheck className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            <span>Ringkasan Ekosistem ViciTech OS</span>
          </span>
          <h1 className="mt-1.5 font-sans text-2xl font-bold tracking-tight text-primary sm:text-3xl">
            Ringkasan Komando Admin
          </h1>
          <p className="mt-1 max-w-[65ch] text-sm text-secondary">
            Pantau metrik pendapatan, antrean IoT QC, stok komponen, produk Market, dan mitra resmi dari satu grid terpadu.
          </p>
        </div>

        <span
          className={
            overview.orderStats.source === 'rpc' ? 'vt-badge-live' : 'vt-badge-sample'
          }
        >
          {overview.orderStats.source === 'rpc'
            ? 'Live RPC · get_admin_order_stats'
            : 'Pemindaian Cadangan Aktif'}
        </span>
      </header>

      {overview.warning ? (
        <p
          role="status"
          className="flex items-start gap-2.5 rounded-xl border border-status-sample/35 bg-amber-50 p-3.5 text-sm text-amber-900"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-status-sample" strokeWidth={1.75} aria-hidden="true" />
          <span>{overview.warning}</span>
        </p>
      ) : null}

      {/* Top Primary KPI Bento Row (Asymmetric Hierarchy) */}
      <section aria-label="Ringkasan KPI Order" className="grid gap-4 lg:grid-cols-12">
        <article className="flex flex-col justify-between rounded-xl border border-default bg-surface p-6 text-primary shadow-card lg:col-span-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary">
                Total Pendapatan Order
              </p>
              <p className="mt-3 font-mono text-3xl font-bold tabular-nums tracking-tight text-primary sm:text-4xl">
                <AnimatedNumber value={overview.orderStats.totalRevenue} format="currency" />
              </p>
            </div>
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent-subtle text-accent-primary">
              <ShoppingBag className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
            </span>
          </div>

          <RevenueLineChart data={overview.revenueTrend} variant="light" />

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-default pt-4 text-xs text-secondary">
            <span>
              Dihitung dari{' '}
              <strong className="font-mono tabular-nums text-primary">
                <AnimatedNumber value={overview.orderStats.totalOrders} format="number" />
              </strong>{' '}
              transaksi terekam
            </span>
            <Link
              href="/admin/dashboard"
              className="inline-flex items-center gap-1 font-semibold text-accent-primary hover:underline"
            >
              <span>Kelola Pesanan</span>
              <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
            </Link>
          </div>
        </article>

        <article className="flex flex-col justify-between rounded-2xl border border-default bg-accent-subtle p-6 shadow-sm lg:col-span-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-accent-hover">
                Menunggu IoT QC
              </p>
              <p className="mt-3 text-3xl font-semibold text-primary">
                <AnimatedNumber value={overview.orderStats.pendingQcCount} format="number" />
              </p>
            </div>
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-accent-primary/25 bg-surface text-accent-primary">
              <Activity className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
            </span>
          </div>
          <p className="mt-5 text-xs leading-relaxed text-secondary">
            Pesanan baru yang menunggu antrean inspeksi dan registrasi serial IoT QC.
          </p>
        </article>

        <article className="flex flex-col justify-between rounded-2xl border border-default bg-surface p-6 shadow-sm lg:col-span-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-secondary">
                Total Pesanan
              </p>
              <p className="mt-3 text-3xl font-semibold text-primary">
                <AnimatedNumber value={overview.orderStats.totalOrders} format="number" />
              </p>
            </div>
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-default bg-canvas text-primary">
              <ShoppingBag className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
            </span>
          </div>
          <p className="mt-5 text-xs leading-relaxed text-secondary">
            Mencakup pembelian langsung, Preset Builder, dan unit Trade-In/refurbished.
          </p>
        </article>
      </section>

      {/* Secondary Module Directory Strip */}
      <section aria-label="Status Modul Ekosistem" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Link
          href="/admin/products"
          className="vt-card-interactive group flex flex-col justify-between rounded-xl border border-default bg-surface p-5 shadow-sm hover:border-accent-primary/50"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-default bg-canvas text-accent-primary">
              <Package className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
            </span>
            <ArrowUpRight className="h-4 w-4 text-secondary transition group-hover:text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
          </div>
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-secondary">
              Produk Market
            </p>
            <p className="mt-1 text-2xl font-semibold text-primary">
              <AnimatedNumber value={overview.counts.productsTotal} format="number" />
            </p>
            <p className="mt-1 text-xs text-secondary">
              <AnimatedNumber value={overview.counts.presetsTotal} format="number" className="text-primary" /> preset rakitan aktif
            </p>
          </div>
        </Link>

        <Link
          href="/admin/hardware"
          className="vt-card-interactive group flex flex-col justify-between rounded-xl border border-default bg-surface p-5 shadow-sm hover:border-accent-primary/50"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-default bg-canvas text-accent-primary">
              <Cpu className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
            </span>
            <ArrowUpRight className="h-4 w-4 text-secondary transition group-hover:text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
          </div>
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-secondary">
              Inventori Hardware
            </p>
            <p className="mt-1 text-2xl font-semibold text-primary">
              <AnimatedNumber value={overview.counts.hardwareTotal} format="number" />
            </p>
            <p className="mt-1 text-xs text-secondary">
              <AnimatedNumber value={overview.counts.hardwareActive} format="number" className="text-primary" /> aktif ·{' '}
              <AnimatedNumber value={overview.counts.hardwareLowStock} format="number" className="text-accent-hover" /> stok rendah
            </p>
          </div>
        </Link>

        <Link
          href="/admin/partners"
          className="vt-card-interactive group flex flex-col justify-between rounded-xl border border-default bg-surface p-5 shadow-sm hover:border-accent-primary/50"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-default bg-canvas text-accent-primary">
              <MapPin className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
            </span>
            <ArrowUpRight className="h-4 w-4 text-secondary transition group-hover:text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
          </div>
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-secondary">
              Mitra &amp; Service
            </p>
            <p className="mt-1 text-2xl font-semibold text-primary">
              <AnimatedNumber value={overview.counts.partnersTotal} format="number" />
            </p>
            <p className="mt-1 text-xs text-secondary">
              <AnimatedNumber value={overview.counts.partnersVerified} format="number" className="text-primary" /> terverifikasi resmi
            </p>
          </div>
        </Link>

        <Link
          href="/admin/iot-qc"
          className="vt-card-interactive group flex flex-col justify-between rounded-xl border border-default bg-surface p-5 shadow-sm hover:border-accent-primary/50"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-default bg-canvas text-accent-primary">
              <Activity className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
            </span>
            <ArrowUpRight className="h-4 w-4 text-secondary transition group-hover:text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
          </div>
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-secondary">
              Registri IoT QC
            </p>
            <p className="mt-1 text-2xl font-semibold text-primary">
              <AnimatedNumber value={overview.counts.qcTotal} format="number" />
            </p>
            <p className="mt-1 text-xs text-secondary">
              <AnimatedNumber value={overview.counts.qcInProgress} format="number" className="text-primary" /> unit sedang Burn-In
            </p>
          </div>
        </Link>
      </section>

      {/* Bottom 2-Column Live Feeds */}
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="overflow-hidden rounded-xl border border-default bg-surface shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-default bg-canvas/70 px-5 py-3.5">
            <h2 className="tracking-tight font-sans text-lg font-bold text-primary">Pesanan Terbaru</h2>
            <Link
              href="/admin/dashboard"
              className="text-xs font-semibold text-accent-hover hover:underline"
            >
              Lihat semua
            </Link>
          </div>
          {overview.recentOrders.length === 0 ? (
            <p className="p-6 text-sm text-secondary">Belum ada pesanan yang masuk.</p>
          ) : (
            <ul className="divide-y divide-default">
              {overview.recentOrders.map((order) => (
                <li
                  key={order.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-primary">
                      {order.product_name || 'Pesanan'}
                    </p>
                    <p className="mt-0.5 font-mono text-xs text-secondary">
                      {order.order_number || order.id} · {formatDateTime(order.created_at)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm font-semibold tabular-nums text-primary">
                      {formatIdr(order.total_price)}
                    </p>
                    <span className="mt-0.5 inline-block rounded-md border border-default bg-canvas px-2 py-0.5 text-[11px] font-medium text-secondary">
                      {order.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="overflow-hidden rounded-xl border border-default bg-surface shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-default bg-canvas/70 px-5 py-3.5">
            <h2 className="tracking-tight font-sans text-lg font-bold text-primary">Unit IoT QC Terbaru</h2>
            <Link
              href="/admin/iot-qc"
              className="text-xs font-semibold text-accent-hover hover:underline"
            >
              Buka Portal QC
            </Link>
          </div>
          {overview.recentQc.length === 0 ? (
            <p className="p-6 text-sm text-secondary">Belum ada unit QC terdaftar.</p>
          ) : (
            <ul className="divide-y divide-default">
              {overview.recentQc.map((unit) => (
                <li
                  key={unit.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-primary">{unit.device_name}</p>
                    <p className="mt-0.5 font-mono text-xs text-secondary">
                      {unit.serial_number} · {unit.burnin_hours}/4 jam burn-in
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={qcStatusBadge(unit.status)}>{qcStatusLabel(unit.status)}</span>
                    <span className="text-[11px] text-secondary">{unit.shipping_status}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
