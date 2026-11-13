# Lane P outbox (newest on top)

## 2026-11-13 05:25 UTC — #2640 dlq gauge: red backend check fixed
Status: backend green, waiting on live gate shard 2/5 (other 4 passed).
PR: #2640 (p2/dlq-gauge), fix commit afbf8d3d4.
What changed: cause was the SY-01 guard (cron-jobs-run-once.spec.ts): my new `refreshGauges` @Cron had no @ScheduledOnce. It is per process on purpose (Prometheus scrapes each replica, a leased run would leave the others at 0), so I added it to the guard's documented NOT_LEASED list with the reason. No test skipped, no budget touched.
Left: #2620 (owner), #2621 (rebase on main after #2620). Nothing else queued.

## 2026-11-13 03:00 UTC — STATE SNAPSHOT (context is large; read this first after any restart)
Status: all queue items done; waiting on CI/owner/lead
Hourly checks: trig_017STMiGEZY9ofoMgZVd9MKP (:17) and trig_0128Ki84TGzkHY2PgY7zv248 (:47), both bound to this session (created 2026-11-12; renew before 7 days = by 2026-11-19).
My PRs: #2620 refund-policy hash echo backend (money, waits for the owner), #2621 clients (based on #2620's branch p2/policy-hash-echo; retarget to main once #2620 merges), #2640 DLQ/outbox gauges + alerts + runbook (CODE GAP 6.1, CI pending), #2643 checklist ticks (docs only, p2/checklist-ticks; opened now that the cap is 5).
Merged so far: #2603-2605, #2601 (conflicts), #2622 (admin payouts), #2626 (runner pin), item 3 bundle: no change needed (margin 95,075 B).
Reports already written below: launch checklist audit table + OWNER / SERVER to-do lists (23:55 entry), parity audit (no gap), insurance offers PARKED after launch (lead decision), SCENARIOS 100/101 covered, DTO leftovers all done.
Open proposal (needs #2620 merged first): web consultation booking sends no refund-policy hash (the card shows the page's own figures); fix = backend returns the hash with those figures, web echoes it.
Next when something moves: fix any red CI on my PRs; after #2620 merges retarget #2621; if the lead sends new items, do them in order.

## 2026-11-13 00:20 UTC — launch checklist: code gap PR + tick branch ready
Status: in progress (CI pending)
PR: #2640 p2/dlq-gauge (CODE GAP 6.1): gauges nabd_event_dlq_dead / nabd_event_dlq_pending / nabd_domain_outbox_stuck (refreshed every minute from the counts GET /event-reliability/status already reads), 3 alert rules (DeadLetterQueueHasDeadEvents, DeadLetterQueueBacklog, DomainOutboxStuck), runbook docs/runbooks/event-dead-letter.md; drift-guard spec extended, no check loosened. tsc/build ok, 33 tests pass, dtolint 0.
Ticks: branch p2/checklist-ticks is pushed (audit/LAUNCH_CHECKLIST.md: 4 lines ticked [x] = review/CI/merge + DNS; every other line left open and tagged owner / server / keys with the evidence, in Arabic like the file). I am at the 3-PR cap (#2620, #2621, #2640), so I open that PR as soon as one of them merges (it is docs only; if you want it now over the cap, say so in my inbox).
The audit table and the OWNER / SERVER to-do lists are in my 23:55 entry below; that is the list for the owner.
Left: nothing else is a code gap. #2620 (owner decision, money) -> then retarget #2621.

## 2026-11-12 23:55 UTC — audit/LAUNCH_CHECKLIST.md audited line by line (main@eeca462e)
Status: audit done; 1 CODE GAP found (PR next), then one PR to tick the file
Key: DONE = verified in repo; CODE GAP = I fix it; OWNER = only the owner can (accounts, keys, consoles); SERVER = lead/ops on the server; KEYS = needs paid/real credentials.
| # | item | state | evidence / note |
|---|---|---|---|
| 1.1 | review PR nabdah-plus/full-completion -> main | DONE | branch no longer exists on origin; main has run 97-117 deploys, 600+ PRs merged since |
| 1.2 | CI green (backend, contracts, web, guards) | DONE | merge gate = lead merges only fully green; runner fixed by #2626 (ubuntu-24.04) |
| 1.3 | merge to main | DONE | same |
| 1.4 | pre-production release tag | OWNER (lead) | `git tag` has only 5 data tags (catalog-v13 ...); no release tag. Tag main at the launch commit |
| 2.1 | MONGO_URL, DB_NAME, JWT_SECRET 32+, REDIS_URL, ALLOWED_ORIGINS, NODE_ENV | SERVER | enforced at boot (backend/src/config/env.validation.ts:5-8, JWT < 32 chars refused); the list is deploy/.env.production.example (96 vars); server is up so it is set; verify only |
| 2.2 | MOYASAR_* (+ other gateways) | KEYS / OWNER | deploy/.env.production.example, docs/payments/MOYASAR_GO_LIVE.md; placeholder `pending_real_key` is detected (backend/src/config/env.placeholders.spec.ts) = owner to-do "Moyasar keys" |
| 2.3 | FCM/Firebase, WhatsApp (Infobip), SMTP/Resend | KEYS / OWNER | all in deploy/.env.production.example; uptime-alert mail needs GitHub secrets OPS_ALERT_EMAIL, MAIL_FROM, RESEND_API_KEY (.github/workflows/uptime-alert.yml:42-45) |
| 2.4 | LiveKit key/secret + COTURN | SERVER | self-hosted by decision (deploy/coturn, tools/live/start-livekit.sh); vars in the example; keys generated on the server |
| 2.5 | S3/R2 + GEMINI_API_KEY + SENTRY_DSN | KEYS / OWNER | in the example (10 S3 vars, GEMINI, SENTRY); R2 token roll pending (LAUNCH_LIST V "gitleaks fingerprints") |
| 2.6 | web: NABD_API_BASE_URL, NEXT_PUBLIC_SITE_ORIGIN, Google OAuth | OWNER (Google client) / SERVER | patient-web/.env.production.example; Google client id/secret = owner (Google console) |
| 2.7 | device integrity Play Integrity + APNS/App Attest | DONE (code) + KEYS | backend/src/modules/device-trust/device-trust.module.ts degrades honestly without keys; APNs key = owner to-do |
| 2.8 | revoke the exposed temporary GitHub token | OWNER | cannot be verified from the repo; owner revokes + rotates (GitHub settings) |
| 3.1 | DNS api./nabd.plus/mcp. | DONE / SERVER | deploy/DNS-RECORDS.md, deploy/nginx/conf.d/mcp.conf, deploy/health-check.sh hits api.nabd.plus; site live since 11-03; mcp host: verify record exists |
| 3.2 | .well-known assetlinks + AASA verified with Apple/Google tools | OWNER | routes exist (patient-web/app/.well-known/*) but AASA answers an error until APPLE_TEAM_ID is set (route.ts:10-11) and assetlinks needs the Play signing SHA-256 (route.ts:3); owner supplies both, then checks with the tools |
| 3.3 | E2E web -> app direct link | OWNER | unit-covered (PT-38 COVERED, native-intent.test.ts); the real OS hand-off is device-farm only (SCENARIOS PT-24 row) |
| 4.1 | Apple Team ID + Bundle ID + signing; Google package + SHA-256 | OWNER | bundle ids set (patient-app/app.json:18 and :5501 = com.patient.nabd); Team ID/signing/SHA = owner accounts |
| 4.2 | store metadata in six languages + privacy policy + Apple health answers | DONE (docs) + OWNER | docs/aso/listings.md (ar,en,ur,hi,bn,fil), docs/compliance/STORE_DECLARATIONS.md, patient-web/app/[locale]/privacy/page.tsx; owner pastes into the store consoles |
| 4.3 | EAS production build + TestFlight/Internal first | OWNER | patient-app/eas.json has `production` build + submit profiles; needs the owner's accounts |
| 5.1 | real payment/booking/pharmacy E2E (cash, card sandbox, insurance) | DONE (CI, fakes) + KEYS | 171 live journeys in tools/live (j_payment_webhook, j_pharmacy*, j_insurance*) run in the live gate against fake Moyasar; a real sandbox card run needs Moyasar test keys (owner) |
| 5.2 | push + real LiveKit call + Moyasar webhook | DONE (CI, fakes) + OWNER | j_lab_result_push, j_web_call, j_payment_webhook; real devices/keys = owner/server |
| 5.3 | Sentry + alerts + DB backup | DONE (code) + OWNER | backend/src/instrument.ts, ops/prometheus/nabd-alerts.yml, uptime-alert.yml, dr-drill.yml, backup restore SY-05 COVERED; Sentry DSN + alert mail secrets = owner |
| 6.1 | watch p95, failure rate, outbox/DLQ first two weeks | p95/failure: DONE; outbox/DLQ: CODE GAP | alerts ClassP95High, SlowRoutes, PaymentErrorRatio (nabd-alerts.yml:27,47,59); NO gauge/alert for the dead-letter queue or stuck outbox (counts exist only behind the admin endpoint event-reliability.module.ts:82-97) -> I build gauge + alert now |
| 6.2 | P2/P3 backlog | n/a | tracked in lead/LAUNCH_LIST.md AFTER LAUNCH |
OWNER to-do list (short): 1) revoke + rotate the exposed GitHub token; 2) Moyasar live + sandbox keys; 3) FCM/Firebase + Infobip + Resend keys, GitHub secrets OPS_ALERT_EMAIL/MAIL_FROM/RESEND_API_KEY; 4) Google OAuth client, Gemini, Sentry DSN, R2 token roll; 5) Apple Team ID + APNs/App Attest key, Play signing SHA-256, store accounts; 6) paste store listings/privacy/health answers, EAS production build + TestFlight/Internal; 7) check .well-known with Apple/Google tools; 8) real-device checks: link hand-off, push, a call; 9) create the release tag (lead).
SERVER to-do list (short): verify the 96 vars of deploy/.env.production.example are set (no `__...__`/`pending_` left; the boot check refuses a short JWT secret only); LiveKit/COTURN keys; APPLE_TEAM_ID + Android SHA-256 envs once the owner has them; confirm the mcp. DNS record + cert; staging run of the journeys with real keys.
Left: building the DLQ/outbox gauge + alert (PR 1), then one PR ticking the file (PR 2). Open of mine: #2620, #2621.

## 2026-11-12 20:45 UTC — new queue checked: EMPTY, proposals
Status: queue empty (nothing to build); waiting on the lead for #2620
(1) Bundle margin: done earlier (95,075 bytes margin on main, no trim needed).
(2) SCENARIOS.md: 100 rows COVERED, 1 PARTIAL (PT-24). PT-24's only remaining gap is "the real OS handing the link to the app", which needs the device farm and the production Team ID + fingerprint (the row says so); I cannot cover it from here. PT-05, PV-15, AD-02 are COVERED now (the older text in the table notes is stale). No journey/test to add.
(3) DTO leftovers, rechecked on main: test_prices/scan_prices already `@Transform(toPriceMap) @IsPriceMap` (typed number map); /hospital/staff is declared once (hospital-staff.module, since #2615); nursing delta: POST /provider/settings/delta takes SubmitDeltaDto {changes|newData objects}, every client (provider-app x6, tools/live) already sends exactly that, and assertNursingDelta guards the shape for nurse roles. dtolint 0, dtocheck 0 mismatches (earlier run). Nothing left. (Only cosmetic: submitDelta's "flat body" branch can never be reached over HTTP, because forbidNonWhitelisted refuses a flat body first; harmless dead code, I left it.)
(4) #2620 waits for the owner (money PR); I rebase/retarget #2621 as soon as it merges. #2601 and #2605 merged.
Open PRs of mine: #2620, #2621.
What else I see (propose, I start nothing until you pick):
 a) Refund-policy hash echo gap in my own work: the WEB consultation booking page shows the page's own policy figures (compact card), so it sends NO hash (the app and every other service do). Proper fix is backend: return the policy hash together with the consultation figures the page already loads, then the web echoes it. Small backend + web PR; needs #2620 merged first (same files).
 b) A second look at the hourly CI of #2620/#2621 after you update branches (I will fix any red).
 c) Anything from B's or Y's backlog you want to hand me; tell me the list.

## 2026-11-12 20:10 UTC — Item 5b offers insurance (decision 30): scope check, need your call before I build
Status: blocked on a product/scope decision (I changed nothing)
What exists on main: decision 30 (docs/product/OWNER_DECISIONS_2026-10-06.md) is already built for the patient side and pharmacy: one policy shape (company_id/code, class, copay; backend/src/common/insurance-policy.ts), provider contracts are `{ company_id, classes[], active }` (insurance_contracts), `hasInsuranceContract(contracts, companyKeys, class)` filters the pharmacy broadcast, ordering requires `insurance_class`. What is still a boolean: the PROVIDER'S PER-SERVICE OFFER in provider_service_offers / service-offers.ts (`ServiceOffer.insurance: boolean`, summary `insurance_accepted`, the `?insurance` list filter = "any offer accepts insurance"), and the provider-registration flag `accepts_insurance` shown in admin ProviderFullDetail.
So "companies and classes instead of a boolean in offers" means: replace the offer boolean with which companies/classes that provider accepts for that service, and make the lab/radiology/nursing lists match the patient's company + class (like pharmacy already does). That touches backend offers model + a data migration of existing `insurance: true` rows + provider-app offer editor + admin view + patient lists on web AND app.
Safe proposal (small steps, each its own PR, backward compatible): (1) backend: offers keep `insurance: boolean` but derive it from the provider's contracts when the request carries the patient's company + class (new optional query params; no params = today's behaviour), tests; (2) patient web+app pass the saved policy company/class to the offers lists; (3) provider-app/admin: show/edit accepted companies+classes (provider app is not redesigned: reuse the existing contracts editor if one exists). I need your answer: build 1-3 now in that order, or park all of it after launch (inbox says the owner may move it)? Until you answer I start nothing.
Left: open PRs of mine #2620, #2621 (+ conflict branch #2601 refreshed). Nothing else in my queue.

## 2026-11-12 19:50 UTC — Item 5a parity audit round 2: no one-sided gap found
Status: done (report only, no PR: there is nothing to build)
Method: all 71 PRs merged to main since 2026-11-09 classified by whether they touch code in patient-app, patient-web or both (tests, locale json and docs excluded). 66 touch both sides or neither (backend/ops). Only 5 touch one side:
- #2554 pt08-app (medical report screens, app): the web side already exists (/medical-reports and /medical-reports/[reportId]), and the national-ID rule shipped on both (74069450).
- #2560 refund-tick-web / #2561 refund-tick-app: the two halves of one feature, both merged.
- #2606 return-photo-scan (web): the app already shows the scan state (ScanStatusBadge, ReturnsViews); this PR only wired the badge into the web return form. Paired.
- #2610 literals-ds (app): internal literal-string / a11y-label hook for the app design system; no web counterpart is meant.
Cross-check by routes: every app area (pharmacy, diagnostics, consultations, health, family, nursing, insurance, settings, ...) has a web route family. The endpoint-level diff (180 endpoints only the app calls, 37 only the web) is NOT evidence of missing features: the web goes through BFF/composite routes, so the paths differ; I did not use it. By design one-sided: web = public SEO pages (/public, entity-graph, oauth, verify); app = camera/wearables/calls/biometrics.
In flight now: #2620 (backend), #2621 (web+app together), #2601 (app+web), #2605/#2604 merged both sides. No new one-sided work is open.
Left: nothing to build for this item; LAUNCH_LIST "parity audit round 2" can be ticked by you (it is your file). Item 5b (insurance companies and classes instead of a boolean in offers, decision 30) is next; it is V's backend item too, so I will first check what exists on main before touching anything.

## 2026-11-12 19:20 UTC — Item 3 bundle margin: no trim needed
Status: done (no PR: nothing to change)
Measured main@07aa8c8a (after #2605) with scripts/bundle-size.mjs: Android bundle 15,297,995 bytes (14.59 MB, gzip 6.42 MB) vs budget 15,393,070 = margin 95,075 bytes (~93 KB). The rule says trim when the margin is under 30 KB, so no trim pass and no budget change (I did not raise or lower it).
Left: I will re-measure when the margin looks small in a PR's CI figure; the three open app-side PRs (#2601, #2620/#2621) change little code. #2620 merged -> retarget #2621. Item 5 (LOWEST PRIORITY parity audit round 2) is next once I am free of CI work; I will start it after #2620/#2601 merge unless you reorder.

## 2026-11-12 19:05 UTC — #2605 merged, #2601 refreshed, item 3 started
Status: in progress
PR: #2605 merged. #2601: merged main again (82678bf9; only the generated docs conflicted, regenerated; no code change since the full app test pass). Open of mine: #2620, #2621.
Item 3 (bundle margin): the budget is perf/bundle-budget.json 15,393,070 bytes (checked by scripts/bundle-size.mjs). I am measuring current main (expo export android) to see the margin; if it is under 30 KB I do one trim pass of dead strings, otherwise I report the margin and stop (no change needed).
Left: #2620 merged -> retarget #2621.

## 2026-11-12 18:35 UTC — #2601 conflict fixed (early, while #2605 CI runs)
Status: waiting for CI
PR: #2601 x/audit-no-show: merged origin/main, pushed 44c6a241. 13 conflicts: six patient-app locale files (both sides appended keys at the end: unioned, valid JSON, 0 duplicate keys) + generated docs/design inventories (regenerated with the repo tools, --check passes). Locally: app jest 295 suites / 2437 tests ALL pass; web provider-no-show + appointments-outcomes 11/11 pass; locale parity ok.
Red check "Patient Mobile build and tests": I could not reproduce a failure in the tests (all green after merging main). If it is red again in CI I will read the job log and root-cause it (no skip); I did not pre-read the old log.
Left: #2605 and #2601 both wait for CI/merge. #2620 merged -> retarget #2621. Item 3 after that.

## 2026-11-12 17:25 UTC — #2604 merged, #2605 conflict fixed
Status: waiting for CI / lead
PR: #2604 merged. #2605 x/pt30-location: merged origin/main, pushed (only the generated docs/design inventories conflicted, regenerated with screen-inventory.mjs and provider-inventory.mjs; `--check` passes; locale parity ok; the PR's own test explorer-browser 4/4 pass). CI pending.
Left: #2601 x/audit-no-show next, after #2605 is merged (queue order, one at a time); it also has the red "Patient Mobile build and tests" to root-cause. #2620 merged -> retarget #2621. Open PRs of mine: #2620, #2621.

## 2026-11-12 15:55 UTC — #2622 merged
Status: waiting for the lead
PR: #2622 merged (item 4 done, merge map row 2). Open: #2604, #2620, #2621 (3 = the cap). All three are 24 commits behind main but merge cleanly (checked with merge-tree), so I am not pushing anything over your update-branch runs.
Left: #2604 merged -> #2605, #2601 conflicts; #2620 merged -> retarget #2621 to main; item 3 starts when I am under 3 open PRs. LAUNCH_LIST: the merge-map row 2 part is merged; the V item covers rows 1-3 together, so I left the tick to you.

## 2026-11-12 12:25 UTC — #2622 is green, ready to merge
Status: ready for the lead
PR: #2622 admin payouts (merge map row 2): ALL checks green incl. live gate shards 1-5 and Backend build and tests. Mergeable now. (#2620, #2621, #2604 not re-read this hour; I will fix any red as soon as I see it.)
Left: no new orders, main unchanged since #2626. Same plan as before: #2604 merged -> #2605, #2601; #2620 merged -> retarget #2621; item 3 when under 3 open PRs.

## 2026-11-12 11:20 UTC — waiting
Status: waiting for the lead (nothing red known on my side)
PR: #2604, #2620, #2621, #2622 open and up to date with main (CI not re-read this hour). No merges since #2626.
Left: when #2604 merges I do #2605 and #2601; when #2620 merges I retarget #2621; item 3 starts as soon as I am under 3 open PRs. If you prefer I start item 3 now (over the cap), say so in my inbox.

## 2026-11-12 09:25 UTC — after the pin merge
Status: waiting for CI / lead
PR: #2604 updated with main again (61061cab; only the generated docs/design inventories conflicted, regenerated with the repo tools; locale parity ok). #2621 updated with the refreshed #2620 (500772f8). #2620 and #2622 left alone, you updated them. (CI: pending for all.)
Left: #2604 first, then (after it merges) #2605 and #2601 conflicts. After #2620 merges I retarget #2621 to main. Item 3 starts when I am under 3 open PRs of my own.

## 2026-11-12 08:20 UTC — P0 pin works
Status: waiting for the lead
PR: #2626 (CI: live gate shards 1 and 5 GREEN, 2-4 still running, every finished check green: the Playwright install now works on 24.04). Needs the lead's manual merge.
Left: nothing merged yet since #2603 (#2604, #2620, #2621, #2622, #2626 open; no new orders). After #2626 merges the other PRs need "update branch". Then: #2605, #2601 conflicts (after #2604), retarget #2621 after #2620, item 3.

## 2026-11-12 07:55 UTC — P0 live gate: pin ubuntu-24.04
Status: done (CI pending; needs the lead's manual merge, it touches .github/workflows)
PR: #2626 p2/pin-ubuntu-2404 (CI: pending; the live gate on this PR is the proof)
What changed: every `runs-on: ubuntu-latest` in .github/workflows (43 files, 74 lines) is now `ubuntu-24.04`. macos-latest (native-e2e) and the one ubuntu-22.04 job untouched. Diff is only the runner label; all 44 workflow files still parse as YAML. No test skipped, no budget touched. (I had found the same root cause earlier, see my 07:45 entry.)
Left: this is a 4th open PR of mine (cap 3) because the P0 goes before everything; #2620, #2621, #2622 wait for it (after it merges they need "update branch"). Saw #2603 merged; #2604 not merged yet, so #2605 and #2601 still wait.

## 2026-11-12 07:20 UTC — CI check
Status: waiting for the lead
PR: #2620 (CI: green except `live gate` 1-5 + `live`, the runner-image/Playwright problem, same as on every PR), #2621 (CI: all green; base is #2620 so the live gate does not run; the offers-screens test that failed locally under load passed in CI), #2622 (not checked yet)
Left: 3 PRs open = my cap. Waiting for the lead to merge #2604 (then I do #2605, #2601) and #2620 (then I retarget #2621 to main). Item 3 (bundle margin) starts when a slot frees. Lead: the live-gate fix (pin runs-on ubuntu-24.04) blocks green merges of everything.

## 2026-11-12 08:25 UTC — Item 4 admin payouts (merge map row 2)
Status: in progress (CI pending)
PR: #2622 p2/admin-payouts
What changed: no second payout path exists (finance-suite already only links to /admin/payouts; provider app only has POST /provider/payouts/request). payouts.tsx now asks the reason + warning in the shared ConfirmDialog instead of window.prompt/confirm; same endpoints. admin vitest 97 pass, tsc clean.
Left: open PRs of mine = #2620, #2621, #2622 (3 = the cap). Next: watch CI of all three and fix reds; #2605/#2601 conflicts after #2604 merges; item 3 (bundle margin) after a PR merges.

## 2026-11-12 08:05 UTC — Item 2 client half
Status: in progress (CI pending)
PR: #2621 p2/policy-hash-echo-clients (base: p2/policy-hash-echo = #2620; retarget to main after #2620 merges)
What changed: web + app send the hash of the policy text the card showed (per service); 409 refund_policy_changed reloads the text, clears the tick, shows a new six-language message. No hash where it would give a false 409 (mixed lab+radiology order, some app cards). Web vitest 3073 pass; app jest 2437 pass, 1 fail `pharmacy/offers-screens` (countdown) that passes alone on this branch and on main = load timing; if it is red in CI I will root-cause it, not skip.
Left: #2605, #2601 conflicts wait for #2604 merge. Open PRs of mine: #2620, #2621 (+ #2604 conflict fix).

## 2026-11-12 07:45 UTC — CI finding (affects every PR) + #2604 state
Status: blocked on lead for the CI image
PR: #2604 (CI: all app/web/provider/admin/contrast checks green, Backend build and tests still running; `live gate` shards 1-5 RED)
What I found: the five `live gate` shards fail in the step "pip install playwright; playwright install --with-deps chromium": the runner image is now Ubuntu 26.04 and Playwright 1.60 answers "does not support chromium on ubuntu26.04-x64" (3 attempts, exit 1). It is the runner image, not the PR; every PR will hit it. I did not touch the workflow (not my scope, and no skipping). Suggested fix for the lead: pin the live-gate job to `runs-on: ubuntu-24.04` (or a Playwright version that supports 26.04).
Left: #2605 and #2601 conflicts wait for #2604 to be merged (queue order). Item 2 client half is built locally, PR next.

## 2026-11-12 07:15 UTC — Item 2 refund-policy hash echo, backend half
Status: in progress
PR: #2620 p2/policy-hash-echo (CI: pending)
What changed: Z had added NO hash field on any create body (only refund_policy_accepted), so I added optional `refund_policy_hash` to every patient create DTO and threaded it through forwarders (unified-bookings, cart, home-care, refill). `stampAcceptance` now answers 409 `refund_policy_changed` (service, hash, version in force) when the shown hash differs from the policy in force; missing hash allowed (old clients), malformed 400. tsc/nest build clean, 147 suites 785 tests pass, dtolint 0, dtocheck 0 mismatches.
Left: client half (web + app send the shown hash; on 409 reload text + ask tick again; six languages) is the next PR, branch p2/policy-hash-echo-clients, starts from #2620.
Questions: none (safe option taken: hash optional, so nothing breaks before the clients ship).

## 2026-11-12 06:40 UTC — Conflicts #2603 / #2604
Status: in progress (#2604 pushed, waiting for CI)
PR: #2603 x/pt54-orders: no conflict, branch already contains origin/main (0 behind), nothing to do. #2604 x/pt03-dependant: merged origin/main, pushed 4edb6907 (CI pending).
What changed (#2604): 13 conflicts. Six patient-app locale files: both sides only appended keys at the end, kept both, JSON valid, 0 duplicate keys, locale-parity ok (no new problems). docs/design inventories regenerated with screen-inventory.mjs and provider-inventory.mjs (not by hand). Tests run: app booking-screens + dsText (13 pass), web booking-for-route (5 pass).
Left / blockers / questions: #2605 and #2601 still conflict; waiting for the lead to merge #2604 before touching them (per queue order). Meanwhile starting item 2 (refund-policy hash echo).

## 2026-11-12 06:30 UTC — Lane P start
Status: in progress
PR: none yet
Scheduled checks created (hourly, :17 and :47): trig_017STMiGEZY9ofoMgZVd9MKP (17 * * * *) and trig_0128Ki84TGzkHY2PgY7zv248 (47 * * * *). Both bound to this session. Renew before expiry (7 days).
Next: queue item 1, conflicts one PR at a time, starting with #2603 x/pt54-orders.
Left / blockers / questions: none yet.
