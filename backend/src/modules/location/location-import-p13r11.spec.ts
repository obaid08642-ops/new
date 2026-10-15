import { LocationService } from './location.service';

// P13-R11: Saudi location hierarchy comes from verified official data through
// a validated import pipeline — no invented neighborhoods. Red on the base:
// importLocations() blindly upserts anything (no parent/type/code/coordinate
// checks, no source stamp, no rejects report).
describe('P13-R11 validated location import', () => {
  const existing: any = {
    sa: { code: 'sa', type: 'country', name_ar: 'س', name_en: 'S' },
    'sa-central': { code: 'sa-central', type: 'region', name_ar: 'ا', name_en: 'C' },
  };

  function setup() {
    const upserted: any[] = [];
    const locationModel: any = {
      findOne: jest.fn((q: any) => ({ lean: async () => existing[q?.code] || null })),
      updateOne: jest.fn(async (filter: any, update: any, opts: any) => {
        upserted.push({ filter, update, opts });
        return { upsertedCount: 1, modifiedCount: 0 };
      }),
    };
    const svc = new LocationService(locationModel);
    return { svc, locationModel, upserted };
  }

  const city = { code: 'sa-riyadh', name_ar: 'الرياض', name_en: 'Riyadh', type: 'city', parent_code: 'sa-central', aliases: ['Riyadh City'], coordinates: { lat: 24.7136, lng: 46.6753 } };
  const district = { code: 'sa-riyadh-malqa', name_ar: 'حي الملقا', name_en: 'Al Malqa', type: 'district', parent_code: 'sa-riyadh', aliases: [], coordinates: { lat: 24.81, lng: 46.61 } };

  it('imports a valid region→city→district chain with the source stamp', async () => {
    const { svc, upserted } = setup();
    // Out of order on purpose: the pipeline topologically sorts the batch.
    const out: any = await (svc as any).importLocations([district, city], 'census-2024');
    expect(out).toMatchObject({ imported: 2, rejected: [], source: 'census-2024' });
    expect(upserted).toHaveLength(2);
    for (const u of upserted) {
      expect(u.update.$set).toMatchObject({ source: 'census-2024' });
      expect(u.update.$set.source_verified_at).toBeInstanceOf(Date);
    }
  });

  it('rejects rows with an unknown parent and imports nothing for them', async () => {
    const { svc, upserted } = setup();
    const bad = { ...district, code: 'sa-x-1', parent_code: 'sa-nope' };
    const out: any = await (svc as any).importLocations([bad], 'census-2024');
    expect(out.imported).toBe(0);
    expect(out.rejected).toHaveLength(1);
    expect(out.rejected[0]).toMatchObject({ code: 'sa-x-1' });
    expect(String(out.rejected[0].reason)).toMatch(/parent/i);
    expect(upserted).toHaveLength(0);
  });

  it('rejects a district parented to a region (wrong parent type)', async () => {
    const { svc, upserted } = setup();
    const bad = { ...district, code: 'sa-x-2', parent_code: 'sa-central' };
    const out: any = await (svc as any).importLocations([bad], 'census-2024');
    expect(out.imported).toBe(0);
    expect(out.rejected).toHaveLength(1);
    expect(upserted).toHaveLength(0);
  });

  it('rejects bad codes, empty names and districts without coordinates', async () => {
    const { svc, upserted } = setup();
    const rows = [
      { ...city, code: 'BAD CODE!' },
      { ...city, code: 'sa-riyadh-2', name_ar: '' },
      { ...district, code: 'sa-d-9', coordinates: undefined },
    ];
    const out: any = await (svc as any).importLocations(rows as any, 'census-2024');
    expect(out.imported).toBe(0);
    expect(out.rejected).toHaveLength(3);
    expect(upserted).toHaveLength(0);
  });

  it('re-importing the same official batch is idempotent', async () => {
    const { svc, upserted } = setup();
    const first: any = await (svc as any).importLocations([city], 'census-2024');
    const second: any = await (svc as any).importLocations([city], 'census-2024');
    expect(first).toMatchObject({ imported: 1, rejected: [] });
    expect(second).toMatchObject({ imported: 1, rejected: [] });
    expect(upserted.filter((u: any) => u.filter.code === 'sa-riyadh')).toHaveLength(2);
  });
});
