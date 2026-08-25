# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_ACTUAL_API_RECONCILIATION_20260818.md`
- **Member SHA-256:** `1fde3696723bed03a4ad9d9b6850b5f102f4e51fe4bec93813153d67f9bdff0d`
- **Line count:** 7
- **Read range:** `1-7`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: Method-aware matching against the 933 composed Backend routes produced **260 matched calls** and **144 `UNMATCHED_API_REVIEW` records**. The 144 records are a review queue, not a confirmed defect count. Several calls use string concatenatio`
- `7: No unmatched call is marked PASS or FIX until its complete expression is reconstructed and checked against the controller method, authorization contract, and response shape. The detailed evidence is in `NABDAH_ACTUAL_API_ROUTE_MATCH_2026081`
### backend_consumers_or_contracts
- `5: Method-aware matching against the 933 composed Backend routes produced **260 matched calls** and **144 `UNMATCHED_API_REVIEW` records**. The 144 records are a review queue, not a confirmed defect count. Several calls use string concatenatio`
### auth_ownership
- `3: A second extractor scanned only concrete `apiFetch` and HTTP-client invocations in the direct Patient, Provider, and Admin source. It found **404 call records**: 237 Patient, 158 Provider, and 9 Admin. Inferred methods were GET 195, POST 17`
- `5: Method-aware matching against the 933 composed Backend routes produced **260 matched calls** and **144 `UNMATCHED_API_REVIEW` records**. The 144 records are a review queue, not a confirmed defect count. Several calls use string concatenatio`
- `7: No unmatched call is marked PASS or FIX until its complete expression is reconstructed and checked against the controller method, authorization contract, and response shape. The detailed evidence is in `NABDAH_ACTUAL_API_ROUTE_MATCH_2026081`
### state_transitions
- `5: Method-aware matching against the 933 composed Backend routes produced **260 matched calls** and **144 `UNMATCHED_API_REVIEW` records**. The 144 records are a review queue, not a confirmed defect count. Several calls use string concatenatio`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `5: Method-aware matching against the 933 composed Backend routes produced **260 matched calls** and **144 `UNMATCHED_API_REVIEW` records**. The 144 records are a review queue, not a confirmed defect count. Several calls use string concatenatio`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
