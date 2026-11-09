import { NotFoundException } from '@nestjs/common';
import { OrderingBroadcastService } from './ordering-broadcast.service';

// M4 pieces that need no database: the stage configuration is sanitised, and a provider that was not reached learns nothing.
function make(config: unknown, broadcast: unknown = null) {
  const conn: any = {
    collection: jest.fn((name: string) => {
      if (name === 'system_configs') return { findOne: jest.fn(async () => (config === undefined ? null : { value: config })) };
      return { findOne: jest.fn(async () => broadcast), find: jest.fn(() => ({ sort: () => ({ limit: () => ({ toArray: async () => [] }) }), limit: () => ({ toArray: async () => [] }) })) };
    }),
  };
  return new OrderingBroadcastService(conn, {} as never, {} as never);
}

describe('M4 broadcast: configuration and reach', () => {
  it('uses 3 / 5 / 8 km at 3 minutes without a configuration', async () => {
    const stages = await (make(undefined) as any).stagesConfig();
    expect(stages).toEqual([{ radius_km: 3, timeout_seconds: 180 }, { radius_km: 5, timeout_seconds: 180 }, { radius_km: 8, timeout_seconds: 180 }]);
  });

  it('keeps valid stages (at most 3) and drops invalid ones', async () => {
    const raw = [{ radius_km: 2, timeout_seconds: 30 }, { radius_km: -1, timeout_seconds: 30 }, { radius_km: 4, timeout_seconds: 0 }, { radius_km: 6, timeout_seconds: 60 }, { radius_km: 9, timeout_seconds: 60 }, { radius_km: 12, timeout_seconds: 60 }];
    expect(await (make(raw) as any).stagesConfig()).toEqual([{ radius_km: 2, timeout_seconds: 30 }, { radius_km: 6, timeout_seconds: 60 }, { radius_km: 9, timeout_seconds: 60 }]);
  });

  it('falls back to the defaults when nothing valid is configured', async () => {
    expect(await (make('nonsense') as any).stagesConfig()).toHaveLength(3);
    expect(await (make([{ radius_km: 'x' }]) as any).stagesConfig()).toHaveLength(3);
  });

  it('a provider that was never reached gets 404 on accept and on offer, nothing about the broadcast', async () => {
    const svc = make(undefined, null);
    await expect(svc.providerAccept({ id: 'p1' }, 'ab_x')).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc.providerOffer({ id: 'p1' }, 'pb_x', { items: [{ name: 'x', price: 1 }] })).rejects.toBeInstanceOf(NotFoundException);
  });
});

// Owner decision 1: the family member an order is for travels with the broadcast to the booking made when a provider takes it.
describe('broadcast for a family member', () => {
  const members = [{ id: 'fm-1', owner_id: 'u1' }, { id: 'fm-2', owner_id: 'u2' }];
  function build(extra: Record<string, any> = {}) {
    const inserted: any[] = [];
    const conn: any = {
      collection: jest.fn((name: string) => ({
        findOne: jest.fn(async (f: any) => {
          if (name === 'family_members') return members.find((m) => m.id === f.id.$eq && m.owner_id === 'u1') ?? null;
          if (name === 'storage_objects') return { id: 'up1' };
          if (name === 'users') return { id: 'u1', full_name: 'A', phone: '1' };
          if (name === 'system_configs') return null;
          if (name === 'ordering_broadcasts') return extra.broadcast ?? null;
          if (name === 'ordering_offers') return extra.offer ?? null;
          return null;
        }),
        find: jest.fn(() => ({ toArray: async () => extra.rows?.[name] ?? [] })),
        insertOne: jest.fn(async (d: any) => { inserted.push(d); }),
        findOneAndUpdate: jest.fn(async () => extra.broadcast ?? null),
        updateOne: jest.fn(async () => ({})),
      })),
    };
    const ordering: any = { policyOf: jest.fn(async () => null), findCandidates: jest.fn(async () => ({ cands: [], snapshot: {} })) };
    const labs: any = { createPriced: jest.fn(async () => ({ id: 'bk1' })) };
    const svc: any = new OrderingBroadcastService(conn, ordering, labs);
    jest.spyOn(svc, 'enterStage').mockImplementation(async (d: any) => ({ ...d, reached: [] }));
    jest.spyOn(svc, 'assertHomeItems').mockResolvedValue(undefined);
    return { svc, ordering, labs, inserted };
  }

  it('photo order: an own member is stored on the broadcast and used for the insurance policy', async () => {
    const { svc, ordering, inserted } = build();
    await svc.startPhoto({ id: 'u1' }, { service_kind: 'lab', upload_id: 'up1', lat: 24, lng: 46, payer: 'insurance', family_member_id: 'fm-1' });
    expect(inserted[0].family_member_id).toBe('fm-1');
    expect(ordering.policyOf).toHaveBeenCalledWith('u1', 'insurance', 'fm-1');
  });

  it('asap order: another user\'s member is a 404 and nothing is stored; no member = no field', async () => {
    const { svc, inserted } = build();
    await expect(svc.startAsap({ id: 'u1' }, { service_kind: 'lab', items: ['a'], lat: 24, lng: 46, payer: 'cash', family_member_id: 'fm-2' })).rejects.toBeInstanceOf(NotFoundException);
    expect(inserted).toHaveLength(0);
    await svc.startAsap({ id: 'u1' }, { service_kind: 'lab', items: ['a'], lat: 24, lng: 46, payer: 'cash' });
    expect(inserted[0]).not.toHaveProperty('family_member_id');
  });

  it('the accepted ASAP booking is created for the member (the patient still pays)', async () => {
    const { svc, labs } = build({ rows: { provider_ordering_items: [{ catalog_id: 'a', prices: { home: 50 } }] } });
    const b = { id: 'ab_1', patient_id: 'u1', service_kind: 'lab', items: ['a'], lat: 24, lng: 46, payer: 'cash', family_member_id: 'fm-1' };
    await svc.bookAsap(b, 'acc1');
    expect(labs.createPriced).toHaveBeenCalledWith(expect.objectContaining({ id: 'u1' }), expect.objectContaining({ family_member_id: 'fm-1', order_group_id: 'ab_1' }));
  });
  it('the accepted photo-order offer books for the member too', async () => {
    const broadcast = { id: 'pb_1', patient_id: 'u1', kind: 'photo', service_kind: 'lab', lat: 24, lng: 46, payer: 'cash', family_member_id: 'fm-1' };
    const { svc, labs } = build({ broadcast, offer: { id: 'o1', broadcast_id: 'pb_1', provider_account_id: 'acc1', items: [{ name: 'CBC', price: 40 }], total: 40 } });
    await svc.acceptOffer({ id: 'u1' }, 'pb_1', 'o1');
    expect(labs.createPriced).toHaveBeenCalledWith(expect.objectContaining({ id: 'u1' }), expect.objectContaining({ family_member_id: 'fm-1', order_group_id: 'pb_1' }));
  });
});
