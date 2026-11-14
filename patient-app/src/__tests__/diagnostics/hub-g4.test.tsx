import React from 'react';
import { readFileSync } from 'node:fs';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import DiagnosticsHub from '../../../app/(tabs)/diagnostics';
import { message } from '../../components/screen/ScreenKit';
import { DIAG_PAGE_SIZE } from '../../utils/diagCatalogApi';
import { serveCatalog } from './catalogServer';

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

// the last test is the most requested (backend `popularity`), so the strip and the list never show the same names at the start
const TESTS = Array.from({ length: 45 }, (_, i) => ({ id: `t-${i}`, name_en: `Test number ${i}`, price: 10 + i, cash_availability: true, insurance_availability: true, popularity: i === 44 ? 90 : 0 }));
const END = { nativeEvent: { contentOffset: { x: 0, y: 5000 }, contentSize: { width: 390, height: 5600 }, layoutMeasurement: { width: 390, height: 800 } } };

describe('Diagnostics hub (owner review G4)', () => {
  beforeEach(async () => {
    // the public catalogue cache keeps answers between tests: start clean so every page is asked of the (mock) server
    await AsyncStorage.clear();
    mockApi.mockReset();
    mockPush.mockReset();
    mockAdd.mockReset();
    mockApi.mockImplementation(async (path: string) => serveCatalog(path, { labs: TESTS }));
  });

  it('has the single orders-and-results button and no results / compare shortcuts', async () => {
    await render(wrap(<DiagnosticsHub />));
    await waitFor(() => expect(screen.getByTestId('diag-test-t-0')).toBeTruthy(), { timeout: 15000 });
    expect(screen.getAllByLabelText(k('diag.hub.myOrders'))).toHaveLength(1);
    expect(screen.queryByText(k('diag.hub.results'))).toBeNull();
    expect(screen.queryByText(k('diag.hub.compare'))).toBeNull();
    await fireEvent.press(screen.getByLabelText(k('diag.hub.myOrders')));
    expect(mockPush).toHaveBeenCalledWith('/diagnostics/orders');
  });

  it('asks the SERVER for the next page as the end of the scroll is reached (no Show more button, no full download)', async () => {
    await render(wrap(<DiagnosticsHub />));
    await waitFor(() => expect(screen.getByTestId('diag-test-t-0')).toBeTruthy(), { timeout: 15000 });
    const pagePaths = () => mockApi.mock.calls.map(([path]) => String(path)).filter((path) => path.startsWith('/labs/services?page='));
    expect(screen.queryByText(k('diag.hub.showMore'))).toBeNull();
    expect(screen.queryByTestId(`diag-test-t-${DIAG_PAGE_SIZE}`)).toBeNull();
    expect(pagePaths()).toContain('/labs/services?page=1&limit=20');
    expect(pagePaths().some((path) => path.includes('page=2'))).toBe(false);
    await fireEvent.scroll(screen.getByTestId('diag-scroll'), END);
    await waitFor(() => expect(screen.getByTestId(`diag-test-t-${DIAG_PAGE_SIZE}`)).toBeTruthy());
    expect(pagePaths()).toContain('/labs/services?page=2&limit=20');
    expect(screen.queryByTestId('diag-test-t-40')).toBeNull();
    await fireEvent.scroll(screen.getByTestId('diag-scroll'), END);
    await waitFor(() => expect(screen.getByTestId('diag-test-t-43')).toBeTruthy());
    expect(pagePaths()).toContain('/labs/services?page=3&limit=20');
    // the last page was the end: scrolling again asks nothing more
    await fireEvent.scroll(screen.getByTestId('diag-scroll'), END);
    expect(pagePaths().some((path) => path.includes('page=4'))).toBe(false);
  });

  it('shows the real rating on a card, only when the server sent one above 0', async () => {
    mockApi.mockImplementation(async (path: string) =>
      serveCatalog(path, { labs: [{ id: 'rated', name_en: 'Test rated', price: 20, rating: 4.5, rating_count: 12 }, { id: 'plain', name_en: 'Test plain', price: 30, rating: null, rating_count: 0 }] }),
    );
    await render(wrap(<DiagnosticsHub />));
    await waitFor(() => expect(screen.getByTestId('diag-test-rated')).toBeTruthy(), { timeout: 15000 });
    expect(screen.getAllByText(k('diag.ratingLine', { n: '4.5', count: '12' })).length).toBeGreaterThan(0);
    expect(screen.queryAllByText(/^Rating /)).toHaveLength(screen.getAllByText(k('diag.ratingLine', { n: '4.5', count: '12' })).length);
  });

  it('shows the most requested strip first (the backend popularity) and the all-tests list after it', async () => {
    await render(wrap(<DiagnosticsHub />));
    await waitFor(() => expect(screen.getByTestId('diag-popular-t-44')).toBeTruthy(), { timeout: 15000 });
    expect(screen.getByText(k('diag.hub.popular'))).toBeTruthy();
    expect(screen.getByText(k('diag.hub.allTests'))).toBeTruthy();
  });

  it('every card has Add to cart and Order now; Add goes to the lab cart, Order now skips the cart for the lab choice with that one item', async () => {
    await render(wrap(<DiagnosticsHub />));
    await waitFor(() => expect(screen.getByTestId('diag-test-t-3')).toBeTruthy(), { timeout: 15000 });
    await fireEvent.press(screen.getByTestId('diag-test-t-3-add'));
    expect(mockAdd).toHaveBeenCalledWith({ id: 't-3', name: 'Test number 3', price: 13, kind: 'lab' });
    expect(mockPush).not.toHaveBeenCalled();
    mockAdd.mockClear();
    await fireEvent.press(screen.getByTestId('diag-test-t-4-order'));
    expect(mockAdd).not.toHaveBeenCalled(); // the cart is not touched
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/diagnostics/lab-comparison', params: { kind: 'lab', id: 't-4', name: 'Test number 4', single: '1', mode: 'home', payer: 'cash' } });
  });
});

describe('new keys in the six languages', () => {
  it.each(['ar', 'en', 'ur', 'hi', 'bn', 'tl'])('%s', (loc) => {
    const m = JSON.parse(readFileSync(`src/i18n/locales/${loc}.json`, 'utf8')) as Record<string, string>;
    for (const key of ['diag.detail.orderNow']) {
      expect(m[key]?.trim()).toBeTruthy();
      if (loc !== 'en') expect(m[key]).not.toBe(JSON.parse(readFileSync('src/i18n/locales/en.json', 'utf8'))[key]);
    }
  });
});
