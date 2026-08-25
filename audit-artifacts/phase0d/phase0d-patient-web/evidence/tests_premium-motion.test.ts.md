# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `tests/premium-motion.test.ts`
- **Member SHA-256:** `7beb89341dfa18f5f8d563934bfbb17cf6196ff663eef9070045bdf76d057819`
- **Line count:** 39
- **Read range:** `1-39`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `18: const premiumKeyframes = css.match(/@keyframes (?:premium-float|premium-enter|page-enter) \{[^}]+\{([^}]+)\}[^}]*\}/g) ?? [];`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
