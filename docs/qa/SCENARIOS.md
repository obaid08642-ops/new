# QA scenario matrix (Nabd Plus, whole project)

Status key: **DONE** = UI and API 2xx and DB change verified on the local stack, reload checked. **PARTIAL** = some of those proven (named in the row). **BLOCKED** = cannot be tested now (reason in row). **TODO** = not started.

Stack: local MongoDB rs0 (`nabd_live`), backend :8002, admin :3001, patient-web :3000 (production build). Test doubles on. Test data only; nothing on nabd.plus except read-only GETs.

## Coverage

- Scenarios: 8 done, 8 partial, 4 blocked (reason given), 54 not started, of 74 total.
- Screens: 0 of 274 patient-web routes fully scanned (public pages sampled in findings). Admin and provider screens not started.
- The sweep is not finished. It is finished only when both counts reach 100%, or each remaining line gives its reason.

## A. Scenarios (journey × state)

| id | area | scenario | status | evidence / reason |
|---|---|---|---|---|
| P-01 | pharmacy | build cart (local-first), guest | DONE | Retested on rebuilt main (20:05 UTC): product page hydrates, Add to cart updates the header badge to 1, cart page lists the item. Cart is kept in the browser by design (owner decision 2026-10-06), so no DB write to prove. Earlier P1 was a local setup error (findings web-patient.md CORRECTION) |
| P-02 | pharmacy | build cart, signed in | DONE | Same retest as P-01, signed in as the QA patient: badge 1, cart page shows the item, no API errors |
| P-03 | pharmacy | send order (broadcast) | TODO | needs P-01 |
| P-04 | pharmacy | compare offers | TODO | |
| P-05 | pharmacy | accept offer and pay (card, test double) | TODO | |
| P-06 | pharmacy | preparing → courier → delivered → rated | TODO | |
| P-07 | pharmacy | cancel at each step | TODO | |
| P-08 | pharmacy | no offers | TODO | |
| P-09 | pharmacy | offer expired | TODO | |
| P-10 | pharmacy | pharmacy rejects | TODO | |
| P-11 | pharmacy | payment fails / declined / 3DS | TODO | fake Moyasar at :9100 |
| P-12 | pharmacy | payment retry | TODO | |
| P-13 | pharmacy | refund | TODO | |
| P-14 | pharmacy | return | TODO | |
| P-15 | pharmacy | prescription required; upload | BLOCKED | uploads closed on the server: expect the clear message (verify the message) |
| P-16 | pharmacy | cash on delivery, first order (D-25) | BLOCKED | backend accepts COD on first order; journey expects refusal (findings P2) |
| D-01 | doctor | search, filters, sort (incl. available today) | TODO | |
| D-02 | doctor | doctor page → slot → book, video, free | TODO | |
| D-03 | doctor | book clinic visit, paid | TODO | |
| D-04 | doctor | book with insurance (copay/cap estimate) | TODO | |
| D-05 | doctor | book for a family member | TODO | |
| D-06 | doctor | telehealth consent → call | TODO | |
| D-07 | doctor | visit summary actions → prescription | TODO | |
| D-08 | doctor | no-show | TODO | |
| D-09 | doctor | reschedule | TODO | |
| D-10 | doctor | cancel and refund | TODO | |
| D-11 | doctor | guaranteed-appointment credit | TODO | |
| L-01 | lab | book → provider accepts / rejects → visit → result | TODO | |
| R-01 | radiology | book → accept / reject → visit → result | TODO | |
| N-01 | nursing | book → accept / reject → visit | TODO | |
| I-01 | insurance | add card (company → copay) | PARTIAL | Retested on rebuilt main: save 201, MongoDB patient_profiles holds copay_percent 20 and copay_cap_sar 500 (P1 fixed). Still open: no class field in the form (P2) |
| I-02 | insurance | edit card | TODO | |
| I-03 | insurance | delete card | TODO | |
| I-04 | insurance | CHI link | TODO | |
| A-01 | account | sign in, email | DONE | Sign-in with registered patient lands on /en/dashboard; document created by registration (users collection) verified |
| A-02 | account | sign up, email OTP | PARTIAL | Registration via API flow (send-otp, verify-otp, register) 2xx; user document verified; web sign-up page not yet clicked through |
| A-03 | account | sign up / sign in, phone OTP | TODO | |
| A-04 | account | sign in, wrong password | DONE | Generic error shown; 401 on POST /api/auth/login |
| A-05 | account | Google / Apple / X / Snapchat | TODO | gated: check the gate message |
| A-06 | account | forgot password | TODO | |
| A-07 | account | 8-character password rule | TODO | |
| A-08 | account | profile edit | TODO | |
| A-09 | account | family members | TODO | |
| A-10 | account | addresses (map) | TODO | |
| A-11 | account | notifications | TODO | |
| A-12 | account | loyalty (Nabdat) | TODO | |
| A-13 | account | support / chat | TODO | |
| A-14 | account | legal pages | TODO | |
| A-15 | account | delete account | TODO | do on a throwaway local account only |
| V-01 | provider, pharmacy | registration, every field and step | TODO | |
| V-02 | provider, doctor | registration, every field and step | TODO | |
| V-03 | provider, lab | registration, every field and step | TODO | |
| V-04 | provider, radiology | registration, every field and step | TODO | |
| V-05 | provider, home_care | registration, every field and step | TODO | |
| V-06 | provider, hospital | registration, every field and step | TODO | |
| V-07 | provider, all types | admin approval and rejection | TODO | |
| V-08 | provider, all types | dashboard, receive request, accept / reject / offer | TODO | |
| V-09 | provider, all types | schedule, leaves, templates, blacklist, payouts | TODO | |
| AD-01 | admin | every list, filter, approve / reject, edit, report | TODO | admin panel :3001 |

