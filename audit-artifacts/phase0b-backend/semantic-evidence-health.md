# Phase 0B semantic evidence — health

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Members read in full:**
- `src/modules/health/health.service.ts:2–798`
- `src/modules/health/health.controller.ts:2–140`
- `src/schemas/health.schema.ts:2–68`
- `src/modules/health/health.module.ts:2–23`

## Semantic read

`health.service.ts:25–71` normalizes vital aliases/types, BP and scalar physiological ranges, records patient-bound readings and excludes soft-deleted rows in primary list methods. `:73–164` provides the vitals-log/chart/recent/latest/summary projections, using real readings and omitting empty chart buckets. `:167–262` computes a weighted health score from profile/vitals/sleep/count data and returns `insufficient_data` when fewer than two components exist; thresholds/recommendations are hard-coded clinical heuristics and are not shown as clinician-approved decision support. `:264–277` soft-deletes and updates vitals after a patient-scoped lookup, but update is read-then-write without version/CAS.

`:279–353` validates IANA timezone, HH:mm times, frequency, dose counts/dates/pills and creates patient-bound reminders. `:356–381` auto-creates reminders from orders with fixed 08:00/20:00, tablet, 7-day defaults after an existence check. `:384–429` derives daily dose status from a free-form log and rejects same-local-day duplicates, but appends by read/array rewrite. `:432–474` toggles/updates/deletes reminders patient-scoped, with update read-then-write. `:476–557` prepares/refills through OrdersService with a short reservation field to avoid concurrent order creation, but uses a lock without visible TTL/cleanup and has a multi-write order/tag/reminder saga. `:559–592` snoozes/cancels/enriches refill state; snooze uses `Math.max(1, days)` without an upper bound and no atomic/CAS/idempotency.

`:595–614` adds/lists sleep readings but only checks presence of score/duration; no numeric range/date/source validation is visible. `:619–685` projects reports/prescriptions from raw collections, omitting some bodies/images but retaining clinical status, medication/diagnosis and doctor/facility labels. `:687–730` reads/adds/removes emergency contacts directly in `patient_profiles`; primary toggling and push are separate non-atomic writes, no duplicate/contact count constraint or idempotency is shown. `:732–759` returns self-declared chronic disease data and reminders. `:762–797` computes trends from real readings but uses hard-coded normal ranges and raw readings with no explicit clinical disclaimer/versioning.

`health.controller.ts:8–12` applies JWT guard and idempotency interceptor globally. `:14–48` exposes vitals read/add/update/delete and marks mutations with `@RequireIdempotency`; query limits/types are parsed raw and not strictly validated at controller boundary. `:50–55` declares wearable routes but returns `NotImplementedException` despite idempotency. `:57–80` exposes reminder create/log/update/delete with idempotency, but refill, refill snooze and chronic cancel routes `:67–72` lack `@RequireIdempotency`. `:82–84` medication refill has idempotency and aliases the same service. `:86–93` sleep add has no idempotency marker and raw body. `:95–140` exposes reports/prescriptions/emergency/chronic/trends; emergency add/remove have no idempotency marker and raw body/id; all routes rely on service current-user scoping.

`health.schema.ts:5–21` stores VitalReading with unique id, indexed patient/type, string value and soft-delete marker/index. `:23–56` stores MedicationReminder with patient/medicine/order/prescription links, schedule, free-form `log:any[]`, chronic refill fields and patient/active index; refill lock has no expiry field. `:58–68` stores SleepReading with patient index, numeric score/duration/source and measured-at index but no schema bounds/enums. `health.module.ts:12–22` registers only three health models, OrdersModule forwardRef, repositories and IdempotencyInterceptor.

## Findings candidates

The read supports: (1) missing idempotency on refill/snooze/cancel, sleep add and emergency contact mutations; (2) health/sleep/reminder schema gaps and read-then-write races; (3) refill multi-write saga and lock lifecycle; (4) hard-coded auto-reminder defaults and clinical score/trend thresholds requiring governance; (5) raw report/prescription projections and clinical PII minimization; (6) non-atomic emergency primary contact updates; (7) not-implemented wearable routes; (8) weak controller query/body validation and inconsistent alias route contracts.

No product code was changed and no tests/builds were executed during this semantic read.

## Additional dependency members

`src/modules/notifications/notification-delivery.processor.ts:2–26` was read in full: the BullMQ processor accepts only `deliver` jobs and delegates directly to `NotificationsService.deliverById`; it adds no deduplication, lease, ownership or independent retry policy.

`src/modules/health/repositories/medicationreminder.repository.ts:2–13`, `sleepreading.repository.ts:2–13`, and `vitalreading.repository.ts:2–13` were read in full. Each is a constructor-only `MongoRepository` wrapper around the canonical health schema; none adds validation, ownership, atomic update, idempotency or transaction behavior.
