import { LabsService } from './labs.service';
import { RadiologyOpsService } from '../radiology/radiology.service';

const chain = (rows: any[]) => ({ sort: () => ({ limit: () => ({ lean: async () => rows }) }), lean: async () => rows });
function svcModel(services: any[], caps: Record<string, any[]>, seen: any[]) {
  return {
    find: (q: any) => { seen.push(q); return chain(services); },
    findOne: (q: any) => ({ lean: async () => services.find((s) => s.id === (q.id?.$eq ?? q.id)) || null }),
    db: { collection: (name: string) => ({ find: (q: any) => { seen.push({ name, q }); return { toArray: async () => caps[name] || [] }; } }) },
  };
}
const profiles = (rows: any[]) => ({ find: (q: any) => ({ lean: async () => rows.filter((r) => !q.account_id?.$in || q.account_id.$in.includes(r.account_id)) }) });

describe('B-7b labs carousel + price comparison', () => {
  const tests = [{ id: 't1', short_code: 'CBC', name_ar: 'تعداد دم كامل', category: 'blood', price: 90 }];
  const labs = [
    { account_id: 'a', name_ar: 'أ', rating_avg: 4, rating_count: 3, test_categories: ['blood'] },
    { account_id: 'b', name_ar: 'ب', rating_avg: 5, rating_count: 2, test_categories: ['t1'] },
    { account_id: 'c', name_ar: 'ج', rating_avg: 5, rating_count: 9, test_categories: ['urine'] },
  ];
  const make = (caps: any[], seen: any[] = []) => {
    const s: any = Object.create(LabsService.prototype);
    // the offers reader (common/service-offers) reads the approved lab profiles and the capability rows by collection
    s.svcModel = svcModel(tests, { provider_capabilities_lab: caps, provider_profiles: labs.map((l) => ({ ...l, type: 'lab' })) }, seen);
    s.providerProfiles = profiles(labs);
    return s as LabsService;
  };

  it('carousel lists only labs that run the test, best rated first, no contact fields', async () => {
    const out: any[] = await make([]).getCarousel(undefined, 999);
    expect(out[0].providers.map((p: any) => p.id)).toEqual(['b', 'a']);
    expect(out[0].providers_count).toBe(2);
    expect(Object.keys(out[0].providers[0]).sort()).toEqual(['id', 'logo', 'name_ar', 'name_en', 'rating', 'rating_count']);
  });

  it('price comparison uses each lab\'s own catalog price, cheapest first, unknown labs dropped', async () => {
    const seen: any[] = [];
    const out: any = await make([
      { provider_account_id: 'a', code: 'CBC', price: 120 }, { provider_account_id: 'b', code: 't1', price: 70 },
      { provider_account_id: 'ghost', code: 'CBC', price: 10 }, { provider_account_id: 'c', code: 'CBC', price: 0 },
    ], seen).priceComparison('t1');
    expect(out.offers.map((o: any) => [o.provider.id, o.price])).toEqual([['b', 70], ['a', 120]]);   // ghost has no approved profile, c has no price
    expect(out.catalog_price).toBe(90);
  });

  it('unknown test is a 404', async () => {
    await expect(make([]).priceComparison('nope')).rejects.toThrow('service_not_found');
  });
});

describe('B-7b radiology price comparison', () => {
  it('matches scan_type/body_part case-insensitively and sorts by price', async () => {
    const seen: any[] = [];
    const r: any = Object.create(RadiologyOpsService.prototype);
    r.svcModel = svcModel([{ id: 's1', modality: 'mri', body_part: 'lumbar_spine', price: 1000 }],
      {
        provider_capabilities_radiology: [
          { provider_account_id: 'x', scan_type: 'MRI', body_part: 'Lumbar_Spine', price: 950 }, { provider_account_id: 'y', scan_type: 'mri', body_part: 'lumbar_spine', price: 800 },
          { provider_account_id: 'z', scan_type: 'MRIX', body_part: 'lumbar_spine', price: 10 },                                  // another scan type: not this scan
        ],
        provider_profiles: ['x', 'y', 'z'].map((id) => ({ account_id: id, type: 'radiology', rating_count: 0 })),
      }, seen);
    r.profileModel = profiles([{ account_id: 'x', rating_count: 0 }, { account_id: 'y', rating_count: 0 }]);
    const out: any = await (r as RadiologyOpsService).priceComparison('s1');
    expect(out.offers.map((o: any) => o.provider.id)).toEqual(['y', 'x']);   // scan_type / body_part match is case-insensitive and exact
  });
});
