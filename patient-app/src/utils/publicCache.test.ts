const mockStore = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (k: string) => mockStore.get(k) ?? null),
    setItem: jest.fn(async (k: string, v: string) => { mockStore.set(k, v); }),
  },
}));
jest.mock('./api', () => ({ apiFetch: jest.fn() }));

import { FRESH_MS, MAX_AGE_MS, fetchPublicList, isPublicList } from './publicCache';

const { apiFetch } = jest.requireMock('./api') as { apiFetch: jest.Mock };

describe('public list cache', () => {
  beforeEach(() => { mockStore.clear(); apiFetch.mockReset(); });

  it.each(['/care/specialties', '/labs/packages', '/labs/categories', '/radiology/modalities', '/home-care/catalog', '/locations/cities?region=1', '/catalogs/countries'])('%s is a public list', (p) => {
    expect(isPublicList(p)).toBe(true);
  });
  it.each(['/care/appointments', '/labs/bookings/1', '/users/me/profile', '/care/doctors?q=a', '/insurance/companies', '/labs/packages/12', '/auth/me'])('%s is never cached', (p) => {
    expect(isPublicList(p)).toBe(false);
  });

  it('first open goes to the network and stores; the second open inside the fresh window makes no request', async () => {
    apiFetch.mockResolvedValue([{ id: 1 }]);
    expect(await fetchPublicList('/care/specialties', undefined, () => 1000)).toEqual([{ id: 1 }]);
    expect(await fetchPublicList('/care/specialties', undefined, () => 1000 + FRESH_MS - 1)).toEqual([{ id: 1 }]);
    expect(apiFetch).toHaveBeenCalledTimes(1);
  });

  it('a stale copy is returned at once and the refresh calls back with the newer data', async () => {
    apiFetch.mockResolvedValueOnce([{ id: 1 }]).mockResolvedValueOnce([{ id: 1 }, { id: 2 }]);
    await fetchPublicList('/labs/packages', undefined, () => 0);
    const onRefresh = jest.fn();
    const out = await fetchPublicList('/labs/packages', onRefresh, () => FRESH_MS + 1);
    expect(out).toEqual([{ id: 1 }]);
    await new Promise((r) => setImmediate(r));
    expect(onRefresh).toHaveBeenCalledWith([{ id: 1 }, { id: 2 }]);
  });

  it('a failing refresh keeps the stale copy and does not throw', async () => {
    apiFetch.mockResolvedValueOnce(['a']).mockRejectedValueOnce(new Error('offline'));
    await fetchPublicList('/labs/categories', undefined, () => 0);
    await expect(fetchPublicList('/labs/categories', undefined, () => FRESH_MS + 1)).resolves.toEqual(['a']);
  });

  it('a copy older than a week is dropped and the network is asked', async () => {
    apiFetch.mockResolvedValueOnce(['old']).mockResolvedValueOnce(['new']);
    await fetchPublicList('/labs/categories', undefined, () => 0);
    expect(await fetchPublicList('/labs/categories', undefined, () => MAX_AGE_MS + 1)).toEqual(['new']);
  });

  it('a route outside the list is never stored', async () => {
    apiFetch.mockResolvedValue({ me: true });
    await fetchPublicList('/users/me/profile');
    expect(mockStore.size).toBe(0);
  });
});
