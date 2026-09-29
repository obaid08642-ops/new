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

describe('OpsController alerts (7B-B3)', () => {
  it('flags orders stuck past the configured threshold and failed payments', async () => {
    const old = new Date(Date.now() - 3600000);
    const stuckOrders = coll([
      { id: 'lab-1', state: 'CONFIRMED', createdAt: old },
    ]);
    const failedTx = coll([
      { id: 'tx-1', booking_kind: 'lab', booking_id: 'lab-1', amount: 110, status: 'failed', createdAt: old },
    ]);
    const conn: any = {
      collection: jest.fn((name: string) => {
        if (name === 'system_config') return { findOne: jest.fn().mockResolvedValue({ value: { ops_stuck_minutes: 30 } }) };
        if (name === 'labbookings') return stuckOrders;
        if (name === 'transactions') return failedTx;
        return coll();
      }),
    };
    const out: any = await new OpsController(conn, {} as any).alerts();
    expect(out.stuck_minutes_threshold).toBe(30);
    expect(out.stuck_count).toBe(1);
    expect(out.stuck_orders[0]).toMatchObject({ kind: 'lab', id: 'lab-1', state: 'CONFIRMED' });
    expect(out.failed_count).toBe(1);
    expect(out.failed_payments[0]).toMatchObject({ id: 'tx-1', status: 'failed' });
  });

  it('reports zero alerts on a healthy platform', async () => {
    const conn: any = {
      collection: jest.fn((name: string) => {
        if (name === 'system_config') return { findOne: jest.fn().mockResolvedValue(null) };
        return coll();
      }),
    };
    const out: any = await new OpsController(conn, {} as any).alerts();
    expect(out.stuck_minutes_threshold).toBe(30);
    expect(out.stuck_count).toBe(0);
    expect(out.failed_count).toBe(0);
  });
});
