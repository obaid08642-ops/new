import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import HomeScreen from '../app/(tabs)/index';
import HomeSections from '../src/components/HomeSections';
import { apiFetch } from '../src/utils/api';
import { makeStore, withStore } from '../src/__tests__/utils/testStore';
import { HomeTopRow } from '../src/components/home/HomeTopRow';
import { setUnreadCount } from '../src/store/slices/notificationsSlice';

/**
 * Batch 0 fixes, Home: the bell's dot, the "details" button, the greeting name, the points card, the curated
 * links. Fixtures are the shapes the backend answers (checked against the seeded backend), kept in the tests only.
 */

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
jest.mock('expo-router', () => {
  const React = require('react');
  return {
    get router() {
      return mockRouter;
    },
    useFocusEffect: (effect: () => void | (() => void)) => React.useEffect(effect, []),
  };
});
jest.mock('react-native-localize', () => ({ getLocales: () => [{ languageCode: 'ar' }] }));
jest.mock('../src/utils/api', () => ({ apiFetch: jest.fn() }));
jest.mock('../src/components/NabdLogo', () => ({ NabdLogo: () => null }));
let mockLang = 'ar';
jest.mock('../src/context/AppContext', () => {
  const real = jest.requireActual('../src/context/AppContext');
  return {
    LANGUAGES: real.LANGUAGES,
    useApp: () => ({ isDark: false, lang: mockLang, isRTL: mockLang === 'ar' || mockLang === 'ur', toggleTheme: jest.fn(), setLang: jest.fn() }),
  };
});

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const mountHome = (store = makeStore()) => ({ store, ui: withStore(<SafeAreaProvider initialMetrics={metrics}><HomeScreen /></SafeAreaProvider>, store) });

type Answers = Record<string, unknown>;
/** A fake backend: each path answers its fixture, a path with no fixture fails like an unreachable call. */
const backend = (answers: Answers) =>
  (apiFetch as jest.Mock).mockImplementation(async (path: string) => {
    const key = Object.keys(answers).find((k) => path === k || path.startsWith(`${k}?`));
    if (key === undefined) throw new Error('unreachable');
    const value = answers[key];
    if (value instanceof Error) throw value;
    return value;
  });

const APPOINTMENT = { id: 'a-77', doctorName: 'د. سارة', type: 'فيديو', time: '10:30', date: '2026-10-08' };
const ROWS = (read: boolean[]) => read.map((r, i) => ({ id: `n${i}`, type: 'info', title: 't', body: 'b', read: r }));
const baseAnswers = (extra: Answers = {}): Answers => ({
  '/users/me/display': { display_name: 'أحمد السالم', avatar_url: null, locale: 'ar' },
  '/health/reminders': [],
  '/nutrition/daily-summary': {},
  '/maternity/profile': {},
  '/mental-health/mood': [],
  '/health/vitals/summary': [],
  '/home/upcoming-appointment': null,
  '/notifications': [],
  '/loyalty/account': { points: 0, lifetime_points: 0, tier: 'bronze' },
  '/content/home': { sections: [] },
  ...extra,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockLang = 'ar';
});

describe('Home: what it calls', () => {
  it('reads the name from /users/me/display, the unread rows from /notifications and the points from /loyalty/account', async () => {
    backend(baseAnswers());
    await render(mountHome().ui);
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/users/me/display'));
    const paths = (apiFetch as jest.Mock).mock.calls.map((c) => c[0]);
    expect(paths).toEqual(expect.arrayContaining(['/notifications', '/loyalty/account']));
    expect(paths).not.toContain('/users/me/profile'); // its full_name is empty for a registered patient
  });
});

describe('Home: the bell\'s unread dot', () => {
  it('counts the unread rows the server sent', async () => {
    backend(baseAnswers({ '/notifications': ROWS([false, true, false]) }));
    const { store, ui } = mountHome();
    await render(ui);
    await waitFor(() => expect(store.getState().notifications.unreadCount).toBe(2));
  });

  it('is zero when everything is read', async () => {
    backend(baseAnswers({ '/notifications': ROWS([true]) }));
    const { store, ui } = mountHome();
    store.dispatch(setUnreadCount(7)); // a stale value from before
    await render(ui);
    await waitFor(() => expect(store.getState().notifications.unreadCount).toBe(0));
  });

  it('is unknown (null) when the call failed: a stale count is not kept', async () => {
    backend(baseAnswers({ '/notifications': new Error('boom') }));
    const { store, ui } = mountHome();
    store.dispatch(setUnreadCount(7));
    await render(ui);
    await waitFor(() => expect(store.getState().notifications.unreadCount).toBeNull());
  });

  it.each([
    [3, true],
    [1, true],
    [0, false],
    [null, false],
  ])('the bell with count %p draws its dot: %p (only a known count above zero)', async (unread, expected) => {
    const store = makeStore();
    store.dispatch(setUnreadCount(unread));
    await render(withStore(<SafeAreaProvider initialMetrics={metrics}><HomeTopRow name={null} /></SafeAreaProvider>, store));
    expect(screen.queryByTestId('home-bell-dot', { includeHiddenElements: true }) !== null).toBe(expected);
  });
});

