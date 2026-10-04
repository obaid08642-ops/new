import { AnalyticsSuiteService, clickThroughRate } from './analytics-suite.service';

/** [13.R10] search CTR + ranking-mode analytics — mocked aggregates, no DB. */
describe('AnalyticsSuiteService search CTR + ranking modes (R10)', () => {
  const make = (aggRows: any[][]) => {
    const agg = jest.fn();
    for (const rows of aggRows) agg.mockReturnValueOnce({ toArray: jest.fn().mockResolvedValue(rows) });
    const conn: any = { collection: jest.fn().mockReturnValue({ aggregate: agg }) };
    return { svc: new AnalyticsSuiteService(conn), conn, agg };
  };

  it('clickThroughRate math: 1-decimal pct, zero clicks → 0, zero searches → null', () => {
    expect(clickThroughRate(25, 100)).toBe(25);
    expect(clickThroughRate(1, 3)).toBe(33.3);
    expect(clickThroughRate(0, 50)).toBe(0);
    expect(clickThroughRate(0, 0)).toBeNull();
  });

  it('searchClickThrough joins searches to clicks per query with CTR', async () => {
    const { svc, conn } = make([
      [{ _id: 'dentist', count: 100 }, { _id: 'nurse', count: 50 }],
      [{ _id: 'dentist', count: 25 }],
    ]);
    const out: any = await svc.searchClickThrough('2026-08-01', '2026-09-01');
    expect(conn.collection).toHaveBeenCalledWith('analytics_events');
    expect(out.overall).toEqual({ searches: 150, clicks: 25, ctr_pct: 16.7 });
    expect(out.rows).toEqual([
      { query: 'dentist', searches: 100, clicks: 25, ctr_pct: 25 },
      { query: 'nurse', searches: 50, clicks: 0, ctr_pct: 0 },
    ]);
  });

  it('rankingModes groups impressions/clicks/conversions by mode with rates', async () => {
    const { svc } = make([
      [
        { _id: 'default', impressions: 200, clicks: 40, conversions: 8 },
        { _id: 'top_rated', impressions: 100, clicks: 30, conversions: 9 },
      ],
    ]);
    const out: any = await svc.rankingModes('2026-08-01', '2026-09-01');
    expect(out.modes).toEqual([
      { mode: 'default', impressions: 200, clicks: 40, conversions: 8, ctr_pct: 20, conversion_rate_pct: 20 },
      { mode: 'top_rated', impressions: 100, clicks: 30, conversions: 9, ctr_pct: 30, conversion_rate_pct: 30 },
    ]);
  });

  it('rejects invalid date ranges', async () => {
    const { svc } = make([[]]);
    await expect(svc.searchClickThrough('nope', '2026-09-01')).rejects.toThrow();
    await expect(svc.rankingModes('2026-09-01', '2026-08-01')).rejects.toThrow();
  });
});
