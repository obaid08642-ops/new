import { ConflictException } from '@nestjs/common';
import { RefundExecutor } from './finance-engine.module';
import { refundGuardCollections } from './refund-guard.fake';

/**
 * A refund execution that crashed after it reserved the amount leaves the reservation `reserved`; 10 minutes later another execution of the same refund id
 * takes it over. The gateway refund call has no idempotency key, so the takeover must never call it again if the first run already did.
 * Every case below is one place the first run can have died.
 */

const OLD = new Date(Date.now() - 60 * 60_000);          // an hour ago: a stale reservation
const PAY = { _id: 'mp1', moyasar_id: 'pay_123', booking_id: 'bk1', status: 'paid', amount: 200, refunded_amount: 0 };
const BOOKING = { id: 'bk1', patient_id: 'p1', payment_method: 'card', payment_status: 'paid', total_price: 200 };

function world(opts: { payment?: any; reservation?: any; gatewayRefunded?: number | 'down'; tx?: any }) {
  const payment = { ...(opts.payment ?? PAY) };
  const guard = refundGuardCollections();
  if (opts.reservation) {
    guard._reservations.push({ refund_id: 'r1', booking_id: 'bk1', halalas: 10000, state: 'reserved', createdAt: OLD, ...opts.reservation });
    guard._totals.push({ booking_id: 'bk1', refunded_halalas: 10000 });         // the crashed run's amount is already counted, once
  }
  // a takeover is a conditional update of a stale reserved row
  (guard.refund_reservations as any).findOneAndUpdate = async (q: any) => {
    const r = guard._reservations.find((x: any) => x.refund_id === q.refund_id && x.state === q.state && x.createdAt < q.createdAt.$lt);
    if (r) r.createdAt = new Date();
    return r ?? null;
  };
  const append = jest.fn().mockResolvedValue({});
  const paymentUpdates: any[] = [];
  const conn = {
    collection: jest.fn((name: string) => {
      if (name === 'refund_reservations' || name === 'refund_totals') return (guard as any)[name];
      if (name === 'moyasar_payments') {
        return {
          findOne: jest.fn(async () => (opts.tx ? null : payment)),
          updateOne: jest.fn(async (_q: any, u: any) => { Object.assign(payment, u.$set); paymentUpdates.push(u.$set); return {}; }),
        };
      }
      if (name === 'transactions') return { findOne: jest.fn(async () => opts.tx ?? null) };
      if (name === 'appointments') return { findOne: jest.fn().mockResolvedValue(BOOKING), updateOne: jest.fn().mockResolvedValue({ matchedCount: 1 }) };
      if (name === 'platformledgerentries') return { findOne: jest.fn().mockResolvedValue(null) };
      if (name === 'notifications') return { insertOne: jest.fn().mockResolvedValue({}) };
      return { findOne: jest.fn().mockResolvedValue(null), updateOne: jest.fn().mockResolvedValue({}), insertOne: jest.fn().mockResolvedValue({}) };
    }),
  };
  const refundTransactionAsSystem = jest.fn().mockResolvedValue({ gateway_refund_id: 'rf_tx' });
  const moduleRef = { get: jest.fn(() => ({ refundTransactionAsSystem })) };
  const executor = new RefundExecutor(conn as any, { exists: jest.fn().mockResolvedValue(null), append } as any, {} as any, { emit: jest.fn() } as any, moduleRef as any);

  const calls = { refundPosts: 0, lookups: 0 };
  jest.spyOn(global, 'fetch').mockImplementation((async (url: any, init: any) => {
    const u = String(url);
    if ((init?.method || 'GET') === 'POST' && u.endsWith('/refund')) {
      calls.refundPosts++;
      return new Response(JSON.stringify({ id: 'rf_gw1', amount: 10000 }), { status: 201 });
    }
    calls.lookups++;
    if (opts.gatewayRefunded === 'down') return new Response('{}', { status: 500 });
    return new Response(JSON.stringify({ id: 'pay_123', refunded: opts.gatewayRefunded ?? 0 }), { status: 200 });
  }) as any);
  return { executor, guard, append, calls, payment, paymentUpdates, refundTransactionAsSystem };
}

