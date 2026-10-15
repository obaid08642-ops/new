import { AdminAnalyticsService } from './analytics.module';

// P13-R10: admin ranking + search analytics (most viewed/searched/added/best
// sellers/trending/conversion by period and pharmacy; search top queries,
// no-result, emerging terms). Red on the base: only all-time top lists exist.
describe('P13-R10 ranking and search analytics', () => {
  function svcWith(rows: any[] = []) {
    const calls: any[] = [];
    const used: string[] = [];
    const conn: any = {
      collection: jest.fn((name: string) => {
        used.push(name);
        return {
          aggregate: jest.fn((pipe: any[]) => {
            calls.push(pipe);
            return { toArray: async () => rows };
          }),
        };
      }),
    };
    return { svc: new AdminAnalyticsService(conn), conn, calls, used };
  }

  it('rankingTop reports a mode ordered by its signal, scoped to a pharmacy', async () => {
    const rows = [{ drug_id: 'B', searches_count: 200 }, { drug_id: 'A', searches_count: 100 }];
    const { svc, calls, used } = svcWith(rows);
    const out: any = await (svc as any).rankingTop('most_searched', 'ph-1', undefined, 20);
    expect(out).toEqual(rows);
    expect(used).toEqual(['product_ranking_metrics']);
    const dumped = JSON.stringify(calls[0]);
    expect(dumped).toContain('searches_count');
    expect(dumped).toContain('ph-1');
  });

  it('rankingTop rejects an unknown mode', async () => {
    const { svc } = svcWith([]);
    await expect((svc as any).rankingTop('bogus', undefined, undefined, 20)).rejects.toThrow('invalid_ranking_mode');
  });

  it('searchZeroResult lists terms that returned nothing', async () => {
    const rows = [{ term: 'xyzq', searches: 9 }, { term: 'asdff', searches: 4 }];
    const { svc, calls, used } = svcWith(rows);
    const out: any = await (svc as any).searchZeroResult(20, 7);
    expect(out).toEqual(rows);
    expect(used).toEqual(['search_queries']);
    expect(JSON.stringify(calls[0])).toContain('results_count');
  });

  it('searchEmerging lists terms first seen inside the window', async () => {
    const rows = [{ term: 'newmed', searches: 12, first_seen: new Date().toISOString() }];
    const { svc, calls, used } = svcWith(rows);
    const out: any = await (svc as any).searchEmerging(20, 7);
    expect(out).toEqual(rows);
    expect(used).toEqual(['search_queries']);
    expect(JSON.stringify(calls[0])).toContain('first_seen');
  });
});
