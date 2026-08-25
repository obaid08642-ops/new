# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/settings/notifications.tsx`
- **Member SHA-256:** `99dd68e29559d361663d6303f43406e629d545695175d8fec60ff4da9e9fbe4b`
- **Line count:** 8
- **Read range:** `1-8`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `2: // Legacy alias — the real, API-backed notification preferences screen is`
- `5: import { Redirect } from "expo-router";`
- `7: return <Redirect href="/settings/notifications-settings" />;`
### backend_consumers_or_contracts
- `3: // /settings/notifications-settings (persisted via /users/me/notification-settings).`
- `7: return <Redirect href="/settings/notifications-settings" />;`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
