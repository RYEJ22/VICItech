"use client";

import dynamic from "next/dynamic";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ShoppingCart, X } from "lucide-react";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { CartDrawer } from "@/components/vicitech/CartDrawer";
import { PENDING_CHECKOUT_STORAGE_KEY } from "@/lib/checkout/constants";

const CheckoutModal = dynamic(() => import("@/components/vicitech/CheckoutModal"), {
  ssr: false,
});

export { PENDING_CHECKOUT_STORAGE_KEY };

const CART_STORAGE_KEY = "vicitech_market_cart_v1";

const CheckoutContext = createContext(null);

function normalizeCartEntry(raw) {
  if (!raw || typeof raw !== "object") return null;
  const id = typeof raw.id === "string" ? raw.id.trim() : "";
  const title =
    typeof raw.title === "string" && raw.title.trim()
      ? raw.title.trim()
      : typeof raw.name === "string"
        ? raw.name.trim()
        : "";
  if (!id || !title) return null;

  const qty = Math.min(99, Math.max(1, Math.floor(Number(raw.quantity ?? raw.qty) || 1)));
  const price = Math.max(0, Number(raw.price) || 0);
  const isPreset =
    raw.source === "preset_builder" ||
    String(raw.type || "").toLowerCase() === "preset_builder";

  return {
    ...raw,
    id,
    title,
    name: title,
    price,
    quantity: qty,
    qty,
    image: typeof raw.image === "string" ? raw.image : null,
    seller_type: raw.seller_type || "vicitech",
    source: isPreset ? "preset_builder" : "market",
    type: isPreset ? "preset_builder" : "direct_buy",
  };
}

function buildCartCheckoutData(items) {
  if (!Array.isArray(items) || items.length === 0) return null;

  let totalQty = 0;
  let basePrice = 0;
  let presetBuilderSubtotal = 0;
  const lineItems = [];

  for (const item of items) {
    const qty = Math.max(1, Number(item.quantity ?? item.qty) || 1);
    const unitPrice = Math.max(0, Number(item.price) || 0);
    const lineSubtotal = unitPrice * qty;
    const isPreset =
      item.source === "preset_builder" ||
      String(item.type || "").toLowerCase() === "preset_builder";

    totalQty += qty;
    basePrice += lineSubtotal;
    if (isPreset) {
      presetBuilderSubtotal += lineSubtotal;
    }

    lineItems.push({
      id: item.id,
      label: item.category || (isPreset ? "Preset Builder" : "Produk Market"),
      name: item.title || item.name || "Produk ViciTech",
      spec:
        item.seller_type === "partner"
          ? "Mitra Terverifikasi ViciTech"
          : isPreset
            ? "Rakitan Preset Builder"
            : "Ready Stock Market",
      unitPrice,
      quantity: qty,
    });
  }

  const jitBuffer = Math.round(presetBuilderSubtotal * 0.05);
  const hasPresetItems = presetBuilderSubtotal > 0;
  const productName =
    items.length === 1
      ? totalQty > 1
        ? `${items[0].title} (${totalQty}×)`
        : items[0].title
      : `Keranjang ViciTech (${totalQty} item)`;

  return {
    id: items[0].id,
    fromCart: true,
    userRole: items[0].userRole || "b2c",
    productName,
    title: productName,
    price: basePrice,
    basePrice,
    quantity: totalQty,
    type: hasPresetItems ? "preset_builder" : "direct_buy",
    specs: {
      presetName:
        items.length === 1
          ? items[0].category || "Produk Market"
          : `Keranjang Market · ${items.length} produk`,
    },
    items: lineItems,
    pricing: {
      basePrice,
      jitBuffer,
      total: basePrice + jitBuffer,
    },
  };
}

