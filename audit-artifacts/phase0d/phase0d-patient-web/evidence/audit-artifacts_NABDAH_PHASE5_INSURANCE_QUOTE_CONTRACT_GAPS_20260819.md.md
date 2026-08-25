# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE5_INSURANCE_QUOTE_CONTRACT_GAPS_20260819.md`
- **Member SHA-256:** `04c5c0aa059ea73a27d122da1392bef57fb0c94abf9cfa0ac6e98e595f7f434c`
- **Line count:** 21
- **Read range:** `1-21`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `1: # Phase 5 Backend/Database — insurance and booking-quote contract gaps`
- `11: | **P0** | Quote endpoint accepts price and service details directly from query parameters | `/bookings/quote` returns the supplied client `price` and assumes insurance applicability, without authoritative service/provider/location/slot loo`
- `12: | **P0** | Insurance request accepts arbitrary provider, booking and price without linkage validation | `createRequest` checks only provider ID/positive price and stored policy; it does not load the booking, prove patient/provider/service/c`
- `13: | **P0** | Copay “payment” accepts an arbitrary payment identifier without verifying it | Patient can submit any `payment_id`; service records `COPAY_PAID` and emits service-start event without looking up a paid transaction, amount, patient`
- `14: | **P1** | Insurance decision and lifecycle are not atomically projected to the booking/payment workflow | Request save and event emit are separate; approved/rejected/copay states do not visibly update linked booking insurance/payment/unive`
- `15: | **P1** | Policy save permits unverified member data and raw external card image URL | Profile policy accepts `member_id`, `policy_number` and `card_image_url` without secure owned upload/reference, verification, expiration or purpose/rete`
- `17: | **P1** | Default commission/insurance pricing fallbacks are hard-coded in source | Commission rate falls back to static defaults when no rule exists, rather than an approved versioned finance policy bound to quote/booking. | Require versi`
- `21: Insurance and quote backend contracts are **P0 FIX/BLOCKED**. No client or provider decision can be treated as real coverage/payment truth until quote, booking, policy and verified copay are bound atomically to authoritative records.`
### backend_consumers_or_contracts
- `11: | **P0** | Quote endpoint accepts price and service details directly from query parameters | `/bookings/quote` returns the supplied client `price` and assumes insurance applicability, without authoritative service/provider/location/slot loo`
- `17: | **P1** | Default commission/insurance pricing fallbacks are hard-coded in source | Commission rate falls back to static defaults when no rule exists, rather than an approved versioned finance policy bound to quote/booking. | Require versi`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `3: ## Confirmed design strength`
- `5: The insurance module records request history, scopes patient/provider reads, requires a provider decision for review state, calculates partial copay from stored request price, and models appeal/resubmission states. The quote endpoint centra`
- `7: ## Confirmed defects`
- `14: | **P1** | Insurance decision and lifecycle are not atomically projected to the booking/payment workflow | Request save and event emit are separate; approved/rejected/copay states do not visibly update linked booking insurance/payment/unive`
- `16: | **P1** | Requests are vulnerable to duplicate concurrent creation/decision attempts | No active request uniqueness/idempotency key is evident; decision uses read/mutate/save rather than conditional state version. | Add compound active-req`
- `17: | **P1** | Default commission/insurance pricing fallbacks are hard-coded in source | Commission rate falls back to static defaults when no rule exists, rather than an approved versioned finance policy bound to quote/booking. | Require versi`
### payment_insurance_relevance
- `1: # Phase 5 Backend/Database — insurance and booking-quote contract gaps`
- `5: The insurance module records request history, scopes patient/provider reads, requires a provider decision for review state, calculates partial copay from stored request price, and models appeal/resubmission states. The quote endpoint centra`
- `11: | **P0** | Quote endpoint accepts price and service details directly from query parameters | `/bookings/quote` returns the supplied client `price` and assumes insurance applicability, without authoritative service/provider/location/slot loo`
- `12: | **P0** | Insurance request accepts arbitrary provider, booking and price without linkage validation | `createRequest` checks only provider ID/positive price and stored policy; it does not load the booking, prove patient/provider/service/c`
- `13: | **P0** | Copay “payment” accepts an arbitrary payment identifier without verifying it | Patient can submit any `payment_id`; service records `COPAY_PAID` and emits service-start event without looking up a paid transaction, amount, patient`
- `14: | **P1** | Insurance decision and lifecycle are not atomically projected to the booking/payment workflow | Request save and event emit are separate; approved/rejected/copay states do not visibly update linked booking insurance/payment/unive`
- `15: | **P1** | Policy save permits unverified member data and raw external card image URL | Profile policy accepts `member_id`, `policy_number` and `card_image_url` without secure owned upload/reference, verification, expiration or purpose/rete`
- `17: | **P1** | Default commission/insurance pricing fallbacks are hard-coded in source | Commission rate falls back to static defaults when no rule exists, rather than an approved versioned finance policy bound to quote/booking. | Require versi`
- `21: Insurance and quote backend contracts are **P0 FIX/BLOCKED**. No client or provider decision can be treated as real coverage/payment truth until quote, booking, policy and verified copay are bound atomically to authoritative records.`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
