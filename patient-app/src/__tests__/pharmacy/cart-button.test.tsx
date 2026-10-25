import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

import { CartProvider, useCart } from '../../context/CartContext';
import { CartButton } from '../../components/pharmacy/PharmacyKit';
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
});
