import { byRating, paged, parsePage, withProviderRating } from './catalogue-page';

describe('catalogue paging', () => {
  it('no page asked means no paging (older clients keep the array)', () => {
    expect(parsePage(undefined, '20')).toBeUndefined();
    expect(parsePage('', undefined)).toBeUndefined();
  });
  it('bounds page and limit', () => {
    expect(parsePage('2', '30')).toEqual({ page: 2, limit: 30 });
    expect(parsePage('0', '0')).toEqual({ page: 1, limit: 20 });
    expect(parsePage('x', '5000')).toEqual({ page: 1, limit: 100 });
    expect(parsePage('3', undefined)).toEqual({ page: 3, limit: 20 });
  });
  it('returns the true total and the page', () => {
    const rows = Array.from({ length: 45 }, (_, i) => ({ i }));
    expect(paged(rows, { page: 3, limit: 20 })).toEqual({ data: rows.slice(40), total: 45, page: 3, limit: 20, total_pages: 3 });
    expect(paged(rows, { page: 9, limit: 20 }).data).toEqual([]);
  });
});

describe('provider rating of a service', () => {
  const performs = (s: any, p: any) => p.does.includes(s.id);
  const providers: any[] = [
    { does: ['cbc'], rating_avg: 5, rating_count: 1 },
    { does: ['cbc', 'tsh'], rating_avg: 4, rating_count: 3 },
    { does: ['tsh'], rating_avg: 0, rating_count: 0 },           // never rated: not counted
  ];
  it('weights by the number of ratings; null when nobody who performs it is rated', () => {
    const out = withProviderRating([{ id: 'cbc' }, { id: 'tsh' }, { id: 'vitd' }], providers, performs);
    expect(out.map((s) => [s.id, s.rating, s.rating_count])).toEqual([['cbc', 4.25, 4], ['tsh', 4, 3], ['vitd', null, 0]]);
  });
  it('orders best rated first, unrated last, then by popularity', () => {
    const rows = [
      { id: 'u', rating: null, rating_count: 0, popularity: 99 },
      { id: 'a', rating: 4, rating_count: 3, popularity: 1 },
      { id: 'b', rating: 4.5, rating_count: 1, popularity: 1 },
      { id: 'c', rating: 4, rating_count: 3, popularity: 10 },
    ];
    expect(rows.sort(byRating).map((r) => r.id)).toEqual(['b', 'c', 'a', 'u']);
  });
});
