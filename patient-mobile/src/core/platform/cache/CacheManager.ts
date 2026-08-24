import { logger } from '../../../services/Logger';

export interface CacheOptions {
  ttlSeconds: number; // Time to live
  storage: 'memory' | 'disk'; // Memory is fast/volatile, Disk is persistent
}

export class CacheManager {
  private log = logger.scope('CacheManager');
  private memoryCache = new Map<string, { expiresAt: number; value: any }>();

  /**
   * Set a value in the cache
   */
  public async set<T>(key: string, value: T, options: CacheOptions): Promise<void> {
    const expiresAt = Date.now() + options.ttlSeconds * 1000;

    if (options.storage === 'memory') {
      this.memoryCache.set(key, { expiresAt, value });
    } else {
      // Logic to write to Expo FileSystem or AsyncStorage
      this.log.debug(`Writing ${key} to disk cache`);
    }
  }

  /**
   * Retrieve a value from the cache if it hasn't expired
   */
  public async get<T>(key: string, storage: 'memory' | 'disk'): Promise<T | null> {
    if (storage === 'memory') {
      const item = this.memoryCache.get(key);
      if (item && item.expiresAt > Date.now()) {
        return item.value as T;
      }
      this.memoryCache.delete(key);
      return null;
    } else {
      // Logic to read from Expo FileSystem or AsyncStorage
      return null;
    }
  }

  /**
   * Invalidate a specific cache key
   */
  public async invalidate(key: string, storage: 'memory' | 'disk'): Promise<void> {
    if (storage === 'memory') {
      this.memoryCache.delete(key);
    } else {
      // Logic to delete from disk
    }
  }

  /**
   * Clear entire cache namespace
   */
  public async clearAll(): Promise<void> {
    this.memoryCache.clear();
    // Logic to clear disk cache
    this.log.info('Cache cleared');
  }
}
