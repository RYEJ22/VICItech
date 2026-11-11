"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  Activity,
  Cpu,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Eye,
  LoaderCircle,
  RefreshCw,
  Radio,
  ShoppingBag,
} from "lucide-react";
import OrderDetailsDialog from "@/components/vicitech/admin/OrderDetailsDialog";
import AdminIotQcPage from "../iot-qc/page";
import HardwareInventoryPage from "../hardware/page";
import { isJsonRecord } from "@/lib/admin/orders";
import type { AdminOrder, AdminOrderStats, JsonValue, OrderStatus } from "@/lib/admin/orders";

const STATUSES: { value: OrderStatus; label: string }[] = [
  { value: "pending_qc", label: "Pending QC" },
  { value: "qc_in_progress", label: "QC in progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

type OrdersApiResponse = {
  orders?: AdminOrder[];
  total?: number;
  stats?: AdminOrderStats;
  error?: string;
  order?: { id: string; status: OrderStatus };
};

const idr = (value: number | string | null | undefined) => new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
}).format(Number(value) || 0);

function getOrderType(order: AdminOrder, summary: Record<string, JsonValue>): string {
  const type = String(order.order_type || summary.type || "").toLowerCase();
  if (type.includes("refurb") || type.includes("trade_in")) return "Refurbished";
  if (type.includes("direct")) return "Direct";
  if (type.includes("preset") || Array.isArray(summary.items)) return "Preset";
  return "Order";
}

function summarizeJson(value: JsonValue): string {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}

