import { LabsService } from './labs.service';

const services = [
  { id: 't1', name_ar: 'أ', category: 'blood', price: 30, popularity: 5 },
  { id: 't2', name_ar: 'ب', category: 'blood', price: 10, popularity: 9 },
  { id: 't3', name_ar: 'ج', category: 'hormones', price: 20, popularity: 1 },
  { id: 't4', name_ar: 'د', category: 'hormones', price: 40, popularity: 7 },
];
const labs = [
  { test_categories: ['blood'], rating_avg: 3, rating_count: 10 },
  { test_categories: ['t3'], rating_avg: 5, rating_count: 2 },
];

function make() {
  const sorts: any[] = [];
  const svcModel: any = {
    find: jest.fn(() => {
      const chain: any = {
        sort: (s: any) => { sorts.push(s); return chain; },
        limit: () => Promise.resolve(services),
        lean: () => Promise.resolve([...services]),
        then: (res: any, rej: any) => Promise.resolve(services).then(res, rej),
      };
      return chain;
    }),
  };
  const providerProfiles: any = { find: jest.fn(() => ({ lean: () => Promise.resolve(labs) })) };
  const svc = new (LabsService as any)(svcModel, {}, {}, providerProfiles, {}, {}, {}, {});
  return { svc, sorts };
}

describe('GET /labs/services catalogue', () => {
  it('without page the answer is still the plain list', async () => {
    const { svc } = make();
    const out = await svc.list({});
    expect(Array.isArray(out)).toBe(true);
  });

  it('a page returns the true total, the page and every item keeps its category', async () => {
    const { svc } = make();
    const out = await svc.list({ page: 2, limit: 3 });
    expect(out).toMatchObject({ total: 4, page: 2, limit: 3, total_pages: 2 });
    expect(out.data).toHaveLength(1);
    expect(out.data[0].category).toBe('hormones');
  });

  it('highest rated ranks a test by the labs that run it; unrated tests come last', async () => {
    const { svc } = make();
    const out = await svc.list({ highest_rated: true });
    expect(out.map((s: any) => s.id)).toEqual(['t3', 't2', 't1', 't4']);   // t3 5.0; t2 and t1 both 3.0 (t2 is the more popular); t4: no lab runs it, unrated, last
  });

  it('lowest price sorts by price ascending at the database', async () => {
    const { svc, sorts } = make();
    await svc.list({ lowest_price: true });
    expect(sorts[0]).toEqual({ price: 1, popularity: -1 });
  });
});
