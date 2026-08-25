# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `scripts/verify-truthful-runtime.mjs`
- **Member SHA-256:** `9903906ede8e7543b10f4674fbb92b6ae5f3270ef0035d507e67b618add8cf8a`
- **Line count:** 36
- **Read range:** `1-36`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `17: { name: "local guest token", pattern: /guest_token|guest_user/ },`
### state_transitions
- `18: { name: "protocol success fallback", pattern: /return\\s*\\{\\s*ok\\s*:\\s*true/ },`
- `31: console.error("Truthful runtime gate failed:");`
- `32: for (const finding of findings) console.error(`- ${finding}`);`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `31: console.error("Truthful runtime gate failed:");`
- `32: for (const finding of findings) console.error(`- ${finding}`);`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
