import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import BookingConfirmScreen from '../../components/BookingConfirmForm';
import { isTelehealthConsentRefusal } from '../../components/legal/TelehealthConsent';
import { message } from '../../components/screen/ScreenKit';

/**
 * D-38 (issue 1549): the first online consultation. The server refuses the booking with telehealth_consent_required; the
 * confirm form then shows the telehealth consent (the legal service's text in the user's language), records the acceptance
 * with this device's id and the platform, and books again. Every value is a TEST value.
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
jest.mock('../../utils/logger', () => ({ logError: jest.fn() }));
jest.mock('../../utils/deviceId', () => ({ getDeviceId: jest.fn(async () => 'device-test-1') }));
jest.mock('../../hooks/useGuestGuard', () => ({ useGuestGuard: () => ({ isGuest: false, requireAuth: jest.fn() }) }));
jest.mock('../../utils/api', () => ({ BASE_URL: 'https://api.example.test/api/v1', R2_PUBLIC_URL: 'https://cdn.example.test', apiFetch: jest.fn(), newIdempotencyKey: jest.fn(() => 'key-1') }));

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
const doctor = { id: 'doc-1', name_en: 'Test Doctor', specialty: 'Test specialty', consultation_modes: ['video'], price_online: 100 };
const slot = '2026-10-08T09:00:00.000Z';
const posts = () => apiFetch.mock.calls.filter(([, init]) => init?.method === 'POST');

beforeEach(() => {
  jest.clearAllMocks();
  mockParams.current = { doctorId: 'doc-1', slot_start: slot, visitType: 'video' };
});

it('knows the refusal apiFetch throws', () => {
  expect(isTelehealthConsentRefusal(new Error('telehealth_consent_required'))).toBe(true);
  expect(isTelehealthConsentRefusal(new Error('slot_taken'))).toBe(false);
});

it('shows the consent on the refusal, records it with the device, then books', async () => {
  let accepted = false;
  apiFetch.mockImplementation(async (path: string, init?: RequestInit) => {
    if (init?.method === 'POST') {
      if (path === '/slot-locks/reserve') return { id: 'lock-1' };
      if (path === '/care/appointments') {
        if (!accepted) throw new Error('telehealth_consent_required');
        return { id: 'appt-1' };
      }
      if (path === '/legal/accept/telehealth_consent') {
        accepted = true;
        return { ok: true, accepted: true, version: '1.0' };
      }
      if (path.startsWith('/payments/intent/consultation/')) return { checkout_url: 'https://pay.example.test/c/1' };
      return {};
    }
    if (path.startsWith('/legal/policy/telehealth_consent')) return { content: '# TEST consent\n\nTEST clause one\n\n- TEST point', version: '1.0' };
    if (path.startsWith('/payments/consultation/appt-1/capabilities')) return { methods: [{ id: 'card' }] };
    if (path.startsWith('/care/doctors/doc-1')) return doctor;
    return {};
  });
  await render(wrap(<BookingConfirmScreen />));
  await screen.findByText('Test Doctor', {}, { timeout: 5000 });
  await tap(screen.getByTestId('booking-confirm-submit'));

  await screen.findByText('TEST clause one', {}, { timeout: 5000 });
  expect(screen.getByText(k('legal.telehealth.intro'))).toBeTruthy();
  expect(screen.getByText(k('legal.versionOnly', { version: '1.0' }))).toBeTruthy();
  expect(showLocalizedAlert).not.toHaveBeenCalled();
  expect(apiFetch.mock.calls.some(([p]) => p === '/legal/policy/telehealth_consent?lang=en')).toBe(true);

  await tap(screen.getByTestId('telehealth-consent-accept'));
  await waitFor(() => expect(Linking.openURL).toHaveBeenCalledWith('https://pay.example.test/c/1'), { timeout: 5000 });
  const acceptCall = posts().find(([p]) => p === '/legal/accept/telehealth_consent');
  expect(acceptCall?.[1].headers).toMatchObject({ 'x-device-id': 'device-test-1', 'x-app-platform': expect.any(String) });
  expect(posts().map(([p]) => p)).toEqual(['/slot-locks/reserve', '/care/appointments', '/legal/accept/telehealth_consent', '/slot-locks/reserve', '/care/appointments', '/payments/intent/consultation/appt-1']);
}, 20000);
