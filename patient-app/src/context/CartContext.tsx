/**
 * Local pharmacy-item staging only. The authoritative order begins at the
 * governed pharmacy draft endpoint; no client price, payment choice, or cart
 * persistence is used before a pharmacy offer is selected.
 */
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

export interface CartItem { id: string; name: string; qty: number; rx: boolean; image?: string; icon?: string; iconColor?: string; iconBg?: string; activeIngredient?: string; }
interface CartContextType { items: CartItem[]; addItem: (item: Omit<CartItem, 'qty'> & { qty?: number }) => Promise<void>; removeItem: (id: string) => Promise<void>; updateQty: (id: string, delta: number) => Promise<void>; clearCart: () => Promise<void>; itemCount: number; hasRxItems: boolean; }
const CartContext = createContext<CartContextType | null>(null);
export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const addItem = useCallback(async (item: Omit<CartItem, 'qty'> & { qty?: number }) => { setItems((previous) => { const existing = previous.find((line) => line.id === item.id); return existing ? previous.map((line) => line.id === item.id ? { ...line, qty: line.qty + (item.qty || 1) } : line) : [...previous, { ...item, qty: item.qty || 1 }]; }); }, []);
  const removeItem = useCallback(async (id: string) => { setItems((previous) => previous.filter((line) => line.id !== id)); }, []);
  const updateQty = useCallback(async (id: string, delta: number) => { setItems((previous) => previous.map((line) => line.id === id ? { ...line, qty: line.qty + delta } : line).filter((line) => line.qty > 0)); }, []);
  const clearCart = useCallback(async () => { setItems([]); }, []);
  const itemCount = useMemo(() => items.reduce((count, item) => count + item.qty, 0), [items]); const hasRxItems = useMemo(() => items.some((item) => item.rx), [items]);
  return <CartContext.Provider value={{ items, addItem, removeItem, updateQty, clearCart, itemCount, hasRxItems }}>{children}</CartContext.Provider>;
}
export function useCart(): CartContextType { const context = useContext(CartContext); if (!context) throw new Error('useCart must be used inside CartProvider'); return context; }
