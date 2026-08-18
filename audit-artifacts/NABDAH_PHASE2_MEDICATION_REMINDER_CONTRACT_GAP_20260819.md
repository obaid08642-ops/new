# Phase 2 Patient — medication reminder contract gap

## Scope

The Patient reminder-creation screen calls a real `POST /health/reminders` route. Backend validates patient-owned reminder creation with medicine name and time requirements, then stores a reminder. The finding is not a missing route; it concerns dosage, schedule, refill, and therapeutic truthfulness.

| Patient behavior | Backend behavior | Finding | Required disposition |
|---|---|---|---|
| Offers monthly frequency but sends `weekly` whenever monthly is selected | Backend stores whatever `frequency` it receives | A user-visible monthly schedule is silently saved as weekly | **P0 FIX — either implement monthly recurrence in the shared contract or remove/disable the monthly option** |
| Lets the user choose “times per day” separately from selected time chips | Backend receives only the `times` array; no times-per-day field is persisted/validated | UI can state a dose count inconsistent with actual scheduled times | **FIX — derive count from selected times or enforce an exact match** |
| Supports half-pill steps and sends decimal `dosage_count` | Backend uses `parseInt(data.dosage_count, 10) || 1` | `0.5` is persisted as `1` while dose text says `0.5 قرص` | **P0 FIX — preserve decimal dosage or constrain UI to supported units** |
| Shows chronic reorder-reminder promise (“5 days before empty”) | `reorderReminder` is never sent; Backend needs `refill_date` and uses an enriched threshold of three days, while the screen sends neither `pills_remaining` nor `refill_date` | The feature promise is not persisted or executable | **FIX — remove the promise until an explicit refill schedule contract exists, or persist inventory/refill settings and align threshold/copy** |
| Allows arbitrary medicine name and self-selected food instructions | Backend stores manual values without prescription linkage by default | A patient-entered reminder can look like an authoritative dosage or prescription instruction | **MEDICAL-SAFETY FIX — label manual reminders as patient-entered; link prescription/order data where available and avoid therapeutic claims** |
| Saves server reminder then immediately returns | This screen itself does not schedule local/device notification work | Persistence alone does not prove notification delivery | **VERIFY/FIX — connect successful reminder creation to the notification scheduler and test permission, timezone, device lifecycle, and cancellation behavior** |

## Positive controls

The client validates a non-empty medicine name and at least one parseable time. Backend requires the same minimum fields, scopes reminders by `patient_id`, and returns the created record. Existing reminder logs are patient-scoped.

## Decision

Medication reminders remain a real but **contract-incomplete health feature**. The monthly recurrence, fractional-dose integrity, refill reminder promise, manual-entry labeling, and verified notification scheduling must be corrected and tested before it is represented as clinically reliable medication support.
