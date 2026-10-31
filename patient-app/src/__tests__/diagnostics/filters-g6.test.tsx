import React from 'react';
import { readFileSync } from 'node:fs';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import DiagnosticsHub from '../../../app/(tabs)/diagnostics';
import NursingHub from '../../../app/(tabs)/nursing';
import { message } from '../../components/screen/ScreenKit';
import { serveCatalog } from './catalogServer';

/** Owner review G6: the filters of labs, radiology and nursing. TEST values. */

jest.setTimeout(30000);
const mockApi = jest.fn();
let mockTab: string | undefined;
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
  useLocalSearchParams: () => (mockTab ? { tab: mockTab } : {}),
  useFocusEffect: () => undefined,
}));
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined }));
jest.mock('../../context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'en', isRTL: false }) }));
jest.mock('../../context/CartContext', () => ({ useCart: () => ({ itemCount: 0 }) }));
jest.mock('../../context/DiagnosticsCartContext', () => ({
  useDiagnosticsCart: () => ({ items: [], itemCount: 0, total: 0, addItem: jest.fn(), removeItem: jest.fn() }),
}));
jest.mock('../../utils/isOffline', () => ({ isOffline: jest.fn(async () => false) }));
jest.mock('../../utils/logger', () => ({ logError: jest.fn() }));
jest.mock('../../utils/api', () => ({ apiFetch: (...a: unknown[]) => mockApi(...a), BASE_URL: 'https://api.example.test/api/v1', R2_PUBLIC_URL: 'https://cdn.example.test' }));

const k = (key: string, vars?: Record<string, string | number>) => message('en', key, vars);
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const wrap = (ui: React.ReactElement) => <SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>;

const SCANS = [
  { id: 'r-mri', name_en: 'Test MRI knee', category: 'mri', price: 500, home_visit_supported: false },
  { id: 'r-us', name_en: 'Test ultrasound', category: 'ultrasound', price: 100, home_visit_supported: true },
  { id: 'r-ct', name_en: 'Test CT chest', category: 'ct', price: 300, home_visit_supported: true },
];

describe('Diagnostics hub, radiology tab (G6)', () => {
  beforeEach(async () => {
    // the public catalogue cache keeps answers between tests: start clean so every page is asked of the (mock) server
    await AsyncStorage.clear();
    mockTab = 'radiology';
    mockApi.mockReset();
    mockApi.mockImplementation(async (path: string) => serveCatalog(path, { scans: SCANS }));
  });

  it('sheet offers only real options, sort and category chips count, reset clears both', async () => {
    await render(wrap(<DiagnosticsHub />));
    await waitFor(() => expect(screen.getAllByText('Test CT chest').length).toBeGreaterThan(0), { timeout: 15000 });
    expect(screen.queryByTestId('search-filter-count')).toBeNull();
    await fireEvent.press(screen.getByLabelText(k('diag.hub.filter')));
    // the lab-only options and the packages chip are not offered on the scans
    for (const id of ['diag-toggle-no-fasting', 'diag-toggle-same-day', 'diag-place-lab']) expect(screen.queryByTestId(id)).toBeNull();
    expect(screen.queryByTestId('diag-cat-packages')).toBeNull();
    expect(screen.queryByTestId('diag-filter-reset')).toBeNull();
    await fireEvent.press(screen.getByTestId('diag-sort-lowest_price'));
    await waitFor(() => expect(screen.getByLabelText(`${k('diag.hub.filter')} (1)`)).toBeTruthy());
    expect(screen.getByTestId('diag-active-sort-lowest_price')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('diag-cat-ct'));
    await waitFor(() => expect(screen.getByLabelText(`${k('diag.hub.filter')} (2)`)).toBeTruthy());
    await fireEvent.press(screen.getByTestId('diag-clear-all'));
    await waitFor(() => expect(screen.getAllByText('Test ultrasound').length).toBeGreaterThan(0));
    expect(screen.queryByTestId('diag-active-sort-lowest_price')).toBeNull();
    expect(screen.queryByTestId('diag-active-cat-ct')).toBeNull();
  });

  it('lowest price and home collection reach the server; the place never hides scans; the CTA shows the real count', async () => {
    await render(wrap(<DiagnosticsHub />));
    await waitFor(() => expect(screen.getAllByText('Test CT chest').length).toBeGreaterThan(0), { timeout: 15000 });
    await fireEvent.press(screen.getByLabelText(k('diag.hub.filter')));
    await fireEvent.press(screen.getByTestId('diag-sort-lowest_price'));
    await waitFor(() => expect(mockApi.mock.calls.some(([path]) => /^\/radiology\/services\?page=1&limit=20&lowest_price=true$/.test(String(path)))).toBe(true));
    expect(screen.getAllByText('Test MRI knee').length).toBeGreaterThan(0);
    await fireEvent.press(screen.getByTestId('diag-sort-popular'));
    await fireEvent.press(screen.getByTestId('diag-place-home'));
    await waitFor(() => expect(mockApi.mock.calls.some(([path]) => /^\/radiology\/services\?page=1&limit=20&home_visit=true$/.test(String(path)))).toBe(true));
    expect(screen.getByText(/^Show \d+ results$/)).toBeTruthy();
  });

  it('highest rated is sent to the server as highest_rated=true', async () => {
    await render(wrap(<DiagnosticsHub />));
    await waitFor(() => expect(screen.getAllByText('Test CT chest').length).toBeGreaterThan(0), { timeout: 15000 });
    await fireEvent.press(screen.getByLabelText(k('diag.hub.filter')));
    await fireEvent.press(screen.getByTestId('diag-sort-highest_rated'));
    await waitFor(() => expect(mockApi.mock.calls.some(([path]) => String(path).includes('highest_rated=true') && String(path).startsWith('/radiology/services'))).toBe(true));
    expect(screen.getByTestId('diag-active-sort-highest_rated')).toBeTruthy();
  });

  it('switching to the labs tab keeps working: two tabs on top, the lab-only options and the packages chip appear', async () => {
    mockTab = undefined;
    await render(wrap(<DiagnosticsHub />));
    await waitFor(() => expect(screen.getByLabelText(k('diag.hub.filter'))).toBeTruthy(), { timeout: 15000 });
    expect(screen.getByTestId('diag-cat-packages')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText(k('diag.hub.filter')));
    expect(screen.getByTestId('diag-toggle-no-fasting')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('diag-toggle-no-fasting'));
    await waitFor(() => expect(screen.getByLabelText(`${k('diag.hub.filter')} (1)`)).toBeTruthy());
    await fireEvent.press(screen.getByTestId('diag-main-tabs-radiology'));
    await waitFor(() => expect(screen.queryByTestId('diag-cat-packages')).toBeNull());
    expect(screen.queryByTestId('diag-active-no-fasting')).toBeNull();
  });
});

describe('Nursing hub filters (G6)', () => {
  beforeEach(() => {
    mockApi.mockReset();
    mockApi.mockImplementation(async (path: string) => (path === '/home-care/services' ? [{ id: 's1', name_en: 'Test dressing', price: 80 }] : []));
  });

  it('chips and the badge follow the chosen filters; Reset clears them all', async () => {
    await render(wrap(<NursingHub />));
    await waitFor(() => expect(screen.getByText('Test dressing')).toBeTruthy(), { timeout: 15000 });
    expect(screen.queryByTestId('nur-active-gender')).toBeNull();
    await fireEvent.press(screen.getByLabelText(k('nur.hub.filter')));
    await fireEvent.press(screen.getByText(k('nur.filter.female')));
    await fireEvent.press(screen.getByText(k('nur.filter.saudi')));
    await fireEvent.press(screen.getByText(k('nur.filter.now')));
    expect(screen.getByText(k('pharmacy.filters.applyCount', { n: 3 }))).toBeTruthy();
    await fireEvent.press(screen.getByTestId('nur-filter-reset'));
    expect(screen.getByText(k('nur.filter.apply'))).toBeTruthy();
    await fireEvent.press(screen.getByText(k('nur.filter.female')));
    await fireEvent.press(screen.getByTestId('nur-filter-apply'));
    await waitFor(() => expect(screen.getByLabelText(`${k('nur.hub.filter')} (1)`)).toBeTruthy());
    expect(screen.getByTestId('nur-active-gender')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('nur-clear-all'));
    await waitFor(() => expect(screen.queryByTestId('nur-active-gender')).toBeNull());
  });

  it('the nurse list asks with the params the server reads (available=true, nationality as stored)', () => {
    const src = readFileSync('app/nursing/service-details.tsx', 'utf8');
    expect(src).toContain("available: 'true'");
    expect(src).not.toMatch(/availability: first\(params\.availability\)/);
    expect(readFileSync('app/(tabs)/nursing.tsx', 'utf8')).toContain("{ id: 'Saudi'");
  });
});

describe('labels exist in the six languages', () => {
  const en = JSON.parse(readFileSync('src/i18n/locales/en.json', 'utf8')) as Record<string, string>;
  const keys = ['diag.filter.price', 'diag.filter.rating', 'diag.kind.group', 'diag.tag.noFasting', 'diag.cat.packages', 'diag.hub.rxOrder', 'diag.filter.placeLab', 'diag.filter.placeHome', 'diag.filter.sortBy', 'diag.filter.noFasting', 'diag.filter.sameDay', 'diag.filter.showCount', 'diag.hub.filter', 'diag.filter.title', 'diag.rad.modality', 'pharmacy.filters.reset', 'pharmacy.filters.clearAll', 'pharmacy.filters.applyCount',
    'nur.filter.all', 'nur.filter.male', 'nur.filter.female', 'nur.filter.now', 'nur.filter.saudi', 'nur.filter.filipino', 'nur.filter.egyptian', 'nur.filter.gender', 'nur.filter.availability', 'nur.filter.nationality', 'nur.filter.reset', 'nur.filter.apply', 'nur.filter.title', 'nur.hub.filter'];
  it.each(['ar', 'en', 'ur', 'hi', 'bn', 'tl'])('%s', (loc) => {
    const m = JSON.parse(readFileSync(`src/i18n/locales/${loc}.json`, 'utf8')) as Record<string, string>;
    for (const key of keys) {
      expect(m[key]?.trim()).toBeTruthy();
      if (loc !== 'en' && key !== 'nur.filter.all') expect(m[key]).not.toBe(en[key]);
    }
  });
});
