# Safe deployments (20.9)

Three rules: a deploy never takes the site down, a bad release rolls itself back, and the database change is never in the same step as the code that needs it.

## 1. Rolling deploy, zero downtime — `deploy/scripts/rolling-deploy.sh`

`rolling-deploy.sh backend patient-web admin-web worker` (compose files already pointing at the new images; the release overlay is picked up automatically).

For each web-facing service, one at a time:

1. **B** = a second container of the NEW image, same networks, **no DNS alias** (it gets no traffic while it boots). The old container **A** keeps serving.
2. Wait for B's healthcheck and a smoke request inside B. **If B is not healthy: B is removed, A was never touched, exit 1.** This is the automatic rollback: the old version never stopped, and the bad one never took a request.
3. Give B the service alias, wait 13 s (nginx re-resolves Docker DNS every ≤10 s: `deploy/nginx/nginx.conf`, upstream `resolve`), then retire **A**: `docker stop -t 40` (SIGTERM; the backend keeps serving 6 s with `Connection: close` first, see below) and remove it.
4. **C** = the compose-managed `nabdah-<service>` on the new image beside B; healthy and smoked; wait 13 s; retire B. If C fails, B keeps serving the new version (exit 2, nothing is down).
5. `worker` has no inbound traffic: stop (up to 60 s for running jobs), start the new one.

Guards: it refuses to start if less than 600 MB RAM is free (two containers of a service run together briefly) or A is not healthy. It stops at the first failed service and does not touch the ones after it.

### Why `Connection: close` while draining
nginx keeps idle keepalive connections to the API. If the old container closes while nginx sends a request on such a connection, that request fails with 502 and a POST is not retried. So after SIGTERM the backend (`backend/src/common/graceful-drain.ts`, `SHUTDOWN_DRAIN_MS`, default 6000 in compose) keeps serving and answers every request with `Connection: close`; nginx stops reusing those connections; when the listener finally closes there is nothing left to race with. The web apps' upstreams have no keepalive, so they need no drain.

### Proof under load
`.github/workflows/zero-downtime.yml` → `tools/ops/zero-downtime/run.sh`: real nginx 1.28 with the same upstream pattern, real `docker compose`, the real script, a stand-in API with the same shutdown behaviour, **k6 at 60 req/s (30 % POST) for 100 s while v1 → v2 is rolled**: `http_req_failed == 0`, every check passes, both versions served traffic, afterwards only v2 answers. Then a release whose healthcheck fails (v3) is rolled under load: the script exits non-zero with "ROLLED BACK", **still 0 failed requests**, v2 keeps serving, v3 never served one.

What it does not cover (honest limits): Socket.IO connections of the retired API container drop and clients reconnect (HTTP requests are what is guaranteed); a release that is healthy but wrong is not detected by a healthcheck, which is what the feature flags below are for; the stand-in is not the real backend, whose drain behaviour is unit-tested (`graceful-drain.spec.ts`).

### Using it for a release
The deploy task (`tools/ops/tasks/60-deploy-main.sh`, server-ops) keeps its backup, preflight and image-load steps and calls `rolling-deploy.sh` in place of `up -d --force-recreate` for the app services. That change is an ops task and needs the reviewer and the owner's Approve; this PR only ships and proves the script.

## 2. Database migrations: expand, then contract

The old and the new code run side by side for a minute (and a rollback runs the old code on the new database), so a migration may never break the old code.

| Step | What it may do | Release |
|---|---|---|
| **Expand** | add a collection / field / index, copy, backfill. Old and new code both work. Dry run by default, `--apply` to change data, idempotent. | N |
| **Code switches** to the new shape; the old shape is still written or still readable. | | N or N+1 |
| **Contract** | drop / rename / `$unset` / delete what nothing reads any more. Header: `// contract-of: <the expand migration>`. | at least one release after the code stopped using it |

`tools/ci/migration-safety.py` enforces it on every PR touching `backend/scripts/migrations/`: a change without `--apply`, or a destructive operation (`dropCollection`, `.drop()`, `$rename`, `$unset`, `deleteMany`, `deleteOne`, `dropIndex`, `renameCollection`, `dropDatabase`) without `contract-of` naming an earlier migration, fails. The 14 files that predate the rule are in `tools/ci/migration-safety.baseline`, which only shrinks.

## 3. Feature flags for risky changes

Already built (`backend/src/modules/feature-flags`, admin governance page): `FeatureFlagsService.isEnabled(key)` returns `true`, `false` or `null` (never seeded). For a risky change: ship the code **dark** (`if ((await flags.isEnabled('my_feature')) === true)`), deploy, turn the flag on for the admin first, then everyone, and remove the flag and the old path in a later release. A flag is also the kill switch after the deploy: switching it off needs no deploy and no rollback. Kill-switch keys are seeded enabled; new feature flags are created disabled by the first `setFlag`.
