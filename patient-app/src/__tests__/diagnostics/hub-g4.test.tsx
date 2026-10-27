import React from 'react';
import { readFileSync } from 'node:fs';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import DiagnosticsHub from '../../../app/(tabs)/diagnostics';
import { message } from '../../components/screen/ScreenKit';
import { DIAG_PAGE_SIZE, visibleRows } from '../../utils/diagPaging';

/** Owner review G4: one "My orders and results" button, no results / compare shortcuts, the full lists, a card per item with two actions. TEST values. */

jest.setTimeout(30000);
const mockApi = jest.fn();
const mockPush = jest.fn();
const mockAdd = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (...a: unknown[]) => mockPush(...a), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
  useLocalSearchParams: () => ({}),
  useFocusEffect: () => undefined,
}));
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined }));
jest.mock('../../context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'en', isRTL: false }) }));
jest.mock('../../context/CartContext', () => ({ useCart: () => ({ itemCount: 0 }) }));
jest.mock('../../context/DiagnosticsCartContext', () => ({
  useDiagnosticsCart: () => ({ items: [], itemCount: 0, total: 0, addItem: (...a: unknown[]) => mockAdd(...a), removeItem: jest.fn() }),
}));
jest.mock('../../utils/isOffline', () => ({ isOffline: jest.fn(async () => false) }));
jest.mock('../../utils/logger', () => ({ logError: jest.fn() }));
jest.mock('../../utils/api', () => ({ apiFetch: (...a: unknown[]) => mockApi(...a), BASE_URL: 'https://api.example.test/api/v1', R2_PUBLIC_URL: 'https://cdn.example.test' }));

const k = (key: string, vars?: Record<string, string | number>) => message('en', key, vars);
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const wrap = (ui: React.ReactElement) => <SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>;

const TESTS = Array.from({ length: 45 }, (_, i) => ({ id: `t-${i}`, name_en: `Test number ${i}`, price: 10 + i, cash_availability: true, insurance_availability: true }));

describe('Diagnostics hub (owner review G4)', () => {
  beforeEach(() => {
    mockApi.mockReset();
    mockPush.mockReset();
    mockAdd.mockReset();
    mockApi.mockImplementation(async (path: string) => (path === '/labs/services' ? TESTS : []));
  });

  it('has the single orders-and-results button and no results / compare shortcuts', async () => {
    await render(wrap(<DiagnosticsHub />));
    await waitFor(() => expect(screen.getByText('Test number 0')).toBeTruthy(), { timeout: 15000 });
    expect(screen.getAllByLabelText(k('diag.hub.myOrders'))).toHaveLength(1);
    expect(screen.queryByText(k('diag.hub.results'))).toBeNull();
    expect(screen.queryByText(k('diag.hub.compare'))).toBeNull();
    await fireEvent.press(screen.getByLabelText(k('diag.hub.myOrders')));
    expect(mockPush).toHaveBeenCalledWith('/diagnostics/orders');
  });

  it('shows the full list a page at a time', async () => {
    await render(wrap(<DiagnosticsHub />));
    await waitFor(() => expect(screen.getByText('Test number 0')).toBeTruthy(), { timeout: 15000 });
    expect(screen.queryByText(`Test number ${DIAG_PAGE_SIZE}`)).toBeNull();
    await fireEvent.press(screen.getByText(k('diag.hub.showMore')));
    await waitFor(() => expect(screen.getByText(`Test number ${DIAG_PAGE_SIZE}`)).toBeTruthy());
    await fireEvent.press(screen.getByText(k('diag.hub.showMore')));
    await waitFor(() => expect(screen.getByText('Test number 44')).toBeTruthy());
    expect(screen.queryByText(k('diag.hub.showMore'))).toBeNull();
  });

  it('every card has Add to cart and Order now; the lab test goes to the lab cart', async () => {
    await render(wrap(<DiagnosticsHub />));
    await waitFor(() => expect(screen.getByTestId('diag-test-t-3')).toBeTruthy(), { timeout: 15000 });
    await fireEvent.press(screen.getByTestId('diag-test-t-3-add'));
    expect(mockAdd).toHaveBeenCalledWith({ id: 't-3', name: 'Test number 3', price: 13, kind: 'lab' });
    expect(mockPush).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByTestId('diag-test-t-4-order'));
    expect(mockAdd).toHaveBeenLastCalledWith({ id: 't-4', name: 'Test number 4', price: 14, kind: 'lab' });
    expect(mockPush).toHaveBeenCalledWith('/diagnostics/cart');
  });
});

describe('paging (pure)', () => {
  it('shows page by page and reports what is hidden', () => {
    const rows = Array.from({ length: 45 }, (_, i) => i);
    expect(visibleRows(rows, 1)).toEqual({ shown: rows.slice(0, DIAG_PAGE_SIZE), remaining: 45 - DIAG_PAGE_SIZE });
    expect(visibleRows(rows, 3)).toEqual({ shown: rows, remaining: 0 });
    expect(visibleRows([], 0)).toEqual({ shown: [], remaining: 0 });
  });
});

describe('new keys in the six languages', () => {
  it.each(['ar', 'en', 'ur', 'hi', 'bn', 'tl'])('%s', (loc) => {
    const m = JSON.parse(readFileSync(`src/i18n/locales/${loc}.json`, 'utf8')) as Record<string, string>;
    for (const key of ['diag.detail.orderNow', 'diag.hub.showMore']) {
      expect(m[key]?.trim()).toBeTruthy();
      if (loc !== 'en') expect(m[key]).not.toBe(JSON.parse(readFileSync('src/i18n/locales/en.json', 'utf8'))[key]);
    }
  });
});
