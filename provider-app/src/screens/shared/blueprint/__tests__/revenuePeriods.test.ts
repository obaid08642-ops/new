import { periodTotals, trendMonths, RevenueMonth } from '../revenuePeriods';

const m = (month: string, earned: number, refunded = 0): RevenueMonth => ({ month, earned, refunded, net: Math.round((earned - refunded) * 100) / 100 });
const year: RevenueMonth[] = Array.from({ length: 24 }, (_, i) => m(`${2025 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`, 100));

describe('revenue periods on the server aggregate', () => {
  it('month = the newest month, compared with the one before', () => {
    const rows = [...year.slice(0, 23), m('2026-12', 150, 30)];
    const t = periodTotals(rows, 1);
    expect(t).toMatchObject({ earned: 150, refunded: 30, net: 120, delta: 20 });
  });

  it('3 months and 12 months add the months and compare with the same span before', () => {
    expect(periodTotals(year, 3)).toMatchObject({ earned: 300, net: 300, delta: 0 });
    expect(periodTotals(year, 12)).toMatchObject({ earned: 1200, net: 1200, delta: 0 });
  });

  it('no comparison when the server sent too few months, or the earlier span earned nothing', () => {
    expect(periodTotals(year.slice(-12), 12).delta).toBeNull();
    expect(periodTotals([m('2026-10', 0), m('2026-11', 50)], 1).delta).toBeNull();
  });

  it('sums do not drift (0.1 + 0.2)', () => {
    expect(periodTotals([m('2026-10', 0.1), m('2026-11', 0.2)], 3).earned).toBe(0.3);
  });

  it('the trend is the last 12 months with a 0-based month index', () => {
    const t = trendMonths(year);
    expect(t).toHaveLength(12);
    expect(t[0]).toMatchObject({ month: '2026-01', monthIndex: 0, year: 2026 });
    expect(t[11]).toMatchObject({ month: '2026-12', monthIndex: 11 });
  });
});
