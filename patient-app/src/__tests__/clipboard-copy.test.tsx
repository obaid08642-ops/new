import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';

import { FamilyAddView } from '../components/family/FamilyAddView';
import { LoyaltyHubView } from '../components/loyalty/LoyaltyHub';
import { message } from '../components/screen/ScreenKit';

/**
 * Owner decision 5 (2026-10-10), issues #686 and #747: Copy is back for the family invite (link and code) and the referral
 * code. Proved with the clipboard mocked: the exact link or code is sent to `setStringAsync`, "Copied" shows only after
 * it accepted the text, and a refusal shows the error and never "Copied". Every value is a TEST value.
 */

const mockApiFetch = jest.fn();
const mockParams: { tab?: string } = {};
jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true), setParams: jest.fn() }, useLocalSearchParams: () => mockParams }));
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined }));
jest.mock('../context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'en', isRTL: false }) }));
jest.mock('../utils/api', () => ({ apiFetch: (...a: unknown[]) => mockApiFetch(...a), BASE_URL: 'https://api.example.test/api/v1' }));
jest.mock('../utils/logger', () => ({ logError: jest.fn() }));
jest.mock('../utils/isOffline', () => ({ isOffline: jest.fn(async () => false) }));

const k = (key: string) => message('en', key);
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const SLOW = { timeout: 4000 };
const wrap = (ui: React.ReactElement) => <SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>;
const setString = Clipboard.setStringAsync as jest.Mock;

function route(url: string) {
  if (url === '/family/invite') return Promise.resolve({ invite_code: 'TESTINV1' });
  if (url === '/loyalty/account') return Promise.resolve({ points: 500, tier: 'a' });
  if (url.startsWith('/loyalty/transactions')) return Promise.resolve({ transactions: [] });
  if (url === '/loyalty/config') return Promise.resolve({ tiers: [{ id: 'a', label: 'Test tier A', minPts: 0, perks: [] }], earn_ways: [] });
  if (url === '/loyalty/rewards' || url === '/loyalty/challenges') return Promise.resolve([]);
  if (url === '/referrals/my') return Promise.resolve({ code: 'TEST42', stats: { total: 0, registered: 0, rewarded: 0, earned_points: 0 }, invites: [] });
  return Promise.reject(new Error(`unexpected ${url}`));
}

beforeEach(() => {
  mockApiFetch.mockReset();
  mockApiFetch.mockImplementation(route);
  setString.mockReset();
  setString.mockResolvedValue(true);
  delete mockParams.tab;
});

describe('family invite copy', () => {
  it('copies the exact invite link and says Copied', async () => {
    await render(wrap(<FamilyAddView />));
    await act(async () => {
      fireEvent.press(await screen.findByTestId('invite-copy-link', {}, SLOW));
    });
    expect(setString).toHaveBeenCalledWith('https://nabdahplus.app/join/TESTINV1');
    expect(screen.getByText(k('common.copied'))).toBeTruthy();
  });

  it('copies the bare code from the Code method', async () => {
    await render(wrap(<FamilyAddView />));
    await act(async () => {
      fireEvent.press(await screen.findByText(k('family.invite.code'), {}, SLOW));
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId('invite-copy-code'));
    });
    expect(setString).toHaveBeenCalledWith('TESTINV1');
    expect(screen.getByText(k('common.copied'))).toBeTruthy();
  });

  it('shows the error and never Copied when the clipboard throws', async () => {
    setString.mockRejectedValue(new Error('denied'));
    await render(wrap(<FamilyAddView />));
    await act(async () => {
      fireEvent.press(await screen.findByTestId('invite-copy-link', {}, SLOW));
    });
    expect(screen.getByText(k('common.copyFailed'))).toBeTruthy();
    expect(screen.queryByText(k('common.copied'))).toBeNull();
  });
});

describe('referral code copy', () => {
  it('copies the exact referral code and says Copied', async () => {
    mockParams.tab = 'invite';
    await render(wrap(<LoyaltyHubView />));
    await screen.findByText('TEST42', {}, SLOW);
    await act(async () => {
      fireEvent.press(screen.getByTestId('loyalty-copy'));
    });
    expect(setString).toHaveBeenCalledWith('TEST42');
    expect(screen.getByText(k('common.copied'))).toBeTruthy();
  });

  it('shows the error when the clipboard refuses the text', async () => {
    setString.mockResolvedValue(false);
    mockParams.tab = 'invite';
    await render(wrap(<LoyaltyHubView />));
    await screen.findByText('TEST42', {}, SLOW);
    await act(async () => {
      fireEvent.press(screen.getByTestId('loyalty-copy'));
    });
    expect(screen.getByText(k('common.copyFailed'))).toBeTruthy();
    expect(screen.queryByText(k('common.copied'))).toBeNull();
  });
});
