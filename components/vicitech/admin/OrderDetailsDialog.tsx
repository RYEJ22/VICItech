"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { isJsonRecord } from "@/lib/admin/orders";
import type { AdminOrder, JsonValue } from "@/lib/admin/orders";

type OrderDetailsDialogProps = {
  order: AdminOrder | null;
  onClose: () => void;
};

function prettyJson(value: unknown): string {
  return JSON.stringify(value ?? {}, null, 2) ?? "{}";
}

export default function OrderDetailsDialog({ order, onClose }: OrderDetailsDialogProps) {
  useEffect(() => {
    if (!order) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [order, onClose]);

  if (!order) return null;

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
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-details-title"
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 shadow-2xl shadow-black/60"
      >
        <header className="flex items-start justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-300">Transaction details</p>
            <h2 id="order-details-title" className="mt-1 truncate font-mono text-sm text-zinc-900 dark:text-zinc-100">{orderNumber}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close transaction details"
            className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-2 text-zinc-700 dark:text-zinc-300 transition hover:border-emerald-600/50 dark:hover:border-emerald-400/50 hover:text-cyan-800 dark:hover:text-cyan-200"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="space-y-5 overflow-y-auto p-5">
          <section>
            <h3 className="mb-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200">Customer information</h3>
            <pre className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/70 p-3 text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
              {prettyJson(customerInfo)}
            </pre>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200">Purchased items and specifications</h3>
            {items.length > 0 ? (
              <div className="space-y-3">
                {items.map((item, index) => {
                  const itemTitle = isJsonRecord(item) ? item.title || item.name : undefined;
                  return (
                    <div key={`${order.id}-item-${index}`} className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/70 p-3">
                      <p className="mb-2 text-sm font-medium text-cyan-800 dark:text-cyan-100">
                        {typeof itemTitle === "string" ? itemTitle : `Item ${index + 1}`}
                      </p>
                      <pre className="overflow-x-auto whitespace-pre-wrap break-words text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                        {prettyJson(item)}
                      </pre>
                    </div>
                  );
                })}
              </div>
            ) : (
              <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/70 p-3 text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
                {prettyJson(legacySummary)}
              </pre>
            )}
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200">Order record</h3>
            <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/70 p-3 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
              {prettyJson(order)}
            </pre>
          </section>
        </div>
      </section>
    </div>
  );
}
