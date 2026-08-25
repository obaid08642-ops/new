# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE4_ADMIN_RBAC_MATRIX_GAPS_20260819.md`
- **Member SHA-256:** `fb2340aaa51efd7b5dabae73f9b7bbc8442999cdc55f4848422e4dd3ed438782`
- **Line count:** 18
- **Read range:** `1-18`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `18: The RBAC page is an informative but incomplete static mirror. It is **FIX/BLOCKED** as an authoritative governance or audit interface until server-versioned scope and sensitive-permission safeguards are visible and testable.`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `1: # Phase 4 Admin Dashboard — RBAC matrix gaps`
- `5: For the roles it includes, the dashboard’s static permission list currently mirrors the corresponding Backend `Permission` enum and `ROLE_PERMISSIONS` assignments. It is a display-only matrix; no dynamic role editing is exposed.`
- `11: | **P1** | Admin RBAC matrix omits five authoritative Backend roles | Backend defines `GUEST`, `NURSING`, `AMBULANCE`, `HOSPITAL_ADMIN`, `BRANCH_ADMIN`, and `RECEPTIONIST`; dashboard lists only 15 roles and omits all except it never shows ``
- `12: | **P1** | Matrix is a hard-coded duplicate with no policy version, scope or enforcement evidence | Frontend mirrors role strings manually and cannot show policy version, effective date, tenant/branch constraints, endpoint coverage, excepti`
- `13: | **P1** | High-risk permissions are displayed without risk/approval context | `user.impersonate`, `data.export` and `data.backup` appear as ordinary matrix dots, with no step-up, reason, session time limit, logging or break-glass descripti`
- `14: | **P1** | Matrix is Arabic-only and visual state is not text-accessible | Permission status uses colour/blank-circle presentation with Arabic labels only. | Add accessible labels/legend/table semantics and reviewed six-language/RTL-LTR cov`
- `18: The RBAC page is an informative but incomplete static mirror. It is **FIX/BLOCKED** as an authoritative governance or audit interface until server-versioned scope and sensitive-permission safeguards are visible and testable.`
### state_transitions
- `3: ## Confirmed alignment`
- `7: ## Confirmed defects`
- `12: | **P1** | Matrix is a hard-coded duplicate with no policy version, scope or enforcement evidence | Frontend mirrors role strings manually and cannot show policy version, effective date, tenant/branch constraints, endpoint coverage, excepti`
- `14: | **P1** | Matrix is Arabic-only and visual state is not text-accessible | Permission status uses colour/blank-circle presentation with Arabic labels only. | Add accessible labels/legend/table semantics and reviewed six-language/RTL-LTR cov`
### payment_insurance_relevance
- `12: | **P1** | Matrix is a hard-coded duplicate with no policy version, scope or enforcement evidence | Frontend mirrors role strings manually and cannot show policy version, effective date, tenant/branch constraints, endpoint coverage, excepti`
- `14: | **P1** | Matrix is Arabic-only and visual state is not text-accessible | Permission status uses colour/blank-circle presentation with Arabic labels only. | Add accessible labels/legend/table semantics and reviewed six-language/RTL-LTR cov`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
