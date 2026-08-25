# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/notification-settings.ts`
- **Member SHA-256:** `796181b3c0c96ac114ddaef033f8f0918591ff7773e00afd97a68e66f2e0c4f7`
- **Line count:** 8
- **Read range:** `1-8`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- `1: const SETTINGS_KEYS = ["general", "appointments", "orders", "offers", "medications", "doctorMessages", "emergency", "sound", "vibration"] as const;`
- `4: export function extractNotificationSettings(payload: unknown): NotificationSettings {`
- `5: const root = payload && typeof payload === "object" && !Array.isArray(payload) ? payload as Record<string, unknown> : {};`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