| PR-01 | pharmacy B2B | pharmacy submits shortage request → admin sees it | PARTIAL | API as pharmacy 201; DB `procurementrequests` PENDING_ADMIN_REVIEW; pharmacy list shows it; admin list shows it (admin API, admin web page not yet clicked) |
| PR-02 | pharmacy B2B | admin review, quotation, cancel, complete; pharmacy sees each status | PARTIAL | Full lifecycle verified over API with DB status at each step (IDs in findings/b2b-map-jobs.md). Admin web buttons not clicked yet |
| PR-03 | pharmacy B2B | pharmacy approves quotation (feedback) | DONE | POST /pharmacy/procurement/:id/feedback 201; DB APPROVED_BY_PHARMACY, then complete by admin 200 → COMPLETED |
| PR-04 | pharmacy B2B | analyze-file (upload or text) | BLOCKED | Validation verified (400 with clear message). Text analysis returns 503 ai_provider_unavailable: no AI key on the test stack |
| PR-05 | pharmacy B2B | rejection and cancellation by the pharmacy | TODO | |
| MP-01 | providers map | GET /providers/map and type filters | PARTIAL | API 200 (13 active, 2 pharmacies, 5 doctors within 50 km). Map page, markers and cards not yet checked in the browser |
| MP-02 | providers map | provider card → profile → book | TODO | |
| DI-01 | drug index | search and detail as pharmacy | PARTIAL | API 200 (search, categories). Detail and web UI not yet checked |
| DI-02 | drug index | guest search | DONE | Guest gets 401 Missing token: recorded as "cannot search" |
| JB-01 | jobs, guest | device-bound post | PARTIAL | POST /recruitment/jobs/guest 201 draft; DB job_postings has it; guest/mine lists it. Web UI not checked |
| JB-02 | jobs, guest | guest apply to an unpublished draft | DONE | 404 (correctly refused) |
| JB-03 | jobs, guest | admin publishes guest draft → public listing | BLOCKED | Defect (P1): no route publishes a guest draft; admin PUT returns 404. Finding in findings/b2b-map-jobs.md |
| JB-04 | jobs, signed-in hospital | post a job → public listing | PARTIAL | POST /recruitment/jobs 201, public list shows 1. DB status check pending |
| JB-05 | jobs, signed-in doctor | candidate profile → apply → hospital updates status → doctor sees it | DONE | Profile 201, apply 201, DB job_applications submitted → under_review, doctor view shows under_review (findings/b2b-map-jobs.md) |
| JB-06 | jobs | inbox and messages between the two sides | TODO | |

## B. Screens

Per-screen scan (every element, sizes 390/768/1280, six languages, dark mode) is recorded in `docs/qa/screens/`. Not started beyond the public pages listed in `docs/qa/findings/web-patient.md`.

## Notes

- Each DONE row needs the DB proof (collection, document id, fields) recorded in the evidence column.
- Provider and admin sides of each scenario are checked at the same moment (status sync) once the patient side is DONE.

## Stop point (update every turn)

- Static patient-web routes (anonymous, 141): swept on the OLD layout and re-run on the production layout (19:10 UTC): same flags. Confirmed. Table: docs/qa/screens/patient-web-static.md.
- Auth-gated patient-web routes (signed in, 72): swept on the production layout. Table: docs/qa/screens/patient-web-auth.md. Findings: docs/qa/findings/web-sweep-auth.md.
- Admin pages (65 files): swept signed in, on the admin build of 03:12, then re-checked on the rebuilt admin from merged main. Findings: docs/qa/findings/admin-sweep.md. Dynamic admin routes (orders/[kind]/[id]) not tested (need IDs).
- Dynamic patient-web routes (53): 5 routes tested with a real seeded doctor (docs/qa/findings/web-sweep-dynamic.md). Found P1: /consultations/doctors/<id> returns 503 (server-to-client function prop). The other ~48 need seeded IDs for articles, facilities, community, orders, appointments, labs, radiology, packages, results, clinics: NOT TESTED, reason: no seeded records of those types yet.
- Scenarios: 8 done, 8 partial, 4 blocked (reason given), 54 not started, of 74 total.
- Open P1s: guest job publish (no route); admin system logs API 404 (AdminLogsController dropped in the P5.3 merge).
- Corrected: hydration P1 retracted (local setup; production layout passes).
- Environment: services drop between turns. Recover with /tmp/claude-0-scratch/stack_up.sh (patient-web via the nonce server). Kill stale next-server processes by PID (comm next-server) before restarting admin.
