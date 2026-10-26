import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

import { CartProvider, useCart } from '../../context/CartContext';
import { MedAddControl } from '../../components/pharmacy/PharmacyKit';
import { message } from '../../components/screen/ScreenKit';
import { flyToCart, registerCartTarget, subscribeFlights } from '../../utils/flyToCart';
import { setReduceMotionForTest } from '../../utils/motion';
import { showUndoToast } from '../../utils/undoToast';

/** The add control of a product card: + until the product is in the cart, then [- qty +] from the cart's own quantity. */

jest.mock('expo-router', () => ({ router: { push: jest.fn() }, useLocalSearchParams: () => ({}) }));
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined }));
jest.mock('../../context/AppContext', () => ({
  useApp: () => ({ isDark: false, lang: 'en', isRTL: false, toggleTheme: jest.fn(), setLang: jest.fn() }),
  LANGUAGES: [],
}));
jest.mock('../../store/middleware/listenerMiddleware', () => ({ startAppListening: () => () => undefined }));
jest.mock('../../utils/undoToast', () => ({ showUndoToast: jest.fn(), subscribeUndoToast: jest.fn() }));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, bottom: 0, left: 0, right: 0 } };
const store = configureStore({ reducer: { auth: (s: object = {}) => s, notifications: (s: object = {}) => s } });
const k = (key: string, vars?: Record<string, string | number>) => message('en', key, vars);
const med = { id: 'm1', name_en: 'Panadol', name_ar: 'بنادول', price: 10 } as never;

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
const press = (node: Parameters<typeof fireEvent.press>[0]) => fireEvent.press(node, { nativeEvent: { pageX: 120, pageY: 300 } });

describe('the card add control', () => {
  beforeEach(() => {
    setReduceMotionForTest(false);
    (showUndoToast as jest.Mock).mockClear();
  });

  it('is the + button until the product is in the cart, then a stepper with the cart quantity; + and - change it', async () => {
    const view = await render(wrap(<MedAddControl med={med} />));
    expect(view.queryByTestId('med-stepper-m1')).toBeNull();
    press(await view.findByTestId('med-add-m1'));
    expect(await view.findByTestId('med-stepper-m1')).toBeTruthy();
    expect(view.getByTestId('med-stepper-m1-qty').props.children).toBe('1');
    press(view.getByTestId('med-stepper-m1-plus'));
    expect(view.getByTestId('med-stepper-m1-qty').props.children).toBe('2');
    press(view.getByTestId('med-stepper-m1-minus'));
    expect(view.getByTestId('med-stepper-m1-qty').props.children).toBe('1');
    expect(view.getByTestId('med-stepper-m1-plus').props.accessibilityLabel).toBe(k('pharmacy.stepper.increase', { name: 'Panadol' }));
    await act(async () => { await cart.removeItem('m1'); });
  });

  it('- at quantity 1 removes the line and offers undo, which puts it back', async () => {
    const view = await render(wrap(<MedAddControl med={med} />));
    press(await view.findByTestId('med-add-m1'));
    press(await view.findByTestId('med-stepper-m1-minus'));
    expect(view.queryByTestId('med-stepper-m1')).toBeNull();
    expect(showUndoToast).toHaveBeenCalledWith(k('pharmacy.removedFromCart', { name: 'Panadol' }), k('common.undo'), expect.any(Function));
    await act(async () => { (showUndoToast as jest.Mock).mock.calls[0][2](); });
    expect(await view.findByTestId('med-stepper-m1')).toBeTruthy();
    await act(async () => { await cart.removeItem('m1'); });
  });

  it('a disabled (unpriced or unavailable) product has no stepper', async () => {
    const view = await render(wrap(<MedAddControl med={med} disabled />));
    expect(view.getByTestId('med-add-m1').props.accessibilityState.disabled).toBe(true);
  });
});

describe('the flight to the cart', () => {
  const target = { measure: (done: (x: number, y: number, w: number, h: number) => void) => done(300, 20, 44, 44) };

  it('starts from where the finger was when the screen has a cart button, and not with reduced motion', async () => {
    const seen: Array<{ from: { x: number; y: number } }> = [];
    const off = subscribeFlights((flight) => seen.push(flight));
    const forget = registerCartTarget(target);
    setReduceMotionForTest(false);
    expect(flyToCart({ x: 10, y: 20 }, 'https://x.test/p.png')).toBe(true);
    expect(seen).toHaveLength(1);
    expect(seen[0].from).toEqual({ x: 10, y: 20 });
    setReduceMotionForTest(true);
    expect(flyToCart({ x: 10, y: 20 })).toBe(false);
    expect(seen).toHaveLength(1);
    forget();
    setReduceMotionForTest(false);
    expect(flyToCart({ x: 10, y: 20 })).toBe(false); // no cart button on this screen
    off();
  });
});
