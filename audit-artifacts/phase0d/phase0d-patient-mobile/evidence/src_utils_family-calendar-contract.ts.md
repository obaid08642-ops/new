# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/utils/family-calendar-contract.ts`
- **Member SHA-256:** `6898074fbb5273edda5d1915033b7340b9155092c9d3933e7ed3c971673d02c3`
- **Line count:** 26
- **Read range:** `1-26`
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
- `15: if (!title) throw new Error('title is required');`
- `16: if (!draft.memberUserId?.trim()) throw new Error('member_user_id is required');`
- `17: if (!draft.type || !ALLOWED_TYPES.has(draft.type)) throw new Error('valid calendar event type is required');`
- `19: if (!draft.eventDate.trim() || Number.isNaN(date.getTime())) throw new Error('valid event_date is required');`
- `24: if (!Array.isArray(value)) throw new Error('calendar response must be an array');`
### payment_insurance_relevance
- `13: export function buildFamilyCalendarPayload(draft: FamilyCalendarDraft) {`
### error_empty_loading_retry_cancel
- `15: if (!title) throw new Error('title is required');`
- `16: if (!draft.memberUserId?.trim()) throw new Error('member_user_id is required');`
- `17: if (!draft.type || !ALLOWED_TYPES.has(draft.type)) throw new Error('valid calendar event type is required');`
- `19: if (!draft.eventDate.trim() || Number.isNaN(date.getTime())) throw new Error('valid event_date is required');`
- `24: if (!Array.isArray(value)) throw new Error('calendar response must be an array');`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
