import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { act, renderHook } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { DiagnosticsCartProvider, diagnosticsCartKey, parseStoredDiagnosticsCart, useDiagnosticsCart } from './DiagnosticsCartContext';

jest.mock('./AppContext', () => ({ useApp: () => ({ lang: 'en' }) }));

const makeStore = (userId: string | null) => configureStore({
  reducer: { auth: (state: unknown = { isAuthenticated: !!userId, isGuest: false, user: userId ? { id: userId } : null }) => state },
});

const wrap = (userId: string | null) => { const store = makeStore(userId); return ({ children }: { children: React.ReactNode }) => (
  <Provider store={store}><DiagnosticsCartProvider>{children}</DiagnosticsCartProvider></Provider>
); };

const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 20)); });
const cbc = { id: 'cbc', name: 'CBC', price: 40, kind: 'lab' as const };

describe('the diagnostics cart survives closing the app', () => {
  beforeEach(async () => { await AsyncStorage.clear(); });

  it('saves a cart per patient and restores it on the next start', async () => {
    const first = await renderHook(() => useDiagnosticsCart(), { wrapper: wrap('u1') });
    await act(async () => { await first.result.current.addItem(cbc); });
    await settle();
    expect(await AsyncStorage.getItem(diagnosticsCartKey('u1'))).toContain('"cbc"');
    await first.unmount();

    const second = await renderHook(() => useDiagnosticsCart(), { wrapper: wrap('u1') });
    await settle();
    expect(second.result.current.itemCount).toBe(1);
    expect(second.result.current.subtotal).toBe(40);
  });

  it('another patient on the same device starts with an empty cart', async () => {
    await AsyncStorage.setItem(diagnosticsCartKey('u1'), JSON.stringify({ items: [{ ...cbc, qty: 1 }], lockedProviderId: null }));
    const other = await renderHook(() => useDiagnosticsCart(), { wrapper: wrap('u2') });
    await settle();
    expect(other.result.current.itemCount).toBe(0);
  });

  it('emptying the cart removes the stored copy', async () => {
    await AsyncStorage.setItem(diagnosticsCartKey('u1'), JSON.stringify({ items: [{ ...cbc, qty: 1 }], lockedProviderId: null }));
    const view = await renderHook(() => useDiagnosticsCart(), { wrapper: wrap('u1') });
    await settle();
    expect(view.result.current.itemCount).toBe(1);
    await act(async () => { await view.result.current.removeItem('cbc', 'lab'); });
    await settle();
    expect(await AsyncStorage.getItem(diagnosticsCartKey('u1'))).toBeNull();
  });

  it('ignores damaged stored data', () => {
    expect(parseStoredDiagnosticsCart('{not json')).toBeNull();
    expect(parseStoredDiagnosticsCart(JSON.stringify({ items: [{ id: 1 }, { id: 'a', kind: 'lab', price: 1, qty: 2 }] }))?.items).toHaveLength(1);
  });
});
