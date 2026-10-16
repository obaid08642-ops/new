# Scaling runbook (P14.5, P14.28)

The scale-out steps and their trigger metrics come from `docs/perf/SCALE_ARCHITECTURE.md` §6. This file says how to
carry out each one on our compose deployment. **Measure before each step** with `tools/perf/k6/capacity.js` (see
"Capacity runs" below) and write the result to `docs/perf/load-test-<date>.md`.

## Step 1: tuned single server (current)

What is in the repo today:

| Piece | Where | State |
|---|---|---|
| API in `PROCESS_ROLE=api`, background work in the `worker` container | `docker-compose.production.yml`, `backend/src/common/process-role.ts` | P14.26 (PR 1407) |
| Socket.IO Redis adapter (emits reach sockets on every process and node) | `backend/src/config/configured-io.adapter.ts` | P14.13 |
| Public API micro-cache, search and checkout limits | `nginx/snippets/api-microcache.conf`, `nginx/conf.d/nabd.plus.conf` | P14.11 |
| Per-route cache policy (`@PublicCache`), purge by tag | `backend/src/common/public-cache.decorator.ts`, `purge-bus.ts` | P14.7, P14.8 |
| Search engine with Mongo fallback | `meilisearch` service, `backend/src/modules/search` | P14.16 (D-29) |
| Load shedding, kill switches | `backend/src/common/load-shedding.guard.ts`, `killswitches/` | P14.17, P14.18 |
| Compression at nginx, not in Node; page-size ceiling | `HTTP_COMPRESSION=edge`, `list-limit.middleware.ts` | P14.25 (PR 1408) |

Check after every deploy:
- `curl -s https://api.nabd.plus/api/v1/health/readiness`. `details.background_worker` must be `up`. `down` means no
  process runs cron jobs, notification delivery, push or the search sync: start the `worker` service.
- `docker compose ps worker backend`: both healthy.
- `curl -sI https://api.nabd.plus/api/v1/public/products/search?locale=ar | grep -i x-cache-status`: `MISS`, then
  `HIT` on the next call. A request with `Authorization` must show `BYPASS`.

## Step 2: split the stateful services

**When:** CPU > 70% sustained at peak, or the Mongo cache miss rate keeps rising (`db.serverStatus().wiredTiger.cache`).

1. Create a private network between the app server and a new data server (OVH vRack or WireGuard). MongoDB and Redis
   must never get a public port.
2. On the data server, run the `mongodb`, `redis` and `meilisearch` services with the same images and config files
   (`deploy/mongo`, `deploy/redis`). Set `--wiredTigerCacheSizeGB` to 50–60% of that server's RAM.
3. Copy the data:
   - Mongo: `mongodump --archive --gzip` on the old server, then `mongorestore --archive --gzip --drop` on the new one,
     inside a maintenance window. Turn the read-only banner on first (kill switch).
   - Redis: queues only. Drain the BullMQ queues by stopping the `worker` last, then start clean.
   - Meilisearch: no copy. The `worker` rebuilds `search_index` and the engine index on boot.
4. Point `MONGO_URL`, `REDIS_URL` and `MEILI_URL` in `.env.production` at the private addresses. Run
   `docker compose up -d backend worker` and check readiness.
5. **Redis roles (P14.14).** Split into two instances here, not before:
   - the main instance (`REDIS_URL`), `maxmemory-policy noeviction`: BullMQ queues, sessions, locks, idempotency
     records, rate limits, pub/sub. None of these may be evicted;
   - `redis-cache` (`REDIS_CACHE_URL`), `allkeys-lru`: only rebuildable copies (HotCache entries `hc:*` and their
     refresh locks). Losing any of them costs one database read.

   The code is ready (`redis.service.ts` `redisCacheUrlFromEnv`, `hot-cache.service.ts`): set `REDIS_CACHE_URL` in
   `.env.production` and recreate `backend` and `worker`. Empty, the cache shares `REDIS_URL`. Until the split the one
   Redis runs `maxmemory 512mb` with `volatile-lru` (`deploy/redis/redis.conf`): only keys with a TTL (cache entries)
   can be evicted, so queue keys (no TTL) survive memory pressure. Check after the switch: `redis-cli -u $REDIS_CACHE_URL
   --scan --pattern 'hc:*' | head` lists entries, and the main instance holds no new `hc:*` key.
6. Move LiveKit and coturn to their own server (P14.22). TURN listens on TLS 443 there, and `livekit.yaml` points
   `turn.domain` at it.

**Rollback:** point the URLs back at the old services, which are kept stopped but intact for 7 days.

## Step 3: horizontal API

**When:** API p95 > 400 ms at peak after step 2.

1. Add an API node with the same image and `.env.production`, and `PROCESS_ROLE=api` only. There is exactly one
   `worker` across the fleet: cron jobs run once per worker process. More queue consumers come from a second worker
   with `PROCESS_ROLE=worker` **and** `SCHEDULER=off` (not yet implemented: add that flag before running two workers).
2. Put the nodes behind the load balancer (an OVH LB, or nginx `upstream backend_pool` with both node addresses):
   - health check `GET /api/v1/health/liveness`;
   - **sticky sessions are not needed**: sessions are JWTs, Socket.IO state goes through the Redis adapter, and the
     Socket.IO clients use the websocket transport.
3. Run MongoDB as a 3-node replica set and give the app the replica set URL. Reports and analytics read from
   secondaries (`readPreference=secondaryPreferred` on their connections only).
4. The nginx micro-cache is per edge node and is not purged: it keeps a public answer for at most its `s-maxage`
   (300 s). Purge by tag (P14.8) reaches every API process and node through Redis pub/sub.

