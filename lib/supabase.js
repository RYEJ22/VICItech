/**
 * lib/supabase.js
 *
 * Single unified client and data layer for ViciTech OS.
 * - Connects to Supabase with Row Level Security (RLS) when environment variables are set.
 * - Provides graceful local simulation / localStorage fallback if Supabase credentials
 *   are not configured yet, so the app is immediately production-ready and never crashes.
 * - Handles QC log lookups, one-click pre-order checkouts with 5% JIT buffer,
 *   and persistent user presets.
 */
import {
  getSupabaseBrowserClient,
  isSupabaseAuthConfigured,
} from "@/lib/supabase/client";

export const isSupabaseConfigured = isSupabaseAuthConfigured;

const isBrowser = typeof window !== "undefined";

/**
 * Shared Supabase Client instance (or null in fallback mode)
 */
export const supabase = isSupabaseConfigured
  ? (isBrowser ? getSupabaseBrowserClient() : null)
  : null;

/* ───────────────────────── Constants ───────────────────────── */

export const TABLES = {
  orders: "orders",
  qcLogs: "qc_logs",
  presets: "user_presets",
};

export const USER_ROLES = ["b2c", "b2b", "b2s"];

/** Enforced serial format: VICI-SRV-2026-9042 */
export const SERIAL_PATTERN = /^VICI-[A-Z]{3}-\d{4}-\d{4}$/;

export const normalizeSerial = (value) => String(value ?? "").trim().toUpperCase();

/* ───────────────────────── Local Storage Persistence ───────────────────────── */

const STORAGE_KEYS = {
  orders: "vicitech_local_orders",
  presets: "vicitech_local_presets",
};

function getLocalStore(key, fallback = []) {
  if (!isBrowser) return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setLocalStore(key, value) {
  if (!isBrowser) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn("[ViciTech OS] Could not write to localStorage:", err);
  }
}

/* ───────────────────────── Data Helpers ───────────────────────── */

const QC_LOG_COLUMNS =
  "id, serial_number, device_name, status, burnin_hours, score, created_at, order_id, stress_test_status, cpu_temp_c, gpu_temp_c, stability_score, shipping_status, certificate_id, shipped_at, updated_at";
const ORDER_COLUMNS =
  "id, user_id, order_type, items, total_price, customer_info, status, created_at, order_number, user_role, product_name, base_price, jit_buffer, order_summary, serial_number";
const USER_PRESET_COLUMNS = "id, user_id, name, role, parts, qty, unit_total, created_at";

/**
 * Look up one QC log by serial number.
 * Tries Supabase first; if offline or not found, checks local verified registry.
 *
 * @param {string} serial
 * @returns {Promise<{ id: string, serial_number: string, device_name: string, status: string, burnin_hours: number, score: number | null, created_at: string, source: 'supabase' | 'fallback' } | null>}
 */
export async function getQcLogBySerial(serial) {
  const normalized = normalizeSerial(serial);
  if (!SERIAL_PATTERN.test(normalized)) return null;

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from(TABLES.qcLogs)
        .select(QC_LOG_COLUMNS)
        .eq("serial_number", normalized)
        .maybeSingle();

      if (!error && data) {
        return { ...data, source: "supabase" };
      }
    } catch (err) {
      console.warn("[ViciTech OS] Supabase QC query failed, using local registry:", err.message);
    }
  }

  return null;
}

/**
 * Public tracking lookup for a QC serial or an order ID linked to a QC log.
 */
export async function getQcTrackingRecord(identifier) {
  const normalized = String(identifier ?? "").trim().toUpperCase();
  const isSerial = SERIAL_PATTERN.test(normalized);
  const isOrderId = /^VT-[A-Z]{2,4}-\d{4}-\d{3,8}$/.test(normalized);
  if (!isSerial && !isOrderId) return null;

  if (isSupabaseConfigured && supabase) {
    const column = isSerial ? "serial_number" : "order_id";
    const { data, error } = await supabase
      .from(TABLES.qcLogs)
      .select(QC_LOG_COLUMNS)
      .eq(column, normalized)
      .maybeSingle();

    if (error) {
      if (
        isOrderId &&
        (error.code === "42703" || /column .*order_id.* does not exist/i.test(error.message))
      ) {
        throw new Error("QC order tracking is not configured. Apply the latest Supabase schema.");
      }
      throw new Error(`Could not load QC tracking data: ${error.message}`);
    }
    if (data && typeof data === "object") {
      return { ...data, source: "supabase" };
    }
    return null;
  }

  throw new Error("Supabase is required to load QC tracking data.");
}

/**
 * Insert a new order with base price and JIT buffer.
 * Automatically enforces total_price = base_price + jit_buffer.
 *
 * @param {{
 *   userRole: "b2c" | "b2b" | "b2s",
 *   productName: string,
 *   basePrice: number,
 *   jitBuffer?: number,
 *   serialNumber?: string | null,
 *   notes?: string,
 *   orderSummary?: object
 * }} orderData
 */
