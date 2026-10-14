import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import BookAppointmentScreen from '../../../app/consultations/book/[id]';
import BookingConfirmScreen from '../../components/BookingConfirmForm';
import { message } from '../../components/screen/ScreenKit';

/**
 * Batch 2, slice 2-app, high effort: booking. The screens are driven with answers shaped like the backend's; every value
 * is a TEST value. What is proved: the booking page offers only the slots the server returned and cannot continue
 * without one, continues with the params it always sent, and the confirm form keeps its order of calls (hold the slot,
 * create the appointment, then the payment intent), refuses an insurance request without a policy, and shows a real
 * sentence when the slot was taken.
 */

const mockParams: { current: Record<string, string | undefined> } = { current: {} };
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
  useLocalSearchParams: () => mockParams.current,
}));
jest.mock('expo-linking', () => ({ openURL: jest.fn(async () => true) }));
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined }));
jest.mock('../../context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'en', isRTL: false }) }));
jest.mock('../../components/LocalizedAlert', () => ({ showLocalizedAlert: jest.fn() }));
jest.mock('../../utils/isOffline', () => ({ isOffline: jest.fn(async () => false) }));
jest.mock('../../utils/logger', () => ({ logError: jest.fn() }));
jest.mock('../../utils/selectedAddress', () => ({ resolveEffectiveAddress: jest.fn(async () => null), formatAddressLine: jest.fn(() => '') }));
jest.mock('../../hooks/useGuestGuard', () => ({ useGuestGuard: () => ({ isGuest: false, requireAuth: jest.fn() }) }));
jest.mock('../../utils/api', () => ({ BASE_URL: 'https://api.example.test/api/v1', R2_PUBLIC_URL: 'https://cdn.example.test', apiFetch: jest.fn(), newIdempotencyKey: jest.fn(() => 'key-1') }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockRouter = (require('expo-router') as { router: Record<'push' | 'replace' | 'back' | 'canGoBack', jest.Mock> }).router;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { apiFetch } = require('../../utils/api') as { apiFetch: jest.Mock };
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { showLocalizedAlert } = require('../../components/LocalizedAlert') as { showLocalizedAlert: jest.Mock };
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Linking = require('expo-linking') as { openURL: jest.Mock };

const k = (key: string, vars?: Record<string, string | number>) => message('en', key, vars);
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const wrap = (ui: React.ReactElement) => <SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>;
const tap = async (el: Parameters<typeof fireEvent.press>[0]) => {
  await act(async () => {
    fireEvent.press(el);
  });
};

const doctor = { id: 'doc-1', name_en: 'Test Doctor', specialty: 'Test specialty', consultation_modes: ['clinic', 'video'], price_clinic: 150, price_online: 100, rating_avg: 4.5, rating_count: 12 };
const slot = '2026-10-08T09:00:00.000Z';

function answer(map: Record<string, unknown>, post?: (path: string) => unknown) {
  apiFetch.mockImplementation(async (path: string, init?: RequestInit) => {
    if (init?.method === 'POST') {
      const r = post ? post(path) : {};
      if (r instanceof Error) throw r;
      return r;
    }
    const key = Object.keys(map).find((p) => path.startsWith(p));
    const v = key ? map[key] : {};
    if (v instanceof Error) throw v;
    return v;
  });
}
const posts = () => apiFetch.mock.calls.filter(([, init]) => init?.method === 'POST');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('book an appointment', () => {
  beforeEach(() => {
    mockParams.current = { id: 'doc-1' };
  });

  it('offers the server slots, cannot continue without one, then continues with the same params as before', async () => {
    answer({ '/care/doctors/doc-1/slots': { slots: [{ start: slot, available: true }, { start: '2026-10-08T09:30:00.000Z', available: false }] }, '/care/doctors/doc-1': doctor });
    await render(wrap(<BookAppointmentScreen />));
    await screen.findByText('Test Doctor');
    const go = screen.getByTestId('book-continue');
    expect(go.props.accessibilityState).toMatchObject({ disabled: true });
    const free = await screen.findAllByRole('radio', { name: /\d/ });
    expect(free.length).toBeGreaterThan(0);

    const times = screen.getAllByRole('radio').filter((r) => r.props.accessibilityState?.disabled === false && !/^(Clinic|Online|Home|Today|Tomorrow)/.test(String(r.props.accessibilityLabel)) && /:\d\d/.test(String(r.props.accessibilityLabel)));
    expect(times.length).toBe(1);
    await tap(times[0]);
    await tap(screen.getByTestId('book-continue'));
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/consultations/booking-status', params: expect.objectContaining({ doctorId: 'doc-1', slot_start: slot, visitType: 'clinic', notes: '' }) });
    expect(posts()).toHaveLength(0);
  });

  it('shows the doctor error state with a retry when the doctor cannot be loaded', async () => {
    answer({ '/care/doctors/doc-1': new Error('boom') });
    await render(wrap(<BookAppointmentScreen />));
    await screen.findByText(k('consult.doctor.loadError'));
    expect(screen.getByText(k('consult.retry'))).toBeTruthy();
  });
});

describe('confirm the booking', () => {
  beforeEach(() => {
    mockParams.current = { doctorId: 'doc-1', slot_start: slot, visitType: 'clinic' };
  });

  it('holds the slot, creates the appointment, then opens the secure payment, in that order', async () => {
    answer(
      { '/care/doctors/doc-1': doctor, '/payments/consultation/appt-1/capabilities': { methods: [{ id: 'card' }] } },
      (path) => {
        if (path === '/slot-locks/reserve') return { id: 'lock-1' };
        if (path === '/care/appointments') return { id: 'appt-1' };
        if (path.startsWith('/payments/intent/consultation/')) return { checkout_url: 'https://pay.example.test/c/1' };
        return {};
      },
    );
    await render(wrap(<BookingConfirmScreen />));
    await screen.findByText('Test Doctor');
    await tap(screen.getByTestId('booking-confirm-submit'));
    await waitFor(() => expect(Linking.openURL).toHaveBeenCalledWith('https://pay.example.test/c/1'));
    expect(posts().map(([p]) => p)).toEqual(['/slot-locks/reserve', '/care/appointments', '/payments/intent/consultation/appt-1']);
    const body = JSON.parse(posts()[1][1].body);
    expect(body).toMatchObject({ doctor_id: 'doc-1', service_type: 'clinic', payment_method: 'card', slot_lock_id: 'lock-1' });
    expect(mockRouter.replace).toHaveBeenCalledWith({ pathname: '/consultations/booking-status', params: expect.objectContaining({ appointmentId: 'appt-1', payment_pending: 'true' }) });
  });

  it('says so, and creates nothing, when the slot was taken', async () => {
    answer({ '/care/doctors/doc-1': doctor }, (path) => (path === '/slot-locks/reserve' ? new Error('slot_taken') : {}));
    await render(wrap(<BookingConfirmScreen />));
    await screen.findByText('Test Doctor');
    await tap(screen.getByTestId('booking-confirm-submit'));
    await waitFor(() => expect(showLocalizedAlert).toHaveBeenCalledWith(k('consult.confirm.failedTitle'), k('consult.confirm.slotTaken')));
    expect(posts().map(([p]) => p)).toEqual(['/slot-locks/reserve']);
  });

  it('does not send an insurance request without a policy on the profile', async () => {
    answer({ '/care/doctors/doc-1': doctor, '/users/me/profile': { insurance: null } });
    await render(wrap(<BookingConfirmScreen />));
    await screen.findByText('Test Doctor');
    await tap(screen.getByLabelText(k('consult.confirm.insurance')));
    expect(screen.getByText(k('consult.confirm.insuranceNotReady'))).toBeTruthy();
    expect(screen.getByTestId('booking-confirm-submit').props.accessibilityState).toMatchObject({ disabled: true });
    expect(posts()).toHaveLength(0);
  });
});
