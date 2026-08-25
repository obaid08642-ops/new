# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE4_ADMIN_NURSING_OPERATIONS_GAPS_20260819.md`
- **Member SHA-256:** `631fd47a4bbbe0a40b6526a3bf597784561e99e2ad0266749dc0a53dc75ac118`
- **Line count:** 14
- **Read range:** `1-14`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `9: | **P1** | Request-load failure becomes an empty pending queue | Catch clears requests and UI reports no pending nursing requests. | Show source error/stale/retry state and last verified timestamp; avoid operational false-negative queue sta`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `1: # Phase 4 Admin Dashboard — nursing operations gaps`
- `7: | **P0** | Admin assigns a nurse by free-text licence/phone through a direct mutation | No owned eligible-nurse selector, credential/availability/service-area/capacity check, assignment confirmation, reallocation policy, patient notificatio`
- `10: | **P1** | Direct assignment control has no high-risk confirmation or localization/privacy safeguards | Prompt/alert UI lacks six-language accessibility, role/branch scope, PHI warning, dispatch policy or step-up confirmation. | Add reviewe`
- `14: Admin nursing operations are **P0 FIX/BLOCKED**. Direct assignment cannot be used safely until provider eligibility, consented location, audited reassignment and truthful queue data are implemented.`
### state_transitions
- `3: ## Confirmed defects`
- `7: | **P0** | Admin assigns a nurse by free-text licence/phone through a direct mutation | No owned eligible-nurse selector, credential/availability/service-area/capacity check, assignment confirmation, reallocation policy, patient notificatio`
- `8: | **P1** | Nursing request card fabricates patient, service and address values | Missing values render “patient,” generic home nursing and Riyadh address, obscuring source/data-quality failure. | Render only minimum-necessary verified visit`
- `9: | **P1** | Request-load failure becomes an empty pending queue | Catch clears requests and UI reports no pending nursing requests. | Show source error/stale/retry state and last verified timestamp; avoid operational false-negative queue sta`
### payment_insurance_relevance
- `8: | **P1** | Nursing request card fabricates patient, service and address values | Missing values render “patient,” generic home nursing and Riyadh address, obscuring source/data-quality failure. | Render only minimum-necessary verified visit`
### error_empty_loading_retry_cancel
- `9: | **P1** | Request-load failure becomes an empty pending queue | Catch clears requests and UI reports no pending nursing requests. | Show source error/stale/retry state and last verified timestamp; avoid operational false-negative queue sta`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
