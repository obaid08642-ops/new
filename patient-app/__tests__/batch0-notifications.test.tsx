import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import NotificationsScreen from '../app/notifications/index';
import { apiFetch } from '../src/utils/api';
import { isOffline } from '../src/utils/isOffline';
import { buildFeed, isToday, mapNotification, relativeTime, type RawNotification } from '../src/utils/notificationsFeed';
import { autoTranslate } from '../src/i18n';
import { makeStore, withStore } from '../src/__tests__/utils/testStore';
import { setUnreadCount } from '../src/store/slices/notificationsSlice';

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) };
jest.mock('expo-router', () => ({
  get router() {
    return mockRouter;
  },
}));
jest.mock('../src/utils/api', () => ({ apiFetch: jest.fn() }));
jest.mock('../src/utils/isOffline', () => ({ isOffline: jest.fn() }));
const LOCALES: Record<string, string> = { ar: 'ar-SA-u-ca-gregory', en: 'en-US-u-ca-gregory', ur: 'ur-PK-u-ca-gregory' };
jest.mock('../src/utils/dates', () => ({ dateLocaleFor: (lang: string) => LOCALES[lang] ?? 'ar-SA-u-ca-gregory' }));
jest.mock('../src/hooks/usePushNotifications', () => ({
  translateBackendRoute: (route: string) => (route === '/orders/o1/tracking' ? { pathname: '/pharmacy/order-tracking', params: { orderId: 'o1' } } : null),
}));
let mockLang = 'ar';
jest.mock('../src/context/AppContext', () => ({
  useApp: () => ({ isDark: false, lang: mockLang, isRTL: mockLang === 'ar' || mockLang === 'ur' }),
}));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
// the screen reports its unread count to the store the Home bell reads
const store = makeStore();
const ui = withStore(
  <SafeAreaProvider initialMetrics={metrics}>
    <NotificationsScreen />
  </SafeAreaProvider>,
  store,
);

// Only the clock is faked, pinned to midday: "Today" is a calendar day, so rows 20 and 40 minutes old fell into
// "Earlier" whenever the suite ran shortly after midnight.
jest.useFakeTimers({
  now: Date.parse('2026-10-05T12:00:00Z'),
  doNotFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'setImmediate', 'clearImmediate', 'nextTick', 'queueMicrotask', 'requestAnimationFrame', 'cancelAnimationFrame', 'requestIdleCallback', 'cancelIdleCallback', 'hrtime', 'performance'],
});

const ago = (ms: number) => new Date(Date.now() - ms).toISOString();
const MIN = 60_000;
const DAY = 24 * 60 * MIN;

/** Fixture rows shaped like GET /notifications (fixtures live in the tests only, never in the screen). */
const FEED: RawNotification[] = [
  { id: 'n1', type: 'order', title: 'طلبك في الطريق', body: 'صيدلية النور · يصل خلال 12 دقيقة', createdAt: ago(5 * MIN), read: false, action: { route: '/orders/o1/tracking' } },
  { id: 'n2', type: 'appointment', title: 'موعدك يبدأ بعد 15 دقيقة', body: 'د. سارة', createdAt: ago(20 * MIN), read: false },
  { id: 'n3', type: 'medication', title: 'تذكير دواء', body: 'بنادول · حبتان', createdAt: ago(40 * MIN), read: true },
  { id: 'n4', type: 'labs', title: 'نتيجة التحليل جاهزة', body: 'صورة دم كاملة', createdAt: ago(3 * DAY), read: true },
  { id: 'n5', type: 'promo', title: 'خصم على الفيتامينات', body: '', createdAt: ago(40 * DAY), read: true },
];

