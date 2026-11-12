# Lane B outbox (newest on top)

## 2026-11-12 17:18 UTC — #2628 and #2629 MERGED; invoice pass over the other services done (one finding, not changed)
Status: done; waiting for orders. Open PRs of mine: 0.
Merged: #2628 provider suspend/reject login demotion, #2629 translation lock (apply on the server by re-running task 99, APPLY=yes).
Invoice pass, other services: there is ONE invoice writer (billing.module.ts); every service (consultation/appointment, lab, radiology, nursing/home-care, pharmacy incl. broadcast orders, insurance co-pays via the insurance request) goes through issue()/issueCreditNote(); no other module writes invoices (pdpl, halala-backfill, tax-registration only read or reference them). Coverage by kind is tested for the main kinds in billing-invoice-api.spec.ts.
FINDING (low, no client affected, NOT changed): the card payment API (moyasar resolveBookingAmount) accepts booking_kind aliases that billing does not know: orders, labs, home-care, homecare, insurance-copay, copay. A payment made with one of them would store the alias in transactions.booking_kind, billing would skip the invoice (unsupported kind) and could not find its payment. Every client I grepped (patient-app, patient-web, provider-app) sends canonical kinds only (pharmacy, lab, consultation, radiology, nursing, appointment), so nothing is lost today. Fix if you want it: canonicalise the kind when the payment is created (one map in moyasar createPayment, same mapping billing uses) + one test; I did not do it because downstream payment listeners match on the stored kind and I have not audited them all.
Still open for you/the owner: Cloudinary option (a-d), credit-note QR sign, wording for canceled/expired checkout, run 116 follow-up numbers, installing deploy/cron/nabd-backups (disk guard) and re-running task 99 on the server.

## 2026-11-12 16:19 UTC — queue 7 nothing to do; #2629 translation lock; #2628 CI
Status: in progress
Queue 7 (SCENARIOS.md): every PV/AD/SY row is already COVERED, AD-02 included (j_review_rating.py: approve, reject with reason, refusals, resubmission). The only row not COVERED is PT-24 (PARTIAL: the real OS handing the link to the app, device farm only). Nothing to build.
#2629 b2/translate-one-at-a-time (CI pending): the daily translation resume already runs once a day 00:30 UTC (03:30 KSA) in the worker container with a health + hash guard; it had no overlap guard, so I added flock (a second run skips and logs it). Takes effect on the server when you re-run task 99 with APPLY=yes.
#2628 provider gate: Backend build and tests + all other completed checks green; live gate shards 1-5 still running at my last read.
Open PRs: #2628, #2629. Remaining ideas, in my order: invoices pass over the other services' invoice paths; run-116 follow-ups once you give me new numbers. Waiting on your answers: Cloudinary option, credit-note QR sign, canceled/expired wording.

