# Phase 0B semantic evidence — Breathing session repository

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/mental-health/repositories/breathingsession.repository.ts:1–13`

`BreathingSessionRepository` is an injectable typed wrapper around `MongoRepository<BreathingSessionDocument>`, binding `BreathingSession.name` to `Model<BreathingSessionDocument>` (`mental-health/repositories/breathingsession.repository.ts:2–11`). The member contains no user/owner/tenant scope, consent/purpose policy, participant authorization, minimum-necessary projection, sensitive-field redaction, deterministic event/session key, idempotency, optimistic concurrency, retention/deletion/anonymization, audit/provenance or clinical privacy boundary. Inherited generic operations therefore leave protection of breathing-session records entirely to callers. No product code was changed and no tests/builds were executed during this semantic read.
