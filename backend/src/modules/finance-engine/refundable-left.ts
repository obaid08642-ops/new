import { fromHalalas, toHalalas } from '../../common/money';

/**
 * R11 P2 (read path): what is still refundable on a paid card transaction = paid - already refunded, in SAR.
 *
 * Reads the integer shadows `amount_halalas` and `refunded_amount_halalas` (written by halalaShadowPlugin on `transactions`) and subtracts whole
 * halalas; a field with no shadow yet (a row not backfilled, or float drift that left the shadow unset) falls back to its legacy double, converted
 * with `toHalalas`. A missing `refunded_amount` means nothing was refunded. Never below 0. The old code did `round(paid - refunded)` on doubles.
 */
const isHalalas = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v);
const fromDouble = (v: unknown): number => { const n = Number(v); return Number.isFinite(n) ? toHalalas(n) : 0; };

export function refundableLeftSar(paid: { amount?: unknown; amount_halalas?: unknown; refunded_amount?: unknown; refunded_amount_halalas?: unknown } | null | undefined): number {
  if (!paid) return 0;
  const total = isHalalas(paid.amount_halalas) ? paid.amount_halalas : fromDouble(paid.amount);
  const refunded = isHalalas(paid.refunded_amount_halalas) ? paid.refunded_amount_halalas : fromDouble(paid.refunded_amount);
  return fromHalalas(Math.max(0, total - refunded));
}
