import { Injectable } from '@nestjs/common';
import type { ThrottlerStorage } from '@nestjs/throttler';
import { RedisService } from './redis.service';

/**
 * D-28/S-6: one throttle counter shared by every API instance.
 *
 * Nest's built-in throttle storage is per process. Two instances therefore see
 * half of the traffic each, so a limit that must hold across instances cannot
 * be enforced with it. This storage keeps the same fixed-window counter in
 * Redis and updates it atomically with Lua.
 *
 * Redis is a throttle dependency, not an availability dependency: if Redis is
 * unreachable, the guard fails open and every request is allowed. A rate-limit
 * outage must not become an API outage.
 */
const THROTTLE_SCRIPT = `
local count_key = KEYS[1]
local block_key = KEYS[2]
local window_ms = tonumber(ARGV[1])
local request_limit = tonumber(ARGV[2])
local block_ms = tonumber(ARGV[3])
local now = redis.call('TIME')
now = now[1] * 1000 + math.floor(now[2] / 1000)

local blocked_until = tonumber(redis.call('GET', block_key) or '0')
if blocked_until > now then
  return {
    tonumber(redis.call('GET', count_key) or '0'),
    redis.call('PTTL', count_key),
    1,
    blocked_until - now
  }
end
if blocked_until > 0 then
  redis.call('DEL', count_key, block_key)
end

local hits = redis.call('INCR', count_key)
if hits == 1 then
  redis.call('PEXPIRE', count_key, window_ms)
end
if hits > request_limit then
  local expires_at = now + block_ms
  redis.call('SET', block_key, expires_at, 'PX', block_ms)
  return { hits, redis.call('PTTL', count_key), 1, block_ms }
end
return { hits, redis.call('PTTL', count_key), 0, 0 }
`;

@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage {
  constructor(private readonly redis: RedisService) {}

  private allow(): { totalHits: number; timeToExpire: number; isBlocked: boolean; timeToBlockExpire: number } {
    return { totalHits: 0, timeToExpire: 0, isBlocked: false, timeToBlockExpire: 0 };
  }

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<{ totalHits: number; timeToExpire: number; isBlocked: boolean; timeToBlockExpire: number }> {
    const client = this.redis.getClient();
    if (!client || client.status === 'fallback' || typeof client.eval !== 'function') {
      return this.allow();
    }

    try {
      const countKey = `throttle:${throttlerName}:${key}`;
      const blockKey = `${countKey}:blocked_until`;
      const [hits, ttlMs, blocked, blockMs] = (await client.eval(
        THROTTLE_SCRIPT,
        2,
        countKey,
        blockKey,
        String(ttl),
        String(limit),
        String(blockDuration),
      )) as [number, number, number, number];

      return {
        totalHits: Number(hits) || 0,
        timeToExpire: Math.max(0, Math.ceil((Number(ttlMs) || 0) / 1000)),
        isBlocked: Number(blocked) === 1,
        timeToBlockExpire: Math.max(0, Math.ceil((Number(blockMs) || 0) / 1000)),
      };
    } catch {
      return this.allow();
    }
  }
}
