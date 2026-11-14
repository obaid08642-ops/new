import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import InsuranceHubScreen from '../../../app/insurance';
import { message } from '../../components/screen/ScreenKit';

/**
 * PT-18: edit the saved policy from the hub (POST /users/me/insurance, the server merges into the saved record and always
 * answers verified:false). Every value is a TEST value. What is proved: the sheet starts from the saved number and member
 * id; the changed fields are what is sent, with the saved class kept; a missing insurer or number sends nothing; a bad
 * copay figure sends nothing; a failed save says so and keeps the sheet; a successful save reloads the policy; the card shows
 * "in review" when the server says the policy is not verified, and "verified" when it is.
 */
const mockApiFetch = jest.fn();
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

const k = (key: string) => message('en', key);
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const wrap = (ui: React.ReactElement) => <SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>;
const tap = async (el: Parameters<typeof fireEvent.press>[0]) => { await act(async () => { fireEvent.press(el); }); };
const saves = () => mockApiFetch.mock.calls.filter(([p, init]) => p === '/users/me/insurance' && init?.method === 'POST');

let policy: Record<string, unknown>;
let saveFails: boolean;

beforeEach(() => {
  mockApiFetch.mockReset();
  saveFails = false;
  policy = { provider: 'TEST insurer', provider_name: 'TEST insurer', policy_number: 'TEST-123', member_id: 'M-1', class: 'B', verified: true };
  mockApiFetch.mockImplementation(async (path: string, init?: { method?: string; body?: string }) => {
    if (path === '/users/me/insurance' && init?.method === 'POST') {
      if (saveFails) throw new Error('boom');
      const body = JSON.parse(init.body ?? '{}');
      policy = { ...policy, ...body, verified: false };
      return { success: true, verified: false };
    }
    if (path === '/users/me/insurance') return policy;
    if (path === '/insurance/requests/my') return [];
    if (path === '/config') return {};
    if (path === '/insurance/companies') return [{ id: 'c1', code: 'tst', name_en: 'TEST company' }];
    if (path === '/insurance/companies/c1/networks') return [];
    throw new Error(`unexpected ${path}`);
  });
});

const openSheet = async () => {
  await render(wrap(<InsuranceHubScreen />));
  await tap(await screen.findByTestId('policy-change'));
  await screen.findByTestId('insurer-tst'.replace('tst', 'c1'));
};

describe('edit the saved policy', () => {
  it('starts from the saved number and member id', async () => {
    await openSheet();
    expect(screen.getByTestId('insurer-policy').props.value).toBe('TEST-123');
    expect(screen.getByTestId('insurer-member').props.value).toBe('M-1');
  });

  it('sends the changed number to the policy endpoint and keeps the saved class', async () => {
    await openSheet();
    await tap(screen.getByTestId('insurer-c1'));
    await act(async () => { fireEvent.changeText(screen.getByTestId('insurer-policy'), 'TEST-456'); });
    await tap(screen.getByTestId('insurer-sheet-save'));
    await waitFor(() => expect(saves()).toHaveLength(1));
    expect(JSON.parse(saves()[0][1].body)).toMatchObject({ provider: 'tst', policy_number: 'TEST-456', member_id: 'M-1', class: 'B' });
    // the policy is read again after the save, and the server reset the verification
    expect(await screen.findByText(k('insurance.policy.inReview'))).toBeTruthy();
  });

  it('sends nothing without an insurer, and says what is missing', async () => {
    await openSheet();
    await tap(screen.getByTestId('insurer-sheet-save'));
    expect(await screen.findByText(k('insurance.insurer.required'))).toBeTruthy();
    expect(saves()).toHaveLength(0);
  });

  it('sends nothing when the policy number is cleared', async () => {
    await openSheet();
    await tap(screen.getByTestId('insurer-c1'));
    await act(async () => { fireEvent.changeText(screen.getByTestId('insurer-policy'), '   '); });
    await tap(screen.getByTestId('insurer-sheet-save'));
    expect(await screen.findByText(k('insurance.insurer.required'))).toBeTruthy();
    expect(saves()).toHaveLength(0);
  });

  it('sends nothing for a copay percent above 100', async () => {
    await openSheet();
    await tap(screen.getByTestId('insurer-c1'));
    await act(async () => { fireEvent.changeText(screen.getByTestId('insurer-copay-percent'), '150'); });
    await tap(screen.getByTestId('insurer-sheet-save'));
    expect(saves()).toHaveLength(0);
  });

  it('a failed save shows the error copy and the sheet stays', async () => {
    saveFails = true;
    await openSheet();
    await tap(screen.getByTestId('insurer-c1'));
    await tap(screen.getByTestId('insurer-sheet-save'));
    expect(await screen.findByText(k('insurance.insurer.failed'))).toBeTruthy();
    expect(screen.getByTestId('insurer-sheet')).toBeTruthy();
  });
});

describe('the policy card states', () => {
  it('shows verified for a verified policy', async () => {
    await render(wrap(<InsuranceHubScreen />));
    expect(await screen.findByText(k('insurance.policy.verified'))).toBeTruthy();
    expect(screen.queryByText(k('insurance.policy.inReview'))).toBeNull();
  });
});
