# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/notifications.ts`
- **Member SHA-256:** `0deb77ad221289c0a134832d8389037670b655600a7b0856cf045a03a43cb7fd`
- **Line count:** 47
- **Read range:** `1-47`
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
- `31: if (!id.success || !record) return null;`
### payment_insurance_relevance
- `11: function listFrom(payload: unknown): unknown[] {`
- `12: if (Array.isArray(payload)) return payload;`
- `13: const root = asRecord(payload);`
- `42: export function extractPatientNotifications(payload: unknown) {`
- `43: return listFrom(payload).flatMap((item) => {`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
