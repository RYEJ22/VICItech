import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Tables } from '@/types/database.types';

export type RecentOrderSummary = Pick<
  Tables<'orders'>,
  'id' | 'order_number' | 'product_name' | 'total_price' | 'status' | 'order_type' | 'created_at'
>;

export type RecentQcSummary = Pick<
  Tables<'qc_logs'>,
  'id' | 'serial_number' | 'device_name' | 'status' | 'burnin_hours' | 'score' | 'shipping_status' | 'created_at'
>;

export interface AdminOverviewData {
  readonly orderStats: {
    readonly totalOrders: number;
    readonly totalRevenue: number;
    readonly pendingQcCount: number;
    readonly source: 'rpc' | 'fallback';
  };
  readonly counts: {
    readonly productsTotal: number;
    readonly presetsTotal: number;
    readonly hardwareTotal: number;
    readonly hardwareActive: number;
    readonly hardwareLowStock: number;
    readonly partnersTotal: number;
    readonly partnersVerified: number;
    readonly qcTotal: number;
    readonly qcInProgress: number;
  };
  readonly recentOrders: readonly RecentOrderSummary[];
  readonly recentQc: readonly RecentQcSummary[];
  readonly warning: string | null;
}

const STATS_PAGE_SIZE = 1000;

async function fetchOrderStatsWithFallback(supabase: SupabaseClient<Database>): Promise<{
  readonly totalOrders: number;
  readonly totalRevenue: number;
  readonly pendingQcCount: number;
  readonly source: 'rpc' | 'fallback';
}> {
  const { data: rpcRows, error: rpcError } = await supabase.rpc('get_admin_order_stats');
  if (!rpcError && Array.isArray(rpcRows) && rpcRows.length > 0) {
    const first = rpcRows[0];
    if (first) {
      return {
        totalOrders: Number(first.total_orders) || 0,
        totalRevenue: Number(first.total_revenue) || 0,
        pendingQcCount: Number(first.pending_qc_count) || 0,
        source: 'rpc',
      };
    }
  }

  let total = 0;
  let revenueCents = 0;
  let pendingQcCount = 0;

  for (let start = 0; ; start += STATS_PAGE_SIZE) {
    const { data, error, count } = await supabase
      .from('orders')
      .select('total_price, status', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(start, start + STATS_PAGE_SIZE - 1);

    if (error) {
      return { totalOrders: 0, totalRevenue: 0, pendingQcCount: 0, source: 'fallback' };
    }

    const rows = data || [];
    if (start === 0) total = count || 0;
    for (const row of rows) {
      const normalizedStatus = String(row.status || '').trim().toLowerCase();
      if (!['cancelled', 'canceled', 'dibatalkan', 'batal'].includes(normalizedStatus)) {
        revenueCents += Math.round((Number(row.total_price) || 0) * 100);
      }
      if (row.status === 'pending_qc') pendingQcCount += 1;
    }

    if (rows.length < STATS_PAGE_SIZE || start + rows.length >= total) break;
  }

  return {
    totalOrders: total,
    totalRevenue: revenueCents / 100,
    pendingQcCount,
    source: 'fallback',
  };
}

export async function getAdminOverviewData(
  supabase: SupabaseClient<Database>,
): Promise<AdminOverviewData> {
  const [
    orderStats,
    productsTotalRes,
    presetsTotalRes,
    hardwareTotalRes,
    hardwareActiveRes,
    hardwareLowStockRes,
    partnersTotalRes,
    partnersVerifiedRes,
    qcTotalRes,
    qcInProgressRes,
    recentOrdersRes,
    recentQcRes,
  ] = await Promise.all([
    fetchOrderStatsWithFallback(supabase),
    supabase.from('products').select('id', { count: 'exact', head: true }),
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('is_preset', true),
    supabase.from('hardware_components').select('id', { count: 'exact', head: true }),
    supabase.from('hardware_components').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('hardware_components').select('id', { count: 'exact', head: true }).lt('stock_quantity', 5),
    supabase.from('partners').select('id', { count: 'exact', head: true }),
    supabase.from('partners').select('id', { count: 'exact', head: true }).eq('is_verified', true),
    supabase.from('qc_logs').select('id', { count: 'exact', head: true }),
    supabase.from('qc_logs').select('id', { count: 'exact', head: true }).eq('status', 'In Progress'),
    supabase
      .from('orders')
      .select('id, order_number, product_name, total_price, status, order_type, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('qc_logs')
      .select('id, serial_number, device_name, status, burnin_hours, score, shipping_status, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  const firstError =
    productsTotalRes.error ||
    hardwareTotalRes.error ||
    partnersTotalRes.error ||
    qcTotalRes.error ||
    recentOrdersRes.error ||
    recentQcRes.error;

  return {
    orderStats,
    counts: {
      productsTotal: productsTotalRes.count ?? 0,
      presetsTotal: presetsTotalRes.count ?? 0,
      hardwareTotal: hardwareTotalRes.count ?? 0,
      hardwareActive: hardwareActiveRes.count ?? 0,
      hardwareLowStock: hardwareLowStockRes.count ?? 0,
      partnersTotal: partnersTotalRes.count ?? 0,
      partnersVerified: partnersVerifiedRes.count ?? 0,
      qcTotal: qcTotalRes.count ?? 0,
      qcInProgress: qcInProgressRes.count ?? 0,
    },
    recentOrders: recentOrdersRes.data || [],
    recentQc: recentQcRes.data || [],
    warning: firstError
      ? 'Sebagian metrik database belum tersedia. Pastikan master_schema.sql sudah diterapkan di Supabase.'
      : null,
  };
}
