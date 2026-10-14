import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch } from '../utils/api';
import { Alert } from 'react-native';
import { useApp } from './AppContext';
import { message } from '../components/screen/ScreenKit';

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

type AuthSlice = { isAuthenticated?: boolean; isGuest?: boolean; user?: { id?: string } | null };

/** One key per signed-in patient: a different patient on the same device never sees this cart. */
export const diagnosticsCartKey = (userId: string) => `@nabd_diag_cart:v1:${userId}`;

interface StoredDiagnosticsCart { items: DiagnosticsCartItem[]; lockedProviderId: string | null }

function isStoredItem(i: unknown): i is DiagnosticsCartItem {
  if (!i || typeof i !== 'object') return false;
  const x = i as Partial<DiagnosticsCartItem>;
  return typeof x.id === 'string' && (x.kind === 'lab' || x.kind === 'radiology')
    && typeof x.price === 'number' && typeof x.qty === 'number' && x.qty > 0;
}

export function parseStoredDiagnosticsCart(raw: string | null): StoredDiagnosticsCart | null {
  if (!raw) return null;
  try {
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== 'object') return null;
    const { items, lockedProviderId } = data as { items?: unknown; lockedProviderId?: unknown };
    if (!Array.isArray(items)) return null;
    return { items: items.filter(isStoredItem), lockedProviderId: typeof lockedProviderId === 'string' ? lockedProviderId : null };
  } catch {
    return null;
  }
}

const DiagnosticsCartContext = createContext<DiagnosticsCartContextType | null>(null);

export function DiagnosticsCartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<DiagnosticsCartItem[]>([]);
  const [lockedProviderId, setLockedProviderId] = useState<string | null>(null);
  const [prescriptionUrl, setPrescriptionUrl] = useState<string | null>(null);
  const [paymentType, setPaymentType] = useState<'cash' | 'insurance'>('cash');
  const [homeVisitFeeState, setHomeVisitFee] = useState<number>(0);
  const { lang } = useApp();
  const userId = useSelector((state: { auth?: AuthSlice }) => {
    const auth = state.auth;
    return auth?.isAuthenticated && !auth.isGuest && typeof auth.user?.id === 'string' && auth.user.id ? auth.user.id : null;
  });
  // the patient whose stored cart is already in memory; saving starts only after that, so an empty start never wipes it
  const hydratedFor = useRef<string | null>(null);

  useEffect(() => {
    let live = true;
    if (!userId) {
      // signed out (or a guest): the cart of the last patient must not stay in memory
      if (hydratedFor.current) {
        hydratedFor.current = null;
        setItems([]);
        setLockedProviderId(null);
        setPrescriptionUrl(null);
      }
      return undefined;
    }
    AsyncStorage.getItem(diagnosticsCartKey(userId)).then((raw) => {
      if (!live) return;
      const stored = parseStoredDiagnosticsCart(raw);
      if (stored && stored.items.length > 0) {
        setItems((current) => (current.length > 0 ? current : stored.items));
        setLockedProviderId((current) => current ?? stored.lockedProviderId);
      }
      hydratedFor.current = userId;
    }).catch(() => { hydratedFor.current = userId; });
    return () => { live = false; };
  }, [userId]);

  useEffect(() => {
    if (!userId || hydratedFor.current !== userId) return;
    const key = diagnosticsCartKey(userId);
    const write = items.length === 0
      ? AsyncStorage.removeItem(key)
      : AsyncStorage.setItem(key, JSON.stringify({ items, lockedProviderId }));
    write.catch(() => undefined);
  }, [items, lockedProviderId, userId]);

  const addItem = useCallback(async (item: Omit<DiagnosticsCartItem, 'qty'> & { qty?: number }) => {
    
    // Check if we are trying to add an item from a SPECIFIC LAB (Lab B) while the cart is locked to (Lab A)
    if (lockedProviderId && item.lockedProviderId && item.lockedProviderId !== lockedProviderId) {
      Alert.alert(
        message(lang, 'diag.cart.lockedTitle'),
        message(lang, 'diag.cart.lockedBody'),
        [
          { text: message(lang, 'diag.cart.lockedCancel'), style: 'cancel' },
          { 
            text: message(lang, 'diag.cart.lockedClear'), 
            style: 'destructive',
            onPress: () => {
              setItems([{ ...item, qty: item.qty || 1 }]);
              setLockedProviderId(item.lockedProviderId || null);
            }
          }
        ]
      );
      return { success: false, message: message(lang, 'diag.cart.lockedTitle') };
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
  }, [items, lockedProviderId, lang]);

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
