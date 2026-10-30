import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import InsuranceHubScreen from '../../../app/insurance';

/** QA I-03: the policy card is deleted with DELETE /users/me/insurance after a confirm; a failure shows the error and keeps the button. Every value is a TEST value. */

const mockApiFetch = jest.fn();
const mockAlert = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true), setParams: jest.fn() },
  useLocalSearchParams: () => ({ tab: 'policy' }),
  Redirect: () => null,
}));
jest.mock('react-native-webview', () => ({ WebView: () => null }));
jest.mock('expo-image-picker', () => ({}));
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined }));
jest.mock('../../context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'en', isRTL: false }) }));
jest.mock('../../hooks/useGuestGuard', () => ({ useGuestGuard: () => ({ isGuest: false, requireAuth: jest.fn() }) }));
jest.mock('../../utils/api', () => ({ apiFetch: (...a: unknown[]) => mockApiFetch(...a), BASE_URL: 'https://api.example.test/api/v1' }));
jest.mock('../../utils/logger', () => ({ logError: jest.fn() }));
jest.mock('../../utils/isOffline', () => ({ isOffline: jest.fn(async () => false) }));
jest.mock('../../components/LocalizedAlert', () => ({ showLocalizedAlert: (...a: unknown[]) => mockAlert(...a) }));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const wrap = (ui: React.ReactElement) => <SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>;
let policy: object | null;
let deleteFails: boolean;

beforeEach(() => {
  mockApiFetch.mockReset();
  mockAlert.mockReset();
  policy = { provider: 'TEST insurer', policy_number: 'TEST-123' };
  deleteFails = false;
  mockApiFetch.mockImplementation(async (path: string, init?: { method?: string }) => {
    if (path === '/users/me/insurance' && init?.method === 'DELETE') {
      if (deleteFails) throw new Error('boom');
      policy = null;
      return { success: true, removed: true };
    }
    if (path === '/users/me/insurance') return policy;
    if (path === '/insurance/requests/my') return [];
    if (path === '/config') return {};
    throw new Error(`unexpected ${path}`);
  });
});

const confirm = () => mockAlert.mock.calls[0][2].find((b: { style?: string }) => b.style === 'destructive');

describe('delete the insurance card', () => {
  it('asks first and sends nothing until the destructive button is pressed', async () => {
    await render(wrap(<InsuranceHubScreen />));
    await act(async () => { fireEvent.press(await screen.findByTestId('policy-delete')); });
    expect(mockAlert).toHaveBeenCalledTimes(1);
    expect(mockApiFetch.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(false);
  });
  it('deletes and shows the card as gone', async () => {
    await render(wrap(<InsuranceHubScreen />));
    await act(async () => { fireEvent.press(await screen.findByTestId('policy-delete')); });
    await act(async () => { await confirm().onPress(); });
    await waitFor(() => expect(screen.getByTestId('policy-none')).toBeTruthy());
    expect(screen.getByTestId('policy-deleted')).toBeTruthy();
    expect(screen.queryByTestId('policy-delete')).toBeNull();
  });
  it('shows the error and keeps the card when the delete fails', async () => {
    deleteFails = true;
    await render(wrap(<InsuranceHubScreen />));
    await act(async () => { fireEvent.press(await screen.findByTestId('policy-delete')); });
    await act(async () => { await confirm().onPress(); });
    expect(await screen.findByTestId('policy-delete-failed')).toBeTruthy();
    expect(screen.getByTestId('policy-delete')).toBeTruthy();
  });
});