const run = (e: RefundExecutor) => e.execute({ refund_id: 'r1', booking_kind: 'consultation', booking_id: 'bk1', patient_id: 'p1', amount: 100, reason: 'late cancel', actor_id: 'system' });

beforeEach(() => { process.env.MOYASAR_SECRET_KEY = 'sk_test_unit'; });
afterEach(() => { jest.restoreAllMocks(); delete process.env.MOYASAR_SECRET_KEY; });

describe('RefundExecutor: first execution (not a takeover)', () => {
  it('makes exactly one gateway call, records the expected total BEFORE it and the gateway refund id AFTER it, and never asks the gateway first', async () => {
    const w = world({});
    await expect(run(w.executor)).resolves.toEqual(expect.objectContaining({ ok: true, method: 'gateway', gateway_refund_id: 'rf_gw1' }));
    expect(w.calls).toEqual({ refundPosts: 1, lookups: 0 });
    const res = w.guard._reservations.find((r: any) => r.refund_id === 'r1');
    expect(res).toMatchObject({ expected_refunded_after: 100, gateway_refund_id: 'rf_gw1' });
    expect(w.payment.refunded_amount).toBe(100);
    expect(w.append).toHaveBeenCalledTimes(1);
  });
});

describe('RefundExecutor: taking over a reservation a crashed run left behind', () => {
  it('crash AFTER the gateway call, before the local row was updated: no second gateway refund; the local row and the ledger are completed once', async () => {
    const w = world({ reservation: { expected_refunded_after: 100, gateway_refund_id: 'rf_gw_first' }, gatewayRefunded: 10000 });
    const r = await run(w.executor);
    expect(w.calls.refundPosts).toBe(0);
    expect(w.calls.lookups).toBe(1);
    expect(r).toMatchObject({ ok: true, method: 'gateway', gateway_refund_id: 'rf_gw_first' });
    expect(w.payment.refunded_amount).toBe(100);
    expect(w.append).toHaveBeenCalledTimes(1);
    expect(w.append).toHaveBeenCalledWith(expect.objectContaining({ type: 'refund', amount: 100, ref_id: 'r1', meta: expect.objectContaining({ gateway_refund_id: 'rf_gw_first' }) }));
    expect(w.guard._totals[0].refunded_halalas).toBe(10000);       // counted once
  });

  it('crash after the gateway call but BEFORE its id was recorded: the id is unknown, still no second refund', async () => {
    const w = world({ reservation: { expected_refunded_after: 100 }, gatewayRefunded: 10000 });
    const r = await run(w.executor);
    expect(w.calls.refundPosts).toBe(0);
    expect(r).toMatchObject({ ok: true, method: 'gateway', gateway_refund_id: 'recovered_from_gateway' });
    expect(w.payment.refunded_amount).toBe(100);
    expect(w.append).toHaveBeenCalledTimes(1);
  });

  it('crash after the local payment row was updated, before the ledger row: nothing is asked or sent again, only the ledger is completed', async () => {
    const w = world({ payment: { ...PAY, refunded_amount: 100 }, reservation: { expected_refunded_after: 100, gateway_refund_id: 'rf_gw_first' } });
    const r = await run(w.executor);
    expect(w.calls).toEqual({ refundPosts: 0, lookups: 0 });
    expect(w.paymentUpdates).toEqual([]);
    expect(r).toMatchObject({ ok: true, method: 'gateway', gateway_refund_id: 'rf_gw_first' });
    expect(w.append).toHaveBeenCalledTimes(1);
  });

  it('crash BEFORE the gateway call (the gateway shows nothing new): the refund is made now, exactly once', async () => {
    const w = world({ reservation: { expected_refunded_after: 100 }, gatewayRefunded: 0 });
    await run(w.executor);
    expect(w.calls).toEqual({ refundPosts: 1, lookups: 1 });
    expect(w.payment.refunded_amount).toBe(100);
    expect(w.append).toHaveBeenCalledTimes(1);
  });

  it('crash before even the expected total was written: the gateway is asked, shows nothing, the refund is made once', async () => {
    const w = world({ reservation: {}, gatewayRefunded: 0 });
    await run(w.executor);
    expect(w.calls).toEqual({ refundPosts: 1, lookups: 1 });
    expect(w.append).toHaveBeenCalledTimes(1);
  });

  it('a payment that already had an older partial refund: only the NEW amount counts (gateway 50 SAR before, 150 after)', async () => {
    const w = world({ payment: { ...PAY, refunded_amount: 50 }, reservation: { expected_refunded_after: 150 }, gatewayRefunded: 15000 });
    await run(w.executor);
    expect(w.calls.refundPosts).toBe(0);
    expect(w.payment.refunded_amount).toBe(150);
  });

  it('the gateway cannot be asked: the takeover is refused with 409, nothing is sent, nothing is written to the ledger', async () => {
    const w = world({ reservation: { expected_refunded_after: 100 }, gatewayRefunded: 'down' });
    await expect(run(w.executor)).rejects.toThrow(ConflictException);
    await expect(run(w.executor)).rejects.toThrow(/refund_gateway_status_unknown|refund_in_progress/);
    expect(w.calls.refundPosts).toBe(0);
    expect(w.append).not.toHaveBeenCalled();
  });

  it('a reservation that is not stale yet is still a conflict (another run may be working on it)', async () => {
    const w = world({ reservation: { createdAt: new Date() }, gatewayRefunded: 0 });
    await expect(run(w.executor)).rejects.toThrow(ConflictException);
    expect(w.calls).toEqual({ refundPosts: 0, lookups: 0 });
  });
});

