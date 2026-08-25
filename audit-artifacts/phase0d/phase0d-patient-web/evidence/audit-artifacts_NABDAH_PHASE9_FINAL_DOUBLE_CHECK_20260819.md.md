# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE9_FINAL_DOUBLE_CHECK_20260819.md`
- **Member SHA-256:** `350179fdd90250ab84071b74b97aeff28dc52fb64b05e1fcebd2c5163abec323`
- **Line count:** 42
- **Read range:** `1-42`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `25: | Admin clean installation, governance contracts and clean Next build | **PASS** — 7/7 contracts and 34 static routes. |`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `16: | Admin | `5f59cf5ca7515228bf035c2fbf6aa1caa114dfb316da12b47ff2a18fa7abfda0` | **PASS** |`
- `25: | Admin clean installation, governance contracts and clean Next build | **PASS** — 7/7 contracts and 34 static routes. |`
- `36: | Admin | 0 | 0 | 6 | 0 | **BLOCKED** pending triage and remediation plan. |`
- `38: No automatic or force audit update was applied. The audit numbers are a risk inventory; the next phase must identify direct vs. transitive reachability, available non-breaking fixes, required regression tests and any owner-approved exceptio`
- `42: The following remain deployment blockers: dependency-advisory remediation; owner approval for SOS/QR/consent/location; Moyasar activation and financial acceptance; sandbox-only end-to-end workflow proof; Android/iOS signed builds and real-d`
### state_transitions
- `33: | Backend | 3 | 46 | 9 | 0 | **BLOCKED** pending triage and remediation plan. |`
- `34: | Patient | 0 | 13 | 17 | 0 | **BLOCKED** pending triage and remediation plan. |`
- `35: | Provider | 0 | 12 | 13 | 0 | **BLOCKED** pending triage and remediation plan. |`
- `36: | Admin | 0 | 0 | 6 | 0 | **BLOCKED** pending triage and remediation plan. |`
- `38: No automatic or force audit update was applied. The audit numbers are a risk inventory; the next phase must identify direct vs. transitive reachability, available non-breaking fixes, required regression tests and any owner-approved exceptio`
### payment_insurance_relevance
- `42: The following remain deployment blockers: dependency-advisory remediation; owner approval for SOS/QR/consent/location; Moyasar activation and financial acceptance; sandbox-only end-to-end workflow proof; Android/iOS signed builds and real-d`
### error_empty_loading_retry_cancel
- `33: | Backend | 3 | 46 | 9 | 0 | **BLOCKED** pending triage and remediation plan. |`
- `34: | Patient | 0 | 13 | 17 | 0 | **BLOCKED** pending triage and remediation plan. |`
- `35: | Provider | 0 | 12 | 13 | 0 | **BLOCKED** pending triage and remediation plan. |`
- `36: | Admin | 0 | 0 | 6 | 0 | **BLOCKED** pending triage and remediation plan. |`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
