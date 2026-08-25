# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE6_FINAL_CLOSURE_DOUBLE_CHECK_20260819.md`
- **Member SHA-256:** `0222d52d67b54f8f1b11a7bc16ba96fdd866d87cdfad162ac0ef208cd4ea59bb`
- **Line count:** 31
- **Read range:** `1-31`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `16: | Payments, refunds, payouts and signed gateway events | Phase 4 finance and Phase 5 payment/transaction evidence | **Reviewed — P0 FIX/BLOCKED** |`
- `31: **AUDIT-COMPLETE / REMEDIATION-DEFERRED.** The platform is **not security-ready for release**. Priority remediation must resolve authorization scope, public data projection, storage privacy, WebSocket room ownership, financial webhook/idemp`
### backend_consumers_or_contracts
- `13: | Facility/branch/provider assignment scope | Phase 3 facility/nursing/doctor/payout evidence and Phase 5 guard findings | **Reviewed — FIX/BLOCKED** |`
- `14: | REST and WebSocket authorization | `NABDAH_PHASE5_REALTIME_WEBSOCKET_SECURITY_GAPS_20260819.md`; public-care/auth-guard evidence | **Reviewed — P0 FIX/BLOCKED** |`
- `24: 2. It covers each required technical channel: REST, WebSocket, object storage, payment webhook, event bus, admin browser session and public discovery.`
- `31: **AUDIT-COMPLETE / REMEDIATION-DEFERRED.** The platform is **not security-ready for release**. Priority remediation must resolve authorization scope, public data projection, storage privacy, WebSocket room ownership, financial webhook/idemp`
### auth_ownership
- `1: # Phase 6 Security, Ownership and Privacy — final closure double-check`
- `5: This closes the **source-level security/ownership/privacy matrix**. It does not close security remediation, pen-test validation, production negative tests, legal approval or release readiness.`
- `11: | Patient/provider/admin/guest role and resource ownership | Consolidated matrix; auth guard, payment, public discovery and Phase 2–4 artifacts | **Reviewed — FIX/BLOCKED** |`
- `12: | Family/removed user and foreign account containment | Phase 2 family/chat/permission findings in consolidated matrix | **Reviewed — FIX/BLOCKED** |`
- `14: | REST and WebSocket authorization | `NABDAH_PHASE5_REALTIME_WEBSOCKET_SECURITY_GAPS_20260819.md`; public-care/auth-guard evidence | **Reviewed — P0 FIX/BLOCKED** |`
- `17: | Admin/session/impersonation/audit access | Phase 4 admin shell/audit and Phase 5 auth evidence | **Reviewed — P0 FIX/BLOCKED** |`
- `23: 1. The matrix covers the requested actor permutations: patient, foreign patient, provider, unassigned provider, facility staff, admin, finance/support role, guest, removed family member and impersonator.`
- `24: 2. It covers each required technical channel: REST, WebSocket, object storage, payment webhook, event bus, admin browser session and public discovery.`
- `31: **AUDIT-COMPLETE / REMEDIATION-DEFERRED.** The platform is **not security-ready for release**. Priority remediation must resolve authorization scope, public data projection, storage privacy, WebSocket room ownership, financial webhook/idemp`
### state_transitions
- `9: | Required security dimension | Evidence | Closure status |`
- `16: | Payments, refunds, payouts and signed gateway events | Phase 4 finance and Phase 5 payment/transaction evidence | **Reviewed — P0 FIX/BLOCKED** |`
- `25: 3. All unapproved emergency/QR/consent/privacy-rights flows remain explicitly fail-closed.`
### payment_insurance_relevance
- `11: | Patient/provider/admin/guest role and resource ownership | Consolidated matrix; auth guard, payment, public discovery and Phase 2–4 artifacts | **Reviewed — FIX/BLOCKED** |`
- `13: | Facility/branch/provider assignment scope | Phase 3 facility/nursing/doctor/payout evidence and Phase 5 guard findings | **Reviewed — FIX/BLOCKED** |`
- `16: | Payments, refunds, payouts and signed gateway events | Phase 4 finance and Phase 5 payment/transaction evidence | **Reviewed — P0 FIX/BLOCKED** |`
- `24: 2. It covers each required technical channel: REST, WebSocket, object storage, payment webhook, event bus, admin browser session and public discovery.`
- `26: 4. No security finding was converted into a production mutation, deployment, data deletion, live payment, emergency activation or fabricated test result.`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
