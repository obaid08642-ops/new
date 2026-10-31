import { BadRequestException } from '@nestjs/common';
import { OrdersConsoleService } from './orders-console.service';

/**
 * QA REF-PEN-1 (2026-10-29): a patient cancelled a clinic visit inside the 2-hour window, the cancellation stored refund_percentage 50, and the admin console's
 * "full" refund still returned 100 % of the payment, so the late-cancel penalty was lost.
 */
function build(opts: { percentage?: number | null; state?: string; paid?: number; alreadyRefunded?: number } = {}) {
  const paid = opts.paid ?? 10;
  const appt: Record<string, unknown> = { id: 'a1', status: opts.state ?? 'CANCELLED', patient_id: 'p1', total_price: paid };
  if (opts.percentage !== null) appt.refund_percentage = opts.percentage ?? 50;
  const rows: Record<string, any[]> = {
    appointments: [appt],
    transactions: [{ _id: 't1', booking_id: 'a1', status: 'paid', amount: paid }],
    platformledgerentries: opts.alreadyRefunded ? [{ type: 'refund', order_id: 'a1', amount: opts.alreadyRefunded }] : [],
  };
  const updates: unknown[] = [];
  const conn = {
    collection: (name: string) => ({
      findOne: async (q: any) => (rows[name] || []).find((d) => Object.entries(q).every(([k, v]) => d[k] === v)) || null,
      find: (q: any) => {
        const out = (rows[name] || []).filter((d) => Object.entries(q).every(([k, v]: any) => (k === '$or' ? true : v && typeof v === 'object' && '$in' in v ? v.$in.includes(d[k]) : d[k] === v)));
        const cur: any = { sort: () => cur, limit: () => cur, toArray: async () => out };
        return cur;
      },
      updateOne: async (q: unknown, u: unknown) => { updates.push({ name, q, u }); return { matchedCount: 1 }; },
    }),
  };
  const audit = { write: jest.fn(async () => undefined) };
  const refundExec = { execute: jest.fn(async () => undefined) };
  const svc = new OrdersConsoleService(conn as any, audit as any, refundExec as any, {} as any);
  const admin = { id: 'admin1' };
  return { svc, audit, refundExec, admin };
}
const reason = 'refund approved by finance lead after review of the case';

describe('admin console refund after a late cancellation (REF-PEN-1)', () => {
  it('"full" refunds the share the cancellation computed (50 % of 10 = 5), not the whole payment', async () => {
    const { svc, refundExec, admin } = build();
    const r = await svc.refund('consultation', 'a1', { mode: 'full', reason }, admin);
    expect(r.credited_amount).toBe(5);
    expect((refundExec.execute.mock.calls[0] as any[])[0].amount).toBe(5);
  });

  it('"partial" above the computed share is refused with the amount that is allowed', async () => {
    const { svc, refundExec, admin } = build();
    await expect(svc.refund('consultation', 'a1', { mode: 'partial', amount: 8, reason }, admin)).rejects.toThrow('amount_exceeds_cancellation_refund_5');
    expect(refundExec.execute).not.toHaveBeenCalled();
  });

  it('only counts what is still owed: 50 % of 10 with 3 already refunded leaves 2', async () => {
    const { svc, admin } = build({ alreadyRefunded: 3 });
    expect((await svc.refund('consultation', 'a1', { mode: 'full', reason }, admin)).credited_amount).toBe(2);
  });

  it('when the computed share is already refunded, a further refund is refused', async () => {
    const { svc, admin } = build({ alreadyRefunded: 5 });
    await expect(svc.refund('consultation', 'a1', { mode: 'full', reason }, admin)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('an explicit override reason (at least 10 characters) lifts the cap and is audited with the policy percentage', async () => {
    const { svc, refundExec, audit, admin } = build();
    const r = await svc.refund('consultation', 'a1', { mode: 'full', reason, override_reason: 'doctor was 40 minutes late, ticket 4471' }, admin);
    expect(r.credited_amount).toBe(10);
    expect((refundExec.execute.mock.calls[0] as any[])[0].amount).toBe(10);
    const entry = (audit.write.mock.calls[0] as any[])[0];
    expect(entry.meta).toMatchObject({ cancellation_refund_percentage: 50, override_reason: 'doctor was 40 minutes late, ticket 4471' });
  });

  it('a too-short override reason does not lift the cap', async () => {
    const { svc, admin } = build();
    await expect(svc.refund('consultation', 'a1', { mode: 'partial', amount: 8, reason, override_reason: 'ok' }, admin)).rejects.toThrow('amount_exceeds_cancellation_refund_5');
  });

  it('a 100 % cancellation (free window), an order that was not cancelled, and an order with no stored percentage keep the old behaviour', async () => {
    expect((await build({ percentage: 100 }).svc.refund('consultation', 'a1', { mode: 'full', reason }, { id: 'a' })).credited_amount).toBe(10);
    expect((await build({ state: 'CONFIRMED' }).svc.refund('consultation', 'a1', { mode: 'full', reason }, { id: 'a' })).credited_amount).toBe(10);
    expect((await build({ percentage: null }).svc.refund('consultation', 'a1', { mode: 'full', reason }, { id: 'a' })).credited_amount).toBe(10);
  });
});
