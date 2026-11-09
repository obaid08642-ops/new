// Revenue screen maths on the server's monthly aggregate (GET /provider/stats/revenue, backend revenue-by-month.ts):
// the phone no longer adds up ledger rows. Months arrive oldest first, refunds already netted per month.
export interface RevenueMonth { month: string; earned: number; refunded: number; net: number }
export interface RevenueReply { currency?: string; months?: RevenueMonth[]; total?: { earned: number; refunded: number; net: number } }
export type RevenuePeriod = 1 | 3 | 12;

/** Server amounts are SAR rounded to the halala; sums are rounded back so 0.1 + 0.2 shows as 0.3. */
const r2 = (n: number) => Math.round(n * 100) / 100;

/** Totals of the `n` newest months and of the `n` months before them (null when the server sent fewer than 2n months). */
export function periodTotals(months: RevenueMonth[], n: RevenuePeriod) {
  const cur = months.slice(-n);
  const prev = months.length >= 2 * n ? months.slice(-2 * n, -n) : null;
  const fold = (rows: RevenueMonth[]) => ({
    earned: r2(rows.reduce((s, m) => s + m.earned, 0)),
    refunded: r2(rows.reduce((s, m) => s + m.refunded, 0)),
    net: r2(rows.reduce((s, m) => s + m.net, 0)),
  });
  const now = fold(cur);
  const before = prev ? fold(prev) : null;
  const delta = before && before.net > 0 ? Math.round(((now.net - before.net) / before.net) * 100) : null;
  return { ...now, delta };
}

/** The last 12 months for the bar chart, with the month's number (1-12) for its label. */
export function trendMonths(months: RevenueMonth[]) {
  return months.slice(-12).map((m) => ({ ...m, monthIndex: Number(m.month.slice(5, 7)) - 1, year: Number(m.month.slice(0, 4)) }));
}
