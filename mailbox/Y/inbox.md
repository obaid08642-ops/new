# Lane Y inbox — backend, ops and platform reliability
Read mailbox/RULES.md first. Your open-PR takeovers: check out the branch, merge origin/main in, push to the SAME branch.

## 2026-11-09 09:20 UTC — lead 3
1. #2530 and #2531 merged (reviewed: monitor streaks/hysteresis, watchdog mail gate, gradle/pod retry only on network errors). Thanks.
2. NEW (flaky test from #2497): `backend/src/common/password-hash.spec.ts:59` `expect(inline).toBeGreaterThan(inWorker)` failed on #2532 (job 129065505693) with inline=0, inWorker≈10.1. A timing comparison between two runs is not a reliable assertion on a shared CI runner. Make it deterministic without weakening what it proves: e.g. assert the worker path keeps ticking (gap < bound, keep), and prove the inline path blocks by counting ticks DURING the inline hash (must be 0 or ≤1) instead of comparing two separate gaps; or measure the inline hash's own duration vs the max tick gap. Do not delete or skip the test. Own branch y/password-hash-flake, one PR.
3. Still waiting on 96j results in the next ops run.

## 2026-11-09 06:30 UTC — old lead: alert-mail flood (owner request; after lead 3's mongod memory order)
Owner gets the same server alert mail every 10-15 min (container / memory). Likely: `deploy/scripts/monitor.sh` (cron 15 min) mails on every change of the critical signature; mongod is OOM-killed often (356 restarts) so `container-nabdah-mongodb` flaps → alert mail, then "all checks OK again", repeatedly; the watchdog mails too.
Owner rule: mail ONLY on a real state change (server down, API/container failing, recovered); never the same state again; numbers (memory %, free MB) never trigger a mail.
Do (one PR, tests): (1) hysteresis in monitor.sh: a critical alert is mailed only after 2 consecutive runs, "OK again" only after 2 consecutive clean runs; (2) ALERT_REPEAT_HOURS default 6 → 24; (3) backend-watchdog.sh: at most one mail per container per 6 h with the restart count since the last mail; (4) flapping test in tools/ops/monitor/test-monitor.sh (alert, ok, alert, ok → 1 mail); (5) ops task to install it on the host (owner approves).

## 2026-11-09 06:20 — lead 3: 96h RESULT (run 108, server-ops 42567090191) → root cause = memory
- restarts=356 (296 at 16:27 yesterday → ~60 in 13 h), restart_policy unless-stopped, health OK, die-events list empty (docker events window), container oom 0.
- cgroup memory.events: max 3755 (the 1.6 GB limit was hit 3755 times), oom_kill 0; KERNEL kills by command: mongod=11 (host-level OOM killer); MemAvailable ~1050 MB; mongod using 950 MiB / 1.56 GiB.
- So mongod is killed by the host OOM killer and squeezed at its cgroup max. Likely WiredTiger cache sized from host RAM, not from the container limit.
ORDER (one PR, dry-run first, tests): (1) read-only check task that prints mongod's effective wiredTiger cacheSizeGB and the container limit; (2) set `--wiredTigerCacheSizeGB` explicitly in deploy/docker-compose.production.yml so cache + overhead stays well under the 1.6 GB limit (e.g. 0.5–0.6; justify), plus a compose test; (3) document in R7 that host RAM is the real ceiling (owner's RAM-upgrade decision). No restart from the task; the change lands with the next deploy.

## 2026-11-09 02:45 — lead 3: next orders
1. Read-only ops task for the R11 halala backfill dry-run counts (per collection: rows missing `*_halalas`, rows whose shadow disagrees with the double by >0) — names/counts only, no writes; tests. I put it in the next ops run.
2. SY-01 nightly jobs run once and report (PARTIAL → COVERED): journey proving each named job runs exactly once per window (no double run across api/worker) and reports.
3. PT-38 deep links into a booking or chat (app + web): journey/test coverage.

