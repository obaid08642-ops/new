import React from 'react';
import { readFileSync } from 'node:fs';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import DiagnosticsHub from '../../../app/(tabs)/diagnostics';
import NursingHub from '../../../app/(tabs)/nursing';
import { message } from '../../components/screen/ScreenKit';
import { serveCatalog } from './catalogServer';
import { activeFilterCount, filterForTab, filtersFor, LAB_FILTERS, RAD_FILTERS } from '../../utils/diagFilters';

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

describe('filter options are real (pure)', () => {
  it('each tab offers only options that change its own lists', () => {
    expect(RAD_FILTERS.map((f) => f.id)).toEqual(['all', 'highest_rated', 'lowest_price', 'home_visit']);
    expect(LAB_FILTERS.map((f) => f.id)).toEqual(['all', 'tests', 'packages', 'labs', 'highest_rated', 'lowest_price', 'home_visit']);
    expect(filtersFor('radiology')).toBe(RAD_FILTERS);
    expect(filterForTab('packages', 'radiology')).toBe('all');
    expect(filterForTab('lowest_price', 'radiology')).toBe('lowest_price');
    expect(filterForTab('highest_rated', 'radiology')).toBe('highest_rated'); // the server rates scans now
  });
  it('the count ignores defaults', () => {
    expect(activeFilterCount('all', '')).toBe(0);
    expect(activeFilterCount('tests', 'mri')).toBe(2);
    expect(activeFilterCount('lowest_price', 'mri')).toBe(2);
  });
});

