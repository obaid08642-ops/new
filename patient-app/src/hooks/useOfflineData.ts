import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch } from '@/utils/api';
import { subscribeConnectivity } from '@/services/http/connectivity';
import { offlineCache } from '@/services/offline/cache';
import { outbox } from '@/services/offline/outbox';

/**
 * Offline-first data hook — Phase 5, rebuilt on the Phase 15 primitives.
 *
 * Strategy (unchanged in intent, single implementation now):
 *   1. Show the cached copy immediately, with its `updatedAt`, so the screen is
 *      never blank while the network is being asked.
 *   2. ONLINE  → fetch, write through the shared cache, return fresh data.
 *   3. Failure → keep showing the cached copy and mark it as stale.
 *   4. The ONE connectivity signal (owned by the HTTP client) triggers a resync.
 *
 * It previously opened its own NetInfo listener and its own storage keys. The app
 * now has one idea of "am I online" and one cache format, which is what lets the
 * offline banner report a truthful "last updated" time.
 *
 * Usage: const { data, loading, fromCache, updatedAt, refresh } = useOfflineData('medicines', '/medicines?limit=50');
 */
export function useOfflineData<T = any>(cacheKey: string, endpoint: string, options?: { ttlMs?: number }) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [fromCache, setFromCache] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const mounted = useRef(true);

  const load = useCallback(async (isResync = false) => {
    // 1) cached copy first, so the screen renders even before the network answers.
    if (!isResync) {
      const cached = await offlineCache.read<T>(cacheKey);
      if (cached && mounted.current) {
        setData(cached.data);
        setUpdatedAt(cached.updatedAt);
        setFromCache(true);
      }
    }

    // 2) network, with the screen-close cancellation of 15.1.
    const controller = new AbortController();
    try {
      const fresh = await apiFetch<T>(endpoint, { signal: controller.signal });
      if (!mounted.current) return;
      setData(fresh);
      setFromCache(false);
      const written = await offlineCache.write(cacheKey, fresh);
      if (mounted.current) setUpdatedAt(written.updatedAt);
    } catch {
      // Offline or server error: the cached copy stays on screen.
      if (mounted.current && isResync) setFromCache(true);
    } finally {
      if (mounted.current && !isResync) setLoading(false);
    }
  }, [cacheKey, endpoint]);

  useEffect(() => {
    mounted.current = true;
    void load();
    // 3) resync on reconnect, and drain anything the outbox is holding.
    const unsubscribe = subscribeConnectivity((snapshot) => {
      if (snapshot.online) {
        void load(true);
        void outbox.replay();
      }
    });
    return () => {
      mounted.current = false;
      unsubscribe();
    };
  }, [load]);

  const refresh = useCallback(() => load(true), [load]);

  return { data, loading, fromCache, updatedAt, refresh };
}

/**
 * Write-through cache for user-specific collections (notifications, orders,
 * messages). Retained under the ORIGINAL `@nabdah_offline_` keys so data written
 * by earlier releases is still readable after the upgrade.
 */
const LEGACY_PREFIX = '@nabdah_offline_';

export async function cacheWrite(cacheKey: string, data: any): Promise<void> {
  try {
    await AsyncStorage.setItem(`${LEGACY_PREFIX}${cacheKey}`, JSON.stringify({ data, ts: Date.now() }));
  } catch { /* best-effort */ }
  await offlineCache.write(cacheKey, data);
}

export async function cacheRead<T = any>(cacheKey: string): Promise<T | null> {
  const shared = await offlineCache.read<T>(cacheKey);
  if (shared) return shared.data;
  try {
    const raw = await AsyncStorage.getItem(`${LEGACY_PREFIX}${cacheKey}`);
    return raw ? JSON.parse(raw).data : null;
  } catch {
    return null;
  }
}
