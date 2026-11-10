import { POLICY_SERVICES, policySummary } from './refund-policy-summary';
import { DEFAULT_REFUND_POLICY } from './refund-policy.defaults';

const doc = (patch: any = {}) => ({ value: { ...DEFAULT_REFUND_POLICY, ...patch }, updatedAt: new Date('2026-11-10T08:00:00Z') });
const keys = (s: any) => s.lines.map((l: any) => l.key);

describe('the rule of each service as text keys with numbers', () => {
  it('consultation: the owner\'s 2-hour table from the stored policy, free reschedule only when there is one', () => {
    const s = policySummary(null, 'consultation');
    expect(s.lines).toContainEqual({ key: 'refund.policy.consultation.full', params: { hours: 2 } });
    expect(s.lines).toContainEqual({ key: 'refund.policy.consultation.late', params: { hours: 2, percent: 50 } });
    expect(s.lines).toContainEqual({ key: 'refund.policy.consultation.patient_no_show', params: { percent: 0 } });
    expect(keys(s)).toEqual(expect.arrayContaining(['refund.policy.provider_cancel', 'refund.policy.provider_no_show', 'refund.policy.card_destination']));
    expect(s.lines).toContainEqual({ key: 'refund.policy.consultation.free_reschedule', params: { count: 1, hours: 2, within_days: 14 } });
    expect(s.lines).toContainEqual({ key: 'refund.policy.consultation.late_rescheduled', params: { percent: 50 } });   // a booking moved by the late free reschedule is refunded at the late rate if cancelled   // one free reschedule (within 14 days when it is late)
    expect(keys(policySummary(doc({ consultation: { ...DEFAULT_REFUND_POLICY.consultation, free_reschedules: 0 } }), 'consultation'))).not.toContain('refund.policy.consultation.free_reschedule');
    expect(keys(policySummary(doc({ consultation: { ...DEFAULT_REFUND_POLICY.consultation, free_reschedules: 0 } }), 'consultation'))).not.toContain('refund.policy.consultation.late_rescheduled');
  });
  it('an edit of the stored table shows in the numbers and changes the hash', () => {
    const edited = policySummary(doc({ consultation: { ...DEFAULT_REFUND_POLICY.consultation, full_refund_min_hours: 6, late_refund_percent: 25 } }), 'consultation');
    expect(edited.lines).toContainEqual({ key: 'refund.policy.consultation.full', params: { hours: 6 } });
    expect(edited.lines).toContainEqual({ key: 'refund.policy.consultation.late', params: { hours: 6, percent: 25 } });
    expect(edited.hash).not.toBe(policySummary(null, 'consultation').hash);
    expect(edited.version).toBe('2026-11-10T08:00:00.000Z');
  });
  it('lab and nursing: full before the collector sets off, the trip fee after (from the policy); nursing adds the patient-absent share', () => {
    const lab = policySummary(doc({ home_visit: { trip_fee_sar: 55, patient_absent_percent: 20 } }), 'lab');
    expect(lab.lines).toContainEqual({ key: 'refund.policy.lab.before_transit', params: {} });
    expect(lab.lines).toContainEqual({ key: 'refund.policy.lab.after_transit', params: { trip_fee_sar: 55 } });
    expect(keys(lab)).not.toContain('refund.policy.nursing.patient_absent');
    const nurse = policySummary(doc({ home_visit: { trip_fee_sar: 55, patient_absent_percent: 20 } }), 'nursing');
    expect(nurse.lines).toContainEqual({ key: 'refund.policy.nursing.patient_absent', params: { percent: 20 } });
  });
  it('radiology: a full refund (the listener keeps no trip fee); pharmacy: the delivery-fee rule from the policy', () => {
    expect(keys(policySummary(null, 'radiology'))).toEqual(['refund.policy.radiology.full', 'refund.policy.provider_cancel', 'refund.policy.card_destination']);
    expect(policySummary(null, 'pharmacy').lines[0]).toEqual({ key: 'refund.policy.pharmacy.before_dispatch', params: { delivery_fee_refunded: true } });
    expect(policySummary(doc({ pharmacy: { refund_delivery_fee_before_dispatch: false } }), 'pharmacy').lines[0].params).toEqual({ delivery_fee_refunded: false });
  });
  it('every service ends with the card destination (no wallet) and carries its version and hash', () => {
    for (const svc of POLICY_SERVICES) {
      const s = policySummary(null, svc);
      expect(s.lines.at(-1)).toEqual({ key: 'refund.policy.card_destination', params: {} });
      expect(s.hash).toMatch(/^[0-9a-f]{64}$/);
      expect(s.service).toBe(svc);
    }
  });
});
