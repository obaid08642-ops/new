import { AdminDisputesController } from './admin-disputes.controller';

/**
 * 7B-B4: the per-dispute refund cap must come from admin-editable config
 * (system_configs key `dispute_config`), not from a hardcoded constant.
 */
describe('AdminDisputesController refund cap (7B-B4)', () => {
  const makeController = (disputeConfig: any) => {
    const configs: any[] = disputeConfig ? [{ key: 'dispute_config', value: disputeConfig }] : [];
    const tickets: any[] = [{ id: 'd-1', category: 'PAYMENT', status: 'OPEN', user_id: 'p1' }];
    const conn: any = {
      collection: (name: string) => {
        if (name === 'system_configs') {
          return { findOne: async (q: any) => configs.find((c) => c.key === q.key) || null };
        }
        if (name === 'supportrequests') {
          return {
            findOne: async (q: any) => tickets.find((t) => t.id === q.id) || null,
            updateOne: async () => ({}),
          };
        }
        return { find: () => ({ project: () => ({ toArray: async () => [] }) }) };
      },
    };
    const audit = { write: jest.fn(async () => undefined) };
    const executed: any[] = [];
    const refundExec = { execute: jest.fn(async (r: any) => { executed.push(r); return { ok: true }; }) };
    return { controller: new AdminDisputesController(conn, audit as any, refundExec as any), audit, executed };
  };

  // The admin JWT carries `role` (see getEffectiveRoles), not a `roles` array.
  const admin = { id: 'admin-1', role: 'admin' };
  const partial = { decision: 'refund_partial', amount: 100, reason: 'refund approved by admin review', booking_kind: 'consultation', booking_id: 'b-1' };

  it('uses the admin-configured cap from system_configs', async () => {
    const { controller, executed } = makeController({ max_refund_sar: 300 });
    const res = await controller.resolve('d-1', { ...partial, amount: 250 }, admin);
    expect(res.credited_amount).toBe(250);
    expect(executed[0].amount).toBe(250);
  });

  it('rejects a partial refund above the admin-configured cap', async () => {
    const { controller } = makeController({ max_refund_sar: 300 });
    await expect(controller.resolve('d-1', { ...partial, amount: 301 }, admin)).rejects.toThrow('amount_exceeds_cap_300');
  });

  it('falls back to the 2000 default when no admin value is stored', async () => {
    const { controller } = makeController(null);
    await expect(controller.resolve('d-1', { ...partial, amount: 2001 }, admin)).rejects.toThrow('amount_exceeds_cap_2000');
    const ok = await controller.resolve('d-1', { ...partial, amount: 2000 }, admin);
    expect(ok.credited_amount).toBe(2000);
  });

  it('caps refund_full at the admin-configured value', async () => {
    const { controller, executed } = makeController({ max_refund_sar: 150 });
    const res = await controller.resolve('d-1', { decision: 'refund_full', amount: 999, reason: 'full refund per policy', booking_kind: 'consultation', booking_id: 'b-1' }, admin);
    expect(res.credited_amount).toBe(150);
    expect(executed[0].amount).toBe(150);
  });
});


describe('AdminDisputesController list: refunded_so_far reads the ledger', () => {
  it('sums the ledger refund rows keyed by dispute id', async () => {
    const tickets = [{ id: 'd-1', category: 'PAYMENT', status: 'OPEN' }, { id: 'd-2', category: 'PAYMENT', status: 'OPEN' }];
    const ledger = [
      { type: 'refund', ref_type: 'refund', ref_id: 'dispute_d-1', amount: 40 },
      { type: 'refund', ref_type: 'refund', ref_id: 'dispute_d-1', amount: 10 },
    ];
    const asked: any[] = [];
    const conn: any = {
      collection: (name: string) => {
        if (name === 'supportrequests') {
          return {
            find: () => ({ sort: () => ({ skip: () => ({ limit: () => ({ project: () => ({ toArray: async () => tickets }) }) }) }) }),
            countDocuments: async () => tickets.length,
            aggregate: () => ({ toArray: async () => [] }),
          };
        }
        if (name === 'platformledgerentries') {
          return { find: (q: any) => { asked.push(q); return { project: () => ({ toArray: async () => ledger.filter((l) => q.ref_id.$in.includes(l.ref_id)) }) }; } };
        }
        return { findOne: async () => null };
      },
    };
    const controller = new AdminDisputesController(conn, { write: jest.fn() } as any, { execute: jest.fn() } as any);
    const res: any = await controller.list('open');
    expect(res.data.map((t: any) => t.refunded_so_far)).toEqual([50, 0]);
    expect(asked[0].ref_id.$in).toEqual(['dispute_d-1', 'dispute_d-2']);
  });
});
