/** 16.12 - "reviews only from completed orders or bookings": POST /ratings used to take any entity id and any provider id. */
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { RatingsService } from './ratings.module';

type Doc = Record<string, unknown>;

function build(data: Record<string, Doc[]>) {
  const inserted: Doc[] = [];
  const conn: any = {
    collection: (name: string) => ({
      findOne: async (f: Record<string, any>) => {
        const wanted = f.id?.$eq ?? f.id;
        if (name === 'ratings') return null;
        return (data[name] || []).find((d) => d.id === wanted) ?? null;
      },
      insertOne: async (d: Doc) => { inserted.push(d); },
      updateMany: async () => ({}),
      aggregate: () => ({ toArray: async () => [] }),
    }),
  };
  return { svc: new RatingsService(conn), inserted };
}

const user = { id: 'p1', full_name: 'P' };
const body = (over: Record<string, unknown> = {}) => ({ entity_type: 'lab_booking', entity_id: 'b1', provider_id: 'lab-1', score: 5, ...over });

describe('POST /ratings only takes a finished service the reviewer used', () => {
  it('a completed booking of the reviewer, with the provider who did it, is stored', async () => {
    const { svc, inserted } = build({ labbookings: [{ id: 'b1', patient_id: 'p1', status: 'RESULT_READY', provider_id: 'lab-1' }] });
    await expect(svc.submit(user, body())).resolves.toMatchObject({ created: true });
    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toMatchObject({ user_id: 'p1', provider_id: 'lab-1', entity_id: 'b1' });
  });

  it('an invented entity id is refused', async () => {
    const { svc, inserted } = build({});
    await expect(svc.submit(user, body({ entity_id: 'does-not-exist' }))).rejects.toBeInstanceOf(ForbiddenException);
    expect(inserted).toHaveLength(0);
  });

  it("somebody else's booking is refused", async () => {
    const { svc, inserted } = build({ labbookings: [{ id: 'b1', patient_id: 'someone-else', status: 'RESULT_READY', provider_id: 'lab-1' }] });
    await expect(svc.submit(user, body())).rejects.toThrow('not_owner');
    expect(inserted).toHaveLength(0);
  });

  it('a booking that is not finished is refused', async () => {
    for (const status of ['PENDING', 'CONFIRMED', 'CANCELLED', 'IN_PROGRESS']) {
      const { svc, inserted } = build({ labbookings: [{ id: 'b1', patient_id: 'p1', status, provider_id: 'lab-1' }] });
      await expect(svc.submit(user, body())).rejects.toBeInstanceOf(ForbiddenException);
      expect(inserted).toHaveLength(0);
    }
  });

  it('a review cannot be pointed at another provider (the client provider_id is checked, not trusted)', async () => {
    const { svc, inserted } = build({ labbookings: [{ id: 'b1', patient_id: 'p1', status: 'RESULT_READY', provider_id: 'lab-1' }] });
    await expect(svc.submit(user, body({ provider_id: 'competitor-lab' }))).rejects.toBeInstanceOf(BadRequestException);
    expect(inserted).toHaveLength(0);
  });

  it('a pharmacy order takes its provider from the selected allocation, and needs DELIVERED', async () => {
    const data = {
      pharmacy_orders: [{ id: 'o1', patient_account_id: 'p1', status: 'delivered', selected_allocation_id: 'al1' }, { id: 'o2', patient_account_id: 'p1', status: 'created', selected_allocation_id: 'al1' }],
      pharmacy_allocations: [{ id: 'al1', pharmacy_account_id: 'ph-9' }],
    };
    const ok = build(data);
    await expect(ok.svc.submit(user, { entity_type: 'order', entity_id: 'o1', provider_id: 'ph-9', score: 4 })).resolves.toMatchObject({ created: true });
    await expect(build(data).svc.submit(user, { entity_type: 'order', entity_id: 'o2', provider_id: 'ph-9', score: 4 })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(build(data).svc.submit(user, { entity_type: 'order', entity_id: 'o1', provider_id: 'ph-OTHER', score: 4 })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('a consultation (appointment) needs COMPLETED and the doctor is the provider', async () => {
    const mk = (status: string) => build({ appointments: [{ id: 'a1', patient_id: 'p1', status, doctor_user_id: 'doc-1' }] });
    await expect(mk('COMPLETED').svc.submit(user, { entity_type: 'consultation', entity_id: 'a1', provider_id: 'doc-1', score: 5 })).resolves.toMatchObject({ created: true });
    await expect(mk('CONFIRMED').svc.submit(user, { entity_type: 'consultation', entity_id: 'a1', provider_id: 'doc-1', score: 5 })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('an operator-injected operator ($ne) cannot widen the lookup', async () => {
    const { svc, inserted } = build({ labbookings: [{ id: 'b1', patient_id: 'p1', status: 'RESULT_READY', provider_id: 'lab-1' }] });
    await expect(svc.submit(user, body({ entity_id: { $ne: null } as never }))).rejects.toBeDefined();
    expect(inserted).toHaveLength(0);
  });
});
