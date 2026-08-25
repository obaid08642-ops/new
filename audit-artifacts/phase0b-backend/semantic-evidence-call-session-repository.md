# Phase 0B semantic evidence — Call session repository

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/livekit/repositories/callsession.repository.ts:1–13`

`CallSessionRepository` is an injectable typed wrapper around `MongoRepository<CallSessionDocument>`, binding `CallSession.name` to `Model<CallSessionDocument>` (`livekit/repositories/callsession.repository.ts:2–11`). The member contains no appointment/booking owner scope, participant authorization, room/token expiry, call-purpose binding, minimum-necessary projection, metadata redaction, duplicate/session uniqueness, optimistic concurrency, idempotency, retention/deletion, recording/privacy policy, audit/provenance or cross-tenant boundary. Generic inherited operations therefore leave protection of telehealth call sessions and session lifecycle entirely to callers. No product code was changed and no tests/builds were executed during this semantic read.
