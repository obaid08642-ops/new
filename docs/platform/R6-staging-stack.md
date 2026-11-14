# R6 - Staging stack on one small VPS (plan + compose override, dry run only)

Status: **plan; nothing bought, nothing started, nothing applied.** The owner decides if and when to rent the VPS (cost below is indicative, verify before buying).

## Why
Several reliability items cannot be proved on the production host or on a CI runner: two API processes against one database (R3 cron leases), a rolling deploy with two replicas (R4), a load run against a production-shaped stack (R16/R17), a restore and failover drill (R7). Today the "R6 staging stack" is the missing piece those docs point to.

## What it is
`deploy/docker-compose.staging.yml` is an **override** of `deploy/docker-compose.production.yml`: same images, same services and healthchecks, so what passes there is evidence about production. It changes only:
- project name `nabdah-staging`, env file `.env.staging` (own database name and secrets; `UPLOAD_SCAN=optional` because ClamAV is off);
- smaller limits: mongodb 768m, redis 128m, redis-cache 64m, meilisearch 384m, backend 512m, worker 384m, patient-web 384m, nginx 96m = 2720 MB, so a **4 GB / 2 vCPU VPS** keeps about 1 GB for the system;
- off by profile `off`: clamav, fastapi, admin-web, livekit, coturn, certbot (calls need a public UDP range; admin-web and fastapi are not needed for the backend/web proofs; the certificate is installed by hand once);
- nginx waits only for the backend (`depends_on: !override`, needs docker compose >= 2.24).

The test `tools/ops/tests/test_staging_override.py` pins these rules (no ports, no `.env.production`, the memory sum, the off list). `python3 tools/ops/check-compose-limits.py <merged file>` passes on the merged result (logging rule).

## Cost (no purchase)
One 4 GB / 2 vCPU cloud VPS. Indicative EUR 4 to 8 per month at the usual European providers; the same price class as the standby of R7 option B, and the **same VPS can serve both** if the owner prefers one machine (then staging goes to the 8 GB class). Region: staging holds **no real health data** (below), so the residency rule of R19 does not bind it; still choose the same provider family as production so the proofs transfer.

## Data policy (binding)
Staging never receives production data. It is filled by the existing test-mode seeders only (AGENTS.md: seeders on the local/test database only; screenshots labelled "test data"). No production secret, key or restore is copied to it; payment and mail keys are the providers' test keys.

## Steps as dry runs (reviewer runs them by hand on the staging host, in this order)
1. `docker compose --env-file .env.staging -p nabdah-staging -f docker-compose.production.yml -f docker-compose.staging.yml config` - prints the merged file and starts nothing. Check 8 services.
2. Same command with `up -d --dry-run` (compose prints what it would create). Only then `up -d`.
3. Proofs this stack exists for: (a) R3: scale `worker` to 2 and check the lease logs; (b) R4: `deploy/scripts/rolling-deploy.sh` for `backend` under `backend/load-tests/k6-smoke.js`; (c) R16/R17: `k6-full.js` at the caps of `docs/platform/R16-load-priority.md`; (d) R7 failover drill once the standby exists.
4. Report numbers in `docs/platform/` next to the R doc they prove; staging is never used for a release decision without them.

## Rollback / teardown
`docker compose -p nabdah-staging -f docker-compose.production.yml -f docker-compose.staging.yml down -v` removes the containers and the staging volumes (staging data only). Nothing of production is touched: the staging host has no route to the production database and no production credentials.

## Not done
No VPS, no DNS for staging.nabd.plus (the nginx vhost `staging.conf` exists), no certificate, no run of any proof. The override was validated with `docker compose config` against the real production file (8 services, project name `nabdah-staging`); it was not started.
