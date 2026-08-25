# Phase 0B semantic evidence — Home-care nurse schema

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/home-care/schemas/home-care-nurse.schema.ts:1–19`

`HomeCareNurse` stores bilingual name, gender, facility, degree, rating, distance, reviews, supported services/packages/frequencies and coordinates (`4–17`). There is no explicit stable nurse/provider ID, account linkage, tenant, license/registration number, verification/approval status, credential expiry, specialty credential or active/deleted lifecycle. `gender`, facility and degree are free strings; `rating` and `distance_km` are unconstrained numbers with no source/effective timestamp or server-derived geospatial provenance (`6–12`).

Reviews are an inline `any[]` nested object with free-form user/text/rating and no author identity policy, moderation, ownership, duplicate/replay prevention, content bounds or PII redaction (`13`). Supported services, packages and frequencies are free string arrays without canonical catalog references, clinical eligibility, capacity or schedule semantics (`14–16`). Location is a free object with coordinates and no bounds, geospatial index, service radius, privacy projection or retention policy (`17`). No audit/provenance, optimistic concurrency, idempotency, retention/deletion/anonymization, credential/equipment readiness or patient-facing minimum-necessary projection is encoded. No product code was changed and no tests/builds were executed during this semantic read.
