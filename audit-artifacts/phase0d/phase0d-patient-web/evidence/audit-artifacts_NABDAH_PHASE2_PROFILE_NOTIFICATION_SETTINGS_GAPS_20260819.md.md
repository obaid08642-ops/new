# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE2_PROFILE_NOTIFICATION_SETTINGS_GAPS_20260819.md`
- **Member SHA-256:** `e7fa77b7e0d9b39c95e3feebd226402df357cdea7d2705533286195c68ca7d30`
- **Line count:** 30
- **Read range:** `1-30`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: Patient profile endpoints are JWT-scoped to the current user and apply an editable-field whitelist, including NoSQL operator/path rejection. Notification list/read/read-all routes are JWT-protected, owner/role/all-scoped, and include a test`
- `15: | **P1** | Failed profile save has no visible recovery | Save catches and logs error, then leaves the editing view with no message; avatar is displayed locally before its profile patch is known to have persisted. | Show safe field/form erro`
- `20: | **P0** | Data-deletion flow is only a generic support ticket but promises a completed formal process | The action posts a generic `/support/requests` message and claims a 72-hour team follow-up; it has no verified identity, request lifecy`
- `23: | **P1** | Data-storage limit contradicts Backend | Backend returns a 5 GB storage limit, while UI hard-codes “2 GB”; load failure also remains an endless “loading” state. | Render returned limit and distinct loading/error/empty states; add`
- `25: | **P2** | Inbox read state can diverge on network failure | A notification is locally marked read before an unawaited API call; failure has no reversion/retry. | Await or queue the write with rollback/retry and expose a non-blocking status`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `5: Patient profile endpoints are JWT-scoped to the current user and apply an editable-field whitelist, including NoSQL operator/path rejection. Notification list/read/read-all routes are JWT-protected, owner/role/all-scoped, and include a test`
- `7: The patient-managed emergency-contact CRUD path is also patient-scoped: it validates contact name/phone, assigns an opaque ID, and deletes only from the requesting patient's embedded profile. This is **PASS** as standalone contact managemen`
- `15: | **P1** | Failed profile save has no visible recovery | Save catches and logs error, then leaves the editing view with no message; avatar is displayed locally before its profile patch is known to have persisted. | Show safe field/form erro`
- `16: | **P1** | Notification switches do not govern delivery | `notification_settings` is persisted but has no server-side consumer in notification/push delivery code. The UI implies that categories, sound, and vibration change notification beha`
- `30: Profile ownership and notification read authorization are **PASS**, but the patient health-profile editing and notification-preference experience remain **FIX/BLOCKED** for truthful medical data, effective preference behavior, recoverable p`
### state_transitions
- `3: ## Confirmed controls`
- `7: The patient-managed emergency-contact CRUD path is also patient-scoped: it validates contact name/phone, assigns an opaque ID, and deletes only from the requesting patient's embedded profile. This is **PASS** as standalone contact managemen`
- `9: ## Confirmed defects`
- `13: | **P0** | Health-profile defaults can fabricate clinical data after a failed load | The edit form defaults to `gender: ذكر` and `bloodType: O+`. If profile load fails, the user can save those values with unrelated edits, overwriting/creati`
- `15: | **P1** | Failed profile save has no visible recovery | Save catches and logs error, then leaves the editing view with no message; avatar is displayed locally before its profile patch is known to have persisted. | Show safe field/form erro`
- `20: | **P0** | Data-deletion flow is only a generic support ticket but promises a completed formal process | The action posts a generic `/support/requests` message and claims a 72-hour team follow-up; it has no verified identity, request lifecy`
- `21: | **P1** | Unsupported security assurance is displayed | UI claims ISO 27001 encryption/no sale of data without source-backed certification or current privacy-policy version. | Remove or substantiate each assurance through approved legal/se`
- `22: | **P0** | Data-management export, portability, and deletion cards are no-op controls | Three visible actions promise JSON/PDF export, FHIR R4/HL7 portability, and permanent deletion but execute empty functions. | Remove/disable them with a`
- `23: | **P1** | Data-storage limit contradicts Backend | Backend returns a 5 GB storage limit, while UI hard-codes “2 GB”; load failure also remains an endless “loading” state. | Render returned limit and distinct loading/error/empty states; add`
- `24: | **P1** | Rights/compliance claims are not linked to an approved legal basis | UI broadly asserts data-protection rights and a 24-hour JSON/PDF delivery/FHIR/HL7 portability path without an implemented service or policy/version link. | Rep`
- `25: | **P2** | Inbox read state can diverge on network failure | A notification is locally marked read before an unawaited API call; failure has no reversion/retry. | Await or queue the write with rollback/retry and expose a non-blocking status`
- `26: | **P1** | Profile/inbox/settings are not six-language complete | Form fields, health labels, notification categories/times, error messages, and settings descriptions are raw Arabic; the condition tag uses an emoji delete affordance. | Use `
### payment_insurance_relevance
- `22: | **P0** | Data-management export, portability, and deletion cards are no-op controls | Three visible actions promise JSON/PDF export, FHIR R4/HL7 portability, and permanent deletion but execute empty functions. | Remove/disable them with a`
### error_empty_loading_retry_cancel
- `7: The patient-managed emergency-contact CRUD path is also patient-scoped: it validates contact name/phone, assigns an opaque ID, and deletes only from the requesting patient's embedded profile. This is **PASS** as standalone contact managemen`
- `13: | **P0** | Health-profile defaults can fabricate clinical data after a failed load | The edit form defaults to `gender: ذكر` and `bloodType: O+`. If profile load fails, the user can save those values with unrelated edits, overwriting/creati`
- `15: | **P1** | Failed profile save has no visible recovery | Save catches and logs error, then leaves the editing view with no message; avatar is displayed locally before its profile patch is known to have persisted. | Show safe field/form erro`
- `20: | **P0** | Data-deletion flow is only a generic support ticket but promises a completed formal process | The action posts a generic `/support/requests` message and claims a 72-hour team follow-up; it has no verified identity, request lifecy`
- `22: | **P0** | Data-management export, portability, and deletion cards are no-op controls | Three visible actions promise JSON/PDF export, FHIR R4/HL7 portability, and permanent deletion but execute empty functions. | Remove/disable them with a`
- `23: | **P1** | Data-storage limit contradicts Backend | Backend returns a 5 GB storage limit, while UI hard-codes “2 GB”; load failure also remains an endless “loading” state. | Render returned limit and distinct loading/error/empty states; add`
- `25: | **P2** | Inbox read state can diverge on network failure | A notification is locally marked read before an unawaited API call; failure has no reversion/retry. | Await or queue the write with rollback/retry and expose a non-blocking status`
- `26: | **P1** | Profile/inbox/settings are not six-language complete | Form fields, health labels, notification categories/times, error messages, and settings descriptions are raw Arabic; the condition tag uses an emoji delete affordance. | Use `

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
