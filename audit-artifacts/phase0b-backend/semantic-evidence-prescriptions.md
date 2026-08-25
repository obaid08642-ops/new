# Phase 0B semantic evidence — Prescriptions

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Members read in full:**
- `src/modules/prescriptions/prescriptions.service.ts:2–331`
- `src/modules/prescriptions/prescriptions.controller.ts:2–73`
- `src/modules/prescriptions/prescriptions.module.ts:2–21`
- `src/modules/prescriptions/repositories/prescription.repository.ts:2–13`
- `src/schemas/prescription.schema.ts:2–53`

`prescriptions.service.ts:42–151` requires a doctor role and a verified in-progress appointment for doctor-created prescriptions, derives/checks doctor and patient linkage, and verifies catalog medicines. Manual items are kept prescription-scoped and require later review before dispensing. `:154–203` accepts patient-uploaded image/items, creates manual medicine entries when no ID exists, swallows manual-entry creation errors, persists the supplied `upload_image` and raw item fields, and starts the record in `CREATED_BY_DOCTOR` despite patient origin. `:205–263` checks role/participant for transitions/send/substitution but saves state separately from event emission and has no visible idempotency/CAS; send accepts a client pharmacy_id. `:266–331` lists queues with role-sensitive filters and returns a strict patient detail projection with participant/privileged-admin checks, using 404 for foreign records.

`prescriptions.controller.ts:6–73` guards all routes with JWT and applies roles to create/manual-entry/send/substitute/queues, but upload is available to any authenticated user and most bodies are raw `any`/inline types. Transition route has no visible role decorator and delegates role/state checks to service. No visible Idempotency-Key contract exists for prescription mutations.

`prescription.schema.ts:6–53` embeds PrescriptionItem with many optional/unbounded medication/diagnosis/instruction fields, stores upload_image directly, has enum-backed state but generated `id` is not visibly unique/indexed, and has patient/doctor/state indexes only. No provenance/version/retention/consent/access audit fields are visible. The repository and module are thin DI/model wiring.

## Findings candidates

The read supports: patient upload raw image/item/medical data and misleading state, swallowed manual-entry failure, unbounded medication/PHI fields, client pharmacy assignment, non-atomic state/event transitions, missing prescription ID uniqueness, absent idempotency/provenance/retention, and transition route contract ambiguity.

No product code was changed and no tests/builds were executed during this semantic read.
