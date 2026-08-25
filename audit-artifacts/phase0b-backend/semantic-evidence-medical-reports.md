# Phase 0B semantic evidence — Medical Reports

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Members read in full:**
- `src/modules/medical-reports/medical-reports.service.ts:2–69`
- `src/modules/medical-reports/medical-reports.controller.ts:2–51`
- `src/modules/medical-reports/medical-reports.module.ts:2–16`
- `src/modules/medical-reports/repositories/medicalreport.repository.ts:2–13`
- `src/schemas/medical-report.schema.ts:2–56`

`medical-reports.service.ts:14–22` lists reports for `patient_id=user.id`, supports free-form type and escaped text regex, excludes body but has a caller-controlled bounded limit. `:24–30` loads by id, returns 404 for foreign records/admin exceptions, marks patient viewed by mutating the report on read, then returns the full object including body/attachments. `:32–60` permits roles admin/doctor/hospital/radiology/lab, accepts raw body, trusts `body.patient_id`, patient/name/doctor/facility IDs/names, arbitrary attachments and issued date, persists clinical content and emits a non-durable event. `:62–68` is tracking lookup but still requires authenticated user and only patient/admin ownership.

`medical-reports.controller.ts:9–51` guards all routes with JWT, exposes a duplicated timeline that separately queries five collections and swallows all query failures to empty arrays, then labels radiology as `type: lab` with a kind field. `mine` accepts raw type/q/limit, `track/:trackingId` and `:id` delegate service, and POST accepts `any` body without DTO/idempotency or explicit role decorator. `medical-report.schema.ts:22–56` stores broad clinical PHI, patient/doctor/facility identity, links, unbounded body/diagnosis/recommendations and base64 attachment objects, with only basic patient/date/type indexes and view flag. Module/repository are thin wiring.

## Findings candidates

The read supports: patient_id spoofing on creation, raw/unbounded PHI/attachment persistence, duplicate inconsistent timeline, event durability gap, read-side mutation, tracking semantics ambiguity, and absent field-level role projection/retention/consent/idempotency.

No product code was changed and no tests/builds were executed during this semantic read.
