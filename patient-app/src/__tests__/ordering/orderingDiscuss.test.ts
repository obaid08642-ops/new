import { clock, discussErrorKey, parseDraft, parseInstant, secondsLeft } from '../../utils/orderingDiscuss';

describe('parseDraft', () => {
  it('needs the draft flag, its id and the attached result', () => {
    expect(parseDraft({ consultation_draft: true, draft_id: 'cd_1', attached_result_id: 'r1' })).toEqual({ draftId: 'cd_1', attachedResultId: 'r1' });
    expect(parseDraft({ consultation_draft: true, draft_id: 'cd_1' })).toBeNull();
    expect(parseDraft(null)).toBeNull();
  });
});

describe('parseInstant', () => {
  it('reads the server fields and the fallback options', () => {
    const r = parseInstant({ id: 'i1', status: 'expired', expires_at: '2026-10-22T10:00:00Z', seconds_left: 0, payment_status: 'not_charged', fallback: { options: ['earliest_slot', 'refund', 'x'], earliest_slot: null } });
    expect(r).toMatchObject({ id: 'i1', status: 'expired', paymentStatus: 'not_charged', acceptedBy: null, appointmentId: null });
    expect(r?.fallback?.options).toEqual(['earliest_slot', 'refund']);
  });
  it('keeps accepted_by and appointment_id, rejects unknown status or missing id', () => {
    expect(parseInstant({ id: 'i1', status: 'accepted', accepted_by: 'd1', appointment_id: 'a1' })).toMatchObject({ acceptedBy: 'd1', appointmentId: 'a1' });
    expect(parseInstant({ id: 'i1', status: 'weird' })).toBeNull();
    expect(parseInstant({ status: 'broadcasting' })).toBeNull();
  });
});

describe('secondsLeft / clock', () => {
  const now = Date.parse('2026-10-22T10:00:00Z');
  it('counts down from expires_at and never goes negative', () => {
    expect(secondsLeft({ expiresAt: '2026-10-22T10:02:05Z', secondsLeft: 999 }, now)).toBe(125);
    expect(secondsLeft({ expiresAt: '2026-10-22T09:00:00Z', secondsLeft: null }, now)).toBe(0);
    expect(secondsLeft({ expiresAt: null, secondsLeft: 30 }, now)).toBe(30);
  });
  it('formats m:ss', () => {
    expect(clock(125)).toBe('2:05');
    expect(clock(-3)).toBe('0:00');
  });
});

describe('discussErrorKey', () => {
  it('maps the stable codes', () => {
    expect(discussErrorKey(new Error('instant_no_online_doctors'))).toBe('ordering.res.errNoDoctors');
    expect(discussErrorKey(new Error('{"message":"instant_request_open"}'))).toBe('ordering.res.errOpen');
    expect(discussErrorKey(new Error('results_not_ready'))).toBe('ordering.res.errNotReady');
    expect(discussErrorKey(new Error('boom'))).toBe('ordering.res.errGeneric');
  });
});
