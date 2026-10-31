import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import DiagnosticsCheckoutScreen from '../../../app/diagnostics/checkout';
import { message } from '../../components/screen/ScreenKit';
import { dateLocaleFor } from '../../utils/dates';

/**
 * The legacy lab/radiology checkout (F.6): a card order never leaves a booking unpaid, and the cart is cleared only once the payment
 * has started, so a retry pays the same booking instead of booking again. TEST values; only the network and the router are faked.
 */
const mockItems: { current: Array<Record<string, unknown>> } = { current: [] };
const mockClearCart = jest.fn();
const mockReplace = jest.fn();
const mockApi = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: (...a: unknown[]) => mockReplace(...a), back: jest.fn(), canGoBack: jest.fn(() => true) },
  useLocalSearchParams: () => ({ serviceType: 'clinic', labId: 'lab-1', labName: 'Test lab' }),
}));
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined }));
jest.mock('../../context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'en', isRTL: false }) }));
jest.mock('../../components/LocalizedAlert', () => ({ showLocalizedAlert: jest.fn() }));
jest.mock('../../context/DiagnosticsCartContext', () => ({
  useDiagnosticsCart: () => ({ items: mockItems.current, total: 90, clearCart: (...a: unknown[]) => mockClearCart(...a) }),
}));
jest.mock('../../utils/api', () => ({ apiFetch: (...a: unknown[]) => mockApi(...a), BASE_URL: 'https://api.example.test/api/v1', R2_PUBLIC_URL: 'https://cdn.example.test', newIdempotencyKey: jest.fn(() => 'k') }));

const k = (key: string, vars?: Record<string, string | number>) => message('en', key, vars);
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const wrap = (ui: React.ReactElement) => <SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>;
const lab = { id: 't1', name: 'Test one', price: 90, qty: 1, kind: 'lab' };
const scan = (id: string) => ({ id, name: `Scan ${id}`, price: 300, qty: 1, kind: 'radiology' });
const lastDay = () => { const d = new Date(); d.setDate(d.getDate() + 6); return new Intl.DateTimeFormat(dateLocaleFor('en'), { weekday: 'long', day: 'numeric', month: 'numeric', numberingSystem: 'latn' }).format(d); };
const calls = (re: RegExp, method?: string) => mockApi.mock.calls.filter(([p, init]) => re.test(String(p)) && (!method || init?.method === method));

async function bookByCard() {
  await render(wrap(<DiagnosticsCheckoutScreen />));
  await act(async () => { fireEvent.press(screen.getByText(k('diag.pay.card'))); });
  await act(async () => { fireEvent.press(screen.getByLabelText(lastDay())); });
  await act(async () => { fireEvent.press(screen.getByLabelText('09:00 AM')); });
  await act(async () => { fireEvent.press(screen.getByLabelText(k('diag.checkout.confirm'))); });
}
const payTarget = (id: string) => `/payments/intent/lab/${id}`;

beforeEach(() => { jest.clearAllMocks(); mockItems.current = [lab]; });

describe('legacy checkout pays what it books', () => {
  it('refuses a card order that would make more than one booking, and creates nothing', async () => {
    mockItems.current = [lab, scan('r1')];
    mockApi.mockResolvedValue({});
    await bookByCard();
    expect(screen.getByText(k('diag.checkout.onePayment'))).toBeTruthy();
    expect(mockApi).not.toHaveBeenCalled();
    expect(mockClearCart).not.toHaveBeenCalled();
    mockItems.current = [scan('r1'), scan('r2')];
  });

  it('a failed payment intent keeps the cart, and the retry pays the SAME booking (no second booking)', async () => {
    let intents = 0;
    mockApi.mockImplementation(async (path: string) => {
      if (path === '/labs/bookings') return { id: 'b-1' };
      if (path === payTarget('b-1')) { intents += 1; if (intents === 1) throw new Error('gateway_down'); return { id: 'txn-1', checkout_url: 'https://pay.example.test/1', amount: 90 }; }
      return {};
    });
    await bookByCard();
    expect(mockClearCart).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
    await act(async () => { fireEvent.press(screen.getByLabelText(k('diag.checkout.confirm'))); });
    expect(calls(/^\/labs\/bookings$/, 'POST')).toHaveLength(1);
    expect(calls(/^\/payments\/intent\/lab\/b-1$/)).toHaveLength(2);
    expect(mockClearCart).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith(expect.objectContaining({ pathname: '/payments/result', params: expect.objectContaining({ bookingId: 'b-1', moyasarId: 'txn-1' }) }));
  });

  it('an intent that answers without an id counts as a failure: the cart stays', async () => {
    mockApi.mockImplementation(async (path: string) => (path === '/labs/bookings' ? { id: 'b-2' } : {}));
    await bookByCard();
    expect(mockClearCart).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('a single scan by card is booked on the radiology route and its intent is the radiology one', async () => {
    mockItems.current = [scan('r1')];
    mockApi.mockImplementation(async (path: string) => (path === '/radiology/bookings' ? { id: 'rb-1' } : path === '/payments/intent/radiology/rb-1' ? { id: 'txn-9', amount: 300 } : {}));
    await bookByCard();
    expect(calls(/^\/radiology\/bookings$/, 'POST')).toHaveLength(1);
    expect(calls(/^\/payments\/intent\/radiology\/rb-1$/)).toHaveLength(1);
    expect(mockClearCart).toHaveBeenCalledTimes(1);
  });
});
