# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE2_MEDICATION_REMINDER_CONTRACT_GAP_20260819.md`
- **Member SHA-256:** `eeb133896e4f2d0deed2edf3f99c14197ef1b499c08d52069c90c72bd1a532c7`
- **Line count:** 22
- **Read range:** `1-22`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: The Patient reminder-creation screen calls a real `POST /health/reminders` route. Backend validates patient-owned reminder creation with medicine name and time requirements, then stores a reminder. The finding is not a missing route; it con`
- `12: | Shows chronic reorder-reminder promise (“5 days before empty”) | `reorderReminder` is never sent; Backend needs `refill_date` and uses an enriched threshold of three days, while the screen sends neither `pills_remaining` nor `refill_date``
- `14: | Saves server reminder then immediately returns | This screen itself does not schedule local/device notification work | Persistence alone does not prove notification delivery | **VERIFY/FIX — connect successful reminder creation to the not`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `14: | Saves server reminder then immediately returns | This screen itself does not schedule local/device notification work | Persistence alone does not prove notification delivery | **VERIFY/FIX — connect successful reminder creation to the not`
### state_transitions
- `10: | Lets the user choose “times per day” separately from selected time chips | Backend receives only the `times` array; no times-per-day field is persisted/validated | UI can state a dose count inconsistent with actual scheduled times | **FIX`
- `12: | Shows chronic reorder-reminder promise (“5 days before empty”) | `reorderReminder` is never sent; Backend needs `refill_date` and uses an enriched threshold of three days, while the screen sends neither `pills_remaining` nor `refill_date``
- `14: | Saves server reminder then immediately returns | This screen itself does not schedule local/device notification work | Persistence alone does not prove notification delivery | **VERIFY/FIX — connect successful reminder creation to the not`
- `18: The client validates a non-empty medicine name and at least one parseable time. Backend requires the same minimum fields, scopes reminders by `patient_id`, and returns the created record. Existing reminder logs are patient-scoped.`
### payment_insurance_relevance
- `9: | Offers monthly frequency but sends `weekly` whenever monthly is selected | Backend stores whatever `frequency` it receives | A user-visible monthly schedule is silently saved as weekly | **P0 FIX — either implement monthly recurrence in t`
### error_empty_loading_retry_cancel
- `12: | Shows chronic reorder-reminder promise (“5 days before empty”) | `reorderReminder` is never sent; Backend needs `refill_date` and uses an enriched threshold of three days, while the screen sends neither `pills_remaining` nor `refill_date``
- `14: | Saves server reminder then immediately returns | This screen itself does not schedule local/device notification work | Persistence alone does not prove notification delivery | **VERIFY/FIX — connect successful reminder creation to the not`
- `18: The client validates a non-empty medicine name and at least one parseable time. Backend requires the same minimum fields, scopes reminders by `patient_id`, and returns the created record. Existing reminder logs are patient-scoped.`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
