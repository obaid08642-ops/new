import { HomeCareCompatController } from './home-care-compat.module';
import { distanceKmTo, nearestOrigin, nurseFilterClauses } from './nurse-list-filters';

describe('nurse list: nationality, available now, nearest with distance_km (#1819)', () => {
  it('builds only validated clauses', () => {
    expect(nurseFilterClauses({ nationality: ' Saudi ', available: 'true' })).toEqual({ nationality: { $eq: 'Saudi' }, 'availability.accepting': { $ne: false } });
    expect(nurseFilterClauses({ nationality: { $ne: 'x' }, available: 'yes' })).toEqual({});
    expect(nurseFilterClauses({ nationality: 'a\u0000b' })).toEqual({ nationality: { $eq: 'ab' } });
  });

  it('the "no filter" values the clients send add no clause (j_nursing regression)', () => {
    // exactly the query patient-app sends from service-details
    expect(nurseFilterClauses({ type: 's1', sort: 'rating', gender: 'any', availability: 'any', nationality: 'any', search: '' } as never)).toEqual({});
    expect(nurseFilterClauses({ nationality: 'ANY' })).toEqual({});
    expect(nurseFilterClauses({ nationality: 'all' })).toEqual({});
    expect(nurseFilterClauses({})).toEqual({});
  });

  it('with no filter given the list query is exactly the old one and keeps every nurse', async () => {
    let filter: any;
    let limit = 0;
    const profiles = [{ account_id: 'a', id: 'p1', name_en: 'A' }, { account_id: 'b', id: 'p2', name_en: 'B' }];
    const profilesModel: any = { find: (f: any) => { filter = f; return { limit: (n: number) => { limit = n; return { lean: async () => profiles }; } }; } };
    const ctl: any = new (HomeCareCompatController as any)({}, { findOne: () => ({ lean: async () => null }) }, profilesModel, {});
    const out = await ctl.providers({ type: 's1', sort: 'rating', gender: 'any', availability: 'any', nationality: 'any', search: '' });
    expect(Object.keys(filter).sort()).toEqual(['account_id', 'is_deleted', 'medical_review_status', 'nursing_services.key', 'public_eligibility', 'status', 'type']);
    expect(limit).toBe(50);
    expect(out.map((n: any) => n.id).sort()).toEqual(['a', 'b']);
  });

  it('nearest applies only with a valid point', () => {
    expect(nearestOrigin({ sort: 'nearest', lat: '24.7', lng: '46.7' })).toEqual({ lat: 24.7, lng: 46.7 });
    expect(nearestOrigin({ sort: 'rating', lat: '24.7', lng: '46.7' })).toBeNull();
    expect(nearestOrigin({ sort: 'nearest', lat: '95', lng: '46.7' })).toBeNull();
    expect(nearestOrigin({ sort: 'nearest', lat: 'abc', lng: '46.7' })).toBeNull();
    expect(nearestOrigin({ sort: 'nearest' })).toBeNull();
  });

  it('distance is one decimal in km, null for a profile with no stored point', () => {
    const origin = { lat: 24.7136, lng: 46.6753 };
    expect(distanceKmTo({ location: { lat: 24.7136, lng: 46.6753 } }, origin)).toBe(0);
    const d = distanceKmTo({ location: { lat: 24.8136, lng: 46.6753 } }, origin);
    expect(d).toBeGreaterThan(10.9);
    expect(d).toBeLessThan(11.3);
    expect(distanceKmTo({}, origin)).toBeNull();
    expect(distanceKmTo({ location: { lat: '1', lng: 2 } }, origin)).toBeNull();
  });

  it('the list reaches the query and answers nearest first with distance_km', async () => {
    let filter: any;
    const profiles = [
      { account_id: 'far', id: 'p1', name_en: 'Far', location: { lat: 25.5, lng: 46.7 } },
      { account_id: 'none', id: 'p2', name_en: 'None' },
      { account_id: 'near', id: 'p3', name_en: 'Near', location: { lat: 24.72, lng: 46.68 } },
    ];
    const profilesModel: any = { find: (f: any) => { filter = f; return { limit: () => ({ lean: async () => profiles }) }; } };
    const ctl: any = new (HomeCareCompatController as any)({}, { findOne: () => ({ lean: async () => null }) }, profilesModel, {});
    const out = await ctl.providers({ nationality: 'Saudi', available: 'true', sort: 'nearest', lat: '24.7136', lng: '46.6753' });
    expect(filter).toMatchObject({ nationality: { $eq: 'Saudi' }, 'availability.accepting': { $ne: false } });
    expect(out.map((n: any) => n.id)).toEqual(['near', 'far', 'none']);
    expect(out[0].distance_km).toBeLessThan(2);
    expect(out[2].distance_km).toBeNull();
  });
});
