# Deployment brief: Nabdah Plus (nabd.plus) on the OVH server

You are deploying the **`main` branch** of `obaid08642-ops/new` to the owner's OVH server. **Deploy to staging first.** Deploy production only after the owner explicitly approves it following a clean staging run.

Everything below was checked against the repository. Where the server may differ from the repo, **inspect before acting**, and never guess.

---

## 0. Ground rules
1. **Secrets:** never paste, print, commit or send secrets anywhere, and that includes the owner chat. They live only in `/opt/nabdah/deploy/.env.production` (mode 600, git-ignored).
2. **Backup first:** take a full `mongodump` before touching anything, and copy it off the server. Also tag the currently running images (see §3.1) so a rollback is one command.
3. **Pin the commit:** deploy one exact commit SHA of `main`, and write it down. Do not deploy `fix/audit-2026-09` or any other branch.
4. **Migrations:** always run dry-run first and read the counts. Apply only when the counts make sense, and ask the owner before any `--apply` on production data.
5. **Stop on surprises:** if any step does something unexpected, stop and report. Never "fix" the server by improvising, weakening security or disabling checks.
6. **Keep security on:** never set `DISABLE_RATE_LIMIT`, `LOAD_TEST_BYPASS_TOKEN`, `ALLOW_TEST_SEED`, `USE_MEMORY_MONGO` or `SEED_DEMO_DATA` in production.

## 1. What you need from the owner
- SSH access to the server. Use a key for a non-root sudo user; if you are given a password, set up key auth and ask the owner to disable password SSH afterwards.
- DNS control, or confirmation that these records point to the server: `nabd.plus`, `www`, `api`, `admin`, `provider`, `live`, `turn`, `staging` (see `deploy/DNS-RECORDS.md`).
- The third-party keys the owner wants live now: Moyasar, R2/S3, Resend or SES, SMS provider, Firebase/APNs, AI provider. **Anything not provided stays empty.** An empty key makes that feature answer 503 "not configured", which is the intended safe state. Never put placeholder text in a key; the backend treats `pending_real_key`, `changeme`, `__NAME__` and similar as unset.

## 2. Discover the current server state (read-only; report it before changing anything)
```bash
uname -a; lsb_release -a; df -h; free -h; docker --version; docker compose version
ls -la /opt/nabdah /opt/nabdah/* 2>/dev/null
docker ps -a --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'
docker images | head -40
docker network ls; docker volume ls
sudo ss -tlnp
ls -la /opt/nabdah/deploy/.env.production 2>/dev/null   # exists? do NOT print it
sudo crontab -l
```
Answer these in your report:
- **Directory layout:** `deploy/docker-compose.production.yml` builds from `../nabdah-backend` and `../Napd-admin/web-admin`, but the repository has `backend/`, `admin/` and `patient-web/`. Does the server hold the old names (maybe symlinks) or the repo layout? You must make the build contexts point at the repo's `backend/`, `admin/` and `patient-web/`. Change the compose paths, or create symlinks `nabdah-backend -> backend` and `Napd-admin/web-admin -> admin`. Pick one and say which.
- **Staging:** does staging exist? `deploy/nginx/conf.d/staging.conf` proxies `staging.nabd.plus/api/v1/` to a container `nabdah-staging-backend:8003`, but that service is **not** defined in `docker-compose.production.yml`. Find how it is run today (a separate compose file? a manual `docker run`?).
- **patient-web image:** it runs from a prebuilt image `nabdah-patient-web:v50`, and the compose file has no `build:` for it. Find how that image was built. It must be rebuilt from `patient-web/` with `deploy/docker/Dockerfile.patient-web`.
- **MongoDB:** confirm it runs as replica set `rs0` (see `deploy/mongo/mongod.conf`, which needs `deploy/mongo/mongo-keyfile`, mode 400, owner 999). Check `rs.status()`, and check which databases exist and their sizes. The app uses `DB_NAME`, default `nabd_nestjs`.

