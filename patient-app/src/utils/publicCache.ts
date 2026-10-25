import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch } from './api';

/**
 * Persisted cache for the public catalogue lists (specialties, lab packages, cities...). The second open of a screen paints
 * from the device at once and refreshes in the background; a failing network keeps the last good copy on screen.
 *
 * Only the routes the backend marks `@PublicCache` (the same answer for everyone: no user data) are ever stored, so a
 * personal response can never land here. Anything else goes straight to `apiFetch`.
 */
const PUBLIC_LISTS = /^\/(care\/(specialties|insurance|degrees)|labs\/(services|packages|categories)|radiology\/(services|modalities)|home-care\/catalog|locations\/(regions|cities|districts)|catalogs\/[a-z0-9_-]+)(\?[^#]*)?$/i;

const PREFIX = '@nabd_public_';
/** A copy younger than this is used without waiting for the network (the backend caches 2-60 minutes itself). */
export const FRESH_MS = 5 * 60_000;
/** A copy older than this is dropped: a stale catalogue is worse than a spinner. */
export const MAX_AGE_MS = 7 * 24 * 60 * 60_000;

export function isPublicList(endpoint: string): boolean {
  return PUBLIC_LISTS.test(endpoint);
}

interface Entry<T> { data: T; ts: number }

async function read<T>(key: string, now: number): Promise<Entry<T> | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as Entry<T>;
    return entry && typeof entry.ts === 'number' && now - entry.ts <= MAX_AGE_MS ? entry : null;
  } catch {
    return null;
  }
}

async function write<T>(key: string, data: T, now: number): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify({ data, ts: now } satisfies Entry<T>));
  } catch { /* the cache is best-effort */ }
}

/**
 * `onRefresh` is called with the newer data when a cached copy was returned first and the background refresh brought a different one.
 * A route outside the public list is fetched as `apiFetch` would, never stored.
 */
export async function fetchPublicList<T = unknown>(endpoint: string, onRefresh?: (fresh: T) => void, now: () => number = Date.now): Promise<T> {
  if (!isPublicList(endpoint)) return apiFetch<T>(endpoint);
  const cached = await read<T>(endpoint, now());
  const fetchFresh = async (): Promise<T> => {
    const fresh = await apiFetch<T>(endpoint);
    await write(endpoint, fresh, now());
    return fresh;
  };
  if (cached && now() - cached.ts < FRESH_MS) return cached.data;
  if (cached) {
    // Stale but usable: show it now, refresh behind it.
    void fetchFresh().then((fresh) => { if (JSON.stringify(fresh) !== JSON.stringify(cached.data)) onRefresh?.(fresh); }).catch(() => undefined);
    return cached.data;
  }
  return fetchFresh();
}
