import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SleepView } from '../components/health/SleepView';
import { message } from '../components/screen/ScreenKit';

/**
 * Decision B8 (2026-10-15): the sleep screen carries no fixed medical tips; its advice is the published articles tagged
 * "sleep" from the content API, or nothing when there are none. Boundaries only: the API, the router and the app context.
 */
jest.mock('expo-router', () => {
  const R = require('react');
  return {
    router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true), setParams: jest.fn() },
    useLocalSearchParams: () => ({}),
    useFocusEffect: (cb: () => void | (() => void)) => R.useEffect(cb, [cb]),
  };
});
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined, getCalendar: () => 'gregorian' }));
jest.mock('../context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'en', isRTL: false }) }));
jest.mock('../utils/isOffline', () => ({ isOffline: jest.fn(async () => false) }));
jest.mock('../utils/logger', () => ({ logError: jest.fn() }));
jest.mock('../utils/api', () => ({ BASE_URL: 'https://api.example.test/api/v1', R2_PUBLIC_URL: 'https://cdn.example.test', apiFetch: jest.fn(), newIdempotencyKey: jest.fn(() => 'k') }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { apiFetch } = require('../utils/api') as { apiFetch: jest.Mock };
const k = (key: string) => message('en', key);
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const wrap = (ui: React.ReactElement) => <SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>;
const answer = (articles: unknown[]) =>
  apiFetch.mockImplementation(async (path: string) => (path.startsWith('/articles') ? articles : []));

beforeEach(() => apiFetch.mockReset());

describe('sleep advice comes from the published sleep articles (decision B8)', () => {
  it('lists the articles tagged sleep under the advice heading', async () => {
    answer([{ id: 'a1', slug: 'sleep-hygiene', title_en: 'Sleep hygiene', title_ar: 'نوم صحي', category: 'sleep' }]);
    await render(wrap(<SleepView />));
    await screen.findByText(k('health.sleep.tips'));
    expect(apiFetch).toHaveBeenCalledWith('/articles?tag=sleep&limit=4');
    expect(screen.getByTestId('sleep-article-sleep-hygiene')).toBeTruthy();
  });

  it('shows no advice section when no sleep article is published', async () => {
    answer([]);
    await render(wrap(<SleepView />));
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/articles?tag=sleep&limit=4'));
    expect(screen.queryByText(k('health.sleep.tips'))).toBeNull();
  });
});
