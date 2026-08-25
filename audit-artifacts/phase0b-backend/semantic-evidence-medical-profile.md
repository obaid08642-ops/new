# Phase 0B semantic evidence — Medical Profile

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Members read in full:**
- `src/modules/medical-profile/medical-profile.service.ts:2–58`
- `src/modules/medical-profile/medical-profile.controller.ts:2–36`
- `src/modules/medical-profile/medical-profile.module.ts:2–16`
- `src/modules/medical-profile/repositories/medicalprofile.repository.ts:2–13`
- `src/schemas/medical-profile.schema.ts:2–56`

`medical-profile.service.ts:14–29` get-or-creates a profile by patient_id and updates a broad allowed list from raw body, with only last_updated_at/by fields. `:31–38` intentionally blocks provider lookup pending consent/relationship contract, which prevents this direct disclosure path. `:40–57` appends/removes arbitrary list items using read/modify/write and accepts any list string in removeItem; missing IDs return the unchanged profile rather than explicit 404.

`medical-profile.controller.ts:8–36` guards all routes with JwtAuthGuard, exposes profile read/update, five PHI item mutations and a `passport-token` route. The passport token is a five-minute JWT with `health_passport` scope and QR type, but there is no visible issuance audit, audience/recipient binding, revocation or persistence. Item bodies are raw `any`; mutations have no visible idempotency. Provider route delegates to the explicit ForbiddenException gate.

`medical-profile.schema.ts:14–56` defines unique patient_id but stores blood_type as free string despite BloodType enum, gender as free string, unbounded numeric/demographic fields, five PHI arrays as any[], free-form emergency_contact and notes, and only last_updated_at/last_updated_by_id audit fields. No embedded item schemas, bounds, consent/provenance/version/retention fields or passport-token state are present. The repository and module are thin DI wiring only.

## Findings candidates

The read supports: any[] PHI mass assignment, missing bounds/enums, non-atomic list updates, false-success deletion, untracked health-passport JWT issuance, insufficient audit/consent/provenance/retention and absence of idempotency for medical mutations.

No product code was changed and no tests/builds were executed during this semantic read.
