/** Issue 1236: a pharmacy order stuck in a real PharmacyOrderState (lower case) is reported; the admin threshold applies. */
import { OpsController } from './ops.controller';

const coll = (docs: any[] = [], seen?: any[]) => {
  const chain: any = {};
  chain.sort = jest.fn().mockReturnValue(chain);
  chain.limit = jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue(docs) });
  return { find: jest.fn((q: any) => { seen?.push(q); return chain; }) };
};

describe('ops alerts: stuck pharmacy orders (issue 1236)', () => {
  it('asks pharmacy_orders for its real in-flight states, past the admin threshold', async () => {
    const seen: any[] = [];
    const old = new Date(Date.now() - 3600000);
    const conn: any = {
      collection: jest.fn((name: string) => {
        if (name === 'system_configs') return { findOne: jest.fn().mockResolvedValue({ value: { stuck_minutes: 5 } }) };
        if (name === 'pharmacy_orders') return coll([{ id: 'ph-1', status: 'broadcasting', createdAt: old }], seen);
        return coll();
      }),
    };
    const out: any = await new OpsController(conn, {} as any).alerts();
    expect(out.stuck_minutes_threshold).toBe(5);
    expect(seen[0].status.$in).toEqual(expect.arrayContaining(['broadcasting', 'manual_review', 'confirmed']));
    expect(out.stuck_orders).toEqual([expect.objectContaining({ kind: 'pharmacy', id: 'ph-1', state: 'broadcasting' })]);
  });
});