describe('RefundExecutor: taking over a card refund kept in transactions', () => {
  const TX = { id: 'tx-1', status: 'paid', method: 'card', gateway: 'moyasar', gateway_charge_id: 'pay_123', amount: 200, refunded_amount: 0 };

  it('the gateway already refunded it: only our own records are brought up to date (skipGateway), no second gateway call', async () => {
    const w = world({ tx: TX, reservation: { expected_refunded_after: 100 }, gatewayRefunded: 10000 });
    await run(w.executor);
    expect(w.refundTransactionAsSystem).toHaveBeenCalledWith('tx-1', 100, 'late cancel', { skipGateway: true });
    expect(w.calls.refundPosts).toBe(0);
    expect(w.append).toHaveBeenCalledTimes(1);
  });

  it('the transaction already shows the refund: the payments service is not called at all', async () => {
    const w = world({ tx: { ...TX, refunded_amount: 100 }, reservation: { expected_refunded_after: 100, gateway_refund_id: 'rf_first' } });
    await run(w.executor);
    expect(w.refundTransactionAsSystem).not.toHaveBeenCalled();
    expect(w.append).toHaveBeenCalledTimes(1);
  });

  it('the gateway shows nothing new: the refund is made once, with the normal call', async () => {
    const w = world({ tx: TX, reservation: { expected_refunded_after: 100 }, gatewayRefunded: 0 });
    await run(w.executor);
    expect(w.refundTransactionAsSystem).toHaveBeenCalledWith('tx-1', 100, 'late cancel');
  });

  it('not a Moyasar transaction: the gateway cannot be asked, so the takeover is refused', async () => {
    const w = world({ tx: { ...TX, gateway: 'other' }, reservation: { expected_refunded_after: 100 } });
    await expect(run(w.executor)).rejects.toThrow(ConflictException);
    expect(w.refundTransactionAsSystem).not.toHaveBeenCalled();
  });

  it('a first execution records the expected total and the gateway refund id, and makes the normal call', async () => {
    const w = world({ tx: TX });
    await run(w.executor);
    expect(w.refundTransactionAsSystem).toHaveBeenCalledWith('tx-1', 100, 'late cancel');
    expect(w.guard._reservations.find((r: any) => r.refund_id === 'r1')).toMatchObject({ expected_refunded_after: 100, gateway_refund_id: 'rf_tx' });
  });
});
