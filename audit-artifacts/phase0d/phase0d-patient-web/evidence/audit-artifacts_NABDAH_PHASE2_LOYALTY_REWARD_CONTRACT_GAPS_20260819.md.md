# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE2_LOYALTY_REWARD_CONTRACT_GAPS_20260819.md`
- **Member SHA-256:** `6ad9bde72ab50fd7fe8bb2f9c0015decc3acda186c14f9a12e7418ea0a82aef0`
- **Line count:** 20
- **Read range:** `1-20`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `12: | **P1** | Claims are not idempotent | Client does not send an idempotency key and Backend stores no replay key. A timeout after commit permits repeated deduction/claim on retry. | Persist a per-user idempotency key and return the original `
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `11: | **P0** | Reward claim is not atomic | Backend reads account balance, then separately decrements points, creates a transaction, decrements stock, and creates claim. Concurrent claims can overspend points, oversell stock, or leave points/st`
- `13: | **P1** | Coupon code generation is predictable and ungoverned | Coupon reward code uses `Math.random`, without cryptographic generation, hashed-at-rest verification, expiry, redemption ownership check, or secure delivery contract. | Gener`
### state_transitions
- `3: ## Confirmed controls`
- `5: All loyalty endpoints are protected by JWT, account and transaction reads use the requesting user, and the client waits for a claim request before displaying its local success message. These access controls are **PASS**.`
- `7: ## Confirmed defects`
- `11: | **P0** | Reward claim is not atomic | Backend reads account balance, then separately decrements points, creates a transaction, decrements stock, and creates claim. Concurrent claims can overspend points, oversell stock, or leave points/st`
- `12: | **P1** | Claims are not idempotent | Client does not send an idempotency key and Backend stores no replay key. A timeout after commit permits repeated deduction/claim on retry. | Persist a per-user idempotency key and return the original `
- `13: | **P1** | Coupon code generation is predictable and ungoverned | Coupon reward code uses `Math.random`, without cryptographic generation, hashed-at-rest verification, expiry, redemption ownership check, or secure delivery contract. | Gener`
- `14: | **P1** | Monetary point equivalence is hard-coded in the client | Loyalty hub states `points / 100` equals a SAR discount although account/config APIs return no point-to-currency conversion or approved terms. | Remove the monetary claim u`
- `15: | **P1** | Fallback tiers/earn methods can misstate benefits | UI retains static tier/earning defaults whenever config cannot load, despite these being programme terms. | Fail visibly and retain no unverified benefits/rates; make current pr`
- `16: | **P1** | Loyalty copy and reward metadata are Arabic/raw | The visible currency/equivalence, tiers, claims, errors, and reward titles are not six-language complete. | Use reviewed locale keys and server-provided localized content/terms; t`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `12: | **P1** | Claims are not idempotent | Client does not send an idempotency key and Backend stores no replay key. A timeout after commit permits repeated deduction/claim on retry. | Persist a per-user idempotency key and return the original `
- `16: | **P1** | Loyalty copy and reward metadata are Arabic/raw | The visible currency/equivalence, tiers, claims, errors, and reward titles are not six-language complete. | Use reviewed locale keys and server-provided localized content/terms; t`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
