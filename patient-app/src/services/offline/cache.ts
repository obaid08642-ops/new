/**
 * 15.4 — cached reads that stay visible offline, with the time they were written.
 *
 * `useOfflineData` (Phase 5) already had stale-while-revalidate for a handful of
 * screens. This module is the shared, tested primitive behind it: a timestamped
 * cache entry, a "last updated" value the banner can render, and a freshness
 * policy that says when a cached copy is too old to show.
 */
import { STORAGE_KEYS } from '../../constants';

export interface CachedEnvelope<T> {
  data: T;
  /** Epoch ms of the moment the server answered. */
  updatedAt: number;
  /** Where the copy came from, so the UI can be honest about it. */
  source: 'network' | 'cache';
}

export interface CacheStorageLike {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export const CACHE_PREFIX = '@nabdah_cache_v2_';

export function cacheKeyFor(name: string): string {
  return `${CACHE_PREFIX}${name}`;
}

export class OfflineCache {
  constructor(private readonly storage: CacheStorageLike) {}

  async read<T>(name: string): Promise<CachedEnvelope<T> | null> {
    try {
      const raw = await this.storage.getItem(cacheKeyFor(name));
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed.updatedAt !== 'number') return null;
      return { data: parsed.data as T, updatedAt: parsed.updatedAt, source: 'cache' };
    } catch {
      return null;
    }
  }

  async write<T>(name: string, data: T, now: () => number = Date.now): Promise<CachedEnvelope<T>> {
    const envelope: CachedEnvelope<T> = { data, updatedAt: now(), source: 'network' };
    try {
      await this.storage.setItem(cacheKeyFor(name), JSON.stringify(envelope));
    } catch {
      // A cache write must never fail the request that produced the data.
    }
    return envelope;
  }

  async remove(name: string): Promise<void> {
    try {
      await this.storage.removeItem(cacheKeyFor(name));
    } catch {
      // Best-effort eviction.
    }
  }

  /** Most recent `updatedAt` across the named entries — the banner's "last updated". */
  async lastUpdatedAt(names: string[]): Promise<number | null> {
    const stamps = await Promise.all(names.map((name) => this.read(name)));
    const values = stamps.map((envelope) => envelope?.updatedAt ?? 0).filter((value) => value > 0);
    return values.length ? Math.max(...values) : null;
  }
}

/** Default cache over AsyncStorage. */
export const offlineCache = new OfflineCache({
  getItem: async (key) => {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    return AsyncStorage.getItem(key);
  },
  setItem: async (key, value) => {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    await AsyncStorage.setItem(key, value);
  },
  removeItem: async (key) => {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    await AsyncStorage.removeItem(key);
  },
});

export function formatLastUpdated(
  updatedAt: number | null,
  locale: string,
  now: number = Date.now(),
): string {
  if (!updatedAt) return locale === 'en' ? 'Never synced' : 'لم تتم المزامنة بعد';
  const diffMs = Math.max(0, now - updatedAt);
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return locale === 'en' ? 'Updated just now' : 'تم التحديث الآن';
  if (minutes < 60) {
    return locale === 'en' ? `Updated ${minutes} min ago` : `تم التحديث قبل ${minutes} دقيقة`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return locale === 'en' ? `Updated ${hours} h ago` : `تم التحديث قبل ${hours} ساعة`;
  }
  const days = Math.floor(hours / 24);
  return locale === 'en' ? `Updated ${days} d ago` : `تم التحديث قبل ${days} يوم`;
}

export const OFFLINE_BANNER_COPY = {
  ar: { offline: 'لا يوجد اتصال بالإنترنت — تُعرض بيانات محفوظة', back: 'عاد الاتصال — جارٍ المزامنة' },
  en: { offline: 'No internet connection — showing saved data', back: 'Back online — syncing' },
} as const;
