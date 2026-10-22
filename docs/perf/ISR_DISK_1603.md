# The page cache could fill the disk (#1603)

**Outage 2026-10-16, 07:00–14:47 UTC.** The root disk (38 GB) filled; Redis refused writes ("No space left on device"),
MongoDB crashed, every API route answered 500 and then 502. Cause, measured on the server (`docker ps -s`, `du` in the
container): `nabdah-patient-web` had written **5.81 GB into its own writable layer, 5.59 GB of it under
`/app/.next/server`**: Next.js's ISR/data cache. Every product page rendered on demand (about 21,000 products × locales)
is a file, with no size cap and no eviction, on the root disk, and it is lost on every deploy anyway.

## What changed
| | Before | Now |
|---|---|---|
| Page/data cache of patient-web | files under `.next/server` in the container layer, unbounded | Redis, a **separate instance** `redis-cache`: `allkeys-lru`, `maxmemory 256mb`, nothing saved, no volume, read-only root. Entries gzip-compressed (about 5x), TTL 7 days |
| patient-web filesystem | writable | read-only root; `/tmp` 32 MB and `/app/.next/cache` (image optimizer) 128 MB, both memory-backed `tmpfs` with a hard size |
| Container logs | json-file, 5 × 50 MB per container | json-file, **3 × 20 MB** on every service (pinned by `tools/ops/check-compose-limits.py`) |
| Image build | no cache handler | `Dockerfile.patient-web` builds with `NEXT_CACHE_HANDLER=redis` by default |
| Redis down | n/a | the handler falls back to a small in-process cache (500 entries): pages keep being served, never an error |

Why a separate instance and not "another DB of the same Redis": the eviction policy is per instance. The main Redis keeps
the BullMQ queues, sessions, locks and rate limits and must never evict; the cache must always evict. A different
instance is the only way to give them different policies, so a full cache can never touch the app's data.

## Measured (test data, local: `tools/perf/isr-disk/run-standalone.sh`, 5,000 distinct product pages, stand-in API with ~5 KB of text per product)
| | Disk written by the web app | Where the cache is |
|---|---|---|
| **Before** (no cache handler, what production ran) | **+1,310 MB** (`.next/server` 1,419 MB) for 5,000 pages, i.e. about 262 KB per page | files |
| **After** (this PR) | **+0.0 MB**; all 5,000 requests answered 200 | Redis 256 MB cap reached, 3,650 entries evicted, 6,353 keys kept |

The same for **1,000 pages** (the review session's check): before **+262 MB** (`.next/server` 420 MB after), after **+0.0 MB**
with 2,003 entries (81.5 MB) in Redis.

Does #1560 alone remove the cache from the container layer? **No.** #1560 (P14.10) added the Redis handler but made it opt-in
at build time (`NEXT_CACHE_HANDLER=redis`), and the production image was never built with it, so production kept writing
files. This PR makes it the default build, gives it a capped Redis to write to, and makes the filesystem read-only so a
regression cannot silently write to the layer again. (The handler also fails OPEN: with Redis unreachable it serves from a
small in-process cache and writes nothing to disk, so "0 MB written" is only meaningful together with the Redis key count,
which `run-standalone.sh` now asserts.)

1,310 MB for 5,000 pages matches production (5.59 GB for the pages rendered in 18 h).

**Bytes per cached page** (measured): an entry is HTML 119 KB + RSC payload 84 KB + segment data 91 KB (the last two base64
inside the JSON) = 294 KB of JSON, **67 KB gzip-compressed, 82 KB of Redis memory**. Real catalogue text is less repetitive
than the stand-in's, so budget about 100 KB per page. At 256 MB the cache holds the hottest ~2,500–3,000 pages; the
catalogue is 21,000 products × 2 indexed locales, so most long-tail pages are rendered on demand and served by the
Cloudflare edge cache in front (P14.9) rather than kept here. **Set the cap from the server, not from this table**:
`redis-cli -a … info memory` and `info stats` (`evicted_keys`) on `nabdah-redis-cache` show the real size per page and the
hit rate after a day; raise `REDIS_CACHE_MAXMEMORY` only if there is RAM (the server has 3.8 GB shared with MongoDB,
the backend and Meilisearch; the cache container is limited to 384 MB).

## Proof in CI (`isr-disk`, run 38933703451, test data)
`tools/perf/isr-disk/run-docker.sh` brings up the real compose services `patient-web` and `redis-cache` (their real limits)
from the production Dockerfile and renders 5,000 product pages from the stand-in API. Result: all 5,000 answered 200;
**patient-web writable layer 0.0 MB** (before: 0.0 MB); `docker diff` shows only an empty `/app/.next/cache`; nothing under
`/app/.next/server`; root filesystem read-only; **redis-cache used 256.0 MB of its 256 MB cap, 6,375 keys, 3,628 evicted**
(`allkeys-lru`), 0.0 MB written to its layer; 42 KB per key on average.

## What else writes (coturn 935 MB)
CI `coturn-writes` (coturn 4.6.2, the production `turnserver.conf`, 4,000 allocation messages) shows the answer:
- `docker diff` lists `/var/tmp/turn_1_<date>.log` and `/var/tmp/turnserver.pid`: **coturn writes a daily log file into its
  container layer** although the config logs to stdout. That file has no rotation and no cap, so under real TURN traffic
  (verbose logging, one line per allocation/refresh) it grows without limit: the 935 MB seen in production.
  (In the short test it was small; the json log was 454 KB.)
- **Hardened run** (`read_only: true`, `tmpfs /var/tmp` 16 MB): coturn starts, answers STUN, the layer stays at **0 bytes**,
  and the log lives in memory under a hard cap.
So the fix is the hardening in the same run: `read_only` + tmpfs for coturn (next commit in this PR). Task 69 on the server
confirms the real file name and size before the change is deployed.

Other writers checked: the nginx cache is a volume capped by `proxy_cache_path ... max_size=1g`; Mongo, Redis and
Meilisearch write to their volumes (not the layer); backend and worker log to stdout.

## Not in this PR
- The deploy task must start `redis-cache` before `patient-web` (`tools/ops/tasks/60-deploy-main.sh` brings up named
  services only); sent separately on the ops branch because it lives on `review/server-inspect`.
- The disk alert (#1446): its own PR, with the findings of task 69.
