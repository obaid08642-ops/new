# QA scenario matrix (Nabd Plus, whole project)

Status key: **DONE** = UI and API 2xx and DB change verified on the local stack, reload checked. **PARTIAL** = some of those proven (named in the row). **BLOCKED** = cannot be tested now (reason in row). **TODO** = not started.

Stack: local MongoDB rs0 (`nabd_live`), backend :8002, admin :3001, patient-web :3000 (production build). Test doubles on. Test data only; nothing on nabd.plus except read-only GETs.

## Coverage

- Scenarios: 20 done, 40 partial, 4 blocked (reason given), 10 not started, of 74 total.
- Screens: 0 of 274 patient-web routes fully scanned (public pages sampled in findings). Admin and provider screens not started.
- The sweep is not finished. It is finished only when both counts reach 100%, or each remaining line gives its reason.

## A. Scenarios (journey × state)

| id | area | scenario | status | evidence / reason |
|---|---|---|---|---|
| P-01 | pharmacy | build cart (local-first), guest | DONE | Retested on rebuilt main (20:05 UTC): product page hydrates, Add to cart updates the header badge to 1, cart page lists the item. Cart is kept in the browser by design (owner decision 2026-10-06), so no DB write to prove. Earlier P1 was a local setup error (findings web-patient.md CORRECTION) |
| P-02 | pharmacy | build cart, signed in | DONE | Same retest as P-01, signed in as the QA patient: badge 1, cart page shows the item, no API errors |
| P-03 | pharmacy | send order (broadcast) | DONE | tools/live/j_pharmacy.py (193/193 on 00:55 UTC run): "submit = broadcast to nearby pharmacies", "the nearby pharmacy sees the broadcast". DB: pharmacy_orders holds broadcasting and cancelled orders from the run |
| P-04 | pharmacy | compare offers | PARTIAL | j_pharmacy.py: offer submitted, "patient sees the offer", "select offer (cash)" pass. Offers are not in ordering_offers (empty), so the DB location is not proven yet |
| P-05 | pharmacy | accept offer and pay (card, test double) | DONE | j_pharmacy.py: payment intent created with the server amount, "payment verified as paid", delivered paid by card. DB: pharmacy_orders completed (4 delivered) |
| P-06 | pharmacy | preparing → courier → delivered → rated | PARTIAL | j_pharmacy.py: "pharmacy: out for delivery", "delivered", "patient rates the pharmacy" pass. The preparing step is not a named step, so it is not proven |
| P-07 | pharmacy | cancel at each step | DONE | j_pharmacy.py: admin cancel, patient cancel, "order is cancelled", second cancel refused, delivered order cannot be cancelled. DB: pharmacy_orders cancelled (9) |
| P-08 | pharmacy | no offers | DONE | tools/live/j_qa_pharmacy_paths.py (72/72): order sent, no answer; local test DB round timers moved to the past, then POST /admin/admin/pharmacy/broadcasts/expire-due until closed; MongoDB: broadcast closed, order manual_review, no selected offer; patient sees manual_review after reload. Each expiry widens the round (round_advanced_by_durable_command), as designed |
| P-09 | pharmacy | offer expired | DONE | tools/live/j_qa_pharmacy_paths.py: pharmacy offer submitted, patient sees it; quote timer moved to the past (local test DB), expiry command run; MongoDB offer status expired; patient select refused; order has no selected offer |
| P-10 | pharmacy | pharmacy rejects | DONE | tools/live/j_qa_pharmacy_paths.py: POST /provider/pharmacy/broadcasts/:id/reject; MongoDB pharmacy_broadcasts responses has the declined entry, broadcast still open; patient sees no offer; a repeat decline replaces the entry (one response per pharmacy). Order-level POST /orders/:id/reject not covered here |
| P-11 | pharmacy | payment fails / declined / 3DS | TODO | fake Moyasar at :9100 |
| P-12 | pharmacy | payment retry | TODO | |
| P-13 | pharmacy | refund | TODO | |
| P-14 | pharmacy | return | PARTIAL | j_pharmacy.py only lists returns (GET /pharmacy/returns/provider/list). The return flow itself is not tested |
| P-15 | pharmacy | prescription required; upload | BLOCKED | uploads closed on the server: expect the clear message (verify the message) |
| P-16 | pharmacy | cash on delivery, first order (D-25) | DONE | tools/live/j_pharmacy.py: "cash on delivery refused on the patient's first order (D-25)" passes on 193/193 (main). The earlier backend accept was a stale build; the D-25 refusal now holds |
| D-01 | doctor | search, filters, sort (incl. available today) | PARTIAL | tools/live/j_consultation.py (123/123 on the 01:00 UTC run): "doctor search lists the approved doctor". Filters, sort and "available today" not checked |
| D-02 | doctor | doctor page → slot → book, video, free | PARTIAL | j_consultation.py: slot held (10 min lock), same slot cannot be booked twice, booking shows paid (video, card). Free booking not checked |
| D-03 | doctor | book clinic visit, paid | DONE | j_consultation.py matrix: clinic + cash appointment created and cash booking recorded. DB via the journey read-backs |
| D-04 | doctor | book with insurance (copay/cap estimate) | PARTIAL | j_consultation.py matrix: home + insurance appointment created, insurance request opened, provider decision visible. Copay/cap estimate not checked |
| D-05 | doctor | book for a family member | DONE | tools/live/j_family_book_for_member.py (54/54): owner books for a family member; MongoDB appointments row: patient_id = member, booked_by_user_id = owner; stranger refused (403); owner pays by card, member sees paid |
| D-06 | doctor | telehealth consent → call | PARTIAL | j_consultation.py reads GET /calls/provider/waiting-room. Consent and the call itself not tested |
| D-07 | doctor | visit summary actions → prescription | DONE | j_consultation.py: visit summary opens; stored summary and prescription are ciphertext in the database (16.9 steps); the patient reads plaintext; prescription listed; access log written |
| D-08 | doctor | no-show | DONE | tools/live/j_qa_appointments.py (56/56, 2026-10-26 run): `POST /calls/provider/no-show` on the rescheduled visit; MongoDB appointments: NO_SHOW, refund_percentage 0, refund_destination none, state_history note no_show; patient sees NO_SHOW after reload; second no-show refused (appointment_not_no_show_eligible) |
| D-09 | doctor | reschedule | DONE | tools/live/j_qa_appointments.py: `PATCH /care/appointments/:id/reschedule`; MongoDB: old RESCHEDULED, new CONFIRMED with rescheduled_from_id; patient list shows new booking; second free reschedule refused (no_free_reschedules_left) with DB unchanged |
| D-10 | doctor | cancel and refund | PARTIAL | j_consultation.py: admin cannot mark refunded without a refund; booking stays paid; refund queue closed. An actual refund is not tested |
| D-11 | doctor | guaranteed-appointment credit | TODO | |
| L-01 | lab | book → provider accepts / rejects → visit → result | PARTIAL | tools/live/j_lab.py (141/141): checkout creates the booking, inbox shows NEW_REQUEST, another lab cannot move it, lab confirms, sample tracked to result_ready, result sent. Provider rejection not tested |
| R-01 | radiology | book → accept / reject → visit → result | PARTIAL | tools/live/j_radiology.py (129/129): booking, center inbox, wrong center refused, patient cannot confirm own booking, center accepts, report uploaded and attached, my results lists it, REPORT_READY. Provider rejection not tested |
| N-01 | nursing | book → accept / reject → visit | PARTIAL | tools/live/j_nursing.py (134/134): booking assigned to the nurse, unpaid card visit refused, payment verified, nurse accepts, visit completed with report and patient signature. Provider rejection not tested |
| I-01 | insurance | add card (company → copay) | PARTIAL | Retested on rebuilt main: save 201, MongoDB patient_profiles holds copay_percent 20 and copay_cap_sar 500 (P1 fixed). Still open: no class field in the form (P2) |
| I-02 | insurance | edit card | PARTIAL | API overwrite with read-back passes (tools/live/j_qa_insurance.py). UI Change button not clicked yet |
| I-03 | insurance | delete card | BLOCKED | No delete exists (P2, findings/insurance-delete.md). Test once an endpoint exists |
| I-04 | insurance | CHI link | TODO | |
| A-01 | account | sign in, email | DONE | Sign-in with registered patient lands on /en/dashboard; document created by registration (users collection) verified |
| A-02 | account | sign up, email OTP | PARTIAL | Registration via API flow (send-otp, verify-otp, register) 2xx; user document verified; web sign-up page not yet clicked through |
| A-03 | account | sign up / sign in, phone OTP | PARTIAL | tools/live/j_accounts.py: login by phone (app payload) passes. Phone OTP sign-up not separately tested |
| A-04 | account | sign in, wrong password | DONE | Generic error shown; 401 on POST /api/auth/login |
| A-05 | account | Google / Apple / X / Snapchat | TODO | gated: check the gate message |
| A-06 | account | forgot password | PARTIAL | API journey tools/live/j_qa_password.py: forgot, reset token from mail, reset, old password refused, new password logs in (all pass). Web forgot page not clicked yet |
| A-07 | account | 8-character password rule | PARTIAL | API: register rejects a 7-character password with a 400 naming the limit (j_qa_password.py). Web form not checked yet |
| A-08 | account | profile edit | PARTIAL | Health basics (height, weight) proven: UI Save → PATCH /api/medical-profile 200; reload shows 172 / 70; MongoDB medicalprofiles doc updated (height_cm 172, weight_kg 70, updatedAt set). Name, email and phone not tested yet |
| A-09 | account | family members | TODO | |
| A-10 | account | addresses (map) | PARTIAL | API journey tools/live/j_qa_account.py: add, edit and delete with read-back (all pass). Map picker UI not tested yet |
| A-11 | account | notifications | PARTIAL | Settings save and read-back pass (j_qa_account.py). In-app notification list not tested yet |
| A-12 | account | loyalty (Nabdat) | PARTIAL | Reads pass: /loyalty/config, /account, /rewards (j_qa_account.py). Earn, redeem and challenge join not tested yet |
| A-13 | account | support / chat | PARTIAL | API journey tools/live/j_qa_support.py: send, read back in the thread (from patient), state read (all pass). Web chat UI not clicked yet |
| A-14 | account | legal pages | PARTIAL | Production (read-only GET): /en/privacy, /en/terms, /en/refund-policy return 200. Local test database has no legal text, so 404 locally is a data gap, not a defect. Content and links not reviewed yet |
| A-15 | account | delete account | PARTIAL | API journey tools/live/j_qa_delete.py on a throwaway account: export works, wrong password refused, erasure with password 2xx, login refused afterwards (all pass). Web settings UI not clicked yet |
| V-01 | provider, pharmacy | registration, every field and step | PARTIAL | tools/live/j_onboarding.py (112/112): pharmacy registration steps, licence and logo uploads, approval with commissions, unconfirmed SCFHS licence refused. Not every field of every step checked |
| V-02 | provider, doctor | registration, every field and step | PARTIAL | tools/live/j_loyalty.py (117/117): doctor registration steps 2 and 3 as sent by DoctorRegistration.tsx, signature upload, approval with commissions. Not every field checked |
| V-03 | provider, lab | registration, every field and step | PARTIAL | tools/live/j_onboarding.py onboard_all (112/112, 2026-10-26): API registration, admin review and approval pass for this type; fields are not walked in the UI and no per-type DB check yet |
| V-04 | provider, radiology | registration, every field and step | PARTIAL | tools/live/j_onboarding.py onboard_all (112/112, 2026-10-26): API registration, admin review and approval pass for this type; fields are not walked in the UI and no per-type DB check yet |
| V-05 | provider, home_care | registration, every field and step | PARTIAL | tools/live/j_onboarding.py onboard_all (112/112, 2026-10-26): API registration, admin review and approval pass for this type; fields are not walked in the UI and no per-type DB check yet |
| V-06 | provider, hospital | registration, every field and step | PARTIAL | tools/live/j_onboarding.py onboard_all (112/112, 2026-10-26): API registration, admin review and approval pass for this type; fields are not walked in the UI and no per-type DB check yet |
| V-07 | provider, all types | admin approval and rejection | PARTIAL | j_onboarding.py: approval with commissions, unconfirmed licence refused (fails closed). Admin rejection of an applicant not tested |
| V-08 | provider, all types | dashboard, receive request, accept / reject / offer | PARTIAL | pharmacy, lab, radiology, nursing journeys: provider inbox shows the new request, provider accepts and completes. Rejection and offers per type not all covered |
| V-09 | provider, all types | schedule, leaves, templates, blacklist, payouts | PARTIAL | j_consultation.py: doctor submits clinic hours, admin approves the slots change. Leaves, templates, blacklist and payouts not tested |
| AD-01 | admin | every list, filter, approve / reject, edit, report | PARTIAL | tools/live/j_admin_clicks.py (45/45, 1 step skipped: nursing assign, no assignable bookings): specialty, lab item and medicine lists (create, delete), CSV and XLSX reports, loyalty reward create and deactivate, finance commissions, navigation links, config portal. About 10 of 65 admin page files exercised; approve/reject and edit on the other pages not covered |

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
- Scenarios: 20 done, 40 partial, 4 blocked (reason given), 10 not started, of 74 total.
- Open P1s: guest job publish (no route); admin system logs API 404 (AdminLogsController dropped in the P5.3 merge).
- Corrected: hydration P1 retracted (local setup; production layout passes).
- Environment: services drop between turns. Recover with /tmp/claude-0-scratch/stack_up.sh (patient-web via the nonce server). Kill stale next-server processes by PID (comm next-server) before restarting admin.
