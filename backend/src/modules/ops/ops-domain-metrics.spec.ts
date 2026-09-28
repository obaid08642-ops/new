import { OpsController } from './ops.controller';

function coll(docs: any[] = []) {
  const chain: any = {};
  chain.project = jest.fn().mockReturnValue(chain);
  chain.sort = jest.fn().mockReturnValue(chain);
  chain.limit = jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue(docs) });
  return {
    find: jest.fn().mockReturnValue(chain),
    countDocuments: jest.fn().mockResolvedValue(0),
    aggregate: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([]) }),
  };
}

describe('OpsController domain metrics and live map (R6-8)', () => {
  it('computes pharmacy fill rate and consultation no-show rate from live data', async () => {
    const allocs = coll([
      { items: [{ qty_ordered: 4, qty_filled: 3 }, { qty_ordered: 2, qty_filled: 2 }] },
    ]);
    const appts = coll();
    appts.countDocuments = jest.fn()
      .mockResolvedValueOnce(7)
      .mockResolvedValueOnce(70);
    const conn: any = {
      collection: jest.fn((name: string) => {
        if (name === 'pharmacy_allocations') return allocs;
        if (name === 'appointments') return appts;
        return coll();
      }),
    };
    const ctrl = new OpsController(conn, {} as any);
    const out: any = await ctrl.domainMetrics();
    expect(out.pharmacy.fill_rate_pct).toBeCloseTo(83.3, 1);
    expect(out.consultations.no_show).toBe(7);
    expect(out.consultations.no_show_rate_pct).toBe(10);
    expect(out.nursing.by_state).toEqual({});
  });

  it('lists live orders with coordinates and city rollups', async () => {
    const orders = coll([
      { id: 'o1', status: 'confirmed', delivery_address: { city: 'الرياض', geo: { lat: 24.7, lng: 46.7 } }, createdAt: new Date() },
      { id: 'o2', status: 'confirmed', delivery_address: { city: 'جدة' }, createdAt: new Date() },
    ]);
    const empty = coll([]);
    const conn: any = {
      collection: jest.fn((name: string) => (name === 'pharmacy_orders' ? orders : empty)),
    };
    const ctrl = new OpsController(conn, {} as any);
    const out: any = await ctrl.liveMap('50');
    expect(out.total).toBe(2);
    expect(out.with_geo).toBe(1);
    expect(out.by_city).toEqual({ 'الرياض': 1, 'جدة': 1 });
    expect(out.points[0].geo).toEqual({ lat: 24.7, lng: 46.7 });
  });
});
