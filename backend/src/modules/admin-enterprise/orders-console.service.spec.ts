import { NotFoundException } from '@nestjs/common';
import { OrdersConsoleService, getKindSpecs } from './orders-console.service';

// Minimal in-memory stand-in for connection.collection(): enough of find/aggregate/updateOne for the console.
function fakeConn(data: Record<string, any[]>) {
  const matches = (doc: any, q: any) => Object.entries(q || {}).every(([k, v]: any) => {
    if (k === '$or') return v.some((x: any) => matches(doc, x));
    const val = k.split('.').reduce((o: any, p: string) => (o == null ? o : o[p]), doc);
    if (v && typeof v === 'object' && '$in' in v) return v.$in.includes(val);
    if (v instanceof RegExp) return v.test(String(val ?? ''));
    return val === v;
  });
  const updates: any[] = [];
  const conn = {
    updates,
    collection: (name: string) => {
      const rows = data[name] || [];
      return {
        findOne: async (q: any) => rows.find((d) => matches(d, q)) || null,
        find: (q: any) => {
          const out = rows.filter((d) => matches(d, q));
          const cur: any = { sort: () => cur, limit: () => cur, project: () => cur, toArray: async () => out.map((d) => ({ ...d, state: d.status ?? d.state, total: d.totals?.total ?? d.total ?? d.total_price, created_at: d.createdAt })) };
          return cur;
        },
        aggregate: (p: any[]) => ({
          toArray: async () => {
            const m = p.find((s) => s.$match)?.$match;
            const got = m ? rows.filter((d) => matches(d, m)) : rows;
            if (p.some((s) => s.$count)) return [{ n: got.length }];
            return [];
          },
        }),
        updateOne: async (q: any, u: any) => { updates.push({ name, q, u }); return { matchedCount: 1 }; },
      };
    },
  };
  return conn;
}

const audit = { write: jest.fn(async () => undefined) } as any;
const wallet = { topup: jest.fn(async () => undefined) } as any;

describe('OrdersConsoleService: pharmacy orders live in two collections', () => {
  const data = {
    pharmacy_orders: [{ id: 'po-1', status: 'delivered', patient_account_id: 'p1', totals: { total: 40 }, createdAt: new Date('2026-09-02'), timeline: [] }],
    orders: [{ id: 'o-1', state: 'CANCELLED', patient_id: 'p2', total: 10, createdAt: new Date('2026-09-01'), state_history: [] }],
  };

  it('pharmacy kind maps to both the current and the legacy collection', () => {
    expect(getKindSpecs('pharmacy').map((s) => s.collection)).toEqual(['pharmacy_orders', 'orders']);
  });

  it('lists orders from both collections with their totals', async () => {
    const svc = new OrdersConsoleService(fakeConn(data) as any, audit, wallet, {} as any);
    const r = await svc.list({ kind: 'pharmacy', limit: 50 });
    expect(r.total).toBe(2);
    expect(r.data.map((x: any) => x.id)).toEqual(['po-1', 'o-1']);
    expect(r.by_kind.pharmacy).toBe(2);
    expect(r.data.find((x: any) => x.id === 'po-1').is_completed).toBe(true);
    expect(r.data.find((x: any) => x.id === 'o-1').is_cancelled).toBe(true);
  });

  it('status filter matches either casing', async () => {
    const svc = new OrdersConsoleService(fakeConn(data) as any, audit, wallet, {} as any);
    expect((await svc.list({ kind: 'pharmacy', status: 'DELIVERED' })).data.map((x: any) => x.id)).toEqual(['po-1']);
    expect((await svc.list({ kind: 'pharmacy', status: 'cancelled' })).data.map((x: any) => x.id)).toEqual(['o-1']);
  });

  it('detail finds an order in the current collection', async () => {
    const svc = new OrdersConsoleService(fakeConn(data) as any, audit, wallet, {} as any);
    const d = await svc.detail('pharmacy', 'po-1');
    expect(d.source_collection).toBe('pharmacy_orders');
    await expect(svc.detail('pharmacy', 'nope')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('cancel of a current pharmacy order goes through the pharmacy service (allocations + stock)', async () => {
    const live = { pharmacy_orders: [{ id: 'po-2', status: 'confirmed', patient_account_id: 'p1', totals: { total: 5 }, createdAt: new Date() }], orders: [] };
    const conn = fakeConn(live);
    const adminCancel = jest.fn(async () => ({ ok: true }));
    const svc = new OrdersConsoleService(conn as any, audit, wallet, { get: () => ({ adminCancel }) } as any);
    const r = await svc.cancel('pharmacy', 'po-2', 'العميل طلب الإلغاء هاتفياً', { id: 'adm' });
    expect(adminCancel).toHaveBeenCalledWith({ id: 'adm' }, 'po-2', 'العميل طلب الإلغاء هاتفياً');
    expect(r.state).toBe('cancelled');
    expect(conn.updates).toHaveLength(0);
  });

  it('reassign is refused for allocation-managed pharmacy orders', async () => {
    const svc = new OrdersConsoleService(fakeConn(data) as any, audit, wallet, {} as any);
    await expect(svc.reassign('pharmacy', 'po-1', { provider_id: 'x', reason: 'سبب كاف للتحويل' }, { id: 'adm' })).rejects.toThrow('kind_has_no_provider_field');
  });
});
