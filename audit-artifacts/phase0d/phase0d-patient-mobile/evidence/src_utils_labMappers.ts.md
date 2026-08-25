# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/utils/labMappers.ts`
- **Member SHA-256:** `9796875e890cf4084df201ee21cc9b0a43fee73a814c6fe8d9562c7393c13407`
- **Line count:** 49
- **Read range:** `1-49`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `6: * Mapping happens here — no screen invents or hardcodes content.`
### backend_consumers_or_contracts
- `2: * Normalizers for labs/radiology catalogue payloads.`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- `2: * Normalizers for labs/radiology catalogue payloads.`
- `4: * fasting_required, included_services, turnaround_hours…) while the UI cards`
- `34: oldPrice: raw.old_price || undefined,`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
