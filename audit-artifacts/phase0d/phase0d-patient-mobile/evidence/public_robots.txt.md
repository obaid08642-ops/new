# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `public/robots.txt`
- **Member SHA-256:** `3660cc53a5a85414ca5ce9a427ac109ac9f926d30d6a9c5e8f11d77b5a95527f`
- **Line count:** 24
- **Read range:** `1-24`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `7: # Main pages`
- `15: # Disallow private pages`
### backend_consumers_or_contracts
- `10: Allow: /labs/`
- `11: Allow: /nursing/`
- `13: Allow: /insurance/`
- `16: Disallow: /api/`
- `21: Disallow: /wallet/`
### auth_ownership
- `17: Disallow: /admin/`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- `13: Allow: /insurance/`
- `20: Disallow: /payments/`
- `21: Disallow: /wallet/`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
