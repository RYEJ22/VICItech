"use client";

import dynamic from "next/dynamic";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { PENDING_CHECKOUT_STORAGE_KEY } from "@/lib/checkout/constants";

const CheckoutModal = dynamic(() => import("@/components/vicitech/CheckoutModal"), {
  ssr: false,
});

export { PENDING_CHECKOUT_STORAGE_KEY };

const CheckoutContext = createContext(null);

export function CheckoutProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [checkoutData, setCheckoutData] = useState(null);

  const triggerCheckout = useCallback((itemData) => {
    setCheckoutData(itemData);
    setIsOpen(true);
  }, []);

  const closeCheckout = useCallback(() => {
    setIsOpen(false);
    setCheckoutData(null);
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(PENDING_CHECKOUT_STORAGE_KEY);
    }
  }, []);

  const value = useMemo(
    () => ({ isOpen, checkoutData, triggerCheckout, closeCheckout }),
    [isOpen, checkoutData, triggerCheckout, closeCheckout]
  );

  return (
    <CheckoutContext.Provider value={value}>
      {children}
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
