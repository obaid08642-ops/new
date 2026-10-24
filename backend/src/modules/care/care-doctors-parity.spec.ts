import { CareService } from './care.service';

/** Design parity (#1819): doctor list filters (gender, price band), is_online, and reviews from the ratings collection. */
describe('doctors: gender and price filters, is_online, reviews', () => {
  const rows = [
    { id: 'd1', account_id: 'a1', user_id: 'u1', name_en: 'Dr One', price_clinic: 100, gender: 'female' },
    { id: 'd2', account_id: 'a2', user_id: 'u2', name_en: 'Dr Two', price_clinic: 200, gender: 'male' },
  ];
  const make = (extra: { ratings?: any[]; online?: string[] } = {}) => {
    const seen: any = {};
    const coll = (name: string): any => ({
      find: (q: any) => {
        seen[name] = q;
        const list = name === 'ratings' ? extra.ratings || [] : name === 'provider_availability' ? (extra.online || []).map((id) => ({ provider_account_id: id })) : [];
        const arr: any = { toArray: async () => list, sort: () => ({ limit: () => ({ toArray: async () => list }) }) };
        return arr;
      },
    });
    const providerModel: any = {
      countDocuments: async () => rows.length,
      find: (q: any) => { seen.providers = q; const c: any = Promise.resolve(rows); c.sort = () => c; c.maxTimeMS = () => c; c.limit = () => Promise.resolve(rows.map((r) => ({ ...r, toObject: () => r }))); return c; },
      findOne: async () => rows[0],
      db: { collection: coll },
    };
    const slots: any = { hasSlotsToday: async () => false, nextAvailable: async () => null };
    const svc: any = new (CareService as any)(providerModel, {}, { findOne: async () => null }, slots);
    return { svc, seen };
  };

  it('gender and a price band reach the query on the price of the chosen mode', async () => {
    const { svc, seen } = make();
    await svc.listDoctors({ gender: 'female', price_min: 50, price_max: 150 });
    expect(seen.providers).toMatchObject({ gender: 'female', price_clinic: { $gt: 0, $gte: 50, $lte: 150 } });
    await svc.listDoctors({ service_type: 'video', price_max: 80 });
    expect(seen.providers.price_online).toEqual({ $gt: 0, $lte: 80 });
  });

  it('the list marks the doctors who are online and accepting now', async () => {
    const { svc } = make({ online: ['a2'] });
    const out = await svc.listDoctors({});
    expect(out.items.map((d: any) => [d.id, d.is_online])).toEqual([['d1', false], ['d2', true]]);
  });

  it('the detail shows published ratings with the reviewer first name only, and is_online', async () => {
    const { svc } = make({ ratings: [{ score: 5, comment: 'Great', user_name: 'Huda Al-Otaibi', createdAt: new Date('2026-10-01'), user_id: 'secret', entity_id: 'booking-9' }], online: ['a1'] });
    const out = await svc.doctorById('d1');
    expect(out.reviews_data).toEqual([{ rating: 5, text: 'Great', date: new Date('2026-10-01'), reviewer: 'Huda A.', sub_ratings: null }]);
    expect(JSON.stringify(out)).not.toMatch(/secret|booking-9|Otaibi/);
    expect(out.is_online).toBe(true);
  });
});
