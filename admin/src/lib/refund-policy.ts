// The cancellation and refund policy an admin edits (backend/src/modules/refund-policy): same rules as PUT admin/refund-policy.

export interface RefundPolicy {
  consultation: { full_refund_min_hours: number; late_refund_percent: number; patient_no_show_percent: number; free_reschedules: number; free_reschedule_min_hours: number };
  home_visit: { trip_fee_sar: number; patient_absent_percent: number };
  pharmacy: { refund_delivery_fee_before_dispatch: boolean };
}

export type PolicyField = { group: 'consultation' | 'home_visit'; key: string; label: string; unit: string; max?: number };

export const POLICY_FIELDS: PolicyField[] = [
  { group: 'consultation', key: 'full_refund_min_hours', label: 'أقل عدد ساعات قبل الموعد للاسترداد الكامل', unit: 'ساعة' },
  { group: 'consultation', key: 'late_refund_percent', label: 'نسبة الاسترداد عند الإلغاء المتأخر', unit: '%', max: 100 },
  { group: 'consultation', key: 'patient_no_show_percent', label: 'نسبة الاسترداد عند غياب المريض', unit: '%', max: 100 },
  { group: 'consultation', key: 'free_reschedules', label: 'عدد مرات إعادة الجدولة المجانية', unit: 'مرة' },
  { group: 'consultation', key: 'free_reschedule_min_hours', label: 'أقل ساعات قبل الموعد لإعادة الجدولة المجانية', unit: 'ساعة' },
  { group: 'home_visit', key: 'trip_fee_sar', label: 'رسوم الانتقال', unit: 'ر.س' },
  { group: 'home_visit', key: 'patient_absent_percent', label: 'نسبة الاسترداد عند غياب المريض عن الزيارة', unit: '%', max: 100 },
];

/** The field names that break the server's rules (empty = the policy can be saved). */
export function invalidFields(p: RefundPolicy): string[] {
  const bad: string[] = [];
  for (const f of POLICY_FIELDS) {
    const v = (p[f.group] as Record<string, unknown>)?.[f.key];
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || (f.max !== undefined && v > f.max)) bad.push(`${f.group}.${f.key}`);
  }
  if (typeof p.pharmacy?.refund_delivery_fee_before_dispatch !== 'boolean') bad.push('pharmacy.refund_delivery_fee_before_dispatch');
  return bad;
}