function getOrderSummary(order: AdminOrder, summary: Record<string, JsonValue>): string {
  const orderItems = Array.isArray(order.items)
    ? order.items
    : Array.isArray(summary.items)
      ? summary.items
      : [];
  const items = orderItems
    .map((item) => isJsonRecord(item) ? item.name || item.title : null)
    .filter((name): name is string => typeof name === "string");
  const components = isJsonRecord(summary.components)
    ? Object.entries(summary.components).map(([name, value]) => `${name}: ${summarizeJson(value)}`)
    : [];
  const specs = isJsonRecord(summary.specs)
    ? Object.entries(summary.specs)
      .filter(([, value]) => value !== null && value !== "")
      .map(([name, value]) => `${name}: ${summarizeJson(value)}`)
    : [];
  const details = [...new Set([...items, ...components, ...specs])];
  return details.length ? details.join(" · ") : order.product_name || "—";
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function statusBadgeClass(status: string | null | undefined): string {
  if (status === "completed") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  if (status === "cancelled") return "border-red-500/30 bg-red-500/10 text-red-300";
  if (status === "qc_in_progress") return "border-violet-500/30 bg-violet-500/10 text-violet-300";
  return "border-amber-500/30 bg-amber-500/10 text-amber-300";
}

function OrdersPanel() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<AdminOrderStats>({ totalOrders: 0, totalRevenue: 0, pendingQcCount: 0 });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [activeOrderId, setActiveOrderId] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/orders?page=${page}`, { cache: "no-store" });
      const result = await response.json() as OrdersApiResponse;
      if (!response.ok) throw new Error(result.error || "Could not load orders.");
      setOrders(Array.isArray(result.orders) ? result.orders : []);
      setTotal(Number(result.total) || 0);
      setStats({
        totalOrders: Number(result.stats?.totalOrders) || 0,
        totalRevenue: Number(result.stats?.totalRevenue) || 0,
        pendingQcCount: Number(result.stats?.pendingQcCount) || 0,
      });
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : "Could not load orders.");
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const updateStatus = async (orderId: string, status: OrderStatus) => {
    setActiveOrderId(orderId);
    setError("");
    try {
      const response = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status }),
      });
      const result = await response.json() as OrdersApiResponse;
      if (!response.ok || !result.order) throw new Error(result.error || "Could not update order.");
      const updatedOrder = result.order;
      setOrders((current) => current.map((order) => (
        order.id === orderId ? { ...order, status: updatedOrder.status } : order
      )));
      const previousStatus = orders.find((order) => order.id === orderId)?.status;
      if (previousStatus !== updatedOrder.status) {
        setStats((current) => ({
          ...current,
          pendingQcCount: current.pendingQcCount
            + (updatedOrder.status === "pending_qc" ? 1 : 0)
            - (previousStatus === "pending_qc" ? 1 : 0),
        }));
      }
    } catch (updateError: unknown) {
      setError(updateError instanceof Error ? updateError.message : "Could not update order.");
    } finally {
      setActiveOrderId("");
    }
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">
            <ShoppingBag className="h-4 w-4" /> Order operations
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Customer orders</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">View checkout submissions and manage order status.</p>
        </div>
        <button
          type="button"
          onClick={() => void loadOrders()}
          disabled={isLoading}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-sm text-zinc-800 dark:text-zinc-200 transition hover:border-emerald-600/50 dark:hover:border-emerald-400/50 hover:text-cyan-800 dark:hover:text-cyan-200 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <article className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 p-4">
          <p className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <ShoppingBag className="h-4 w-4 text-cyan-700 dark:text-cyan-300" /> Total revenue
          </p>
          <p className="mt-3 text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{idr(stats.totalRevenue)}</p>
          <p className="mt-1 text-xs text-zinc-500">Across all recorded orders</p>
        </article>
        <article className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 p-4">
          <p className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <ClipboardList className="h-4 w-4 text-cyan-700 dark:text-cyan-300" /> Total orders
          </p>
          <p className="mt-3 text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{stats.totalOrders.toLocaleString("id-ID")}</p>
          <p className="mt-1 text-xs text-zinc-500">All transaction statuses</p>
        </article>
        <article className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 p-4">
          <p className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <Activity className="h-4 w-4 text-amber-700 dark:text-amber-300" /> Pending QC
          </p>
          <p className="mt-3 text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{stats.pendingQcCount.toLocaleString("id-ID")}</p>
          <p className="mt-1 text-xs text-zinc-500">Orders awaiting quality control</p>
        </article>
      </div>

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 px-4 py-3">
          <p className="text-sm text-zinc-700 dark:text-zinc-300">{total.toLocaleString("id-ID")} order{total === 1 ? "" : "s"}</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(0, current - 1))}
              disabled={page === 0 || isLoading}
              aria-label="Previous orders page"
              className="rounded-md border border-zinc-200 dark:border-zinc-700 p-1.5 text-zinc-700 dark:text-zinc-300 hover:border-emerald-600/50 dark:hover:border-emerald-400/50 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs tabular-nums text-zinc-500">Page {page + 1}</span>
            <button
              type="button"
              onClick={() => setPage((current) => current + 1)}
              disabled={isLoading || (page + 1) * 100 >= total}
              aria-label="Next orders page"
              className="rounded-md border border-zinc-200 dark:border-zinc-700 p-1.5 text-zinc-700 dark:text-zinc-300 hover:border-emerald-600/50 dark:hover:border-emerald-400/50 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {error && (
          <p role="alert" className="m-4 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-800 dark:text-red-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
          </p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left text-sm">
            <thead className="bg-white/60 dark:bg-zinc-950/60 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th scope="col" className="px-4 py-3">Order ID</th>
                <th scope="col" className="px-4 py-3">Customer / WA</th>
                <th scope="col" className="px-4 py-3">Type</th>
                <th scope="col" className="px-4 py-3">Items / Specs</th>
                <th scope="col" className="px-4 py-3">Total</th>
                <th scope="col" className="px-4 py-3">Status</th>
                <th scope="col" className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-zinc-600 dark:text-zinc-400">
                    <span className="inline-flex items-center gap-2"><LoaderCircle className="h-4 w-4 animate-spin" /> Loading orders…</span>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-zinc-500">No orders found.</td></tr>
              ) : orders.map((order) => {
                const summary = isJsonRecord(order.order_summary) ? order.order_summary : {};
                const buyer = isJsonRecord(order.customer_info)
                  ? order.customer_info
                  : isJsonRecord(summary.buyerDetails)
                    ? summary.buyerDetails
                    : {};
                const orderId = order.order_number || order.id;
                const status = order.status || "";
                return (
                  <tr key={order.id} className="transition-colors hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-cyan-800 dark:text-cyan-200">{orderId}</td>
                    <td className="px-4 py-3">
                      <span className="block font-medium text-zinc-900 dark:text-zinc-100">
                        {String(buyer.fullName || buyer.name || "—")}
                      </span>
                      <span className="mt-0.5 block text-xs text-zinc-500">
                        {String(buyer.phone || buyer.whatsapp || buyer.email || "Customer details unavailable")}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-700 dark:text-zinc-300">{getOrderType(order, summary)}</td>
                    <td className="max-w-sm px-4 py-3">
                      <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">{getOrderSummary(order, summary)}</p>
                      <button
                        type="button"
                        onClick={() => setSelectedOrder(order)}
                        className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-cyan-700 dark:text-cyan-300 transition hover:text-cyan-800 dark:hover:text-cyan-200"
                      >
                        <Eye className="h-3.5 w-3.5" /> Inspect details
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium tabular-nums text-zinc-900 dark:text-zinc-100">{idr(order.total_price)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-start gap-2">
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusBadgeClass(status)}`}>
                          {STATUSES.find((option) => option.value === status)?.label || status || "Unknown"}
                        </span>
                        <select
                          value={STATUSES.some((option) => option.value === status) ? status : ""}
                          onChange={(event) => {
                            const nextStatus = STATUSES.find((option) => option.value === event.target.value);
                            if (nextStatus) void updateStatus(order.id, nextStatus.value);
                          }}
                          disabled={activeOrderId === order.id}
                          aria-label={`Update status for ${orderId}`}
                          className="rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-2 py-1.5 text-xs text-zinc-800 dark:text-zinc-200 outline-none focus:border-emerald-600/60 dark:focus:border-emerald-400/60 disabled:opacity-50"
                        >
                          {!STATUSES.some((option) => option.value === status) && <option value="" disabled>{status || "Select status"}</option>}
                          {STATUSES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                        {activeOrderId === order.id && <LoaderCircle className="h-3.5 w-3.5 animate-spin text-cyan-700 dark:text-cyan-300" />}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-zinc-500">{formatDate(order.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <OrderDetailsDialog order={selectedOrder} onClose={() => setSelectedOrder(null)} />
    </section>
  );
}

