import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LocationPickerView } from '../../components/account/LocationPickerView';
import { translations } from '../../i18n';

/** Map first: pin moved -> one GET /geo/reverse after the debounce -> city, district, street filled -> save. All values are TEST values. */

let mockMap: { onRegionChangeComplete?: (r: { latitude: number; longitude: number }) => void } = {};
let mockGranted = true;
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
  useLocalSearchParams: () => ({}),
}));
jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3 },
  requestForegroundPermissionsAsync: async () => ({ status: mockGranted ? 'granted' : 'denied' }),
  getCurrentPositionAsync: async () => ({ coords: { latitude: 24.7, longitude: 46.6 } }),
}));
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined, getCalendar: () => 'gregorian' }));
jest.mock('../../components/MapPrimitives', () => ({
  __esModule: true,
  default: (props: typeof mockMap) => { mockMap = props; return null; },
  Marker: () => null,
  PROVIDER_DEFAULT: 'default',
  mapAvailable: true,
}));
jest.mock('../../context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'en', isRTL: false }) }));
jest.mock('../../utils/logger', () => ({ logError: jest.fn() }));
jest.mock('../../utils/isOffline', () => ({ isOffline: jest.fn(async () => false) }));
jest.mock('../../utils/selectedAddress', () => ({ setSelectedAddress: jest.fn(async () => undefined) }));
jest.mock('../../utils/api', () => ({ BASE_URL: 'https://api.example.test/api/v1', R2_PUBLIC_URL: 'https://cdn.example.test', apiFetch: jest.fn() }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { apiFetch } = require('../../utils/api') as { apiFetch: jest.Mock };
const en = (key: string) => (translations.en as Record<string, string>)[key];
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const wrap = (ui: React.ReactElement) => <SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>;
const REVERSE = { city_id: 'c1', city_name_ar: 'مدينة', city_name_en: 'Test city', district_id: 'd1', district_name_ar: 'حي', district_name_en: 'Test district', street: 'Test street', building_no: '12', postal_code: null, short_address: null };
const reverseCalls = () => apiFetch.mock.calls.filter(([p]) => String(p).startsWith('/geo/reverse'));

beforeEach(() => {
  jest.useFakeTimers();
  apiFetch.mockReset();
  mockGranted = true;
  apiFetch.mockImplementation(async (path: string, init?: RequestInit) => {
    if (init?.method === 'POST') return { id: 'new-1' };
    if (path.startsWith('/geo/reverse')) return REVERSE;
    if (path.startsWith('/locations/cities')) return [{ code: 'c1', name_ar: 'مدينة', name_en: 'Test city' }];
    return [];
  });
});
afterEach(() => jest.useRealTimers());

describe('address on the map', () => {
  it('asks the server once after the map stops, fills the fields and saves them', async () => {
    await render(wrap(<LocationPickerView />));
    await act(async () => { mockMap.onRegionChangeComplete?.({ latitude: 24.1, longitude: 46.1 }); mockMap.onRegionChangeComplete?.({ latitude: 24.69, longitude: 46.72 }); });
    expect(reverseCalls()).toHaveLength(0);
    await act(async () => { jest.advanceTimersByTime(650); });
    await waitFor(() => expect(screen.getByTestId('picker-street').props.value).toBe('Test street'));
    expect(reverseCalls()).toHaveLength(1);
    expect(reverseCalls()[0][0]).toBe('/geo/reverse?lat=24.69&lng=46.72');
    expect(screen.getByTestId('picker-building').props.value).toBe('12');
    expect(screen.getByLabelText(`${en('picker.city')}: Test city`)).toBeTruthy();
    expect(screen.getByLabelText(`${en('picker.district')}: Test district`)).toBeTruthy();

    await act(async () => fireEvent.press(screen.getByTestId('picker-save')));
    const post = apiFetch.mock.calls.find(([, init]) => init?.method === 'POST');
    expect(post[0]).toBe('/users/me/addresses');
    expect(JSON.parse(post[1].body)).toMatchObject({ street: 'Test street', building: '12', city: 'Test city', district: 'Test district', lat: 24.69, lng: 46.72 });
  });

  it('says so when the location permission is denied, and asks nothing', async () => {
    mockGranted = false;
    await render(wrap(<LocationPickerView />));
    await act(async () => fireEvent.press(screen.getByTestId('picker-locate')));
    await waitFor(() => expect(screen.getByText(en('picker.permission'))).toBeTruthy());
    await act(async () => { jest.advanceTimersByTime(700); });
    expect(reverseCalls()).toHaveLength(0);
  });

  it('keeps manual entry when the reverse lookup fails', async () => {
    apiFetch.mockImplementation(async (path: string) => { if (path.startsWith('/geo/reverse')) throw new Error('offline'); return []; });
    await render(wrap(<LocationPickerView />));
    await act(async () => { mockMap.onRegionChangeComplete?.({ latitude: 24.69, longitude: 46.72 }); jest.advanceTimersByTime(650); });
    await waitFor(() => expect(screen.getByText(en('picker.reverseFailed'))).toBeTruthy());
    await act(async () => fireEvent.changeText(screen.getByTestId('picker-street'), 'Typed street'));
    expect(screen.getByTestId('picker-street').props.value).toBe('Typed street');
  });
});
