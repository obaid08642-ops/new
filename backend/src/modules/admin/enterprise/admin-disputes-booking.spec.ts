import { AdminDisputesController } from './admin-disputes.controller';

// PT-15: a patient's dispute names the charge; the admin resolves it against that booking, once.
describe('dispute about a charge', () => {
  function make(ticket: any) {
    const tickets = [ticket];
    const ledger = [{ type: 'refund', ref_type: 'refund', ref_id: 'dispute_d-1', amount: 80, description: 'x' }];
    const conn: any = {
      collection: (name: string) => {
        if (name === 'supportrequests') return { findOne: async (q: any) => tickets.find((t) => t.id === q.id) || null, updateOne: jest.fn(async () => ({})) };
        if (name === 'platformledgerentries') return { find: (q: any) => ({ project: () => ({ toArray: async () => ledger.filter((l) => l.ref_id === q.ref_id) }) }) };
        if (name === 'system_configs') return { findOne: async () => null };
        return {};
      },
    };
    const execute = jest.fn(async () => ({ ok: true, method: 'gateway' }));
    return { c: new AdminDisputesController(conn, { write: jest.fn() } as any, { execute } as any), execute };
  }
  const admin = { id: 'a1', role: 'admin' };
  const base = { id: 'd-1', category: 'PAYMENT', status: 'OPEN', user_id: 'p1', booking_kind: 'lab', booking_id: 'lab-9' };

  it('refunds the booking named on the ticket when the admin names none', async () => {
    const { c, execute } = make(base);
    await c.resolve('d-1', { decision: 'refund_partial', amount: 80, reason: 'charged twice, verified with the lab' } as any, admin);
    expect(execute).toHaveBeenCalledWith(expect.objectContaining({ booking_kind: 'lab', booking_id: 'lab-9', patient_id: 'p1', amount: 80 }));
  });

  it('the refund id is the dispute, so a retry cannot refund twice', async () => {
    const { c, execute } = make(base);
    await c.resolve('d-1', { decision: 'refund_partial', amount: 80, reason: 'charged twice, verified with the lab' } as any, admin);
    expect((execute.mock.calls[0] as any[])[0].refund_id).toBe('dispute_d-1');
  });

  it('a refund decision on a ticket with no booking and none given is refused', async () => {
    const { c } = make({ ...base, booking_kind: undefined, booking_id: undefined });
    await expect(c.resolve('d-1', { decision: 'refund_partial', amount: 80, reason: 'charged twice, verified with the lab' } as any, admin)).rejects.toThrow('booking_kind and booking_id are required');
  });

  it('the detail shows the refund from the ledger', async () => {
    const { c } = make({ ...base, status: 'RESOLVED' });
    const d: any = await c.detail('d-1');
    expect(d.refunds).toEqual([{ type: 'refund', ref_type: 'refund', ref_id: 'dispute_d-1', amount: 80, description: 'x' }]);
    expect(d.booking_id).toBe('lab-9');
  });
});
