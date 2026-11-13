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

/**
 * The widgets next to the trend used to be added up on the phone from the newest 200 ledger rows of any type (provider-app
 * RevenueInsights: "computed on the phone from its newest rows"), so a provider with more movement than that saw a part of the
 * truth, and the service breakdown grouped on `service_type` / `reference_type`, which a ledger row does not carry (every row fell
 * into "other"). These aggregates answer the same questions on the server, over the whole range, grouping earnings by `ref_type`.
 */

/** Earnings of the range grouped by what was earned on (`ref_type` of the provider_earning row). */
export function earningsByRefTypePipeline(accountIds: string[], from: Date): object[] {
  return [
    { $match: { provider_account_id: { $in: accountIds }, createdAt: { $gte: from }, type: 'provider_earning' } },
    { $group: { _id: { $ifNull: ['$ref_type', 'other'] }, total: halalasSum('amount') } },
    { $sort: { total: -1 } },
  ];
}

/** Every movement of the range grouped by ledger type (earning, payout, commission, ...). */
export function movementsByTypePipeline(accountIds: string[], from: Date): object[] {
  return [
    { $match: { provider_account_id: { $in: accountIds }, createdAt: { $gte: from } } },
    { $group: { _id: '$type', total: halalasSum('amount') } },
    { $sort: { total: -1 } },
  ];
}

/** All-time wallet figures: what was earned, what was paid out, and what is still pending (no row limit). */
export function walletTotalsPipeline(accountIds: string[]): object[] {
  return [
    { $match: { provider_account_id: { $in: accountIds } } },
    { $group: { _id: { t: '$type', pending: { $eq: ['$state', 'pending'] } }, total: halalasSum('amount') } },
  ];
}

export interface RevenueSlice { key: string; amount: number }

/** Grouped halala totals to a list in SAR, largest first (a negative or absent total is dropped). */
export function foldSlices(rows: Array<{ _id?: unknown; total?: number }>): RevenueSlice[] {
  return rows
    .map((r) => ({ key: String(r?._id ?? 'other'), halalas: Number(r?.total) || 0 }))
    .filter((r) => r.halalas > 0)
    .sort((a, b) => b.halalas - a.halalas)
    .map((r) => ({ key: r.key, amount: fromHalalas(r.halalas) }));
}

export interface WalletTotals { earned: number; paid: number; pending: number; balance: number }

/** All-time earned / paid / pending and the balance (never below zero), from the grouped halala totals. */
export function foldWalletTotals(rows: Array<{ _id?: { t?: string; pending?: boolean }; total?: number }>): WalletTotals {
  let earned = 0, paid = 0, pending = 0;
  for (const r of rows) {
    const halalas = Number(r?.total) || 0;
    if (r?._id?.t === 'provider_earning') earned += halalas;
    else if (r?._id?.t === 'payout') paid += halalas;
    if (r?._id?.pending === true) pending += halalas;
  }
  return { earned: fromHalalas(earned), paid: fromHalalas(paid), pending: fromHalalas(pending), balance: fromHalalas(Math.max(0, earned - paid)) };
}
