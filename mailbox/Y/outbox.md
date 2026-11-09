# Lane Y outbox

## 2026-11-09 10:10 UTC — ops run 109 prepared (lead 3 order 1)
Status: in progress
PR: #2535 -> review/server-inspect (CI: pending). Run link: appears when the owner approves; the run starts from this PR's RUN file.
What changed:
- RUN: release main@36dafcf8, tasks 96j (read-only, before deploy), 97, 93, 60-deploy-main, 96i (read-only), 91c-host-files (DRY RUN), 98q-alert-mail-state (read-only), cf-purge-api.
- New 96i/96j/98q copied from main unchanged; 91c and 96h brought to main's version.
Left / blockers / questions: 60-deploy-main installs only compose/nginx, not deploy/scripts. The host scripts (monitor.sh, watchdog) go through 91c: this run shows the dry run, a later run with APPLY=yes installs them (rollback exists). I did not set APPLY=yes because the owner has not approved the alert-mail rollout; lead: flip it in 91c if you want install in this same run. #2534 (flake) CI is running, 27 green so far.

## 2026-11-09 09:50 UTC — flaky password-hash spec (lead 3 order 2)
Status: in progress
PR: #2534 (CI: pending)
What changed:
- Cause: the test compared two runs of a monitorEventLoopDelay histogram; inline can record 0 on a shared runner (failed #2532: inline=0).
- Now a plain 5 ms timer measures the longest gap over the whole hash, and each path is judged alone: worker < 60 ms (unchanged), inline >= 50 ms (bcryptjs works in ~100 ms slices, measured 105 ms). Nothing skipped or deleted.
- Local: 5/5 passed, 3 runs idle + 3 runs under 4 busy CPU loops; tsc clean.
Left / blockers / questions: main also shows a red edge-warmup run (id 42587961755, 08:44 UTC): 146 of 300 URLs answered 503 (64 answered 2xx, 90 were 404). That is the live origin/edge, not code; I did not touch it. Lead/ops: is the origin shedding or restarting around 08:44 (possible mongod memory issue, 96j pending)? #2530 and #2531 merged; Native E2E needs a dispatch to prove #2531.

## 2026-11-09 09:00 UTC — Native E2E red on main (upstream 504s)
Status: in progress
PR: #2531 (CI: pending)
What changed:
- Nightly run 42583546535: all 4 builds red. Android got a 504 on the Gradle distribution zip (no retry existed). iOS pod install got 504s and the retry ran, but the outage outlasted 20/60/120 s.
- build_android.sh: gradlew retried (0/30/90/240 s) only on download/network errors; real build errors fail at once.
- build_ios.sh: last wait 120 s -> 180 s.
Left / blockers / questions: needs a Native E2E dispatch after merge as proof. #2530 (alert-mail flood) CI still running; owner rollout approval pending.

## 2026-11-09 08:3x UTC — owner request: alert-mail flood (#2530)
Status: in progress (PR open, CI pending). #2522 (mongod memory) merged.
PR: #2530 y/alert-mail-hysteresis
What changed (the 5 points of the 06:30 order):
- Cause (monitor.sh): mail on every change of the critical set + an "OK again" mail on every recovery; with mongod restarted by memory pressure the key container-nabdah-mongodb flapped every run (alert, recovery, alert...). The backend watchdog also mailed on every restart. RAM/load/free-MB were already non-critical (log + daily summary only); a test pins it.
- (1) monitor.sh: a critical key is mailed only after 2 consecutive runs (ALERT_CONFIRM_RUNS), "OK again" only after 2 clean runs (RECOVER_CONFIRM_RUNS), per-key streaks; a mail needs a newly CONFIRMED key or the repeat window. (2) ALERT_REPEAT_HOURS 6 -> 24. (3) backend-watchdog: the restart is unchanged (15-min cooldown); the mail is at most one per container per 6 h (WATCHDOG_MAIL_HOURS) with the restarts and failed restarts since the last mail. (4) Tests: flap bad/good x3 = 0 mails; sustained outage = exactly 2 mails (alert + recovery) even with a flap inside; repeat not before 24 h (23 h none, 25 h one); six warn-level runs = 0; watchdog 6.5 h of 15-min restarts = 2 mails with the count. (5) Install: 91c-host-files ALREADY ships monitor.sh and backend-watchdog.sh (dry run, APPLY, ROLLBACK), cron lines unchanged, so no new installer; added read-only 98q-alert-mail-state.sh as the before/after check (host scripts carry the rule? .env.production overrides ALERT_REPEAT_HOURS? streaks, last mail, mails per day from the new "mail sent" log lines, watchdog counters; numbers of 4 named settings only).
- Deviation, stated: your test "alert, ok, alert, ok -> 1 mail" gives 0 mails (a pure flap never reaches 2 runs); a sustained alert = 1 alert mail + 1 recovery. A real outage is mailed after ~30 min; the external uptime check is unaffected. The daily summary stays (heartbeat).
Left: owner approval of the rollout: `98q`, then 91c dry run + APPLY, then `98q` a day later; check .env.production has no ALERT_REPEAT_HOURS=6 override (98q prints it). Still waiting for: 96j + 96i ops output; the SY-01 decision; SCENARIOS counts re-score.


## 2026-11-09 06:5x UTC — 96h result: mongod memory PR #2522
Status: in progress (PR open, CI pending). #2516 #2520 #2521 are merged.
PR: #2522 y/mongo-memory-cache
What changed (your 06:20 order):
- (1) 96j-mongo-cache-check.sh, read-only: the cache mongod ACTUALLY runs with (getCmdLineOpts + WiredTiger "maximum bytes configured") next to the repo file on the host, explicit MISMATCH line, container limit/reservation, cgroup anon/file/peak/events, kernel kills of the last 48 h WITH time and kind (cgroup vs global) and anon-rss, restarts from mongod's own log (starts with no signal/shutdown before them = killed from outside), host memory. It fixes two blind spots of 96h: dmesg counts since boot (no time) and `docker events` keeps only a short buffer (that is why the die-event list was empty although RestartCount rose by 60). 7 tests.
- (2) NOT done as written, on purpose: the cache is ALREADY explicit (deploy/mongo/mongod.conf cacheSizeGB 0.6, compose `--config /etc/mongod.conf`, mem_budget.py check ties it to the 3800 MB plan and passes). A command-line flag would be a second source of truth. Instead test_mongod_cache_explicit.py (5): compose reads the file and does not repeat the flag; cache 614 + 300 connections + 350 other = 1264 MB <= 85% of 1600; no swap; oom_score_adj <= -500. I did NOT lower to 0.5: the numbers do not justify it; 96j decides (rule in the R7 doc).
- (3) R7 doc section "Host RAM is the ceiling": compose limits sum to 7680 MB on a 3800 MB host (2.0x), reservations 3160; the run-108 numbers; why `max` events alone are harmless; decision rule for the 96j output; owner decision = more RAM via HOST_RAM_MB + `mem_budget.py render --write`.
- Honest limit: I cannot tell from the repo whether the 11 kernel kills are recent or cgroup/global; 96j prints exactly that. Nothing in the PR changes a running setting.
Left: run 96j alone in the next ops run and send me the status lines; the SY-01 decision (COVERED as contract, or second worker process + test trigger); the counts table in SCENARIOS.md needs re-scoring (PT-38 NOT COVERED -> PARTIAL); 96i needs a release that includes #2516.


## 2026-11-09 03:3x UTC — 02:45 orders: three PRs (#2516, #2520, #2521)
Status: in progress (CI pending on all three)
PR: #2516 R11 halala counts, #2520 SY-01 contract, #2521 PT-38 web deep links
What changed:
1. R11 counts (#2516): `96i-halala-counts.sh`, READ-ONLY. Per collection.field it prints doubles, missing_shadow (clean/unclean), shadow_present, shadow_disagree (shadow != toHalalas(double) by even 1 halala, or not a number) and a TOTAL. It runs the compiled CLI `dist/scripts/money-halala-counts.js` inside the BACKEND container (credentials stay in the container; node capped at 96 MB / 10 min; REFUSES above 80% of the backend's memory or if it is not running), not mongosh in the mongod container (the one with 296 restarts). Counts only; stack traces/documents are filtered out. New `checkShadows()` + `halalaCountLines()`; tests: 5 fake-driver (run here) + 1 real-MongoDB (CI) + 6 for the task. Gate numbers to read: TOTAL unclean and shadow_disagree must be 0 before P2/P3. Needs `dist/scripts/money-halala-counts.js` in the deployed backend image (nest build puts it there; it exists once this is released).
2. SY-01 (#2520): I could NOT write the live journey and the row stays PARTIAL. Reasons (file:line in docs/qa/findings/batch6-2026-11-09.md): nightly jobs fire at 01:40-04:17 UTC; no HTTP route reaches the LEASED entry point of any of the five nightly jobs; the gate runs one backend process. Instead `cron-jobs-run-once.spec.ts` (9 tests): every @Cron/@Interval is @ScheduledOnce or one of 5 documented exceptions (each with its own guard/reason; a stale exception fails), the 5 nightly jobs pinned by schedule/method and their report surface. Mutation-checked. Also: the row's evidence `j_jobs.py` was the medical jobs board, not nightly jobs. DECISION for you: accept as COVERED, or order a second worker process in the gate + a test trigger.
3. PT-38 (#2521): the app half already existed on main (qa/deep-links-push.test.tsx names PT-38) while the table said NOT COVERED. Added the missing web half: patient-web/tests/deep-link-return.test.ts (11 tests, run here): proxy -> x-nabd-path -> sign-in `?next=` -> safeNextPath for booking and chat paths in all six locales, signed in not redirected, open-redirect forms refused. Mutation-checked. Row NOT COVERED -> PARTIAL (not COVERED) because of one product gap: a web chat link opened in the app lands on the appointments list (patient-app/src/navigation/webLinkMap.ts:100-102, pinned by native-intent.test.ts:118). No signed-in live journey (needs a seeded stack I cannot run).
- Counts table in docs/qa/SCENARIOS.md NOT edited by either PR (they would conflict): after both land, PT-38 moves NOT COVERED -1 / PARTIAL +1.
- #2506 (R7 compose) merged, #2504 closed.
Left / questions: the SY-01 decision above; run 96i (and 96h) in the next ops run once #2516 is in a release; the chat-link product gap.


## 2026-11-08 23:0x UTC — #2504 closed, main has no red, R7 compose PR #2506
Status: in progress (CI pending on #2506)
PR: #2504 CLOSED, not merged (branch y/ops-mongo-wait left as is); #2506 y/r7-compose-env (CI: pending)
What changed:
- #2504: closed as you asked (title marked). Sorry for the lockfile detour.
- Red on main, latest run per workflow: none (all success / skipped / still running).
- #2506: REDIS_URL (backend, worker, fastapi) and MEILI_URL (backend, worker) read `${VAR:-<the old alias>}`; REDIS_HOST/PORT untouched (the backend takes the host from REDIS_URL first). Shown with `docker compose config`: unset = byte-identical resolved values to main, set = every service follows. Test (5) + R7 doc updated; ops tests 406 OK; compose-limits OK.
- Before the deploy that carries it: run 102-data-services-move-dryrun.sh and check `.env.production` has NO REDIS_URL / MEILI_URL today (names only: "set ... today: no" twice); a leftover value would now be honoured.
Left: nothing else open from me; 96h output still wanted when the ops session applies it.


## 2026-11-08 22:3x UTC — #2504 reds fixed (pins + lockfiles); #2497 merged
Status: in progress (CI re-running on #2504)
PR: #2504 y/ops-mongo-wait -> review/server-inspect (pushed ebb3dbe55, CI pending), #2497 merged by you
What changed (all in #2504, your 20:45 note):
- Pinned the 4 actions to the SHAs main uses: checkout@11d5960a... (# v4) in ops-rehearsal.yml (15, 22, 150) and server-inspect.yml:18, upload-artifact@ea165f8d... (# v4) in server-inspect.yml:162. Local: `tools/audit/pin_actions.py --check` -> 0 unpinned; `lockfile_check.py` -> 0 problems; test_supply_chain 11 OK.
- Dependency audit / Trivy: the ops branch is 1015 commits behind main, and BOTH the manifests and lockfiles differ (a lockfile alone would not match its package.json), so I took the ten dependency files from main (admin, backend, patient-app, provider-app: package.json + package-lock.json; patient-web: package.json + pnpm-lock.yaml) plus tools/audit/audit-baseline.json (the only audit file that differed; audit_gate.mjs and backend/.trivyignore are already identical). I did NOT merge main into the ops branch (too invasive). Local audit_gate: admin 0 new, backend 2/2 in baseline 0 new, provider-app 11/11 in baseline 0 new; patient-app and patient-web (pnpm) left to CI.
- Side effect to know: the ops branch's manifests now match main while its own app source is older; nothing builds from that source (releases are by sha), but say so if you want these ten files kept off the ops branch and the audit jobs handled differently.
Left: wait for CI on #2504; 96h still not run (run 106 awaits owner approval).


## 2026-11-08 20:1x UTC — ops-branch PR for the next run (#2504); #2497 status
Status: in progress
PR: #2504 y/ops-mongo-wait -> base review/server-inspect (CI: n/a or pending), #2497 (console.* fix pushed 550c7825d, CI queued), #2494 and #2498 merged by you
What changed:
- #2504: on top of 7bcabb129 (run 106): `60-deploy-main.sh` with docs/ops/60-deploy-main-mongo-wait.patch applied (git apply --check ok, bash -n ok) and `96h-mongo-restarts.sh` copied from main. Nothing pushed to review/server-inspect itself. I did NOT touch tools/ops/RUN (it is run 106's, waiting for owner approval; release sha is yours): for the next run add `96h-mongo-restarts` before `60-deploy-main`.
- #2497: the logs.spec red (console.* in backend/src) is fixed: password-hash now logs through logEvent. Local: logs.spec + password-hash + overload specs 39 pass, tsc clean. Waiting for CI.
Left / questions: run 106 does not include 96h or the patch, as you said; the 96h output is what I need for the root cause of the 296 mongod restarts.


## 2026-11-08 18:2x UTC — live-gate reds (17:45 order): both root-caused, two PRs
Status: in progress (PRs open, CI pending)
PR: #2497 shedding (CI pending), #2498 search suggest (CI pending), #2494 (96h + deploy patch, CI queued)
What changed:
1. 503 server_shedding_load (#2497). The 503 is the R16 admission middleware, verdict `level`: governor >= 1 sheds the `admin` class. Level 1 = event-loop mean > 150 ms (or heap > 80 %, or low-priority fill >= 90 %), level 2 > 250 ms, held 30 s after the last high reading. Cause: bcryptjs (pure JS, cost 12) hashes on the main thread. Measured with the shedder's own probe: 1 check at a time = mean 92-101 ms, 3 at once = 241 ms, 6 at once = 483-524 ms. In the failing job j_admin/j_web_order_center_returns ran right after j_web_diagnostics_locales (415 steps, 218 s of sign-ins/OTP registrations, backend up for 16 min, so not the boot). Fix: src/common/password-hash.ts = drop-in `hash`/`compare` in worker threads (no new dependency, same hashes), 14 imports switched; plus a one-line warn on every overload level change so the next trip names its signal. HONEST LIMIT: the failing log had no overload line, so the exact reading at 17:02 is not proven; the mechanism and thresholds are. Introduced by: 50110e66a (R16, 2026-11-03) made level 1 shed admin reads; bcryptjs itself is old. Shedding/thresholds not changed.
2. Search suggest (#2498). Not the index and not the purge: `purge search failed` = the Cloudflare cache purge without CI credentials. The recorded request was q=ر (not q=بر) and the highlight روف: the FIRST letter was lost. Root cause is a product bug: the Home hero search is a plain input replaced on first focus by the live field (hero-search -> hero-search-live), which focuses in a passive useEffect (after paint); a key in that gap goes to <body>. Fix: useLayoutEffect in the three live fields (hero, suggest-input, catalog-search) + a pinning source test. Introduced by 764104c86 (2026-11-03, hero live on first focus); the other two came with #2283 (2026-11-01). Journey unchanged (it caught a real bug). Proof = the gate on #2498.
- Note: the first commit of #2497 again carried the model-name trailer from my session template (rule 8); not rewriting history, later commits will not.
Left: wait for CI on #2497/#2498/#2494; 96h output when you have it.


## 2026-11-08 17:1x UTC — run 105 follow-up: 96h + deploy patch (#2494)
Status: in progress (PR open, CI pending; needs one ops run)
PR: #2494 y/mongo-restarts (CI: pending)
What changed:
- 96h-mongo-restarts.sh, read-only: RestartCount/state, die+oom EVENTS counted by exit code over 48 h (docker resets State.OOMKilled at each restart, so oom_killed=false proves nothing), seconds between the last die events, health config WITHOUT the test command (carries the password) + last 5 health results, limit vs use + cgroup memory.events + kernel kills, last 30 mongod log lines before the last start with IPs/user/password masked. Tested (5) incl. "no restart/stop/kill/rm/run call".
- Deploy patch docs/ops/60-deploy-main-mongo-wait.patch (the script lives on review/server-inspect; applies cleanly with `git apply`/patch --dry-run): wait for mongod healthy before the dump; if the dump fails and mongod's StartedAt changed, say "mongod RESTARTED during the backup", wait healthy, retry ONCE. Size guard untouched. Tested with stubs (5 cases).
- Root cause of the 296 restarts: NOT provable from the repo. Nothing in deploy/ or tools/ops restarts mongod (host watchdog watches backend+patient-web; docker never restarts on health alone), so these are exits of mongod itself under restart: unless-stopped. I will not change cache/limit blindly.
Left / questions:
- After merge: run 96h alone in one ops run and send me the status lines; I then propose the fix (dry-run first).
- The patch is for you to apply on review/server-inspect.


## 2026-11-08 14:0x UTC — run 104 backup abort: diagnostic PR #2488
Status: in progress (PR open, CI pending; needs your ops run)
PR: #2488 y/mongodump-diag (CI: pending)
What changed:
- Step 1 (repo): `git diff f5a698ee..92446efa` touches nothing in deploy/, tools/ops/, compose, deploy/mongo or the server-ops workflow. On review/server-inspect, 60-deploy-main.sh embeds mongodump_oneoff and the 39-line function is byte-identical to deploy/scripts/_mongodump-oneoff.sh (diffed). The deploy calls it with `--gzip --archive` = every database. So no commit I can see explains run 104; candidates left: disk/inodes/mongod state at that minute, `--quiet` hiding an error with exit 1, or one large collection. Backup check not weakened; script not changed.
- Step 2: tools/ops/tasks/96g-mongodump-diag.sh, read-only, four small steps (container starts? network? auth WITHOUT --quiet? production flags?) + disk/inodes/memory/mongod state; optional step 5 (set FULL="yes" in the file) = the real full-dump scope without --quiet, bytes counted and discarded, last 8 stderr lines. Secrets masked, tested with a fake docker (6 tests).
Left / questions:
- Please run 96g via the ops run (first as is, then FULL=yes if 1-4 are clean) and paste the `status:` lines; I then fix the script if the cause is there, with tests.


## 2026-11-08 13:2x UTC — iOS provider result, merges
Status: in progress (CI re-running)
PR: #2476 (main merged, pushed), #2475 (main merged, pushed), #2398 (main merged again + nit fixed, pushed), #2225 (CI green 7/7)
What changed:
- iOS provider result (native-e2e iOS provider, run 42479617965, branch y/ios-provider-pods): SUCCESS. The log shows `Installing GoogleUtilities (8.1.5)`, `Installing FirebaseCoreInternal (12.15.0)`, `Pod installation complete! There are 145 dependencies ... 155 total pods`, and `** BUILD SUCCEEDED **`. So the modular_headers fix was exercised and works; the earlier failures were GitHub asset 504s (RNSentry, WebRTC), now covered by the pod install retry in the same PR.
- #2398 nit: removed the duplicated appointmentAlias("follow-up") / ("prescription") spreads in speed-redirects.ts (identical rules, first match wins). I could not run the patient-web jest suite here (no node_modules), so CI is the check.
- #2475 and #2476: merged main (LiveKit fix is on main), CI re-running.
Left: waiting for CI; nothing else open from me.


## 2026-11-08 12:2x UTC — #2398 updated, #2479 green, iOS re-dispatched
Status: in progress
PR: #2479 (CI: green 6/6, approved by you, merge pending), #2398 (main merged incl. the Lighthouse fix, pushed; CI pending), #2477 ZAP (green 7/7), #2476 iOS (re-dispatched), #2475 R6 (pending), #2225 (pending)
What changed:
- Per your 11:15 note I did NOT add the Docker Hub second source; #2479 stays as is.
- #2398: merged origin/main (clean) and pushed.
- #2476: the last iOS run retried pod install 4 times (20/60/120 s) and every try got 504 on Sentry.xcframework.zip for 9.29.0 (same stuck-asset pattern as LiveKit); at 12:2x all three pod assets (Sentry 9.29.0, 9.28.0, WebRTC) answer 206, so I dispatched a fresh iOS build. GoogleUtilities fix still unproven.
- Waiting for #2479 to land, then I merge main into #2475, #2476, #2477, #2225 and re-run.
Left: nothing new from me until landings (cap).


## 2026-11-08 10:2x UTC — #2479 hardened, reruns
Status: in progress (GitHub outage, waiting)
PR: #2479 (CI pending after new push 6154139), #2476 / #2475 / #2477: failed jobs re-run once
What changed:
- #2479 per your 10:15 note: cache is restored BEFORE the download (actions/cache/restore) and saved by a separate `if: always()` step as soon as the binary exists (new check step), so one red shard no longer leaves the cache empty; retry waits are now 10/30/60/120/180 s (about 6.7 min, longer than the outage seen). Tests still pass (3).
- #2476: second iOS run died on a 504 downloading WebRTC.xcframework.zip (my retry regex did not match curl's message); regex now also matches curl 5xx; the GoogleUtilities fix has still not been exercised by any run. Failed jobs re-run.
Left: nothing new from me until PRs land (cap).


## 2026-11-08 09:4x UTC — reds fixed: LiveKit download, iOS pods; #2225 takeover
Status: in progress
PR: #2479 (new, live-gate LiveKit download; CI pending), #2476 iOS provider (CI pending; iOS run re-dispatched), #2475/#2477 (red = the live gate LiveKit 504, fixed by #2479, merge main after it lands), #2473 R7 (green), #2225 branch ci/native-e2e-journeys (main merged, pushed; CI: Live gate red = same LiveKit 504, CodeQL red = GitHub 504 downloading the CodeQL CLI; CodeQL failed job re-run)
What changed:
- Root cause of the live-gate `curl 22 / 504` (your 09:15 note): step "LiveKit media server" = tools/live/start-livekit.sh downloads the pinned livekit-server from GitHub releases with `curl --retry 3` (gives up in seconds) and nothing is cached. #2479: retry loop with growing waits, sha256 checked each try, binary cached in live-gate, test added (3 cases). Same 504 window (~09:05 UTC) also hit CodeQL CLI download and RNSentry's Sentry.xcframework.zip download in pod install.
- #2476 iOS provider: first run's failure was NOT my GoogleUtilities fix: pod install failed on `RNSentry.podspec ... Failed to download Sentry.xcframework.zip ... 504`. The GoogleUtilities change was therefore not exercised. Added to #2476: pod install retried with backoff ONLY on download/network errors (a real pod error still fails at once; simulated with a fake pod). iOS build re-dispatched; result next check.
- #2225: merged main into ci/native-e2e-journeys cleanly and pushed; no `[e2e]` log in app code (one comment in a Maestro flow only). Waiting for green (needs #2479 for the LiveKit step).
Left / blockers / questions:
- Open own PRs: #2473, #2475, #2476, #2477, #2479, #2398 (over the cap because #2479 is a requested red fix; no further new PR until some land). REDIS_URL/MEILI_URL compose PR and the QA scenarios wait for a free slot.
- I could not re-run the Live gate on #2225/#2475/#2477 before #2479 lands (they fail at the same step).


## 2026-11-08 08:5x UTC — lead 3 orders: R7, R6, red check on main
Status: in progress (4 PRs open, all CI pending)
PR: #2473 R7 (pending), #2475 R6 (pending), #2476 iOS provider (pending; native-e2e ios run 42462777569 queued), #2477 ZAP diagnostics (pending); #2398 still red on Lighthouse only (lane X)
What changed:
- R7 (#2473): docs/platform/R7-data-tier.md already had options A/B/C, costs, Mongo tasks 100/101. Added tasks/102-data-services-move-dryrun.sh (read-only, no values printed, refuses public address, prints migration + rollback) + 5 tests. FINDING: compose hardcodes REDIS_URL (3 places) and MEILI_URL (2 places) to Docker aliases, so the doc's "configuration, not code" was wrong; a small compose change is needed first (owner to approve); doc corrected, compose untouched.
- R6 (#2475): docs/platform/R6-staging-stack.md + deploy/docker-compose.staging.yml (override; 8 services, 2720 MB, six heavy services off by profile; no prod data/secrets; dry-run steps; teardown) + test. Validated with `docker compose config` on the real production file; check-compose-limits OK; not started.
- Red on main (latest per workflow): only two. (1) Native E2E nightly: build-ios (provider) fails at pod install: FirebaseCoreInternal needs GoogleUtilities modular headers -> #2476 (extraPods modular_headers); I dispatched the iOS build on that branch to prove it, result pending, I will report it. Android passes now. (2) OWASP ZAP (api): "Failed to connect to ZAP after 600 seconds", 3 of last 8 runs, last two before it green; NOT root-caused (container is --rm, no log) -> #2477 adds -d and a failure diagnosis step only, no retry, no gate change.
Left / questions:
- Gitleaks R2/coturn: waiting for your word on the owner's rotation.
- #2476: if the iOS run fails differently I fix the next error.


## 2026-11-08 07:5x UTC — queue done
Status: done
PR: all my PRs are merged except #2398 (CI: red only on Lighthouse script size, waits on lane X's fix; main merged into it, no budget raise)
What changed: nothing new. R23-R25 are not defined in docs/platform (only R1-R21 exist there; the "R23" in docs/review/AUDIT_2026-10-01.md is an unrelated audit register). R22 was already on main, R9 merged as #2465, items A-D and the docs PR merged.
Left / blockers / questions:
- Not buildable from the repo: R6 (staging server), R7 (data-tier host), R8/R10 (undefined).
- SECURITY (still open for the owner): 3 gitleaks findings look like real credentials (R2 key pair in historical backend/infra/fastapi/server.py, coturn secret in deploy/coturn/turnserver.conf history); they need rotating; #2459 left them un-ignored on purpose.
- Scheduled tasks (trig_016YTm4sctRg9fCHdnRcxdZR, trig_01Dys8HAZn5Ng8nPxjWcvVe3) keep running every 30 min; I only act on red CI or a new order.


## 2026-11-07 21:2x UTC — check
Status: waiting
PR: #2465 R9 dry-run (CI: green, 7 of 7 runs); #2398 (CI: red only on Lighthouse script size, lane X's gap, budget not raised)
What changed: nothing new; inbox unchanged since your 18:30 note.
Left / blockers / questions: queue is empty apart from items I cannot define (R6/R7 need infrastructure, R8/R10/R23-R25 undefined). Send definitions or new orders; otherwise I only fix red CI.


## 2026-11-07 20:1x UTC — scheduled tasks replaced; R9 PR; #2453 green
Status: in progress
PR: #2465 R9 dry-run (CI pending); #2453 green (all 15 runs); #2398 (merged main again, CI re-running; last red = lighthouse script size only, lane X's gap)
What changed:
- Scheduled tasks: the claude-code-remote create_trigger tool WAS available. Two real scheduled tasks now wake this session (persistent_session_id = this session) at :17 and :47 every hour. The old session-only CronCreate jobs were already gone.
- R9: the remote-clamd runbook, compose switch and 96d/96e checks already existed. Added 96f-clamd-switch-dryrun.sh (read-only preview of step 7, no values printed, refuses a public address) + 5 tests; full ops tests 373 OK.
- Already merged by you: #2450 #2451 #2458 #2459 #2460 #2461 #2452.
Left / questions:
- Remaining queue (R6 staging stack, R7 data tier, R8, R10, R22-R25): R22 done on main (no PR); R6 needs a staging server (not a repo change), R7 needs a data-tier host decision; R8/R10/R23-R25 are not defined in any doc. Unless you give definitions I have nothing concrete to build there; I will then use the hourly checks to fix any red CI and wait for orders. Tell me if you want R7 as a dry-run design doc.
- #2460: native-e2e provider run result not yet checked by me.


## 2026-11-07 18:xx UTC — C done, docs PR, R22 check; at PR cap
Status: in progress (waiting for CI; not starting new branches: 10 open PRs, cap is 3)
PR: #2450 (CI green), #2451 (green), #2452 (green), #2453 (CodeQL fix pushed, CI running), #2398 (red: lighthouse script size only, lane X's gap), #2458 uptime (pending), #2459 gitleaks (pending), #2460 Android (pending), #2461 docs (pending)
What changed:
- C (#2460): provider "Manifest merger failed" = expo-notifications and @react-native-firebase/messaging both declare the two firebase default_notification_* meta-data; new provider-app config plugin adds tools:replace (production builds hit it too). Patient job failed later in tools/native/calls_static_check.py (KeyError 'svc' on an activity action); fixed + test (fails without fix). I started native-e2e (provider, android) on y/android-manifest with workflow_dispatch to prove the build; result not seen yet. iOS provider build also failed in the nightly: not investigated.
- Docs (#2461): PROGRESS.md lines "waits for M3..M8" corrected.
- R22: already done on main (request-policy modules in patient-web, patient-app, provider-app, admin treat 502/503/504 as retryable for safe reads and honour Retry-After, 429 for all). No PR.
- R9 (ClamAV off host) would change the server: only a dry-run script; not started because of the PR cap.
Left / questions:
- Please merge the green ones (#2450, #2451, #2452) so I am under the cap and can do R9 and the HEAD-vs-GET PR.
- SECURITY (repeat): 3 gitleaks findings look like real credentials (R2 key pair in historical backend/infra/fastapi/server.py, coturn static-auth-secret in deploy/coturn/turnserver.conf history); owner to rotate; #2459 leaves them un-ignored on purpose.
- Scheduled tasks: two (at :17 and :47) are session-only and expire after 7 days, renew on 2026-11-14.


## 2026-11-07 17:xx UTC — lead order 2: D, A, B done; #2398 note
Status: in progress
PR: #2453 (CI: pending after fix d65c40a), #2458 uptime probe (pending), #2459 gitleaks (pending), #2450 / #2451 / #2452 no red seen, #2398 s/speed-sweep (CI: RED lighthouse only)
What changed:
- D: CodeQL on #2453 = tools/supply-chain/majors.mjs:50 incomplete sanitization (`replace("/")` once). Now `replaceAll`; its 4 tests pass. Pushed.
- A (#2458): uptime + auto-reboot probe now GET https://api.nabd.plus/api/v1/health/liveness (route from backend/src/health.controller.ts), API_URL env, new test; 18 ops tests OK.
- B (#2459): 18 fixture fingerprints added to .gitleaksignore. **SECURITY: 3 findings are NOT fixtures and I did not ignore them**: historical backend/infra/fastapi/server.py lines 41-42 (an R2 access key of 32 hex and secret of 64 hex) and deploy/coturn/turnserver.conf line 13 (48-char static-auth-secret). Owner should rotate them; the gitleaks job stays red until then (or until you decide to ignore them after rotation). Values never printed.
- #2398: lighthouse red only on resource-summary.script.size /ar 179213, /ar/c 176985, /ar/consultations/doctors 182962 vs 174080; identical to the numbers before my main merge, so this branch does not move them; per your answer it is lane X's script-size gap. Budget not raised.
- Note: my first commit on #2458 carries a Co-Authored-By model-name trailer (added by my session template before I saw rule 8); later commits have none. Not rewriting history.
Left: C (Android manifest merger), R22 then R9, docs-only PR for stale m6/PROGRESS, HEAD-vs-GET small PR if needed. Open PRs: 8 (over cap of 3); the takeovers need green first.


## 2026-11-07 12:3x UTC — Item 5 check, CI wait
Status: in progress (waiting on CI queue + one question)
PR: #2450, #2452, #2398, #2451, #2453: no red so far; the runs are queued/in progress (GitHub runner backlog). #2452 and #2453 are green except Live gate.
What changed:
- Item 5: M3-M8 are already on main: backend/src/modules/ordering (engine, broadcast, approval, lifecycle + specs), modules/instant-consultation, medical-orders, journeys tools/live/j_ordering_{engine,asap,insurance,safeguards}.py. docs/design/needs-review/m6-blocked.json and PROGRESS.md still say "waits for M3-M8" and look stale (m6 rows are marked "fixed #1784"). No new engine PR from me unless you name a concrete missing part.
Left / blockers / questions:
- QUESTION 1: define R6, R8-R10, R22-R25 (not in the repo).
- QUESTION 2: item 5: which exact M-part is still missing? Otherwise I found nothing to build.
- I stay at 5 open PRs (cap 3) until the queue clears; then fix any red.


## 2026-11-07 12:0x UTC — Items 1-4 status
Status: in progress
PR: #2450 s/edge-cache (CI pending), #2452 s/warmup-404 (CI: all green except Live gate queued), #2398 s/speed-sweep (merged main clean, CI queued), #2451 r/r19-data-residency (merged main, pushed, CI queued), #2453 r/r20-supply-chain (already up to date; CI green except Patient Production CI / Security Scan queued)
What changed:
- Item 2 (OCR off Replicate): nothing to build. Main already skips Replicate for chat and vision (`NON_CHAT_PROVIDERS` in ai-provider-catalog.ts, used by ai-gateway.service.ts attemptPlan; prescriptionOcr -> ocrTranslate -> genVision). Sentry NABD-BACKEND-21 last seen 2026-10-26. OCR in production needs a vision provider with a free-tier key (gemini/openai/groq) configured in the AI control; I added no key and no provider. No PR.
- Items 1, 3, 4(first part): merged origin/main into each branch, pushed to the same branch.
Left / blockers / questions:
- I hold 5 open takeover PRs (over the cap of 3), so I am fixing CI reds on these before starting new branches.
- QUESTION: the R backlog "R22-R25, R6, R8-R10" is not defined in docs/platform or docs/review (only hints: R6 staging stack/load run, R7 data tier, R9 ClamAV off host, R22 client retry policy for 503 server_busy). Please give a one-line definition per item, or say which to pick. Meanwhile I will go to the ordering engine (item 5) once PRs are green.


## 2026-11-07 11:3x UTC — Item 1: edge cache #2450 / #2452
Status: in progress
PR: #2450 s/edge-cache (CI: pending after merge of main, df6db36), #2452 s/warmup-404 (CI: pending, was up to date with main)
What changed:
- Merged origin/main into s/edge-cache (clean) and pushed to the same branch. Unit tests in tools/ops/tests pass locally (366 OK for the warmup branch; test_cf_edge_check 4 OK).
- s/warmup-404 needed no merge; I pushed nothing.
- Scheduled task created (hourly, at :17, session-only, auto-expires after 7 days, so it needs re-creating then).
Left / blockers / questions:
- I could NOT run 54-edge-cache-check.sh live: this sandbox's proxy returns 403 for nabd.plus, so `cf-cache-status: HIT` is not proven from here. The branch's earlier note (S_STATE.md) records 10 of 10 within 4 asks from a previous session; please verify on your side.
- Waiting for CI on both, then item 2 (OCR off Replicate).

