# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `tests/proxy.test.ts`
- **Member SHA-256:** `ace08e8a3b3ae834c9e0f356ef9d6bb73bcaaf68c8bb401f3526227cd0b7d3a9`
- **Line count:** 37
- **Read range:** `1-37`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `20: it("adds a noindex header to private portal routes and the root redirect", () => {`
- `21: for (const pathname of ["/", "/en/login", "/ar/dashboard", "/ur/orders", "/hi/health", "/bn/reminders", "/fil/medicine-catalog"]) {`
### backend_consumers_or_contracts
- `21: for (const pathname of ["/", "/en/login", "/ar/dashboard", "/ur/orders", "/hi/health", "/bn/reminders", "/fil/medicine-catalog"]) {`
### auth_ownership
- `21: for (const pathname of ["/", "/en/login", "/ar/dashboard", "/ur/orders", "/hi/health", "/bn/reminders", "/fil/medicine-catalog"]) {`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
