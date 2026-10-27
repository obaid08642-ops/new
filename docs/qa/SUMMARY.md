# QA summary (Nabd Plus, local test stack)

Updated 2026-10-27. Branch `qa/e2e-sweep` (and `qa/e2e-sweep-account`, PR #2015); journeys in `tools/live/` on `qa/journeys` (PR #1967) and these branches (PR #1891).
Test data only. Nothing written to nabd.plus except read-only GETs. No product code changed.

## Scenario matrix (docs/qa/SCENARIOS.md, 74 rows)

| Status | Rows |
|---|---|
| DONE (UI, API, DB and reload verified, or the row states its scope) | 40 |
| PARTIAL (some of that proven, reason in the row) | 29 |
| BLOCKED (cannot be tested now, reason in the row) | 5: P-15, I-03, A-03 (no SMS), A-08 (no profile edit control), PR-04 |
| TODO | 0 |

Every row now has a status and a reason. Most PARTIAL rows lack a browser click path or a per-field UI walk; the API and DB side is proven for them where the row says so. Browser journeys added on 2026-10-27 (all in `tools/live/`, gated unless noted): `j_web_qa_loyalty`, `j_web_qa_legal`, `j_web_qa_insurance`, `j_web_qa_insurance_edit`, `j_web_qa_chi`, `j_web_qa_map`, `j_web_qa_drug_index`, `j_web_qa_admin_procurement` (gated); `j_web_qa_support` and `j_web_qa_password_rule` (ungated, failing on a product defect).

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
| P1 | 8 rows | 3: admin system logs API 404 (admin-sweep.md); booking-by-id page 503 (web-sweep-dynamic.md); hospital provider token cannot post jobs (jobs-inbox.md) | 2 hydration rows: retracted (local setup error, production layout passes). 1 guest job publish: passes on the API now (re-test in j_jobs.py). 1 insurance copay not stored: fixed on main (#1916). 1 two-writers insurance row: to verify |
| P2 | 15 rows | open: insurance delete endpoint missing; candidate not notified on job status change; no job messages; family invite 404 for non-owner (should be 403); unnamed controls on labs pages; catalog-manager broken images; CDN lab/radiology image 404s; others in the findings files | - |
| P3 | 20 rows | open (see the findings files) | - |

Counts are rows marked P1/P2/P3 in docs/qa/findings/*.md. Rows in the findings files were not all re-tested in this session, so the status column above is the honest state, not a fresh sweep.

## Open findings and questions (2026-10-27)

New P1 candidates and open P1s, to decide:
- **V-07 (provider-onboarding.md):** an admin-rejected applicant keeps an active user (`provider-admin.service.ts:207-212`) and can still sign in with `201` (`provider.controllers.ts:32`). Owner decision on what a rejected applicant may do.
- **JB-04 (jobs-inbox.md):** the hospital's job post returns 403 (re-run 2026-10-27). The hospital token carries the provider role, which `recruitment.module.ts:322` does not accept.

New P2s from this session:
- **A-07 (web-patient.md, with correction):** the website proxy requires a 10-character password (`patient-web/app/api/auth/register/route.ts:10`) while the form and backend accept 8. The earlier `otp_required` attribution was wrong.
- **A-13 (web-patient.md):** the support chat thread is empty after a reload (`support-chat-client.tsx:17`); the messages are stored and returned by the API.
- **A-14 (web-patient.md):** a missing legal policy answers 200 with an empty body (`legal.module.ts:166`), and the website caches that for an hour (`public-read.ts:16`), so a published policy shows 404 until the cache expires.

Questions for the owner (the rows say what is untested):
- **D-02:** does a free consultation exist? The product has no zero-price booking; the only no-payment outcome is pharmacy insurance full coverage.
- **N-01:** after a nurse rejects a paid visit, `payment_status` stays `paid`. Is a refund expected, and through which path?
- **V-09 payouts:** the payout itself (admin approval and money moved) needs earned money and a verified bank account; not tested.
- **JB-01, JB-03, JB-06:** the jobs screens exist only in the mobile provider app. Run the mobile harness, or accept API-only coverage for these rows?
- **AD-01 case 7:** the admin has no reject route for procurement requests; cancel is the negative action. Is that intended?
- **Test infrastructure:** the admin account allows two browser devices, so the journeys reuse the gate run's saved device (`LIVE_ADMIN_DEVICE_FILE`). Docker stopped several times this session; `/tmp/claude-0-scratch/recover.sh` restored it each time.

## Messages sent to the owners

- S (backend): admin system logs 404 (18:01 UTC earlier), job publish, COD and family 403 items; since the last message: hospital provider token cannot post jobs (P1), no candidate notification on status change (P2), no job messages (owner decision), status transitions unchecked (P3).
- Design: booking-by-id 503 (19:02 UTC earlier).

## Not done

- Patient-web dynamic routes beyond the 5 tested (needs more seeded IDs).
- Admin dynamic routes (orders/[kind]/[id] etc.).
- Browser click paths for the PARTIAL rows (map, card, book button; insurance CHI button; social buttons; jobs messages UI).
- 3DS challenge for card payments (the test double does not model it).
- Re-test of the admin system logs and booking-by-id P1s on the latest main.
