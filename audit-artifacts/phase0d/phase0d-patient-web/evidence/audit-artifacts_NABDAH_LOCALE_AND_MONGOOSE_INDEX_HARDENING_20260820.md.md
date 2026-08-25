# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_LOCALE_AND_MONGOOSE_INDEX_HARDENING_20260820.md`
- **Member SHA-256:** `5c922d5c929dc3961ec6c5b47ede4cf10385d7cfa679eb487aa743f5df4379f5`
- **Line count:** 47
- **Read range:** `1-47`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `24: `LabResult.booking_id` had both a property-level `@Prop({ index: true })` index and an equivalent `LabResultSchema.index({ booking_id: 1 })` declaration. The redundant schema-level declaration was removed; the property-level index remains. `
- `30: | `LabResult.booking_id` duplicate declaration | Removed schema duplicate; property index retained | None until index inventory confirms a duplicate physical index |`
- `35: Rollback for this source change is a source rollback restoring the removed LabResult schema declaration. It does **not** create, drop, or rebuild indexes. Any physical index change requires a separate approved runbook: capture `getIndexes()`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `11: A `translations` map is now declared in the Medicine schema. `missingPublicMedicineTranslations` validates display-critical fields before the administrative medicine-approval path can set `public_eligibility: true`. It requires Arabic and E`
- `26: The claimed duplicate compound index in `mental-health.schema.ts` was independently rechecked. The source ends at line 98 and has one `{ patient_id: 1, logged_at: -1 }` compound index for each of MoodEntry, MeditationSession, and BreathingS`
### state_transitions
- `5: **Deployment status:** **Not deployed**. No production index operation or data migration was run.`
- `35: Rollback for this source change is a source rollback restoring the removed LabResult schema declaration. It does **not** create, drop, or rebuild indexes. Any physical index change requires a separate approved runbook: capture `getIndexes()`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `35: Rollback for this source change is a source rollback restoring the removed LabResult schema declaration. It does **not** create, drop, or rebuild indexes. Any physical index change requires a separate approved runbook: capture `getIndexes()`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
