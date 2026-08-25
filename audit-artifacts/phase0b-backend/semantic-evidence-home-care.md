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
