# Phase 0B semantic evidence — radiology-reminder.cron.ts

**Archive member:** `src/modules/radiology/cron/radiology-reminder.cron.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–59; full 59-line member covered.

Lines 2–14 define an injectable cron provider using Nest Schedule, the `RadiologyCenterBooking` model, and EventEmitter. Lines 16–18 schedule `handlePreparationReminders` every hour. Lines 19–25 query confirmed bookings scheduled after now and before now plus 25 hours, populating `service_id`. Lines 27–43 calculate rounded hours until each booking and choose fixed Arabic/English reminders only when the rounded difference equals 24, 12 or 2 hours. Lines 45–56 emit `patient.notify` with patient ID, reminder text and booking ID, then log the sent reminder.

**Truthfulness/clinical safety:** fasting messages are hard-coded to six hours at 24h and “do not eat or drink” at 12h, without reading the populated service’s `fasting_required`, `fasting_hours`, modality, contrast requirement, or patient-specific preparation. This can issue clinically incorrect preparation instructions. The 24-hour query window is 25 hours, but rounded-hour equality and an hourly schedule may miss or duplicate intended reminder windows.

**Reliability/idempotency:** no sent-reminder persistence, event ID, dedupe key, distributed lock, retry, outbox, dead-letter, or alerting is visible. Multiple application instances or retries can emit duplicates; event failure is not caught. There is no check for cancellation, reschedule after query, timezone, or notification preferences.

**Ownership/privacy:** patient ID and booking ID are emitted to downstream event consumers; no authorization/privacy or notification preference check is visible here. Booking population is not used for individualized instruction.

**State/transitions:** only `state: CONFIRMED` bookings are selected; selection → event emission, with no durable state marking.

**Price/payment/insurance source:** none visible.

**Test implications:** require deterministic time-window tests, timezone/DST, cancellation/reschedule exclusion, service-specific preparation rules, dedupe under repeated cron/parallel instances, event failure/retry/outbox, notification preferences, and no sensitive-data leakage. No cron executed and no tests run during this semantic read.
