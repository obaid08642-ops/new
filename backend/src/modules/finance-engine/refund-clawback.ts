import { fromHalalas, rateOf, toHalalas } from '../../common/money';

/**
 * R11 P2: how a refund is shared between the provider's clawback, the commission reversal and the VAT reversal.
 *
 * The share of what the patient PAID that is refunded is a ratio of two whole halala amounts, and each part (provider net, commission, VAT on the
 * commission) is its earning figure times that ratio rounded half away from zero on integers (`rateOf`, BigInt). The old code multiplied doubles
 * (`earning.amount * (amount / paid)`) and rounded the result, which could land a halala off for amounts such as 0.1 + 0.2 or a third of a payment.
 * The three parts are rounded one by one, so together they can differ from the refund by at most 1 halala per part (INV-4 of the daily integrity
 * check tolerates 1 halala per refund); the refund itself is never changed here.
 */
export interface EarningFigures { amount?: unknown; commission?: unknown; vat?: unknown; gross?: unknown }
export interface ClawbackShares { fraction: number; provider: number; commission: number; vat: number }

const h = (v: unknown): number => { const n = Number(v); return Number.isFinite(n) ? toHalalas(n) : 0; };

export function clawbackShares(earning: EarningFigures, refundSar: number, paidTotalSar: number): ClawbackShares {
  const refund = h(refundSar);
  // what the patient paid; the earning's gross (the provider's own lines only) is the fallback when the payment total is unknown, and the refund itself the last resort
  const paid = h(paidTotalSar) > 0 ? h(paidTotalSar) : (h(earning.gross) > 0 ? h(earning.gross) : refund);
  if (!(paid > 0) || !(refund > 0)) return { fraction: 0, provider: 0, commission: 0, vat: 0 };
  const num = Math.min(refund, paid);          // never more than the whole
  const part = (sar: unknown) => fromHalalas(rateOf(Math.max(0, h(sar)), num, paid));
  return { fraction: Math.round((num * 10000) / paid) / 10000, provider: part(earning.amount), commission: part(earning.commission), vat: part(earning.vat) };
}
