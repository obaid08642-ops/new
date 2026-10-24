/**
 * The five differentiators (owner decision 2026-10-24), client side. Pure readers: every value is what the server sent and
 * an absent or malformed field gives null / an empty list, so the element is not drawn (nothing is invented or defaulted).
 *
 *  1. Late-appointment guarantee: the minutes and the Nabdat points come from GET /system-config/public (`late_guarantee`).
 *  2. Insurance estimate: `estimated_patient_share` of the ordering quote, and the card's copay % and cap on the policy.
 *  3. Licence line: "licensed by SCFHS, no. X" from the doctor's `license` object (number, authority, verified); no date.
 *  4. Doctors list: the `available_today` sort of GET /care/doctors and the book-now entry that preselects it.
 *  5. Visit summary: `follow_up_actions` of the completed appointment (prescription, labs, scans).
 */

type Raw = Record<string, unknown>;
const obj = (v: unknown): Raw | null => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Raw) : null);
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);

// ---------- 1. late-appointment guarantee ----------

export interface LateGuarantee {
  minutes: number;
  points: number;
}

/** The setting of GET /system-config/public (`late_guarantee: { minutes, points }`); null unless both are positive whole numbers. */
export function readLateGuarantee(config: unknown): LateGuarantee | null {
  const raw = obj(obj(config)?.late_guarantee);
  const minutes = raw ? num(raw.minutes) : null;
  const points = raw ? num(raw.points) : null;
  if (minutes === null || points === null) return null;
  if (!Number.isInteger(minutes) || !Number.isInteger(points) || minutes <= 0 || points <= 0) return null;
  return { minutes, points };
}

/** The loyalty reason and the notification type the server uses for a late credit. */
export const LATE_REASON = 'late_compensation';

// ---------- 2. insurance estimate ----------

/** Percent 0..100 and cap 0..1,000,000 SAR are the bounds of the backend DTOs (SavePolicyDto, UpdatePatientInsuranceDto). */
export const COPAY_CAP_MAX = 1_000_000;

export type CopayBody = { copay_percent?: number; copay_cap_sar?: number };
export type CopayParse = { ok: true; body: CopayBody } | { ok: false; field: 'percent' | 'cap' };

const DIGITS: Record<string, string> = { '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9', '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4', '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9', '٫': '.', ',': '.', '،': '.' };
const toNumber = (text: string): number => {
  const clean = text.trim().replace(/[٠-٩۰-۹٫,،]/g, (ch) => DIGITS[ch] ?? ch);
  return /^\d+(\.\d+)?$/.test(clean) ? Number(clean) : Number.NaN;
};

/** Both fields are optional: an empty one is left out of the body; a filled one must be a number in range. */
export function parseCopay(percentText: string, capText: string): CopayParse {
  const body: CopayBody = {};
  if (percentText.trim()) {
    const percent = toNumber(percentText);
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) return { ok: false, field: 'percent' };
    body.copay_percent = percent;
  }
  if (capText.trim()) {
    const cap = toNumber(capText);
    if (!Number.isFinite(cap) || cap < 0 || cap > COPAY_CAP_MAX) return { ok: false, field: 'cap' };
    body.copay_cap_sar = cap;
  }
  return { ok: true, body };
}

/** What the booking shows for an insured basket: the sum of the server's per-provider estimates, or only the acceptance line. */
export type InsuredShare = { kind: 'estimate'; amount: number } | { kind: 'accepted' };
export function insuredShare(estimates: Array<number | null>): InsuredShare {
  if (estimates.length === 0 || estimates.some((e) => e === null || !Number.isFinite(e))) return { kind: 'accepted' };
  const sum = (estimates as number[]).reduce((s, e) => s + e, 0);
  return { kind: 'estimate', amount: Math.round(sum * 100) / 100 };
}

// ---------- 3. licence line ----------

export interface LicenseLine {
  number: string;
  verified: boolean;
}

/** "Licensed by SCFHS, no. X": the number (from `license.number`, else the older SCFHS fields) and whether it was verified. Null without a number. */
export function readLicenseLine(doctor: unknown): LicenseLine | null {
  const d = obj(doctor);
  if (!d) return null;
  const license = obj(d.license);
  const number = str(license?.number) ?? str(d.scfhs_license_no) ?? str(d.scfhs_license_number);
  if (!number) return null;
  return { number, verified: license?.verified === true || d.license_verified === true };
}

// ---------- 5. visit summary actions ----------

/** `follow_up_actions` of the completed appointment (backend care/follow-up-actions.ts), parsed. */
export type FollowUpAction =
  | { kind: 'pharmacy_order'; prescriptionId: string }
  | { kind: 'lab_booking' | 'radiology_booking'; orderId: string; firstItemId: string };

/** The actions the server lists, in its order; unknown kinds, incomplete rows and expired orders (valid_until past) are dropped. */
export function readFollowUpActions(source: unknown, now: number = Date.now()): FollowUpAction[] {
  const list = obj(source)?.follow_up_actions;
  if (!Array.isArray(list)) return [];
  return list.flatMap((entry): FollowUpAction[] => {
    const a = obj(entry);
    if (!a) return [];
    if (a.kind === 'pharmacy_order') {
      const prescriptionId = str(a.prescription_id);
      return prescriptionId ? [{ kind: 'pharmacy_order', prescriptionId }] : [];
    }
    if (a.kind === 'lab_booking' || a.kind === 'radiology_booking') {
      const orderId = str(a.medical_order_id);
      const firstItemId = str(a.first_item_id);
      const until = str(a.valid_until);
      if (!orderId || !firstItemId) return [];
      if (until && Date.parse(until) <= now) return [];
      return [{ kind: a.kind, orderId, firstItemId }];
    }
    return [];
  });
}
