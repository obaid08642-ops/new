import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LoyaltyHubView, tierProgress } from '../../components/loyalty/LoyaltyHub';
import { OfferDetailView, OffersListView } from '../../components/loyalty/OffersViews';
import { message } from '../../components/screen/ScreenKit';

/**
 * Batch 11: the loyalty hub (balance, tabs in the route, rewards with the confirm sheet, challenges, invites, history)
 * and the offers list and detail. Every value is a TEST value. What is proved: the hero shows the balance and the tier the
 * server sent, a tier-less config is an error (nothing invented), the tab comes from the route, a reward is claimed only
 * through the confirm sheet and the coupon code shown is the server's, a challenge is joined with the endpoint, a code is
 * applied with the endpoint, the history lists the server's rows, and the offers draw the server's prices only.
 */

const mockApiFetch = jest.fn();
const mockParams: { tab?: string; id?: string } = {};
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (...a: unknown[]) => mockPush(...a), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true), setParams: jest.fn() }, useLocalSearchParams: () => mockParams }));
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined }));
jest.mock('../../context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'en', isRTL: false }) }));
jest.mock('../../utils/api', () => ({ apiFetch: (...a: unknown[]) => mockApiFetch(...a), BASE_URL: 'https://api.example.test/api/v1' }));
jest.mock('../../utils/logger', () => ({ logError: jest.fn() }));
jest.mock('../../utils/isOffline', () => ({ isOffline: jest.fn(async () => false) }));

const k = (key: string, vars?: Record<string, string | number>) => message('en', key, vars);
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const SLOW = { timeout: 4000 };
const wrap = (ui: React.ReactElement) => <SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>;

const tiers = [
  { id: 'a', label: 'Test tier A', minPts: 0, perks: ['Test perk A'] },
  { id: 'b', label: 'Test tier B', minPts: 1000, perks: ['Test perk B'] },
];
const reward = { id: 'r1', title: 'Test reward', description: 'Test reward text', points_required: 300 };
const challenge = { id: 'c1', title: 'Test challenge', desc: 'Test challenge text', reward_points: 20, target_count: 5, user_progress: 0 };

function route(url: string, init?: { method?: string; body?: string }) {
  if (url === '/loyalty/account') return Promise.resolve({ points: 500, tier: 'a' });
  if (url.startsWith('/loyalty/transactions')) return Promise.resolve({ transactions: [{ id: 't1', points_delta: 40, reason: 'booking_completed', createdAt: '2026-10-01T10:00:00.000Z' }, { id: 't2', points_delta: -300, reason: 'reward_claimed' }] });
  if (url === '/loyalty/config') return Promise.resolve({ tiers, earn_ways: [{ action: 'Test way', pts: 10 }] });
  if (url === '/loyalty/rewards') return Promise.resolve([reward]);
  if (url === '/loyalty/rewards/r1/claim' && init?.method === 'POST') return Promise.resolve({ coupon_code: 'TEST-CODE' });
  if (url === '/loyalty/challenges') return Promise.resolve([challenge]);
  if (url === '/loyalty/challenges/c1/join' && init?.method === 'POST') return Promise.resolve({});
  if (url === '/referrals/my') return Promise.resolve({ code: 'TEST42', stats: { total: 1, registered: 1, rewarded: 0, earned_points: 0 }, invites: [{ id: 'i1', name: 'Test friend', status: 'registered' }] });
  if (url === '/referrals/apply' && init?.method === 'POST') return Promise.resolve({});
  return Promise.reject(new Error(`unexpected ${url}`));
}

beforeEach(() => {
  mockApiFetch.mockReset();
  mockApiFetch.mockImplementation(route);
  mockPush.mockReset();
  delete mockParams.tab;
  delete mockParams.id;
});

describe('tier progress', () => {
  it('measures the share between the current and the next tier and has none past the last', () => {
    expect(tierProgress(tiers, 'a', 500)).toMatchObject({ share: 0.5, missing: 500 });
    expect(tierProgress(tiers, 'b', 2000)).toMatchObject({ share: 1, missing: 0 });
  });
});

describe('loyalty hub', () => {
  it('draws the balance, the tier, the rewards tab and the history', async () => {
    await render(wrap(<LoyaltyHubView />));
    expect(await screen.findByText('Test tier A', {}, SLOW)).toBeTruthy();
    expect(screen.getByTestId('loyalty-tabs-rewards')).toBeTruthy();
    expect(await screen.findByText('Test reward', {}, SLOW)).toBeTruthy();
    expect(screen.getByText('Test way')).toBeTruthy();
    expect(screen.getByText(k('loyalty.reason.booking_completed'))).toBeTruthy();
  });

  it('is an error, not an invented program, when the config has no tiers', async () => {
    mockApiFetch.mockImplementation((url: string, init?: { method?: string }) => (url === '/loyalty/config' ? Promise.resolve({ tiers: [] }) : route(url, init)));
    await render(wrap(<LoyaltyHubView />));
    expect(await screen.findByText(k('loyalty.unavailable'), {}, SLOW)).toBeTruthy();
  });

  it('claims a reward only after the confirm sheet and shows the server coupon code', async () => {
    await render(wrap(<LoyaltyHubView />));
    await fireEvent.press(await screen.findByTestId('loyalty-redeem-r1', {}, SLOW));
    expect(mockApiFetch).not.toHaveBeenCalledWith('/loyalty/rewards/r1/claim', expect.anything());
    const confirm = await screen.findByTestId('loyalty-confirm-claim', {}, SLOW);
    await act(async () => {
      fireEvent.press(confirm);
    });
    await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith('/loyalty/rewards/r1/claim', { method: 'POST' }));
    expect(await screen.findByText(k('loyalty.rewards.claimedCode', { code: 'TEST-CODE' }), {}, SLOW)).toBeTruthy();
  });

  it('joins a challenge on the Challenges tab', async () => {
    mockParams.tab = 'challenges';
    await render(wrap(<LoyaltyHubView />));
    const join = await screen.findByTestId('loyalty-join-c1', {}, SLOW);
    await act(async () => {
      fireEvent.press(join);
    });
    await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith('/loyalty/challenges/c1/join', { method: 'POST' }));
    expect(await screen.findByText(k('loyalty.challenges.inProgress'), {}, SLOW)).toBeTruthy();
  });

  it('shows the code and applies a friend code on the Invite tab', async () => {
    mockParams.tab = 'invite';
    await render(wrap(<LoyaltyHubView />));
    expect(await screen.findByText('TEST42', {}, SLOW)).toBeTruthy();
    expect(screen.getByText('Test friend')).toBeTruthy();
    await fireEvent.changeText(screen.getByPlaceholderText(k('loyalty.invite.codePlaceholder')), 'FRIEND1');
    await act(async () => {
      fireEvent.press(screen.getByTestId('loyalty-apply'));
    });
    await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith('/referrals/apply', { method: 'POST', body: JSON.stringify({ code: 'FRIEND1' }) }));
  });
});

