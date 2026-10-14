import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AddressBookView } from '../../components/account/AddressBookView';
import { translations } from '../../i18n';

/** Item 769: the address book edits (PATCH) and deletes (DELETE, after a confirm) a saved address. Every value is a TEST value. */

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true), setParams: jest.fn() },
  useLocalSearchParams: () => ({}),
  useFocusEffect: (cb: () => void | (() => void)) => require('react').useEffect(cb, [cb]),
}));
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined, getCalendar: () => 'gregorian' }));
jest.mock('../../context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'en', isRTL: false }) }));
jest.mock('../../utils/logger', () => ({ logError: jest.fn() }));
jest.mock('../../utils/isOffline', () => ({ isOffline: jest.fn(async () => false) }));
jest.mock('../../utils/api', () => ({ BASE_URL: 'https://api.example.test/api/v1', R2_PUBLIC_URL: 'https://cdn.example.test', apiFetch: jest.fn() }));
jest.mock('../../components/LocalizedAlert', () => ({ showLocalizedAlert: jest.fn() }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { apiFetch } = require('../../utils/api') as { apiFetch: jest.Mock };
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { showLocalizedAlert } = require('../../components/LocalizedAlert') as { showLocalizedAlert: jest.Mock };
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const wrap = (ui: React.ReactElement) => <SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>;
const ROWS = [{ id: 'a1', label: 'Test home', street: 'Test street 1', lat: 24.7, lng: 46.6, is_default: true }];

beforeEach(() => {
  apiFetch.mockReset();
  showLocalizedAlert.mockReset();
  apiFetch.mockImplementation(async (_path: string, init?: RequestInit) => (init?.method ? { ok: true } : ROWS));
});

describe('address book edit and delete (769)', () => {
  it('saves an edited address with PATCH', async () => {
    await render(wrap(<AddressBookView />));
    await act(async () => {
      fireEvent.press(await screen.findByTestId('address-edit-a1'));
    });
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('address-edit-street'), 'Test street 2');
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId('address-edit-save'));
    });
    await waitFor(() => expect(apiFetch.mock.calls.some(([, init]) => init?.method === 'PATCH')).toBe(true));
    const patch = apiFetch.mock.calls.find(([, init]) => init?.method === 'PATCH');
    expect(patch[0]).toBe('/users/me/addresses/a1');
    expect(JSON.parse(patch[1].body)).toMatchObject({ street: 'Test street 2', label: 'Test home' });
  });

  it('asks before deleting and then calls DELETE', async () => {
    await render(wrap(<AddressBookView />));
    await act(async () => {
      fireEvent.press(await screen.findByTestId('address-delete-a1'));
    });
    expect(showLocalizedAlert).toHaveBeenCalledTimes(1);
    expect(apiFetch.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(false);
    const buttons = showLocalizedAlert.mock.calls[0][2] as Array<{ style?: string; onPress?: () => Promise<void> }>;
    await act(async () => {
      await buttons.find((b) => b.style === 'destructive')?.onPress?.();
    });
    expect(apiFetch).toHaveBeenCalledWith('/users/me/addresses/a1', { method: 'DELETE' });
  });

  it('has a real translation of every new key in all six languages', () => {
    const bucket = translations as unknown as Record<string, Record<string, string>>;
    for (const lang of ['ar', 'en', 'ur', 'hi', 'bn', 'fil']) {
      for (const key of ['edit', 'delete', 'deleteTitle', 'deleteBody', 'deleteCancel', 'deleteFailed', 'editTitle', 'editSave', 'editFailed']) {
        expect(bucket[lang]?.[`address.${key}`]?.trim()).toBeTruthy();
      }
    }
  });
});