## 3. Staging deployment
### 3.1 Backup and rollback point
```bash
TS=$(date +%Y%m%d-%H%M)
docker exec nabdah-mongodb mongodump -u "$MONGO_ROOT_USER" -p "$MONGO_ROOT_PASSWORD" --authenticationDatabase admin --archive=/tmp/pre-deploy-$TS.gz --gzip
docker cp nabdah-mongodb:/tmp/pre-deploy-$TS.gz /opt/nabdah/backups/
for s in backend admin-web patient-web; do docker tag $(docker inspect --format '{{.Image}}' nabdah-$s) nabdah-$s:rollback-$TS; done
```
Copy the dump off the server (R2 via `deploy/scripts/backup.sh`, or scp to the owner) before continuing.

### 3.2 Get the code
Clone or fetch the repo into `/opt/nabdah/src`, run `git checkout <SHA>`, and sync `backend/`, `admin/`, `patient-web/` and `deploy/` into the layout you chose in §2. **Never** use `deploy/scripts/deploy-remote.sh` as is: it rsyncs from a path on another machine (`/mnt/agents/output/projects`) and uses `sshpass` with a password.

### 3.3 Environment
- Start from `deploy/.env.production.example`, which is new: it lists every variable, marks the required ones and the forbidden ones. `deploy.sh` generates the secrets on first run. **If a `.env.production` already exists, keep its secrets** (changing `JWT_SECRET` logs everyone out; changing the Mongo or Redis passwords breaks the running stack). Only add the missing variables.
- Required at boot in production: `MONGO_URL`, `REDIS_URL`, `JWT_SECRET` (≥ 32 chars), `ALLOWED_ORIGINS` (exact origins, no `*`). The backend refuses to start without them, which is intended.
- Remove any `MOYASAR_*=pending_real_key` lines left by older `deploy.sh` runs. Leave them empty unless the owner gives real keys.
- **`TRUST_PROXY_HOPS` must equal the real number of proxies in front of the backend.** The code defaults to 2. With only nginx in front (DNS-only, no Cloudflare proxy on `api.nabd.plus`) it must be `1`; otherwise a client can forge `X-Forwarded-For`, appear as any IP, and bypass every per-IP limit (login brute force, OTP bombing). Use `2` only if `api.nabd.plus` is proxied by Cloudflare (orange cloud). Verify it in §3.6.
- For staging use a **separate database**: `DB_NAME=nabd_staging` (never staging on `nabd_nestjs`). Note that `DB_NAME=nabd_staging` also turns the API rate limiter off by design (`api-security.module.ts`). That is acceptable for staging only.
- patient-web runtime env: `NABD_API_BASE_URL=http://<backend>:8002/api/v1`, `NEXT_PUBLIC_SITE_ORIGIN`, `APPLE_TEAM_ID=6AT2W85DBC` (the code falls back to this too), `APPLE_BUNDLE_ID`, `ANDROID_PACKAGE_NAME`, `ANDROID_SHA256_FINGERPRINT`. `NEXT_PUBLIC_WEARABLES_ENABLED` must stay **unset**, which keeps wearables hidden. `NEXT_PUBLIC_*` values are baked in at build time, so pass them as build args.
- admin env: `ADMIN_BACKEND_URL=http://backend:8002`, `NEXT_PUBLIC_SITE_URL`.

