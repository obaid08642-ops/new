# How a provider's licence is verified (owner decision 2026-11-17)

**There is no integration with the Saudi Commission for Health Specialties (SCFHS) or any registry.** No check, alert or launch task expects one.

| step | who | what |
|---|---|---|
| registration | the provider | types the licence number and **expiry date**, uploads the licence document (private storage) |
| approval | an admin | reads the document and checks number, holder and date against it; approves, rejects, or sends back with the documents to replace (a rejected / sent-back provider sees which documents and why, and uploads replacements: `GET /provider/kyc/replacements`, `POST /provider/kyc/documents`) |
| during validity | the system | warnings at 30, 14, 7, 3 and 1 days; the admin list `GET /provider/license-expiry` shows who is near expiry |
| expiry | the system | valid through the end of the expiry day, Riyadh time (rule A2); then no new bookings/orders/offers for ANY provider type, the profile is hidden and the account restricted |
| renewal | the provider + an admin | the provider uploads the renewed licence and date; **an admin approves the document before the date moves** (C2) |

## What is inert on purpose
The SCFHS re-check (`scfhs-license.service.ts`, daily 04:00 UTC) does nothing while `SCFHS_VERIFY_URL` / `SCFHS_API_KEY` are empty (`dailyRecheck` returns `{ checked: 0, hidden: 0 }`), and approval then needs the admin's manual check (`source: 'admin_manual'`). The code stays so a later decision can switch it on; `backend/src/common/scfhs-env-usage.spec.ts` fails if anything else starts to read those variables (a launch check or alert expecting SCFHS).
