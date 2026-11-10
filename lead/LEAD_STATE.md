# Lead reviewer state (read this instead of any long history)
Updated 2026-11-07 ~20:15 UTC. Public repo: never write secrets, server names or emails here.

## Lead 3 run 2026-11-10 06:45 UTC
- Merged #2585 (live gate waits for apt/dpkg lock).
- #2586 HELD: late free reschedule then cancel >2 h ahead = 100 % loophole → Z ordered (cap at late %). #2583 fix pushed, CI running. #2587 (X late reschedule UI) CI running.
- Owner: run 113 (0cee259f) still not pushed.
## Lead 3 run 2026-11-10 06:20 UTC
- Merged #2584 (index-present skip + partial due-earning index).
- #2583 HELD: held-refund `releasing` can get stuck with no retry/visibility → Z ordered. #2585 (V live-gate apt) / #2586 (Z free reschedule) CI running.
- Owner has not pushed run 113 (0cee259f) yet. Prod readiness ok earlier.
## Lead 3 run 2026-11-10 05:45 UTC
- Merged #2581 (lab slot capacity + seat race fix). #2583 live-gate Playwright flake re-run. #2584 (Z: self-gate skip when index exists + partial due-earning index for #2582 cron) CI running.
- Run 113 (V, 0cee259f, read-only mongo OOM cause) reviewed OK → owner to push. Prod readiness ok at 05:15.
## Lead 3 run 2026-11-10 05:15 UTC
- Run 112b done (server-ops 42756850654). P0: mongod cgroup OOM loop (403 restarts; 38 in 03–04h; 1.63 GB RSS vs 0.6 GB cache, limit 1600m). Prod readiness ok 05:13–05:15 (GET). V ordered: run 113 read-only diagnostics → find culprit job/query. Z asked about self-gate aggregations.
- ClamAV: container absent; UPLOAD_SCAN=defer + ON_DEMAND already set, window cron installed, window never started (MemAvailable 1217 < 1700). 91b dry run clean. APPLY after mongo P0.
- #2583 live gate infra flake (Playwright apt) → re-run when the run finishes. #2581 seat race fix pushed, CI running.
## Lead 3 run 2026-11-10 04:45 UTC
- Merged #2582 (escrow maturity cron + mature before withdraw; same filter as matureEscrow).
- #2581 green but HELD: seat takeover race (seat before booking create) → V ordered (grace period for missing booking).
- Run 112b pushed (1e46d6c), server-ops 42756850654 waiting for owner approval. Old lead took decisions (no-show a+b, free reschedule GO, etc.) — see OWNER_DECISIONS.
## 2026-11-10 04:45 UTC old lead — DECISIONS (owner delegated "take the decisions")
1. Provider no-show reported by patient: video = refund at once, but max 2 auto-refunds per patient per 30 days (3rd+ goes to admin review first). Clinic/home visits = refund held until the 24 h dispute window closes, then paid automatically unless the provider disputes (admin decides). (= options a + b.)
2. Free reschedule (late-cancel option b): GO, build it (Z backend, X web+app).
3. REFUND_POLICY_VERSION: follows the stored admin policy (hash/version saved with each acceptance), not a code constant.
4. 2-hour table applies to doctor, lab, radiology and nursing bookings. Pharmacy orders: 100% refund until the pharmacy accepts/prepares; after dispatch only for wrong/damaged items (photo + admin review).
5. Invoice after refund: issue the credit note together with the invoice (ZATCA style), do not net the paid total.
6. national_id: asked only when the patient requests a medical report (or the doctor issues one and it is missing, the patient is asked to add it before download); stored like other personal data, shown in full only on the report.
7. Provider no-show live journey: yes, with a directly set past slot in the test env.
8. Run 112 (read-only diagnostics) pushed by old lead: server-ops 42756850654, waiting for owner.

