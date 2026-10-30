# QA sweep state (handover for a fresh session), 2026-10-30

Branches: qa/e2e-sweep and qa/e2e-sweep-account (identical). Start: `git fetch origin && git checkout qa/e2e-sweep-account`.
Read first: docs/qa/SCENARIOS.md (status per row), docs/qa/SUMMARY.md (counts), docs/qa/findings/*.md (defects with file:line).

## Done (pushed)
- Blocked rows: A-03 DONE (tools/live/j_qa_phone_otp.py 10/10), PR-04 DONE for the wiring (tools/live/j_qa_pr04_analyze.py 13/13, fake_openai.py), P-15 PARTIAL (tools/live/j_qa_rx_upload.py 9/10; RX-1 P1), I-03 and A-08 BLOCKED on product gaps (docs/qa/findings/product-gaps-p2.md).
- Fixes on main re-verified locally: #2085, #2086, #2087, #2090, #2092, #2093, #2094 FIXED; #2088 PARTIAL; #2089 MOSTLY (docs/qa/findings/fix-verification-2026-10-29.md). #2091 NOT VERIFIED (needs production deploy).
- Step 3 prices: docs/qa/findings/price-vs-checkout.md (consultations consistent; labs and nurses charge the catalogue price, not the provider's price: P1).
- Counts: 46 DONE, 26 PARTIAL, 2 BLOCKED (74 rows).

## Open defects (decisions needed)
- INS-CAP-1 (P1, copay cap; #2086 fixed on main), REF-PEN-1 (P1, console full refund ignores late cancel %), RX-1 (P1, prescription accepts any image reference), #2088 (own provider prices not applied), #2091 (test providers on public map; production deploy).

## Left
1. The 48 dynamic web routes with seeded ids (not started). Start with the highest traffic: /ar/cart/checkout, /ar/appointments/[id], /ar/labs/[id], /ar/diagnostics/radiology/[id], /ar/home-care/services/[id], /ar/nursing/nurses/[id], /ar/orders/[id].
2. The dynamic admin routes (not started).
3. The browser click paths of the 25 PARTIAL rows (not started). Rows: P-11 D-02 D-04 D-06 D-10 N-01 A-06 A-07 A-13 A-14 V-01 V-02 V-03 V-04 V-05 V-06 V-07 V-08 V-09 AD-01 PR-02 MP-02 JB-01 JB-03 JB-04 JB-06 P-15 (check with `grep '| PARTIAL |' docs/qa/SCENARIOS.md`).
4. Radiology checkout price (one booking) and the pharmacy offer total and delivery fee (step 3).
5. Owner decisions: D-02, N-01, V-07, AD-01, JB-01/03/06, JB-04, PR-02; fixes for INS-CAP-1, REF-PEN-1, RX-1; the V-0x harness choice (provider app Expo web needs node_modules; not installed).

## Exact next row
The first dynamic route in list 1 above: /ar/cart/checkout (checkout with a cart item; the earlier walk reached it via tools/live/walk scripts under the scratchpad, which are not committed).

## Local stack notes
- Runs main builds (backend dist, patient-web and admin next builds from origin/main 9a291681d). Journeys run from a worktree of qa/e2e-sweep (the journeys are not on main).
- Services drop often: run /tmp/claude-0-scratch/recover.sh, then recreate the moto bucket nabd-live (boto3 create_bucket). fake_clamd (3311), fake_openai (9200), smtp sink (2525) are started by the scripts (fake_openai is started by hand).
- Test DB: ai_providers.openai base_url set to the fake (local only).
