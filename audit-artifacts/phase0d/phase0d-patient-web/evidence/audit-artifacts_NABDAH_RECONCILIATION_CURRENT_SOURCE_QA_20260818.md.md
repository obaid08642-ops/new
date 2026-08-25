# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_RECONCILIATION_CURRENT_SOURCE_QA_20260818.md`
- **Member SHA-256:** `cfcf8b94acaa826a743543ccf7d6b0a816d76a89eec535db5221f95db43da63d`
- **Line count:** 25
- **Read range:** `1-25`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `16: The current Backend source produced **1,391 composed controller routes**. The concrete API-call extractor found **728 calls**: POST 322, GET 327, PATCH 46, DELETE 18, and PUT 15. Method-aware matching found **530 matched calls** and **198 ``
- `21: - `NABDAH_RECONCILIATION_BACKEND_ROUTES_20260818.tsv``
- `23: - `NABDAH_RECONCILIATION_API_ROUTE_MATCH_20260818.tsv``
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `12: | Admin | `Napd-admin-dashboard.zip` |`
- `14: The new UI/action inventory contains **4,207 markers** across Patient, Provider, and Admin: 814 wired candidates, 3,114 UI-action reviews, 49 fail-closed reviews, 221 placeholder candidates, and 9 stale/environment reviews. This is a triage`
- `16: The current Backend source produced **1,391 composed controller routes**. The concrete API-call extractor found **728 calls**: POST 322, GET 327, PATCH 46, DELETE 18, and PUT 15. Method-aware matching found **530 matched calls** and **198 ``
### state_transitions
- `16: The current Backend source produced **1,391 composed controller routes**. The concrete API-call extractor found **728 calls**: POST 322, GET 327, PATCH 46, DELETE 18, and PUT 15. Method-aware matching found **530 matched calls** and **198 ``
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