## Lead 3 run 2026-11-10 04:12 UTC
- Merged #2579 (payout approvals claim on state; reviewed).
- #2580 closed → #2582 (clean single commit), CI running. #2581 V fix pushed (seat collection from profile model db), CI running.
- Owner still: push run 112b (`1e46d6c24`), no-show rule, R2 roll.
## Lead 3 run 2026-11-10 03:42 UTC
- Merged #2578. #2579 live-gate flake re-run (42745458848).
- #2581 red (provider-own-price lab cases) → V ordered. #2580 still red Gitleaks (history) → Z ordered to rewrite own branch.
- Owner: push run 112b (`1e46d6c24` → review/server-inspect); no-show rule (a/b/c); R2 token roll.
## Lead 3 run 2026-11-10 03:10 UTC
- #2580 gitleaks false positive (test idempotency key) → Z rename. #2579 live gate infra flake (dpkg lock) → re-run. CI: #2581 (V capacity), #2578 (X). Owner: no-show rule + run 112b.
## Lead 3 run 2026-11-10 02:40 UTC
- Merged #2576, #2577, #2336 (old audit, green). V: lab capacity per slot GO. Z: payouts/settlement pass. #2578 CI. Owner: no-show rule + run 112b push.
## Lead 3 run 2026-11-10 02:10 UTC
- Merged #2575. CI: #2576 (late invoice after refund), #2577 (policy stamp). Owner Qs open: no-show refund policy (cap/hold/keep), run 112b push.
## Lead 3 run 2026-11-10 01:40 UTC
- Merged #2573 (PT-54 UI), #2574. Z: fix late-invoice-after-refund, then per-service policy version/hash. OWNER Q: no-show auto-refund cap / hold. Run 112b waits for owner.
## Lead 3 run 2026-11-10 01:10 UTC
- Merged #2571, #2572. CI: #2573 (X PT-54 UI), #2574 (V G2 nursing price). Run 112b waits for owner.
## Lead 3 run 2026-11-10 00:40 UTC
- Merged #2570 (PT-54 backend). CI: #2571/#2572 (Z), #2573 (X PT-54 UI). Run 112b waits for owner.
## Lead 3 run 2026-11-10 00:15 UTC
- Merged #2566, #2569 (dtolint gate + CodeQL), #2567 (gapless invoices; small settle race follow-up to Z), #2568 (scan state UI). #2570 CI. Run 112b waits for owner push.
## Lead 3 run 2026-11-09 23:40 UTC
- No change: #2566-#2569 each 1 check pending. Run 112b waits for owner.
## Lead 3 run 2026-11-09 23:10 UTC
- Nothing green. #2569 (V dtolint) red CodeQL NoSQL step-up.guard.ts:98 → V. PT-54 = hide/unhide visit from history (V backend, X UI). Run 112b waits for owner.
## Lead 3 run 2026-11-09 22:40 UTC
- #2566 OK but conflict (Z); #2568 conflict (X); #2567 CI. V new queue: dtolint gate fix, PT-54, #2336 triage. Run 112b still waits for owner push.
## Lead 3 run 2026-11-09 22:15 UTC
- Run 111 DONE: LIVE main@a063da06; clamav skipped. Merged #2565 (invoice unique), #2564, #2563. Run 112b @1e46d6c2 (read-only + 91b dry run) → owner push. X: 'being checked' UI audit before defer. Z: invoice number gap question.
## Lead 3 run 2026-11-09 21:40 UTC
- Run 111 pushed as deploy-only main@a063da06 (server-ops 42701390983 waiting approval). V to rebuild run 112 (96k/96m/96c + 91b dry run) on 6453740b. Merged #2560 (web tick).
## Lead 3 run 2026-11-09 21:10 UTC
- Merged #2562 (docs). In CI: #2565 (Z invoices), #2564/#2563 (V), #2560 (X web tick). Runs 111/112 not pushed yet by owner.
## Lead 3 run 2026-11-09 20:45 UTC
- Merged #2550 (refund tick backend, optional default) then #2561 (app tick). Run 111 (26bafaf9) + run 112 (fc1bf90c: 91b dry run + deploy main@eff32b95) reviewed; owner asked to push 111 then 112. #2560 CI.
## Lead 3 run 2026-11-09 20:15 UTC
- Merged #2558 (ClamAV swap window), #2559, #2557. #2560 red (journey must tick) → X. Run 111 still waits for owner push; run 112 plan to V (91b dry run + deploy).
## Lead 3 run 2026-11-09 19:40 UTC
- V back (new crons). Run 111 = v/ops-run-111 @26bafaf9 read-only (96k/96m/96c) reviewed OK → owner push. #2558 ClamAV swap window CI. Merged #2554. #2550 reworked (default optional) CI.
## Lead 3 run 2026-11-09 19:10 UTC
- #2550 green but HELD: default `required` would 400 every booking from current web + installed apps → Z: default optional, flip by config after clients + app min-version. X: tick UI now. #2554 CI. V silent since 17:05 outbox (last commit 15:57): owner told.
## Lead 3 run 2026-11-09 18:40 UTC
- Merged #2553 (PT-03 app). #2554 conflict again (X). #2550 CI. V silent since 15:57 (2h45m): owner told at next wake if still silent.
## Lead 3 run 2026-11-09 18:10 UTC
- Nothing green. #2550 conflict → Z. #2553/#2554 rebased, CI. V silent since 15:57 (clamav order 17:40 pending); tell owner if >3 h.
## Lead 3 run 2026-11-09 17:40 UTC
- Run 110 DONE: LIVE main@5227a794, health ok; ClamAV skipped again (uploads refused) → V first item. Merged #2552. #2553/#2554 conflicts (X). #2550 red 3rd time (nursing specs) → Z.
