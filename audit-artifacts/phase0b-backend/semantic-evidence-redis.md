# Phase 0B semantic evidence — Redis Service

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Members read in full:**
- `src/modules/redis/redis.service.ts:2–376`
- `src/modules/redis/redis.module.ts:2–9` (manifest target; wiring inspected from extracted module)

`redisUrlFromEnv` prefers `REDIS_URL`, otherwise constructs a URL from host/port/password with localhost defaults (`redis.service.ts:4–11`). `RedisService` creates separate client/subscriber/publisher connections with retry strategy, three retries per request, offline queue disabled, and lazyConnect false (`25–63`). It marks a single shared `ready` flag from all three connections and falls back to per-process in-memory maps when unavailable; the fallback is explicitly non-shared (`15–23,34–39,53–76`). Destruction quits all clients (`66–71`).

The service implements KV, hashes, sets, sorted sets, JSON helpers and a rate-limit helper (`105–313`). Redis command failures silently fall through to in-memory behavior. The fallback primitives do not provide Redis-equivalent atomicity: `setnx`, `incr`, set/zset updates and expirations are process-local read/modify/write operations (`139–159,181–209,218–277`). `keys` uses a Redis `KEYS` call when connected and only scans `memKv` in fallback (`161–167`). Pub/sub is silently dropped when Redis is unavailable; subscribe simply returns (`279–296`). JSON parsing errors from `getJson` propagate (`298–305`).

`getClient` exposes a raw client/shim for advanced call-sites, returns `PONG` from fallback `ping`, and implements a partial command surface including EX/NX set parsing, list/set helpers and comments about prior outage crashes (`315–374`). The shim stores some sets/lists as JSON in `memKv`, separate from native `memSets`, so fallback semantics differ by call path. `checkRateLimit` uses `incr` then `expire` without a transaction/script and therefore can be inconsistent under races/failover (`308–313`).

No product code was changed and no tests/builds were executed during this semantic read.

## Findings candidates

The read supports: fail-open/fail-silent fallback for stateful/security primitives, split-brain behavior across replicas, non-atomic rate limiting/locks, dropped pub/sub events, partial raw-client contract, blocking KEYS, unhandled JSON corruption, and shared readiness ambiguity.