## 2026-11-12 15:54 UTC — queue 5 PR #2628, queue 6 verified clean
Status: in progress (waiting for CI on #2628)
PR: #2628 b2/provider-suspend-login (CI pending). Queue 5: the central gate (403 provider_approval_required for every non-approved provider-scope token except the 6 onboarding paths; reason via /provider-onboarding/progress) was already right for pending/rejected/needs_changes/suspended. THE HOLE: approve flips the users row of the login to the provider role, and the gate only checks scope 'provider' tokens, so a SUSPENDED provider kept working through the patient login (user-scope token, role doctor/pharmacy...) and suspend never revoked that login's sessions. Fix: suspend and reject (suspended -> rejected) demote that users row (only if it really holds the provider role) to guest + bump token_version; reactivate restores the role. Provider-scope sign-in, reason and resubmit path unchanged. 4 tests; jest src/modules/provider 66 suites / 427 tests pass.
Queue 6 (DTO leftovers), rechecked on main: test_prices/scan_prices are already `@IsPriceMap` (Record<string, number>), /hospital/staff is in one controller since #2615, dtolint 0/0, dtocheck from the repo root: 718 DTO routes, 0 mismatches (2 'verify by hand' lines in patient-app pharmacyOrderSend.ts, not mismatches). I found no open nursing settings/delta DTO gap; if you have the exact route, tell me.
Next: queue 7 (AD-02 reject/changes journey), 3b (jobs one at a time), invoices pass over the other services.

## 2026-11-12 15:48 UTC — all 7 PRs MERGED; starting queue item 5
Status: in progress
Merged on main: #2617 credit notes, #2618 TLV guard, #2619 PT-24 money tests, #2623 /config+/modules, #2624 flapping digest, #2625 product equivalents, #2627 disk guard. Open PRs of mine: 0.
I did not tick lead/LAUNCH_LIST.md (RULES say outbox only): invoices review is only partly done (billing module: numbering, credit-note cap, VAT residual, QR length; the other services' invoice paths not reviewed) and PT-24 has the money-side unit tests but not the browser journey, so neither is honestly complete.
Reminder for you: install deploy/cron/nabd-backups (disk guard line) on the server; deploy main for the P0 fixes; check MONGO_MAX_POOL_SIZE on the running containers. Open questions still unanswered: Cloudinary option (a-d), credit-note QR sign, canceled/expired gateway status wording.
Next: queue 5 (server gate for REJECTED/pending providers), then 6 (DTO leftovers), 7 (AD-02), 3b (jobs one at a time).

## 2026-11-12 14:19 UTC — CI read: #2623, #2624, #2625, #2627 all GREEN
Status: waiting for the lead to merge
PRs green (every check completed success, incl. live gate 1-5 and Backend build and tests): #2623 /config + /modules (kill-switch fix included), #2625 product-equivalents load, #2624 flapping-alert digest, #2627 disk guard (its own `guard` workflow also green). Suggested order: #2623, #2625, #2624, #2627.
Not yet read: #2617, #2618, #2619 (older PRs; main was merged in by you at 08:55). I will read them next.
Nothing else started: PR cap (7 open). Waiting on: your merges, run 116 follow-up numbers, owner pick for Cloudinary, the TLV/credit-note QR question.

## 2026-11-12 12:50 UTC — #2623 is GREEN (ready to merge)
Status: done, waiting for the lead
PR: #2623 (b2/p0-config-modules-cache, head 12be8b58): all 33 checks completed success, incl. live gate shards 1-5 (the kill-switch / maintenance journals that failed before the fix) and Backend build and tests. PR description updated to match the fixed design.
Others: #2617 #2618 #2619 #2624 #2625 #2627: I have read CI for #2623 only; I will read the rest on the next checks and report any red.

## 2026-11-12 10:49 UTC — #2623 fixed (kill switch / maintenance bug)
Status: in progress, waiting for CI on #2623
You were right: my 5 s cache on the /config flag rows (and app_versions, which carries maintenance) hid a switch-off for up to 5 s per process. Fixed and pushed on b2/p0-config-modules-cache (main merged in): the flag rows and app_versions are no longer served from a fresh cache at all (CONFIG_CACHE_MS default 0); what stays is (a) concurrent requests share ONE running read, (b) the last good copy only when the read fails or takes over 1.5 s. StaleCache.clear() now also drops a load already running, so a write is never overwritten by an older read (/modules uses that after an admin write, in the same process; across processes it keeps its existing 2 s TTL, unchanged).
Tests added: a flag written between two /config calls is in the next response, and so is a raised maintenance flag (default settings); clear() during a running load. Local: config + module-switches + stale-cache: 3 suites, 26 tests pass; tsc clean. I have not run the live gate (j_admin_kill_switches) here: its result on this push is the real proof.
Other PRs: #2627 (disk guard) opened, CI pending. I have not seen CI results for #2617 #2618 #2619 #2624 #2625.

## 2026-11-12 09:18 UTC — disk retention: PR #2627
Status: in progress
PR: #2627 b2/p0-disk-guard (CI pending): daily `deploy/scripts/disk-guard.sh` (cron 05:20 UTC line added to deploy/cron/nabd-backups; you install it on the server). Below 25 % free: build cache, dangling + unused (>7 days) images, release dirs beyond current+previous, journal to 100 MB. Never backups/volumes; exit 2 + message if still under 20 % (then 97c by hand). 5 tests + workflow.
Other PRs: main was merged into #2617 #2618 #2619 #2623 #2624 #2625 by you; I did not push over them. Their CI is re-running; I have not seen the results yet. P0 order for merge as you said: #2623, #2625, #2624.
Not started: P0 item 3b (catalogue/translation jobs one at a time, off-peak); queue 5.

## 2026-11-12 07:19 UTC — run 116 root cause applied: PR #2625
Status: in progress
PR: #2625 (CI pending). Open: #2617 #2618 #2619 #2623 #2624 #2625 (over cap, P0). #2613/#2615/#2603 merged. Main does not have the ubuntu-24.04 pin yet; I will merge main into my PRs when it does.
Found: the `medicines` reads that preceded each OOM kill are `publicProductEquivalents` (the block under every /p/[slug]): unindexed active_ingredient regex over every public medicine (docs=10k-21k) and the class-scope usage_count sort (the 25.8 s one), once per hit, no time limit. #2625: cached 30 min + single-flight + maxTimeMS(3000), slow query degrades to empty (60 s), 404 uncached. The other public medicine reads are already capped (limit <= 500, maxTimeMS on the category shards).
Pool caps (your item 1): already in deploy/docker-compose.production.yml (api 55 / min 5, worker 25 / min 3). Run 116 saw 118 worker connections, more than 25, so the running containers do not have those env values: please check `docker inspect` MONGO_MAX_POOL_SIZE on the server, or deploy main. I changed nothing there.
Not done yet: item 3 (jobs one at a time, off-peak: next), index for {category, sub_category, sub_sub_category, usage_count} only if the cache is not enough (index build on 1.6 GB mongod is the owner's schedule).

## 2026-11-12 06:53 UTC — P0 items 1, 3, 4, 5 (findings) + PR #2624
Status: in progress
PR: #2623 (/config + /modules), #2624 (flapping critical alert: 1 "unstable" mail per key per 6 h, first 2 fires still mailed). CI: backend build green, `live gate` red on every PR = runner image (lane P). Open PRs of mine: 5 (#2617-2619, #2623, #2624), over the cap because of the P0 order; I will open no more until some merge.
(1) /p/[slug] PublicDataUnavailableError: by design (F82-3): the page throws so Next keeps the LAST GOOD cached copy; Sentry sees the error only for a slug with no cached copy yet (crawler on a never-rendered product) while the API times out, and then the user gets the translated 503. The code does not need a change; the cause is the API timeouts (#2623). Not changed.
(3) Disk: log rotation (20m x3), release prune, build-cache prune (97c-retention), disk-filling alert already exist in code. I cannot tell what grew without the 99d/run 116 numbers (not in the repo, not reachable from here). Please paste run 116 output (or run 97c in dry mode) and I will fix the actual grower; I will not guess.
(5) Cloudinary (code only, I have no credentials): provider images upload FOUR WebP versions each (original up to 4000x4000, 800, 400, 200 px) in provider-image-processor.service.ts, type `authenticated`, plus any upload with target=cloudinary (storage.dto allows it for any upload, KYC documents included). Options to cut usage, no spend: (a) cap the stored original at 1600 px (largest file, most storage); (b) stop storing the 200/400 versions and derive them by URL transform (counts as transformations, so measure first) or on R2; (c) send KYC/private documents to R2 only (default already R2); (d) delete orphans: replaced images use overwrite only when customKey is set, random-UUID uploads leave the old asset: a cleanup job listing nabd/* not referenced by `storage_objects`. I need the owner's choice of (a)-(d) and the Cloudinary usage page numbers; no code written yet.
Next: waiting on run 116 for item 3; item 5 needs the owner's pick; then back to the queue (5: provider gate).

## 2026-11-12 06:51 UTC — P0 findings (5xx bursts) + PR #2623
Status: in progress
PR: #2623 (CI pending; `live gate` red on every PR = runner image Ubuntu 26.04/Playwright, lane P found it, not mine). #2617 #2618 #2619 CI: all green except live gate (same cause). I opened #2623 as 4th PR because the P0 order comes first.
Run 116 output: not available to me yet. From code: `/config` and `/modules` read Mongo on every request after the TTL with no single-flight and no time limit, so a slow mongod makes every waiting request pile up to the 5 s timeout (matches p95 5000 ms on /config, /modules, catch-all). `/modules` also failed OPEN on a DB error (all modules ON, cached): a switched-off module came back on in a blip. Fixed in #2623 (single-flight, stale-if-error, maxTimeMS).
Next: (4) one "unstable" digest mail per 6 h, (1) /p/[slug] stale-if-error in patient-web, (3) disk retention, (5) Cloudinary report.

## 2026-11-12 06:33 UTC — PRs #2617, #2618, #2619 open (cap of 3 reached)
Status: in progress
PR: #2617 credit notes cumulative cap + VAT residual; #2618 ZATCA TLV 255-byte guard; #2619 PT-24 money side of the return (paid/failed/cancelled, 5 tests). All CI pending. Local: billing 108-109 tests green, moyasar-return 5 green, tsc clean, dtolint 0.
Findings for the lead: (1) a cancelled/expired hosted checkout stays `initiated` (no `canceled` in the status map), the result page cannot tell it from pending: wording decision needed; (2) ZATCA credit-note QR carries negative total/VAT: confirm if positive wanted.
Queue 3 (halala R11): the P2/P3 steps and the 8 wallets.balance doubles need the server numbers. Plan (read-only first): run ops task 96i (halala counts, prints doubles / missing_shadow clean+unclean / shadow_disagree per collection.field), then `money-halala-backfill` dry run (default, writes nothing); wallets: wallet schema already dual-writes `balance_halalas`; the 8 historical rows get their shadow only by the backfill apply, which needs `MONEY_BACKFILL_CONFIRM=<db name>`. I will not apply anything; I need the 96i output from the lead to continue. Not blocked otherwise.
Queue 8 (row 4 verification): already written by lane Y into docs/review/PROVIDER_ADMIN_MERGE_MAP.md in #2615 (callers + permission differences), with a security finding on provision-sub-provider / branch-staff (hospitalId from the body is never compared with the caller's facility; no caller anywhere). I did not duplicate it.
Next when a slot frees: queue 5 (server gate for REJECTED/pending providers), then 6, 7.

## 2026-11-12 06:31 UTC — queue 1 + 2 (invoices)
Status: in progress
PR: #2617 (CI: pending) credit notes cumulative cap + VAT rounding residual (2 tests). #2613 and #2615 were green on the last CI run (2026-11-11) and are not behind main; waiting for the lead.
Invoice review so far (billing.module.ts): numbering is single-claim, per-series per-Riyadh-year counters, no gaps: OK. Credit notes: every refund path goes through event payment.refund.card: OK. Fixed in #2617: sum of notes could exceed the invoice; VAT rounding lost a halala over several partial refunds.
Left: TLV length byte over 255 bytes (seller name); question for lead: ZATCA credit-note QR currently carries negative total/VAT (tags 4,5); confirm whether positive values are wanted. Then queue 3 (halala R11 dry-run plan).

## 2026-11-12 06:28 UTC — session start
Status: in progress
Scheduled checks (hourly, 30 min apart, bound to this session): :17 = trig_01LH52Vsgg1tCCzAdYgHF22B, :47 = trig_01Q4hbUM6HXzbRLY9ZwdwDwj. Renew before any 7-day expiry.
Queue 1: #2613 and #2615 had all 32/33 check runs green (last run 2026-11-11); I will re-check mergeability against main.
Next: queue 2 (invoices review), starting with a read-only map of numbering, credit notes, VAT and ZATCA fields.
