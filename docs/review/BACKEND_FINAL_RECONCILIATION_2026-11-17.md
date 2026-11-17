# Backend final reconciliation (lane B, 2026-11-17)

Order of the lead (2026-11-17 05:00): go through `lead/LAUNCH_LIST.md`, `docs/audit/*`, `docs/review/*`, the WIRING `[backend]` needs-review lines, the open issues and every item I ever answered "waiting for"; for each BACKEND item write **DONE** (PR link) / **OPEN** (what exactly is left, who) / **DEFERRED** (the owner's word). Fix every OPEN item that is technical.

How to read it: **DONE** needs a merged PR or code I opened on `main` and a test or a command named next to it. Where the only evidence is "the code is on main and I read it", the row says **read, not run**. Nothing here was run on a server (I have no access); every server step is an ops task the lead runs. Rows I could not verify are marked **NOT RE-VERIFIED**, never DONE.

## 1. Launch list (`lead/LAUNCH_LIST.md`), backend items

| item | status | evidence / what is left, who |
|---|---|---|
| X: refund policy hash echo (backend half) | **DONE** | #2620 (backend, `refund_policy_hash`, 409 `refund_policy_changed`), #2621 + #2677 (clients) |
| X: web/app parity audit round 2 | DONE (P) | #2723, no gap |
| X: bundle margin, patient literals, pharmacy return photo badge | not backend | design/app session (P) |
| Z: invoices review (numbering, credit notes, VAT lines, ZATCA) | **DONE** (code) / **DEFERRED** (accountant questions) | review + credit note retried by the durable queue #2691; corrections and the 10 open questions #2703; owner 2026-11-17: the accountant note is POSTPONED, do nothing |
| Z: payout and settlement pass | **DONE** | #2599 (statement fix) and #2611 (journey `j_payout_paid`) are on `main` |
| Z: PT-24 payment return journey | **DONE** | #2647 (+ #2648 no status echoed from the link, #2633 / #2634 cancelled and expired wording) |
| Z: halala migration (R11) P2 read paths | **DONE** | #2641 #2642 #2644 #2645 #2646 #2649 |
| Z: halala migration P3 (backfill, stop writing doubles, drop) | **OPEN** | owner APPROVED 2026-11-17. Code: #2733 (writer: one collection per run, run log, exact rollback). Ops: #2734 (`98s`: gates, dry run, apply, rollback). Left: the ordered ops runs of `docs/platform/R11-halala-p3-plan.md` section B (96i numbers first, who: lead runs, owner approves each write), then step C per collection (code PRs, me) and D (drop, owner, after a release cycle) |
| V: provider/admin merge map rows 1-3 (+ row 4 verification) | not backend (P) / row 4 DONE | verification report in the merge-map docs |
| V: verify the mongod OOM fix on the server (96p / 96n / 96j) | **DONE** for the code, **OPEN** for the final numbers | code: #2678 #2680 #2681 #2682 #2686 #2688 #2698 #2699 #2701 #2706 #2707 #2715 #2716 #2717 #2718 #2720; lead's evidence: no mongod start since 16:15 UTC on 2026-11-16 (deploy 134). Left: 96t (oplog slice explain) and a 96r after the next deploy, who: lead |
| V: admin jobs board (list/moderate jobs from facilities) | **DONE** (read, not run) | `AdminRecruitmentController` lists `source=facility|all` and `close` takes down any published post; spec `guest-job-review.spec.ts` |
| V: server gate keeping a REJECTED/pending provider off other provider routes (G6) | **DONE** + **OPEN** (decision) | gate + spec #2690. Left: whether a rejected provider may read `GET /provider/kyc/documents` to see the documents flagged for replacement (today 403, pinned by the spec). Who: lead/owner. I did not widen a security gate without a decision |
| V: radiology slot capacity | **DONE** | #2664 (+ labs rule) |
| V: DTO leftovers | **DONE** (verified by P on main) | |
| V: offers by insurance company/class (decision 30) | **DEFERRED** | AFTER LAUNCH (lead 2026-11-12) |
| V: gitleaks ignore fingerprints | **DEFERRED** | after the owner confirms the R2 token roll |

## 2. Everything I ever answered "waiting for"

| item | status | evidence |
|---|---|---|
| Slot times built as UTC from Riyadh hours (labs, radiology, home care) | **DONE** | #2725 (server), #2731 (clients, P). Clients read `start`/`id` as UTC instants, `label` = Riyadh "HH:mm" |
| Same bug in other local-time reads (quiet hours, surge, weekly slots, doctor/service schedules) | **DONE** (this PR set) | #2735: `TZ=Asia/Riyadh` for backend and worker; deploys with the next container recreate |
| Admin page permission != endpoint permission (13 lines) | **DONE** | list #2728, client change #2732 (P); no endpoint widened |
| Provider rejection purged uploaded files while a re-submit is allowed | **DONE** | #2727 (test fails on the old code) |
| R7 memory option | **DEFERRED** (owner: 8 GB, at the end) / **OPEN** (repo change) | decision (a) of `docs/platform/R7-memory-decision.md`. Left, at the moment of the resize and not before: `echo 8192 > deploy/HOST_RAM_MB && python3 tools/ops/mem_budget.py render --write`, update the table in `docs/ops/MEMORY_BUDGET.md` and its test constants in the same PR (I tried it: 8 tests in `tools/ops/tests` then fail until the doc is updated, and merging it BEFORE the resize would give containers limits the 3.8 GB host does not have, so I did not open it). Who: lead, with the resize |
| Accountant note #2703 | **DEFERRED** | owner 2026-11-17: postponed |
| INN table / 96s output (#1556) | **DEFERRED** | owner 2026-11-17: postponed. Code and dry run exist (#2697) |
| 96r after deploy, SCFHS API config, migration 20260827 | **OPEN** (server facts) | ops task 96u (#2726) prints SCFHS env names, providers without a licence date per type, the five migration indexes and `domain_outbox` per state; who: lead runs it |
| SCFHS licence expiry for the 5 provider types | **DEFERRED** (owner options) | `docs/platform/LICENCE-EXPIRY-OPTIONS.md` (#2693) |
| Multi-country | **DEFERRED** (documented) | `docs/platform/MULTI-COUNTRY.md` (#2696) |

## 3. Production stability series (P0, all merged)

Alert mail gate #2678; /p and /c bot limit #2679; nightly jobs one at a time #2680; WiredTiger cache + R7 doc #2681; revenue aggregate bounds #2682; backup size check #2683; read-only kill-window task 96r #2686; ranking job loop #2698; aggregate bounds #2688; search boot loop guard + explain tests #2699; domain_outbox indexes #2701; urgent-alert indexes #2706; optional nightly jobs bounded #2707; catalogue list orders covered #2715; list cache + concurrency gate #2716; oplog reader found + 96t #2717; API bot limit #2718; category tree indexes #2720. **OPEN (server):** the four new index builds of #2715 and #2720 should be applied outside a kill burst; the old four `public_*` indexes can be dropped after the new ones exist (a later, separate PR, after the lead sees the 96r).

## 4. Backend needs-review (`[backend]`) lines

426 unique lines triaged in `docs/review/BACKEND_GAPS_TRIAGE_2026-11-16.md` (#2705, #2710, #2712). Result: the stale ones are listed with the code that answers them; the real gaps got PRs (#2704 cancel reason, #2708 refund amount in the booking view); the permission mismatch is DONE (#2728/#2732); the rest are decisions or design notes owned by P. Nothing in that file is left as a technical backend defect except what this document lists as OPEN.

## 5. Older ledgers (`docs/review/QA_DEFECTS.md` and the audit docs)

`QA_DEFECTS.md` has 132 rows; 95 do not say "Fixed". Its Status column was last maintained in October and many "Open -> agent" rows were fixed later without the row being updated (commits do not cite the Q ids, so I could not map them by history). **I did not re-verify all 95.** What I checked in the code for the backend rows with the highest weight:

| row | what I looked at | status |
|---|---|---|
| Q25 price-override audit | `GET price-overrides/export` over `pharmacy_price_override_audit` exists in `pharmacy.controllers.ts` | read, not run; the page/list half is the admin client (P) |
| Q36 slot hold | `slot-locks` refuses a second patient (`slot_taken`, `slot_held_by_another`) | read, not run; "fails open when the hold check cannot run" from the old FAIL note NOT re-checked |
| Q60 approve -> public | the public read needs `approved + public`; `indexing_eligibility` only decides crawling (`medicines.service.ts`) | read, not run |
| Q66 / Q89 step-up on money routes | 20 `@StepUp` uses and `admin-sensitive-write-permissions.spec.ts` exist | read, not run; a route-list spec for every money route NOT re-checked: **OPEN, who: me, next pass** |
| Q86 / Q99 / Q104 Moyasar webhook | `webhooks.service.ts` and `payments.module.ts` authenticate the body `secret_token` (S-5) | read, not run |
| Q103 demo seeds in shipping code | seeders exist but cannot run in production: `SEED_DEMO_DATA=true` for doctors, `NODE_ENV=test && ALLOW_TEST_SEED=true` for the provider seed route | DONE as to risk; moving them out of `src/` is a low-value cleanup: **DEFERRED** |
| Q53-Q56 livekit/coturn, Q62-Q69 native builds | deploy/native items | not backend code; owner/server or P |
| Q95-Q98, Q5, Q16, Q29, Q37, Q38, Q41, Q45, Q47-Q49, Q59, Q61 | not re-verified | **NOT RE-VERIFIED**: the next pass takes these one by one against `main` and either closes the row with a test or opens a PR; who: me. They are listed so nothing is silently assumed fixed |

`docs/audit/*` (the F-id plan P1-P13) was reviewed phase by phase by the reviewer (`REVIEW_P*.md`, `docs/review/phase-review/`); I did not re-audit each F-id here.

## 6. Open issues

| issue | status | answer |
|---|---|---|
| #2363 capacity and cost review 2026-11 | **OPEN** (needs server samples) | answered with the 8 GB decision and the measured numbers (comment on the issue); the samples file `/var/lib/nabdah-capacity/samples.jsonl`, the costs and the free-tier check need the server and the invoices: who: lead / owner |
| #1556 active ingredient | **DEFERRED** | owner: postponed (plan, parser and dry run on main, #2697) |

## 7. What is OPEN and technical, by who

| open | who |
|---|---|
| R11 P3: ops runs (96i, 98s dry run, apply per collection, 96i) and then step C code PRs, one collection per release | lead runs / owner approves; me for the code |
| Host resize to 8 GB and the repo change that follows it | lead + owner |
| 96t and 96r after deploy; 96u output; the old four `public_*` indexes dropped after the new ones | lead (runs), me (the drop PR) |
| G6: may a rejected provider read its KYC documents list? | lead / owner |
| Step-up route-list spec (Q66/Q89) and the rows marked NOT RE-VERIFIED in section 5 | me |
| Other services' local-time reads (fastapi, admin-web, patient-web) were not audited for #2735 | me (low) |