## 2026-11-08 22:45 — lead 3: change of plan for #2504
Taking main's manifests onto the ops branch (1015 commits behind) now breaks Backend/Patient Mobile/Provider builds there (+25k/-19k lines) — a deploy-control branch must not carry that. Please CLOSE #2504 (do not merge). The reviewed change already lives on main: docs/ops/60-deploy-main-mongo-wait.patch (+ its test) and tools/ops/tasks/96h-mongo-restarts.sh. The ops session applies them in its next ops-run commit on review/server-inspect (as it does for every run), so no PR on that branch is needed. Your next item: anything red on main (latest per workflow), then R7 compose env PR (REDIS_URL/MEILI_URL defaults = current aliases, zero behaviour change).

## 2026-11-08 20:45 — lead 3
#2504 (→ review/server-inspect): the 60-deploy change is reviewed and sound (wait healthy, retry once only on a mongod restart, size guard unchanged). But 7 checks are red, from the ops branch itself, not your two files: "Lockfiles and pinned Actions" = `.github/workflows/ops-rehearsal.yml:15,150` and `server-inspect.yml:18` use `actions/checkout@v4`, `server-inspect.yml:162` uses `actions/upload-artifact@v4` (not SHA-pinned), plus the 5 "Dependency audit" jobs and Trivy (the ops branch lockfiles are behind main). In the same PR: pin those 4 actions to the same SHAs main uses, and bring the lockfiles/audit state in line with main (merge origin/main's lockfiles or explain each finding). I merge it once all checks are green.

## 2026-11-08 19:45 — lead 3
Merged #2494 (96h + deploy wait/retry patch) and #2498 (search suggest). Ops run 106 (deploy main@50df9f87, prepared by the ops session) is waiting for owner approval; it does NOT yet include 96h nor your 60-deploy patch. The next ops run should: apply docs/ops/60-deploy-main-mongo-wait.patch on review/server-inspect, then `96h-mongo-restarts` + deploy. Prepare that ops-branch commit as a PR to review/server-inspect if your rules allow; otherwise I relay it. #2497: still waiting for your console.* fix.

## 2026-11-08 18:45 — lead 3
#2497 red "Backend build and tests": `FAIL src/modules/logs/logs.spec.ts › no console.* is left in backend/src › uses logEvent / the LoggerService instead` (Expected -1 / Received +3): your change adds console.* calls in backend/src; use logEvent/LoggerService. Merged #2225 (native E2E) — thanks for the takeover.

## 2026-11-08 17:45 — lead 3: two live-gate reds not caused by the PRs (root-cause, no retries-as-fix)
1. #2483 shard 5 (job 128788515360): `j_web_order_center_returns` 10 failed: "pending list (provider-moderation) shows the new provider -> 503 0 items"; `j_admin`: "BFF call (dashboard: command-center) -> 503 {"error":"server_busy","message":"server_shedding_load","retry_after_seconds":3}". The backend load shedder trips inside the CI stack. Find why (threshold vs the CI runner's CPU/event-loop lag, which shard runs heavy journeys together) and fix the cause; do not disable shedding in prod paths.
2. #2480 shard 4 (job 128788187821): `j_web_search_suggest` 3 failed: typing "بر" should list بروف…/بروفينال… but returns other items (رعاية يومية…, رنين مغن…); logs show repeated `Search: purge search failed: purge…` warnings. Root-cause the search index state/purge in the live gate.
Report which commit on main introduced each, if any.

## 2026-11-08 17:15 — lead 3
#2494 plan is right (no blind cache/limit change). After CI is green I review it; then 96h runs in the next ops run and the deploy-script patch is applied on review/server-inspect by whoever prepares that run. Report the 96h output root cause as soon as it is in.

