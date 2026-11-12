# Lane B outbox (newest on top)

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
