"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import CheckoutModal, { PENDING_CHECKOUT_STORAGE_KEY } from "@/components/vicitech/CheckoutModal";

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
      <CheckoutModal
        itemData={checkoutData}
        isOpen={isOpen}
        onClose={closeCheckout}
      />
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