### 3.4 Build
- **backend:** `deploy/docker/Dockerfile.backend` only copies a prebuilt `node_modules` and `dist` (npm crashes under buildkit in that datacenter, per the file's comment). Build them first in a plain container:
  `docker run --rm -v $PWD/backend:/app -w /app node:20-bookworm-slim sh -c "npm ci && npm run build && npm prune --omit=dev"`, then `docker compose ... build backend`. Because `npm prune` removes `ts-node`, use a separate copy of `backend/` for the migrations in §3.5.
- **admin and patient-web:** build with their Dockerfiles. patient-web uses pnpm with the frozen lockfile.
- Tag every new image with the SHA.

### 3.5 Database migrations (in this order, dry-run first each time)
They live in `backend/scripts/migrations/`. They connect with `MONGODB_URI` and **use `DB_NAME` (default `nabd_nestjs`) as the database**, the same as the app, so set `DB_NAME` to the database you are migrating. `ts-node` is a dev dependency, which the production image does not contain. Run them from a separate `node:20` container that has the full `backend/` source with `npm ci` (dev deps included), attached to the compose `internal` network (`docker run --rm --network nabdah-prod_internal -v $PWD/backend:/app -w /app node:20-bookworm-slim …`):
```bash
export MONGODB_URI='mongodb://USER:PASS@mongodb:27017/?authSource=admin&replicaSet=rs0' DB_NAME=nabd_staging
npx ts-node --transpile-only scripts/migrations/2026-09-link-provider-accounts.ts        # read the plan + orphans
npx ts-node --transpile-only scripts/migrations/2026-09-unify-provider-passwords.ts
npx ts-node --transpile-only scripts/migrations/2026-09-strip-facility-ratings.ts
npx ts-node --transpile-only scripts/migrations/2026-09-purge-demo.ts                     # soft-deletes demo/test records
```
Report every dry-run output to the owner, then rerun each with `--apply` in the **same order**. `link-provider-accounts` must be applied before `unify-provider-passwords`. Also check whether the index scripts `20260827-pharmacy-expiry-indexes.js` and `20260827-pharmacy-payment-evidence-indexes.js` were applied (`db.<coll>.getIndexes()`) and run them if not, plus `deploy/mongo/init-indexes.js` (idempotent).

### 3.6 Start and verify staging
Start the stack, then check:
1. `docker compose ps`: every service is healthy. Read `docker logs --tail 200` of the backend: no errors, and the line `[env] placeholder values treated as unset` is either absent or lists only keys you meant to leave empty.
2. `bash deploy/scripts/health-check.sh` passes.
3. **Security checks. Each must hold; report the actual responses:**
   - `curl -H 'x-bypass-rate-limit: nabd-load-test' …` 130 times on any GET: requests past the limit get 429 (production DB only; staging has the limiter off by design).
   - `POST /api/v1/provider/seed`: 404.
   - IP spoofing: send 12 `POST /api/v1/auth/login` with a wrong password, each with a different random `X-Forwarded-For: 203.0.113.<n>`. They must still reach 429, because the limit uses the real client IP. If they never do, `TRUST_PROXY_HOPS` is wrong.
   - `POST /api/v1/<any admin route>` without a token: 401. With a patient token: 403.
   - With no Moyasar key, a payment or refund attempt returns 503 `payment_gateway_not_configured` and records nothing.
   - Response headers include Helmet's security headers. CORS allows only the `ALLOWED_ORIGINS` origins.
4. **Smoke journeys on staging, with real accounts the owner creates for testing:**
   - patient: register/OTP, log in, add an address (it must show on both web and app), add a medication reminder, save an insurance policy (reopen it: company and member id are still there), book nursing with a saved address, cart checkout (cash).
   - provider: log in, see jobs (patient allergies and chronic conditions are visible), submit a profile change.
   - admin: log in, approve that provider change, create a delivery rule, view orders.
5. `https://staging.nabd.plus` loads; `/.well-known/apple-app-site-association` contains `6AT2W85DBC`.

## 4. Production (only after the owner says "go")
Repeat §3 against production: backup, pin the same SHA, keep the existing secrets, run the migrations dry-run → owner OK → apply, and verify everything in §3.6 including the rate limiter check. Deploy during low traffic and watch the logs and Sentry for 30 minutes.
**Rollback:** `docker tag nabdah-<svc>:rollback-$TS nabdah-<svc>:latest && docker compose up -d <svc>`. Restore the data from the dump **only** if a migration went wrong, and only with the owner's approval.

## 5. Report back to the owner
- The SHA deployed, and the staging and production URLs.
- The discovery answers from §2, and the layout or compose changes you made. Open a PR with those changes; do not leave server-only edits.
- Every migration's dry-run and apply output (counts only, no personal data).
- The results of every check in §3.6, pass or fail, with the actual output.
- Anything you did not do or could not verify, plainly stated.
