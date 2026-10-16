# Two Redis roles and the hot-key cache rules (P14.14)

## Roles
| Role | Env | Policy | Holds |
|---|---|---|---|
| main | `REDIS_URL` | `noeviction` (today one Redis with `volatile-lru`: only keys with a TTL can go) | BullMQ queues, sessions, locks, idempotency records, rate limits, pub/sub |
| cache | `REDIS_CACHE_URL` (empty: shares `REDIS_URL`) | `allkeys-lru` | rebuildable copies only: HotCache entries `hc:*` and their refresh locks |

Switching to two instances is scale step 2 (`deploy/SCALING.md`); the code needs no change, only the env value.

## Cache rules (`backend/src/modules/redis/hot-cache.service.ts`)
- **TTL with jitter:** ±10% on each write, so keys written together do not expire together.
- **Single flight:** callers in one process share one refresh promise; processes share a short lock in the cache
  instance (`SET NX PX`). The others wait up to 3 s for the new value (or serve the stale one), then read themselves if
  the lock holder died.
- **Stale-while-revalidate:** after the TTL the old value is served at once for `swr` more seconds while one caller
  refreshes it.
- **Hot data:** home sections (`GET /content/home`, 60 s + 10 min stale, dropped when an admin saves the home
  curation), catalogue categories (`GET /medicines/categories`, 1 h + 1 h), the ranking strip (`GET /medicines/hot`,
  3 min + 10 min).

## Verify: a cold-cache spike of 500 RPS on one key
Local stack, test data, two backend processes sharing one Redis, k6 `constant-arrival-rate` 500 requests/s for 10 s
(5,001 requests) alternating between the two processes, cache emptied first, every Mongo operation recorded
(profiler level 2):

| Endpoint | main (before) | P14.14 (3 runs) |
|---|---|---|
| `GET /content/home` | 937 reads of `home_curation` | 1, 1, 1 |
| `GET /medicines/categories` | 9 aggregations of `medicines` | 0, 1, 1 |

0 failed requests in every run. The first categories run recorded no aggregation at all although every request was
answered; I did not find why. The other two runs recorded exactly 1.

Tests: `hot-cache-p1414.spec.ts`: 500 concurrent cold requests over four processes sharing Redis cost one read; a stale
value is served at once to 100 callers while one refresh runs; the TTL carries jitter and the entry outlives its
freshness by the stale window; a lock holder that died does not block readers.
