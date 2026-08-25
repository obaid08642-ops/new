# Phase 0B semantic evidence — Shared calendar event repository

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/family/repositories/sharedcalendarevent.repository.ts:1–13`

`SharedCalendarEventRepository` binds `SharedCalendarEvent.name` to `Model<any>` and extends `MongoRepository<any>` (`family/repositories/sharedcalendarevent.repository.ts:2–11`). The use of `any` removes compile-time guarantees for calendar owner, group, participants, event type, appointment linkage, visibility and timestamps. The member contains no owner/member/group/tenant scope, participant consent, minimum-necessary projection, event-type or appointment validation, timezone/date bounds, duplicate/recurrence policy, optimistic concurrency, idempotency, retention/deletion/anonymization, audit/provenance or notification boundary. Generic inherited operations therefore leave family calendar privacy and event correctness entirely to callers, with no repository-level protection against cross-family schedule disclosure or concurrent event corruption. No product code was changed and no tests/builds were executed during this semantic read.
