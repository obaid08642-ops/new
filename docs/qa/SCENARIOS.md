# QA scenario matrix (Nabd Plus, whole project)

Status key: **DONE** = UI and API 2xx and DB change verified on the local stack, reload checked. **PARTIAL** = some of those proven (named in the row). **BLOCKED** = cannot be tested now (reason in row). **TODO** = not started.

Stack: local MongoDB rs0 (`nabd_live`), backend :8002, admin :3001, patient-web :3000 (production build). Test doubles on. Test data only; nothing on nabd.plus except read-only GETs.

## Coverage

- Scenarios: 2 done, 1 partial, 4 blocked (reason given), 52 not started, of 59 total.
- Screens: 0 of 274 patient-web routes fully scanned (public pages sampled in findings). Admin and provider screens not started.
- The sweep is not finished. It is finished only when both counts reach 100%, or each remaining line gives its reason.

## A. Scenarios (journey × state)

| id | area | scenario | status | evidence / reason |
|---|---|---|---|---|
| P-01 | pharmacy | build cart (local-first), guest | BLOCKED | Product pages /en/c, /en/p/* never hydrate: CSP nonce mismatch (findings P1) |
| P-02 | pharmacy | build cart, signed in | BLOCKED | Same as P-01 |
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
| I-01 | insurance | add card (company → class → copay) | TODO | |
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

## B. Screens

Per-screen scan (every element, sizes 390/768/1280, six languages, dark mode) is recorded in `docs/qa/screens/`. Not started beyond the public pages listed in `docs/qa/findings/web-patient.md`.

## Notes

- Each DONE row needs the DB proof (collection, document id, fields) recorded in the evidence column.
- Provider and admin sides of each scenario are checked at the same moment (status sync) once the patient side is DONE.
