'use client';

import type { ReactElement } from 'react';
import { AdminDrawer } from '@/components/features/admin/admin-drawer';
import { isJsonRecord } from '@/lib/admin/orders';
import type { AdminOrder, JsonValue } from '@/lib/admin/orders';
import { formatIdr } from '@/lib/admin/products-validation';

interface OrderDetailsDialogProps {
  readonly order: AdminOrder | null;
  readonly onClose: () => void;
}

function prettyJson(value: unknown): string {
  return JSON.stringify(value ?? {}, null, 2) ?? '{}';
}

export function OrderDetailsDialog({
  order,
  onClose,
}: OrderDetailsDialogProps): ReactElement | null {
  if (!order) {
    return (
      <AdminDrawer
        open={false}
        onClose={onClose}
        title="Detail Transaksi"
      >
        {null}
      </AdminDrawer>
    );
  }

  const legacySummary = isJsonRecord(order.order_summary) ? order.order_summary : {};
  const items: JsonValue[] = Array.isArray(order.items)
    ? order.items
    : Array.isArray(legacySummary.items)
      ? legacySummary.items
      : [];
  const customerInfo = isJsonRecord(order.customer_info)
    ? order.customer_info
    : isJsonRecord(legacySummary.buyerDetails)
      ? legacySummary.buyerDetails
      : {};
  const orderNumber = order.order_number || order.id;

  return (
    <AdminDrawer
      open={Boolean(order)}
      onClose={onClose}
      badge="Inspeksi Transaksi"
      title={order.product_name || 'Detail Order'}
      subtitle={`Order ID: ${orderNumber}`}
    >
      <div className="space-y-5">
        {/* Highlight Summary */}
        <section className="grid grid-cols-2 gap-3 rounded-xl border border-default bg-surface p-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-secondary">
              Total Pembayaran
            </p>
            <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-primary">
              {formatIdr(order.total_price)}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-secondary">
              Status Saat Ini
            </p>
            <p className="mt-1 font-mono text-xs font-semibold text-accent-hover">
              {order.status || 'pending_qc'}
            </p>
          </div>
        </section>

        {/* Customer Details */}
        <section className="rounded-xl border border-default bg-surface p-4">
          <h3 className="mb-3 text-sm font-semibold text-primary">Informasi Pelanggan</h3>
          <dl className="grid gap-2 text-xs sm:grid-cols-2">
            <div>
              <dt className="text-secondary">Nama</dt>
              <dd className="mt-0.5 font-medium text-primary">
                {String(customerInfo.fullName || customerInfo.name || '—')}
              </dd>
            </div>
            <div>
              <dt className="text-secondary">WhatsApp / Telepon</dt>
              <dd className="mt-0.5 font-mono text-primary">
                {String(customerInfo.whatsapp || customerInfo.phone || '—')}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-secondary">Email / Alamat</dt>
              <dd className="mt-0.5 text-primary">
                {String(customerInfo.email || customerInfo.address || '—')}
              </dd>
            </div>
          </dl>
          <details className="mt-3">
            <summary className="cursor-pointer text-xs font-medium text-accent-hover hover:underline">
              Lihat JSON pelanggan mentah
            </summary>
            <pre className="mt-2 overflow-x-auto rounded-lg border border-default bg-canvas p-3 font-mono text-xs leading-relaxed text-primary">
              {prettyJson(customerInfo)}
            </pre>
          </details>
        </section>

        {/* Purchased Items */}
        <section className="rounded-xl border border-default bg-surface p-4">
          <h3 className="mb-3 text-sm font-semibold text-primary">Item &amp; Spesifikasi</h3>
          {items.length > 0 ? (
            <div className="space-y-3">
              {items.map((item, index) => {
                const itemTitle = isJsonRecord(item) ? item.title || item.name : undefined;
                return (
                  <div
                    key={`${order.id}-item-${index}`}
                    className="rounded-lg border border-default bg-canvas p-3"
                  >
                    <p className="mb-2 text-sm font-semibold text-primary">
                      {typeof itemTitle === 'string' ? itemTitle : `Item ${index + 1}`}
                    </p>
                    <pre className="overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-secondary">
                      {prettyJson(item)}
                    </pre>
                  </div>
                );
              })}
            </div>
          ) : (
            <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-lg border border-default bg-canvas p-3 font-mono text-xs leading-relaxed text-secondary">
              {prettyJson(legacySummary)}
            </pre>
          )}
        </section>

        {/* Full JSON Record */}
        <details className="rounded-xl border border-default bg-surface p-4">
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-secondary hover:text-primary">
            Rekaman Order Lengkap (Raw JSON)
          </summary>
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words rounded-lg border border-default bg-canvas p-3 font-mono text-xs leading-relaxed text-secondary">
            {prettyJson(order)}
          </pre>
        </details>
      </div>
    </AdminDrawer>
  );
}

export default OrderDetailsDialog;
