"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Github, LoaderCircle, Mail, ShieldCheck, X } from "lucide-react";
import { createOrder, isSupabaseConfigured, supabase } from "@/lib/supabase";

import { PENDING_CHECKOUT_STORAGE_KEY } from "@/lib/checkout/constants";
import { loadMidtransSnap } from "@/lib/payments/load-midtrans-snap";

export { PENDING_CHECKOUT_STORAGE_KEY };

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

const ORDER_TYPE_LABELS = {
  direct_buy: "Pembelian Langsung",
  preset_builder: "Rakitan Preset Builder",
  trade_in_refurbished: "Unit Refurbished Trade-In",
};

function isPresetBuilderOrder(itemData) {
  return String(itemData?.type || "").toLowerCase() === "preset_builder";
}

function formatOrderTypeLabel(rawType, fallbackName) {
  const key = String(rawType || "").toLowerCase();
  if (ORDER_TYPE_LABELS[key]) return ORDER_TYPE_LABELS[key];
  return fallbackName || "Pembelian Langsung";
}

function normalizeOrderSummary(itemData) {
  if (!itemData) return null;

  const isPresetBuilder = isPresetBuilderOrder(itemData);

  if (itemData.productName && itemData.pricing && Array.isArray(itemData.items)) {
    const basePrice = Math.max(0, Number(itemData.pricing?.basePrice ?? 0));
    const rawJit = itemData.pricing?.jitBuffer;
    const jitBuffer = isPresetBuilder
      ? Math.max(
          0,
          rawJit !== undefined && rawJit !== null
            ? Number(rawJit) || 0
            : Math.round(basePrice * 0.05),
        )
      : 0;

    return {
      ...itemData,
      type: itemData.type || "preset_builder",
      isPresetBuilder,
      userRole: itemData.userRole || "b2c",
      quantity: itemData.quantity || 1,
      specs: itemData.specs || {},
      tradeInDiscount: Number(itemData.tradeInDiscount) || 0,
      pricing: {
        basePrice,
        jitBuffer,
        total: basePrice + jitBuffer,
      },
      buyerDetails: itemData.buyerDetails || emptyBuyerDetails,
    };
  }

  const productName = itemData.itemTitle || itemData.productName || itemData.title || "Produk ViciTech";
  const quantity = Math.max(1, Number(itemData.quantity) || 1);
  const unitPrice = Number(itemData.price ?? itemData.basePrice ?? 0);
  const listedPrice = Number(itemData.pricing?.basePrice ?? itemData.basePrice ?? unitPrice * quantity);
  const tradeInDiscount = Math.min(
    Math.max(0, listedPrice),
    Math.max(0, Number(itemData.tradeInDiscount) || 0)
  );
  const basePrice = Math.max(0, listedPrice - tradeInDiscount);
  const jitBuffer = isPresetBuilder
    ? Math.max(0, Number(itemData.pricing?.jitBuffer ?? itemData.jitBuffer ?? Math.round(basePrice * 0.05)))
    : 0;
  const specs = typeof itemData.specs === "string" ? { detail: itemData.specs } : itemData.specs || {};
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
        label: itemData.type || "Produk",
        name: productName,
        spec: itemSpec,
        unitPrice,
      }],
    specs,
    type: itemData.type || "direct_buy",
    isPresetBuilder,
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

const inputClass =
  "vt-form-control min-h-11 w-full rounded-lg border border-default bg-canvas px-3 py-2.5 text-sm text-primary outline-none transition placeholder:text-secondary/60 focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20";

