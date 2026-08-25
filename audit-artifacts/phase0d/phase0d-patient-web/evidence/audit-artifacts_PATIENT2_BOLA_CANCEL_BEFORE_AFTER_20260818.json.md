# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/PATIENT2_BOLA_CANCEL_BEFORE_AFTER_20260818.json`
- **Member SHA-256:** `9fee77f77ca324cb23df6dcd3931c92d722bae43806ba298ebd8c3ff076f29e8`
- **Line count:** 1
- **Read range:** `1-1`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `1: {"order_id":"62039080-53eb-4ca2-8bac-69c2a7bb038f","owner_before_status":200,"owner_before_body_bytes":3041,"foreign_cancel_status":403,"foreign_cancel_body_bytes":71,"owner_after_status":200,"owner_after_body_bytes":3041,"expected":"foreig`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `1: {"order_id":"62039080-53eb-4ca2-8bac-69c2a7bb038f","owner_before_status":200,"owner_before_body_bytes":3041,"foreign_cancel_status":403,"foreign_cancel_body_bytes":71,"owner_after_status":200,"owner_after_body_bytes":3041,"expected":"foreig`
### state_transitions
- `1: {"order_id":"62039080-53eb-4ca2-8bac-69c2a7bb038f","owner_before_status":200,"owner_before_body_bytes":3041,"foreign_cancel_status":403,"foreign_cancel_body_bytes":71,"owner_after_status":200,"owner_after_body_bytes":3041,"expected":"foreig`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `1: {"order_id":"62039080-53eb-4ca2-8bac-69c2a7bb038f","owner_before_status":200,"owner_before_body_bytes":3041,"foreign_cancel_status":403,"foreign_cancel_body_bytes":71,"owner_after_status":200,"owner_after_body_bytes":3041,"expected":"foreig`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
