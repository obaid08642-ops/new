# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE8_BATCH_S_FAMILY_CALENDAR_CONTRACT_20260819.md`
- **Member SHA-256:** `438abb2f1d9f31154ed3c90fd2f30d383a0ec86730227f5b06d8ec8fc4b8d016`
- **Line count:** 34
- **Read range:** `1-34`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `12: | Client contract | A tested pure helper rejects a missing/invalid date, missing member, missing title, unsupported type, or malformed calendar response. A failed calendar response renders an error/retry state instead of an empty calendar. `
- `30: | Branch upload | **PASS** — source commit `6d13619` (`fix: secure family calendar events`) is on `manus/on-live-reconciliation`. |`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `5: The Patient family calendar used `Alert.prompt`, which is unavailable on Android, and sent only a title and fixed type while the Backend silently invented the event date and family member. Any group member could delete any shared event. Thi`
- `14: | Backend event creation | Event creation now requires valid `event_date`, `member_user_id`, and a type in the explicit allow-list. The member must be the group owner or a real group member. The Backend derives the display name from group m`
- `15: | Server-authoritative deletion | Calendar reads include `can_delete`, true only for the creator or group owner. The client hides destructive UI without that capability, and the Backend independently rejects a non-owner/non-creator delete r`
- `34: No family group, event, permission, or patient data was created or changed on production in this batch. The release still requires an actual Android/iOS device form pass, server deployment confirmation, linked sandbox family E2E, creator/ow`
### state_transitions
- `12: | Client contract | A tested pure helper rejects a missing/invalid date, missing member, missing title, unsupported type, or malformed calendar response. A failed calendar response renders an error/retry state instead of an empty calendar. `
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `12: | Client contract | A tested pure helper rejects a missing/invalid date, missing member, missing title, unsupported type, or malformed calendar response. A failed calendar response renders an error/retry state instead of an empty calendar. `

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
