import React from 'react';
import { Linking } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LocationPickerView } from '../../components/account/LocationPickerView';
import { ProvidersMapView } from '../../components/account/ProvidersMapView';
import { translations } from '../../i18n';

/**
 * An Android build with no Google Maps key must never mount the native map (it crashes the app: "API key not found").
 * Here the primitives say there is no map, and mounting one would throw: the picker falls back to manual entry / the short
 * address code / "use my location" + GET /geo/reverse, and the providers screen to a list with "open in Maps".
 */

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
  useLocalSearchParams: () => ({}),
}));
jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3 },
  requestForegroundPermissionsAsync: async () => ({ status: 'granted' }),
  getCurrentPositionAsync: async () => ({ coords: { latitude: 24.7, longitude: 46.6 } }),
  reverseGeocodeAsync: jest.fn(async () => { throw new Error('the device geocoder must not be used without a map'); }),
}));
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined, getCalendar: () => 'gregorian' }));
jest.mock('../../components/MapPrimitives', () => ({
  __esModule: true,
  default: () => { throw new Error('the native map was mounted without a key'); },
  Marker: () => { throw new Error('a marker was mounted without a key'); },
  PROVIDER_DEFAULT: 'default',
  mapAvailable: false,
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

beforeEach(() => apiFetch.mockReset());

describe('address picker without a map', () => {
  it('shows the no-map note, keeps manual entry, and reads the street from GET /geo/reverse for "use my location"', async () => {
    apiFetch.mockImplementation(async (path: string) => (String(path).startsWith('/geo/reverse')
      ? { street: 'Test street', district_name_en: 'Test district', city_name_en: 'Test city', short_address: 'RRRD2929' }
      : null));
    await render(wrap(<LocationPickerView />));
    expect(screen.getByText(en('picker.noMap'))).toBeTruthy();
    await act(async () => fireEvent.press(screen.getByTestId('picker-locate')));
    await waitFor(() => expect(screen.getByTestId('picker-street').props.value).toBe('Test street, Test district, Test city'));
    expect(apiFetch).toHaveBeenCalledWith('/geo/reverse?lat=24.7&lng=46.6');
    expect(screen.getByTestId('picker-short-address').props.value).toBe('RRRD2929');
  });

  it('says so and leaves the street to the patient when the server cannot read the point', async () => {
    apiFetch.mockRejectedValue(new Error('outside_service_area'));
    await render(wrap(<LocationPickerView />));
    await act(async () => fireEvent.press(screen.getByTestId('picker-locate')));
    await waitFor(() => expect(screen.getByText(en('picker.reverseFailed'))).toBeTruthy());
    expect(screen.getByTestId('picker-street').props.value).toBe('');
  });
});

describe('providers map without a map', () => {
  it('lists the providers nearest first with an "open in Maps" button, and never mounts the map', async () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    apiFetch.mockImplementation(async (path: string) => (String(path).startsWith('/providers/map')
      ? [
          { id: 'far', type: 'lab', name_en: 'Far Lab', lat: 24.9, lng: 46.9, distance_km: 9.2 },
          { id: 'near', type: 'doctor', name_en: 'Near Clinic', lat: 24.71, lng: 46.68, distance_km: 1.4 },
        ]
      : {}));
    await render(wrap(<ProvidersMapView />));
    await waitFor(() => expect(screen.getByTestId('map-row-near')).toBeTruthy());
    expect(screen.getByTestId('map-list-fallback')).toBeTruthy();
    const rows = screen.getAllByTestId(/^map-row-(near|far)$/).map((r) => r.props.testID);
    expect(rows).toEqual(['map-row-near', 'map-row-far']);
    await act(async () => fireEvent.press(screen.getByTestId('map-row-open-near')));
    expect(open).toHaveBeenCalledWith(expect.stringMatching(/^geo:0,0\?q=24\.71,46\.68\(Near%20Clinic\)$|^maps:0,0\?q=Near%20Clinic@24\.71,46\.68$/));
    open.mockRestore();
  });
});
