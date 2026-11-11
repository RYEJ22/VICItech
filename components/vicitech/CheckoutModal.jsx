"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Github, LoaderCircle, ShieldCheck, X } from "lucide-react";
import { createOrder, isSupabaseConfigured, supabase } from "@/lib/supabase";

export const PENDING_CHECKOUT_STORAGE_KEY = "vicitech_pending_checkout";

const idr = (value) => new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
}).format(value || 0);

const emptyBuyerDetails = {
  fullName: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  postalCode: "",
};

function normalizeOrderSummary(itemData) {
  if (!itemData) return null;

  if (itemData.productName && itemData.pricing && Array.isArray(itemData.items)) {
    return {
      ...itemData,
      userRole: itemData.userRole || "b2c",
      quantity: itemData.quantity || 1,
      specs: itemData.specs || {},
      tradeInDiscount: Number(itemData.tradeInDiscount) || 0,
      buyerDetails: itemData.buyerDetails || emptyBuyerDetails,
    };
  }

  const productName = itemData.itemTitle || itemData.productName || itemData.title || "ViciTech product";
  const quantity = Math.max(1, Number(itemData.quantity) || 1);
  const unitPrice = Number(itemData.price ?? itemData.basePrice ?? 0);
  const listedPrice = Number(itemData.pricing?.basePrice ?? itemData.basePrice ?? unitPrice * quantity);
  const tradeInDiscount = Math.min(
    Math.max(0, listedPrice),
    Math.max(0, Number(itemData.tradeInDiscount) || 0)
  );
  const basePrice = Math.max(0, listedPrice - tradeInDiscount);
  const jitBuffer = Number(itemData.pricing?.jitBuffer ?? itemData.jitBuffer ?? Math.round(basePrice * 0.05));
  const specs = typeof itemData.specs === "string" ? { details: itemData.specs } : itemData.specs || {};
  const itemSpec = Object.entries(specs)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => `${key}: ${value}`)
    .join(" · ");

  return {
    userRole: itemData.userRole || "b2c",
    productName,
    quantity,
    items: Array.isArray(itemData.items) && itemData.items.length
      ? itemData.items
      : [{
        id: itemData.id || productName,
        label: itemData.type || "Product",
        name: productName,
        spec: itemSpec,
        unitPrice,
      }],
    specs,
    type: itemData.type || "Product",
    tradeInDiscount,
    pricing: {
      basePrice,
      jitBuffer,
      total: basePrice + jitBuffer,
    },
    notes: itemData.notes || "",
    buyerDetails: itemData.buyerDetails || emptyBuyerDetails,
  };
}