describe('Notifications screen (board Notifications)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLang = 'ar';
    store.dispatch(setUnreadCount(null));
    (isOffline as jest.Mock).mockResolvedValue(false);
  });

  it('draws the real feed in the board: Today and Earlier sections, unread marked, times, no invented rows', async () => {
    (apiFetch as jest.Mock).mockResolvedValue(FEED);
    await render(ui);
    await waitFor(() => expect(screen.getByText('طلبك في الطريق')).toBeTruthy());
    expect(apiFetch).toHaveBeenCalledWith('/notifications?lang=ar');
    expect(screen.getByRole('header', { name: 'اليوم' })).toBeTruthy();
    expect(screen.getByRole('header', { name: 'سابقًا' })).toBeTruthy();
    expect(screen.getByText('صيدلية النور · يصل خلال 12 دقيقة')).toBeTruthy();
    // times: minutes today, days and a date for the old one
    expect(screen.getByText('منذ 5 دقيقة')).toBeTruthy();
    expect(screen.getByText('منذ 3 يوم')).toBeTruthy();
    // unread rows are announced as new, read rows are not
    expect(screen.getByLabelText('طلبك في الطريق. صيدلية النور · يصل خلال 12 دقيقة. منذ 5 دقيقة. جديد')).toBeTruthy();
    expect(screen.getByLabelText('تذكير دواء. بنادول · حبتان. منذ 40 دقيقة')).toBeTruthy();
    // an empty body is simply not drawn
    expect(screen.getByLabelText('خصم على الفيتامينات. ' + new Date(FEED[4].createdAt!).toLocaleDateString('ar-SA-u-ca-gregory'))).toBeTruthy();
    // the header: a named back button and "Read all" (there are unread rows)
    expect(screen.getByLabelText('رجوع')).toBeTruthy();
    expect(screen.getByLabelText('قراءة الكل')).toBeTruthy();
  });

  it('filters by group with chips that exist only for groups that have rows', async () => {
    (apiFetch as jest.Mock).mockResolvedValue(FEED);
    await render(ui);
    await waitFor(() => expect(screen.getByText('طلبك في الطريق')).toBeTruthy());
    for (const label of ['الكل', 'تحديثات', 'طبي', 'عروض']) expect(screen.getByLabelText(label)).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('طبي'));
    expect(screen.queryByText('طلبك في الطريق')).toBeNull(); // an order update
    expect(screen.getByText('تذكير دواء')).toBeTruthy();
    expect(screen.getByText('نتيجة التحليل جاهزة')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('الكل'));
    expect(screen.getByText('طلبك في الطريق')).toBeTruthy();
  });

  it('opening a row marks it read on the server and goes to the translated app route', async () => {
    (apiFetch as jest.Mock).mockResolvedValue(FEED);
    await render(ui);
    await waitFor(() => expect(screen.getByText('طلبك في الطريق')).toBeTruthy());
    await fireEvent.press(screen.getByText('طلبك في الطريق'));
    expect(apiFetch).toHaveBeenCalledWith('/notifications/n1/read', { method: 'POST' });
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/pharmacy/order-tracking', params: { orderId: 'o1' } });
    // now read: announced without "new"
    expect(screen.getByLabelText('طلبك في الطريق. صيدلية النور · يصل خلال 12 دقيقة. منذ 5 دقيقة')).toBeTruthy();
  });

  it('"Read all" posts read-all and the button goes away once nothing is unread', async () => {
    (apiFetch as jest.Mock).mockResolvedValue(FEED);
    await render(ui);
    await waitFor(() => expect(screen.getByLabelText('قراءة الكل')).toBeTruthy());
    await fireEvent.press(screen.getByLabelText('قراءة الكل'));
    expect(apiFetch).toHaveBeenCalledWith('/notifications/read-all', { method: 'POST' });
    await waitFor(() => expect(screen.queryByLabelText('قراءة الكل')).toBeNull());
  });

  it('an empty feed shows the empty state, not a blank list', async () => {
    (apiFetch as jest.Mock).mockResolvedValue([]);
    await render(ui);
    await waitFor(() => expect(screen.getByText('لا توجد إشعارات بعد')).toBeTruthy());
    expect(screen.queryByLabelText('قراءة الكل')).toBeNull();
    expect(screen.queryByLabelText('تحديثات')).toBeNull();
  });

  it('a failed load shows the error state with a retry; no connection says so', async () => {
    (apiFetch as jest.Mock).mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(FEED);
    await render(ui);
    await waitFor(() => expect(screen.getByText('تعذر تحميل الإشعارات')).toBeTruthy());
    expect(screen.queryByText('boom')).toBeNull();
    await fireEvent.press(screen.getByText('إعادة المحاولة'));
    await waitFor(() => expect(screen.getByText('طلبك في الطريق')).toBeTruthy());
  });

  it('with no connection it says so', async () => {
    (isOffline as jest.Mock).mockResolvedValue(true);
    (apiFetch as jest.Mock).mockRejectedValue(new Error('Network request failed'));
    await render(ui);
    await waitFor(() => expect(screen.getByText('لا يوجد اتصال بالإنترنت')).toBeTruthy());
  });

  it('English: labels and times are translated', async () => {
    mockLang = 'en';
    (apiFetch as jest.Mock).mockResolvedValue(FEED);
    await render(ui);
    await waitFor(() => expect(screen.getByText('طلبك في الطريق')).toBeTruthy()); // the feed text is already in the user's language from the server
    expect(screen.getByRole('header', { name: 'Today' })).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Earlier' })).toBeTruthy();
    expect(screen.getByText('5 min ago')).toBeTruthy();
    expect(screen.getByText('3 d ago')).toBeTruthy();
    expect(screen.getByLabelText('Back')).toBeTruthy();
    expect(screen.getByLabelText('Read all')).toBeTruthy();
  });

  it('Back leaves the screen', async () => {
    (apiFetch as jest.Mock).mockResolvedValue([]);
    await render(ui);
    await fireEvent.press(screen.getByLabelText('رجوع'));
    expect(mockRouter.back).toHaveBeenCalled();
  });

  it('an item older than 30 days shows its date in the app language, not the Arabic locale', async () => {
    mockLang = 'en';
    (apiFetch as jest.Mock).mockResolvedValue(FEED);
    await render(ui);
    await waitFor(() => expect(screen.getByText('طلبك في الطريق')).toBeTruthy());
    const old = new Date(FEED[4].createdAt!).toLocaleDateString(LOCALES.en);
    expect(screen.getByLabelText('خصم على الفيتامينات. ' + old)).toBeTruthy();
    expect(old).not.toBe(new Date(FEED[4].createdAt!).toLocaleDateString(LOCALES.ar));
  });

  it('reports the real unread count to the store the Home bell reads (null while unknown)', async () => {
    (apiFetch as jest.Mock).mockResolvedValue(FEED);
    await render(ui);
    await waitFor(() => expect(store.getState().notifications.unreadCount).toBe(2));
    await fireEvent.press(screen.getByLabelText('قراءة الكل'));
    await waitFor(() => expect(store.getState().notifications.unreadCount).toBe(0));
  });

  it('a failed load leaves the count unknown, so the bell draws no dot', async () => {
    (apiFetch as jest.Mock).mockRejectedValue(new Error('boom'));
    await render(ui);
    await waitFor(() => expect(screen.getByText('تعذر تحميل الإشعارات')).toBeTruthy());
    expect(store.getState().notifications.unreadCount).toBeNull();
  });

  it('Back with nothing to go back to opens the tabs by their group name (not "/", which is also the splash)', async () => {
    mockRouter.canGoBack.mockReturnValueOnce(false);
    (apiFetch as jest.Mock).mockResolvedValue([]);
    await render(ui);
    await fireEvent.press(screen.getByLabelText('رجوع'));
    expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)');
  });
});

