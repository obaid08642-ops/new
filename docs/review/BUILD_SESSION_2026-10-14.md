# Build session brief (owner, 2026-10-14)

You are the **build session** for Nabd Plus (`obaid08642-ops/new`). You take over the work the lead reviewer had kept
for itself: deploys, server operations, Cloudflare, staging, the rest of Phase 14, and D-33. The **lead review
session** stays a reviewer: it writes the acceptance specs, reviews OpenCode PRs, and audits yours. OpenCode runs three
sessions in parallel (OC-A, OC-D and OC-E; see `docs/review/OPENCODE_QUEUE.md`). Do not touch their items.

Answer the owner in **Egyptian Arabic**. Write code, commits, PR bodies and docs in English.

## 1. Read first (in this order)

1. `AGENTS.md`: the design-session rules and the honesty rules apply to you. The `fix/audit-2026-09` branch rules do
   not: that branch has been frozen since 2026-10-08, and `main` is the only base.
2. This file.
3. `deploy/SCALING.md`, `deploy/cloudflare/rules.md`, `docs/deploy/CLOUDFLARE_STATE.md`, `docs/perf/SCALE_ARCHITECTURE.md`.
4. `docs/audit/02_AGENT_EXECUTION_PLAN.md`, Phase 14 table (rows 14.1–14.28). Read only the rows you work on.
5. `docs/review/phase-review/P14.md`: the older review of Phase 14. Several rows have since been fixed on `main`; check
   the code, not the review.

## 2. Rules (binding; the owner's)

**Git and PRs**
- Never push to `main`. One PR per item, from a branch off today's `main` (`build/<item>`).
- Use a worktree per branch (`git worktree add -B build/<x> /tmp/<x> origin/main`).
- Never rewrite history on a branch someone else uses: no rebase, amend or force-push. Bring `main` in with a merge
  commit.
- You may merge your own PR when **all** of these hold:
  1. CI is green on the current head;
  2. the gates below pass, with their outputs pasted in the PR body;
  3. you re-read your own diff once looking for what CI would miss.
- Lighthouse is the only check allowed to be red, and only where it is red on `main` too.
- Never skip, disable or weaken a test. Never edit an acceptance spec that is already on `main`. Never use
  `--no-verify`.
