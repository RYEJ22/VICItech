"use client";

import dynamic from "next/dynamic";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ShoppingCart, X } from "lucide-react";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { PENDING_CHECKOUT_STORAGE_KEY } from "@/lib/checkout/constants";

const CheckoutModal = dynamic(() => import("@/components/vicitech/CheckoutModal"), {
  ssr: false,
});

export { PENDING_CHECKOUT_STORAGE_KEY };

const CART_STORAGE_KEY = "vicitech_market_cart_v1";

const CheckoutContext = createContext(null);

function buildCartCheckoutData(items) {
  if (!Array.isArray(items) || items.length === 0) return null;
  if (items.length === 1 && items[0].quantity === 1) {
    return items[0];
  }

  let totalQty = 0;
  let basePrice = 0;
  const lineItems = [];

  for (const item of items) {
    const qty = Math.max(1, Number(item.quantity) || 1);
    const unitPrice = Math.max(0, Number(item.price) || 0);
    totalQty += qty;
    basePrice += unitPrice * qty;
    lineItems.push({
      id: item.id,
      label: `${qty}×`,
      name: item.title,
      spec: item.category ? `Kategori: ${item.category}` : "Produk Market",
      unitPrice: unitPrice * qty,
    });
  }

  return {
    id: items[0].id,
    title: items.length === 1 ? `${items[0].title} (${totalQty}×)` : `Keranjang ViciTech (${totalQty} unit)`,
    price: basePrice,
    basePrice,
    quantity: 1,
    type: items[0].type || "direct_buy",
    specs: {
      presetName: `Keranjang Market · ${items.length} jenis produk`,
    },
    items: lineItems,
  };
}

export function CheckoutProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [checkoutData, setCheckoutData] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [cartToast, setCartToast] = useState(null);

  const hasHydratedCartRef = useRef(false);
  const cartItemsRef = useRef([]);
  const toastTimerRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    try {
      const raw = window.localStorage.getItem(CART_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const valid = parsed.filter(
            (entry) => entry && typeof entry.id === "string" && typeof entry.title === "string",
          );
          setCartItems(valid);
          cartItemsRef.current = valid;
        }
      }
    } catch {
      // Abaikan data keranjang yang tidak valid.
    } finally {
      hasHydratedCartRef.current = true;
    }

    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    cartItemsRef.current = cartItems;
    if (!hasHydratedCartRef.current || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
    } catch {
      // Abaikan error penyimpanan lokal.
    }
  }, [cartItems]);

  const dismissCartToast = useCallback(() => {
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setCartToast(null);
  }, []);

  const triggerCheckout = useCallback((itemData) => {
    dismissCartToast();
    setCheckoutData(itemData);
    setIsOpen(true);
  }, [dismissCartToast]);

  const closeCheckout = useCallback(() => {
    setIsOpen(false);
    setCheckoutData(null);
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(PENDING_CHECKOUT_STORAGE_KEY);
    }
  }, []);

  const addToCart = useCallback((item) => {
    if (!item || !item.id || !item.title) return;

    const current = cartItemsRef.current;
    const existingIndex = current.findIndex((entry) => entry.id === item.id);
    const nextItems =
      existingIndex >= 0
        ? current.map((entry, idx) =>
            idx === existingIndex
              ? { ...entry, ...item, quantity: Math.max(1, Number(entry.quantity) || 1) + 1 }
              : entry,
          )
        : [...current, { ...item, quantity: 1 }];

    cartItemsRef.current = nextItems;
    setCartItems(nextItems);

    const nextTotal = nextItems.reduce(
      (sum, entry) => sum + Math.max(1, Number(entry.quantity) || 1),
      0,
    );
    const nextTotalPrice = nextItems.reduce(
      (sum, entry) =>
        sum + Math.max(0, Number(entry.price) || 0) * Math.max(1, Number(entry.quantity) || 1),
      0,
    );

    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    setCartToast({
      id: Date.now(),
      title: item.title,
      totalCount: nextTotal,
      totalPrice: nextTotalPrice,
    });
    toastTimerRef.current = window.setTimeout(() => {
      toastTimerRef.current = null;
      setCartToast(null);
    }, 4500);
  }, []);

  const removeFromCart = useCallback((id) => {
    setCartItems((prev) => prev.filter((entry) => entry.id !== id));
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  const totalCartItems = useMemo(
    () => cartItems.reduce((sum, entry) => sum + Math.max(1, Number(entry.quantity) || 1), 0),
    [cartItems],
  );

  const totalCartPrice = useMemo(
    () =>
      cartItems.reduce(
        (sum, entry) =>
          sum + Math.max(0, Number(entry.price) || 0) * Math.max(1, Number(entry.quantity) || 1),
        0,
      ),
    [cartItems],
  );

  const triggerCartCheckout = useCallback(() => {
    const payload = buildCartCheckoutData(cartItemsRef.current);
    if (!payload) return;
    triggerCheckout(payload);
  }, [triggerCheckout]);

  const value = useMemo(
    () => ({
      isOpen,
      checkoutData,
      triggerCheckout,
      closeCheckout,
      cartItems,
      totalCartItems,
      totalCartPrice,
      triggerCartCheckout,
      addToCart,
      removeFromCart,
      clearCart,
      dismissCartToast,
    }),
    [
      isOpen,
      checkoutData,
      triggerCheckout,
      closeCheckout,
      cartItems,
      totalCartItems,
      totalCartPrice,
      triggerCartCheckout,
      addToCart,
      removeFromCart,
      clearCart,
      dismissCartToast,
    ],
  );

  return (
    <CheckoutContext.Provider value={value}>
      {children}
      {cartToast ? (
        <div
          role="status"
          aria-live="polite"
          className="vt-pop fixed bottom-24 right-4 z-[70] flex w-[min(24rem,calc(100vw-2rem))] items-start gap-3 rounded-xl border border-default bg-surface p-3.5 text-primary shadow-lg md:bottom-6"
        >
          <CheckCircle2
            className="mt-0.5 h-5 w-5 shrink-0 text-status-live"
            strokeWidth={1.75}
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-snug text-primary">
              Ditambahkan ke keranjang
            </p>
            <p className="mt-0.5 truncate text-xs text-secondary">{cartToast.title}</p>
            <p className="mt-1 text-xs text-secondary">
              <AnimatedNumber
                value={cartToast.totalCount}
                format="number"
                className="font-semibold text-primary"
              />{" "}
              item ·{" "}
              <AnimatedNumber
                value={cartToast.totalPrice}
                format="currency"
                className="font-semibold text-primary"
              />
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={triggerCartCheckout}
                className="vt-btn-tactile inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-accent-cta px-3.5 py-2 text-xs font-semibold text-accent-foreground hover:bg-accent-cta-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
              >
                <ShoppingCart className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                <span>Lanjut Checkout</span>
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={dismissCartToast}
            aria-label="Tutup notifikasi keranjang"
            className="vt-btn-tactile inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-secondary hover:bg-subtle hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
          >
            <X className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
      ) : null}
      {isOpen ? (
        <CheckoutModal
          itemData={checkoutData}
          isOpen={isOpen}
          onClose={closeCheckout}
        />
      ) : null}
    </CheckoutContext.Provider>
  );
}

export function useCheckout() {
  const context = useContext(CheckoutContext);
  if (!context) {
    throw new Error("useCheckout must be used within a CheckoutProvider.");
  }
  return context;
}
