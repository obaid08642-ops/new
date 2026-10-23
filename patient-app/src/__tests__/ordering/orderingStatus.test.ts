import {
  clockParts, parseApproval, parseBooking, parseReminders, parseResults, parseVisit, rejectedIds, secondsUntil, stageOf, stepsOf, statusHref, statusErrorKey,
} from '../../utils/orderingStatus';

const booking = (over: Record<string, unknown> = {}) => parseBooking({
  id: 'b1', status: 'pending', state: 'NEW_REQUEST', mode: 'home', total: 425, items: [{ catalog_id: 'c1', price: 100 }, { bad: 1 }],
  confirm_deadline_at: '2026-10-22T10:10:00.000Z', payment: { amount: 425, status: 'paid', refund_status: null }, alternative: null, ...over,
})!;

describe('parseBooking', () => {
  it('keeps the server fields and drops malformed items', () => {
    const b = booking();
    expect(b.items).toEqual([{ catalog_id: 'c1', price: 100 }]);
    expect(b.payment).toEqual({ amount: 425, status: 'paid', refundStatus: null });
    expect(b.confirmDeadlineAt).toBe('2026-10-22T10:10:00.000Z');
  });
  it('returns null without an id and reads the alternative only when complete', () => {
    expect(parseBooking({ status: 'x' })).toBeNull();
    expect(booking({ alternative: { provider_id: 'p', total: 165, earliest_at: '2026-10-23T08:00:00Z' } }).alternative?.total).toBe(165);
    expect(booking({ alternative: { provider_id: 'p' } }).alternative).toBeNull();
  });
});

describe('stageOf', () => {
  const now = Date.parse('2026-10-22T10:00:00.000Z');
  const approval = (over: Record<string, unknown> = {}) => parseApproval({ status: 'partial', final: false, items: [], choices: ['pay_difference', 'cancel_free'], ...over });
  it('cancelled wins, then the choice, insurance, copay, results, confirmation, active', () => {
    expect(stageOf(booking({ state: 'CANCELLED' }), null, now)).toBe('cancelled');
    expect(stageOf(booking({ status: 'cancelled_unconfirmed', state: 'CANCELLED' }), null, now)).toBe('cancelled');
    expect(stageOf(booking({ state: 'WAITING_COPAY' }), approval(), now)).toBe('choice');
    expect(stageOf(booking({ state: 'PENDING_INSURANCE', status: 'awaiting_approval' }), null, now)).toBe('insurance');
    expect(stageOf(booking({ state: 'WAITING_COPAY' }), approval({ final: true, choices: [] }), now)).toBe('pay');
    expect(stageOf(booking({ state: 'REPORTED' }), null, now)).toBe('results');
    expect(stageOf(booking(), null, now)).toBe('confirm');
    expect(stageOf(booking({ confirm_deadline_at: null, state: 'CONFIRMED', status: 'confirmed' }), null, now)).toBe('active');
  });
});

describe('clock', () => {
  it('counts seconds and splits them', () => {
    expect(secondsUntil('2026-10-22T10:03:42.000Z', Date.parse('2026-10-22T10:00:00.000Z'))).toBe(222);
    expect(secondsUntil('2026-10-22T09:00:00.000Z', Date.parse('2026-10-22T10:00:00.000Z'))).toBe(0);
    expect(clockParts(3725)).toEqual({ h: 1, m: 2, s: 5 });
  });
});