type DashboardTab = "orders" | "iot-qc" | "hardware";

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<DashboardTab>("orders");
  const tabs: { id: DashboardTab; label: string; icon: typeof ShoppingBag }[] = [
    { id: "orders", label: "Orders", icon: ShoppingBag },
    { id: "iot-qc", label: "IoT QC", icon: Radio },
    { id: "hardware", label: "Hardware", icon: Cpu },
  ];

  return (
    <div className="space-y-6">
      <nav aria-label="Admin dashboard sections" className="flex flex-wrap gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-3">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`admin-tab-${id}`}
            aria-selected={activeTab === id}
            aria-controls={`admin-panel-${id}`}
            onClick={() => setActiveTab(id)}
            className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition ${
              activeTab === id
                ? "border-cyan-400/50 bg-cyan-400/10 text-cyan-200"
                : "border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-100"
            }`}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </nav>
      <section id="admin-panel-orders" role="tabpanel" aria-labelledby="admin-tab-orders" hidden={activeTab !== "orders"}>
        <OrdersPanel />
      </section>
      <section id="admin-panel-iot-qc" role="tabpanel" aria-labelledby="admin-tab-iot-qc" hidden={activeTab !== "iot-qc"}>
        <AdminIotQcPage />
      </section>
      <section id="admin-panel-hardware" role="tabpanel" aria-labelledby="admin-tab-hardware" hidden={activeTab !== "hardware"}>
        <HardwareInventoryPage />
      </section>
    </div>
  );
}
