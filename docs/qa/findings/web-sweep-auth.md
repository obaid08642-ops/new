# QA sweep: patient-web auth-gated routes, signed in (production layout)

Source: sweep_auth2 (72 routes, 390 and 1280 px). Table: docs/qa/screens/patient-web-auth.md.

Signed-in login works on the production layout. Redirects to /en/appointments, /en/insurance, /en/profile/addresses and /en/pharmacy/barcode are state-based and read as intended. Still to confirm per route.

| severity | route | element | steps | expected | actual | file:line |
|---|---|---|---|---|---|---|
| P3 | /family/add | POST /api/family/invite | Open the add-family page as a member who is not the group owner | A clear message that only the owner can invite (403) | HTTP 404 with "You must be the group owner": wrong status for an authorisation failure, and the page's message needs checking | backend/src/modules/family/family.controller.ts:37-40 |
| P3 | /labs/basket, /labs/confirm, /labs/providers, /labs/when | controls | Open each page at both widths | Every control has an accessible name | 5 visible controls per page with no name | patient-web labs pages (not yet located) |
| P3 | /consultations/video-call | control | Open the page | Named | 1 unnamed control | not yet located |
| P3 | /drug-scanner (redirects to /pharmacy/barcode) | control | Open the page | Named | 1 unnamed control | not yet located |

Checked and NOT findings: GET /api/patient/family/chat/messages returns 403 `not_active_family_member` for a user who is not in a family; the UI classifies this (family-chat.tsx:19). Expected.