describe('parseApproval', () => {
  const raw = {
    status: 'partial', final: false, patient_share_total: 95, home_fee: { amount: 25, covered: false }, valid_until: '2026-10-23T10:00:00Z',
    warning: 'approval_expires_before_visit', rebook_earlier: true, choices: ['pay_difference', 'covered_only', 'cancel_free', 'other'],
    items: [
      { catalog_id: 'a', decision: 'approved', price: 100, insurer_share: 80, patient_share: 20 },
      { catalog_id: 'b', decision: 'rejected', price: 60, insurer_share: 0, patient_share: 60 },
    ],
  };
  it('reads the server shares, warning and only the known choices', () => {
    const a = parseApproval(raw)!;
    expect(a.patientShareTotal).toBe(95);
    expect(a.choices).toEqual(['pay_difference', 'covered_only', 'cancel_free']);
    expect(a.expiresBeforeVisit && a.rebookEarlier).toBe(true);
    expect(a.items[1].insurerShare).toBe(0);
    expect(rejectedIds(a)).toEqual(['b']);
  });
  it('a pending view has no totals', () => {
    const a = parseApproval({ status: 'pending', estimate: true, final: false, items: [{ catalog_id: 'a', decision: 'pending', price: 10, insurer_share: null, patient_share: null }], patient_share_total: null, home_fee: { amount: 0, covered: false } })!;
    expect(a.estimate).toBe(true);
    expect(a.patientShareTotal).toBeNull();
    expect(a.choices).toEqual([]);
  });
  it('rejects a payload without status', () => expect(parseApproval({})).toBeNull());
});

describe('visit, reminders, results', () => {
  it('shows the arrival code only as 4 digits', () => {
    expect(parseVisit({ status: 'assigned', provider: { name_en: 'Lab' }, staff: { name: 'Khalid', license: '1' }, arrival_code: '0042' })?.arrivalCode).toBe('0042');
    expect(parseVisit({ status: 'assigned', arrival_code: '12' })?.arrivalCode).toBeNull();
    expect(parseVisit({ status: 'pending' })?.staff).toBeNull();
  });
  it('keeps known reminder kinds', () => {
    expect(parseReminders({ reminders: [{ kind: 'fasting_night', at: '2026-10-22T17:00:00Z' }, { kind: 'x', at: 'y' }] })).toHaveLength(1);
    expect(parseReminders(null)).toEqual([]);
  });
  it('reads values with range and flag', () => {
    const [v] = parseResults({ values: [{ catalog_id: 'c', name: 'CBC', value: 5, unit: 'g', range: { low: 1, high: 4 }, flag: 'high' }, { catalog_id: 'd' }] });
    expect(v).toMatchObject({ name: 'CBC', flag: 'high', low: 1, high: 4 });
  });
});

describe('statusErrorKey', () => {
  it('maps stable codes', () => {
    expect(statusErrorKey(new Error('{"message":"choice_not_pending"}'))).toBe('ordering.err.choiceDone');
    expect(statusErrorKey(new Error('booking_closed'))).toBe('ordering.err.bookingClosed');
    expect(statusErrorKey(new Error('boom'))).toBe('ordering.err.generic');
  });
});

describe('stepsOf', () => {
  it('home visit has staff steps, a centre booking does not', () => {
    const home = stepsOf(booking({ state: 'CONFIRMED', status: 'assigned' }), null);
    expect(home.map((s) => s.key)).toEqual(['confirmed', 'assigned', 'arrived', 'collected', 'results']);
    expect(home.map((s) => s.done)).toEqual([true, true, false, false, false]);
    const centre = stepsOf(booking({ mode: 'facility', state: 'REPORTED', status: 'confirmed' }), null);
    expect(centre.map((s) => s.key)).toEqual(['confirmed', 'collected', 'results']);
    expect(centre.every((s) => s.done)).toBe(true);
  });
  it('adds the insurance step only once the insurer decided', () => {
    const decided = parseApproval({ status: 'approved', final: true, items: [] })!;
    expect(stepsOf(booking(), decided).some((s) => s.key === 'insurance')).toBe(true);
    const pending = parseApproval({ status: 'pending', final: false, items: [] })!;
    expect(stepsOf(booking(), pending).some((s) => s.key === 'insurance')).toBe(false);
  });
});

describe('statusHref', () => {
  it('puts the focused booking first and the siblings in group', () => {
    expect(statusHref(['a'])).toBe('/diagnostics/booking-status?id=a');
    expect(statusHref(['a', 'b', 'c'], 'b')).toBe('/diagnostics/booking-status?id=b&group=a,c');
  });
});