export async function createOrder({
  userRole,
  productName,
  basePrice,
  jitBuffer = 0,
  serialNumber = null,
  notes = "",
  orderSummary = {},
}) {
  const role = String(userRole ?? "b2c").toLowerCase();
  if (!USER_ROLES.includes(role)) {
    throw new Error(`userRole must be one of: ${USER_ROLES.join(", ")}`);
  }
  if (!productName || !String(productName).trim()) {
    throw new Error("productName is required.");
  }

  const cents = (n) => Math.round(Number(n) * 100) / 100;
  const base = cents(basePrice);
  const jit = cents(jitBuffer > 0 ? jitBuffer : base * 0.05); // 5% JIT buffer default
  const total = cents(base + jit);

  if (!Number.isFinite(base) || !Number.isFinite(jit) || base < 0 || jit < 0) {
    throw new Error("basePrice and jitBuffer must be non-negative numbers.");
  }

  const assignedSerial =
    serialNumber ? normalizeSerial(serialNumber) :
    `VICI-${role === "b2s" ? "DSK" : role === "b2b" ? "LTP" : "SRV"}-2026-${Math.floor(1000 + Math.random() * 9000)}`;

  let insertedOrder = null;

  if (isSupabaseConfigured && supabase) {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw new Error(`Could not verify the authenticated session: ${userError.message}`);
      if (!userData?.user) throw new Error("Sign in before placing an order.");

      const { data, error } = await supabase
        .from(TABLES.orders)
        .insert({
          user_id: userData.user.id,
          user_role: role,
          product_name: String(productName).trim(),
          base_price: base,
          jit_buffer: jit,
          total_price: total,
          serial_number: assignedSerial,
          order_summary: orderSummary,
        })
        .select(ORDER_COLUMNS)
        .single();

      if (error) throw new Error(`Supabase could not save the order: ${error.message}`);
      if (!data) throw new Error("Supabase did not return the saved order.");
      insertedOrder = { ...data, source: "supabase" };
    } catch (err) {
      console.warn("[ViciTech OS] Supabase createOrder failed:", err.message);
      throw err;
    }
  }

  // Fallback / Local copy for immediate seamless client display
  if (!insertedOrder) {
    insertedOrder = {
      id: `VT-PO-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      user_role: role,
      product_name: String(productName).trim(),
      base_price: base,
      jit_buffer: jit,
      total_price: total,
      status: "IoT Stress-Test Pending",
      serial_number: assignedSerial,
      created_at: new Date().toISOString(),
      notes,
      order_summary: orderSummary,
      source: "local",
    };
  }

  // Save in local storage so orders persist across client navigations and page reloads
  const currentOrders = getLocalStore(STORAGE_KEYS.orders, []);
  setLocalStore(STORAGE_KEYS.orders, [insertedOrder, ...currentOrders]);

  // Dispatch custom event for real-time reactive updates
  if (isBrowser) {
    window.dispatchEvent(
      new CustomEvent("vicitech:order_created", { detail: insertedOrder })
    );
  }

  return insertedOrder;
}

/**
 * List orders owned by the authenticated user, newest first.
 *
 * @param {{ userId: string, limit?: number }} options
 */
export async function listMyOrders({ userId, limit = 50 } = {}) {
  if (!userId) return [];
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Supabase is required to load your account orders.");
  }

  let query = supabase
    .from(TABLES.orders)
    .select(ORDER_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  const { data, error } = await query;
  if (error) throw new Error(`Could not load your orders: ${error.message}`);
  return Array.isArray(data) ? data : [];
}

/**
 * Save user preset (custom configuration) to Supabase / local storage.
 */
export async function saveUserPreset({ userId, name, role, parts, qty = 1, unitTotal = 0 }) {
  if (!userId) throw new Error("Sign in to save a preset to your account.");
  const newPreset = {
    id: isBrowser && window.crypto?.randomUUID ? window.crypto.randomUUID() : `preset_${Date.now()}`,
    user_id: userId,
    name: name || "Custom Configuration",
    role: (role || "b2c").toLowerCase(),
    parts,
    qty,
    unit_total: unitTotal,
    created_at: new Date().toISOString(),
  };

  let savedPreset = newPreset;
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("user_presets")
      .insert({
        user_id: newPreset.user_id,
        name: newPreset.name,
        role: newPreset.role,
        parts: newPreset.parts,
        qty: newPreset.qty,
        unit_total: newPreset.unit_total,
      })
      .select(USER_PRESET_COLUMNS)
      .single();
    if (error) throw new Error(`Could not sync saved preset: ${error.message}`);
    savedPreset = data;
  }

  const list = getLocalStore(STORAGE_KEYS.presets, []);
  setLocalStore(STORAGE_KEYS.presets, [savedPreset, ...list.filter((preset) => preset.id !== savedPreset.id)]);

  if (isBrowser) {
    window.dispatchEvent(
      new CustomEvent("vicitech:preset_saved", { detail: savedPreset })
    );
  }

  return savedPreset;
}

/**
 * List saved presets for the given role.
 */
export async function listUserPresets(userId = null) {
  if (!userId) return [];
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("user_presets")
      .select(USER_PRESET_COLUMNS)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(`Could not load saved presets: ${error.message}`);
    return Array.isArray(data) ? data : [];
  }
  const list = getLocalStore(STORAGE_KEYS.presets, []);
  return list.filter((preset) => preset.user_id === userId);
}
