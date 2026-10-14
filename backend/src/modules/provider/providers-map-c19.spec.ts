import { ProvidersService } from './providers.service';

// OC-C C-19 (766): map providers answer in one shape with server-side type filter.
function serviceFor(rows: any[]) {
  const service: any = Object.create(ProvidersService.prototype);
  service.providerModel = {
    find: jest.fn().mockImplementation((q: any) => {
      const wanted = q?.type?.$eq ?? q?.type;
      const filtered = wanted ? rows.filter((r: any) => r.type === wanted) : rows;
      return { limit: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(filtered) }) };
    }),
  };
  return service as ProvidersService;
}

const ROW = { id: 'pr-1', type: 'lab', name_ar: 'مختبر', name_en: 'Lab', city: 'Jeddah', district: 'R', rating: 4.5, location: { lat: 21.5, lng: 39.1 } };

describe('OC C-19 provider map shape', () => {
  it('returns one shape with lat/lng and filters by type server-side', async () => {
    const rows: any[] = await serviceFor([ROW, { ...ROW, id: 'pr-2', type: 'pharmacy' }]).mapProviders('lab', 21.5, 39.1, 50);
    expect(rows).toHaveLength(1);
    expect(Object.keys(rows[0]).sort()).toEqual(['accepted_insurance', 'city', 'distance_km', 'district', 'id', 'lat', 'lng', 'name_ar', 'name_en', 'rating', 'rating_count', 'type']);
  });
});
