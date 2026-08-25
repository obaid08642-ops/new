# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `docs/KNOWN_LIMITATIONS.md`
- **Member SHA-256:** `05421cc820565498efb39f9644b7d4ef332651a59e453f6fac3b2c48764f4075`
- **Line count:** 27
- **Read range:** `1-27`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `7: 1. **Design System:** Not all existing legacy screens have been migrated to use `src/design-system` components.`
- `15: 9. **Imports:** Existing screens have not yet been fully migrated to use `@/` path aliases.`
### backend_consumers_or_contracts
- `8: 2. **HttpClient:** Does not currently handle WebSockets (planned for Phase 1B/Chat).`
### auth_ownership
- `12: 6. **OTPInput Component:** On Android, pasting requires `maxLength: 2` workaround due to RN text input issues.`
### state_transitions
- `21: 3. **Redux Persist:** Serialization/deserialization may become slow for large state trees (consider moving large collections to SQLite/AsyncStorage via Repository pattern).`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
