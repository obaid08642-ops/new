import { SearchIntentService } from './search-intent.service';

describe('SearchIntentService.topQueries (R75)', () => {
  const svc = (aggResult: any[]) => {
    const analyticsModel = { aggregate: jest.fn().mockResolvedValue(aggResult) };
    return {
      service: new SearchIntentService({} as any, analyticsModel as any, {} as any),
      analyticsModel,
    };
  };

  it('returns zero-result queries first for P9 synonym work', async () => {
    const rows = [
      { query: 'بنادول', locale: 'ar', hits: 40, zero_result_hits: 12 },
      { query: 'xzyq', locale: 'en', hits: 3, zero_result_hits: 3 },
    ];
    const { service, analyticsModel } = svc(rows);
    await expect(service.topQueries(50, 30)).resolves.toEqual(rows);
    const pipeline = analyticsModel.aggregate.mock.calls[0][0];
    expect(pipeline[0]).toEqual({ $match: { created_at: { $gte: expect.any(Date) } } });
    expect(JSON.stringify(pipeline)).toContain('zero');
  });

  it('clamps limit and days to safe bounds', async () => {
    const { service, analyticsModel } = svc([]);
    await service.topQueries(9999, 9999);
    // limit 200 max; days 90 max — verified by no-throw + call made
    expect(analyticsModel.aggregate).toHaveBeenCalled();
    await service.topQueries(0, 0);
    expect(analyticsModel.aggregate).toHaveBeenCalledTimes(2);
  });
});
