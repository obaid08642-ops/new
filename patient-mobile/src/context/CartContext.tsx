/**
 * CartContext.tsx
 * Global cart state shared across all pharmacy screens.
 * Syncs with UnifiedCart backend (/cart).
 */
import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { apiFetch } from '../utils/api';
 // To check if logged in

export interface CartItem {
  line_id?: string;    // assigned by backend
  id: string;          // medicine_id
  name: string;        // name_ar
  price: number;
  qty: number;
  rx: boolean;         // requires prescription
  image?: string;
  icon?: string;       // material symbol name
  iconColor?: string;
  iconBg?: string;
  activeIngredient?: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'qty'> & { qty?: number }) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  updateQty: (id: string, delta: number) => Promise<void>;
  clearCart: () => Promise<void>;
  itemCount: number;
  subtotal: number;
  hasRxItems: boolean;
  prescriptionUrl: string | null;
  setPrescriptionUrl: (url: string | null) => void;
  paymentType: 'cash' | 'card' | 'insurance' | 'wallet' | 'wallet_split';
  setPaymentType: (type: 'cash' | 'card' | 'insurance' | 'wallet' | 'wallet_split') => void;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [prescriptionUrl, setPrescriptionUrl] = useState<string | null>(null);
  const [paymentType, setPaymentType] = useState<'cash' | 'card' | 'insurance' | 'wallet' | 'wallet_split'>('card');

  // Load from backend on mount
  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch('/cart');
        const ph = data?.groups?.find((g: any) => g.kind === 'pharmacy');
        if (ph && ph.items) {
          setItems(ph.items.map((i: any) => ({
            line_id: i.line_id,
            id: i.service_id,
            name: i.name_ar,
            price: i.price,
            qty: i.qty,
            rx: i.meta?.rx || false,
            image: i.meta?.image,
            icon: i.meta?.icon || 'medication',
            iconColor: i.meta?.iconColor || '#23B5CE',
            iconBg: i.meta?.iconBg || '#DEF5F9',
            activeIngredient: i.meta?.activeIngredient,
          })));
        } else {
          setItems([]);
        }
      } catch (e) {
        // User might not be logged in, ignore
      }
    })();
  }, []);

  const addItem = useCallback(async (item: Omit<CartItem, 'qty'> & { qty?: number }) => {
    // Optimistic UI
    setItems(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + (item.qty || 1) } : i);
      }
      return [...prev, { ...item, qty: item.qty || 1 }];
    });

    try {
      const data = await apiFetch('/cart/lines', {
        method: 'POST',
        body: JSON.stringify({
          kind: 'pharmacy',
          service_id: item.id,
          name_ar: item.name,
          price: item.price,
          qty: item.qty || 1,
          meta: {
            rx: item.rx,
            image: item.image,
            icon: item.icon,
            iconColor: item.iconColor,
            iconBg: item.iconBg,
            activeIngredient: item.activeIngredient
          }
        })
      });
      // Sync back line_ids
      const ph = data?.groups?.find((g: any) => g.kind === 'pharmacy');
      if (ph && ph.items) {
        setItems(ph.items.map((i: any) => ({
          line_id: i.line_id,
          id: i.service_id,
          name: i.name_ar,
          price: i.price,
          qty: i.qty,
          rx: i.meta?.rx || false,
          image: i.meta?.image,
          icon: i.meta?.icon || 'medication',
          iconColor: i.meta?.iconColor || '#23B5CE',
          iconBg: i.meta?.iconBg || '#DEF5F9',
          activeIngredient: i.meta?.activeIngredient,
        })));
      }
    } catch (e) {
      // API call failed, ignore (guest fallback)
    }
  }, []);

  const removeItem = useCallback(async (id: string) => {
    const item = items.find(i => i.id === id);
    setItems(prev => prev.filter(i => i.id !== id));

    if (item?.line_id) {
      try {
        await apiFetch(`/cart/lines/${item.line_id}`, { method: 'DELETE' });
      } catch (e) {
        // Ignore
      }
    }
  }, [items]);

  const updateQty = useCallback(async (id: string, delta: number) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    const newQty = Math.max(0, item.qty + delta);

    setItems(prev => prev
      .map(i => i.id === id ? { ...i, qty: newQty } : i)
      .filter(i => i.qty > 0)
    );

    if (item.line_id) {
      try {
        if (newQty <= 0) {
          await apiFetch(`/cart/lines/${item.line_id}`, { method: 'DELETE' });
        } else {
          await apiFetch(`/cart/lines/${item.line_id}`, {
            method: 'PATCH',
            body: JSON.stringify({ qty: newQty })
          });
        }
      } catch (e) {
        // Ignore
      }
    }
  }, [items]);

  const clearCart = useCallback(async () => {
    setItems([]);
    setPrescriptionUrl(null);
    try {
      await apiFetch('/cart/clear', {
        method: 'POST',
        body: JSON.stringify({ kind: 'pharmacy' })
      });
    } catch (e) {
      // Ignore
    }
  }, []);

  const itemCount = useMemo(() => items.reduce((acc, i) => acc + i.qty, 0), [items]);
  const subtotal = useMemo(() => items.reduce((acc, i) => acc + i.price * i.qty, 0), [items]);
  const hasRxItems = useMemo(() => items.some(i => i.rx), [items]);

  return (
    <CartContext.Provider value={{
      items, addItem, removeItem, updateQty, clearCart,
      itemCount, subtotal, hasRxItems,
      prescriptionUrl, setPrescriptionUrl,
      paymentType, setPaymentType
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextType {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
