import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import InsuranceHubScreen from '../../../app/insurance';
import InsuranceSubmitClaimRedirect from '../../../app/insurance/submit-claim';
import { INSURANCE_TABS } from '../../components/insurance/InsuranceKit';
import { message } from '../../components/screen/ScreenKit';

/**
 * Owner decision 35 (2026-10-10): insurance is view-only and relay-only. Proved: the hub has the tabs policy, benefits and
 * network and no claims or refunds tab or shortcut, it reads no claims endpoint, and the old claim route opens the hub.
 * Every value is a TEST value.
 */

const mockApiFetch = jest.fn();
const mockRedirect = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true), setParams: jest.fn() },
  useLocalSearchParams: () => ({ tab: 'claims' }),
  Redirect: (props: { href: string }) => {
    mockRedirect(props.href);
    return null;
  },
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

beforeEach(() => {
  mockApiFetch.mockReset();
  mockRedirect.mockReset();
  mockApiFetch.mockImplementation(async (path: string) => {
    if (path === '/users/me/insurance') return { provider: 'TEST insurer', policy_number: 'TEST-123' };
    if (path === '/insurance/requests/my') return [];
    throw new Error(`unexpected ${path}`);
  });
});

describe('the insurance hub without claims', () => {
  it('has the tabs policy, benefits and network only', () => {
    expect([...INSURANCE_TABS]).toEqual(['policy', 'benefits', 'network']);
  });

  it('an old ?tab=claims link shows the policy tab, with no claims or refunds tab or shortcut, and reads no claim', async () => {
    await render(wrap(<InsuranceHubScreen />));
    expect(await screen.findByTestId('policy-card')).toBeTruthy();
    expect(screen.getByText(k('insurance.tab.policy'))).toBeTruthy();
    expect(screen.getByText(k('insurance.tab.benefits'))).toBeTruthy();
    expect(screen.getByText(k('insurance.tab.network'))).toBeTruthy();
    expect(screen.queryByTestId('tile-claim')).toBeNull();
    expect(screen.queryByTestId('claims-list')).toBeNull();
    const paths = mockApiFetch.mock.calls.map((call) => String(call[0]));
    expect(paths.some((path) => path.includes('/claims') || path.includes('/refunds'))).toBe(false);
  });

  it('the removed claim route opens the hub', async () => {
    await render(<InsuranceSubmitClaimRedirect />);
    expect(mockRedirect).toHaveBeenLastCalledWith('/insurance');
  });
});
