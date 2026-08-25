# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_BRANCH_COMPONENT_MAP_20260818.md`
- **Member SHA-256:** `e9c499a76bec7491261b2abc331ab723dae3cb374e8521511ee75d397c5da9d6`
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
- `11: | `fix/e2e-operational-contracts-20260814` | Direct `backend`, `patient-app`, `provider-app`, `admin-app` trees plus remediation manifest | Primary direct-source candidate for the four Nabdah applications |`
- `12: | `manus/on-live-reconciliation` | QA worktree, audit artifacts, provider source, packaged backend/patient/admin archives | Reconciliation/evidence branch; not yet a complete direct-source tree for all four applications |`
- `14: No repository other than `obaid08642-ops/new` is in scope. `Alhrajplus` and `Naps-admin` were explicitly excluded as unrelated projects.`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
