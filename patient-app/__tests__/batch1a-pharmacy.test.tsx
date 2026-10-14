import React from 'react';
import { Text } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import authReducer from '../src/store/slices/authSlice';
import { CartProvider, useCart } from '../src/context/CartContext';
import { countFilters, discountPercent, filterMeds, listQuery, medPrice, medMeta } from '../src/utils/pharmacyCatalog';

// Boundaries only: the API, the router and the app context. Fixtures live in this test, never in a screen.
const mockApiFetch = jest.fn();
const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) };
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
jest.mock('../src/context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'ar', isRTL: true }) }));
jest.mock('../src/components/LocalizedAlert', () => ({ showLocalizedAlert: jest.fn() }));

import PharmacyHub from '../app/(tabs)/pharmacy';
import ProductDetail from '../app/pharmacy/product-detail';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const store = () => configureStore({ reducer: { auth: authReducer } });

function CartProbe() {
  const { items } = useCart();
  return <>{items.map((i) => <Text key={i.id}>{`in-cart:${i.id}:${i.qty}`}</Text>)}</>;
}
const wrap = (node: React.ReactNode) => (
  <Provider store={store()}>
    <SafeAreaProvider initialMetrics={metrics}>
      <CartProvider>
        {node}
        <CartProbe />
      </CartProvider>
    </SafeAreaProvider>
  </Provider>
);

describe('pharmacy translations (owner rule: every key in all six languages, real translations)', () => {
  const locales = { ar: require('../src/i18n/locales/ar.json'), en: require('../src/i18n/locales/en.json'), ur: require('../src/i18n/locales/ur.json'), hi: require('../src/i18n/locales/hi.json'), bn: require('../src/i18n/locales/bn.json'), tl: require('../src/i18n/locales/tl.json') } as Record<string, Record<string, string>>;
  const keys = Object.keys(locales.ar).filter((k) => k.startsWith('pharmacy.'));

  it('has every pharmacy key, non-empty, with the same {slots}, in all six files', () => {
    expect(keys.length).toBeGreaterThan(150);
    const slots = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(',');
    for (const [lang, file] of Object.entries(locales)) {
      for (const key of keys) {
        expect(typeof file[key] === 'string' && file[key].trim().length > 0).toBe(true);
        expect(slots(file[key])).toBe(slots(locales.ar[key]));
      }
      // no Arabic left in a non-Arabic file (the currency name is written out)
      if (lang !== 'ar') for (const key of keys) expect(/[\u0600-\u06FF]/.test(file[key]) && lang !== 'ur').toBe(false);
    }
  });
});

describe('pharmacy catalogue helpers', () => {
  it('a missing or zero price is not a price, a discount needs a real old price', () => {
    expect(medPrice({ id: 'a', price: 0 })).toBeNull();
    expect(medPrice({ id: 'a' })).toBeNull();
    expect(medPrice({ id: 'a', price: 12.5 })).toBe(12.5);
    expect(discountPercent({ id: 'a', price: 80, old_price: 100 })).toBe(20);
    expect(discountPercent({ id: 'a', price: 100, old_price: 80 })).toBe(0);
    expect(discountPercent({ id: 'a', price: 100 })).toBe(0);
    expect(medMeta({ id: 'a', manufacturer: 'شركة', package_size: '' })).toBe('شركة');
  });

  it('keeps the hub query and filters the way the screen did', () => {
    expect(listQuery('بنادول', 'medications', { rx: '1', minPrice: '5', sort: 'price_asc' })).toBe('search=%D8%A8%D9%86%D8%A7%D8%AF%D9%88%D9%84&category=%D8%A7%D9%84%D8%A3%D8%AF%D9%88%D9%8A%D8%A9+%D9%88%D8%A7%D9%84%D8%B9%D9%84%D8%A7%D8%AC&rx_only=1&min_price=5&sort=price_asc');
    expect(countFilters({ category: 'all', forms: 'a,b', brands: '', rx: '1', minPrice: '1' })).toBe(4);
    const rows = [
      { id: '1', name_ar: 'أ', price: 30 },
      { id: '2', name_ar: 'ب', price: 10, requires_prescription: true },
    ];
    expect(filterMeds(rows, { activeCat: 'all', search: '', filters: { sort: 'price_asc' } }).map((m) => m.id)).toEqual(['2', '1']);
    expect(filterMeds(rows, { activeCat: 'all', search: '', filters: { rx: '1' } }).map((m) => m.id)).toEqual(['2']);
  });
});

describe('Pharmacy hub (board PharmacyHub)', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockParams = {};
    await AsyncStorage.clear();
  });

  it('draws the real products, hides a price the API did not send, and adds to the real cart', async () => {
    mockApiFetch.mockImplementation(async (path: string) =>
      path.startsWith('/medicines?')
        ? [
            { id: 'm1', name_ar: 'دواء ١', manufacturer: 'شركة', price: 12, old_price: 15, requires_prescription: false },
            { id: 'm2', name_ar: 'دواء ٢', requires_prescription: true },
          ]
        : {},
    );
    await render(wrap(<PharmacyHub />));
    await waitFor(() => expect(screen.getByText('دواء ١')).toBeTruthy());
    expect(screen.getByText('دواء ٢')).toBeTruthy();
    expect(screen.getByText(/12\.00/)).toBeTruthy();
    expect(screen.getByText('خصم 20%')).toBeTruthy();
    expect(screen.getAllByText('يحتاج وصفة')).toHaveLength(1);
    // the second product has no price: nothing like "0.00" is drawn for it
    expect(screen.queryByText(/0\.00/)).toBeNull();
    // a visitor has no previous order, so "order again" is not asked for and not drawn
    expect(mockApiFetch.mock.calls.some(([p]) => String(p).startsWith('/patient/pharmacy/orders'))).toBe(false);
    expect(screen.queryByText('أعد طلبك السابق')).toBeNull();
    // the compare tile is not drawn: the comparison has no way to pick medicines from the hub
    expect(screen.queryByText('قارن البدائل')).toBeNull();

    await fireEvent.press(screen.getAllByLabelText('أضف للسلة')[0]);
    await waitFor(() => expect(screen.getByText('in-cart:m1:1')).toBeTruthy());
  });

  it('an empty catalogue shows the empty state with the manual request, not blank space', async () => {
    mockApiFetch.mockResolvedValue([]);
    await render(wrap(<PharmacyHub />));
    await waitFor(() => expect(screen.getByText('لا توجد منتجات')).toBeTruthy());
    await fireEvent.press(screen.getByLabelText('طلب دواء خاص'));
    expect(mockRouter.push).toHaveBeenCalledWith('/pharmacy/rx-order?via=type');
  });
});

