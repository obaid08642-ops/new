# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE4_ADMIN_AUDIT_LOG_GAPS_20260819.md`
- **Member SHA-256:** `ca79ea013bbc94c5fe583223387e688268c124ceea2c127c3d115d4a05dff605`
- **Line count:** 25
- **Read range:** `1-25`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `7: | **P0** | Audit-log page bypasses the common guarded client and reads `admin_token` from local storage | It manually sets `Authorization: Bearer ${localStorage.admin_token}`, repeating the privileged browser-token exposure and diverging fr`
- `8: | **P1** | Fetch failure is indistinguishable from no audit events | Failed/non-OK request only logs to console; `logs` remains empty and UI states “no abnormal operations.” | Add explicit error/stale/retry state and neutral “no records in `
- `9: | **P1** | UI claims immutable ABAC audit tracking without presenting integrity/provenance evidence | Page lists basic fields only and has no log-chain/export hash, source/version, retention, access/view audit, verification status or tamper`
- `18: | **P0** | Fraud monitor consumes the same unguarded governance endpoints | The corresponding Backend `AdminGovernanceController` exposes fraud alerts and audit logs without declared authentication/permission guards; the page presents their`
- `19: | **P1** | Fraud/audit feed outages are rendered as no alerts/no logs | Non-OK responses and exceptions only reach console; empty arrays show “no fraud indicators” and “No logs found.” | Surface per-feed unavailable/stale/retry state and di`
- `20: | **P1** | Fraud screen offers no triage/case/ownership workflow | It shows static cards only, without alert lifecycle, evidence linkage, assignee, decision, escalation, false-positive disposition or retention controls. | Implement an owned`
- `25: The audit-log page is **FIX/BLOCKED** as a governance evidence surface. It must not claim immutable/system-safe audit coverage while authentication, outage truthfulness, evidence provenance and investigative controls are incomplete.`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `1: # Phase 4 Admin Dashboard — audit-log governance gaps`
- `7: | **P0** | Audit-log page bypasses the common guarded client and reads `admin_token` from local storage | It manually sets `Authorization: Bearer ${localStorage.admin_token}`, repeating the privileged browser-token exposure and diverging fr`
- `11: | **P1** | Missing fields are fabricated as a current time and “Super Admin” | Fallbacks use `Date.now()` and literal privileged actor name, which creates false evidence. | Render explicit unknown/malformed data states, log data-quality iss`
- `18: | **P0** | Fraud monitor consumes the same unguarded governance endpoints | The corresponding Backend `AdminGovernanceController` exposes fraud alerts and audit logs without declared authentication/permission guards; the page presents their`
- `20: | **P1** | Fraud screen offers no triage/case/ownership workflow | It shows static cards only, without alert lifecycle, evidence linkage, assignee, decision, escalation, false-positive disposition or retention controls. | Implement an owned`
### state_transitions
- `3: ## Confirmed defects`
- `8: | **P1** | Fetch failure is indistinguishable from no audit events | Failed/non-OK request only logs to console; `logs` remains empty and UI states “no abnormal operations.” | Add explicit error/stale/retry state and neutral “no records in `
- `9: | **P1** | UI claims immutable ABAC audit tracking without presenting integrity/provenance evidence | Page lists basic fields only and has no log-chain/export hash, source/version, retention, access/view audit, verification status or tamper`
- `11: | **P1** | Missing fields are fabricated as a current time and “Super Admin” | Fallbacks use `Date.now()` and literal privileged actor name, which creates false evidence. | Render explicit unknown/malformed data states, log data-quality iss`
- `12: | **P1** | Audit UI is Arabic-only and severity value is raw English | No six-language / RTL-LTR accessible labels or structured severity/status localization exist. | Provide reviewed six-language accessible audit terminology and locale-saf`
- `19: | **P1** | Fraud/audit feed outages are rendered as no alerts/no logs | Non-OK responses and exceptions only reach console; empty arrays show “no fraud indicators” and “No logs found.” | Surface per-feed unavailable/stale/retry state and di`
- `20: | **P1** | Fraud screen offers no triage/case/ownership workflow | It shows static cards only, without alert lifecycle, evidence linkage, assignee, decision, escalation, false-positive disposition or retention controls. | Implement an owned`
- `21: | **P1** | Immutable/ABAC statements are not supported by visible integrity verification | Payload hashes are displayed as raw strings but no chain verification, source, signature, retention, query scope or tamper state is shown. | Add veri`
### payment_insurance_relevance
- `20: | **P1** | Fraud screen offers no triage/case/ownership workflow | It shows static cards only, without alert lifecycle, evidence linkage, assignee, decision, escalation, false-positive disposition or retention controls. | Implement an owned`
- `21: | **P1** | Immutable/ABAC statements are not supported by visible integrity verification | Payload hashes are displayed as raw strings but no chain verification, source, signature, retention, query scope or tamper state is shown. | Add veri`
- `25: The audit-log page is **FIX/BLOCKED** as a governance evidence surface. It must not claim immutable/system-safe audit coverage while authentication, outage truthfulness, evidence provenance and investigative controls are incomplete.`
### error_empty_loading_retry_cancel
- `8: | **P1** | Fetch failure is indistinguishable from no audit events | Failed/non-OK request only logs to console; `logs` remains empty and UI states “no abnormal operations.” | Add explicit error/stale/retry state and neutral “no records in `
- `19: | **P1** | Fraud/audit feed outages are rendered as no alerts/no logs | Non-OK responses and exceptions only reach console; empty arrays show “no fraud indicators” and “No logs found.” | Surface per-feed unavailable/stale/retry state and di`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
