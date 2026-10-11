import { AVAILABLE_WITHIN_MINUTES, DOCTORS_PATH, buildDoctorsPath, doctorRows, keepsServerOrder, nearbyFiltersEnabled, resolveNearbyPlace, sortsByDistance, type NearbyDeps } from './consultNearby';

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

  it('nearest with the device location: /care/doctors with type, sort=distance, lat and lng', () => {
    const path = buildDoctorsPath({ enabled: true, ...base, nearest: true, place: coords });
    expect(path).toBe('/care/doctors?type=clinic&sort=distance&lat=24.7136&lng=46.6753');
    expect(sortsByDistance(path)).toBe(true);
    expect(keepsServerOrder(path)).toBe(true);
  });

  it('nearest for a home visit sends type=home_visit', () => {
    expect(buildDoctorsPath({ enabled: true, ...base, mode: 'home', nearest: true, place: coords })).toBe('/care/doctors?type=home_visit&sort=distance&lat=24.7136&lng=46.6753');
  });

  it('nearest without the location: the saved city is sent as the city filter (encoded), never coordinates', () => {
    const path = buildDoctorsPath({ enabled: true, ...base, nearest: true, place: { kind: 'city', city: 'الرياض' } });
    expect(path).toBe('/care/doctors?type=clinic&city=%D8%A7%D9%84%D8%B1%D9%8A%D8%A7%D8%B6');
    expect(path).not.toContain('lat=');
    expect(path).not.toContain('sort=');
  });

  it('nearest with non-finite coordinates sends no lat/lng/sort', () => {
    const path = buildDoctorsPath({ enabled: true, ...base, nearest: true, place: { kind: 'coords', lat: NaN, lng: 46.6 } });
    expect(path).toBe('/care/doctors?type=clinic');
  });

  it('nearest with no place at all: the plain call, no sort', () => {
    const path = buildDoctorsPath({ enabled: true, ...base, nearest: true, place: null });
    expect(path).toBe(DOCTORS_PATH);
    expect(sortsByDistance(path)).toBe(false);
    expect(keepsServerOrder(path)).toBe(false);
  });

  it('nearest is never sent for an online consultation; available now maps online to type=video', () => {
    const path = buildDoctorsPath({ enabled: true, ...base, mode: 'online', nearest: true, availableNow: true, place: coords });
    expect(path).toBe('/care/doctors?type=video&available_within=15');
    expect(buildDoctorsPath({ enabled: true, ...base, mode: 'online', nearest: true, place: coords })).toBe(DOCTORS_PATH);
  });

  it('available now: available_within=15 whole minutes with the required type', () => {
    const path = buildDoctorsPath({ enabled: true, ...base, availableNow: true });
    expect(path).toBe('/care/doctors?type=clinic&available_within=15');
    expect(AVAILABLE_WITHIN_MINUTES).toBeGreaterThan(0);
    expect(Number.isInteger(AVAILABLE_WITHIN_MINUTES)).toBe(true);
    expect(keepsServerOrder(path)).toBe(true);
    expect(sortsByDistance(path)).toBe(false);
  });

  it('available now with nearest: the server cannot combine them, so no distance sort is sent (the city still is)', () => {
    expect(buildDoctorsPath({ enabled: true, ...base, nearest: true, availableNow: true, place: coords })).toBe('/care/doctors?type=clinic&available_within=15');
    expect(buildDoctorsPath({ enabled: true, ...base, nearest: true, availableNow: true, place: city })).toBe('/care/doctors?type=clinic&available_within=15&city=Test%20city');
  });
});

describe('consult hub quick filters: the response', () => {
  it('reads the plain array of /providers and the { items } of /care/doctors', () => {
    expect(doctorRows([{ id: 'a' }])).toEqual([{ id: 'a' }]);
    expect(doctorRows({ items: [{ id: 'b' }], has_more: false })).toEqual([{ id: 'b' }]);
  });
  it('an empty or malformed response is an empty list', () => {
    expect(doctorRows({ items: [] })).toEqual([]);
    expect(doctorRows(null)).toEqual([]);
    expect(doctorRows({ items: 'x' })).toEqual([]);
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
