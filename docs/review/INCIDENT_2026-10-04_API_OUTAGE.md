# Incident 2026-10-04: api.nabd.plus returned 502 for about one hour

**Impact.** `api.nabd.plus` answered 502 from about 17:23 to 18:28 UTC. The mobile apps and anything else that calls the API were down. `nabd.plus` (website), `admin.nabd.plus` and `live.nabd.plus` stayed up. No data was lost or changed.

**Cause: owned by the lead reviewer.** It started during a production change (rotation of the leaked LiveKit key, Q53) run through the `server-ops` workflow. That change recreated the backend container, which exposed three hidden problems. Two script mistakes then made the outage longer.

## Timeline (UTC)

| Time | Event |
|---|---|
| 17:12 | X0 hotfix applied: `proxy_cache api_cache` → `off` in `nabd.plus.conf`. Nginx config test OK, reloaded, cache emptied, Cloudflare purge of `api.nabd.plus` OK. Service unaffected. |
| 17:19 | Cleanup: `staging.conf` disabled, the unhealthy `nabdah-staging-backend` container stopped, dangling images pruned, three August snapshot backups deleted. |
| 17:20 | LiveKit rotation started. A check failed (cause not captured: the workflow stopped before saving the report). The automatic rollback restored the old key and recreated the backend from the `nabdah-prod-backend:latest` tag. |
| 17:23 | API 502. |
| 17:35 | Backend back on the production image (`ad589b9f26e6`), but crash-looping: `TypeError: cluster.on is not a function`. |
| 17:41 | `CLUSTER_MODE=false` added to `.env.production`. Next boot error: `MongoMissingDependencyError: @mongodb-js/zstd`. |
| 18:13 | Nginx reload found to be failing: `nginx.conf` itself defines `upstream staging_pool { server nabdah-staging-backend:8003; }`. With that container stopped, every reload failed, so Nginx kept the old backend IP. |
| 18:18 | A repair script with a broken `sed` delimiter wrote an **empty** `nginx.conf`. Nginx kept serving from memory; a restart would have taken every site down. |
| 18:25 | `nginx.conf` restored from the backup taken seconds before, and the staging upstream set to `server 127.0.0.1:9 down;`. Nginx config test OK, reloaded. `mongod.conf` set to `net.compression.compressors: zlib`, Mongo restarted (healthy), backend healthy. |
| 18:28 | API 200. Readiness, medicines, website, admin and LiveKit all verified from outside. |

## Root causes

1. **Configuration lived only inside a running container.** The backend that ran for two weeks had been created on 2026-09-16. `.env.production` was edited on 2026-09-30 and no longer described a bootable backend:
   - cluster mode was not set to off;
   - the build hard-codes Mongo `compressors: ['zstd','snappy','zlib']` without shipping the zstd module. That build has `cluster.on` and zstd problems that `main` does not.
2. **Staging was wired into production:**
   - its backend ran on the production server;
   - it was created with the same compose project and service name, so a backend recreate also removed it;
   - its upstream was in the main `nginx.conf`.
3. **The ops scripts had defects:**
   - the rollback used a moving image tag;
   - success was assumed after `nginx -s reload` without checking its exit status;
   - one `sed` replacement wrote an empty file;
   - the workflow ran with `bash -e`, so a failed task discarded the encrypted report.

## Fixed

- **On the server:**
  - `CLUSTER_MODE=false` and Mongo zlib compression are now written down, so a backend recreate boots;
  - the staging upstream is marked down, so Nginx reloads work;
  - every edited file has a timestamped copy in `/opt/nabdah/backups`.
- **In the repo (this PR):** the same changes in `deploy/`, so the repo matches the server:
  - `deploy/mongo/mongod.conf`;
  - `deploy/nginx/nginx.conf`;
  - `deploy/nginx/conf.d/nabd.plus.conf` (X0);
  - `deploy/docker-compose.production.yml` (`CLUSTER_MODE`);
  - `deploy/livekit/livekit.yaml` (the leaked key line removed).
- **In `tools/ops`:**
  - a failed task no longer loses the report;
  - Nginx is reloaded after any backend recreate;
  - the rollback pins the exact image ID;
  - file rewrites check their output before writing.

## Rules from now on

1. **Every production script is rehearsed first** on a copy of the server layout in CI (`ops-rehearsal`), including its rollback path. Only then is the owner asked to approve the production run.
2. **Check every step's result,** for example `nginx -t` plus the reload exit code, container health and an external HTTP check. Never assume a step worked.
3. **One change per production run,** with an external check right after it.
4. **No change to the production server's process or network setup** (stopping containers, removing upstreams) without first listing everything that refers to it (`grep -r` over `deploy/`).

## Still open

- **Q53:** the LiveKit key from the public repo is still active on the server. The rotation will be rehearsed and then re-run.
- **Medicines list is slower:** about 5.7 s on a cold request, because the API cache is off. The agent branch's X0 fix brings caching back for public routes only. It ships with the next reviewed deploy.
- **Staging:** it should run on a separate server, not on the production server.
