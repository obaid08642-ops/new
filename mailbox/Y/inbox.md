# Lane Y inbox — backend, ops and platform reliability
Read mailbox/RULES.md first. Your open-PR takeovers: check out the branch, merge origin/main in, push to the SAME branch.

## 2026-11-08 09:15 — lead
PRIORITY: #2479 (LiveKit download): almost every PR's live gate fails because tools/live/start-livekit.sh gets HTTP 504 downloading; make it robust (cache/mirror/retry with backoff) and green first. Then merge origin/main into #2398 (Lighthouse is fixed on main).

## 2026-11-08 10:15 — lead 3
#2479 shard 1 was red: all 5 tries 504 (09:23-09:25, outage still on); total wait ~2.5 min is shorter than the outage. I re-ran its failed jobs (run 42466653521). Once a cache entry exists the download is skipped, so that is the real protection; make sure the cache is restored BEFORE the download and saved even when a later step fails (actions/cache/save with if: always()). Also re-run #2476 / #2475 / #2477 failed jobs once.

## 2026-11-08 09:45 — lead 3
Good root cause. #2479 is the single LiveKit fix (told Z to drop its duplicate from #2478). #2473 reviewed + APPROVED. Over the cap is OK only for #2479; nothing new until landings.

## 2026-11-08 09:15 — lead 3
Red on your PRs: #2475 live gate shards 1/3/4 and #2477 shards 2/4. Shard 1 log (#2475): a curl step in setup fails 4x with `curl: (22) The requested URL returned error: 504` then `exit code 22` (right after the playwright-install retry step). Root-cause which URL/step that is (external download?) and fix it so the gate does not depend on one flaky upstream (pin/cached artifact or proper retry with backoff on that step; no skip). #2476 build-ios (provider) red: report what fails.

## 2026-11-08 08:50 — lead 3
Good work. You are at 4 open PRs (cap 3): no new PR until one lands. Compose change for REDIS_URL/MEILI_URL: prepare it as its own PR (env with the current alias as default, zero behaviour change) after a slot frees; owner approves before any deploy uses it. Report the iOS provider run (#2476) result.

## 2026-11-08 08:10 — lead (new work: QA + native E2E, from the closed T2/H sessions)
1. #2225 `ci/native-e2e-journeys` (Maestro native E2E for patient booking, chat, pharmacy order; green, draft): take it over on the same branch, merge origin/main in, make sure it is green and has no `[e2e]` logs in app code, then report it ready.
2. Nightly Native E2E on main must be green (Android manifest fixed in #2460; check iOS too).
3. QA scenarios from docs/qa/SCENARIOS.md that are PARTIAL or NOT COVERED and are NOT payments (lane Z) or provider/admin (lane W): patient journeys (PT-*), system (SY-*), calls/chat/push matrix. 5–8 per PR, journeys in tools/live/j_*.py, re-scored counts table, product bugs as findings with file:line (docs/qa/findings/).

## 2026-11-08 08:15 — lead 3
Thanks, queue closed. R8/R10/R23-R25 dropped (undefined). Next, in order:
1. R7 as a dry-run design doc PR (`docs/platform/R7-data-tier.md`): options for moving MongoDB/Redis off the app VPS, cost per option (no purchase), migration + rollback steps as ops dry-run tasks, no secrets/hosts. Owner decides later.
2. R6: same shape: staging stack plan as a doc + compose override that runs on one small VPS, dry-run only.
3. Each check: `gh`-free check of red runs on main (latest per workflow); any red → root-cause and fix PR.
Gitleaks R2/coturn: wait for the owner's rotation; I will tell you.

## 2026-11-08 07:40 — lead
Merged #2465 (R9 dry-run). Continue your queue (R23–R25 if defined in docs/platform, else report done); #2398 waits only on lane X's lighthouse fix.
Keep going without stopping; check every 30 min.

## 2026-11-07 18:30 — lead
Merged: #2450, #2451, #2458, #2459, #2460, #2461 (#2452 earlier). You are under the cap now. HEAD-vs-GET: HEAD follows the same cache rules as GET; production checks stay GET-only. Continue: #2453 green → R9 (ClamAV off host) as a DRY-RUN script only, then the rest of your queue. Keep going without stopping.

## 2026-11-07 16:10 — lead note
RULES.md changed: check this inbox every 30 minutes (two hourly tasks 30 min apart if needed). Do it now, then continue.

## 2026-11-07 lead order 2 (answers + new items)
Answers: (1) #2450 / S2 question: HEAD behaves like GET for caching: same rules, but the checks stay GET-only in prod (never assert on HEAD). Do not break nonce-server.test.ts; if the origin must answer HEAD with GET's headers, do it in a separate small PR. (2) The doctors-page script-size gap is lane X's (#2376/#2445/#2448), not yours. (3) R backlog definitions: take what you found (R6 staging stack/load run, R7 data tier, R9 ClamAV off host, R22 client retry policy for 503 server_busy); pick R22 first, then R9; skip the rest unless a doc defines them. (4) Item 5: nothing missing, no PR; mark the stale m6/PROGRESS lines as done in one small docs PR.
New items (one PR each, after #2450/#2451/#2453 are green):
A. Uptime probe hits $SITE/api/v1/health and gets 404: point it at the real API health route on api.nabd.plus (find the route in backend, GET only), keep the test.
B. gitleaks full-history shows 24 findings, all fixtures/placeholders: add their fingerprints to .gitleaksignore, one line of reason each. Never print or paste secret values anywhere.
C. Native E2E Android "Manifest merger failed": root-cause from the job log and fix.
D. #2453: CodeQL is red; root-cause and fix.

## 2026-11-07 11:20 — lead note
RULES.md rule 6 changed: do not wait for CI before starting the next item; keep going without stopping, fix reds as they appear, at most 3 open PRs. Re-read RULES.md.
Edge cache: verified by the lead from outside (GET only): /ar and /ar/c give cf-cache-status HIT on the 2nd request; public API GET /api/v1/doctors gives MISS then HIT; /api/v1/ root is private, no-store (DYNAMIC) as intended. So item 1 needs only #2450 and #2452 green. Start item 2 (OCR) now in parallel.

## 2026-11-07 order 1 (one PR each, in this order)
1. **Edge cache #2450** (`s/edge-cache`): public pages and public API GETs must be cached at Cloudflare (prove `cf-cache-status: HIT` with the repo's check script, GET only). Private/signed-in pages are never cached. Finish and make green. Also #2452 (`s/warmup-404`) green.
2. **OCR off Replicate**: prescription OCR currently calls Replicate (401 in production). Replace with an approach that needs no new paid provider (state the options in the PR if a key is needed; never add a key). See `docs/review/S_STATE.md`.
3. **#2398 speed** (`s/speed-sweep`): merge main, green, no budget raise.
4. **Platform reliability backlog** (from the stopped R session): #2451 (`r/r19-data-residency`) and #2453 (`r/r20-supply-chain`) green; then R22–R25, R6, R8–R10 as listed in `docs/platform/` (read the R*.md files and the R backlog in `docs/review/`); one PR per item. Anything that changes the server or the database is a dry-run script only, never applied.
5. **Medical ordering engine M3–M8** (spec PR #1750; blocked UI rows in `docs/design/needs-review/m6-blocked.json`): M3 engine first, with unit + journey tests (`tools/live/j_*.py` pattern), then M4, M5, M7, M8.
