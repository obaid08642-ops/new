import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

import { CartProvider, useCart } from '../../context/CartContext';
import { CartButton } from '../../components/pharmacy/PharmacyKit';
import { ServiceCartButton } from '../../components/cart/ServiceCartButton';
import { HomeTopRow } from '../../components/home/HomeTopRow';
import { message } from '../../components/screen/ScreenKit';

/** The cart button sits in the home, search and offers headers and reads the same cart context the add buttons write to. */

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
  useLocalSearchParams: () => ({}),
}));
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined }));
jest.mock('../../context/AppContext', () => ({
  useApp: () => ({ isDark: false, lang: 'en', isRTL: false, toggleTheme: jest.fn(), setLang: jest.fn() }),
  LANGUAGES: [],
}));
// the diagnostics cart (labs and scans) is its own cart: a test sets its lines here
let mockDiagItems: Array<{ id: string; kind: 'lab' | 'radiology'; qty: number }> = [];
jest.mock('../../context/DiagnosticsCartContext', () => ({ useDiagnosticsCart: () => ({ items: mockDiagItems }) }));
jest.mock('../../store/middleware/listenerMiddleware', () => ({ startAppListening: () => () => undefined }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockRouter = (require('expo-router') as { router: { push: jest.Mock } }).router;
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, bottom: 0, left: 0, right: 0 } };
const store = configureStore({ reducer: { auth: (s: object = {}) => s, notifications: (s: object = {}) => s } });
const k = (key: string, vars?: Record<string, string | number>) => message('en', key, vars);

let cart: ReturnType<typeof useCart>;
function Probe() {
  cart = useCart();
  return null;
}
const wrap = (ui: React.ReactElement) => (
  <SafeAreaProvider initialMetrics={metrics}>
    <Provider store={store}>
      <CartProvider>
        <Probe />
        {ui}
      </CartProvider>
    </Provider>
  </SafeAreaProvider>
);

describe('cart button', () => {
  it('is in the home top row and opens the cart', async () => {
    const view = await render(wrap(<HomeTopRow name="Test" />));
    const button = await view.findByTestId('home-cart-button');
    fireEvent.press(button);
    expect(mockRouter.push).toHaveBeenCalledWith('/pharmacy/cart');
  });

  it('shows the count and its accessible name right after an add, and drops it after the remove', async () => {
    const view = await render(wrap(<CartButton />));
    const button = await view.findByTestId('cart-button');
    expect(button.props.accessibilityLabel).toBe(k('pharmacy.cart'));
    await act(async () => {
      await cart.addItem({ id: 'm1', name: 'Test medicine', rx: false, qty: 2 });
    });
    expect(view.getByTestId('cart-button').props.accessibilityLabel).toBe(k('pharmacy.cartCount', { count: 2 }));
    expect(k('pharmacy.cartCount', { count: 2 })).toContain('2');
    await act(async () => {
      await cart.removeItem('m1');
    });
    expect(view.getByTestId('cart-button').props.accessibilityLabel).toBe(k('pharmacy.cart'));
  });

  it('one cart per service: a pharmacy screen counts only the pharmacy cart', async () => {
    mockDiagItems = [{ id: 't1', kind: 'lab', qty: 3 }];
    const view = await render(wrap(<ServiceCartButton service="pharmacy" testID="svc-cart" />));
    await act(async () => {
      await cart.addItem({ id: 'm1', name: 'Test medicine', rx: false, qty: 2 });
    });
    expect(view.getByTestId('svc-cart').props.accessibilityLabel).toBe(k('pharmacy.cartCount', { count: 2 }));
    fireEvent.press(view.getByTestId('svc-cart'));
    expect(mockRouter.push).toHaveBeenLastCalledWith('/pharmacy/cart');
    // leave the device cart as it was found (not inside act: an act scope left open by the press made the next test render nothing)
    await cart.removeItem('m1');
    mockDiagItems = [];
  });

  it('a radiology screen counts only the scans and opens the diagnostics cart', async () => {
    mockDiagItems = [{ id: 't1', kind: 'lab', qty: 3 }, { id: 'r1', kind: 'radiology', qty: 1 }];
    const view = await render(wrap(<ServiceCartButton service="radiology" testID="svc-cart" />));
    expect((await view.findByTestId('svc-cart')).props.accessibilityLabel).toBe(k('pharmacy.cartCount', { count: 1 }));
    fireEvent.press(view.getByTestId('svc-cart'));
    expect(mockRouter.push).toHaveBeenLastCalledWith('/diagnostics/cart');
    mockDiagItems = [];
  });

  it('on Home with two non-empty carts it offers the chooser with each count, and each entry opens its cart', async () => {
    mockDiagItems = [{ id: 't1', kind: 'lab', qty: 3 }];
    const view = await render(wrap(<ServiceCartButton testID="svc-cart" />));
    await act(async () => {
      await cart.addItem({ id: 'm1', name: 'Test medicine', rx: false, qty: 2 });
    });
    mockRouter.push.mockClear();
    fireEvent.press(await view.findByTestId('svc-cart'));
    expect(mockRouter.push).not.toHaveBeenCalled();
    expect(await view.findByTestId('cart-chooser')).toBeTruthy();
    expect(view.getByTestId('cart-chooser-pharmacy').props.accessibilityLabel).toContain(k('cart.name.pharmacy'));
    expect(view.getByTestId('cart-chooser-lab').props.accessibilityLabel).toContain(k('cart.name.lab'));
    fireEvent.press(view.getByTestId('cart-chooser-lab'));
    expect(mockRouter.push).toHaveBeenLastCalledWith('/diagnostics/cart');
    // leave the device cart as it was found (not inside act: an act scope left open by the press made the next test render nothing)
    await cart.removeItem('m1');
    mockDiagItems = [];
  });

  it('on Home with one non-empty cart it opens that cart at once', async () => {
    mockDiagItems = [{ id: 'r1', kind: 'radiology', qty: 1 }];
    const view = await render(wrap(<ServiceCartButton testID="svc-cart" />));
    fireEvent.press(await view.findByTestId('svc-cart'));
    expect(mockRouter.push).toHaveBeenLastCalledWith('/diagnostics/cart');
    mockDiagItems = [];
  });
});
