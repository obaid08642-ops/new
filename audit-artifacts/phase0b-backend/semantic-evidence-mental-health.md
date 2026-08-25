# Phase 0B semantic evidence — Mental Health

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Members read in full:**
- `src/modules/mental-health/mental-health.service.ts:2–251`
- `src/modules/mental-health/mental-health.controller.ts:2–95`
- `src/modules/mental-health/mental-health.module.ts:2–35`

The controller is JWT guarded and derives the patient identity exclusively from `req.user.id` (`mental-health.controller.ts:7–17`). Routes cover mood create/history/stats, meditation create/history/stats, breathing create/history, personal crisis contacts list/create/delete and a non-diagnostic dashboard (`20–95`). The service rejects blank/guest identities, validates mood enums/scales/sleep/notes/tags and future dates, and writes patient_id from the authenticated identity (`mental-health.service.ts:31–111`). History queries use patient_id; mood history accepts up to 365 days (`114–122`), meditation/breathing history are capped at 30 records (`167–203`), and dashboard combines stats plus seven recent moods (`242–250`). Crisis contacts are patient-scoped for read/add/delete and validate basic string/phone lengths (`205–240`).

The implementation explicitly avoids diagnostic interpretation and self-assessment scoring (`service:103–104; controller:70–70`). However, creation routes have no visible idempotency key/replay handling, audit event, rate limit or abuse control. Mood/meditation/breathing create operations return `toObject()` documents, and crisis-contact creation returns the full persisted contact (`105–111,145–164,180–197,224–231`). `getMoodHistory` can return a year of highly sensitive wellbeing notes/tags without pagination/projection (`114–122`); `getMeditationStats` loads all patient sessions before computing totals (`172–177`), and dashboard issues multiple patient queries (`242–250`).

The module registers four Mongoose schemas and repository providers and exports the service (`mental-health.module.ts:16–34`).

No product code was changed and no tests/builds were executed during this semantic read.

## Findings candidates

The read supports: sensitive mental-health data exposure risks, no replay/rate controls on mutations, broad history/notes projection, full-document returns, non-atomic multi-query dashboard consistency, and lack of explicit deletion/retention/export/audit controls.
