import { useEffect, useRef, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { apiFetch } from '@/utils/api';

/**
 * Offline-first data hook — Phase 5 (Offline Support).
 *
 * Strategy:
 *   1. ONLINE  → fetch from API, persist to AsyncStorage, return fresh data.
 *   2. OFFLINE/failure → return last cached copy instantly (stale-while-revalidate).
 *   3. NetInfo listener → when connectivity returns, auto-resync in background.
 *
 * Usage: const { data, loading, fromCache, refresh } = useOfflineData('medicines', '/medicines?limit=50');
 */
export function useOfflineData<T = any>(cacheKey: string, endpoint: string, options?: { ttlMs?: number }) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [fromCache, setFromCache] = useState(false);
  const mounted = useRef(true);
  const storageKey = `@nabdah_offline_${cacheKey}`;

  const load = useCallback(async (isResync = false) => {
    // 1) show cached copy immediately (instant render even before network)
    if (!isResync) {
      try {
        const raw = await AsyncStorage.getItem(storageKey);
        if (raw && mounted.current) {
          const cached = JSON.parse(raw);
          setData(cached.data);
          setFromCache(true);
        }
      } catch { /* cache miss is fine */ }
    }

    // 2) network fetch
    try {
      const fresh = await apiFetch(endpoint);
      if (mounted.current) {
        setData(fresh);
        setFromCache(false);
      }
      await AsyncStorage.setItem(storageKey, JSON.stringify({ data: fresh, ts: Date.now() }));
    } catch {
      // offline or server error — cached copy already shown if present
      if (mounted.current && isResync) setFromCache(true);
    } finally {
      if (mounted.current && !isResync) setLoading(false);
    }
  }, [endpoint, storageKey]);

  useEffect(() => {
    mounted.current = true;
    load();

    // 3) auto-resync when connectivity returns
    const unsub = NetInfo.addEventListener((state) => {
      if (state.isConnected) load(true);
    });
    return () => {
      mounted.current = false;
      unsub();
    };
  }, [load]);

  const refresh = useCallback(() => load(true), [load]);

  return { data, loading, fromCache, refresh };
}

/** Write-through cache for user-specific collections (notifications, orders, messages). */
export async function cacheWrite(cacheKey: string, data: any): Promise<void> {
  try {
    await AsyncStorage.setItem(`@nabdah_offline_${cacheKey}`, JSON.stringify({ data, ts: Date.now() }));
  } catch { /* best-effort */ }
}

export async function cacheRead<T = any>(cacheKey: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(`@nabdah_offline_${cacheKey}`);
    return raw ? JSON.parse(raw).data : null;
  } catch {
    return null;
  }
}
