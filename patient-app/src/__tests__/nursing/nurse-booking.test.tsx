import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import NurseBookingScreen from '../../../app/nursing/nurse-profile';
import { message } from '../../components/screen/ScreenKit';

/**
 * Batch 4, slice 4-app, high effort: the nurse booking page (restyle only). Answers are shaped like the backend's; every value
 * is a TEST value. What is proved: no booking is sent without an address; a cash booking posts to /nursing/bookings with the
 * chosen provider and then starts the payment intent and hands over to the payment result; an insurance booking without a
 * saved policy goes to the insurance profile and posts nothing; with a policy it posts and shows the "under review" result
 * (a booking is shown as made only when the call answered).
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
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined }));
jest.mock('../../context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'en', isRTL: false }) }));
jest.mock('../../components/LocalizedAlert', () => ({ showLocalizedAlert: jest.fn() }));
jest.mock('../../utils/isOffline', () => ({ isOffline: jest.fn(async () => false) }));
jest.mock('../../utils/logger', () => ({ logError: jest.fn() }));
const mockAddress: { current: Record<string, unknown> | null } = { current: null };
jest.mock('../../utils/selectedAddress', () => ({ resolveEffectiveAddress: jest.fn(async () => mockAddress.current), formatAddressLine: jest.fn(() => 'Test street, Test city') }));
jest.mock('../../utils/api', () => ({ BASE_URL: 'https://api.example.test/api/v1', R2_PUBLIC_URL: 'https://cdn.example.test', apiFetch: jest.fn(), newIdempotencyKey: jest.fn(() => 'key-1') }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockRouter = (require('expo-router') as { router: Record<'push' | 'replace' | 'back' | 'canGoBack', jest.Mock> }).router;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { apiFetch } = require('../../utils/api') as { apiFetch: jest.Mock };
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { showLocalizedAlert } = require('../../components/LocalizedAlert') as { showLocalizedAlert: jest.Mock };

const k = (key: string, vars?: Record<string, string | number>) => message('en', key, vars);
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const wrap = (ui: React.ReactElement) => <SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>;
const tap = async (el: Parameters<typeof fireEvent.press>[0]) => {
  await act(async () => {
    fireEvent.press(el);
  });
};

const nurse = { id: 'nurse-1', name: 'Test Nurse', facility: 'Test facility', rating: 4.5, reviews_count: 3, degree: 'Test degree', price: 100, reviews: [{ user: 'Test user', text: 'Test review' }] };

function answer(profile: unknown, post: (path: string) => unknown = () => ({})) {
  apiFetch.mockImplementation(async (path: string, init?: RequestInit) => {
    if (init?.method === 'POST') return post(path);
    if (path.startsWith('/home-care/providers/')) return nurse;
    if (path.startsWith('/insurance/coverage-check')) return { provider: 'Test insurer', policy: 'P-1' };
    if (path.startsWith('/users/me/profile')) return profile;
    return {};
  });
}
const posts = () => apiFetch.mock.calls.filter(([, init]) => init?.method === 'POST');

jest.setTimeout(30000);

beforeEach(() => {
  jest.clearAllMocks();
  mockAddress.current = { city: 'Test city', district: 'Test district', lat: 24.7, lng: 46.7 };
});

describe('nurse booking page', () => {
  it('sends no booking without an address', async () => {
    mockParams.current = { nurseId: 'nurse-1', flow: 'cash', serviceId: 'svc-1' };
    mockAddress.current = null;
    answer({});
    await render(wrap(<NurseBookingScreen />));
    await screen.findByText('Test Nurse');
    await tap(screen.getByLabelText(new RegExp(`^${k('nur.book.confirm')}`)));
    expect(showLocalizedAlert).toHaveBeenCalledWith(k('nur.book.addressTitle'), k('nur.book.addressBody'));
    expect(posts()).toHaveLength(0);
  });

  it('books a cash visit for the chosen nurse, then starts the payment', async () => {
    mockParams.current = { nurseId: 'nurse-1', flow: 'cash', serviceId: 'svc-1' };
    answer({}, (path) => (path === '/nursing/bookings' ? { id: 'b-1' } : { id: 'txn-1', checkout_url: 'https://pay.example.test/x', amount: 100 }));
    await render(wrap(<NurseBookingScreen />));
    await screen.findByText('Test Nurse');
    await tap(screen.getByLabelText(new RegExp(`^${k('nur.book.confirmPrice', { amount: '100.00', currency: k('pharmacy.currency') }).slice(0, 20)}`)));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalled());
    const [first, second] = posts();
    expect(first[0]).toBe('/nursing/bookings');
    expect(JSON.parse(first[1].body)).toMatchObject({ provider_id: 'nurse-1', service_id: 'svc-1', payment_method: 'card' });
    expect(second[0]).toBe('/payments/intent/nursing/b-1');
    expect(mockRouter.replace.mock.calls[0][0]).toMatchObject({ pathname: '/payments/result', params: { bookingKind: 'nursing', bookingId: 'b-1' } });
  });

  it('sends an insurance request to the insurance profile when no policy is saved, and posts nothing', async () => {
    mockParams.current = { nurseId: 'nurse-1', flow: 'insurance', serviceId: 'svc-1' };
    answer({ insurance: null });
    await render(wrap(<NurseBookingScreen />));
    await screen.findByText('Test Nurse');
    await tap(screen.getByLabelText(k('nur.book.sendInsurance')));
    await waitFor(() => expect(mockRouter.push).toHaveBeenCalledWith('/profile/insurance'));
    expect(posts()).toHaveLength(0);
  });

  it('shows the request as under review only after the booking call answered', async () => {
    mockParams.current = { nurseId: 'nurse-1', flow: 'insurance', serviceId: 'svc-1' };
    answer({ insurance: { policy_number: 'P-1' } }, () => ({ id: 'b-2' }));
    await render(wrap(<NurseBookingScreen />));
    await screen.findByText('Test Nurse');
    expect(screen.queryByText(k('nur.book.inReview'))).toBeNull();
    await tap(screen.getByLabelText(k('nur.book.sendInsurance')));
    expect(await screen.findByText(k('nur.book.inReview'))).toBeTruthy();
    expect(posts()).toHaveLength(1);
  });

  it('keeps the page and says so when the booking call fails', async () => {
    mockParams.current = { nurseId: 'nurse-1', flow: 'insurance', serviceId: 'svc-1' };
    answer({ insurance: { policy_number: 'P-1' } }, () => {
      throw new Error('Test failure');
    });
    await render(wrap(<NurseBookingScreen />));
    await screen.findByText('Test Nurse');
    await tap(screen.getByLabelText(k('nur.book.sendInsurance')));
    await waitFor(() => expect(showLocalizedAlert).toHaveBeenCalledWith(k('nur.book.failTitle'), 'Test failure'));
    expect(screen.queryByText(k('nur.book.inReview'))).toBeNull();
  });

  it('journey 6: a failed payment keeps the patient on the page; the retry pays the SAME booking, never a second one, and never opens tracking', async () => {
    mockParams.current = { nurseId: 'nurse-1', flow: 'cash', serviceId: 'svc-1' };
    let intents = 0;
    answer({}, (path) => {
      if (path === '/nursing/bookings') return { id: 'bk-1' };
      if (path.startsWith('/payments/intent/nursing/')) {
        intents += 1;
        if (intents === 1) throw new Error('gateway down');
        return { id: 'pay-1', checkout_url: 'https://pay.example.test/x', amount: 100 };
      }
      return {};
    });
    await render(wrap(<NurseBookingScreen />));
    await screen.findByText('Test Nurse');
    const confirm = () => screen.getByLabelText(new RegExp(`^${k('nur.book.confirm')}`));
    await tap(confirm());
    expect(posts().filter(([path]) => path === '/nursing/bookings')).toHaveLength(1);
    expect(mockRouter.replace).not.toHaveBeenCalled(); // not to live-tracking of an unpaid booking
    await tap(confirm());
    expect(posts().filter(([path]) => path === '/nursing/bookings')).toHaveLength(1); // still one booking
    expect(posts().filter(([path]) => String(path) === '/payments/intent/nursing/bk-1')).toHaveLength(2);
    expect(mockRouter.replace).toHaveBeenCalledWith(expect.objectContaining({ pathname: '/payments/result', params: expect.objectContaining({ bookingId: 'bk-1' }) }));
  });
});
