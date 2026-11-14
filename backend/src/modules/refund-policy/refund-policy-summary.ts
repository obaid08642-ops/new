import { DEFAULT_REFUND_POLICY } from './refund-policy.defaults';
import { POLICY_SECTION, policyStamp, type PolicyService } from '../../common/refund-policy-stamp';

/**
 * The rule of one service as text KEYS with numbers, built from the stored policy in force (never hard-coded in a client). The clients show the keys in their six languages next to the tick,
 * so the patient agrees to the rule that will actually be applied. `hash` / `version` are what the acceptance will be stored with for that service.
 */
export const POLICY_SERVICES = ['consultation', 'lab', 'radiology', 'nursing', 'pharmacy'] as const;

export interface PolicyLine { key: string; params: Record<string, number | boolean> }
export interface PolicySummary { service: PolicyService; version: string; hash: string; lines: PolicyLine[] }

const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);

export function policySummary(doc: { value?: any; updatedAt?: Date | string } | null | undefined, service: PolicyService): PolicySummary {
  const stamp = policyStamp(doc, service);
  const value: any = doc?.value && typeof doc.value === 'object' ? doc.value : DEFAULT_REFUND_POLICY;
  const sec: any = value[POLICY_SECTION[service]] ?? (DEFAULT_REFUND_POLICY as any)[POLICY_SECTION[service]] ?? {};
  const d: any = (DEFAULT_REFUND_POLICY as any)[POLICY_SECTION[service]];
  const lines: PolicyLine[] = [];
  if (service === 'consultation') {
    const hours = num(sec.full_refund_min_hours, d.full_refund_min_hours);
    lines.push({ key: 'refund.policy.consultation.full', params: { hours } });
    lines.push({ key: 'refund.policy.consultation.late', params: { hours, percent: num(sec.late_refund_percent, d.late_refund_percent) } });
    lines.push({ key: 'refund.policy.consultation.patient_no_show', params: { percent: num(sec.patient_no_show_percent, d.patient_no_show_percent) } });
    const free = num(sec.free_reschedules, d.free_reschedules);
    if (free > 0) lines.push({ key: 'refund.policy.consultation.free_reschedule', params: { count: free, hours: num(sec.free_reschedule_min_hours, d.free_reschedule_min_hours), within_days: 14 } });
    // a booking moved by the late free reschedule is refunded at the late rate if the patient cancels it (no way round the late percentage)
    if (free > 0) lines.push({ key: 'refund.policy.consultation.late_rescheduled', params: { percent: num(sec.late_refund_percent, d.late_refund_percent) } });
    lines.push({ key: 'refund.policy.provider_cancel', params: {} }, { key: 'refund.policy.provider_no_show', params: {} });
  } else if (service === 'lab' || service === 'nursing' || service === 'radiology') {
    // owner decision 2026-11-10: the consultation's 2-hour table applies to a patient's cancel; lab and nursing also keep the trip fee once the collector / nurse has set off
    const c: any = value.consultation ?? DEFAULT_REFUND_POLICY.consultation;
    const dc: any = DEFAULT_REFUND_POLICY.consultation;
    const hours = num(c.full_refund_min_hours, dc.full_refund_min_hours);
    lines.push({ key: `refund.policy.${service}.full`, params: { hours } });
    lines.push({ key: `refund.policy.${service}.late`, params: { hours, percent: num(c.late_refund_percent, dc.late_refund_percent) } });
    if (service !== 'radiology') lines.push({ key: `refund.policy.${service}.after_transit`, params: { trip_fee_sar: num(sec.trip_fee_sar, d.trip_fee_sar) } });
    if (service === 'nursing') lines.push({ key: 'refund.policy.nursing.patient_absent', params: { percent: num(sec.patient_absent_percent, d.patient_absent_percent) } });
    lines.push({ key: 'refund.policy.provider_cancel', params: {} });
  } else {
    // owner decision 2026-11-10: everything back until the pharmacy starts preparing; after that only a wrong, damaged or expired item (photo + admin review)
    lines.push({ key: 'refund.policy.pharmacy.before_preparation', params: { delivery_fee_refunded: typeof sec.refund_delivery_fee_before_dispatch === 'boolean' ? sec.refund_delivery_fee_before_dispatch : d.refund_delivery_fee_before_dispatch } });
    lines.push({ key: 'refund.policy.pharmacy.after_preparation', params: {} }, { key: 'refund.policy.provider_cancel', params: {} });
  }
  lines.push({ key: 'refund.policy.card_destination', params: {} });
  return { service, version: stamp.version, hash: stamp.hash, lines };
}
