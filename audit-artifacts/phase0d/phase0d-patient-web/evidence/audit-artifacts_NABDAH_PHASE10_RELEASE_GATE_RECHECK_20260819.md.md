# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE10_RELEASE_GATE_RECHECK_20260819.md`
- **Member SHA-256:** `6bb5fbfe1862d2758dd1abc286bacc2af63ebab1f751652a16d491a72612aa49`
- **Line count:** 25
- **Read range:** `1-25`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `12: | Admin | Governance contracts and Next 16.3.1 production build | **PASS** — 7/7 contracts; 34 static routes. |`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `5: The unified source gate was replayed after the verified Admin dependency remediation. All four application surfaces completed their available tests/build exports. The Admin archive digest below supersedes the earlier Phase 9 candidate diges`
- `12: | Admin | Governance contracts and Next 16.3.1 production build | **PASS** — 7/7 contracts; 34 static routes. |`
- `21: | Admin | `fafc08e48f9063dcb45775e86b3828e333d32cc46fbefaaae7472f8813f4cad2` | Supersedes prior Admin candidate after Next/transitive dependency remediation. |`
- `25: Admin `npm audit` is now clean. Backend, Patient and Provider remain deployment-blocked by the controlled-migration dependency risks recorded in `NABDAH_PHASE10_DEPENDENCY_RISK_TRIAGE_20260819.md`. The owner approval, Moyasar, live sandbox `
### state_transitions
- `5: The unified source gate was replayed after the verified Admin dependency remediation. All four application surfaces completed their available tests/build exports. The Admin archive digest below supersedes the earlier Phase 9 candidate diges`
- `16: | Archive | SHA-256 | State |`
### payment_insurance_relevance
- `25: Admin `npm audit` is now clean. Backend, Patient and Provider remain deployment-blocked by the controlled-migration dependency risks recorded in `NABDAH_PHASE10_DEPENDENCY_RISK_TRIAGE_20260819.md`. The owner approval, Moyasar, live sandbox `
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
