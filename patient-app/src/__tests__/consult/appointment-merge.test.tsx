import React from 'react';
import { Linking } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AppointmentDetailScreen from '../../../app/consultations/appointment-detail';
import BookingStatusScreen from '../../../app/consultations/booking-status';
import ChatWithDoctorScreen from '../../../app/consultations/chat-with-doctor';
import { message } from '../../components/screen/ScreenKit';

/**
 * Batch 14, part 14a: the appointment page absorbs the summary, the prescription and the follow-up; the clinic confirmation is
 * the confirmed state of booking-status; the doctor thread follows the booking type. Every value is a TEST value shaped like
 * the backend's answers. Proved: the sections are asked for only after a finished visit and are drawn from what the server
 * sent, the follow-up opens the booking with the original appointment in the URL, the clinic booking shows its confirmation in
 * place, a clinic or home thread has no call, an online one has it, every thread carries the 997 link, and a closed thread
 * (the server refusing the send) turns the composer into a read-only note with the follow-up button.
 */

const mockParams: { current: Record<string, string | undefined> } = { current: {} };
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
  useLocalSearchParams: () => mockParams.current,
}));
jest.mock('expo-linking', () => ({ openURL: jest.fn(async () => true) }));
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined }));
jest.mock('react-native-qrcode-svg', () => 'QRCode');
jest.mock('../../components/MapPrimitives', () => ({ __esModule: true, default: 'MapView', Marker: 'Marker', PROVIDER_DEFAULT: undefined }));
jest.mock('../../context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'en', isRTL: false }) }));
jest.mock('../../context/CartContext', () => ({ useCart: () => ({ addItem: jest.fn(async () => undefined) }) }));
jest.mock('../../context/SocketContext', () => ({
  useSocket: () => ({ socket: null, onlineUsers: {}, sendTyping: jest.fn(), joinThread: jest.fn(), leaveThread: jest.fn(), isConnected: false }),
}));
jest.mock('../../components/LocalizedAlert', () => ({ showLocalizedAlert: jest.fn() }));
jest.mock('../../utils/isOffline', () => ({ isOffline: jest.fn(async () => false) }));
jest.mock('../../utils/logger', () => ({ logError: jest.fn() }));
jest.mock('../../utils/api', () => ({ BASE_URL: 'https://api.example.test/api/v1', R2_PUBLIC_URL: 'https://cdn.example.test', apiFetch: jest.fn(), newIdempotencyKey: jest.fn(() => 'key-1') }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockRouter = (require('expo-router') as { router: Record<'push' | 'replace' | 'back' | 'canGoBack', jest.Mock> }).router;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { apiFetch } = require('../../utils/api') as { apiFetch: jest.Mock };

const k = (key: string, vars?: Record<string, string | number>) => message('en', key, vars);
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const wrap = (ui: React.ReactElement) => <SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>;
const tap = async (el: Parameters<typeof fireEvent.press>[0]) => {
  await act(async () => {
    fireEvent.press(el);
  });
};

function answer(map: Record<string, unknown>, post?: (path: string) => unknown) {
  apiFetch.mockImplementation(async (path: string, init?: RequestInit) => {
    if (init?.method === 'POST') {
      const r = post ? post(path) : {};
      if (r instanceof Error) throw r;
      return r;
    }
    const key = Object.keys(map)
      .sort((a, b) => b.length - a.length)
      .find((p) => path.startsWith(p));
    const v = key ? map[key] : {};
    if (v instanceof Error) throw v;
    return v;
  });
}
const called = (prefix: string) => apiFetch.mock.calls.some(([p]) => String(p).startsWith(prefix));

const done = { id: 'appt-1', status: 'COMPLETED', doctor_id: 'doc-1', doctor_name: 'Test Doctor', service_type: 'video', scheduled_at: '2026-10-01T09:00:00.000Z', patient_notes: 'Test note', state_history: [{ state: 'COMPLETED', at: '2026-10-01T09:30:00.000Z' }] };
const summary = { diagnosis: 'Test diagnosis', notes: 'Test notes', recommendations: 'Test recommendation', follow_up_recommended: true, follow_up_window_days: 7 };
const prescriptions = [{ id: 'rx-1', appointment_id: 'appt-1', doctor: 'Test Doctor', items: [{ medicine_id: 'prod-1', name: 'Test medicine', dose: '1 tablet', duration_days: 5 }] }];

beforeEach(() => {
  jest.clearAllMocks();
});

describe('appointment page with summary, prescription and follow-up', () => {
  beforeEach(() => {
    mockParams.current = { appointmentId: 'appt-1' };
  });

  it('after a finished visit draws the summary and the prescription the server sent and opens the follow-up booking', async () => {
    answer({ '/care/appointments/appt-1/summary': summary, '/care/appointments/appt-1': done, '/prescriptions/active': prescriptions });
    await render(wrap(<AppointmentDetailScreen />));
    await screen.findByText('Test diagnosis');
    expect(screen.getByText('Test recommendation')).toBeTruthy();
    await screen.findByText('Test medicine');
    expect(screen.getByText('Test note')).toBeTruthy();
    await tap(screen.getByTestId('summary-follow-up'));
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/consultations/book/[id]', params: { id: 'doc-1', followUp: 'appt-1' } });
    await tap(screen.getByTestId('detail-chat'));
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/consultations/chat-with-doctor', params: { doctorId: 'doc-1', appointmentId: 'appt-1' } });
  });

  it('asks for neither the summary nor the prescription before the visit is finished', async () => {
    answer({ '/care/appointments/appt-1': { ...done, status: 'CONFIRMED' } });
    await render(wrap(<AppointmentDetailScreen />));
    await screen.findByText('Test Doctor');
    expect(called('/care/appointments/appt-1/summary')).toBe(false);
    expect(called('/prescriptions/active')).toBe(false);
    expect(screen.queryByTestId('summary-follow-up')).toBeNull();
  });

  it('says honestly when the doctor has not written the summary yet', async () => {
    answer({ '/care/appointments/appt-1/summary': new Error('404 not found'), '/care/appointments/appt-1': done, '/prescriptions/active': [] });
    await render(wrap(<AppointmentDetailScreen />));
    await screen.findByText(new RegExp(k('consult.summary.notReady')));
    expect(screen.queryByText('Test medicine')).toBeNull();
  });
});

describe('booking status shows the clinic confirmation in place', () => {
  it('a confirmed clinic booking is drawn on this screen, not pushed to another', async () => {
    mockParams.current = { appointmentId: 'appt-2', state: 'confirmed', visitType: 'clinic' };
    answer({ '/care/appointments/appt-2': { id: 'appt-2', status: 'CONFIRMED', service_type: 'clinic', slot_start: '2026-10-09T09:00:00.000Z', doctor_id: 'doc-1' }, '/care/doctors/doc-1': { name: 'Test Doctor', clinic_name: 'Test Clinic' } });
    await render(wrap(<BookingStatusScreen />));
    await screen.findByText('Test Clinic');
    expect(screen.getByText(k('consult.clinic.showCode'))).toBeTruthy();
    expect(mockRouter.push).not.toHaveBeenCalled();
  });
});

describe('doctor thread inside a booking', () => {
  const thread = { id: 'thread-1', is_active: true };
  const open = (service_type: string, extra: Record<string, unknown> = {}, post?: (path: string) => unknown) => {
    mockParams.current = { appointmentId: 'appt-1', doctorId: 'doc-1' };
    answer({ '/care/doctors/doc-1': { name: 'Test Doctor' }, '/care/appointments/appt-1': { id: 'appt-1', service_type }, '/chat/threads/thread-1/messages': [] }, (path) => (path === '/chat/threads/booking' ? { ...thread, ...extra } : post ? post(path) : {}));
  };

  it('an online consultation has photo, file and the call, and every thread carries the 997 link', async () => {
    open('video');
    await render(wrap(<ChatWithDoctorScreen />));
    await screen.findByTestId('chat-call');
    expect(screen.getByTestId('chat-attach-image')).toBeTruthy();
    expect(screen.getByTestId('chat-attach-file')).toBeTruthy();
    await tap(screen.getByTestId('chat-call'));
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/consultations/virtual-waiting-room', params: { appointmentId: 'appt-1' } });
    expect(screen.getByText(k('consult.chat.emergency'))).toBeTruthy();
    const dial = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    await tap(screen.getByTestId('chat-emergency'));
    expect(dial).toHaveBeenCalledWith('tel:997');
  });

  it('a clinic visit has photo and file but no call', async () => {
    open('clinic');
    await render(wrap(<ChatWithDoctorScreen />));
    await screen.findByTestId('chat-attach-file');
    await waitFor(() => expect(called('/care/appointments/appt-1')).toBe(true));
    expect(screen.queryByTestId('chat-call')).toBeNull();
    expect(screen.getByTestId('chat-emergency')).toBeTruthy();
  });

  it('a closed thread is read-only with the follow-up button', async () => {
    open('clinic', { is_active: false });
    await render(wrap(<ChatWithDoctorScreen />));
    await screen.findByText(k('consult.chat.readOnly'));
    expect(screen.queryByTestId('chat-send')).toBeNull();
    await tap(screen.getByTestId('chat-follow-up'));
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/consultations/book/[id]', params: { id: 'doc-1', followUp: 'appt-1' } });
  });

  it('when the server refuses a send (403) the composer closes and the server reason is shown', async () => {
    open('video', {}, (path) => (path === '/chat/threads/thread-1/messages' ? new Error('AUTH_ERROR_403: Test closed reason') : {}));
    await render(wrap(<ChatWithDoctorScreen />));
    const input = await screen.findByLabelText(k('consult.chat.placeholder'));
    await act(async () => {
      fireEvent.changeText(input, 'hello');
    });
    await waitFor(() => expect(screen.getByTestId('chat-send').props.accessibilityState?.disabled).toBeFalsy());
    await tap(screen.getByTestId('chat-send'));
    await screen.findByText(k('consult.chat.readOnly'));
    expect(screen.getByText('Test closed reason')).toBeTruthy();
  });
});
