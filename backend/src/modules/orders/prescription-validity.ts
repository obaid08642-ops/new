/**
 * P22.1 — prescription-validity helpers (pure functions, no Nest DI).
 *
 * A prescription document on disk (`prescriptions` collection) carries no explicit
 * expiry field, so refill/eligibility logic derives it as:
 *   explicit override (stored on the subscription at subscribe time)
 *   → verified_at (pharmacist verification)
 *   → createdAt/created_at (issue date)
 *   + validity window (default 90 days for chronic medicines).
 *
 * Nothing here touches the DB: callers pass plain documents.
 */

export const DEFAULT_RX_VALIDITY_DAYS = 90;

export interface RxLike {
  verified_at?: string | Date | null;
  createdAt?: string | Date | null;
  created_at?: string | Date | null;
  valid_until?: string | Date | null;
}

export interface RxLineLike {
  medicine_id?: string | null;
  active_ingredient?: string | null;
}

function toTime(v: string | Date | null | undefined): number | null {
  if (!v) return null;
  const t = new Date(v).getTime();
  return Number.isNaN(t) ? null : t;
}

/** Resolve the instant a prescription stops being valid for refills. */
export function resolvePrescriptionExpiry(
  rx: RxLike,
  validityDays: number = DEFAULT_RX_VALIDITY_DAYS,
): Date | null {
  const explicit = toTime(rx.valid_until);
  if (explicit !== null) return new Date(explicit);
  const base =
    toTime(rx.verified_at) ?? toTime(rx.createdAt) ?? toTime(rx.created_at);
  if (base === null) return null;
  return new Date(base + validityDays * 24 * 3600 * 1000);
}

/** True when `at` is strictly before expiry (no refill past expiry, boundary-safe). */
export function isPrescriptionValidAt(
  rx: RxLike,
  at: Date = new Date(),
  validityDays: number = DEFAULT_RX_VALIDITY_DAYS,
): boolean {
  const expiry = resolvePrescriptionExpiry(rx, validityDays);
  if (!expiry) return false;
  return at.getTime() < expiry.getTime();
}

function norm(s: string | null | undefined): string {
  return String(s || '').trim().toLowerCase();
}

/**
 * Does this prescription cover a medicine line — by exact medicine id or by
 * active ingredient (covers substitutions across brands)?
 */
export function prescriptionCovers(
  rx: { items?: RxLineLike[] | null },
  medicineId: string,
  activeIngredient?: string | null,
): boolean {
  const items = Array.isArray(rx.items) ? rx.items : [];
  const wantId = norm(medicineId);
  const wantIng = norm(activeIngredient);
  return items.some((line) => {
    if (wantId && norm(line.medicine_id) === wantId) return true;
    if (wantIng && norm(line.active_ingredient) === wantIng) return true;
    return false;
  });
}

export type RxStatus = 'not_required' | 'valid' | 'expired' | 'missing';

/** Classify one reorder/refill line for an Rx-gated medicine. */
export function classifyRxLine(opts: {
  requiresPrescription: boolean;
  covering: RxLike | null;
  at?: Date;
  validityDays?: number;
}): { status: RxStatus; validUntil: Date | null } {
  if (!opts.requiresPrescription) return { status: 'not_required', validUntil: null };
  if (!opts.covering) return { status: 'missing', validUntil: null };
  const validUntil = resolvePrescriptionExpiry(
    opts.covering,
    opts.validityDays ?? DEFAULT_RX_VALIDITY_DAYS,
  );
  const ok = isPrescriptionValidAt(
    opts.covering,
    opts.at ?? new Date(),
    opts.validityDays ?? DEFAULT_RX_VALIDITY_DAYS,
  );
  return { status: ok ? 'valid' : 'expired', validUntil };
}
