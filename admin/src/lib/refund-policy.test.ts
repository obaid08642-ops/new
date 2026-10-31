import { describe, expect, it } from 'vitest';
import { invalidFields, type RefundPolicy } from './refund-policy';

const ok = (): RefundPolicy => ({
  consultation: { full_refund_min_hours: 2, late_refund_percent: 50, patient_no_show_percent: 0, free_reschedules: 1, free_reschedule_min_hours: 2 },
  home_visit: { trip_fee_sar: 40, patient_absent_percent: 0 },
  pharmacy: { refund_delivery_fee_before_dispatch: true },
});

describe('refund policy rules', () => {
  it('accepts the default policy', () => expect(invalidFields(ok())).toEqual([]));
  it('refuses a percent above 100 and a negative amount', () => {
    const p = ok();
    p.consultation.late_refund_percent = 120;
    p.home_visit.trip_fee_sar = -1;
    expect(invalidFields(p)).toEqual(['consultation.late_refund_percent', 'home_visit.trip_fee_sar']);
  });
  it('refuses a missing number (an empty box)', () => {
    const p: any = ok();
    p.consultation.free_reschedules = NaN;
    expect(invalidFields(p)).toEqual(['consultation.free_reschedules']);
  });
});
