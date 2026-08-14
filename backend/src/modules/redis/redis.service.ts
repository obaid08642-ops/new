import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('RedisService');
  private client: Redis;
  private subscriber: Redis;
  private publisher: Redis;

  onModuleInit() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const options = {
      retryStrategy: (times: number) => Math.min(times * 100, 3000),
      maxRetriesPerRequest: 3,
      lazyConnect: false,
    };
    this.client = new Redis(redisUrl, options);
    this.subscriber = new Redis(redisUrl, options);
    this.publisher = new Redis(redisUrl, options);
    this.client.on('connect', () => this.logger.log('Redis connected'));
    this.client.on('error', (err) => this.logger.error('Redis error', err.message));
  }

  async onModuleDestroy() {
    await this.client?.quit();
    await this.subscriber?.quit();
    await this.publisher?.quit();
  }

  // ── Core operations ──────────────────────────────────────────
  async get(key: string): Promise<string | null> { return this.client.get(key); }
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) await this.client.setex(key, ttlSeconds, value);
    else await this.client.set(key, value);
  }
  async del(key: string): Promise<void> { await this.client.del(key); }
  async exists(key: string): Promise<boolean> { return (await this.client.exists(key)) > 0; }
  async incr(key: string): Promise<number> { return this.client.incr(key); }
  async expire(key: string, ttl: number): Promise<void> { await this.client.expire(key, ttl); }
  async setnx(key: string, value: string): Promise<boolean> { return (await this.client.setnx(key, value)) === 1; }
  async keys(pattern: string): Promise<string[]> { return this.client.keys(pattern); }
  async mget(keys: string[]): Promise<(string | null)[]> { return this.client.mget(...keys); }

  // ── Hash operations ──────────────────────────────────────────
  async hset(key: string, field: string, value: string): Promise<void> { await this.client.hset(key, field, value); }
  async hget(key: string, field: string): Promise<string | null> { return this.client.hget(key, field); }
  async hgetall(key: string): Promise<Record<string, string>> { return this.client.hgetall(key); }
  async hdel(key: string, field: string): Promise<void> { await this.client.hdel(key, field); }
  async hmset(key: string, data: Record<string, string>): Promise<void> { await this.client.hmset(key, data); }

  // ── Set operations ───────────────────────────────────────────
  async sadd(key: string, ...members: string[]): Promise<void> { await this.client.sadd(key, ...members); }
  async srem(key: string, ...members: string[]): Promise<void> { await this.client.srem(key, ...members); }
  async smembers(key: string): Promise<string[]> { return this.client.smembers(key); }
  async sismember(key: string, member: string): Promise<boolean> { return (await this.client.sismember(key, member)) === 1; }

  // ── Sorted set operations ─────────────────────────────────────
  async zadd(key: string, score: number, member: string): Promise<void> { await this.client.zadd(key, score, member); }
  async zrem(key: string, member: string): Promise<void> { await this.client.zrem(key, member); }
  async zrange(key: string, start: number, stop: number): Promise<string[]> { return this.client.zrange(key, start, stop); }
  async zrangebyscore(key: string, min: number, max: number): Promise<string[]> { return this.client.zrangebyscore(key, min, max); }

  // ── Pub/Sub ──────────────────────────────────────────────────
  async publish(channel: string, message: string): Promise<void> { await this.publisher.publish(channel, message); }
  async subscribe(channel: string, handler: (message: string) => void): Promise<void> {
    await this.subscriber.subscribe(channel);
    this.subscriber.on('message', (ch, msg) => { if (ch === channel) handler(msg); });
  }
  async unsubscribe(channel: string): Promise<void> { await this.subscriber.unsubscribe(channel); }

  // ── JSON helpers ─────────────────────────────────────────────
  async getJson<T>(key: string): Promise<T | null> {
    const v = await this.client.get(key);
    return v ? JSON.parse(v) : null;
  }
  async setJson(key: string, value: any, ttlSeconds?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttlSeconds);
  }

  // ── Rate limiting helper ─────────────────────────────────────
  async checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<{ allowed: boolean; remaining: number; retryAfterSeconds: number }> {
    const current = await this.incr(`ratelimit:${key}`);
    if (current === 1) await this.expire(`ratelimit:${key}`, windowSeconds);
    const ttl = await this.client.ttl(`ratelimit:${key}`);
    return { allowed: current <= limit, remaining: Math.max(0, limit - current), retryAfterSeconds: Math.max(0, ttl) };
  }

  /** Return raw ioredis client for advanced operations */
  getClient(): Redis { return this.client; }
}
