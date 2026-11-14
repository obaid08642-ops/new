import { SupportService } from './support.service';

// PV-15: a provider sees the disputes about their own bookings, with limited fields.
describe('provider disputes', () => {
  function make(collections: Record<string, any[]>) {
    const filters: Record<string, any> = {};
    const conn: any = {
      collection: (n: string) => ({
        find: (f: any) => { filters[n] = f; const rows = collections[n] ?? []; const c: any = { limit: () => c, toArray: async () => rows }; return c; },
      }),
    };
    let query: any; let projection: any;
    const chain: any = { sort: () => chain, limit: async () => [{ id: 't1' }] };
    const req: any = { find: jest.fn((q: any, p: any) => { query = q; projection = p; return chain; }) };
    const svc = Object.create(SupportService.prototype) as any;
    Object.assign(svc, { conn, req });
    return { svc: svc as SupportService, filters, get query() { return query; }, get projection() { return projection; } };
  }
  const doctor = { id: 'u1', role: 'doctor' };

  it('matches tickets only by the provider\'s own bookings', async () => {
    const t = make({ provider_profiles: [{ id: 'pp1' }], appointments: [{ id: 'a1' }], labbookings: [{ id: 'l1' }] });
    const out = await t.svc.providerDisputes(doctor);
    expect(out).toEqual([{ id: 't1' }]);
    expect(t.filters.appointments.doctor_id.$in).toEqual(['u1', 'pp1']);
    expect(t.filters.labbookings.provider_account_id).toEqual({ $eq: 'u1' });
    expect(t.query.$or).toEqual([
      { booking_kind: 'consultation', booking_id: { $in: ['a1'] } },
      { booking_kind: 'lab', booking_id: { $in: ['l1'] } },
    ]);
  });

  it('never returns the patient\'s name, phone or message', async () => {
    const t = make({ appointments: [{ id: 'a1' }] });
    await t.svc.providerDisputes(doctor);
    for (const k of ['user_name', 'user_phone', 'message', 'thread', 'user_id', 'attachments']) expect(t.projection[k]).toBeUndefined();
  });

  it('a provider with no bookings gets an empty list and no ticket query', async () => {
    const t = make({});
    expect(await t.svc.providerDisputes(doctor)).toEqual([]);
    expect(t.query).toBeUndefined();
  });
});
