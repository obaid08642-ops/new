import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import authReducer from '../src/store/slices/authSlice';
import { CartProvider } from '../src/context/CartContext';

// Owner decision E (issue 1556): the product page's name block shows the English name under the localized one in
// ur, hi and bn, and not in ar, en or tl. Boundaries only: the API, the router and the app language.
const mockApiFetch = jest.fn();
let mockLang = 'ur';
jest.mock('react-native-localize', () => require('react-native-localize/mock'));
jest.mock('../src/utils/api', () => ({ apiFetch: (...a: unknown[]) => mockApiFetch(...a), hasSession: () => false, BASE_URL: 'https://api.example.test/api/v1' }));
jest.mock('../src/utils/isOffline', () => ({ isOffline: jest.fn(async () => false) }));
jest.mock('../src/utils/logger', () => ({ logError: jest.fn() }));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true), setParams: jest.fn() },
  useLocalSearchParams: () => ({ id: 'm1' }),
}));
jest.mock('../src/context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: mockLang, isRTL: mockLang === 'ur' || mockLang === 'ar' }) }));
jest.mock('../src/components/LocalizedAlert', () => ({ showLocalizedAlert: jest.fn() }));

import ProductDetail from '../app/pharmacy/product-detail';
import { LanguageManager } from '../src/i18n/LanguageManager';

// the catalogue fields follow the app language (utils/localize reads it from the language manager)
const setLang = (lang: string) => {
  mockLang = lang;
  (LanguageManager.getInstance().i18n as unknown as { locale: string }).locale = lang;
};

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const wrap = (node: React.ReactNode) => (
  <Provider store={configureStore({ reducer: { auth: authReducer } })}>
    <SafeAreaProvider initialMetrics={metrics}>
      <CartProvider>{node}</CartProvider>
    </SafeAreaProvider>
  </Provider>
);

const row = {
  id: 'm1', name_ar: 'بانادول 500', name_en: 'Panadol 500 mg 24 Tablets', price: 12,
  translations: { ur: { name: 'پیناڈول 500' }, hi: { name: 'पैनाडोल 500' }, bn: { name: 'প্যানাডল 500' }, tl: { name: 'Panadol 500 tableta' } },
};

describe('product name block (decision E)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApiFetch.mockImplementation(async (path: string) => (path.startsWith('/medicines/m1/details') ? row : []));
  });

  it.each(['ur', 'hi', 'bn'])('%s: the English name is drawn under the localized one', async (lang) => {
    setLang(lang);
    await render(wrap(<ProductDetail />));
    const localized = { ur: 'پیناڈول 500', hi: 'पैनाडोल 500', bn: 'প্যানাডল 500' }[lang];
    expect(await screen.findByRole('header', { name: localized })).toBeTruthy();
    const en = await screen.findByTestId('product-english-name');
    expect(en.props.children).toBe('Panadol 500 mg 24 Tablets');
  });

  it.each(['ar', 'en', 'tl'])('%s: no English line under the name', async (lang) => {
    setLang(lang);
    await render(wrap(<ProductDetail />));
    await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith(expect.stringMatching(/^\/medicines\/m1\/details/)));
    await waitFor(() => expect(screen.getByTestId('product-detail')).toBeTruthy());
    expect(screen.queryByTestId('product-english-name')).toBeNull();
  });
});
