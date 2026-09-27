import { AdminReportsController } from './admin-reports.controller';

/** P6.x-1: reports guardrails + aggregation wiring. */
describe('AdminReportsController', () => {
  const make = (rows: any[] = []) => {
    const agg = jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue(rows) });
    const conn: any = { collection: jest.fn().mockReturnValue({ aggregate: agg }) };
    return { ctrl: new AdminReportsController(conn), conn, agg };
  };

  it('rejects bad dates and over-wide ranges', async () => {
    const { ctrl } = make();
    await expect(ctrl.revenue({ from: 'nope' } as any, undefined, undefined)).rejects.toThrow();
    await expect(ctrl.revenue({ from: '2020-01-01', to: '2025-01-01' } as any, undefined, undefined)).rejects.toThrow();
  });

  it('revenue reads paid transactions and returns rows', async () => {
    const { ctrl, conn } = make([{ bucket: '2026-09-01', gross: 100, refunded: 10, net: 90, count: 2 }]);
    const out: any = await ctrl.revenue({}, undefined, undefined);
    expect(conn.collection).toHaveBeenCalledWith('transactions');
    expect(out.rows).toHaveLength(1);
    expect(out.rows[0].net).toBe(90);
  });

  it('bookings fans out across the five booking collections', async () => {
    const { ctrl, conn } = make([{ bucket: '2026-09-01', count: 3 }]);
    const out: any = await ctrl.bookings({}, undefined, undefined);
    expect(conn.collection).toHaveBeenCalledWith('appointments');
    expect(conn.collection).toHaveBeenCalledWith('homecarebookings');
    expect(out.rows).toHaveLength(5);
    expect(out.rows.every((r: any) => r.kind)).toBe(true);
  });
});