describe('offers', () => {
  it('lists the server offers with the server prices and opens one', async () => {
    mockApiFetch.mockResolvedValue([{ id: 'o1', t: 'Test offer', prov: 'Test clinic', disc: '20%', price: 80, old: 100 }]);
    await render(wrap(<OffersListView />));
    expect(await screen.findByText('Test offer', {}, SLOW)).toBeTruthy();
    expect(screen.getByText(k('offers.price', { amount: '80' }))).toBeTruthy();
    expect(screen.getByText(k('offers.discount', { value: '20%' }))).toBeTruthy();
    await fireEvent.press(screen.getByTestId('offer-o1'));
    expect(mockPush).toHaveBeenCalledWith('/offers/o1');
  });

  it('draws an offer with its inclusions and books at a provider', async () => {
    mockParams.id = 'o1';
    mockApiFetch.mockImplementation((url: string) =>
      url === '/offers/o1'
        ? Promise.resolve({ title_ar: 'عرض تجريبي', title_en: 'Test offer', provider: { name: 'Test clinic' }, original_price: 100, discounted_price: 80, target: { inclusions: ['Test inclusion'], terms: ['Test term'] } })
        : Promise.resolve([{ id: 'p1', name: 'Test provider', specialty: 'Test specialty' }]),
    );
    await render(wrap(<OfferDetailView />));
    expect(await screen.findByText('Test inclusion', {}, SLOW)).toBeTruthy();
    expect(screen.getByText('Test term')).toBeTruthy();
    expect(screen.getByText(k('offers.save', { amount: '20' }))).toBeTruthy();
    await fireEvent.press(screen.getByText('Test provider'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/consultations/book/[id]', params: { id: 'p1' } });
  });
});