export function CheckoutProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
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
          const valid = parsed.map(normalizeCartEntry).filter(Boolean);
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

  const openCart = useCallback(() => {
    dismissCartToast();
    setIsCartOpen(true);
  }, [dismissCartToast]);

  const closeCart = useCallback(() => {
    setIsCartOpen(false);
  }, []);

  const toggleCart = useCallback(() => {
    dismissCartToast();
    setIsCartOpen((prev) => !prev);
  }, [dismissCartToast]);

  const triggerCheckout = useCallback((itemData) => {
    dismissCartToast();
    setIsCartOpen(false);
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
    const normalized = normalizeCartEntry(item);
    if (!normalized) return;

    const current = cartItemsRef.current;
    const existingIndex = current.findIndex((entry) => entry.id === normalized.id);
    const nextItems =
      existingIndex >= 0
        ? current.map((entry, idx) => {
            if (idx !== existingIndex) return entry;
            const nextQty = Math.min(99, Math.max(1, Number(entry.quantity) || 1) + 1);
            return {
              ...entry,
              ...normalized,
              quantity: nextQty,
              qty: nextQty,
            };
          })
        : [...current, normalized];

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
      title: normalized.title,
      totalCount: nextTotal,
      totalPrice: nextTotalPrice,
    });
    toastTimerRef.current = window.setTimeout(() => {
      toastTimerRef.current = null;
      setCartToast(null);
    }, 4500);
  }, []);

  const updateCartQuantity = useCallback((id, nextQuantity) => {
    const qty = Math.floor(Number(nextQuantity) || 0);
    setCartItems((prev) => {
      if (qty <= 0) {
        return prev.filter((entry) => entry.id !== id);
      }
      const clamped = Math.min(99, qty);
      return prev.map((entry) =>
        entry.id === id ? { ...entry, quantity: clamped, qty: clamped } : entry,
      );
    });
  }, []);

  const removeFromCart = useCallback((id) => {
    setCartItems((prev) => prev.filter((entry) => entry.id !== id));
  }, []);

  const clearCart = useCallback(() => {
    cartItemsRef.current = [];
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

  const handleOrderCreated = useCallback(() => {
    if (checkoutData?.fromCart) {
      clearCart();
    }
  }, [checkoutData?.fromCart, clearCart]);

  const value = useMemo(
    () => ({
      isOpen,
      checkoutData,
      triggerCheckout,
      closeCheckout,
      isCartOpen,
      openCart,
      closeCart,
      toggleCart,
      cartItems,
      totalCartItems,
      totalCartPrice,
      triggerCartCheckout,
      addToCart,
      updateCartQuantity,
      removeFromCart,
      clearCart,
      dismissCartToast,
    }),
    [
      isOpen,
      checkoutData,
      triggerCheckout,
      closeCheckout,
      isCartOpen,
      openCart,
      closeCart,
      toggleCart,
      cartItems,
      totalCartItems,
      totalCartPrice,
      triggerCartCheckout,
      addToCart,
      updateCartQuantity,
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
          className="vt-pop fixed bottom-20 right-4 z-[70] flex w-[min(24rem,calc(100vw-2rem))] items-start gap-3 rounded-xl border border-default bg-surface p-3.5 text-primary shadow-lg md:bottom-6"
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
                onClick={openCart}
                className="vt-btn-tactile inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-default bg-canvas px-3 py-1.5 text-xs font-semibold text-primary hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
              >
                <span>Lihat Keranjang</span>
              </button>
              <button
                type="button"
                onClick={triggerCartCheckout}
                className="vt-btn-tactile inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-accent-cta px-3.5 py-1.5 text-xs font-semibold text-accent-foreground hover:bg-accent-cta-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
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
            className="vt-btn-tactile inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-secondary hover:bg-subtle hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
          >
            <X className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
      ) : null}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={closeCart}
        items={cartItems}
        totalItems={totalCartItems}
        totalPrice={totalCartPrice}
        onUpdateQuantity={updateCartQuantity}
        onRemoveItem={removeFromCart}
        onClearCart={clearCart}
        onCheckout={triggerCartCheckout}
      />
      {isOpen ? (
        <CheckoutModal
          itemData={checkoutData}
          isOpen={isOpen}
          onClose={closeCheckout}
          onOrderCreated={handleOrderCreated}
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
