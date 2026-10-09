/**
 * The pharmacy cart is LOCAL-FIRST (owner decision 2026-10-06; the rules are in src/utils/pharmacyCartStore): a line is a
 * medicine and a quantity, never a price, a subtotal or a stock figure, and adding, removing or changing a line never calls
 * the backend. The authoritative order begins at the governed pharmacy draft endpoint (checkout); the pharmacies' offers
 * set the price. The cart is kept on this device per owner (a visitor, or a signed-in patient): signing in merges the
 * visitor's cart into the patient's, signing out clears it.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSelector } from 'react-redux';
import { isAnyOf } from '@reduxjs/toolkit';

import { resetStoreAction } from '../store/actions/recovery';
import { startAppListening } from '../store/middleware/listenerMiddleware';
import { logout, offlineUnauthenticated } from '../store/slices/authSlice';
import { createPharmacyCartStore, EMPTY_CART_SNAPSHOT, sanitizePharmacyCartItem, type CartItem, type CartItemInput } from '../utils/pharmacyCartStore';

export { sanitizePharmacyCartItem };
export type { CartItem };

interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItemInput) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  updateQty: (id: string, delta: number) => Promise<void>;
  clearCart: () => Promise<void>;
  itemCount: number;
  hasRxItems: boolean;
  /** False until the cart saved on this device has been read: a screen shows its empty state only when this is true. */
  ready: boolean;
}

const CartContext = createContext<CartContextType | null>(null);

type AuthSlice = { isAuthenticated?: boolean; isGuest?: boolean; user?: { id?: string } | null };

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [store] = useState(() => createPharmacyCartStore(AsyncStorage));
  const { items, ready } = useSyncExternalStore(store.subscribe, store.getSnapshot, () => EMPTY_CART_SNAPSHOT);
  // a guest account has no cart of its own: it shares the device cart, which is merged when a patient signs in
  const userId = useSelector((state: { auth?: AuthSlice }) => {
    const auth = state.auth;
    return auth?.isAuthenticated && !auth.isGuest && typeof auth.user?.id === 'string' && auth.user.id ? auth.user.id : null;
  });

  useEffect(() => {
    void store.load();
  }, [store]);

  // the sign-out of the auth slice (and a full store reset) clear the cart in memory and on the device
  useEffect(() => {
    const stop = startAppListening({ matcher: isAnyOf(logout, offlineUnauthenticated, resetStoreAction), effect: () => { void store.signOut(); } });
    return () => { stop(); };
  }, [store]);

  useEffect(() => {
    if (userId) void store.adoptUser(userId);
  }, [store, userId]);

  const addItem = useCallback((item: CartItemInput) => store.add(item), [store]);
  const removeItem = useCallback((id: string) => store.remove(id), [store]);
  const updateQty = useCallback((id: string, delta: number) => store.update(id, delta), [store]);
  const clearCart = useCallback(() => store.clear(), [store]);

  const itemCount = useMemo(() => items.reduce((count, item) => count + item.qty, 0), [items]);
  const hasRxItems = useMemo(() => items.some((item) => item.rx), [items]);
  const value = useMemo(
    () => ({ items, addItem, removeItem, updateQty, clearCart, itemCount, hasRxItems, ready }),
    [items, addItem, removeItem, updateQty, clearCart, itemCount, hasRxItems, ready],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextType {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used inside CartProvider');
  return context;
}
