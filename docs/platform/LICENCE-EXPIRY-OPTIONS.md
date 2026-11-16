# Provider licence expiry, the five types: what exists, what is open, options for the owner (2026-11-16, lane B)

Docs only. No code changes until the owner decides. Everything under "What exists" was read in the code (file:line), not assumed.

## 1. What exists today
| piece | behaviour | where |
|---|---|---|
| The date is captured for every type | doctor, pharmacy, lab, nursing and facility registrations send `license_expiry_date`; submit refuses a bad or past date (`license_expiry_invalid`) | `docs/review/PROVIDER_ADMIN_GAPS.md` G7 (DONE, lane V check 2026-11-09), `provider-onboarding.module.ts` |
| Warnings | daily 06:00 UTC: in-app notification + push event at 30, 14, 7, 3 and 1 days left, once per threshold per expiry date (a renewed date resets them) | `legal-enterprise.service.ts` `licenseMonitor` (~234-285) |
| Automatic suspension | the same job, when `daysLeft <= 0`: profile `status: suspended`, `public_eligibility: false`, `license_status: expired`; the account is lapsed and the login follows (`suspendAccountForLicense`); notification "account suspended, renew and upload"; event `provider.license_suspended` (bell + push) | same, `facility-license.ts:32` |
| Bookings stop at the moment, doctors only | a doctor whose date has passed cannot be booked (`doctor_license_expired`), closing the hours before the daily job (owner decision 2026-10-24) | `care/appointments.service.ts:162-167` |
| SCFHS re-check, daily 04:00 UTC | for public, active profiles verified through the SCFHS API: lapsed / not found / suspended -> hidden + account suspended, with a grace period (`SCFHS_RECHECK_GRACE_DAYS`, default 14) when the API is unavailable. **Does nothing if the SCFHS API is not configured.** Applies to doctor, nursing, home care and pharmacy only (`SCFHS_TYPES`) | `scfhs-license.service.ts:88-110`, `common/scfhs-license.ts:33` |
| Admin list | `GET /provider/license-expiry?within_days=&type=` (admin) with `days_left` / `expired` | `provider-admin.service.ts:309`, `provider.controllers.ts:170` |
| Renewal | reactivation requires the new expiry date (otherwise the daily job suspends again next morning); a provider changing the date goes through the credential-change review with the licence document | `provider-admin.service.ts:437`, `credential-changes.ts:17` |

## 2. What is open (found by reading, each is a decision or a small fix)
1. **Who vouches for the date.** For doctor, nursing, home care and pharmacy the SCFHS lookup can verify it (only when the SCFHS API is configured: is it, in production? the lead's server checks can tell). For **lab, radiology, hospital and nursing companies the date is what the provider typed** (the facility licence document is reviewed by an admin at approval; nothing re-checks it later). A provider can type a far-future date.
2. **The day boundary.** The monitor suspends when `ceil((expiry - now) / day) <= 0`. A date stored as midnight UTC is therefore treated as expired from the start of the expiry day (03:00 Riyadh), while a licence is normally valid through its last day. Decide: valid through the end of the expiry day (Riyadh time), or from its start.
3. **The gap before 06:00 UTC.** Only doctors have the instant booking check; a pharmacy, lab, radiology or nursing provider whose date passed at 00:00 can still receive new orders/bookings until the 06:00 job.
4. **What happens to what is already booked.** On suspension nothing handles confirmed future appointments, accepted orders, home visits, lab/radiology samples in progress (I found only the notification handlers). Options below.
5. **No grace or "restricted" state.** It is all-or-nothing: public, or suspended with the login blocked (the provider can still open the app to renew? the G6 gate lets a non-approved account use only the onboarding steps, and `GET/POST /provider/kyc/documents` is blocked: see #2690, so uploading the renewed licence may not work from the app after a suspension).
6. **Load (a small fix, I can do it without a decision)**: `licenseMonitor` loads every profile that has an expiry date in memory with no projection and writes row by row. Fine today, wrong for the memory problem of 2026-11: it should stream with a projection.

## 3. Options (the owner picks one per row; my recommendation is marked)
**A. When it takes effect**
- A1 strict (today): suspended the day the date is reached; new bookings blocked for all five types at once (extend the doctor check to the others).
- **A2 (recommended): valid through the end of the expiry day in Riyadh time, then A1.** Matches how licences are read; the warnings already give 30 days of notice.

**B. What the provider keeps after expiry**
- B1 (today) suspended and hidden; login blocked.
- **B2 (recommended): "restricted": hidden from search and not bookable, login still works to finish existing work and upload the renewed licence; no new bookings or orders.** Needs the two KYC routes allowed for non-approved accounts (open question in #2690).
- B3 a grace of N days (the SCFHS check already has 14) before B1/B2: only if the owner wants to be lenient; a licence that lapsed is a legal matter, so this is the riskiest.

**C. Who verifies the date**
- C1 provider-typed + admin checks the document at approval and at renewal (today for lab, radiology, hospital).
- **C2 (recommended): C1 plus a yearly admin task: the admin list `GET /provider/license-expiry` filtered per type, and the renewed document must be approved before the date moves.** No new service, no cost.
- C3 SCFHS API for every type that SCFHS licenses (needs the API configured and, for facilities, a different registry: the ministry/MoH facility licence has no API we use; no new paid service without approval).

**D. Existing bookings when the provider is suspended**
- D1 leave them (today): patients are not told.
- **D2 (recommended): keep the visits already confirmed within a short window (owner sets, e.g. 48 h) only if the licence lapsed less than that ago; otherwise cancel with a full refund (REFUNDS table: provider cancels = 100%) and notify the patient, offering a rebook.** Cancelling a visit the provider may legally not perform is the safer default; it needs the owner's word because it moves money and touches patients.
- D3 cancel everything at once.

## 4. What I will do without a decision
The memory fix of item 2.6 (stream with a projection) as a small PR. Everything else waits for the owner: A, B, C, D above, plus whether the SCFHS API is configured in production.