## 2026-11-08 16:45 — lead 3: TOP PRIORITY
Ops run 105 (server-ops 42498850561): 96g steps 1-4 all OK (step 2 = expected Unauthorized; 3 and 4 dump fine), and the deploy is `DONE main@a74179a8 live` with a good backup. But step 0 shows `nabdah-mongodb: restarts=296 started=2026-11-08T13:04:29Z oom_killed=false` (MemAvailable 1259 MB, swap free 3.1 GB, no kernel kills). The 13:04:29 restart is 1 minute after run 104's failed dumps (13:03) → most likely mongod was restarting/unavailable then, so the backup came out empty.
Do (one PR): a READ-ONLY ops task `96h-mongo-restarts`: RestartCount, last 5 exit codes/finish times (docker inspect + `docker events --since 48h --filter container=nabdah-mongodb --filter event=die` counts by exit code), healthcheck config + last 5 health results, mem limit vs usage, and the last ~30 mongod log lines around a restart with secrets/IPs masked. Then root-cause (healthcheck killing it? memory cap? WiredTiger cache size vs limit?) and propose the fix (dry-run first). Also: make 60-deploy-main wait for mongod healthy + retry the dump once after a restart, so a restart mid-backup gives a clear message.

## 2026-11-08 14:15 — lead 3
#2488 reviewed: read-only, temp files 600 + removed, secrets masked, FULL off by default → APPROVED once CI is green. Small hardening if you touch it again: `trap 'rm -f "$CFG" "$ERR" "$OUT"' EXIT` so the credentials file is removed even on an early exit. Ops run: after merge, run `96g-mongodump-diag` alone (no deploy tasks) in one owner-approved run; I relay the status lines to you.

## 2026-11-08 13:45 — lead 3: TOP PRIORITY (blocks every deploy)
Ops run 104 (deploy main@92446efa, server-ops run 42482104229, 12:50) ABORTED safely: `deploy: ABORT backup too small (0 bytes)`. mongodump one-off (mongo:7.0 on nabdah-prod_internal, cap 600m of ~1.9 GB available) exited 1 twice with NO error text, OOMKilled=false. The same step worked in run 103 at 10:24 (DONE main@f5a698ee, which is live now).
1. Root-cause from the repo first: what changed between f5a698ee and 92446efa or on review/server-inspect that touches 60-deploy-main.sh / _mongodump-oneoff.sh / compose mongo image/network/credentials (#2453 digest pins? `--quiet` hiding the error?).
2. Add a READ-ONLY diagnostic ops task (e.g. 96g-mongodump-diag: one dump of one small collection to /dev/null without `--quiet`, print exit code + the first stderr lines with secrets masked; no writes, no restarts) and, if the cause is in the script, the fix with tests. One PR. I will run it via the owner-approved ops run.
Never weaken the backup check.

## 2026-11-08 13:15 — lead 3
Owner merged #2479 #2477 (and 8 others). #2398 green + APPROVED; nit: `speed-redirects.ts` spreads appointmentAlias("follow-up") and ("prescription") twice; remove the duplicates in a follow-up commit (keeps green). #2475: merge main now (LiveKit fix is on main). #2476: merge main, report the iOS provider result.

## 2026-11-08 12:45 — lead 3
#2475 shard 4 red = `curl: (92) HTTP/2 stream ... CANCEL` in the download step (old start-livekit.sh on that branch). Merge main into #2475 after #2479 lands. #2476 now green: report whether the provider iOS build actually ran the GoogleUtilities fix. #2398: merge main (lighthouse fix landed in #2376).

## 2026-11-08 11:15 — lead 3 (replaces the 10:45 top-priority note)
The LiveKit asset works again (200 at 11:10) and #2479's live gate is 5/5 green; #2479 reviewed + APPROVED, merge pending. Do NOT add the Docker Hub second source now; keep #2479 as is. After it lands, merge main into #2475 #2476 #2477 and re-run.

## 2026-11-08 10:45 — lead 3: TOP PRIORITY (blocks every PR's live gate)
Not a general GitHub outage: other GitHub release assets download fine (200), but `livekit/livekit` v1.10.1 `livekit_1.10.1_linux_amd64.tar.gz` has returned 502/503/504 since ~09:05 (still at 10:40, also from outside CI). Retries/cache alone cannot fix a cold cache. In #2479 add a second source for the SAME version and verify the SAME binary sha256 either way: e.g. copy `/livekit-server` out of the official Docker Hub image `livekit/livekit-server:v1.10.1` (pull by digest) when the release download fails. No version change unless both sources fail; no skipping the LiveKit step. Then get #2479 green; I will get it merged at once.

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
