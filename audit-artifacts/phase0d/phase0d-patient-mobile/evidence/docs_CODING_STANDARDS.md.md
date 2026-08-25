# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `docs/CODING_STANDARDS.md`
- **Member SHA-256:** `64b40270ac556866715dce7228adbb3ff9739c7105a173b27963afa40de55003`
- **Line count:** 22
- **Read range:** `1-22`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `13: - **NEVER** use generic colors (`red`, `#000000`). Always map to semantic tokens (`tokens.colors.danger`, `tokens.colors.background`).`
- `18: - Global state (`Redux`) is for cross-module session data (Auth, Cart).`
- `22: - Never store sensitive data (tokens, PII) in `AsyncStorage`. Use `SecureStore` (via `src/utils/security.ts`).`
### state_transitions
- `16: ## 4. State & Data`
- `17: - Component state (`useState`) is for UI only (modals, forms).`
- `18: - Global state (`Redux`) is for cross-module session data (Auth, Cart).`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
