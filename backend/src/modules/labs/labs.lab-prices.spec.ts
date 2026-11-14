import { LabsService } from './labs.service';

/** #631/#639: each compatible lab carries its own price for the requested tests and its rating count. */
function serviceFor(capabilities: any[]) {
  const service: any = Object.create(LabsService.prototype);
  const profiles = [
    { account_id: 'lab-a', type: 'lab', test_categories: ['cbc', 'tsh'] },
    { account_id: 'lab-b', type: 'lab', test_categories: ['cbc', 'tsh'] },
  ];
  // the offers reader (common/service-offers) reads the approved lab profiles and the capability rows by collection
  const find = jest.fn((q: any) => ({ toArray: jest.fn().mockResolvedValue(q?.provider_account_id ? capabilities : []) }));
  service.svcModel = {
    find: jest.fn().mockResolvedValue([
      { id: 'cbc', category: 'blood', short_code: 'CBC', name_ar: 'صورة دم', price: 80 },
      { id: 'tsh', category: 'hormones', short_code: 'TSH', name_ar: 'هرمون الغدة', price: 120 },
    ]),
    db: { collection: jest.fn((name: string) => ({ find: name === 'provider_profiles' ? () => ({ toArray: async () => profiles }) : find })) },
  };
  service.providerProfiles = {
    find: jest.fn().mockReturnValue({ limit: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([
      { account_id: 'lab-a', id: 'f-a', name_ar: 'مختبر أ', rating_avg: 4.5, rating_count: 12 },
      { account_id: 'lab-b', id: 'f-b', name_ar: 'مختبر ب', rating_avg: 0, rating_count: 0 },
    ]) }) }),
  };
  return { service, find };
}

describe('LabsService.compatibleProviders per-lab price', () => {
  it('uses the lab’s own prices, the catalog price for a test the lab did not price, and returns the rating count', async () => {
    const { service, find } = serviceFor([
      { provider_account_id: 'lab-a', code: 'CBC', price: 60 },
      { provider_account_id: 'lab-a', name_ar: 'هرمون الغدة', code: 'X', price: 100 },
      { provider_account_id: 'lab-b', code: 'cbc', price: 70 },
    ]);
    const out = await service.compatibleProviders(['cbc', 'tsh']);
    expect(out.map((l: any) => [l.id, l.price, l.rating, l.rating_count])).toEqual([
      ['lab-a', 160, 4.5, 12],
      ['lab-b', 190, null, 0],
    ]);
    expect(find).toHaveBeenCalledWith(expect.objectContaining({ provider_account_id: { $in: ['lab-a', 'lab-b'] }, available: true }), expect.anything());   // only the capability rows of these labs
  });
});
