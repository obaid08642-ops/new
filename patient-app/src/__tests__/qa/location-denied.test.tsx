import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LocationPickerView } from '../../components/account/LocationPickerView';
import { ProvidersMapView } from '../../components/account/ProvidersMapView';
import { resolveNearbyPlace } from '../../utils/consultNearby';
import { deviceNearbyDeps } from '../../utils/consultNearbyDevice';
import { translations } from '../../i18n';

/** PT-30: the phone's location permission is denied. Each screen that asks for it keeps a usable path (saved address, manual city and district, the list). TEST values only. */

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true), setParams: jest.fn() },
  useLocalSearchParams: () => ({}),
}));
jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3 },
  requestForegroundPermissionsAsync: jest.fn(async () => ({ status: 'denied' })),
  getCurrentPositionAsync: jest.fn(async () => ({ coords: { latitude: 24.7, longitude: 46.6 } })),
}));
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined, getCalendar: () => 'gregorian' }));
jest.mock('../../components/MapPrimitives', () => ({
  __esModule: true,
  default: require('react').forwardRef(() => null),
  HologramLayer: () => null,
  Marker: () => null,
  PROVIDER_DEFAULT: 'default',
}));
jest.mock('../../context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'en', isRTL: false }) }));
jest.mock('../../utils/logger', () => ({ logError: jest.fn() }));
jest.mock('../../utils/isOffline', () => ({ isOffline: jest.fn(async () => false) }));
jest.mock('../../utils/selectedAddress', () => ({
  setSelectedAddress: jest.fn(async () => undefined),
  getSelectedAddress: jest.fn(async () => null),
  resolveEffectiveAddress: jest.fn(async () => ({ id: 'a1', city: 'Test city' })),
}));
jest.mock('../../utils/api', () => ({ BASE_URL: 'https://api.example.test/api/v1', R2_PUBLIC_URL: 'https://cdn.example.test', apiFetch: jest.fn() }));

/* eslint-disable @typescript-eslint/no-require-imports */
const { apiFetch } = require('../../utils/api') as { apiFetch: jest.Mock };
const Location = require('expo-location') as { getCurrentPositionAsync: jest.Mock };
/* eslint-enable @typescript-eslint/no-require-imports */
const en = translations.en as Record<string, string>;
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const wrap = (ui: React.ReactElement) => <SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>;

beforeEach(() => {
  apiFetch.mockReset();
  Location.getCurrentPositionAsync.mockClear();
  apiFetch.mockImplementation(async (path: string) => {
    if (path.startsWith('/locations/cities')) return [{ code: 'c1', name_ar: 'مدينة', name_en: 'Test city' }];
    return [];
  });
});

describe('location permission denied (PT-30)', () => {
  it('the shared "nearest" helper returns no coordinates and the place falls back to the saved city', async () => {
    await expect(deviceNearbyDeps.deviceCoords()).resolves.toBeNull();
    expect(Location.getCurrentPositionAsync).not.toHaveBeenCalled();
    await expect(resolveNearbyPlace(deviceNearbyDeps)).resolves.toEqual({ kind: 'city', city: 'Test city' });
  });

  it('the providers map still loads providers (no dead end), explains the permission, and "My location" explains it again', async () => {
    await render(wrap(<ProvidersMapView />));
    await waitFor(() => expect(apiFetch.mock.calls.some(([p]) => String(p).startsWith('/providers/map'))).toBe(true));
    const providerCall = apiFetch.mock.calls.find(([p]) => String(p).startsWith('/providers/map'));
    expect(String(providerCall[0])).not.toContain('lat=');
    expect(await screen.findByText(en['picker.permission'])).toBeTruthy();
    expect(screen.queryByText(en['map.loadError'])).toBeNull();
    expect(Location.getCurrentPositionAsync).not.toHaveBeenCalled();
    await act(async () => { fireEvent.press(screen.getByTestId('map-my-location')); });
    expect(screen.getByText(en['picker.permission'])).toBeTruthy();
  });

  it('the address picker says so when "Use my location" is refused and keeps the manual city fields', async () => {
    await render(wrap(<LocationPickerView />));
    await act(async () => { fireEvent.press(await screen.findByTestId('picker-locate')); });
    expect(await screen.findByText(en['picker.permission'])).toBeTruthy();
    expect(screen.getByTestId('picker-save')).toBeTruthy();
    expect(screen.getByTestId('picker-short-address')).toBeTruthy();
    expect(Location.getCurrentPositionAsync).not.toHaveBeenCalled();
  });
});
