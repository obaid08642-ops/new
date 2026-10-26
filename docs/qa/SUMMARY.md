# QA summary (Nabd Plus, local test stack)

Updated 2026-10-26. Branch `qa/e2e-sweep`; journeys in `tools/live/` on `qa/journeys` (PR #1967) and this branch (PR #1891).
Test data only. Nothing written to nabd.plus except read-only GETs. No product code changed.

## Scenario matrix (docs/qa/SCENARIOS.md, 74 rows)

| Status | Rows |
|---|---|
| DONE (UI, API, DB and reload verified) | 25 |
| PARTIAL (some of that proven, reason in the row) | 46 |
| BLOCKED (cannot be tested now, reason in the row) | 3 |
| TODO | 0 |

Every row now has a status and a reason. The 46 PARTIAL rows mostly lack a browser click path or a per-field UI walk; the API and DB side is proven for them where the row says so.

Rows proven this session with DB checks (journeys in `tools/live/`): D-05 (family booking), D-08 (no-show), D-09 (reschedule), D-11 (guaranteed-appointment credit), P-08/P-09/P-10 (no offer, expired offer, pharmacy decline), P-11/P-12/P-13 (declined payment, retry, cancel refund; 3DS not modelled), PR-05 (B2B quotation declined, cancel), A-09 (family members), I-04 and A-05 (partial), MP-02 (partial), JB-06 (partial).

## Pages

- patient-web static routes (anonymous): 141 swept on the production layout (docs/qa/screens/patient-web-static.md).
- patient-web auth-gated routes (signed in): 72 swept (docs/qa/screens/patient-web-auth.md).
- patient-web dynamic routes: 5 of 53 tested with seeded IDs; the rest need more seeded IDs (not done).
- admin pages: 65 files swept signed in (docs/qa/findings/admin-sweep.md); dynamic admin routes not tested.
- provider app and provider web: covered through the journeys (onboarding for every provider type, consultation, lab, radiology, nursing, pharmacy, jobs); no per-screen sweep.

## Findings by severity (status as last tested, 2026-10-26)

| Sev | Count | Open as last tested | Closed or retracted |
|---|---|---|---|
| P1 | 7 rows | 3: admin system logs API 404 (admin-sweep.md); booking-by-id page 503 (web-sweep-dynamic.md); hospital provider token cannot post jobs (jobs-inbox.md) | 2: guest job publish (admin publish passes on the API now, re-test in j_jobs.py); insurance copay not stored (fixed on main, #1916). 2 more: hydration (retracted: local setup error, production layout passes); the two-writers insurance row (verify) |
| P2 | 15 rows | open: insurance delete endpoint missing; candidate not notified on job status change; no job messages; family invite 404 for non-owner (should be 403); unnamed controls on labs pages; catalog-manager broken images; CDN lab/radiology image 404s; others in the findings files | - |
| P3 | 19 rows | open (see the findings files) | - |

Counts are rows marked P1/P2/P3 in docs/qa/findings/*.md. Rows in the findings files were not all re-tested in this session, so the status column above is the honest state, not a fresh sweep.

## Messages sent to the owners

- S (backend): admin system logs 404 (18:01 UTC earlier), job publish, COD and family 403 items; this session: hospital provider token cannot post jobs (P1), no candidate notification on status change (P2), no job messages (owner decision), status transitions unchecked (P3).
- Design: booking-by-id 503 (19:02 UTC earlier).

## Not done

- Patient-web dynamic routes beyond the 5 tested (needs more seeded IDs).
- Admin dynamic routes (orders/[kind]/[id] etc.).
- Browser click paths for the PARTIAL rows (map, card, book button; insurance CHI button; social buttons; jobs messages UI).
- 3DS challenge for card payments (the test double does not model it).
- Re-test of the admin system logs and booking-by-id P1s on the latest main.
