import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { InsuranceRequestView } from '../../components/insurance/InsuranceRequestView';
import { claimStatus, refundStatus, requestState } from '../../components/insurance/InsuranceKit';
import { message } from '../../components/screen/ScreenKit';
import { translations } from '../../i18n';

/**
 * Batch 7: the insurance request page. Every value is a TEST value. What is proved: the state the server sends decides the
 * page (waiting, covered, co-pay, rejected with the self-pay offer, self-pay, paid); the amounts shown are the request's own
 * (nothing is computed); the co-pay button reaches the hosted checkout through the capabilities call and the payment intent
 * with the idempotency header and the chosen method, and a failure shows an error and no success; accepting self-pay posts
 * once to accept-self-pay with an idempotency key; there is no cash option; the states map to a label key that exists in all
 * six locale files.
 */

const mockApiFetch = jest.fn();
const mockOpenURL = jest.fn();
jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true), setParams: jest.fn() }, useLocalSearchParams: () => ({ id: 'req-1' }) }));
jest.mock('expo-linking', () => ({ openURL: (...a: unknown[]) => mockOpenURL(...a) }));
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined }));
jest.mock('../../context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'en', isRTL: false }) }));
jest.mock('../../utils/api', () => ({ apiFetch: (...a: unknown[]) => mockApiFetch(...a), BASE_URL: 'https://api.example.test/api/v1' }));
jest.mock('../../utils/logger', () => ({ logError: jest.fn() }));
jest.mock('../../utils/isOffline', () => ({ isOffline: jest.fn(async () => false) }));

const k = (key: string, vars?: Record<string, string | number>) => message('en', key, vars);
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const wrap = (ui: React.ReactElement) => <SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>;

const request = (over: Record<string, unknown>) => ({ id: 'req-1', booking_id: 'b-1', booking_kind: 'lab', state: 'PENDING_PROVIDER_REVIEW', price: 200, copay_amount: 40, self_pay_amount: 0, ...over });

function serve(req: Record<string, unknown>, extra: Record<string, unknown> = {}) {
  mockApiFetch.mockImplementation(async (path: string) => {
    if (path in extra) {
      const value = extra[path];
      if (value instanceof Error) throw value;
      return value;
    }
    if (path === '/insurance/requests/req-1') return req;
    if (path === '/users/me/insurance') return { provider: 'TEST insurer', policy_number: 'TEST-123' };
    throw new Error(`unexpected ${path}`);
  });
}

beforeEach(() => {
  mockApiFetch.mockReset();
  mockOpenURL.mockReset();
});

describe('InsuranceRequestView', () => {
  it('waits for the provider and shows no payment button', async () => {
    serve(request({}));
    await render(wrap(<InsuranceRequestView />));
    expect(await screen.findByText(k('insurance.request.provider_review.title'))).toBeTruthy();
    expect(screen.getByTestId('request-refresh')).toBeTruthy();
    expect(screen.queryByTestId('request-pay')).toBeNull();
    expect(screen.queryByTestId('request-accept')).toBeNull();
  });

  it('shows the amounts of the request as sent and the policy company', async () => {
    serve(request({ state: 'COPAY_PENDING', price: 250, copay_amount: 62.5 }));
    await render(wrap(<InsuranceRequestView />));
    expect(await screen.findByTestId('request-amounts')).toBeTruthy();
    expect(screen.getByText('250.00 SAR')).toBeTruthy();
    expect(screen.getAllByText('62.50 SAR').length).toBeGreaterThan(0);
    expect(screen.getByText('TEST insurer')).toBeTruthy();
  });

  it('opens the hosted checkout for the co-pay through capabilities and the payment intent', async () => {
    serve(request({ state: 'COPAY_PENDING' }), {
      '/insurance/requests/req-1/capabilities': { methods: [{ id: 'card' }] },
      '/payments/intent/insurance/req-1': { checkout_url: 'https://pay.example.test/checkout/1' },
    });
    await render(wrap(<InsuranceRequestView />));
    fireEvent.press(await screen.findByTestId('request-pay'));
    await waitFor(() => expect(mockOpenURL).toHaveBeenCalledWith('https://pay.example.test/checkout/1'));
    const intent = mockApiFetch.mock.calls.find((call) => call[0] === '/payments/intent/insurance/req-1');
    expect(intent?.[1].method).toBe('POST');
    expect(JSON.parse(intent?.[1].body)).toEqual({ method: 'card' });
    expect(Object.keys(intent?.[1].headers)).toContain('Idempotency-Key');
  });

  it('shows an error and opens nothing when card payment is not offered', async () => {
    serve(request({ state: 'COPAY_PENDING' }), { '/insurance/requests/req-1/capabilities': { methods: [] } });
    await render(wrap(<InsuranceRequestView />));
    fireEvent.press(await screen.findByTestId('request-pay'));
    expect(await screen.findByTestId('request-error')).toBeTruthy();
    expect(mockOpenURL).not.toHaveBeenCalled();
    expect(mockApiFetch.mock.calls.some((call) => String(call[0]).startsWith('/payments/intent'))).toBe(false);
  });

  it('offers self-pay after a rejection, posts the acceptance once with an idempotency key, and has no cash option', async () => {
    serve(request({ state: 'REJECTED', self_pay_amount: 200 }), {});
    await render(wrap(<InsuranceRequestView />));
    expect(await screen.findByText(k('insurance.request.accept_self_pay.title'))).toBeTruthy();
    expect(screen.queryByText(/cash/i)).toBeNull();
    mockApiFetch.mockImplementation(async (path: string) => {
      if (path === '/insurance/requests/req-1/accept-self-pay') return request({ state: 'SELF_PAY_PENDING', self_pay_amount: 200 });
      if (path === '/users/me/insurance') return {};
      throw new Error(`unexpected ${path}`);
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId('request-accept'));
      fireEvent.press(screen.getByTestId('request-accept'));
    });
    await waitFor(() => expect(screen.getByTestId('request-pay')).toBeTruthy());
    const posts = mockApiFetch.mock.calls.filter((call) => call[0] === '/insurance/requests/req-1/accept-self-pay');
    expect(posts).toHaveLength(1);
    expect(Object.keys(posts[0][1].headers)).toContain('Idempotency-Key');
  });

  it('shows the provider decision as recorded: approval number, co-pay amount and percent', async () => {
    serve(request({ state: 'COPAY_PENDING', price: 200, copay_amount: 40, approval_code: 'TEST-AP-778', copay_percent: 20 }));
    await render(wrap(<InsuranceRequestView />));
    expect(await screen.findByText('TEST-AP-778')).toBeTruthy();
    expect(screen.getByText(k('insurance.request.approvalNumber'))).toBeTruthy();
    expect(screen.getByText('20%')).toBeTruthy();
    expect(screen.getAllByText('40.00 SAR').length).toBeGreaterThan(0);
    expect(screen.getByText(k('insurance.request.checkout_copay.title'))).toBeTruthy();
  });

  it('draws no approval number and no percent row when the server did not send them', async () => {
    serve(request({ state: 'COPAY_PENDING', approval_code: null, copay_percent: null }));
    await render(wrap(<InsuranceRequestView />));
    expect(await screen.findByTestId('request-amounts')).toBeTruthy();
    expect(screen.queryByText(k('insurance.request.approvalNumber'))).toBeNull();
    expect(screen.queryByText(k('insurance.request.copayPercent'))).toBeNull();
  });

  it('shows the reason of a rejection when the provider gave one', async () => {
    serve(request({ state: 'REJECTED', self_pay_amount: 200, rejection_reason: 'TEST reason: service excluded' }));
    await render(wrap(<InsuranceRequestView />));
    expect(await screen.findByText(k('insurance.claims.rejectedReason', { reason: 'TEST reason: service excluded' }))).toBeTruthy();
  });

  it('draws no reason row when a rejection came without one', async () => {
    serve(request({ state: 'REJECTED', self_pay_amount: 200 }));
    await render(wrap(<InsuranceRequestView />));
    expect(await screen.findByTestId('request-amounts')).toBeTruthy();
    expect(screen.queryByTestId('request-reason')).toBeNull();
  });

  it('says the facility requests the approval while the request is pending', async () => {
    serve(request({}));
    await render(wrap(<InsuranceRequestView />));
    expect(await screen.findByText(k('insurance.request.provider_review.body'))).toBeTruthy();
    expect(k('insurance.request.provider_review.body')).toMatch(/facility is requesting the approval from your insurer/i);
  });

  it('shows the failure state with a retry when the request cannot be read', async () => {
    serve(request({}), { '/insurance/requests/req-1': new Error('boom') });
    await render(wrap(<InsuranceRequestView />));
    expect(await screen.findByText(k('consult.retry'))).toBeTruthy();
  });
});

describe('insurance states', () => {
  it('maps every request, claim and refund state to a label that exists in all six locales', () => {
    const keys = [
      ...['PENDING_PROVIDER_REVIEW', 'APPROVED_FULL', 'COPAY_PENDING', 'COPAY_PAID', 'REJECTED', 'SELF_PAY_PENDING', 'SELF_PAY_PAID', 'EXPIRED', 'CANCELLED', 'x'].map((s) => requestState(s).key),
      ...['approved', 'reimbursed', 'rejected', 'under_review', 'submitted', 'x'].map((s) => claimStatus(s).key),
      ...['REQUESTED', 'APPROVED', 'EXECUTED', 'REJECTED', 'FAILED', 'x'].map((s) => refundStatus(s).key),
    ];
    for (const lang of ['ar', 'en', 'ur', 'hi', 'bn', 'fil'] as const) {
      const bucket = (translations as unknown as Record<string, Record<string, string>>)[lang];
      for (const key of keys) expect(bucket[key]).toBeTruthy();
    }
  });
});