describe('Product page (board ProductFull)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = { id: 'm1' };
  });

  it('draws only the fields the API sent: no invented rating, points, delivery choice or empty section', async () => {
    mockApiFetch.mockImplementation(async (path: string, init?: { method?: string }) => {
      if (path.startsWith('/medicines/m1/details')) {
        return {
          id: 'm1',
          name_ar: 'دواء ١',
          price: 20,
          old_price: 25,
          discount_percent: 20,
          requires_prescription: false,
          package_size: '24 قرص',
          form: 'أقراص',
          pharmacies_count: 0,
          indications_ar: ['استعمال أ', 'استعمال ب'],
          alternatives: [{ id: 'alt', name_ar: 'بديل', price: 15 }],
        };
      }
      if (path === '/users/me/wishlist' && !init?.method) return [];
      return {};
    });
    await render(wrap(<ProductDetail />));
    await waitFor(() => expect(screen.getAllByText('دواء ١').length).toBeGreaterThan(0));
    expect(screen.getByText('بدون وصفة')).toBeTruthy();
    expect(screen.getByText('خصم 20%')).toBeTruthy();
    expect(screen.getByText('تفاصيل الدواء')).toBeTruthy();
    expect(screen.getByText('دواعي الاستعمال')).toBeTruthy();
    expect(screen.getByText('أوفر')).toBeTruthy();
    // nothing here for these: no sections without data
    for (const hidden of ['السلامة', 'الجرعة', 'التحذيرات', 'منتجات مرتبطة', 'طريقة الاستلام', 'تكسب']) {
      expect(screen.queryByText(hidden)).toBeNull();
    }
    expect(screen.queryByText(/متوفر في/)).toBeNull();
  });

  it('buy now puts the chosen quantity in the cart and opens it', async () => {
    mockApiFetch.mockImplementation(async (path: string) => (path.startsWith('/medicines/m1/details') ? { id: 'm1', name_ar: 'دواء ١', price: 20 } : []));
    await render(wrap(<ProductDetail />));
    await waitFor(() => expect(screen.getAllByText('دواء ١').length).toBeGreaterThan(0));
    await fireEvent.press(screen.getByLabelText('زيادة الكمية'));
    await fireEvent.press(screen.getByText('اشترِ الآن'));
    await waitFor(() => expect(screen.getByText('in-cart:m1:2')).toBeTruthy());
    expect(mockRouter.push).toHaveBeenCalledWith('/pharmacy/cart');
  });
});
