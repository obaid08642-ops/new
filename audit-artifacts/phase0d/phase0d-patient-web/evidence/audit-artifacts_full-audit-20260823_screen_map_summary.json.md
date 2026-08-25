# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/full-audit-20260823/screen_map_summary.json`
- **Member SHA-256:** `ad8963b3debe3e920adf942160df3d699b674f8232f789ace4530081b576c8ca`
- **Line count:** 52
- **Read range:** `1-52`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `2: "mobile_app_source_screens": 250,`
- `50: "mobile_screens_with_actions": 200,`
- `51: "mobile_screens_with_mutation_markers": 88`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- `20: "insurance": 13,`
- `28: "offers": 2,`
- `30: "payments": 4,`
- `45: "wallet": 5,`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
