import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { RefundPolicyTick } from '../../components/legal/RefundPolicyTick';
import { message } from '../../components/screen/ScreenKit';
import { KNOWN_LINES, noteRefundPolicyChanged, noteRefundPolicyChangedError, policyHashField, readRefundSummaryHash, rememberShownPolicy, shownPolicyHash, withRefundPolicy } from '../../utils/refundAcceptance';
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
  it.each(['lab', 'radiology', 'nursing'] as const)('shows the 2-hour table lines the server sends for %s, with hours and percent', async (service) => {
    mockApiFetch.mockResolvedValueOnce({ service, lines: [
      { key: `refund.policy.${service}.full`, params: { hours: 2 } },
      { key: `refund.policy.${service}.late`, params: { hours: 2, percent: 50 } },
    ] });
    await render(<SafeAreaProvider initialMetrics={metrics}><RefundPolicyTick service={service} checked={false} onChange={jest.fn()} /></SafeAreaProvider>);
    expect(await screen.findByText('Cancel at least 2 hours before the visit and get 100% back.')).toBeTruthy();
    expect(screen.getByText('If you cancel later than that, 50% is returned to your card.')).toBeTruthy();
    expect(screen.queryByText(k('refund.general'))).toBeNull();
  });
  it('has a message in every language for every line key the reader accepts', () => {
    for (const lang of ['ar', 'en', 'ur', 'hi', 'bn', 'fil']) {
      for (const key of KNOWN_LINES) {
        expect(message(lang, `refund.policy.${key}`)).not.toBe(`refund.policy.${key}`);
      }
    }
  });
  it('shows the lines the server sends for the service, in the app language, with their numbers', async () => {
    mockApiFetch.mockResolvedValueOnce({ service: 'lab', lines: [
      { key: 'refund.policy.lab.full', params: { hours: 2 } },
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

describe('the refund policy hash echo', () => {
  const HASH = 'b'.repeat(64);
  it('the card remembers the hash of the text it showed, and sends it back only for that service', async () => {
    mockApiFetch.mockResolvedValueOnce({ service: 'lab', hash: HASH, lines: [{ key: 'refund.policy.lab.full', params: { hours: 2 } }] });
    await render(<SafeAreaProvider initialMetrics={metrics}><RefundPolicyTick service="lab" checked={false} onChange={jest.fn()} /></SafeAreaProvider>);
    await screen.findByText('Cancel at least 2 hours before the visit and get 100% back.');
    expect(shownPolicyHash('lab')).toBe(HASH);
    expect(withRefundPolicy({ x: 1 }, 'lab')).toEqual({ x: 1, refund_policy_accepted: true, refund_policy_hash: HASH });
    expect(withRefundPolicy({ x: 1 }, 'radiology')).toEqual({ x: 1, refund_policy_accepted: true });
    expect(policyHashField('lab')).toEqual({ refund_policy_hash: HASH });
  });
  it('a card that could not load forgets the hash: nothing stale is sent', async () => {
    rememberShownPolicy('pharmacy', HASH);
    mockApiFetch.mockRejectedValueOnce(new Error('offline'));
    await render(<SafeAreaProvider initialMetrics={metrics}><RefundPolicyTick service="pharmacy" checked={false} onChange={jest.fn()} /></SafeAreaProvider>);
    expect(await screen.findByText(k('refund.general'))).toBeTruthy();
    expect(shownPolicyHash('pharmacy')).toBeUndefined();
  });
  it('reads only a 64-hex hash', () => {
    expect(readRefundSummaryHash({ hash: HASH })).toBe(HASH);
    expect(readRefundSummaryHash({ hash: 'abc' })).toBeUndefined();
    expect(readRefundSummaryHash(null)).toBeUndefined();
  });
  it('409 refund_policy_changed unticks, reloads the text and says so; any other error does nothing', async () => {
    const onChange = jest.fn();
    mockApiFetch.mockResolvedValueOnce({ service: 'lab', hash: HASH, lines: [{ key: 'refund.policy.lab.full', params: { hours: 2 } }] });
    await render(<SafeAreaProvider initialMetrics={metrics}><RefundPolicyTick service="lab" checked onChange={onChange} /></SafeAreaProvider>);
    await screen.findByText('Cancel at least 2 hours before the visit and get 100% back.');
    expect(noteRefundPolicyChanged('lab', 409, { message: 'slot_taken' })).toBe(false);
    expect(noteRefundPolicyChangedError('lab', new Error('x'))).toBe(false);
    expect(shownPolicyHash('lab')).toBe(HASH);
    const NEW = 'c'.repeat(64);
    mockApiFetch.mockResolvedValueOnce({ service: 'lab', hash: NEW, lines: [{ key: 'refund.policy.lab.full', params: { hours: 4 } }] });
    await act(async () => { expect(noteRefundPolicyChangedError('lab', new Error('refund_policy_changed'))).toBe(true); });
    expect(onChange).toHaveBeenCalledWith(false);
    expect(await screen.findByText(k('refund.changed'))).toBeTruthy();
    expect(await screen.findByText('Cancel at least 4 hours before the visit and get 100% back.')).toBeTruthy();
    expect(shownPolicyHash('lab')).toBe(NEW);
  });
  it('the pharmacy sender sends the shown hash', async () => {
    rememberShownPolicy('pharmacy', HASH);
    mockApiFetch.mockResolvedValue({ id: 'ord-1' });
    const sender = createPharmacyOrderSender('pharmacy-reorder');
    await sender.send({ items: [{ raw_name: 'Test medicine', qty: 1 }], fulfillment: 'delivery' });
    const create = mockApiFetch.mock.calls.find((c) => c[0] === '/patient/pharmacy/orders');
    expect(bodyOf(create as unknown[])).toMatchObject({ refund_policy_accepted: true, refund_policy_hash: HASH });
  });
  it('the message exists in all six languages', () => {
    for (const lang of ['ar', 'en', 'ur', 'hi', 'bn', 'fil']) expect(message(lang, 'refund.changed')).not.toBe('refund.changed');
  });
});
