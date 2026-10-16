import React from 'react';
import { Text } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import authReducer from '../src/store/slices/authSlice';
import { CartProvider, useCart } from '../src/context/CartContext';
import { buildSwatches, formatPower, productLocaleOf, variantForSwatch, visiblePowers, type ProductVariant } from '../src/utils/variantPicker';

// Owner decision D (issue 1556): one product with a picker. Boundaries only: the API, the router and the app context.
const mockApiFetch = jest.fn();
const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true), setParams: jest.fn() };
let mockParams: Record<string, string> = {};
jest.mock('react-native-localize', () => require('react-native-localize/mock'));
jest.mock('../src/utils/api', () => ({ apiFetch: (...a: unknown[]) => mockApiFetch(...a), BASE_URL: 'https://api.example.test/api/v1' }));
jest.mock('../src/utils/isOffline', () => ({ isOffline: jest.fn(async () => false) }));
jest.mock('../src/utils/logger', () => ({ logError: jest.fn() }));
jest.mock('expo-router', () => ({
  get router() {
    return mockRouter;
  },
  useLocalSearchParams: () => mockParams,
}));
jest.mock('../src/context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'en', isRTL: false }) }));
jest.mock('../src/components/LocalizedAlert', () => ({ showLocalizedAlert: jest.fn() }));

import ProductDetail from '../app/pharmacy/product-detail';

const v = (id: string, power: number | null, colour: string | null, extra: Partial<ProductVariant> = {}): ProductVariant => ({
  id, sku: Number(id.replace(/\D/g, '')) || null, slug: `diva-${id}`, name: `Diva ${colour ?? ''} ${power ?? ''}`.trim(), price: 60, available: true,
  image: `${id}.webp`, variant: { kind: colour && power !== null ? 'colour_power' : power !== null ? 'power' : 'picture', power, colour, shade: null, position: 0 }, ...extra,
});
const diva = [v('d1', -0.25, 'hazel gray', { price: 55 }), v('d2', -2.5, 'hazel gray', { price: 61 }), v('d3', 1.5, 'hazel gray'), v('d4', -2.5, 'brown', { available: false }), v('d5', -0.25, 'brown')];

describe('variant picker model (app)', () => {
  it('formats powers, maps Filipino to the API locale', () => {
    expect(formatPower('en', -2.5)).toBe('-2.50');
    expect(formatPower('en', 1.25)).toBe('+1.25');
    expect(productLocaleOf('tl')).toBe('fil');
    expect(productLocaleOf('ur')).toBe('ur');
  });

  it('Diva: colour swatches, then the colour\'s powers on one side; a new colour keeps the power when it has it', () => {
    expect(buildSwatches(diva, (n) => `Option ${n}`).map((s) => [s.label, s.available])).toEqual([['Hazel Gray', true], ['Brown', true]]);
    const p = visiblePowers(diva, diva[1], null);
    expect(p.shown.map((x) => x.id)).toEqual(['d1', 'd2']);
    expect(visiblePowers(diva, diva[1], 'plus').shown.map((x) => x.id)).toEqual(['d3']);
    expect(variantForSwatch(diva, 'brown', diva[0])?.id).toBe('d5'); // same power −0.25
    expect(variantForSwatch(diva, 'brown', diva[1])?.id).toBe('d5'); // −2.50 brown is unavailable: the first available one
  });

  it('Lensme: picture swatches are "Option n", never a colour name', () => {
    expect(buildSwatches([v('l1', null, null), v('l2', null, null)], (n) => `Option ${n}`).map((s) => s.label)).toEqual(['Option 1', 'Option 2']);
  });
});

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
function CartProbe() {
  const { items } = useCart();
  return <>{items.map((i) => <Text key={i.id}>{`in-cart:${i.id}:${i.qty}`}</Text>)}</>;
}
const wrap = (node: React.ReactNode) => (
  <Provider store={configureStore({ reducer: { auth: authReducer } })}>
    <SafeAreaProvider initialMetrics={metrics}>
      <CartProvider>
        {node}
        <CartProbe />
      </CartProvider>
    </SafeAreaProvider>
  </Provider>
);

describe('Product page variant picker (decision D)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApiFetch.mockImplementation(async (path: string) => {
      const m = path.match(/^\/medicines\/(d\d)\/details/);
      if (m) {
        const row = diva.find((x) => x.id === m[1])!;
        return { id: row.id, name_en: row.name, name_ar: row.name, price: row.price, variant_group: 'vg_diva' };
      }
      if (path.startsWith('/public/product-variants/')) return { variant_group: 'vg_diva', variants: diva };
      return [];
    });
  });

  it('draws the picker, greys an unavailable power, and a choice goes to the route (?v=)', async () => {
    mockParams = { id: 'd2' };
    await render(wrap(<ProductDetail />));
    await screen.findByTestId('variant-picker');
    expect(mockApiFetch).toHaveBeenCalledWith('/public/product-variants/en/d2');
    expect(screen.getByTestId('variant-power-d2').props.accessibilityState).toMatchObject({ checked: true });
    await fireEvent.press(screen.getByTestId('variant-power-d1'));
    expect(mockRouter.setParams).toHaveBeenCalledWith({ v: 'd1' });
    await fireEvent.press(screen.getByTestId('variant-swatch-d4'));
    expect(mockRouter.setParams).toHaveBeenLastCalledWith({ v: 'd5' });
  });

  it('opens the chosen variant from the route and puts that variant (its own record) in the cart', async () => {
    mockParams = { id: 'd2', v: 'd1' };
    await render(wrap(<ProductDetail />));
    await screen.findByTestId('variant-picker');
    expect(mockApiFetch).toHaveBeenCalledWith(expect.stringMatching(/^\/medicines\/d1\/details/));
    expect(screen.getByTestId('variant-power-d1').props.accessibilityState).toMatchObject({ checked: true });
    await fireEvent.press(screen.getByText('Buy now'));
    await waitFor(() => expect(screen.getByText('in-cart:d1:1')).toBeTruthy());
  });
});
