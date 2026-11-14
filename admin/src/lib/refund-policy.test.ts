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

import { consultationTableRows } from './refund-policy';

describe('the table shown to the admin', () => {
  it('follows the saved values', () => {
    expect(consultationTableRows(ok())).toEqual([
      { when: 'إلغاء المريض قبل الموعد بـ 2 ساعة أو أكثر', refund: '100%' },
      { when: 'إلغاء المريض قبل الموعد بأقل من 2 ساعة', refund: '50%' },
      { when: 'غياب المريض عن الموعد', refund: '0%' },
    ]);
    const p = ok(); p.consultation.full_refund_min_hours = 6; p.consultation.late_refund_percent = 25;
    expect(consultationTableRows(p)[1]).toEqual({ when: 'إلغاء المريض قبل الموعد بأقل من 6 ساعة', refund: '25%' });
  });
});