export default function CheckoutModal({
  itemData,
  isOpen,
  open,
  orderSummary: legacyOrderSummary,
  onClose,
  onOrderCreated,
}) {
  const checkoutData = itemData || legacyOrderSummary;
  const orderSummary = useMemo(() => normalizeOrderSummary(checkoutData), [checkoutData]);
  const modalIsOpen = isOpen ?? open;
  const [session, setSession] = useState(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [confirmedOrder, setConfirmedOrder] = useState(null);
  const [buyerDetails, setBuyerDetails] = useState(emptyBuyerDetails);

  useEffect(() => {
    if (!modalIsOpen) return undefined;

    let active = true;
    setError("");
    setConfirmedOrder(null);
    setIsLoadingSession(true);
    setBuyerDetails({ ...emptyBuyerDetails, ...(checkoutData?.buyerDetails || {}) });

    let unsubscribe = () => {};
    if (supabase) {
      supabase.auth.getSession().then(({ data, error: sessionError }) => {
        if (!active) return;
        if (sessionError) setError(`Could not check your session: ${sessionError.message}`);
        setSession(data?.session || null);
        setIsLoadingSession(false);
      }).catch((sessionError) => {
        if (!active) return;
        setError(`Could not check your session: ${sessionError.message}`);
        setIsLoadingSession(false);
      });

      const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        if (active) setSession(nextSession);
      });
      unsubscribe = () => authListener.subscription.unsubscribe();
    } else {
      setSession(null);
      setIsLoadingSession(false);
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      active = false;
      unsubscribe();
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [checkoutData, modalIsOpen, onClose]);

  const signInWithGitHub = useCallback(async () => {
    if (!supabase || !orderSummary) {
      setError("Supabase authentication is not configured. Add the public Supabase URL and anon key to enable checkout.");
      return;
    }

    setError("");
    try {
      window.sessionStorage.setItem(PENDING_CHECKOUT_STORAGE_KEY, JSON.stringify({
        ...orderSummary,
        buyerDetails,
      }));
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
            `${window.location.pathname}${window.location.search}${window.location.hash}`
          )}`,
        },
      });
      if (authError) throw authError;
    } catch (authError) {
      window.sessionStorage.removeItem(PENDING_CHECKOUT_STORAGE_KEY);
      setError(`GitHub sign-in failed: ${authError.message}`);
    }
  }, [buyerDetails, orderSummary]);

  const submitOrder = useCallback(async (event) => {
    event.preventDefault();
    if (!orderSummary || isSubmitting) return;
    if (!supabase) {
      setError("Supabase is not configured. Add the public Supabase URL and anon key to enable checkout.");
      return;
    }
    setIsSubmitting(true);
    setError("");
    try {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw new Error(`Could not verify your session: ${sessionError.message}`);
      if (!data.session) {
        setSession(null);
        setError("Sign in with GitHub before placing your order.");
        return;
      }

      const order = await createOrder({
        userRole: orderSummary.userRole,
        productName: orderSummary.productName,
        basePrice: orderSummary.pricing.basePrice,
        jitBuffer: orderSummary.pricing.jitBuffer,
        notes: orderSummary.notes || "",
        orderSummary: { ...orderSummary, buyerDetails },
      });
      window.sessionStorage.removeItem(PENDING_CHECKOUT_STORAGE_KEY);
      setConfirmedOrder(order);
      onOrderCreated?.(order);
    } catch (submitError) {
      setError(`Order could not be placed: ${submitError.message}`);
    } finally {
      setIsSubmitting(false);
    }
  }, [buyerDetails, isSubmitting, onOrderCreated, orderSummary]);

  if (!modalIsOpen || !orderSummary) return null;

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/75 p-4" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !isSubmitting) onClose();
    }}>
      <form
        onSubmit={submitOrder}
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-title"
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-2xl shadow-black/60"
      >
        <header className="flex items-start justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 p-5 sm:p-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Secure checkout</p>
            <h2 id="checkout-title" className="mt-1 text-xl font-semibold text-zinc-900 dark:text-zinc-50">Review your order</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{orderSummary.productName}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close checkout" className="rounded-lg p-2 text-zinc-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
          {confirmedOrder ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
              <p className="flex items-center gap-2 font-semibold text-emerald-700 dark:text-emerald-400"><CheckCircle2 className="h-5 w-5" /> Order placed</p>
              <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">Order ID: <span className="font-medium text-zinc-900 dark:text-zinc-100">{confirmedOrder.id}</span></p>
              <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">Status: <span className="text-zinc-900 dark:text-zinc-100">{confirmedOrder.status || "IoT Stress-Test Pending"}</span></p>
            </div>
          ) : (
            <>
              <section>
                <h3 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">Build items · {orderSummary.quantity} unit{orderSummary.quantity === 1 ? "" : "s"}</h3>
                <ul className="divide-y divide-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  {orderSummary.items.map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-4 px-3 py-2.5 text-sm">
                      <span className="min-w-0">
                        <span className="block text-zinc-900 dark:text-zinc-100">{item.label}: {item.name}</span>
                        <span className="block text-xs text-zinc-500">{item.spec}</span>
                      </span>
                      <span className="shrink-0 text-right tabular-nums text-zinc-700 dark:text-zinc-300">{idr(item.unitPrice)} × {orderSummary.quantity}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section>
                <h3 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">Buyer and shipping details</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    ["fullName", "Full name", "text", "name"],
                    ["email", "Email address", "email", "email"],
                    ["phone", "Phone number", "tel", "tel"],
                    ["address", "Street address", "text", "street-address"],
                    ["city", "City", "text", "address-level2"],
                    ["postalCode", "Postal code", "text", "postal-code"],
                  ].map(([field, label, type, autoComplete]) => (
                    <label key={field} className={`space-y-1 text-xs text-zinc-600 dark:text-zinc-400 ${field === "address" ? "sm:col-span-2" : ""}`}>
                      <span>{label}</span>
                      <input
                        type={type}
                        autoComplete={autoComplete}
                        required
                        value={buyerDetails[field]}
                        onChange={(event) => setBuyerDetails((details) => ({
                          ...details,
                          [field]: event.target.value,
                        }))}
                        className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 outline-none transition focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </label>
                  ))}
                </div>
              </section>

              <section className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 p-3">
                  <p className="text-xs text-zinc-500">Power draw / PSU</p>
                  <p className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">{orderSummary.specs.powerDrawWatts ?? "—"} W / {orderSummary.specs.psuCapacityWatts ?? "—"} W</p>
                </div>
                <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 p-3">
                  <p className="text-xs text-zinc-500">Warranty</p>
                  <p className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">{orderSummary.specs.warrantyMonths ?? "—"} months</p>
                </div>
                <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 p-3">
                  <p className="text-xs text-zinc-500">Preset</p>
                  <p className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">{orderSummary.specs.presetName || orderSummary.productName}</p>
                </div>
              </section>

              <dl className="space-y-2 border-t border-zinc-200 dark:border-zinc-800 pt-4 text-sm">
                <div className="flex justify-between text-zinc-600 dark:text-zinc-400"><dt>Item type</dt><dd className="capitalize">{String(orderSummary.type || orderSummary.specs.presetName || "Product").replaceAll("_", " ")}</dd></div>
                {orderSummary.tradeInDiscount > 0 && (
                  <div className="flex justify-between text-emerald-700 dark:text-emerald-400"><dt>Trade-in discount</dt><dd className="tabular-nums">−{idr(orderSummary.tradeInDiscount)}</dd></div>
                )}
                <div className="flex justify-between text-zinc-600 dark:text-zinc-400"><dt>{orderSummary.tradeInDiscount > 0 ? "Price after discount" : "Base price"}</dt><dd className="tabular-nums">{idr(orderSummary.pricing.basePrice)}</dd></div>
                <div className="flex justify-between text-zinc-600 dark:text-zinc-400"><dt>JIT market buffer</dt><dd className="tabular-nums">+{idr(orderSummary.pricing.jitBuffer)}</dd></div>
                <div className="flex justify-between border-t border-zinc-200 dark:border-zinc-800 pt-3 text-base font-semibold text-zinc-900 dark:text-zinc-50">
                  <dt>Total</dt><dd className="tabular-nums text-emerald-700 dark:text-emerald-400">{idr(orderSummary.pricing.total)}</dd>
                </div>
              </dl>
            </>
          )}

          {error && <p role="alert" className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</p>}
        </div>

        <footer className="space-y-3 border-t border-zinc-200 dark:border-zinc-800 p-5 sm:p-6">
          {confirmedOrder ? (
            <button type="button" onClick={onClose} className="w-full rounded-lg bg-emerald-500 px-4 py-3 text-sm font-semibold text-zinc-950 hover:bg-emerald-400">Done</button>
          ) : isLoadingSession ? (
            <p role="status" className="flex items-center justify-center gap-2 py-2 text-sm text-zinc-600 dark:text-zinc-400"><LoaderCircle className="h-4 w-4 animate-spin" /> Checking your account…</p>
          ) : session ? (
            <button type="submit" disabled={isSubmitting} className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-3 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 disabled:cursor-wait disabled:opacity-60">
              {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              {isSubmitting ? "Placing order…" : "Confirm Order"}
            </button>
          ) : (
            <>
              {!isSupabaseConfigured && <p className="text-center text-xs text-zinc-500">Supabase credentials are required to sign in and place orders.</p>}
              <button type="button" onClick={signInWithGitHub} disabled={!isSupabaseConfigured} className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-3 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-zinc-100 dark:disabled:bg-zinc-800 disabled:text-zinc-500">
                <Github className="h-4 w-4" /> Continue with GitHub
              </button>
            </>
          )}
          {!confirmedOrder && <p className="text-center text-xs text-zinc-500">Your order will be saved to your authenticated ViciTech account.</p>}
        </footer>
      </form>
    </div>
  );
}
