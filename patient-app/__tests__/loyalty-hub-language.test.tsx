import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

/**
 * The loyalty hub in every language. The server sends the tier labels, perks and ways to earn as Arabic sentences
 * (GET /loyalty/config); the hub translated none of them, so an English, Urdu, Hindi, Bengali or Filipino patient
 * read Arabic in the middle of the screen. The REAL hub renders with the server's real config shape; only the
 * request, the router and the language are replaced.
 */
let mockLang = 'en';
const mockApiFetch = jest.fn();
jest.mock('react-native-localize', () => require('react-native-localize/mock'));
jest.mock('../src/utils/api', () => ({ apiFetch: (...a: unknown[]) => mockApiFetch(...a), newIdempotencyKey: () => 'k', BASE_URL: 'https://api.example.test/api/v1' }));
jest.mock('../src/utils/logger', () => ({ logError: jest.fn() }));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true, setParams: jest.fn() },
  Stack: { Screen: () => null },
  useLocalSearchParams: () => ({}),
  useFocusEffect: (cb: () => void | (() => void)) => {
    const R = require('react');
    R.useEffect(() => cb(), []); // eslint-disable-line react-hooks/exhaustive-deps
  },
}));
jest.mock('../src/context/AppContext', () => ({
  useApp: () => ({ isDark: false, lang: mockLang, isRTL: mockLang === 'ar' || mockLang === 'ur' }),
}));

import { LoyaltyHubView, earnText, perkText, tierName } from '../src/components/loyalty/LoyaltyHub';
import { message } from '../src/components/screen/ScreenKit';

// what loyalty.service.ts getConfig() returns today (tiers with perk_codes, earn_ways with their reason)
const TIERS = [
  { id: 'bronze', label: 'برونزي', minPts: 0, perks: ['5% كاشباك على الاستشارات', 'أولوية حجز عادية'], perk_codes: ['cashback_5_consult', 'priority_standard'] },
  { id: 'silver', label: 'فضي', minPts: 1001, perks: ['8% كاشباك', 'شحن مجاني من الصيدلية', 'أولوية حجز متقدمة'], perk_codes: ['cashback_8', 'free_pharmacy_shipping', 'priority_advanced'] },
];
const EARN = [
  { action: 'استشارة طبية مكتملة', reason: 'booking_completed', pts: '+50' },
  { action: 'تحدي صحي', reason: null, pts: 'حسب التحدي' },
];
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const ARABIC = /[؀-ۿ]/;

beforeEach(() => {
  jest.clearAllMocks();
  mockApiFetch.mockImplementation(async (path: string) => {
    if (path.startsWith('/loyalty/account')) return { points: 0, tier: 'bronze' };
    if (path.startsWith('/loyalty/transactions')) return { transactions: [] };
    if (path.startsWith('/loyalty/config')) return { tiers: TIERS, earn_ways: EARN };
    return [];
  });
});

describe('loyalty hub text by the server ids', () => {
  const k = (lang: string) => (key: string, vars?: Record<string, string | number>) => message(lang, key, vars);
  it('translates the tier, the perks and the ways to earn in every language', () => {
    for (const lang of ['ar', 'en', 'ur', 'hi', 'bn', 'fil']) {
      const t = k(lang);
      expect(tierName(t, TIERS[0])).not.toBe('loyalty.tier.bronze');
      expect(perkText(t, TIERS[1], 1)).not.toMatch(/^loyalty\./);
      expect(earnText(t, String, EARN[0] as never).title).not.toMatch(/^loyalty\./);
      expect(earnText(t, String, EARN[1] as never).caption).not.toMatch(/^loyalty\./);
    }
    expect(tierName(k('en'), TIERS[1])).toBe('Silver');
    expect(perkText(k('en'), TIERS[1], 1)).toBe('Free shipping from the pharmacy');
    expect(earnText(k('en'), String, EARN[1] as never)).toEqual({ title: 'Health challenge', caption: 'Varies by challenge' });
  });

  it('shows the server text for an id this app does not know yet', () => {
    const t = k('en');
    expect(tierName(t, { id: 'diamond', label: 'ماسي', minPts: 9 })).toBe('ماسي');
    expect(perkText(t, { id: 'diamond', label: 'x', minPts: 9, perks: ['ميزة جديدة'], perk_codes: ['brand_new'] }, 0)).toBe('ميزة جديدة');
    expect(earnText(t, String, { action: 'نشاط جديد', reason: 'brand_new', pts: '+5' }).title).toBe('نشاط جديد');
  });
});

describe('the loyalty hub screen', () => {
  it('has no Arabic on it for an English patient', async () => {
    mockLang = 'en';
    await render(<SafeAreaProvider initialMetrics={metrics}><LoyaltyHubView /></SafeAreaProvider>);
    expect(await screen.findByText('Bronze')).toBeTruthy();
    expect(await screen.findByText('Completed medical consultation')).toBeTruthy();
    expect(screen.getByText('Standard booking priority')).toBeTruthy();
    expect(screen.queryAllByText(ARABIC)).toHaveLength(0);
  });
});