describe('Diagnostics hub, radiology tab (G6)', () => {
  beforeEach(async () => {
    // the public catalogue cache keeps answers between tests: start clean so every page is asked of the (mock) server
    await AsyncStorage.clear();
    mockTab = 'radiology';
    mockApi.mockReset();
    mockApi.mockImplementation(async (path: string) => serveCatalog(path, { scans: SCANS }));
  });

  it('sheet lists only the options that work here, the home visit option filters, count and reset agree', async () => {
    await render(wrap(<DiagnosticsHub />));
    await waitFor(() => expect(screen.getAllByText('Test CT chest').length).toBeGreaterThan(0), { timeout: 15000 });
    expect(screen.queryByTestId('search-filter-count')).toBeNull();
    await fireEvent.press(screen.getByLabelText(k('diag.hub.filter')));
    for (const key of ['diag.filter.tests', 'diag.filter.packages', 'diag.filter.labs']) expect(screen.queryByText(k(key))).toBeNull();
    expect(screen.queryByTestId('diag-filter-reset')).toBeNull();
    await fireEvent.press(screen.getByText(k('diag.filter.price')));
    await waitFor(() => expect(screen.getByLabelText(`${k('diag.hub.filter')} (1)`)).toBeTruthy());
    expect(screen.getByTestId('diag-active-lowest_price')).toBeTruthy();
    // a category chip adds the second filter
    await fireEvent.press(screen.getByTestId('diag-cat-ct'));
    await waitFor(() => expect(screen.getByLabelText(`${k('diag.hub.filter')} (2)`)).toBeTruthy());
    expect(screen.getByTestId('diag-active-cat-ct')).toBeTruthy();
    // clear all removes both and the badge
    await fireEvent.press(screen.getByTestId('diag-clear-all'));
    await waitFor(() => expect(screen.getAllByText('Test ultrasound').length).toBeGreaterThan(0));
    expect(screen.getByLabelText(k('diag.hub.filter'))).toBeTruthy();
    expect(screen.queryByTestId('diag-active-lowest_price')).toBeNull();
    expect(screen.queryByTestId('diag-active-cat-ct')).toBeNull();
  });

  it('home visit keeps the scans that do home visits, and lowest price orders by price', async () => {
    await render(wrap(<DiagnosticsHub />));
    await waitFor(() => expect(screen.getAllByText('Test CT chest').length).toBeGreaterThan(0), { timeout: 15000 });
    await fireEvent.press(screen.getByLabelText(k('diag.hub.filter')));
    await fireEvent.press(screen.getByText(k('diag.filter.price')));
    await waitFor(() => expect(mockApi.mock.calls.some(([path]) => /^\/radiology\/services\?page=1&limit=20&lowest_price=true$/.test(String(path)))).toBe(true));
    const names = screen.getAllByText(/^Test (MRI|ultrasound|CT)/).map((n) => n.props.children);
    // the strip repeats names above the "All scans" list: compare the list's own (last) occurrences
    expect(names.lastIndexOf('Test ultrasound')).toBeLessThan(names.lastIndexOf('Test CT chest'));
    // the server orders (lowest_price=true); the place no longer hides scans (R1), so the knee MRI that is not done at home is listed
    expect(screen.getAllByText('Test MRI knee').length).toBeGreaterThan(0);
    // only the explicit home visit filter asks the server for home scans
    await fireEvent.press(screen.getByLabelText(`${k('diag.hub.filter')} (1)`));
    await fireEvent.press(screen.getByText(k('diag.filter.home')));
    await waitFor(() => expect(mockApi.mock.calls.some(([path]) => /^\/radiology\/services\?page=1&limit=20&home_visit=true$/.test(String(path)))).toBe(true));
  });

  it('highest rated is offered on the scans and sent to the server as highest_rated=true', async () => {
    await render(wrap(<DiagnosticsHub />));
    await waitFor(() => expect(screen.getAllByText('Test CT chest').length).toBeGreaterThan(0), { timeout: 15000 });
    await fireEvent.press(screen.getByLabelText(k('diag.hub.filter')));
    await fireEvent.press(screen.getByText(k('diag.filter.rating')));
    await waitFor(() => expect(mockApi.mock.calls.some(([path]) => String(path).includes('highest_rated=true') && String(path).startsWith('/radiology/services'))).toBe(true));
    expect(screen.getByTestId('diag-active-highest_rated')).toBeTruthy();
  });

  it('switching to the labs tab drops a filter the labs tab does not have', async () => {
    mockTab = undefined;
    await render(wrap(<DiagnosticsHub />));
    await waitFor(() => expect(screen.getByLabelText(k('diag.hub.filter'))).toBeTruthy(), { timeout: 15000 });
    await fireEvent.press(screen.getByLabelText(k('diag.hub.filter')));
    await fireEvent.press(screen.getByText(k('diag.filter.packages')));
    await waitFor(() => expect(screen.getByLabelText(`${k('diag.hub.filter')} (1)`)).toBeTruthy());
    await fireEvent.press(screen.getByText(k('diag.kind.rad')));
    await waitFor(() => expect(screen.getByLabelText(k('diag.hub.filter'))).toBeTruthy());
    expect(screen.queryByTestId('diag-active-packages')).toBeNull();
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
  const keys = [...LAB_FILTERS.map((f) => f.key), 'diag.hub.filter', 'diag.filter.title', 'diag.rad.modality', 'pharmacy.filters.reset', 'pharmacy.filters.clearAll', 'pharmacy.filters.applyCount',
    'nur.filter.all', 'nur.filter.male', 'nur.filter.female', 'nur.filter.now', 'nur.filter.saudi', 'nur.filter.filipino', 'nur.filter.egyptian', 'nur.filter.gender', 'nur.filter.availability', 'nur.filter.nationality', 'nur.filter.reset', 'nur.filter.apply', 'nur.filter.title', 'nur.hub.filter'];
  it.each(['ar', 'en', 'ur', 'hi', 'bn', 'tl'])('%s', (loc) => {
    const m = JSON.parse(readFileSync(`src/i18n/locales/${loc}.json`, 'utf8')) as Record<string, string>;
    for (const key of keys) {
      expect(m[key]?.trim()).toBeTruthy();
      if (loc !== 'en' && key !== 'nur.filter.all') expect(m[key]).not.toBe(en[key]);
    }
  });
});
