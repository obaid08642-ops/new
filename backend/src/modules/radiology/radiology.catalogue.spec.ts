import { RadiologyOpsService } from './radiology.service';

const scans = [
  { id: 's1', modality: 'xray', price: 100, popularity: 5 },
  { id: 's2', modality: 'mri', price: 0, popularity: 9 },        // no real price: never the cheapest
  { id: 's3', modality: 'mri', price: 400, popularity: 1 },
  { id: 's4', modality: 'ct', price: 250, popularity: 7 },
];
const centres = [
  { equipment_list: ['xray'], rating_avg: 4, rating_count: 5 },
  { equipment_list: ['s3'], rating_avg: 5, rating_count: 1 },
];

function make() {
  const queries: any[] = [];
  const svcModel: any = {
    find: jest.fn((q: any) => { queries.push(q); return { sort: () => ({ lean: () => Promise.resolve([...scans].sort((a, b) => b.popularity - a.popularity)) }), lean: () => Promise.resolve([...scans]) }; }),
  };
  const profileModel: any = { find: jest.fn(() => ({ lean: () => Promise.resolve(centres) })) };
  const none: any = {};
  const svc = new (RadiologyOpsService as any)(svcModel, none, none, none, none, none, profileModel, none, none);
  return { svc, queries };
}

describe('GET /radiology/services catalogue', () => {
  it('without page the answer is the plain list, each scan with its category', async () => {
    const { svc } = make();
    const out = await svc.list({});
    expect(out.map((s: any) => s.id)).toEqual(['s2', 's4', 's1', 's3']);
    expect(out.map((s: any) => s.category)).toEqual(['mri', 'ct', 'xray', 'mri']);
  });

  it('a page returns the true total', async () => {
    const { svc } = make();
    const out = await svc.list({ page: 1, limit: 3 });
    expect(out).toMatchObject({ total: 4, page: 1, limit: 3, total_pages: 2 });
    expect(out.data).toHaveLength(3);
  });

  it('the category is the modality filter', async () => {
    const { svc, queries } = make();
    await svc.list({ modality: 'mri' });
    expect(queries[0].modality).toEqual({ $eq: 'mri' });
  });

  it('lowest price sorts ascending and puts a scan without a price last', async () => {
    const { svc } = make();
    const out = await svc.list({ lowest_price: true });
    expect(out.map((s: any) => s.id)).toEqual(['s1', 's4', 's3', 's2']);
  });

  it('highest rated ranks a scan by the centres that perform it; unrated last', async () => {
    const { svc } = make();
    const out = await svc.list({ highest_rated: true });
    expect(out.map((s: any) => [s.id, s.rating])).toEqual([['s3', 5], ['s1', 4], ['s2', null], ['s4', null]]);
  });
});
