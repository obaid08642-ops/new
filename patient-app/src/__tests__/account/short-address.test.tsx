import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LocationPickerView } from '../../components/account/LocationPickerView';
import { translations } from '../../i18n';

/** 19.7: a Saudi National Address short code fills the address from Saudi Post and is saved with it. Every value is a TEST value. */

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
  useLocalSearchParams: () => ({}),
}));
jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3 },
  requestForegroundPermissionsAsync: async () => ({ status: 'denied' }),
  getCurrentPositionAsync: async () => ({ coords: { latitude: 24.7, longitude: 46.6 } }),
  reverseGeocodeAsync: async () => [],
}));
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined, getCalendar: () => 'gregorian' }));
jest.mock('../../components/MapPrimitives', () => ({ __esModule: true, default: () => null, Marker: () => null, PROVIDER_DEFAULT: 'default' }));
jest.mock('../../context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'en', isRTL: false }) }));
jest.mock('../../utils/logger', () => ({ logError: jest.fn() }));
jest.mock('../../utils/isOffline', () => ({ isOffline: jest.fn(async () => false) }));
jest.mock('../../utils/selectedAddress', () => ({ setSelectedAddress: jest.fn(async () => undefined) }));
jest.mock('../../utils/api', () => ({ BASE_URL: 'https://api.example.test/api/v1', R2_PUBLIC_URL: 'https://cdn.example.test', apiFetch: jest.fn() }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { apiFetch } = require('../../utils/api') as { apiFetch: jest.Mock };
const en = (key: string) => (translations.en as Record<string, string>)[key].replace('{example}', 'RRRD2929');
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const wrap = (ui: React.ReactElement) => <SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>;
const FOUND = { short_address: 'RRRD2929', street: 'Test street', district: 'Test district', city: 'Test city', lat: 24.69, lng: 46.72 };

beforeEach(() => apiFetch.mockReset());

describe('national address short code in the address picker (19.7)', () => {
  it('fills the street from Saudi Post and saves the code with the address', async () => {
    apiFetch.mockImplementation(async (path: string, init?: RequestInit) => (init?.method === 'POST' ? { id: 'new-1' } : FOUND));
    await render(wrap(<LocationPickerView />));
    await act(async () => fireEvent.changeText(screen.getByTestId('picker-short-address'), 'rrrd2929'));
    await act(async () => fireEvent.press(screen.getByTestId('picker-short-address-find')));
    await waitFor(() => expect(screen.getByText(en('picker.shortAddress.found'))).toBeTruthy());
    expect(apiFetch.mock.calls[0][0]).toBe('/national-address/lookup?code=rrrd2929');
    expect(screen.getByTestId('picker-street').props.value).toBe('Test street, Test district, Test city');

    await act(async () => fireEvent.press(screen.getByTestId('picker-save')));
    const post = apiFetch.mock.calls.find(([, init]) => init?.method === 'POST');
    expect(post[0]).toBe('/users/me/addresses');
    expect(JSON.parse(post[1].body)).toMatchObject({ short_address: 'RRRD2929', lat: 24.69, lng: 46.72, street: 'Test street, Test district, Test city' });
  });

  it.each([
    ['short_address_invalid', 'picker.shortAddress.invalid'],
    ['short_address_not_found', 'picker.shortAddress.notFound'],
    ['national_address_unavailable', 'picker.shortAddress.unavailable'],
  ])('says what went wrong for %s, without touching the address', async (code, key) => {
    apiFetch.mockRejectedValue(new Error(code));
    await render(wrap(<LocationPickerView />));
    await act(async () => fireEvent.changeText(screen.getByTestId('picker-short-address'), 'RRRD2929'));
    await act(async () => fireEvent.press(screen.getByTestId('picker-short-address-find')));
    await waitFor(() => expect(screen.getByText(en(key))).toBeTruthy());
    expect(screen.getByTestId('picker-street').props.value).toBe('');
  });

  it('saves without a code as before', async () => {
    apiFetch.mockResolvedValue({ id: 'new-2' });
    await render(wrap(<LocationPickerView />));
    await act(async () => fireEvent.changeText(screen.getByTestId('picker-street'), 'Test street'));
    await act(async () => fireEvent.press(screen.getByTestId('picker-save')));
    const post = apiFetch.mock.calls.find(([, init]) => init?.method === 'POST');
    expect(JSON.parse(post[1].body)).not.toHaveProperty('short_address');
  });
});
