"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { SIGNED_OUT_EVENT, useSessionIdentity } from "@/lib/auth/session-identity";
import { createCartStore, SERVER_CART_SNAPSHOT, type CartItem, type CartItemInput } from "@/lib/cart/cart-store";

export { mergeCarts, sanitizeCartItems, type CartItem, type CartItemInput } from "@/lib/cart/cart-store";

/**
 * The pharmacy cart is LOCAL-FIRST (owner decision 2026-10-06; the rules are in lib/cart/cart-store): a line is a product
 * and a quantity, never a price, a subtotal or a stock figure, and adding, removing or changing a line never calls the
 * backend. The provider shows the cart this browser kept for the last known owner at once, asks the session once
 * (lib/auth/session-identity) and, when a patient is signed in, merges the guest cart into theirs. Sign-out clears it.
 */
interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItemInput) => void;
  removeItem: (id: string) => void;
  updateQty: (id: string, delta: number) => void;
  clearCart: () => void;
  itemCount: number;
  hasRxItems: boolean;
  /** False until the items saved in this browser have been read: a screen shows its empty state only when this is true. */
  ready: boolean;
}

const defaultCartContext: CartContextType = {
  items: [],
  addItem: () => {},
  removeItem: () => {},
  updateQty: () => {},
  clearCart: () => {},
  itemCount: 0,
  hasRxItems: false,
  ready: true,
};

const CartContext = createContext<CartContextType>(defaultCartContext);

const browserStorage = () => (typeof window === "undefined" ? null : window.localStorage);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [store] = useState(() => createCartStore(browserStorage));
  const { items, ready } = useSyncExternalStore(store.subscribe, store.getSnapshot, () => SERVER_CART_SNAPSHOT);
  const identity = useSessionIdentity();

  useEffect(() => {
    store.load();
    const onStorage = (event: StorageEvent) => store.syncFromStorage(event.key);
    const onSignedOut = () => store.signOut();
    window.addEventListener("storage", onStorage);
    window.addEventListener(SIGNED_OUT_EVENT, onSignedOut);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(SIGNED_OUT_EVENT, onSignedOut);
    };
  }, [store]);

  // A signed-in patient: their cart, with the guest cart merged in. "anonymous" and "unknown" change nothing: the session
  // probe does not refresh an expired access token, so only an explicit sign-out (the event above) clears a cart.
  const userId = identity.status === "user" ? identity.id : null;
  useEffect(() => {
    if (userId) store.adoptUser(userId);
  }, [store, userId]);

  const addItem = useCallback((item: CartItemInput) => store.add(item), [store]);
  const removeItem = useCallback((id: string) => store.remove(id), [store]);
  const updateQty = useCallback((id: string, delta: number) => store.update(id, delta), [store]);
  const clearCart = useCallback(() => store.clear(), [store]);

  const itemCount = useMemo(() => items.reduce((sum, item) => sum + item.qty, 0), [items]);
  const hasRxItems = useMemo(() => items.some((item) => item.rx), [items]);

  const value = useMemo(
    () => ({ items, addItem, removeItem, updateQty, clearCart, itemCount, hasRxItems, ready }),
    [items, addItem, removeItem, updateQty, clearCart, itemCount, hasRxItems, ready],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextType {
  const context = useContext(CartContext);
  return context || defaultCartContext;
}
