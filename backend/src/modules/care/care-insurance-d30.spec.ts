import { CareService } from './care.service';

const svcWith = (policy: any) => {
  const seen: { q?: any } = {};
  const providerModel: any = {
    db: { collection: () => ({ findOne: async () => (policy ? { insurance: policy } : null) }) },
    find: () => ({ sort: () => ({ maxTimeMS: () => ({ limit: async () => [] }) }) }),
    countDocuments: async (q: any) => {
      seen.q = q;
      return 0;
    },
    aggregate: async () => [],
  };
  const slots: any = { hasSlotsToday: async () => true, nextAvailable: async () => null };
  return { svc: new (CareService as any)(providerModel, { findOne: async () => null }, {}, slots), seen };
};


describe('D-30 doctor list by insurance company and class', () => {
  it('payment=insurance filters by the signed-in patient\'s saved company AND class', async () => {
    const { svc, seen } = svcWith({ provider: 'bupa', class: 'A' });
    await svc.listDoctors({ paymentInsurance: true, user: { id: 'p1', role: 'patient' } } as any);
    expect(JSON.stringify(seen.q)).toContain(JSON.stringify({ $elemMatch: { company_id: 'bupa', classes: 'A', active: true } }));
  });

  it('a self-pay list is never filtered, even for a patient with a saved policy', async () => {
    const { svc, seen } = svcWith({ provider: 'bupa', class: 'A' });
    await svc.listDoctors({ user: { id: 'p1', role: 'patient' } } as any);
    expect(JSON.stringify(seen.q)).not.toContain('accepted_insurance');
  });

  it('an anonymous visitor filters through the query company and class', async () => {
    const { svc, seen } = svcWith(null);
    await svc.listDoctors({ insurance: 'tawuniya', insuranceClass: 'B' } as any);
    expect(JSON.stringify(seen.q)).toContain(JSON.stringify({ $elemMatch: { company_id: 'tawuniya', classes: 'B', active: true } }));
  });
});