- Never commit `backend/package-lock.json` changes that drop entries (`gaxios`, `gcp-metadata`, `node-fetch`,
  `google-logging-utils`). Dependabot does this; when upgrading a package, edit the lock entry by hand and prove
  `npm ci --legacy-peer-deps` works (see PR #1411 for the method).

**Commits and PR bodies**
- Every commit ends with the two attribution lines your harness gives you.
- Every PR body includes `Identity check: no new colours/logo/patterns` with the token diff, and ends with the harness
  footer.
- Never put a model name in a commit, PR or code. In client code and comments write "issue 302", not `#302`: the
  hex-colour test reads `#302` as a colour.

**Product rules**
- No crypto and no agent payment protocols. The patient pays only on Nabd Plus pages (Moyasar).
- Prescriptions are never bypassed.
- No invented content, prices or mock data. Seeders write test data to the local test database only, never to staging
  or production.
- Colours come from tokens only (`@nabd/design-tokens`). User-visible text goes in all six locales (ar, en, ur, hi,
  bn, fil), never written into a screen.
- Owner decision 2026-10-06:
  - public pages keep serving the last good cached copy during an outage, and `/` shows the error state with a retry
    when there is no copy;
  - pages that act (sign-in, booking, payment, orders) are never cached and show the error at the action;
  - the cart is local-first.

**Honesty**
- Never claim a result you did not see. Paste real command output.
- When something is truly impossible, write `BLOCKED: <exact reason>` in the PR or report, then do the rest.
- A red check is never "a flake" without one confirming re-run.

## 3. Gates (run the ones your change touches; paste the last lines)

```
# backend (cd backend)
npx tsc --noEmit
npx jest <changed modules>
npx jest --config jest.boot.config.js --runInBand test/security test/journeys      # 66/66
python3 ../tools/audit/dtolint.py                                                   # exit 0
cd .. && node tools/audit/clientbodies.js > /tmp/c.json && node tools/audit/dtocheck.js /tmp/c.json   # 0 mismatches
# patient-web (cd patient-web)
npx tsc --noEmit && npx vitest run
NEXT_TELEMETRY_DISABLED=1 npx next build        # public pages must show ● (ISR), private ones ƒ
# apps: npx jest in patient-app / provider-app (the first cold run can fail; run once more before believing it)
# design gates, from the repo root
node tools/design/locale-parity.mjs --base origin/main
node tools/design/no-literal-ui-string.mjs      # baseline only goes down
node tools/design/client-token-sync.mjs         # baseline only goes down
npx tsx tools/design/no-raw-color.ts
npx tsx tools/design/no-emoji-in-ui.ts
```

Turbopack refuses a symlinked `node_modules`. Build in a checkout that has a real one.

## 4. Server and Cloudflare: how you reach them

You have no direct SSH. Everything goes through `.github/workflows/server-inspect.yml` ("server-ops") on the branch
`review/server-inspect`:

**How a run works**
- `tools/ops/RUN` lists the tasks to run, in order:
  - a plain name runs `tools/ops/tasks/<name>.sh` on the server over SSH;
  - `cf:<name>` runs `tools/ops/cf/<name>.sh` against the Cloudflare API (secrets `CLOUDFLARE_API_TOKEN` and
    `CLOUDFLARE_ZONE_ID`).
- A push to that branch (paths `tools/ops/**` or the workflow) starts a run. It waits for the owner's **Approve** in
  the `production` environment. Ask the owner, with the run link, every time: you cannot approve it yourself.
- The full report is encrypted to `tools/ops/report_pubkey.pub`. The public log shows only short status lines.
  **Generate your own RSA key pair** (`openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:3072`), commit the new
  public key in your first ops push, keep the private key in your scratchpad, and decrypt the `ops-report-encrypted`
  artifact:
  - get its download URL from the redirect of `https://api.github.com/repos/<repo>/actions/artifacts/<id>/zip`;
  - unwrap `k.enc` with `openssl pkeyutl -decrypt -pkeyopt rsa_padding_mode:oaep`;
  - decrypt `report.enc` with `openssl enc -d -aes-256-cbc -pbkdf2`.

**Rules for tasks**
- Every task that changes something on the server is rehearsed first in `.github/workflows/ops-rehearsal.yml` on a
  copy of the server layout.
- A task never prints a secret value. Print variable names only.
- Every mutating task has a rollback step that you wrote and rehearsed.

**State on 2026-10-14**
- The server was unreachable for several hours (Cloudflare 522, and SSH timed out from GitHub runners). It is back.
- The Cloudflare token had expired. The owner is replacing it; until it works, `cf:` tasks print `status: expired`.

## 5. Work, in order

**1. PR #308 (14.1/14.9, public pages static/ISR): get it green and merge it.**
- Already done: merged with `main`, conflicts resolved, `next build` shows ●, vitest 1553/1553.
- CI is red for two reasons:
  - `p15-web-browsers.yml` reads `NABD_API_BASE_URL=https://staging.nabd.plus`, and staging answers **302**
    (Cloudflare Access; staging has been off since 2026-10-04). A static page with no data now throws to keep its last
    good copy, which the smoke reports as 500/503. Point the smoke at `https://api.nabd.plus/api/v1` (public,
    read-only), as `patient-production-ci.yml` and `lighthouse.yml` already do.
  - The runtime-contrast job reports 10 new 4.5:1 signatures on `/en/diagnostics/packages`: the description
    (`_77YjBa`) and the price (`bdi`). The page is now rendered with live data. Fix the colours with tokens; never
    lower the baseline to pass.

**2. Diagnose today's outage (read-only first).**
- Use `tools/ops/tasks/50-inspect-scale.sh` (on `review/server-inspect`; extend it as needed). Collect:
  - disk, memory and OOM kills (`journalctl -k`, `dmesg`);
  - `docker ps -a` restart counts and container logs around the outage;
  - the nginx error log, `fail2ban` bans, uptime and reboot time.
- Write the cause and the fix in `docs/deploy/INCIDENT_2026-10-14.md`.

**3. Deploy `main` to production.**
- Production is far behind `main`. Find how it is deployed today: `tools/ops/tasks/12-inspect-deploy.sh` shows the
  source directories under `/opt/nabdah`, their git revisions and the compose file in use.
- Write a deploy task, rehearse it, then run it:
  1. take a MongoDB backup first;
  2. update the sources to `main`;
  3. `docker compose up -d --build`;
  4. check health;
  5. roll back automatically when health fails.
- The `.env.production` changes go in the same task. Print names only, never values:
  - `METRICS_SCRAPE_TOKEN`: new, `openssl rand -hex 32`;
  - `MEILI_MASTER_KEY`: if missing;
  - `PROCESS_ROLE` and `HTTP_COMPRESSION`: set by compose already, nothing to add.
- New services and files this deploy brings:
  - `worker` (`PROCESS_ROLE=worker`), `meilisearch`;
  - `deploy/nginx/snippets/api-microcache.conf` and the new nginx locations.
- After the deploy:
  - `GET /api/v1/health/readiness` reports `background_worker: up`;
  - `X-Cache-Status` is MISS, then HIT, on a public API answer, and BYPASS with `Authorization`;
  - the site and the API answer 200;
  - `/api/v1/observability/metrics` answers 404 without the token.

**4. Cloudflare (needs the owner's new token).**
- Read the live state.
- Reconcile `docs/deploy/CLOUDFLARE_STATE.md` (what is applied) with `deploy/cloudflare/rules.md` (what is wanted).
- Apply the difference with `cf:` tasks. Each change must be idempotent and print what it changed.
- Then verify: a page with a session cookie is never a cache HIT; `/api/v1/radiology/reports/mine` is never a HIT;
  the rate limits answer 429 where expected.

**5. Staging.**
- `deploy/SCALING.md` says staging must not share the production server (the 2026-10-04 incident).
- If the owner provides a second server, build staging there. If not, write `BLOCKED: no staging host` and propose the
  smallest OVH instance that fits.
- k6 runs (`tools/perf/k6/capacity.js`) run against staging only, never against production with writes.

**6. D-33: backups and restore drill.**
- The lead review session writes `backend/acceptance/d-33/`. Wait for it on `main` before you start.
- Scope: scheduled MongoDB backups off the server (not on the public CDN bucket: see incident 83cd8bba), retention,
  and a restore drill that proves a backup restores.

**7. The rest of Phase 14, one PR per item, with tests.**

| Item | What |
|---|---|
| 14.3 | Backend hot paths: index coverage (no COLLSCAN on hot queries, using the 14.15 explain tooling), N+1 reads, per-user rate limits. |
| 14.4 | Write-path resilience: the outbox relay for side effects (the `domain_outbox` writers exist; check for a relay and a test that kills Redis mid-write). |
| 14.10 | Next.js on more than one instance: a shared cache handler (Redis), opt-in by env, with a test showing two instances serving the same revalidated page. |
| 14.20 | Media: image resizing or `next/image` sizes, ≤ 60 KB product images on mobile, a preloaded LCP image, EXIF stripped on every upload path. |
| 14.23 | Web performance: font subsets per script, speculation rules (never cart or checkout), size-limit budgets in CI. Measure and report; do not invent numbers. |
| 14.24 | App performance: needs a low-end Android. `BLOCKED` until the owner provides one. Do not swap lists to FlashList without a device check (the boards' layouts depend on `contentContainerStyle`). |

**8. Issues #849 and #861 (maternity content).**
- Only when the owner sends the content. Never invent medical text.

## 6. Reporting

- After every merged PR: one line in `docs/review/BUILD_SESSION_LOG.md` (date, PR, item, result).
- To the owner: short Egyptian Arabic. What merged, what is waiting and on whom, what is blocked and why.
- When your context runs low: commit, push, update the log, and stop.
