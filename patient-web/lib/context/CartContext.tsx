"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  rx: boolean;
  image?: string | null;
  activeIngredient?: string | null;
  form?: string | null;
  strength?: string | null;
  slug?: string | null;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "qty"> & { qty?: number }) => void;
  removeItem: (id: string) => void;
  updateQty: (id: string, delta: number) => void;
  clearCart: () => void;
  itemCount: number;
  subtotal: number;
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
  subtotal: 0,
  hasRxItems: false,
  ready: true,
};

const CartContext = createContext<CartContextType>(defaultCartContext);

const STORAGE_KEY = "nabd_patient_cart_v1";

/** What this browser stored, kept only when it is a usable line: a corrupt or hand-edited entry must not break the cart screen. */
export function sanitizeCartItems(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry): CartItem[] => {
    if (!entry || typeof entry !== "object") return [];
    const line = entry as Record<string, unknown>;
    const text = (v: unknown) => (typeof v === "string" && v.trim() ? v : null);
    const id = text(line.id);
    const name = text(line.name);
    const price = typeof line.price === "number" && Number.isFinite(line.price) && line.price >= 0 ? line.price : null;
    const qty = typeof line.qty === "number" && Number.isInteger(line.qty) && line.qty >= 1 ? Math.min(line.qty, 99) : null;
    if (!id || !name || price === null || qty === null) return [];
    return [{
      id, name, price, qty, rx: line.rx === true,
      image: text(line.image), activeIngredient: text(line.activeIngredient), form: text(line.form), strength: text(line.strength), slug: text(line.slug),
    }];
  });
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setItems(sanitizeCartItems(JSON.parse(raw)));
      }
    } catch {
      // ignore localStorage errors
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore
    }
  }, [items, hydrated]);

  const addItem = useCallback((item: Omit<CartItem, "qty"> & { qty?: number }) => {
    const qty = item.qty && item.qty > 0 ? item.qty : 1;
    setItems((prev) => {
      const idx = prev.findIndex((line) => line.id === item.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], qty: copy[idx].qty + qty };
        return copy;
      }
      return [...prev, { ...item, qty }];
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((line) => line.id !== id));
  }, []);

  const updateQty = useCallback((id: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((line) => (line.id === id ? { ...line, qty: line.qty + delta } : line))
        .filter((line) => line.qty > 0)
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const itemCount = useMemo(() => items.reduce((sum, item) => sum + item.qty, 0), [items]);
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.price * item.qty, 0), [items]);
  const hasRxItems = useMemo(() => items.some((item) => item.rx), [items]);

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQty, clearCart, itemCount, subtotal, hasRxItems, ready: hydrated }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextType {
  const context = useContext(CartContext);
  return context || defaultCartContext;
}
