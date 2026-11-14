import { DEFAULT_REFUND_POLICY } from '../refund-policy/refund-policy.defaults';

// ── a patient's refund REQUEST follows the admin policy too (screens-audit-3 gap 23, second half) ─────────────────────────────────────
// `RefundService.request` / `GET refunds/policy-preview` used fixed windows (24 h 100 %, 4 h 50 %). The appointment cancel path already follows
// `refund_policy.consultation`; a refund request now follows the same table: `full_refund_min_hours` or more before the start is a full refund,
// later (still before the start) `late_refund_percent`, and after the start / not attending `patient_no_show_percent`.

export interface ConsultationRefundTable { full_refund_min_hours: number; late_refund_percent: number; patient_no_show_percent: number }

const pct = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 100 ? v : d);
const hrs = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : d);

/** The consultation figures of a stored policy, each falling back to the default when missing or invalid. */
export function consultationTable(policy: any): ConsultationRefundTable {
  const c = policy?.consultation;
  const d = DEFAULT_REFUND_POLICY.consultation;
  return {
    full_refund_min_hours: hrs(c?.full_refund_min_hours, d.full_refund_min_hours),
    late_refund_percent: pct(c?.late_refund_percent, d.late_refund_percent),
    patient_no_show_percent: pct(c?.patient_no_show_percent, d.patient_no_show_percent),
  };
}

/** The window a refund request falls in. No start time: the full refund (as the old windows did). `nowMs` is injectable for tests. */
export function consultationRefundWindow(scheduledAt: Date | undefined, policy: any, nowMs: number = Date.now()): { percent: number; note_ar: string } {
  const t = consultationTable(policy);
  if (!scheduledAt || Number.isNaN(new Date(scheduledAt).getTime())) return { percent: 100, note_ar: `استرداد كامل` };
  const hours = (new Date(scheduledAt).getTime() - nowMs + 1000) / 3_600_000;
  if (hours >= t.full_refund_min_hours) return { percent: 100, note_ar: `إلغاء قبل ${t.full_refund_min_hours} ساعة أو أكثر — استرداد كامل` };
  if (hours >= 0) return { percent: t.late_refund_percent, note_ar: `إلغاء قبل أقل من ${t.full_refund_min_hours} ساعة — استرداد ${t.late_refund_percent}%` };
  return { percent: t.patient_no_show_percent, note_ar: `بعد موعد الجلسة أو عدم الحضور — استرداد ${t.patient_no_show_percent}%` };
}

/** The same table as the windows list `GET refunds/policy-preview` returns (hours_before descending), plus the no-show share. */
export function consultationRefundWindows(policy: any): { windows: Array<{ hours_before: number; percent: number; note_ar: string }>; no_show_percent: number } {
  const t = consultationTable(policy);
  return {
    windows: [
      { hours_before: t.full_refund_min_hours, percent: 100, note_ar: `إلغاء قبل ${t.full_refund_min_hours} ساعة أو أكثر — استرداد كامل` },
      { hours_before: 0, percent: t.late_refund_percent, note_ar: `إلغاء قبل أقل من ${t.full_refund_min_hours} ساعة — استرداد ${t.late_refund_percent}%` },
    ],
    no_show_percent: t.patient_no_show_percent,
  };
}
