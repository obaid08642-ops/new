import React from 'react';
import { StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

import { CartProvider, useCart } from '../../context/CartContext';
import { HomeTopRow } from '../../components/home/HomeTopRow';
import { HEADER_HIT, HEADER_ICON, headerGap } from '../../components/nav/HeaderRound';

/** The Home top bar: a fixed order of identical 44 / 24 round buttons with one gap, whichever optional ones are drawn. */

jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) } }));
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined }));
let mockRtl = false;
jest.mock('../../context/AppContext', () => ({
  useApp: () => ({ isDark: false, lang: mockRtl ? 'ar' : 'en', isRTL: mockRtl, toggleTheme: jest.fn(), setLang: jest.fn() }),
  LANGUAGES: [],
}));
jest.mock('../../context/DiagnosticsCartContext', () => ({ useDiagnosticsCart: () => ({ items: [] }) }));
jest.mock('../../store/middleware/listenerMiddleware', () => ({ startAppListening: () => () => undefined }));
let mockFresh = 0;
jest.mock('../../hooks/useNewResultsCount', () => ({ useNewResultsCount: () => ({ count: mockFresh, refresh: jest.fn() }) }));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, bottom: 0, left: 0, right: 0 } };
const makeStore = (unreadCount: number) => configureStore({ reducer: { auth: (s: object = {}) => s, notifications: () => ({ unreadCount }) } });

let cart: ReturnType<typeof useCart>;
function Probe() {
  cart = useCart();
  return null;
}

const HIDDEN = { includeHiddenElements: true };
const ORDER = ['home-language-button', 'home-theme-button', 'home-bell-button', 'home-wishlist-button', 'home-cart-slot|home-cart-button', 'home-menu-button'];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Node = any;
const flat = (node: Node) => StyleSheet.flatten(typeof node.props.style === 'function' ? node.props.style({ pressed: false }) : node.props.style) ?? {};

async function draw(opts: { rtl: boolean; cartItems: boolean; unread: number; fresh: number }) {
  mockRtl = opts.rtl;
  mockFresh = opts.fresh;
  const view = await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <Provider store={makeStore(opts.unread)}>
        <CartProvider>
          <Probe />
          <HomeTopRow name="Test User" />
        </CartProvider>
      </Provider>
    </SafeAreaProvider>,
  );
  if (opts.cartItems) {
    const { act } = jest.requireActual('@testing-library/react-native');
    await act(async () => {
      await cart.addItem({ id: 'm1', name: 'Med', rx: false, qty: 2 });
    });
  }
  return view;
}

const cases = [
  { name: 'LTR, logged out (no badge, no cart)', rtl: false, cartItems: false, unread: 0, fresh: 0 },
  { name: 'RTL, logged out (no badge, no cart)', rtl: true, cartItems: false, unread: 0, fresh: 0 },
  { name: 'LTR, logged in (cart, bell dot, menu dot)', rtl: false, cartItems: true, unread: 3, fresh: 2 },
  { name: 'RTL, logged in (cart, bell dot, menu dot)', rtl: true, cartItems: true, unread: 3, fresh: 2 },
];

describe('Home top bar', () => {
  it.each(cases)('$name: fixed order, equal size, one gap, mirrored by the layout direction', async (opts) => {
    const view = await draw(opts);
    const row = view.getByTestId('home-top-row');
    const rowStyle = flat(row);
    // the layout direction mirrors the order: a plain row, never row-reverse, no hard-coded left/right anywhere
    expect(rowStyle.flexDirection).toBe('row');
    expect(rowStyle.gap).toBe(headerGap(750)); // one gap on the row (the jest window is wider than 390)
    expect(JSON.stringify(rowStyle)).not.toMatch(/"(left|right|marginLeft|marginRight|paddingLeft|paddingRight)"/);

    // the buttons, in order (the cart's place is held by a slot while every cart is empty)
    const ids = ORDER.map((entry) => entry.split('|').find((id) => view.queryByTestId(id, HIDDEN)) ?? entry);
    ids.forEach((id) => expect(view.queryByTestId(id, HIDDEN)).not.toBeNull());
    expect(ids[4]).toBe(opts.cartItems ? 'home-cart-button' : 'home-cart-slot');
    // DOM order == the fixed order
    const order = JSON.stringify(view.toJSON());
    const positions = ids.map((id) => order.indexOf(`"testID":"${id}"`));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);

    // every one: 44 hit, round, same ring
    for (const id of ids) {
      const node = view.getByTestId(id, HIDDEN);
      const s = flat(node);
      expect(s.width ?? s.minWidth).toBe(HEADER_HIT);
      expect(s.height).toBe(HEADER_HIT);
    }
    expect(HEADER_HIT).toBe(44);
    expect(HEADER_ICON).toBe(24);

    // badges: the same corner (top -3, end -3) wherever they are drawn
    for (const id of ['home-bell-dot', 'home-menu-button-dot']) {
      const dot = view.queryByTestId(id, HIDDEN);
      if (dot) {
        const s = flat(dot);
        expect([s.top, s.end]).toEqual([-3, -3]);
      }
    }
    expect(!!view.queryByTestId('home-bell-dot', HIDDEN)).toBe(opts.unread > 0);
    expect(!!view.queryByTestId('home-menu-button-dot', HIDDEN)).toBe(opts.fresh > 0);
  });

  it('uses one gap per window width', () => {
    expect(headerGap(390)).toBe(8);
    expect(headerGap(360)).toBe(4);
  });
});
