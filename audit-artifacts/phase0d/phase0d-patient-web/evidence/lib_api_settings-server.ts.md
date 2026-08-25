# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/settings-server.ts`
- **Member SHA-256:** `55c43e803d5ba82591e9c8bc62e76248acfa2be0c56cead203368bb070978a96`
- **Line count:** 17
- **Read range:** `1-17`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- `1: import { callPatientApi } from "@/lib/api/upstream";`
### auth_ownership
- `3: export function getPatientPrivacySettings(accessToken: string) {`
- `4: return callPatientApi("/users/me/privacy-settings", {}, accessToken);`
- `7: export function getPatientSecuritySettings(accessToken: string) {`
- `8: return callPatientApi("/users/me/security-settings", {}, accessToken);`
- `11: export function getPatientStorage(accessToken: string) {`
- `12: return callPatientApi("/users/me/storage", {}, accessToken);`
- `15: export function getPatientSessions(accessToken: string) {`
- `16: return callPatientApi("/users/me/sessions", {}, accessToken);`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
