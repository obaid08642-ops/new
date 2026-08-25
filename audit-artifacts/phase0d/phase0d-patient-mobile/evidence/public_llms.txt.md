# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `public/llms.txt`
- **Member SHA-256:** `1e9388326344634aff2595554cfeb4b9ea359a5642b11c9e32c922d6914eac1c`
- **Line count:** 95
- **Read range:** `1-95`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `17: - Prescription upload and OCR scanning`
- `77: - Direct ambulance booking`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `32: - Injection administration`
- `65: - Meditation sessions`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- `49: ### Insurance`
- `50: - 20+ Saudi insurance companies supported`
- `51: - Coverage verification`
- `80: ## Coverage`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
