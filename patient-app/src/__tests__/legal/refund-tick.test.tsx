import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { RefundPolicyTick } from '../../components/legal/RefundPolicyTick';
import { message } from '../../components/screen/ScreenKit';
import { withRefundPolicy } from '../../utils/refundAcceptance';
import { startAsap } from '../../utils/orderingBooking';
import { startInstant } from '../../utils/orderingDiscuss';
import { createPharmacyOrderSender } from '../../utils/pharmacyOrderSend';

/** The refund policy before payment (owner decision 2026-11-09): the tick, and `refund_policy_accepted: true` on every create. TEST values only. */
const mockApiFetch = jest.fn();
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (...a: unknown[]) => mockPush(...a), replace: jest.fn(), back: jest.fn() } }));
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined, getCalendar: () => 'gregorian' }));
jest.mock('../../context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'en', isRTL: false }) }));
jest.mock('../../utils/api', () => ({ apiFetch: (...a: unknown[]) => mockApiFetch(...a), newIdempotencyKey: () => 'test-key-0001', BASE_URL: 'https://api.example.test/api/v1' }));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const k = (key: string) => message('en', key);
const bodyOf = (call: unknown[]) => JSON.parse((call[1] as { body: string }).body);
beforeEach(() => mockApiFetch.mockReset());

describe('the refund policy tick', () => {
  it('shows the lines the server sends for the service, in the app language, with their numbers', async () => {
    mockApiFetch.mockResolvedValueOnce({ service: 'lab', lines: [
      { key: 'refund.policy.lab.before_transit', params: {} },
      { key: 'refund.policy.lab.after_transit', params: { trip_fee_sar: 30 } },
      { key: 'refund.policy.card_destination', params: {} },
    ] });
    await render(<SafeAreaProvider initialMetrics={metrics}><RefundPolicyTick service="lab" checked={false} onChange={jest.fn()} /></SafeAreaProvider>);
    expect(await screen.findByText('After the collector has set off, the trip fee of 30 SAR is kept and the rest is returned.')).toBeTruthy();
    expect(screen.getByText(k('refund.policy.card_destination'))).toBeTruthy();
    expect(screen.queryByText(k('refund.general'))).toBeNull();
    expect(mockApiFetch).toHaveBeenCalledWith('/refund-policy/summary?service=lab');
  });
  it('keeps the general line when the summary cannot be read', async () => {
    mockApiFetch.mockRejectedValueOnce(new Error('offline'));
    await render(<SafeAreaProvider initialMetrics={metrics}><RefundPolicyTick service="pharmacy" checked={false} onChange={jest.fn()} /></SafeAreaProvider>);
    expect(await screen.findByText(k('refund.general'))).toBeTruthy();
  });
  it('shows the policy line and the link, says what is needed until ticked, and toggles', async () => {
    const onChange = jest.fn();
    await render(<SafeAreaProvider initialMetrics={metrics}><RefundPolicyTick checked={false} onChange={onChange} /></SafeAreaProvider>);
    expect(screen.getByText(k('refund.title'))).toBeTruthy();
    expect(screen.getByText(k('refund.general'))).toBeTruthy();
    expect(screen.getByText(k('refund.needAgree'))).toBeTruthy();
    await act(async () => { fireEvent.press(screen.getByTestId('refund-policy-agree')); });
    expect(onChange).toHaveBeenCalledWith(true);
    await act(async () => { fireEvent.press(screen.getByTestId('refund-policy-read')); });
    expect(mockPush).toHaveBeenCalledWith('/settings/refund-policy');
  });
  it('shows the given policy figures instead of the general line, and no "needed" line once ticked', async () => {
    await render(<SafeAreaProvider initialMetrics={metrics}><RefundPolicyTick checked onChange={jest.fn()} lines={['Cancel 2 hours or more before: full refund']} /></SafeAreaProvider>);
    expect(screen.getByText('Cancel 2 hours or more before: full refund')).toBeTruthy();
    expect(screen.queryByText(k('refund.general'))).toBeNull();
    expect(screen.queryByText(k('refund.needAgree'))).toBeNull();
  });
});

describe('refund_policy_accepted on the create calls', () => {
  it('the helper adds true and never produces false', () => {
    expect(withRefundPolicy({ a: 1 })).toEqual({ a: 1, refund_policy_accepted: true });
    expect(withRefundPolicy({ refund_policy_accepted: false } as Record<string, unknown>).refund_policy_accepted).toBe(true);
  });
  it('an ASAP broadcast carries it', async () => {
    mockApiFetch.mockResolvedValue({ id: 'asap-1', status: 'searching', seconds_left: 60 });
    await startAsap({ service_kind: 'lab', items: ['svc-1'], lat: 24.7, lng: 46.7, payer: 'cash' }).catch(() => undefined);
    expect(mockApiFetch.mock.calls[0][0]).toBe('/ordering/asap');
    expect(bodyOf(mockApiFetch.mock.calls[0])).toMatchObject({ refund_policy_accepted: true, service_kind: 'lab' });
  });
  it('an instant consultation carries it', async () => {
    mockApiFetch.mockResolvedValue({});
    await startInstant({ specialty: 'cardiology', mode: 'video', refund_policy_accepted: true }).catch(() => undefined);
    expect(mockApiFetch.mock.calls[0][0]).toBe('/consultations/instant');
    expect(bodyOf(mockApiFetch.mock.calls[0])).toMatchObject({ refund_policy_accepted: true, specialty: 'cardiology' });
  });
  it('a pharmacy order carries it on the create call, not on the submit call', async () => {
    mockApiFetch.mockImplementation(async (path: string) => (path === '/patient/pharmacy/orders' ? { id: '91047ef2-ad36-422a-a184-629693e7c729' } : {}));
    const sender = createPharmacyOrderSender('pharmacy-reorder');
    await sender.send({ items: [{ raw_name: 'Test medicine', qty: 1 }], fulfillment: 'delivery' });
    const create = mockApiFetch.mock.calls.find((c) => c[0] === '/patient/pharmacy/orders');
    expect(bodyOf(create as unknown[])).toMatchObject({ refund_policy_accepted: true, fulfillment: 'delivery' });
    const submit = mockApiFetch.mock.calls.find((c) => String(c[0]).endsWith('/submit'));
    expect(bodyOf(submit as unknown[])).toEqual({});
  });
});
