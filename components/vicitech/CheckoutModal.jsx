"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Github, LoaderCircle, ShieldCheck, X } from "lucide-react";
import { createOrder, isSupabaseConfigured, supabase } from "@/lib/supabase";

export const PENDING_CHECKOUT_STORAGE_KEY = "vicitech_pending_checkout";

const idr = (value) => new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
}).format(value || 0);

export default function CheckoutModal({ open, orderSummary, onClose, onOrderCreated }) {
  const [session, setSession] = useState(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [confirmedOrder, setConfirmedOrder] = useState(null);

  useEffect(() => {
    if (!open) return undefined;

    let active = true;
    setError("");
    setConfirmedOrder(null);
    setIsLoadingSession(true);

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
  }, [open, onClose]);

  const signInWithGitHub = useCallback(async () => {
    if (!supabase || !orderSummary) {
      setError("Supabase authentication is not configured. Add the public Supabase URL and anon key to enable checkout.");
      return;
    }

    setError("");
    try {
      window.sessionStorage.setItem(PENDING_CHECKOUT_STORAGE_KEY, JSON.stringify(orderSummary));
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
  }, [orderSummary]);

  const submitOrder = useCallback(async () => {
    if (!supabase || !orderSummary || isSubmitting) return;
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
        notes: orderSummary.notes,
        orderSummary,
      });
      window.sessionStorage.removeItem(PENDING_CHECKOUT_STORAGE_KEY);
      setConfirmedOrder(order);
      onOrderCreated?.(order);
    } catch (submitError) {
      setError(`Order could not be placed: ${submitError.message}`);
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, onOrderCreated, orderSummary]);

  if (!open || !orderSummary) return null;

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/75 p-4" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !isSubmitting) onClose();
    }}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-title"
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/60"
      >
        <header className="flex items-start justify-between gap-4 border-b border-zinc-800 p-5 sm:p-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-400">Secure checkout</p>
            <h2 id="checkout-title" className="mt-1 text-xl font-semibold text-zinc-50">Review your order</h2>
            <p className="mt-1 text-sm text-zinc-400">{orderSummary.productName}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close checkout" className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
          {confirmedOrder ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
              <p className="flex items-center gap-2 font-semibold text-emerald-400"><CheckCircle2 className="h-5 w-5" /> Order placed</p>
              <p className="mt-2 text-sm text-zinc-300">Order ID: <span className="font-medium text-zinc-100">{confirmedOrder.id}</span></p>
              <p className="mt-1 text-sm text-zinc-300">Status: <span className="text-zinc-100">{confirmedOrder.status || "IoT Stress-Test Pending"}</span></p>
            </div>
          ) : (
            <>
              <section>
                <h3 className="mb-2 text-sm font-medium text-zinc-300">Build items · {orderSummary.quantity} unit{orderSummary.quantity === 1 ? "" : "s"}</h3>
                <ul className="divide-y divide-zinc-800 rounded-xl border border-zinc-800">
                  {orderSummary.items.map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-4 px-3 py-2.5 text-sm">
                      <span className="min-w-0">
                        <span className="block text-zinc-100">{item.label}: {item.name}</span>
                        <span className="block text-xs text-zinc-500">{item.spec}</span>
                      </span>
                      <span className="shrink-0 text-right tabular-nums text-zinc-300">{idr(item.unitPrice)} × {orderSummary.quantity}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
                  <p className="text-xs text-zinc-500">Power draw / PSU</p>
                  <p className="mt-1 text-sm font-medium text-zinc-100">{orderSummary.specs.powerDrawWatts} W / {orderSummary.specs.psuCapacityWatts} W</p>
                </div>
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
                  <p className="text-xs text-zinc-500">Warranty</p>
                  <p className="mt-1 text-sm font-medium text-zinc-100">{orderSummary.specs.warrantyMonths} months</p>
                </div>
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
                  <p className="text-xs text-zinc-500">Preset</p>
                  <p className="mt-1 text-sm font-medium text-zinc-100">{orderSummary.specs.presetName}</p>
                </div>
              </section>

              <dl className="space-y-2 border-t border-zinc-800 pt-4 text-sm">
                <div className="flex justify-between text-zinc-400"><dt>Base price</dt><dd className="tabular-nums">{idr(orderSummary.pricing.basePrice)}</dd></div>
                <div className="flex justify-between text-zinc-400"><dt>JIT market buffer</dt><dd className="tabular-nums">+{idr(orderSummary.pricing.jitBuffer)}</dd></div>
                <div className="flex justify-between border-t border-zinc-800 pt-3 text-base font-semibold text-zinc-50">
                  <dt>Total</dt><dd className="tabular-nums text-emerald-400">{idr(orderSummary.pricing.total)}</dd>
                </div>
              </dl>
            </>
          )}

          {error && <p role="alert" className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</p>}
        </div>

        <footer className="space-y-3 border-t border-zinc-800 p-5 sm:p-6">
          {confirmedOrder ? (
            <button type="button" onClick={onClose} className="w-full rounded-lg bg-emerald-500 px-4 py-3 text-sm font-semibold text-zinc-950 hover:bg-emerald-400">Done</button>
          ) : isLoadingSession ? (
            <p role="status" className="flex items-center justify-center gap-2 py-2 text-sm text-zinc-400"><LoaderCircle className="h-4 w-4 animate-spin" /> Checking your account…</p>
          ) : session ? (
            <button type="button" onClick={submitOrder} disabled={isSubmitting} className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-3 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 disabled:cursor-wait disabled:opacity-60">
              {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              {isSubmitting ? "Placing order…" : "Place order"}
            </button>
          ) : (
            <>
              {!isSupabaseConfigured && <p className="text-center text-xs text-zinc-500">Supabase credentials are required to sign in and place orders.</p>}
              <button type="button" onClick={signInWithGitHub} disabled={!isSupabaseConfigured} className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-3 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500">
                <Github className="h-4 w-4" /> Continue with GitHub
              </button>
            </>
          )}
          {!confirmedOrder && <p className="text-center text-xs text-zinc-500">Your order will be saved to your authenticated ViciTech account.</p>}
        </footer>
      </section>
    </div>
  );
}
