import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { apiFetch } from '../utils/api';
import { Alert } from 'react-native';

export interface DiagnosticsCartItem {
  line_id?: string;
  id: string;
  name: string;
  price: number;
  qty: number;
  kind: 'lab' | 'radiology';
  provider?: string;
  lockedProviderId?: string;
  isHomeVisit?: boolean;
  image?: string;
  icon?: string;
  iconColor?: string;
  iconBg?: string;
  turnaroundTime?: string;
}

interface DiagnosticsCartContextType {
  items: DiagnosticsCartItem[];
  lockedProviderId: string | null;
  addItem: (item: Omit<DiagnosticsCartItem, 'qty'> & { qty?: number }) => Promise<{ success: boolean; message?: string }>;
  removeItem: (id: string, kind: 'lab' | 'radiology') => Promise<void>;
  updateQty: (id: string, kind: 'lab' | 'radiology', delta: number) => Promise<void>;
  clearCart: (kind?: 'lab' | 'radiology') => Promise<void>;
  itemCount: number;
  subtotal: number;
  homeVisitFee: number;
  total: number;
  prescriptionUrl: string | null;
  setPrescriptionUrl: (url: string | null) => void;
  paymentType: 'cash' | 'insurance';
  setPaymentType: (type: 'cash' | 'insurance') => void;
  hasHomeVisit: boolean;
}

const DiagnosticsCartContext = createContext<DiagnosticsCartContextType | null>(null);

export function DiagnosticsCartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<DiagnosticsCartItem[]>([]);
  const [lockedProviderId, setLockedProviderId] = useState<string | null>(null);
  const [prescriptionUrl, setPrescriptionUrl] = useState<string | null>(null);
  const [paymentType, setPaymentType] = useState<'cash' | 'insurance'>('cash');
  const [homeVisitFeeState, setHomeVisitFee] = useState<number>(0);

  const addItem = useCallback(async (item: Omit<DiagnosticsCartItem, 'qty'> & { qty?: number }) => {
    
    // Check if we are trying to add an item from a SPECIFIC LAB (Lab B) while the cart is locked to (Lab A)
    if (lockedProviderId && item.lockedProviderId && item.lockedProviderId !== lockedProviderId) {
      Alert.alert(
        'السلة مقيدة بمختبر آخر',
        'سلتك الحالية تحتوي على فحوصات من مختبر مختلف. هل تريد تفريغ السلة للبدء مع هذا المختبر؟',
        [
          { text: 'إلغاء', style: 'cancel' },
          { 
            text: 'تفريغ السلة والمتابعة', 
            style: 'destructive',
            onPress: () => {
              setItems([{ ...item, qty: item.qty || 1 }]);
              setLockedProviderId(item.lockedProviderId || null);
            }
          }
        ]
      );
      return { success: false, message: 'Cart restricted' };
    }

    // If cart was purely generic, and now we add a Lab Specific test, lock the cart to that lab
    if (!lockedProviderId && item.lockedProviderId) {
      setLockedProviderId(item.lockedProviderId);
    }

    setItems(prev => {
      const existing = prev.find(i => i.id === item.id && i.kind === item.kind);
      if (existing) {
        return prev.map(i => (i.id === item.id && i.kind === item.kind) ? { ...i, qty: i.qty + (item.qty || 1) } : i);
      }
      return [...prev, { ...item, qty: item.qty || 1 }];
    });

    return { success: true };
  }, [items, lockedProviderId]);

  const removeItem = useCallback(async (id: string, kind: 'lab' | 'radiology') => {
    setItems(prev => {
      const newItems = prev.filter(i => !(i.id === id && i.kind === kind));
      if (newItems.length === 0) setLockedProviderId(null);
      return newItems;
    });
  }, []);

  const updateQty = useCallback(async (id: string, kind: 'lab' | 'radiology', delta: number) => {
    setItems(prev => {
      const newItems = prev.map(i => (i.id === id && i.kind === kind) ? { ...i, qty: Math.max(0, i.qty + delta) } : i).filter(i => i.qty > 0);
      if (newItems.length === 0) setLockedProviderId(null);
      return newItems;
    });
  }, []);

  const clearCart = useCallback(async (kind?: 'lab' | 'radiology') => {
    if (kind) {
      setItems(prev => prev.filter(i => i.kind !== kind));
      if (items.filter(i => i.kind !== kind).length === 0) setLockedProviderId(null);
    } else {
      setItems([]);
      setLockedProviderId(null);
      setPrescriptionUrl(null);
    }
  }, [items]);

  const itemCount = useMemo(() => items.reduce((acc, i) => acc + i.qty, 0), [items]);
  const subtotal = useMemo(() => items.reduce((acc, i) => acc + i.price * i.qty, 0), [items]);
  const hasHomeVisit = useMemo(() => items.some(i => i.isHomeVisit), [items]);
  const total = subtotal + homeVisitFeeState;

  return (
    <DiagnosticsCartContext.Provider value={{
      items, lockedProviderId, addItem, removeItem, updateQty, clearCart,
      itemCount, subtotal, homeVisitFee: homeVisitFeeState, total,
      prescriptionUrl, setPrescriptionUrl,
      paymentType, setPaymentType, hasHomeVisit
    }}>
      {children}
    </DiagnosticsCartContext.Provider>
  );
}

export function useDiagnosticsCart(): DiagnosticsCartContextType {
  const ctx = useContext(DiagnosticsCartContext);
  if (!ctx) throw new Error('useDiagnosticsCart must be used inside DiagnosticsCartProvider');
  return ctx;
}
