import { fromHalalas } from '../../common/money';

/**
 * R11 P2: the finance summary adds up whole halalas, not SAR doubles.
 *
 * `halalasSum('amount')` is the `$group` accumulator that adds a row's `amount_halalas` (the integer shadow, written with every money
 * write since R11 P1) and, only for a row that has none yet (history the backfill has not reached), its double times 100 rounded to a whole
 * halala. The report then adds integers and converts to SAR once at the end, so a day of 0.1 + 0.2 payments cannot drift.
 */
export const halalasSum = (field: string) => ({
  $sum: { $ifNull: [`$${field}_halalas`, { $toLong: { $round: [{ $multiply: [`$${field}`, 100] }, 0] } }] },
});

export interface GroupRow { _id?: any; total?: number; count?: number }
export interface EarningTotals { commission?: number; vat?: number; gross?: number; net?: number }

const sumOf = (rows: GroupRow[], match: (id: any) => boolean, key: 'total' | 'count' = 'total') =>
  rows.filter((x) => match(x._id)).reduce((s, x) => s + (Number(x[key]) || 0), 0);

/**
 * Every figure the summary reports, from the grouped halala totals (`total` is a whole number of halalas, `count` a count).
 * Pure, so it is tested without a database.
 */
export function reportFigures(payments: GroupRow[], ledgerRows: GroupRow[], refunds: GroupRow[], earnings: EarningTotals) {
  const p = (st: string) => sumOf(payments, (id) => id === st);
  const pc = (st: string) => sumOf(payments, (id) => id === st, 'count');
  const l = (type: string, state?: string) => sumOf(ledgerRows, (id) => id?.type === type && (!state || id?.state === state));
  const r = (st: string) => sumOf(refunds, (id) => String(id).toUpperCase() === st);
  const e = (k: keyof EarningTotals) => Number(earnings[k]) || 0;
  const sar = fromHalalas;
  return {
    gross_revenue: sar(p('paid') + p('refunded')),
    paid_count: pc('paid'),
    failed_count: pc('failed'),
    failed_volume: sar(p('failed')),
    // the commission and the VAT on it that refunds took back are subtracted: a refunded order earned the platform nothing
    commission: sar(e('commission') - l('commission_reversal')),
    vat_on_commission: sar(e('vat') - l('vat_reversal')),
    net_revenue: sar(e('commission') - l('commission_reversal') + e('vat') - l('vat_reversal')),
    provider_net: sar(e('net')),
    refunds_completed: sar(r('COMPLETED')),
    refunds_requested_count: refunds.reduce((s, x) => s + (Number(x.count) || 0), 0),
    chargebacks: sar(l('chargeback')),
    provider_pending_escrow: sar(l('provider_earning', 'pending')),
    provider_settled: sar(l('payout')),
    provider_debits: sar(l('provider_debit')),
  };
}
