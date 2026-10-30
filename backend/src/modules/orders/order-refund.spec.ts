/** PD-819: the refund status of a patient's order, for the refund tab of the app. */
import { OrdersService } from './orders.service';
import { refundView, withRefunds } from './order-refund';

const T = (d: string) => new Date(`2026-10-${d}T10:00:00Z`);

describe('refundView', () => {
  const order = { id: 'o1', total: 100 };
  it('nothing for an order with no refund trace', () => {
    expect(refundView(order, [], [])).toBeNull();
    expect(refundView({ ...order, refund_status: 'NONE' }, [], [])).toBeNull();
  });
  it('a request waiting for review, then its policy amount, approved, rejected, failed', () => {
    const req = (state: string) => [{ state, refund_amount: 50, reason: 'late', createdAt: T('01') }];
    expect(refundView(order, req('REQUESTED'), [])).toMatchObject({ state: 'requested', amount: 50, partial: true, reason: 'late', requested_at: T('01').toISOString(), refunded_at: null });
    expect(refundView(order, req('APPROVED'), [])!.state).toBe('approved');
    expect(refundView(order, req('REJECTED'), [])!.state).toBe('rejected');
    expect(refundView(order, req('FAILED'), [])!.state).toBe('failed');
  });
  it('an executed refund comes from the ledger: the amount actually refunded, the method, the date; partial when less than the order', () => {
    const ledger = [{ type: 'refund', amount: 100, createdAt: T('03'), meta: { method: 'card' }, description: 'cancel' }];
    expect(refundView(order, [{ state: 'APPROVED', reason: 'changed my mind', createdAt: T('02') }], ledger)).toMatchObject({ state: 'refunded', amount: 100, partial: false, method: 'card', reason: 'changed my mind', refunded_at: T('03').toISOString() });
    expect(refundView(order, [], [{ type: 'refund', amount: 40, createdAt: T('04'), meta: {} }, { type: 'refund', amount: 10, createdAt: T('05'), meta: {} }])).toMatchObject({ state: 'refunded', amount: 50, partial: true, refunded_at: T('05').toISOString() });
  });
  it('a cancelled paid order marked refunded on the order itself is shown as refunded', () => {
    expect(refundView({ ...order, refund_status: 'REFUNDED', refunded_at: T('06') }, [], [])).toMatchObject({ state: 'refunded', amount: 100, partial: false, refunded_at: T('06').toISOString() });
  });
  it('carries no account, gateway or ledger identifier', () => {
    const v = refundView(order, [{ state: 'REQUESTED', refund_amount: 10, createdAt: T('01'), moyasar_payment_id: 'pay_secret', patient_id: 'p1' }], [])!;
    expect(Object.keys(v).sort()).toEqual(['amount', 'method', 'partial', 'reason', 'refunded_at', 'requested_at', 'state']);
  });
});

describe('withRefunds and the list of the patient\'s orders', () => {
  const calls: any[] = [];
  const conn = {
    collection: (name: string) => ({
      find: (f: any) => {
        calls.push({ name, f });
        const rows = name === 'refundrequests'
          ? [{ booking_id: 'o2', state: 'REQUESTED', refund_amount: 30, reason: 'x', createdAt: T('01') }]
          : [{ order_id: 'o3', type: 'refund', amount: 100, createdAt: T('02'), meta: { method: 'card' } }];
        return { toArray: async () => rows };
      },
    }),
  };
  const orders = [{ id: 'o1', total: 100 }, { id: 'o2', total: 100 }, { id: 'o3', total: 100 }];

  it('one read of the requests and one of the ledger, only for this patient and these orders', async () => {
    calls.length = 0;
    const out = await withRefunds(conn as never, 'pat-1', orders);
    expect(out.map((o) => o.refund?.state ?? null)).toEqual([null, 'requested', 'refunded']);
    expect(calls).toHaveLength(2);
    expect(calls[0].f).toMatchObject({ patient_id: 'pat-1', booking_id: { $in: ['o1', 'o2', 'o3'] } });
    expect(calls[1].f).toMatchObject({ type: 'refund', 'meta.patient_id': 'pat-1', order_id: { $in: ['o1', 'o2', 'o3'] } });
  });

  const service = () => {
    const s: any = Object.create(OrdersService.prototype);
    s.conn = conn;
    s.orderModel = { find: () => ({ sort: () => ({ limit: () => ({ lean: async () => orders.map((o) => ({ ...o })) }) }) }), findOne: () => ({ lean: async () => ({ id: 'o2', patient_id: 'pat-1', total: 100 }) }) };
    s.assertOrderAccess = () => undefined;
    return s as OrdersService;
  };

  it('listMine gives every order its refund; the refund tab (refundsOnly) keeps the orders that have one', async () => {
    expect((await service().listMine('pat-1')).map((o: any) => o.id)).toEqual(['o1', 'o2', 'o3']);
    expect((await service().listMine('pat-1', undefined, true)).map((o: any) => [o.id, o.refund.state])).toEqual([['o2', 'requested'], ['o3', 'refunded']]);
  });

  it('the patient who owns an order sees its refund on the order page; another reader gets the order as before', async () => {
    expect((await service().getById('o2', { id: 'pat-1' }) as any).refund).toMatchObject({ state: 'requested', amount: 30 });
    expect((await service().getById('o2', { id: 'staff', role: 'admin' }) as any).refund).toBeUndefined();
  });
});