export default function CheckoutModal({
  itemData,
  isOpen,
  open,
  orderSummary: legacyOrderSummary,
  onClose,
  onOrderCreated,
}) {
  const router = useRouter();
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
      supabase.auth.getUser().then(({ data, error: userError }) => {
        if (!active) return;
        if (userError && !/session missing/i.test(userError.message || "")) {
          setError(`Sesi akun tidak dapat diperiksa: ${userError.message}`);
        }
        setSession(data?.user ? { user: data.user } : null);
        setIsLoadingSession(false);
      }).catch((userError) => {
        if (!active) return;
        setError(`Sesi akun tidak dapat diperiksa: ${userError.message}`);
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

  const goToEmailLogin = useCallback(() => {
    if (!orderSummary) return;
    setError("");
    try {
      window.sessionStorage.setItem(PENDING_CHECKOUT_STORAGE_KEY, JSON.stringify({
        ...orderSummary,
        buyerDetails,
      }));
    } catch {
      // Abaikan error penyimpanan sesi lokal.
    }
    const currentPath =
      `${window.location.pathname}${window.location.search}${window.location.hash}` || "/market";
    onClose();
    router.push(`/login?next=${encodeURIComponent(currentPath)}`);
  }, [buyerDetails, onClose, orderSummary, router]);

  const signInWithGitHub = useCallback(async () => {
    if (!supabase || !orderSummary) {
      setError("Autentikasi Supabase belum dikonfigurasi. Tambahkan URL dan anon key Supabase untuk melanjutkan checkout.");
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
      setError(`Gagal masuk dengan GitHub: ${authError.message}`);
    }
  }, [buyerDetails, orderSummary]);

  const submitOrder = useCallback(async (event) => {
    event.preventDefault();
    if (!orderSummary || isSubmitting) return;
    if (!supabase) {
      setError("Supabase belum dikonfigurasi. Tambahkan URL dan anon key Supabase untuk membuat pesanan.");
      return;
    }
    setIsSubmitting(true);
    setError("");
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw new Error(`Sesi Anda tidak dapat diverifikasi: ${userError.message}`);
      if (!userData?.user) {
        setSession(null);
        setError("Silakan masuk dengan Email atau GitHub terlebih dahulu sebelum membuat pesanan.");
        return;
      }

      const order = await createOrder({
        userRole: orderSummary.userRole,
        productName: orderSummary.productName,
        basePrice: orderSummary.pricing.basePrice,
        jitBuffer: orderSummary.isPresetBuilder ? orderSummary.pricing.jitBuffer : 0,
        notes: orderSummary.notes || "",
        orderSummary: { ...orderSummary, buyerDetails },
      });
      if (!order?.id || order.source === "local") {
        throw new Error("Pesanan harus tersimpan ke akun sebelum pembayaran dapat dimulai.");
      }
      const paymentResponse = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id }),
      });
      const payment = await paymentResponse.json();
      if (!paymentResponse.ok || !payment.token) {
        throw new Error(payment.error || "Sesi pembayaran tidak dapat dibuat.");
      }
      window.sessionStorage.removeItem(PENDING_CHECKOUT_STORAGE_KEY);
      setConfirmedOrder(order);
      onOrderCreated?.(order);
      await loadMidtransSnap();
      if (!window.snap) throw new Error("Jendela pembayaran belum siap. Muat ulang halaman dan coba lagi.");
      window.snap.pay(payment.token, {
        onSuccess: () => { setIsSubmitting(false); setError("Pembayaran diterima dan sedang diverifikasi. Status pesanan akan diperbarui otomatis."); window.dispatchEvent(new Event("vicitech:order_created")); },
        onPending: () => { setIsSubmitting(false); setError("Pembayaran menunggu penyelesaian. Anda dapat melanjutkan dari riwayat pesanan."); window.dispatchEvent(new Event("vicitech:order_created")); },
        onError: () => { setIsSubmitting(false); setError("Pembayaran gagal. Silakan coba kembali dari riwayat pesanan."); },
        onClose: () => { setIsSubmitting(false); setError("Jendela pembayaran ditutup. Pesanan tetap tersimpan dan dapat dibayar nanti."); },
      });
    } catch (submitError) {
      setError(`Pesanan tidak dapat diproses: ${submitError.message}`);
    } finally {
      setIsSubmitting(false);
    }
  }, [buyerDetails, isSubmitting, onOrderCreated, orderSummary]);

  if (!modalIsOpen || !orderSummary) return null;

  return (
    <div
      className="vt-backdrop-enter fixed inset-0 z-[75] flex items-center justify-center bg-black/60 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) onClose();
      }}
    >
      <form
        onSubmit={submitOrder}
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-title"
        className="vt-dialog-enter flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-default bg-surface text-primary shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-default p-5 sm:p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-accent-cta">
              Checkout Aman
            </p>
            <h2 id="checkout-title" className="tracking-tight mt-1 font-sans text-xl font-bold text-primary">
              Ringkasan Pesanan
            </h2>
            <p className="mt-1 text-sm text-secondary">{orderSummary.productName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup checkout"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-default bg-subtle text-primary transition hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
          >
            <X className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
          {confirmedOrder ? (
            <div className="vt-toast-enter rounded-xl border border-status-live/30 bg-emerald-50 p-4 text-emerald-900">
              <p className="flex items-center gap-2 font-semibold text-status-live">
                <CheckCircle2 className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
                <span>Pesanan Berhasil Dibuat</span>
              </p>
              <p className="mt-2 text-sm">
                Nomor Pesanan:{" "}
                <span className="font-mono font-semibold text-primary">
                  {confirmedOrder.order_number || confirmedOrder.id}
                </span>
              </p>
              <p className="mt-1 text-sm">
                Pembayaran:{" "}
                <span className="inline-flex rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-900">
                  Menunggu Pembayaran
                </span>
              </p>
            </div>
          ) : (
            <>
              <section>
                <h3 className="tracking-tight mb-2 text-sm font-bold text-primary">
                  Item Pesanan · {orderSummary.quantity} unit
                </h3>
                <ul className="divide-y divide-default rounded-xl border border-default bg-canvas">
                  {orderSummary.items.map((item) => {
                    const lineQty = Math.max(1, Number(item.quantity ?? orderSummary.quantity) || 1);
                    return (
                      <li key={item.id} className="flex items-center justify-between gap-4 px-3.5 py-2.5 text-sm">
                        <span className="min-w-0">
                          <span className="block font-medium text-primary">
                            {item.label}: {item.name}
                          </span>
                          {item.spec && (
                            <span className="block text-xs text-secondary">{item.spec}</span>
                          )}
                        </span>
                        <span className="shrink-0 text-right font-mono tabular-nums text-primary">
                          {idr(item.unitPrice)} × {lineQty}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>

              <section>
                <h3 className="tracking-tight mb-3 text-sm font-bold text-primary">
                  Detail Pembeli &amp; Pengiriman
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    ["fullName", "Nama Lengkap", "text", "name"],
                    ["email", "Alamat Email", "email", "email"],
                    ["phone", "Nomor Telepon / WhatsApp", "tel", "tel"],
                    ["address", "Alamat Lengkap", "text", "street-address"],
                    ["city", "Kota / Kabupaten", "text", "address-level2"],
                    ["postalCode", "Kode Pos", "text", "postal-code"],
                  ].map(([field, label, type, autoComplete]) => (
                    <label
                      key={field}
                      className={`space-y-1 text-xs font-medium text-secondary ${field === "address" ? "sm:col-span-2" : ""}`}
                    >
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
                        className={inputClass}
                      />
                    </label>
                  ))}
                </div>
              </section>

              {orderSummary.isPresetBuilder && (
                <section className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-default bg-canvas p-3">
                    <p className="text-xs text-secondary">Beban Daya / PSU</p>
                    <p className="mt-1 font-mono text-sm font-semibold tabular-nums text-primary">
                      {orderSummary.specs.powerDrawWatts ?? "—"} W / {orderSummary.specs.psuCapacityWatts ?? "—"} W
                    </p>
                  </div>
                  <div className="rounded-lg border border-default bg-canvas p-3">
                    <p className="text-xs text-secondary">Garansi</p>
                    <p className="mt-1 font-mono text-sm font-semibold tabular-nums text-primary">
                      {orderSummary.specs.warrantyMonths ?? "—"} bulan
                    </p>
                  </div>
                  <div className="rounded-lg border border-default bg-canvas p-3">
                    <p className="text-xs text-secondary">Preset</p>
                    <p className="mt-1 truncate text-sm font-semibold text-primary">
                      {orderSummary.specs.presetName || orderSummary.productName}
                    </p>
                  </div>
                </section>
              )}

              <dl className="space-y-2 border-t border-default pt-4 text-sm">
                <div className="flex justify-between text-secondary">
                  <dt>Tipe Pesanan</dt>
                  <dd className="font-medium text-primary">
                    {formatOrderTypeLabel(orderSummary.type, orderSummary.specs.presetName)}
                  </dd>
                </div>
                {orderSummary.tradeInDiscount > 0 && (
                  <div className="flex justify-between text-status-live">
                    <dt>Potongan Trade-In</dt>
                    <dd className="font-mono tabular-nums">−{idr(orderSummary.tradeInDiscount)}</dd>
                  </div>
                )}
                <div className="flex justify-between text-secondary">
                  <dt>{orderSummary.tradeInDiscount > 0 ? "Harga Setelah Diskon" : "Subtotal"}</dt>
                  <dd className="font-mono tabular-nums text-primary">{idr(orderSummary.pricing.basePrice)}</dd>
                </div>
                {orderSummary.isPresetBuilder && orderSummary.pricing.jitBuffer > 0 && (
                  <div className="flex justify-between text-secondary">
                    <dt>JIT Market Buffer (5%)</dt>
                    <dd className="font-mono tabular-nums text-primary">
                      +{idr(orderSummary.pricing.jitBuffer)}
                    </dd>
                  </div>
                )}
                <div className="flex justify-between border-t border-default pt-3 text-base font-semibold text-primary">
                  <dt>Total Pembayaran</dt>
                  <dd className="font-mono font-bold tabular-nums text-accent-cta">
                    {idr(orderSummary.pricing.total)}
                  </dd>
                </div>
              </dl>
            </>
          )}

          {error && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-status-danger/30 bg-red-50 p-3 text-sm text-status-danger"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
              <span>{error}</span>
            </p>
          )}
        </div>

        <footer className="space-y-2.5 border-t border-default bg-surface p-5 sm:p-6">
          {confirmedOrder ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link
                href="/profile?tab=orders"
                onClick={onClose}
                className="vt-motion-press vt-btn-tactile flex min-h-11 flex-1 items-center justify-center rounded-lg border border-default bg-canvas px-4 py-3 text-sm font-semibold text-primary transition hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
              >
                Lihat Riwayat Pesanan
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="vt-motion-press vt-btn-tactile flex min-h-11 flex-1 items-center justify-center rounded-lg bg-accent-cta px-4 py-3 text-sm font-semibold text-white transition hover:bg-accent-cta-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
              >
                Selesai
              </button>
            </div>
          ) : isLoadingSession ? (
            <p role="status" className="flex items-center justify-center gap-2 py-2 text-sm text-secondary">
              <LoaderCircle className="h-4 w-4 animate-spin text-accent-primary" aria-hidden="true" />
              <span>Memeriksa sesi akun…</span>
            </p>
          ) : session ? (
            <button
              type="submit"
              disabled={isSubmitting}
              className="vt-motion-press vt-btn-tactile flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent-cta px-4 py-3 text-sm font-semibold text-white transition hover:bg-accent-cta-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60 disabled:cursor-wait disabled:opacity-60"
            >
              {isSubmitting ? (
                <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <ShieldCheck className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              )}
              <span>{isSubmitting ? "Memproses pesanan…" : "Konfirmasi Pesanan"}</span>
            </button>
          ) : (
            <div className="space-y-2">
              {!isSupabaseConfigured && (
                <p className="text-center text-xs text-secondary">
                  Konfigurasi Supabase diperlukan untuk masuk dan membuat pesanan.
                </p>
              )}
              <button
                type="button"
                onClick={goToEmailLogin}
                className="vt-motion-press vt-btn-tactile flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent-cta px-4 py-3 text-sm font-semibold text-white transition hover:bg-accent-cta-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
              >
                <Mail className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                <span>Masuk / Daftar dengan Email</span>
              </button>
              <button
                type="button"
                onClick={signInWithGitHub}
                disabled={!isSupabaseConfigured}
                className="vt-motion-press vt-btn-tactile flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-default bg-canvas px-4 py-2.5 text-sm font-medium text-primary transition hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Github className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                <span>Lanjutkan dengan GitHub</span>
              </button>
            </div>
          )}
          {!confirmedOrder && (
            <p className="text-center text-xs text-secondary">
              Pesanan akan tersimpan ke akun ViciTech Anda yang terautentikasi.
            </p>
          )}
        </footer>
      </form>
    </div>
  );
}
