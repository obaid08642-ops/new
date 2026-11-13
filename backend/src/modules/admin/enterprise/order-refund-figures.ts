import { fromHalalas, percentOf, toHalalas } from '../../../common/money';

/**
 * R11 P2 (read path) for the admin console refund: what the patient paid, what was already refunded and the ceilings, computed on whole halalas.
 * Each payment row / refund ledger row contributes its integer shadow (`amount_halalas`) and falls back to its legacy double, converted with
 * `toHalalas`, where the shadow is missing. The old code added doubles and rounded the result.
 * `policyPercent` (null = no cancellation share applies) caps a "full" refund at that share of what was paid minus what was already refunded.
 */
type Row = { amount?: unknown; amount_halalas?: unknown };
const isHalalas = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v);
const rowHalalas = (r: Row): number => {
  if (isHalalas(r.amount_halalas)) return r.amount_halalas;
  const n = Number(r.amount || 0);
  return Number.isFinite(n) ? toHalalas(n) : 0;
};
const sum = (rows: Row[]) => rows.reduce((a, r) => a + rowHalalas(r), 0);

export interface OrderRefundFigures { paid: number; refunded: number; maxRefundable: number; ceiling: number; paidHalalas: number; maxRefundableHalalas: number; ceilingHalalas: number }

export function orderRefundFigures(payments: Row[], priorRefunds: Row[], policyPercent: number | null, hasOverride: boolean): OrderRefundFigures {
  const paidH = sum(payments);
  const refundedH = sum(priorRefunds);
  const maxH = paidH - refundedH;
  let ceilingH = maxH;
  if (policyPercent !== null && !hasOverride) ceilingH = Math.max(0, Math.min(maxH, percentOf(paidH, policyPercent) - refundedH));
  return {
    paid: fromHalalas(paidH), refunded: fromHalalas(refundedH), maxRefundable: fromHalalas(maxH), ceiling: fromHalalas(ceilingH),
    paidHalalas: paidH, maxRefundableHalalas: maxH, ceilingHalalas: ceilingH,
  };
}
