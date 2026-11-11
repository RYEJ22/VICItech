export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type OrderStatus = "pending_qc" | "qc_in_progress" | "completed" | "cancelled";

export type AdminOrder = {
  id: string;
  order_number?: string | null;
  order_type?: string | null;
  items?: JsonValue;
  total_price?: number | string | null;
  customer_info?: JsonValue;
  status?: string | null;
  created_at?: string | null;
  product_name?: string | null;
  order_summary?: JsonValue;
};

export type AdminOrderStats = {
  totalOrders: number;
  totalRevenue: number;
  pendingQcCount: number;
};

export function isJsonRecord(value: JsonValue | undefined): value is { [key: string]: JsonValue } {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
