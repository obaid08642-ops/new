import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RxConsultController, RX_CONSULT_KEY } from './rx-consult.controller';

/** D-10: "استشر طبيب" opens consultations filtered by the admin's category -> specialty mapping. */
function fakeConn(meds: any[], config: any = null) {
  const store: any = { config, audits: [] as any[] };
  const match = (doc: any, q: any) => q.$or.some((c: any) => Object.entries(c).every(([k, v]) => doc[k] === v));
  return {
    store,
    collection: (name: string) => {
      if (name === 'medicines') return {
        findOne: async (q: any) => meds.find((m) => match(m, q)) ?? null,
        aggregate: () => ({ toArray: async () => [{ _id: 'Antibiotics', count: 3 }, { _id: null, count: 1 }] }),
      };
      if (name === 'system_configs') return {
        findOne: async (q: any) => (q.key === RX_CONSULT_KEY && store.config ? { key: RX_CONSULT_KEY, value: store.config } : null),
        updateOne: async (_q: any, u: any) => { store.config = u.$set.value; },
      };
      if (name === 'audit_logs') return { insertOne: async (d: any) => { store.audits.push(d); } };
      throw new Error(`unexpected collection ${name}`);
    },
  } as any;
}

const RX = { id: 'm1', slug: 'augmentin', category: 'medications', sub_category: 'Antibiotics', requires_prescription: true };

describe('RxConsultController', () => {
  it('without any admin mapping the answer is no specialty (never a hard-coded one)', async () => {
    const c = new RxConsultController(fakeConn([RX]));
    await expect(c.consultSpecialty('m1')).resolves.toEqual(expect.objectContaining({ specialty: null, source: null, requires_prescription: true }));
  });

  it('the category mapping wins over the default; the slug and names come from the specialty master', async () => {
    const c = new RxConsultController(fakeConn([RX], { map: { Antibiotics: 'internal_medicine' }, default: 'general_practice' }));
    const r: any = await c.consultSpecialty('augmentin');
    expect(r.source).toBe('category');
    expect(r.specialty).toEqual(expect.objectContaining({ slug: 'internal_medicine', name_ar: expect.any(String), name_en: expect.any(String) }));
  });

  it('falls back to the default specialty', async () => {
    const c = new RxConsultController(fakeConn([{ ...RX, sub_category: 'Other' }], { map: { Antibiotics: 'internal_medicine' }, default: 'general_practice' }));
    await expect(c.consultSpecialty('m1')).resolves.toEqual(expect.objectContaining({ source: 'default', specialty: expect.objectContaining({ slug: 'general_practice' }) }));
  });

  it('unknown medicine -> 404', async () => {
    await expect(new RxConsultController(fakeConn([])).consultSpecialty('nope')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('the admin cannot save a specialty that does not exist; a valid save is audited', async () => {
    const conn = fakeConn([RX]);
    const c = new RxConsultController(conn);
    await expect(c.setMapping({ map: { Antibiotics: 'made_up' } } as any, { id: 'adm' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(c.setMapping({ map: {}, default: 'nope' } as any, { id: 'adm' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(c.setMapping({ map: { Antibiotics: 'internal_medicine', Empty: '' }, default: 'general_practice' }, { id: 'adm', role: 'admin' }))
      .resolves.toEqual({ map: { Antibiotics: 'internal_medicine' }, default: 'general_practice' });
    expect(conn.store.audits).toHaveLength(1);
    expect(conn.store.audits[0]).toEqual(expect.objectContaining({ action: 'rx_consult_specialties_update', actor_account_id: 'adm' }));
  });

  it('the admin view lists the Rx categories to map and the specialties', async () => {
    const r: any = await new RxConsultController(fakeConn([RX])).getMapping();
    expect(r.categories).toEqual([{ key: 'Antibiotics', count: 3 }]);
    expect(r.specialties.length).toBeGreaterThan(10);
  });
});
