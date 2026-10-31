const store: Record<string, string> = {};
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (k: string) => store[k] ?? null),
  setItemAsync: jest.fn(async (k: string, v: string) => { store[k] = v; }),
  deleteItemAsync: jest.fn(async (k: string) => { delete store[k]; }),
}));
jest.mock('@react-native-async-storage/async-storage', () => ({ removeItem: jest.fn(async () => undefined) }));

import { STORAGE_KEYS } from '../src/constants';
import { endPatientSession, notifySessionExpired, refreshStoredSession, setSessionExpiredHandler, tokensFromRefresh } from '../src/auth/session';

const res = (body: unknown, ok = true) => ({ ok, status: ok ? 200 : 401, json: async () => body }) as Response;

beforeEach(() => { for (const k of Object.keys(store)) delete store[k]; });

test('tokensFromRefresh accepts flat and nested pairs', () => {
  expect(tokensFromRefresh({ access_token: 'a', refresh_token: 'r' })).toEqual({ accessToken: 'a', refreshToken: 'r' });
  expect(tokensFromRefresh({ token: { access_token: 'a', refresh_token: 'r' } })).toEqual({ accessToken: 'a', refreshToken: 'r' });
  expect(tokensFromRefresh({})).toBeNull();
});

test('refresh stores the new pair, once for concurrent callers', async () => {
  store[STORAGE_KEYS.REFRESH_TOKEN] = 'old';
  const f = jest.fn(async () => res({ access_token: 'a2', refresh_token: 'r2' }));
  const [x, y] = await Promise.all([refreshStoredSession(f as never), refreshStoredSession(f as never)]);
  expect(x).toBe('a2'); expect(y).toBe('a2');
  expect(f).toHaveBeenCalledTimes(1);
  expect(store[STORAGE_KEYS.REFRESH_TOKEN]).toBe('r2');
});

test('refresh fails without a stored refresh token', async () => {
  const f = jest.fn();
  expect(await refreshStoredSession(f as never)).toBeNull();
  expect(f).not.toHaveBeenCalled();
});

test('sign-out revokes server side and clears every stored token', async () => {
  store[STORAGE_KEYS.AUTH_TOKEN] = 'a'; store[STORAGE_KEYS.REFRESH_TOKEN] = 'r'; store.userToken = 'a';
  const f = jest.fn(async () => res({}));
  await endPatientSession(f as never);
  expect(f).toHaveBeenCalledTimes(1);
  expect(Object.keys(store)).toHaveLength(0);
});

test('sign-out still clears when the network fails', async () => {
  store[STORAGE_KEYS.REFRESH_TOKEN] = 'r';
  await endPatientSession((async () => { throw new Error('offline'); }) as never);
  expect(Object.keys(store)).toHaveLength(0);
});

test('expiry handler is notified', () => {
  const h = jest.fn(); setSessionExpiredHandler(h); notifySessionExpired(); expect(h).toHaveBeenCalled(); setSessionExpiredHandler(null);
});
