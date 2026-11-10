# Lead reviewer state (read this instead of any long history)
Updated 2026-11-07 ~20:15 UTC. Public repo: never write secrets, server names or emails here.

## Lead 3 run 2026-11-10 13:40 UTC
- No merges. Run 114 (61fef9a54) not pushed yet by owner. #2596 (main merged) CI running. Z idle since 11:20 (queue done), X/V waiting.
## Lead 3 run 2026-11-10 13:15 UTC
- Run 114 reviewed: v/ops-run-114 61fef9a54 (FF of 0cee259f), release 84d3df99 (main CI green t14), deploy + cf-purge + read-only 96p/96n/96j. Owner push line sent.
- #2596 conflicts → X merges main.
## Lead 3 run 2026-11-10 12:45 UTC
- Merged #2595 (pharmacy + late_rescheduled keys, bundle trimmed; removed keys verified unused). Deploy blockers cleared.
- Main tip 84d3df99 → V sets run 114 release; owner pushes after main CI is green. #2596 bundle fix pushed, CI running.
## Lead 3 run 2026-11-10 12:15 UTC
- Merged #2589 (pharmacy: patient cancel refused from IN_FULFILLMENT, provider/admin cancel 100 %, returns need defect reason + photo).
- #2595 bundle trim pushed (e22f433), CI running → then release sha to V for run 114 (v/ops-run-114 e6d82fa59, placeholder release line).
- #2596 red Android bundle +11 KB → X trims after #2595.
## Lead 3 run 2026-11-10 11:45 UTC
- Merged #2597 (V: medicines filters single-flight + covering indexes, stream cap 3, pools 55/25) — the P0 OOM fix.
- Deploy waits for #2595 (X keys; red only on Android bundle +5 356 B → X trims dead keys). Then V prepares a deploy run of the main tip + 96n re-check.
- #2589 (Z pharmacy, main merged) + #2596 (X form) CI running; merge together.
## Lead 3 run 2026-11-10 11:15 UTC
- Merged #2592 (no-show live journey; cap = automatic video refunds only) and #2594 (late_rescheduled clause).
- #2595 (X keys) and #2589 (Z pharmacy) conflict with main → owners merge main. #2596 held until #2589 merges. #2597 (V OOM fix) CI nearly done.
## Lead 3 run 2026-11-10 10:42 UTC
- Merged #2593 (X national_id form, web+app, six languages).
- V culprit (from code): GET /medicines/filters ran 3 `distinct` over ~21k public medicines (manufacturer/form unindexed) → ~1 GB outside cache on bursts. #2597: HotCache single-flight, covering indexes, stream cap, pool caps 80→55/40→25. mongosh lines = healthcheck metadata, not a host job. CI running; review on green, then deploy + re-run 96n.
- #2589 new push (1cf777a), #2592/#2594/#2595/#2596 CI running.
## Lead 3 run 2026-11-10 10:15 UTC
- Run 113 done (owner pushed 0cee259f). No mongod kill since 04:55:42. Before kills: mongosh x24–32 connections (host jobs exec'ing mongosh inside the mongo cgroup — prime suspect clamav-window cron / monitor scripts), connections 27→65, slow medicines public_eligibility query (21k docs, 6–8 s). V ordered: fix all three; no limit raise.
- Green #2591 (national_id) to review next wake; #2589 fixed, CI; #2592–#2596 CI running.
## Lead 3 run 2026-11-10 09:50 UTC
- No merges. #2589 red (j_refund_matrix pharmacy expectations old) → Z. Z's #2586 clause commit stranded on merged branch → new PR. Decided: no-show cap counts only automatic video refunds.
- X: pharmacy + late_rescheduled keys = deploy blockers. #2591/#2592/#2593 CI running.
- Owner: run 113 not pushed (~4.5 h).
## Lead 3 run 2026-11-10 09:15 UTC
- Merged #2590 (X refund-policy keys, six languages) → deploy blocker cleared.
- #2591 red (real): j_sick_leave PDF 409 after national_id gate → Z ordered to update journey (assert 409, add id, download). #2589/#2592 CI running.
- Owner: run 113 (0cee259f) still not pushed (~4 h). R2 roll pending.
## Lead 3 run 2026-11-10 08:40 UTC
- No merges. CI running: #2589 (Z pharmacy refund), #2590 (X refund keys — deploy blocker), #2591 (Z national_id), #2592 (Z no-show journey). V idle waiting for run 113.
## Lead 3 run 2026-11-10 08:20 UTC
- Merged #2587 (X late reschedule UI, server-driven) and #2588 (Z: 2-hour table for patient cancels of lab/radiology/nursing; provider/system = 100 %).
- DEPLOY BLOCKER: X must add client keys refund.policy.{lab,nursing}.{full,late}, radiology.late (six languages) before the next deploy.
- Pending deploy content on main since run 111: #2558..#2588 (incl. escrow cron + index, no-show hold, seats). Deploy only after run 113 (mongo OOM cause) and X's keys.
- Owner: run 113 (0cee259f) not pushed; R2 roll pending.
## Lead 3 run 2026-11-10 07:42 UTC
- Merged #2586 (late free reschedule; replacement booking refunds at late % on patient cancel; one use).
- #2587 (X, main merged) and #2588 (Z two-hour table lab/radiology/nursing + pharmacy) CI running.
- Owner: run 113 (0cee259f) not pushed; R2 roll pending.
## Lead 3 run 2026-11-10 07:20 UTC
- Merged #2583 (no-show hold a+b; stuck release retried every 15 min, max 5, then release_failed; idempotent handler).
- #2586 loophole fix pushed (cd8b133), CI running. #2587 X: merge main for the apt fix.
- Owner: run 113 (0cee259f) not pushed yet; R2 roll pending.
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
