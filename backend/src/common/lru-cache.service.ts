import { Injectable, Logger } from '@nestjs/common';
import { LRUCache } from 'lru-cache';

@Injectable()
export class LruCacheService {
  private readonly logger = new Logger(LruCacheService.name);

  private readonly cache = new LRUCache<string, { data: any; setAt: number }>({
    max: 500,
    ttl: 30 * 1000,
    allowStale: true,
    updateAgeOnGet: false,
    updateAgeOnHas: false,
  });

  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    return entry ? (entry.data as T) : undefined;
  }

  set(key: string, value: any, ttlMs?: number): void {
    this.cache.set(key, { data: value, setAt: Date.now() }, ttlMs ? { ttl: ttlMs } : undefined);
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  isStale(key: string, ttlMs: number): boolean {
    const entry = this.cache.get(key);
    if (!entry) return true;
    return Date.now() - entry.setAt > ttlMs * 0.8;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}
