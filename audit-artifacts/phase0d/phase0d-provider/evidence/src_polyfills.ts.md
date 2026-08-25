# Phase 0D semantic evidence

- **Surface:** Provider
- **Archive:** `NabdProvider-provider.zip`
- **Member path:** `src/polyfills.ts`
- **Member SHA-256:** `9ef2a64dccbd655ab6367440f6130a64d9d3f92a80a47b3038397b71c6fce2f3`
- **Line count:** 18
- **Read range:** `1-18`
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
- `7: class DOMExceptionPolyfill extends Error {`
- `11: this.name = name || 'Error';`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `7: class DOMExceptionPolyfill extends Error {`
- `11: this.name = name || 'Error';`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
