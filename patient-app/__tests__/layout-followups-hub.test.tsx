import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import authReducer from '../src/store/slices/authSlice';
import { CartProvider } from '../src/context/CartContext';
import { message } from '../src/components/screen/ScreenKit';

/** Layout follow-ups: the pharmacy hub's sort chips (none selected by default) and the consultations header (favourites, cart, menu). */

const mockApiFetch = jest.fn();
const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true), setParams: jest.fn() };
let mockParams: Record<string, string> = {};
jest.mock('react-native-localize', () => require('react-native-localize/mock'));
jest.setTimeout(30000);
jest.mock('../src/utils/api', () => ({ apiFetch: (...a: unknown[]) => mockApiFetch(...a), hasSession: async () => false, BASE_URL: 'https://api.example.test/api/v1' }));
jest.mock('../src/utils/isOffline', () => ({ isOffline: jest.fn(async () => false) }));
jest.mock('../src/utils/logger', () => ({ logError: jest.fn() }));
jest.mock('expo-router', () => ({
  get router() {
    return mockRouter;
  },
  useLocalSearchParams: () => mockParams,
  useFocusEffect: () => undefined,
}));
jest.mock('../src/context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'en', isRTL: false }) }));
jest.mock('../src/context/DiagnosticsCartContext', () => ({ useDiagnosticsCart: () => ({ items: [] }) })); // the header's cart button reads the diagnostics cart too
jest.mock('../src/components/LocalizedAlert', () => ({ showLocalizedAlert: jest.fn() }));

import PharmacyHub from '../app/(tabs)/pharmacy';

const k = (key: string) => message('en', key);
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const wrap = (node: React.ReactNode) => (
  <Provider store={configureStore({ reducer: { auth: authReducer } })}>
    <SafeAreaProvider initialMetrics={metrics}>
      <CartProvider>{node}</CartProvider>
    </SafeAreaProvider>
  </Provider>
);

beforeEach(() => {
  mockApiFetch.mockReset().mockResolvedValue([]);
  mockRouter.setParams.mockReset();
  mockParams = {};
});

describe('pharmacy hub sort chips', () => {
  it('draws the four chips, none selected, and the row says Recommended', async () => {
    await render(wrap(<PharmacyHub />));
    const row = screen.getByTestId('pharmacy-sort-row');
    expect(row.props.accessibilityLabel).toBe(`${k('pharmacy.filters.sort')}: ${k('pharmacy.filters.sortRecommended')}`);
    expect(k('pharmacy.filters.sortRecommended')).toBe('Recommended');
    for (const key of ['sortRelevant', 'sortPriceAsc', 'sortPriceDesc', 'sortNewest']) {
      const chip = screen.getByText(k(`pharmacy.filters.${key}`));
      expect(chip).toBeTruthy();
    }
  });

  it('a chip sets filter_sort to the catalogue value', async () => {
    await render(wrap(<PharmacyHub />));
    await fireEvent.press(screen.getByText('Lowest price'));
    expect(mockRouter.setParams).toHaveBeenCalledWith({ filter_sort: 'price_asc' });
  });

  it('the chosen chip is named by the row and tapping it again clears the sort', async () => {
    mockParams = { filter_sort: 'newest' };
    await render(wrap(<PharmacyHub />));
    expect(screen.getByTestId('pharmacy-sort-row').props.accessibilityLabel).toContain('Newest');
    await fireEvent.press(screen.getAllByText('Newest')[0]);
    expect(mockRouter.setParams).toHaveBeenCalledWith({ filter_sort: '' });
  });
});

describe('consultations header', () => {
  it('carries favourites, cart and menu at the end, next to the appointments button', async () => {
    const Consult = require('../app/(tabs)/consultations/index').default;
    await render(wrap(<Consult />));
    for (const id of ['consult-appointments-entry', 'cart-button', 'consult-menu-button']) expect(screen.getByTestId(id)).toBeTruthy();
    expect(screen.getByLabelText(k('pharmacy.favorites'))).toBeTruthy();
  });
});
