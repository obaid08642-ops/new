# Cluster mode: why it is off, what turns it on, and the plan

**Status: OFF, and this document does not turn it on.** Production runs the API as one Node process (`CLUSTER_MODE=false` in
`deploy/docker-compose.production.yml`). The owner decides when to turn it on, together with the RAM upgrade.

## 1. Why we want it
The k6 ladder on a GitHub runner held every target up to 80 virtual users (280 requests per second, 0% errors up to 200 VUs). The
ceiling is the single backend process: one Node event loop, CPU about 124% of one core. More cores do nothing for a single process;
a second API worker roughly doubles the CPU the API can use (`docs/perf/load-test-2026-10-16.md` made the same finding).

## 2. What crashed before
The incident of 2026-10-04 (`docs/review/INCIDENT_2026-10-04_API_OUTAGE.md`): the backend that had been running was built from an
older image that did `cluster.on(...)` on a wrongly imported module and failed at boot with `TypeError: cluster.on is not a function`,
and then with `MongoMissingDependencyError: @mongodb-js/zstd`. The cause was a broken `cluster` import in that build (fixed on main by
`require('node:cluster')`, commit `7d8d0bf01`), not the idea of clustering. Turning the cluster off (`CLUSTER_MODE=false`) was the quick way out.

Two facts follow, and the plan below is built on them:
- **The current `main` has never run in cluster mode in production.** It must be rehearsed first (section 6).
- **The old default was dangerous:** cluster on whenever `CLUSTER_MODE` was not `false`, with one fork per CPU core, on a host that
  also runs MongoDB, Redis and Meilisearch in about 1.1 GB of free RAM. That default is gone (section 5).

## 3. RAM each worker needs
**It is not measured in this repository.** The planning default in code is 700 MB per API worker plus 1536 MB kept free for MongoDB,
Redis, Meilisearch and the OS (`CLUSTER_WORKER_RAM_MB`, `CLUSTER_RESERVED_RAM_MB`). Treat 700 as a guess to be replaced:
1. On the rehearsal host start with `CLUSTER_WORKERS=2` and let the capacity workflow run for 30 minutes.
2. Read each worker's resident memory (`docker stats`, or `ps -o rss`) at idle and under the 80-VU step.
3. Set `CLUSTER_WORKER_RAM_MB` to the highest RSS seen plus 20%.

With today's ~1.1 GB free the guard allows **one** process (no cluster). With the RAM upgrade the rule is **2 workers when at least 4 GB
is free**; the guard computes `floor((free MB − 1536) / CLUSTER_WORKER_RAM_MB)` and cuts the request down to that.

## 4. What must be cluster-safe
Every worker is a separate process with its own memory. Already done in the code:
- **Sockets across workers:** the Redis adapter is attached whenever Redis is configured (`config/configured-io.adapter.ts`, P14.13), so an emit on one worker reaches a socket on another.
- **Cron jobs and queue consumers run once:** `PROCESS_ROLE=api` processes run none; the `worker` container runs them (`common/process-role.ts`, P14.26). Cluster workers are forked **only** when the role is `api` (section 5).
- **Queue alerts are judged once per API cluster** (`8e33a23fb`).

Still process-local state listed in `docs/perf/SCALE_ARCHITECTURE.md` (X11): presence, doctor queues, SSE subjects, step-up tokens
and write-behind locks. **This change does not touch them.** Each must be checked in the staging rehearsal with two workers (the
checks in section 6), and any that is not shared through Redis must be moved before the cluster is turned on in production.

### Sticky sessions for the socket gateway
Node's cluster module gives each new TCP connection to one worker; a WebSocket is one connection, so it stays on its worker. The
gateway also allowed the **polling** transport, whose handshake is several HTTP requests that could reach different workers
(`Session ID unknown`). So the code now serves **websocket only once two or more workers run** (`realtimeTransports()`); the clients are
websocket-only already. If polling must ever come back, workers have to listen on their own ports and Nginx has to pin a client with
`hash $remote_addr consistent` (or `ip_hash`) in the upstream, since Nginx cannot see which cluster worker a connection reached.

## 5. What the code does now (`common/cluster-config.ts`, `main.ts`)
- `CLUSTER_WORKERS` is the only switch and **defaults to 1** (one process). Unset, invalid or below 1 → 1; `CLUSTER_MODE=false` forces 1; the count is capped by the CPU count and by 8.
- Workers fork only in production, on the primary, and only with `PROCESS_ROLE=api`. With any other role the count is cut to 1 and `cluster_adjusted` is logged (otherwise each worker would run every cron job).
- The RAM guard cuts the count to what fits in free RAM; below 2 it runs one process and says why in `cluster_adjusted`.
- A worker that exits is re-forked after 0.5 s doubling to 30 s with the number of exits in the last minute, so a boot failure cannot spin the host.
- `CLUSTER_EFFECTIVE_WORKERS` (set by the primary) tells the workers how many there really are (used for the socket transports).
Tests: `common/cluster-config.spec.ts` (22 cases across the above).

## 6. The safe plan (the owner decides each step)
1. **RAM first.** Do nothing until at least 4 GB is free on the host with MongoDB, Redis, Meilisearch and the backend running.
2. **Roles.** The backend service gets `PROCESS_ROLE=api` and the compose `worker` container (role `worker`) is running, so cron jobs and queues stay single.
3. **Rehearse on staging** with `CLUSTER_WORKERS=2`: check the logs show `cluster_starting` with 2 workers and two `cluster_worker_online`; run the capacity workflow and compare with the single-process run; connect two sockets and confirm an event emitted from one is received by the other; check presence, a doctor queue, an SSE subject, a step-up token and a write-behind lock behave the same from both workers; kill one worker and confirm it comes back and requests keep being served.
4. **Measure RSS** (section 3) and set `CLUSTER_WORKER_RAM_MB`.
5. **Production:** put `CLUSTER_WORKERS=2` in `.env.production` and recreate the backend (`tools/ops`, with the Nginx reload after a recreate). Watch `cluster_*` events and the 5xx rate for 30 minutes.
6. **Rollback:** remove `CLUSTER_WORKERS` (or set it to 1) and recreate the backend. No data changes are involved.
