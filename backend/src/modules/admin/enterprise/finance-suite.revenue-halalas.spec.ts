import { momComparison, seriesToRows } from './finance-suite.service';

const day = (d: string) => new Date(`${d}T10:00:00Z`);

describe('revenue series on integer halalas (R11 P2 read path)', () => {
  it('adds the amount_halalas shadows exactly', () => {
    const rows = seriesToRows([
      { paid_at: day('2026-11-01'), amount: 0.1, amount_halalas: 10, booking_kind: 'consultation' },
      { paid_at: day('2026-11-01'), amount: 0.2, amount_halalas: 20, booking_kind: 'consultation' },
    ], 'day');
    expect(rows).toHaveLength(1);
    expect(rows[0].gross_halalas).toBe(30);
    expect(rows[0].gross).toBe(0.3);
    expect(rows[0].count).toBe(2);
  });
  it('falls back to the double per payment when a shadow is missing', () => {
    const rows = seriesToRows([
      { paid_at: day('2026-11-01'), amount: 12.34, booking_kind: 'lab' },
      { paid_at: day('2026-11-01'), amount: 1.1, amount_halalas: 110, booking_kind: 'lab' },
    ], 'day');
    expect(rows[0].gross_halalas).toBe(1344);
    expect(rows[0].gross).toBe(13.44);
  });
  it('the shadow wins over the double when both are present', () => {
    const rows = seriesToRows([{ paid_at: day('2026-11-01'), amount: 100, amount_halalas: 9999, booking_kind: 'lab' }], 'day');
    expect(rows[0].gross).toBe(99.99);
  });
  it('buckets by day and vertical and ignores a payment with no date', () => {
    const rows = seriesToRows([
      { paid_at: day('2026-11-01'), amount_halalas: 100, booking_kind: 'lab' },
      { paid_at: day('2026-11-02'), amount_halalas: 200, booking_kind: 'lab' },
      { amount_halalas: 999, booking_kind: 'lab' },
    ], 'day');
    expect(rows.map((r) => [r.bucket, r.gross])).toEqual([['2026-11-01', 1], ['2026-11-02', 2]]);
  });
  it('month over month adds in halalas and keeps the percentage', () => {
    const cur = seriesToRows([
      { paid_at: day('2026-11-05'), amount_halalas: 10, booking_kind: 'lab' },
      { paid_at: day('2026-11-06'), amount_halalas: 20, booking_kind: 'lab' },
    ], 'day');
    const prev = seriesToRows([{ paid_at: day('2026-10-05'), amount_halalas: 20, booking_kind: 'lab' }], 'day');
    const out = momComparison(cur, day('2026-11-01'), day('2026-11-30'), prev);
    expect(out).toEqual([{ vertical: 'lab', current: 0.3, previous: 0.2, delta_pct: 50 }]);
  });
  it('a previous window with nothing paid gives a null percentage', () => {
    const cur = seriesToRows([{ paid_at: day('2026-11-05'), amount_halalas: 500, booking_kind: 'lab' }], 'day');
    expect(momComparison(cur, day('2026-11-01'), day('2026-11-30'), [])[0].delta_pct).toBeNull();
  });
});
