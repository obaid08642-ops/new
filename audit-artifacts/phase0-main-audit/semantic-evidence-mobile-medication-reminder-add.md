# Semantic evidence — Mobile Medication Reminder Add/Edit

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/health/medication-reminder-add.tsx:1–14` uses Reanimated, `apiFetch`, local notification helpers and localized medication strings. It supports add/edit based on an optional route `id` (`:16–25`). Edit mode first loads the entire `/health/reminders` collection and selects a matching item locally (`:27–42`), rather than proving an owner-scoped detail route.

The form captures medicine name, dose, dosage count, selected times, frequency, duration/chronic status, remaining pills, refill date, instructions, timezone, importance and refill lead days (`:22–25,69–75`). Client validation checks required fields, finite dosage count, integer duration and non-negative remaining pills, but does not visibly validate time-zone syntax, date validity, dose units, clinical maximums, medicine identity or cross-field frequency semantics (`:45–49`).

Save performs either `POST /health/reminders` or `PATCH /health/reminders/{id}` with a JSON payload (`:45–55`). It then performs a second preferences update through `setMedicationNotificationPreferences`, schedules local notifications, and navigates to the list with `alertStatus` (`:56–61`). No visible `Idempotency-Key`, atomic server transaction, duplicate/replay handling or compensation is present. A reminder may persist while preferences or local scheduling fail.

The source detects local notification permission denial and passes a status to the next screen (`:57–60`), but does not prove server push delivery, device permission lifecycle, timezone/DST correctness, reminder acknowledgement/taken mutation, cancellation, edit cleanup of prior schedules, or cross-device synchronization. `@ts-nocheck` is absent here, but multiple response/payload values remain `any`-backed.

No Phase 0 remediation was made.
