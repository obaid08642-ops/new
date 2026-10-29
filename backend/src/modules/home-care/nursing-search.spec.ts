import { PatientHomeCareController } from './patient-home-care.controller';

function fakeConn(services: any[], nurses: any[]) {
  const calls: any[] = [];
  const collection = (name: string) => ({
    find: (filter: any) => {
      calls.push({ name, filter });
      const rows = name === 'provider_profiles' ? nurses : services;
      const cursor = { limit: () => ({ toArray: async () => rows }), toArray: async () => rows };
      return { ...cursor, sort: (spec: unknown) => { calls.push({ name, sort: spec }); return cursor; } };
    },
  });
  return { conn: { db: { collection } } as any, calls };
}

describe('GET /home-care/services/search (#645)', () => {
  const services = [
    { id: 'wound', name_ar: 'غيار جروح', price: 150 },
    { id: 'iv', name_ar: 'محاليل', price: 200 },
    { id: 'none', name_ar: 'بدون ممرض', price: 100 },
  ];
  const nurses = [
    { account_id: 'far', geo: { lat: 24.9, lng: 46.9 }, nursing_services: [{ key: 'wound' }] },
    { account_id: 'near', geo: { lat: 24.71, lng: 46.68 }, nursing_services: [{ key: 'iv' }] },
  ];

  it('escapes the text, keeps catalog filters and pages after ordering', async () => {
    const { conn, calls } = fakeConn(services, nurses);
    const c = new PatientHomeCareController(conn, {} as any);
    const out: any = await c.searchServices('a.(b', 'wound_care', '50', '300', undefined, undefined, '2', '2');
    const f = calls[0].filter;
    expect(calls.find((c: any) => c.sort)?.sort).toEqual({ rank_score: -1, popularity: -1, name_ar: 1 });          // the smart ranking is the default order
    expect(f.$or[0].name_ar.test('xa.(by')).toBe(true);
    expect(f.$or[0].name_ar.test('xaZZby')).toBe(false);
    expect(f.category).toBe('wound_care');
    expect(f.price).toEqual({ $gte: 50, $lte: 300 });
    expect(out.data.map((s: any) => s.id)).toEqual(['none']);
    expect(out.total).toBe(3);
  });

  it('orders by the nearest nurse who offers the service; unserved last', async () => {
    const { conn } = fakeConn(services, nurses);
    const c = new PatientHomeCareController(conn, {} as any);
    const out: any = await c.searchServices(undefined, undefined, undefined, undefined, '24.7', '46.67');
    expect(out.data.map((s: any) => s.id)).toEqual(['iv', 'wound', 'none']);
    expect(out.data[2].nearest_provider_km).toBeNull();
  });
});