5. **More than one web (patient-web) instance (P14.10, and since #1603 the default for one).** The image is built with
   `NEXT_CACHE_HANDLER=redis` (Dockerfile default) and every instance gets `NEXT_CACHE_REDIS_URL` (compose: the capped
   `redis-cache` service) and the same `NEXT_REVALIDATE_SECRET`. All instances then share one
   ISR/data cache (`patient-web/cache-handler.cjs`, keys per build id; Next's in-memory copy is off), and a revalidation
   on one instance (the purge bus calls `/api/revalidate` on any of them) is seen by all: the handler keeps the time of
   each tag's revalidation in Redis and answers a miss for an older entry, because Next's own record of revalidated tags
   lives inside each process. Redis down: each instance falls back to a small local cache (pages keep being served).
   Proof: the `next-multi-instance` CI job (two instances behind nginx, one Redis: same revalidated content and same
   Cache-Control on both, Next 16.3.5 from the lockfile). patient-web reaches the cache instance over the `cache` network.

   **Disk safety (#1603, 2026-10-16).** Without a cache handler Next wrote every rendered page under `.next/server` in
   the container's own layer: 5.8 GB in 18 h on the production server, no cap, no eviction, root disk full, API down
   for 7 h. Now: the page/data cache is in `redis-cache` (a separate instance: `allkeys-lru`, `maxmemory` 256 MB, nothing
   saved, no volume, read-only root filesystem), entries are gzip-compressed (about 5x) with a 7-day TTL; patient-web runs
   with a read-only root filesystem and two size-capped tmpfs (`/tmp` 32 MB, `/app/.next/cache` 128 MB); every service
   logs `json-file` 20 MB x 3. Measured and enforced: `docs/perf/ISR_DISK_1603.md`, CI `isr-disk`, `tools/ops/check-compose-limits.py`.

**Rehearsal (P14.28): BLOCKED.** It needs a staging environment with two API nodes, a load balancer and a 3-node
replica set. Staging was turned off on 2026-10-04 because it shared the production server, and the repo has no other
staging host. The owner needs to provide a staging server (or an OVH project) before this can run.

## Step 4: realtime tier

**When:** more than 50–100k concurrent sockets (P14.21 threshold).

- Move sockets to a dedicated Socket.IO cluster (same adapter), or to Centrifugo with the API publishing over its
  HTTP API.
- Clients already reconnect with backoff. On reconnect they must re-fetch the state of the screen they are on: order
  status, chat messages since the last id, booking state. Emits are notifications, never the only copy of the data.

**10k-socket test: BLOCKED** (needs staging, as above).

## Step 5: region resilience

A business or regulatory decision (Phase 19, data residency), so the owner decides. The CDN keeps serving cached
public pages with `stale-if-error` when the origin is down.

## Capacity runs (P14.2, P14.27)

```
k6 run -e BASE=https://<staging> -e SCENARIO=smoke  tools/perf/k6/capacity.js   # sanity
k6 run -e BASE=https://<staging> -e SCENARIO=load   -e PEAK=300 tools/perf/k6/capacity.js
k6 run -e BASE=https://<staging> -e SCENARIO=stress -e PEAK=300 tools/perf/k6/capacity.js   # stops at the ceiling
k6 run -e BASE=https://<staging> -e SCENARIO=spike  -e PEAK=300 tools/perf/k6/capacity.js
k6 run -e BASE=https://<staging> -e SCENARIO=soak   -e PEAK=300 tools/perf/k6/capacity.js
```

- Logged-in traffic: add `-e TOKEN=<test patient token>`.
- Cart writes: add `-e ALLOW_WRITES=1`. The script refuses that against production, and the target must use test-mode
  data and the test gateway.
- Run from several load generators, or allow-list the generators' IPs on staging. One generator is one IP and hits
  the per-IP limits. The script reports those 429s as `rate_limited`, separately from errors.

**Measured ceilings: BLOCKED.** No staging environment (as above). Running `stress` against production is not allowed.
The script is checked against a local build (smoke, test data): `public_api p95 = 22 ms`, `scenario_errors 0%`.

## Edge (Cloudflare): P14.1, P14.6, P14.9, P14.19

The rules to apply are in `deploy/cloudflare/rules.md`. **Applying them is BLOCKED:** this repo and its CI have no
Cloudflare API token, and the owner's Cloudflare connector is not authorized in this session. The owner applies them
in the dashboard, or adds a scoped API token as a CI secret.

## Decisions taken (2026-10-14, on the owner's delegation)

| Item | Decision | Why |
|---|---|---|
| 14.12 Fastify | Stays opt-in (`USE_FASTIFY=true`); Express stays the default | No measured RPS gain yet, and the live gate, click tests and contract tests run on Express. Switch only after a k6 run on staging shows the gain with the whole gate green under Fastify. |
| 14.14 Redis roles | The main instance (`volatile-lru`, 512 MB: queues, sessions, rate limits) and, since #1603, a separate cache instance `redis-cache` (`allkeys-lru`, 256 MB, no persistence). patient-web's ISR cache uses it now; the backend's HotCache keeps sharing the main instance until `REDIS_CACHE_URL` is set to it (one line in `.env.production`) | The page cache must never be able to fill the disk or evict queue keys; a different instance is the only way to give it a different eviction policy. Queue keys carry no TTL, so `volatile-lru` never evicts them either. |
| 14.19 Waiting room | No waiting room until a campaign needs one; when it does, a Cloudflare Worker queue in front of checkout only | Business plan Waiting Room is a paid plan decision for the owner. Load shedding (14.17) already protects checkout. |
| 14.22 Calls | LiveKit and coturn move to their own server in step 2; LiveKit Cloud as overflow is an owner decision | They compete for CPU and UDP ports with the API on one box. |