describe('Home: next appointment "details"', () => {
  it('opens the appointment screen with the parameter it reads (appointmentId, not id)', async () => {
    backend(baseAnswers({ '/home/upcoming-appointment': APPOINTMENT }));
    await render(mountHome().ui);
    const details = await screen.findByText('التفاصيل');
    await fireEvent.press(details);
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/consultations/appointment-detail', params: { appointmentId: 'a-77' } });
  });
});

describe('Home: greeting name', () => {
  it('shows the name from the user record', async () => {
    backend(baseAnswers());
    await render(mountHome().ui);
    expect(await screen.findByText(/أحمد/)).toBeTruthy();
  });

  it.each([
    ['has none', { display_name: '' }],
    ['answers with something that is not a name', { display_name: 12 }],
    ['fails (a guest, or an unreachable server)', new Error('401')],
  ])('hides the name when the endpoint %s', async (_label, answer) => {
    backend(baseAnswers({ '/users/me/display': answer }));
    await render(mountHome().ui);
    await screen.findByText('تخصم حتى ١٠٪ من قيمة طلبك'); // the screen has loaded
    expect(screen.queryByText(/أحمد/)).toBeNull();
  });
});

describe('Home: points card', () => {
  it('shows the real balance and keeps the product rule sentence', async () => {
    backend(baseAnswers({ '/loyalty/account': { points: 1250, tier: 'silver' } }));
    await render(mountHome().ui);
    expect(await screen.findByText(`رصيدك: ${new Intl.NumberFormat('ar').format(1250)} نقطة`)).toBeTruthy();
    expect(screen.getByText('تخصم حتى ١٠٪ من قيمة طلبك')).toBeTruthy();
  });

  it('a zero balance is shown as zero (it is a number the API returned)', async () => {
    backend(baseAnswers());
    await render(mountHome().ui);
    expect(await screen.findByText(`رصيدك: ${new Intl.NumberFormat('ar').format(0)} نقطة`)).toBeTruthy();
  });

  it('shows no number when the API gave none or failed: only the title and the rule', async () => {
    backend(baseAnswers({ '/loyalty/account': new Error('503') }));
    await render(mountHome().ui);
    expect(await screen.findByText('نقاط نبض+')).toBeTruthy();
    expect(screen.queryByText(/رصيدك/)).toBeNull();
    expect(screen.getByText('تخصم حتى ١٠٪ من قيمة طلبك')).toBeTruthy();
  });

  it('a balance is formatted in the reader\'s language (English)', async () => {
    mockLang = 'en';
    backend(baseAnswers({ '/loyalty/account': { points: 1250 } }));
    await render(mountHome().ui);
    expect(await screen.findByText('Your balance: 1,250 points')).toBeTruthy();
  });

  it('a non-numeric points value is not shown', async () => {
    backend(baseAnswers({ '/loyalty/account': { points: '12' } }));
    await render(mountHome().ui);
    expect(await screen.findByText('نقاط نبض+')).toBeTruthy();
    expect(screen.queryByText(/رصيدك/)).toBeNull();
  });
});

describe('Home: curated sections open known internal routes only', () => {
  const section = (deepLink: string | undefined) => ({
    sections: [{ id: 's1', title_ar: 'عروض', enabled: true, items: [{ id: 'i1', title_ar: 'بطاقة', deep_link: deepLink }] }],
  });
  const tap = async (deepLink: string | undefined) => {
    backend({ '/content/home': section(deepLink) });
    await render(<SafeAreaProvider initialMetrics={metrics}><HomeSections /></SafeAreaProvider>);
    const card = await screen.findByLabelText('بطاقة');
    await fireEvent.press(card);
  };

  it('a known app route opens', async () => {
    await tap('/offers/abc');
    expect(mockRouter.push).toHaveBeenCalledWith('/offers/abc');
  });

  it.each(['https://evil.example', '//evil.example', 'javascript:alert(1)', '/no-such-section/1', 'offers/abc'])('%s does nothing', async (link) => {
    await tap(link);
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it('a card with no link does nothing and is not announced as a link', async () => {
    await tap(undefined);
    expect(mockRouter.push).not.toHaveBeenCalled();
    expect(screen.getByLabelText('بطاقة').props.accessibilityRole).toBeUndefined();
  });

  it('the card title follows the app language: the English title when there is one, else the Arabic', async () => {
    mockLang = 'en';
    backend({ '/content/home': { sections: [{ id: 's1', title_ar: 'عروض', title_en: 'Offers', enabled: true, items: [{ id: 'i1', title_ar: 'بطاقة', title_en: 'Card', deep_link: '/offers/1' }, { id: 'i2', title_ar: 'بلا إنجليزي' }] }] } });
    await render(<SafeAreaProvider initialMetrics={metrics}><HomeSections /></SafeAreaProvider>);
    expect(await screen.findByLabelText('Card')).toBeTruthy();
    expect(screen.getByLabelText('بلا إنجليزي')).toBeTruthy();
  });
});
