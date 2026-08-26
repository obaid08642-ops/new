/**
 * A2 acceptance — pure finance math (revenue bucketing, MoM, payout rules).
 * Numbers here are cross-checked against hand-computed SQL equivalents.
 */
import { bucketKey, seriesToRows, momComparison, RevenueRow } from '../src/modules/admin-enterprise/finance-suite.service';

describe('A2 · revenue bucketing', () => {
  it('day buckets use ISO dates', () => {
    expect(bucketKey(new Date('2026-03-05T13:22:00Z'), 'day')).toBe('2026-03-05');
  });
  it('week buckets snap to Monday', () => {
    // 2026-01-07 is a Wednesday → week starts Monday 2026-01-05
    expect(bucketKey(new Date('2026-01-07T10:00:00Z'), 'week')).toBe('W2026-01-05');
  });
  it('month buckets are YYYY-MM', () => {
    expect(bucketKey(new Date('2026-02-28T23:59:59Z'), 'month')).toBe('2026-02');
  });
});

describe('A2 · series + MoM (manual SQL cross-check)', () => {
  const mk = (paidAt: string, amount: number, kind: string) => ({ paid_at: new Date(paidAt), amount, booking_kind: kind });

  it('aggregates gross per bucket×vertical like GROUP BY date(when), vertical', () => {
    const rows = seriesToRows([
      mk('2026-03-01T09:00:00Z', 100, 'consultation'),
      mk('2026-03-01T15:00:00Z', 250, 'pharmacy-order'),
      mk('2026-03-02T11:00:00Z', 50, 'pharmacy-order'),
      mk('2026-03-02T12:00:00Z', 200, 'lab'),
    ], 'day');
    const mar1 = rows.filter((r) => r.bucket === '2026-03-01');
    expect(mar1.find((r) => r.vertical === 'consultation')!.gross).toBe(100);
    expect(mar1.find((r) => r.vertical === 'pharmacy')!.gross).toBe(250);
    expect(rows.filter((r) => r.bucket === '2026-03-02').reduce((a, r) => a + r.gross, 0)).toBe(250);
  });

  it('MoM delta matches hand computation (current vs previous window)', () => {
    const cur: RevenueRow[] = [{ bucket: '2026-03-01', vertical: 'pharmacy', gross: 1200, count: 10 }];
    const prev: RevenueRow[] = [
      { bucket: '2026-02-01', vertical: 'pharmacy', gross: 1500, count: 12 },
      { bucket: '2026-02-08', vertical: 'lab', gross: 300, count: 3 },
    ];
    const mom = momComparison(cur, new Date('2026-03-01'), new Date('2026-03-31'), prev);
    const pharmacyRow = mom.find((r) => r.vertical === 'pharmacy')!;
    // (1200 − 1500)/1500 = −20%
    expect(pharmacyRow.current).toBe(1200);
    expect(pharmacyRow.previous).toBe(1500);
    expect(pharmacyRow.delta_pct).toBe(-20);
  });

  it('null delta when previous window had no revenue for the vertical', () => {
    const mom = momComparison(
      [{ bucket: '2026-03-01', vertical: 'radiology', gross: 500, count: 4 }],
      new Date('2026-03-01'), new Date('2026-03-31'),
      [],
    );
    expect(mom[0].delta_pct).toBeNull();
  });
});
