# Phase 0B semantic evidence — Home Care / Home Surface

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Members read in full:**
- `src/modules/home/home.service.ts:2–270`
- `src/modules/home/home.controller.ts:2–24`
- `src/modules/home/home.module.ts:1–18`
- `src/schemas/home-care.schema.ts:2–234`

`home.service.ts:16–46` returns active promotion campaigns with discount/old price, provider rating/name and sponsored flag; it uses raw campaign/provider documents and computes percentage without visible zero/validity/date checks. `:48–83` returns the current user's upcoming appointment via request user and provider lookup, with locale/time formatting. `:91–270` performs global search across campaigns, doctors, medicines, labs, radiology, articles, insurers, community posts and the requester's family group. The query is regex-escaped and bounded per domain, but result projections are raw source documents until mapped; published/community/insurance eligibility filters differ by domain and family member data is returned into search results.

`home.controller.ts:5–24` applies JwtAuthGuard to offers/upcoming/search but has no visible `@Public`; all three methods accept raw query/request context with no explicit query length/limit contract. `home.module.ts:1–18` registers promotion and appointment models and the service/controller.

`home-care.schema.ts:7–55` defines HomeCareService with price, cash/insurance availability, active/delete and public/indexing/medical-review governance fields. `:58–160` defines HomeCareBooking containing patient name/phone, service snapshot, total and fee breakdown, address lat/lng, scheduled/state/history, provider contacts, payment/insurance, checklist gate-code/parking, GPS tracking, timers, vitals, clinical notes/procedures/medication/consumables, image/signature base64, emergency escalation, audit trail, referring doctor and rating. The save hook `:152–160` fills totals from service fee when unset. `:162–190` defines NurseProvider and NursingVisitReport with GPS/vitals/notes; `:192–234` defines CarePlan, HomeCarePackage and MedicalSupplyRequest with largely free-form/unbounded fields and status strings.

## Findings candidates

The read supports: offer price/discount truthfulness gaps, public/search projection and privacy issues, authentication contract ambiguity, broad PHI/GPS/signature/checklist storage, client/state/history mutation risk in dependent surfaces, and missing bounds/retention/consent/legal controls in home-care schemas.

No product code was changed and no tests/builds were executed during this semantic read.

## Additional members read — booking, tracking and module

The following additional baseline members were read in full:
- `src/modules/home-care/home-care.service.ts:2–201`
- `src/modules/home-care/controllers/home-care-tracking.controller.ts:2–107`
- `src/modules/home-care/home-care.module.ts:2–70`

`HomeCareSvc` provides active service listing/category counts/detail, booking, patient mine/detail, cancellation, provider/admin state transitions, check-in/report completion, care plans and supplies (`home-care.service.ts:24–201`). Catalog search is regex-escaped and limited to 120; booking resolves service price server-side but trusts contact/address/notes/payment method and uses a recent three-minute duplicate lookup rather than a caller idempotency key or unique booking constraint (`24–33,50–85`). It persists patient name/phone, address, total and notes and emits/announces creation after insert. Cancellation/detail use patient ID or exact role `'admin'`; state transitions delegate to workflow engine but mutate a loaded document and save inside the callback (`87–130`).

Provider check-in/report methods allow admin/nurse/hospital roles but do not visibly bind the operator to the booking's assigned provider before check-in/report; report lookup is by report ID only. GPS values are stored without range/freshness validation (`133–171`). Care-plan creation allows several roles to write for arbitrary patient ID and returns broad records; getCarePlans has no visible requester/relationship check or pagination (`174–190`). Supplies accept raw item arrays and attach only nurse ID (`192–200`).

`HomeCareTrackingController` is JWT guarded. `assignedBooking` permits admin/super_admin or provider roles where `booking.provider_id === user.id`, then verify-attendance uses patient address and nurse coordinates to calculate a 500m geofence; it validates finite numbers but not coordinate bounds, timestamp/freshness or spoof resistance (`20–89`). Supplies request duplicates a separate flow, accepts raw items/priority, and creates a record with booking/nurse object IDs (`91–105`).

`HomeCareModule` registers multiple schemas/controllers/repositories and WorkflowEngine. On module init it counts services and seeds missing catalog documents using per-document upsert, mapping seed title/basePrice/duration/icon to schema fields (`home-care.module.ts:16–70`). Seeding is startup side effect with partial-error logging and no visible version/reconciliation/deprecation lifecycle.

### New findings candidates

The additional read supports: contact/address/PII handling gaps, weak duplicate booking protection, provider/admin ownership gaps, arbitrary care-plan patient targeting, unbounded plans/supplies, GPS/geofence limits, duplicate supply workflows and startup seed drift.

No product code was changed and no tests/builds were executed during this semantic read.
