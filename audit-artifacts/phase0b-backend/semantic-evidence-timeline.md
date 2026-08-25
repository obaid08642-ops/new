# Phase 0B semantic evidence — Timeline

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Members read in full:**
- `src/modules/timeline/timeline.service.ts:2–386`
- `src/modules/timeline/timeline.controller.ts:2–39`
- `src/modules/timeline/timeline.module.ts:2–44`
- all 11 files under `src/modules/timeline/repositories/*.repository.ts:1–13`

`timeline.service.ts:15–103` defines a unified event contract and a static status map across orders, prescriptions, labs, radiology, home-care, consultations, vitals, reminders and reports. `:105–366` runs one query per requested kind, each limited independently by `opts.limit`, then merges/sorts and truncates the result; invalid kinds are merely ignored, unknown statuses default to `active`, and event titles/subtitles/meta/links are assembled from raw source fields. Orders include total and item names; prescriptions include diagnosis in subtitle; medical/lab/radiology results include summaries/critical flags. `:321–340` loads reminder documents and expands up to ten log entries each without an explicit query limit. `:369–385` returns aggregate counts from separate sources without snapshot/authorization abstraction.

`timeline.controller.ts:7–39` applies JwtAuthGuard and accepts free-form comma-separated kinds, limit and date strings. It does not visibly validate finite dates, allowlisted kinds or safe limit bounds before passing them to service; missing identity returns an empty feed/summary rather than an explicit auth failure. `timeline.module.ts:27–44` wires 11 models/repositories. Repositories are thin Mongo wrappers with no ownership/projection logic; the appointment wrapper imports `Appointment` from `extra.schemas` while the module registers `AppointmentSchema` from `appointment.schema`, creating a model-source consistency risk. Other wrappers use `MongoRepository<any>` and add no safety behavior.

## Findings candidates

The read supports: per-kind fan-out amplification and unbounded reminder expansion, raw PHI/financial projections, free-form query/date validation, status-map drift, silent identity/failure semantics, duplicate appointment model wiring, and non-snapshot counts/feed consistency.

No product code was changed and no tests/builds were executed during this semantic read.
