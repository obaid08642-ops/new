import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import CancelRescheduleScreen from '../../../app/consultations/cancel-reschedule';
import BookingStatusScreen from '../../../app/consultations/booking-status';
import { message } from '../../components/screen/ScreenKit';

/**
 * The one cancel screen of a consultation: the refund it shows is the server's figure on the appointment (not a client rule),
 * and the cancel goes through the one route the web also uses (POST /unified-bookings/consultation/:id/cancel, with an
 * idempotency key). Boundaries only; every value is a TEST value.
 */
const mockParams: { current: Record<string, string | undefined> } = { current: {} };
jest.mock('expo-router', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const R = require('react') as typeof React;
  return {
    router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
    useLocalSearchParams: () => mockParams.current,
    useFocusEffect: (cb: () => void | (() => void)) => R.useEffect(cb, [cb]),
  };
});
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined, getCalendar: () => 'gregorian' }));
jest.mock('../../context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'en', isRTL: false }) }));
jest.mock('../../components/LocalizedAlert', () => ({ showLocalizedAlert: jest.fn() }));
jest.mock('../../utils/isOffline', () => ({ isOffline: jest.fn(async () => false) }));
jest.mock('../../utils/logger', () => ({ logError: jest.fn() }));
jest.mock('../../utils/api', () => ({ BASE_URL: 'https://api.example.test/api/v1', R2_PUBLIC_URL: 'https://cdn.example.test', apiFetch: jest.fn(), newIdempotencyKey: jest.fn(() => 'k') }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { apiFetch } = require('../../utils/api') as { apiFetch: jest.Mock };
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { showLocalizedAlert } = require('../../components/LocalizedAlert') as { showLocalizedAlert: jest.Mock };
const k = (key: string, vars?: Record<string, string | number>) => message('en', key, vars);
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const wrap = (ui: React.ReactElement) => <SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>;
const ID = '91047ef2-ad36-422a-a184-629693e7c729';
const appointment = (percent: number) => ({ id: ID, status: 'CONFIRMED', price: 100, doctor_name: 'Dr Test', scheduled_at: new Date(Date.now() + 3 * 3600_000).toISOString(), cancellation: { refund_now: { percent, amount: percent } } });

function serve(percent: number, cancel: () => unknown = () => ({ booking_id: ID, status: 'cancelled', refund_percentage: percent })) {
  apiFetch.mockImplementation(async (path: string, init?: { method?: string }) => {
    if (path === `/care/appointments/${ID}`) return appointment(percent);
    if (path === '/system-config/public') return { cancellation_policy: { full_hours: 2, half_hours: 0, half_refund_percent: 50 } };
    if (init?.method === 'POST') return cancel();
    return {};
  });
}
jest.setTimeout(30000);
beforeEach(() => { jest.clearAllMocks(); mockParams.current = { appointmentId: ID }; });

describe('consultation cancel: one screen, one route', () => {
  it('shows the refund the server computed for cancelling now, whatever the policy numbers say', async () => {
    serve(50);
    await render(wrap(<CancelRescheduleScreen />));
    await act(async () => { fireEvent.press(await screen.findByTestId('choose-cancel')); });
    expect(await screen.findByText(k('consult.cancel.refundNote', { pct: '50', amount: `100.00 ${k('consult.currency')}` }))).toBeTruthy();
  });

  it('cancels through the unified route with an idempotency key, and says the refund the server answered', async () => {
    serve(100);
    await render(wrap(<CancelRescheduleScreen />));
    await act(async () => { fireEvent.press(await screen.findByTestId('choose-cancel')); });
    await act(async () => { fireEvent.press(await screen.findByText(k('consult.cancel.reason.emergency'))); });
    await act(async () => { fireEvent.press(screen.getByTestId('cancel-confirm')); });
    await waitFor(() => expect(showLocalizedAlert).toHaveBeenCalled());
    const post = apiFetch.mock.calls.find(([, init]) => init?.method === 'POST');
    expect(post?.[0]).toBe(`/unified-bookings/consultation/${ID}/cancel`);
    expect(post?.[1].headers['Idempotency-Key']).toMatch(/^appointment-cancel-/);
    expect(apiFetch.mock.calls.some(([, init]) => init?.method === 'PATCH')).toBe(false);
    expect(showLocalizedAlert.mock.calls[0][1]).toBe(k('consult.cancel.doneRefund', { pct: '100' }));
  });

  it('the status screen has no cancel of its own: its button opens the one cancel screen and cancels nothing', async () => {
    mockParams.current = { appointmentId: ID, payment_pending: 'true' };
    serve(100);
    const answer = apiFetch.getMockImplementation() as (path: string, init?: { method?: string }) => Promise<unknown>;
    apiFetch.mockImplementation(async (path: string, init?: { method?: string }) => (path === `/care/appointments/${ID}` ? { ...appointment(100), status: 'PENDING' } : answer(path, init)));
    await render(wrap(<BookingStatusScreen />));
    await act(async () => { fireEvent.press(await screen.findByTestId('booking-cancel')); });
    const router = (require('expo-router') as { router: { push: jest.Mock } }).router;
    expect(router.push).toHaveBeenCalledWith({ pathname: '/consultations/cancel-reschedule', params: { appointmentId: ID } });
    expect(apiFetch.mock.calls.some(([, init]) => init?.method === 'POST' || init?.method === 'PATCH')).toBe(false);
  });
});
