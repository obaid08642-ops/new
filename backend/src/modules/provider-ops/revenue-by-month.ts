import { halalasSum } from '../finance-engine/report-totals';
import { fromHalalas } from '../../common/money';

/**
 * A provider's revenue per month, refunds netted (the provider app's revenue screen used to add this up on the phone from the newest 200 ledger rows of any type).
 * `earned` = the provider_earning rows of the month (what the provider is credited, after commission and VAT); `refunded` = the clawbacks (`provider_debit` with ref_type
 * 'refund') booked in the month; `net` = earned - refunded. A refund is counted in the month it is made (cash basis), not the month of the order. Months are Saudi calendar
 * months (Asia/Riyadh, UTC+3 all year). Whole halalas are added and converted to SAR once.
 */
export const REVENUE_TZ = 'Asia/Riyadh';
const RIYADH_OFFSET_MS = 3 * 3600_000;
export const MAX_REVENUE_MONTHS = 24;

/** 'YYYY-MM' of a moment in Riyadh. */
export function monthKey(d: Date): string {
  const s = new Date(d.getTime() + RIYADH_OFFSET_MS);
  return `${s.getUTCFullYear()}-${String(s.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** The `months` month keys ending with the month of `now`, oldest first. */
export function monthKeys(now: Date, months: number): string[] {
  const s = new Date(now.getTime() + RIYADH_OFFSET_MS);
  const out: string[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth() - i, 1));
    out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  return out;
}

/** The instant the oldest month starts (midnight of its first day in Riyadh). */
export function rangeStart(now: Date, months: number): Date {
  const s = new Date(now.getTime() + RIYADH_OFFSET_MS);
  return new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth() - (months - 1), 1) - RIYADH_OFFSET_MS);
}

export function clampMonths(raw: unknown): number {
  const n = Math.trunc(Number(raw));
  return Number.isFinite(n) && n >= 1 ? Math.min(n, MAX_REVENUE_MONTHS) : 12;
}

export function revenuePipeline(accountIds: string[], from: Date): object[] {
  return [
    { $match: { provider_account_id: { $in: accountIds }, createdAt: { $gte: from }, $or: [{ type: 'provider_earning' }, { type: 'provider_debit', ref_type: 'refund' }] } },
    { $group: { _id: { m: { $dateToString: { format: '%Y-%m', date: '$createdAt', timezone: REVENUE_TZ } }, t: '$type' }, total: halalasSum('amount') } },
  ];
}

export interface RevenueMonth { month: string; earned: number; refunded: number; net: number }

/** Folds the grouped halala totals into one row per month (months with nothing are there with zeros) and the totals. */
export function foldRevenue(rows: Array<{ _id?: { m?: string; t?: string }; total?: number }>, now: Date, months: number) {
  const keys = monthKeys(now, months);
  const acc = new Map(keys.map((k) => [k, { earned: 0, refunded: 0 }]));
  for (const r of rows) {
    const slot = acc.get(String(r._id?.m));
    if (!slot) continue;                                   // outside the range
    if (r._id?.t === 'provider_earning') slot.earned += Number(r.total) || 0;
    else if (r._id?.t === 'provider_debit') slot.refunded += Number(r.total) || 0;
  }
  const list: RevenueMonth[] = keys.map((k) => { const v = acc.get(k)!; return { month: k, earned: fromHalalas(v.earned), refunded: fromHalalas(v.refunded), net: fromHalalas(v.earned - v.refunded) }; });
  const sum = [...acc.values()].reduce((s, v) => ({ earned: s.earned + v.earned, refunded: s.refunded + v.refunded }), { earned: 0, refunded: 0 });
  return { currency: 'SAR', months: list, total: { earned: fromHalalas(sum.earned), refunded: fromHalalas(sum.refunded), net: fromHalalas(sum.earned - sum.refunded) } };
}