describe('notification feed rules', () => {
  it('maps every backend type to a group, a filled icon and a tone; unknown types are info', () => {
    expect(mapNotification({ id: 'a', type: 'order' })).toMatchObject({ group: 'system', icon: 'moped', tone: 'coral' });
    expect(mapNotification({ id: 'a', type: 'appointment' })).toMatchObject({ group: 'medical', icon: 'calendar-dots', tone: 'blue' });
    expect(mapNotification({ id: 'a', type: 'promo' })).toMatchObject({ group: 'promotion', icon: 'gift', tone: 'amber' });
    expect(mapNotification({ id: 'a', type: 'something-new' })).toMatchObject({ group: 'system', icon: 'info' });
    expect(mapNotification({ id: 'a' })).toMatchObject({ title: '', body: '', read: false });
  });

  it('groups into Today then Earlier with first/last markers per card', () => {
    const feed = buildFeed(FEED.map(mapNotification));
    expect(feed.map((i) => (i.kind === 'title' ? i.section : i.n.id))).toEqual(['today', 'n1', 'n2', 'n3', 'earlier', 'n4', 'n5']);
    const rows = feed.filter((i) => i.kind === 'row');
    expect(rows.map((r) => (r.kind === 'row' ? [r.first, r.last] : null))).toEqual([[true, false], [false, false], [false, true], [true, false], [false, true]]);
    expect(isToday(undefined)).toBe(false);
  });

  it('relative time in every language uses the translated phrase with the number', () => {
    const now = Date.parse('2026-10-05T12:00:00Z');
    const at = (ms: number) => new Date(now - ms).toISOString();
    const ar = (s: string) => autoTranslate(s, 'ar') as string;
    for (const lang of ['ar', 'en', 'ur', 'hi', 'bn', 'fil'] as const) {
      const tr = (s: string) => autoTranslate(s, lang) as string;
      expect(relativeTime(at(5 * MIN), tr, 'en-US', now)).toContain('5');
      expect(relativeTime(at(3 * 60 * MIN), tr, 'en-US', now)).toContain('3');
      expect(relativeTime(at(4 * DAY), tr, 'en-US', now)).toContain('4');
      expect(relativeTime(at(5 * MIN), tr, 'en-US', now)).not.toContain('{n}');
    }
    expect(relativeTime(undefined, (s) => s, 'en-US', now)).toBe('');
    // an item older than 30 days is a date in the locale it is given (the app's language, see the screen)
    expect(relativeTime(at(40 * DAY), ar, 'en-US', now)).toBe(new Date(now - 40 * DAY).toLocaleDateString('en-US'));
    expect(relativeTime(at(10_000), ar, 'en-US', now)).toBe('الآن');
    expect(relativeTime(at(DAY + 60_000), ar, 'en-US', now)).toBe('أمس');
  });
});
