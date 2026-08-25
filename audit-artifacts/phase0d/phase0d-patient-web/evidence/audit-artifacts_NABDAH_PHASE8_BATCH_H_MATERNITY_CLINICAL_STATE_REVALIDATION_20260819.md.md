# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE8_BATCH_H_MATERNITY_CLINICAL_STATE_REVALIDATION_20260819.md`
- **Member SHA-256:** `49b98ec2a839ffcbbbc0e3f07d013ed1a0c7723d8da47806422526c6b2305239`
- **Line count:** 29
- **Read range:** `1-29`
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
- `1: # Phase 8 — Batch H: maternity clinical-state revalidation`
- `7: ## Confirmed controls`
- `14: | Patient display | `maternity/hub` loads only `/maternity/profile`, clears profile state on error, shows setup/no-data rather than fallback facts, and labels all weeks, dates and fertility windows as estimates. |`
- `15: | Local persistence search | No maternity/pregnancy AsyncStorage or fallback-state pattern was found in the Patient maternity source scope. |`
- `16: | Safety copy | The six-locale maternity dictionary states that display values are user-recorded data/estimates, not diagnosis, fetal-health confirmation or contraception. |`
- `29: Phase 10/11 must still validate the six-language layouts and approved sandbox flow: empty profile → setup → server-confirmed profile → update/opt-out behavior. It must not treat estimated dates as clinical confirmation, activate SOS/QR, or `
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `14: | Patient display | `maternity/hub` loads only `/maternity/profile`, clears profile state on error, shows setup/no-data rather than fallback facts, and labels all weeks, dates and fertility windows as estimates. |`
- `29: Phase 10/11 must still validate the six-language layouts and approved sandbox flow: empty profile → setup → server-confirmed profile → update/opt-out behavior. It must not treat estimated dates as clinical confirmation, activate SOS/QR, or `

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
