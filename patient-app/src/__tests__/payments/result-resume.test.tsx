import React from 'react';
import { act, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import PaymentResultScreen from '../../../app/payments/result';
import { message } from '../../components/screen/ScreenKit';

/** 15.8: the result screen remembers a payment under way and forgets it once the server has settled it. */
const mockParams: { current: Record<string, string | undefined> } = { current: {} };
const mockRemember = jest.fn(async () => undefined);
const mockClear = jest.fn(async () => undefined);
const mockReconnect: { cb: (() => void) | null } = { cb: null };

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
  useLocalSearchParams: () => mockParams.current,
  useFocusEffect: (cb: () => void | (() => void)) => require('react').useEffect(cb, [cb]),
}));
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined }));
jest.mock('../../context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'en', isRTL: false }) }));
jest.mock('../../utils/logger', () => ({ logError: jest.fn() }));
jest.mock('../../utils/api', () => ({ BASE_URL: 'https://api.example.test/api/v1', R2_PUBLIC_URL: 'https://cdn.example.test', apiFetch: jest.fn(), newIdempotencyKey: jest.fn(() => 'k') }));
jest.mock('../../utils/onReconnect', () => ({ onReconnect: (cb: () => void) => { mockReconnect.cb = cb; return () => undefined; } }));
jest.mock('../../utils/paymentInFlight', () => ({ rememberPayment: (...a: unknown[]) => mockRemember(...(a as [])), clearPayment: (...a: unknown[]) => mockClear(...(a as [])) }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { apiFetch } = require('../../utils/api') as { apiFetch: jest.Mock };
const k = (key: string) => message('en', key);
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const wrap = (ui: React.ReactElement) => <SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>;

describe('15.8 payment result and the marker of a payment under way', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockRemember.mockClear();
    mockClear.mockClear();
    apiFetch.mockReset();
    mockParams.current = { transactionId: 'txn-1', bookingKind: 'pharmacy', bookingId: 'ord-1' };
  });
  afterEach(() => jest.useRealTimers());

  it('remembers the payment when the screen opens, and keeps it while the server says pending', async () => {
    apiFetch.mockResolvedValue({ id: 'txn-1', status: 'pending', amount: 80 });
    await render(wrap(<PaymentResultScreen />));
    await screen.findByText(k('payments.result.checkingTitle'));
    expect(mockRemember).toHaveBeenCalledWith({ transactionId: 'txn-1', gatewayId: null, bookingKind: 'pharmacy', bookingId: 'ord-1' });
    expect(mockClear).not.toHaveBeenCalled();
  });

  it.each([['paid'], ['failed'], ['cancelled']])('forgets it once the server says %s', async (status) => {
    apiFetch.mockResolvedValue({ id: 'txn-1', status, amount: 80 });
    await render(wrap(<PaymentResultScreen />));
    await act(async () => { jest.advanceTimersByTime(10); });
    await act(async () => undefined);
    expect(mockClear).toHaveBeenCalledWith('txn-1');
  });

  it('a payment that came back with no network is asked again the moment the phone is online', async () => {
    apiFetch.mockRejectedValue(new Error('network request failed'));
    await render(wrap(<PaymentResultScreen />));
    await act(async () => undefined);
    const before = apiFetch.mock.calls.length;
    expect(before).toBeGreaterThanOrEqual(1);
    apiFetch.mockResolvedValue({ id: 'txn-1', status: 'paid', amount: 80 });
    await act(async () => { mockReconnect.cb?.(); });
    await screen.findByText(k('pharmacy.pay.paidTitle'));
    expect(apiFetch.mock.calls.length).toBeGreaterThan(before);
    expect(mockClear).toHaveBeenCalledWith('txn-1');
  });

  it('a link with nothing to verify remembers nothing', async () => {
    mockParams.current = { status: 'success', amount: '80' };
    await render(wrap(<PaymentResultScreen />));
    await screen.findByText(k('payments.result.unknownTitle'));
    expect(mockClear).not.toHaveBeenCalled();
  });
});
