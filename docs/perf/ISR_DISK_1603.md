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

## Proof in CI (`isr-disk`)
`tools/perf/isr-disk/run-docker.sh` brings up the real compose services `patient-web` and `redis-cache` (their real
limits) from the production Dockerfile, renders 5,000 product pages from the stand-in API and asserts: every page answers
200; the patient-web **writable layer < 100 MB**; nothing under `/app/.next/server`; the root filesystem is read-only;
cache memory ≤ its cap; `redis-cache` wrote < 16 MB to its layer. Results of the first run are in the PR.

## What else writes (coturn 935 MB)
The issue measured 935 MB for `nabdah-coturn`. `deploy/coturn/turnserver.conf` logs to stdout (`log-file=stdout`, `verbose`),
which Docker keeps in the container's json log, not in the layer; so either the 935 MB is that log (a container created
before the compose `logging:` section existed has no rotation at all) or a path coturn writes. Two things settle it:
- CI `coturn-writes` runs coturn 4.6.2 with the production config under allocation load and prints its layer and `docker diff`;
- ops task `69-inspect-alert-and-logs` (read-only, branch `review/ops-1603`) prints, on the server, each container's layer,
  log driver, log caps and log file size, and coturn's `docker diff`.
The compose `logging:` cap now applies when the deploy recreates the container.

Other writers checked: the nginx cache is a volume capped by `proxy_cache_path … max_size=1g`; Mongo, Redis and
Meilisearch write to their volumes (not the layer); backend and worker log to stdout.

## Not in this PR
- The deploy task must start `redis-cache` before `patient-web` (`tools/ops/tasks/60-deploy-main.sh` brings up named
  services only); sent separately on the ops branch because it lives on `review/server-inspect`.
- The disk alert (#1446): its own PR, with the findings of task 69.
