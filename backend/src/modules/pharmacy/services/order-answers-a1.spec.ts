/** A-1: order answers — Rx flag from the catalogue, one allocations query for the list, names and courier. */
import { PharmacyOrderService } from './pharmacy-order.service';

const MEDS = [
  { id: 'med-rx', sku: 1002, name_ar: 'أوجمنتين', name_en: 'Augmentin', requires_prescription: true, controlled: false },
  { id: 'med-otc', sku: 1001, name_ar: 'بنادول', name_en: 'Panadol', requires_prescription: false, controlled: false },
];

function svcWith(opts: { orders: any[]; allocs?: any[]; profiles?: any[] }) {
  const svc: any = Object.create(PharmacyOrderService.prototype);
  const allocFind = jest.fn((q: any) => ({
    lean: async () => (opts.allocs || []).filter((a) => (q.order_id?.$in ? q.order_id.$in.includes(a.order_id) : a.order_id === q.order_id)),
  }));
  svc.orders = {
    find: () => ({ sort: () => ({ limit: () => ({ lean: async () => opts.orders }) }) }),
    findOne: (q: any) => ({ lean: async () => opts.orders.find((o) => o.id === q.id) ?? null }),
  };
  svc.allocs = { find: allocFind };
  svc.conn = {
    collection: (name: string) => ({
      find: (q: any) => ({
        toArray: async () => {
          if (name === 'medicines') {
            return MEDS.filter((m) => (q.$or || []).some((c: any) =>
              (c.id?.$in && c.id.$in.includes(m.id)) || (c.sku?.$in && c.sku.$in.map(String).includes(String(m.sku)))
              || (c.name_ar instanceof RegExp && c.name_ar.test(m.name_ar)) || (c.name_en instanceof RegExp && c.name_en.test(m.name_en))));
          }
          return (opts.profiles || []).filter((p) => q.account_id?.$in?.includes(p.account_id));
        },
      }),
      findOne: async () => null,
      countDocuments: async () => 0,
    }),
  };
  return { svc, allocFind };
}
const patient = { id: 'pat', role: 'patient' };

describe('A-1 order answers', () => {
  it('a line for an Rx catalogue item says requires_prescription=true even when the client sent false', async () => {
    const order = { id: 'o1', patient_account_id: 'pat', status: 'confirmed', items: [
      { id: 'l1', medicine_id: 'med-rx', requires_prescription: false, qty: 1 },
      { id: 'l2', sku: '1001', qty: 1 },
    ] };
    const { svc } = svcWith({ orders: [order] });
    const out = await svc.detail(patient, 'o1');
    expect(out.items.map((i: any) => [i.id, i.requires_prescription])).toEqual([['l1', true], ['l2', false]]);
  });

  it('the list of three orders reads allocations with exactly one query', async () => {
    const orders = ['o1', 'o2', 'o3'].map((id) => ({ id, patient_account_id: 'pat', status: 'confirmed', items: [] }));
    const { svc, allocFind } = svcWith({ orders, allocs: [{ id: 'a1', order_id: 'o2', pharmacy_account_id: 'ph1', status: 'preparing' }] });
    const out = await svc.list(patient);
    expect(allocFind).toHaveBeenCalledTimes(1);
    expect(out.find((o: any) => o.id === 'o2').effective_status).toBe('in_fulfillment');
  });

  it('an empty Arabic pharmacy name falls back to the English one', async () => {
    const order = { id: 'o1', patient_account_id: 'pat', status: 'confirmed', items: [] };
    const { svc } = svcWith({ orders: [order], allocs: [{ id: 'a1', order_id: 'o1', pharmacy_account_id: 'ph1' }], profiles: [{ account_id: 'ph1', display_name_ar: '', display_name_en: 'Al Noor' }] });
    const out = await svc.detail(patient, 'o1');
    expect([out.pharmacy_name_ar, out.pharmacy_name_en]).toEqual(['Al Noor', 'Al Noor']);
  });

  it('courier is null until assigned, then name and phone', async () => {
    const order = { id: 'o1', patient_account_id: 'pat', status: 'confirmed', items: [] };
    const none = await svcWith({ orders: [order], allocs: [{ id: 'a1', order_id: 'o1', pharmacy_account_id: 'ph1' }] }).svc.detail(patient, 'o1');
    expect([none.courier_name, none.courier_phone]).toEqual([null, null]);
    const set = await svcWith({ orders: [order], allocs: [{ id: 'a1', order_id: 'o1', pharmacy_account_id: 'ph1', delivery: { courier_name: 'Ali', courier_phone: '+966500000000' } }] }).svc.detail(patient, 'o1');
    expect([set.courier_name, set.courier_phone]).toEqual(['Ali', '+966500000000']);
  });
});
