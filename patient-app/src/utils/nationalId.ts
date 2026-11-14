/**
 * Owner decision 6 (2026-11-10): the patient's national ID or iqama number is asked for ONLY when a medical report is requested, or when
 * the doctor issued one and the number is missing (the PDF answers 409 `national_id_required` until it is added). Lane Z's API:
 *   GET /care/sick-leaves/national-id   -> { has_national_id, national_id (masked) }
 *   PUT /care/sick-leaves/national-id   { national_id }  -> same shape; 400 `national_id_invalid`
 * The check below is the server's (10 digits, starts with 1 or 2, Luhn-style check digit) so a typo is caught before the call.
 * Same helper as the web (patient-web/lib/medical-reports/national-id.ts).
 */
const ARABIC_INDIC = /[٠-٩]/g;
const PERSIAN = /[۰-۹]/g;

/** The number as digits, or null when it is not a valid Saudi national ID / iqama number. */
export function normaliseNationalId(raw: string): string | null {
  const v = raw
    .trim()
    .replace(ARABIC_INDIC, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(PERSIAN, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[\s-]/g, '');
  if (!/^[12]\d{9}$/.test(v)) return null;
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const d = Number(v[i]);
    if (i % 2 === 0) { const t = d * 2; sum += t > 9 ? t - 9 : t; } else sum += d;
  }
  return sum % 10 === 0 ? v : null;
}

/** Whether the patient already gave the number, from the status answer; unknown (null) when the answer is unreadable. */
export function readNationalIdStatus(payload: unknown): boolean | null {
  const root = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : null;
  const inner = root && root.data && typeof root.data === 'object' ? (root.data as Record<string, unknown>) : root;
  return inner && typeof inner.has_national_id === 'boolean' ? inner.has_national_id : null;
}
