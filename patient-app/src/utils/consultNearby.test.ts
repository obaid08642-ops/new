import { DOCTORS_PATH, buildDoctorsPath, nearbyFiltersEnabled, resolveNearbyPlace, sortsByDistance, type NearbyDeps } from './consultNearby';

const coords = { kind: 'coords', lat: 24.7136, lng: 46.6753 } as const;
const city = { kind: 'city', city: 'Test city' } as const;
const base = { mode: 'clinic', nearest: false, availableNow: false, place: null } as const;

describe('consult hub quick filters: the request', () => {
  const saved = process.env.EXPO_PUBLIC_CONSULT_NEARBY_FILTERS;
  afterEach(() => {
    if (saved === undefined) delete process.env.EXPO_PUBLIC_CONSULT_NEARBY_FILTERS;
    else process.env.EXPO_PUBLIC_CONSULT_NEARBY_FILTERS = saved;
  });

  it('is off by default and only the exact value 1 turns it on', () => {
    delete process.env.EXPO_PUBLIC_CONSULT_NEARBY_FILTERS;
    expect(nearbyFiltersEnabled()).toBe(false);
    process.env.EXPO_PUBLIC_CONSULT_NEARBY_FILTERS = 'true';
    expect(nearbyFiltersEnabled()).toBe(false);
    process.env.EXPO_PUBLIC_CONSULT_NEARBY_FILTERS = '1';
    expect(nearbyFiltersEnabled()).toBe(true);
  });

  it('flag off: the plain call whatever is asked for', () => {
    delete process.env.EXPO_PUBLIC_CONSULT_NEARBY_FILTERS;
    expect(buildDoctorsPath({ ...base, nearest: true, availableNow: true, place: coords })).toBe(DOCTORS_PATH);
    expect(buildDoctorsPath({ enabled: false, ...base, nearest: true, availableNow: true, place: coords })).toBe('/providers?type=doctor');
  });

  it('flag on, nothing chosen: the plain call', () => {
    expect(buildDoctorsPath({ enabled: true, ...base, place: coords })).toBe(DOCTORS_PATH);
  });

  it('nearest with the device location: sort=distance with lat and lng, type kept', () => {
    const path = buildDoctorsPath({ enabled: true, ...base, nearest: true, place: coords });
    expect(path).toBe('/providers?type=doctor&sort=distance&lat=24.7136&lng=46.6753');
    expect(sortsByDistance(path)).toBe(true);
  });

  it('nearest for a home visit works too', () => {
    expect(buildDoctorsPath({ enabled: true, ...base, mode: 'home', nearest: true, place: coords })).toContain('sort=distance');
  });

  it('nearest without the location: the saved city is sent (encoded), never coordinates', () => {
    const path = buildDoctorsPath({ enabled: true, ...base, nearest: true, place: { kind: 'city', city: 'الرياض' } });
    expect(path).toBe('/providers?type=doctor&sort=distance&city=%D8%A7%D9%84%D8%B1%D9%8A%D8%A7%D8%B6');
    expect(path).not.toContain('lat=');
  });

  it('nearest with no place at all: no sort is sent', () => {
    const path = buildDoctorsPath({ enabled: true, ...base, nearest: true, place: null });
    expect(path).toBe(DOCTORS_PATH);
    expect(sortsByDistance(path)).toBe(false);
  });

  it('nearest is never sent for an online consultation', () => {
    const path = buildDoctorsPath({ enabled: true, ...base, mode: 'online', nearest: true, availableNow: true, place: coords });
    expect(path).toBe('/providers?type=doctor&available_within=15');
    expect(path).not.toContain('sort=distance');
  });

  it('available now: available_within=15, alone or with nearest', () => {
    expect(buildDoctorsPath({ enabled: true, ...base, availableNow: true })).toBe('/providers?type=doctor&available_within=15');
    expect(buildDoctorsPath({ enabled: true, ...base, nearest: true, availableNow: true, place: city })).toBe('/providers?type=doctor&sort=distance&city=Test%20city&available_within=15');
  });
});

describe('consult hub quick filters: where "nearest" measures from', () => {
  const deps = (over: Partial<NearbyDeps>): NearbyDeps => ({ deviceCoords: async () => null, savedCity: async () => undefined, ...over });

  it('location granted: the coordinates', async () => {
    expect(await resolveNearbyPlace(deps({ deviceCoords: async () => ({ lat: 24.7, lng: 46.6 }) }))).toEqual({ kind: 'coords', lat: 24.7, lng: 46.6 });
  });

  it('location denied: the saved city', async () => {
    expect(await resolveNearbyPlace(deps({ savedCity: async () => ' Test city ' }))).toEqual({ kind: 'city', city: 'Test city' });
  });

  it('location throws: the saved city', async () => {
    const place = await resolveNearbyPlace(deps({ deviceCoords: async () => { throw new Error('unavailable'); }, savedCity: async () => 'Test city' }));
    expect(place).toEqual({ kind: 'city', city: 'Test city' });
  });

  it('denied and no saved city: null (the control stays off), and a city that cannot be read is no city', async () => {
    expect(await resolveNearbyPlace(deps({}))).toBeNull();
    expect(await resolveNearbyPlace(deps({ savedCity: async () => '  ' }))).toBeNull();
    expect(await resolveNearbyPlace(deps({ savedCity: async () => { throw new Error('offline'); } }))).toBeNull();
  });

  it('a position that is not a number is not used', async () => {
    expect(await resolveNearbyPlace(deps({ deviceCoords: async () => ({ lat: NaN, lng: 46.6 }), savedCity: async () => 'Test city' }))).toEqual({ kind: 'city', city: 'Test city' });
  });
});
