# R4 - Stateless API and horizontal scale readiness (2026-11-02)

## 1. Audit: per-process state that breaks with 2+ API nodes

Socket.IO is already safe: `ConfiguredIoAdapter` uses `@socket.io/redis-adapter`, and the patient app connects with `transports: ['websocket']` only, so no sticky sessions are needed. Rate limits are in Redis (`RedisThrottlerStorage`); the `LocalRateLimiter` Map in `api-security` is the fallback when Redis is down. No node-local upload state was found by grep (no `diskStorage`/`memoryStorage`).

| in-memory state | file | verdict |
|---|---|---|
| doctor waiting-room queue `doctorQueues` | realtime/realtime.gateway.ts | **Broke with 2 nodes** (each node saw only its own sockets: wrong position, wrong "ready"). **Fixed here**: one Redis sorted set per doctor (`WaitingRoomQueue`). |
| `connectedUsers`, `userSockets`, `activeUsers`, `restrictedThreads` (socket-id maps) | realtime.gateway, chat.gateway | OK: bookkeeping of sockets held by this node; cross-node delivery goes through the adapter rooms. Nothing found that asks "is user X online" across nodes. |
| notifications SSE `subjects` | notifications/sse.controller.ts | **Latent**: `emit()` has no caller (nothing injects the controller), so the stream pushes nothing today. With 2 nodes, or notifications created in the worker, it would miss too; needs Redis pub/sub when someone wires it. Not changed here. |
| `writeBehindLocks` | unified-bookings.module.ts:532 | **Latent**: per-process "mirror" lock for `reserveWithWriteBehind`; two nodes could both grant a slot. The canonical lock is Redis in unified-bookings.service (`acquireBookingLock`); replace the mirror by it (module owner). Not changed here. |
| TTL caches and in-flight de-duplication (`ai-gateway mem`, `sitemapCache`, `publicCountCache`, `availability-order`, `cloudflare-turn cache`, `provider-agreement cache`, `password-security shards`, `risk recent`, `hot-cache inflight`, `single-flight`, `treeRefresh`) | various | OK: per node; at worst stale for one TTL on one node. |
| `metrics.service`, `circuit-breaker`, `slo-alerts states`, mail provider `states` | common, observability, mail | OK / by design: per-node health and metrics. `slo-alerts` state is per node, so with 2 API nodes an alert could fire twice if it ran in the API; it runs in the worker today. |
| 34 cron/interval jobs | many | single worker; leases in R3 (#2411). |
| first delivery of durable events | durable-events | runs in the writing process, redelivery in the worker (R2, #2410). |

## 2. Two API replicas: config
- `deploy/docker-compose.scale-api.yml`: `backend-2` `extends` the `backend` service (same image, env, healthcheck, `PROCESS_ROLE=api`, limits) with its own container name and the DNS alias `backend` on `internal` and `web`. Checked with `docker compose config`.
- `deploy/nginx/nginx.conf`: `server backend:8002 resolve max_fails=2 fail_timeout=5s;`. With `resolve`, Docker DNS returns both addresses and nginx round-robins over them and skips a replica that fails twice for 5 s. Health checking is passive (nginx open source); the container healthcheck plus `restart: unless-stopped` take care of the replica itself. nginx retries only idempotent requests on another replica (no `non_idempotent`), so a POST is never sent twice.
- `CLUSTER_WORKERS` (several Node processes in one container) stays off (`main.ts`): on this host a second container costs the same RAM and isolates better.
- Run: `docker compose -f docker-compose.production.yml -f docker-compose.scale-api.yml up -d backend-2`.
- **RAM**: `backend-2` adds 576m limit / 400m reservation. Not possible in the 3.8 GB plan (steady reservations are already 2560 of the 3772 MB budget). It needs the upgrade; once R1 (#2408) is merged, size it with `tools/ops/mem_budget.py`, which does not yet count a second API replica in its steady sum.
- Set `CRON_LEASE_FAIL_CLOSED=1` in the worker when both exist (R3).

## 3. Zero-downtime rolling deploy
Already in the repo: `deploy/scripts/rolling-deploy.sh` (new container without the alias, health + smoke, move the alias, drain the old one), proved under load by `.github/workflows/zero-downtime.yml`. With two replicas run it for `backend`, then for `backend-2`, so one replica always serves. `stop_grace_period: 40s` and `SHUTDOWN_DRAIN_MS` drain connections; websocket clients reconnect by themselves. Not run here (no staging stack until R6).

## 4. Expand / contract rule (rolling deploys run old and new code side by side)
1. **Expand**: a release that only ADDS (optional field, new collection, background index, an enum value read tolerantly). Old code must keep working on the new data and new code on old data (a missing new field has a default).
2. **Migrate**: backfill in the worker as an idempotent, resumable job (batches, own lease). Never at application start-up, never as one long `updateMany` on a hot collection.
3. **Switch**: a later release writes and reads only the new shape.
4. **Contract**: only when every replica and the worker run the switch release and the backfill is verified, a further release removes the old field or code. Never rename or delete a field, or tighten a validator or unique index, in the same release that stops using it.
5. Events and queue payloads follow the same rule: a consumer accepts the old and the new payload for one release (durable events survive a deploy, R2).
6. Every release must be rollbackable one step: if release N cannot run on data written by N+1, N+1 may not write it yet.

## 5. Tests
`waiting-room-queue.spec.ts` (two nodes on one real redis-server: one order, re-join keeps its place, removal seen from the other node, separate doctors, TTL), the updated `realtime.gateway.authorization.spec.ts`, and `tools/ops/tests/test_scale_api_overlay.py` (overlay structure, alias on every network, no published ports, role inherited, nginx upstream directives).
