# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE5_FINAL_CLOSURE_DOUBLE_CHECK_20260819.md`
- **Member SHA-256:** `2d79d71cb02383e6a0394a921a9018aaf097dadb9aabd27963c4664ea34cddee`
- **Line count:** 31
- **Read range:** `1-31`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `14: | Payment intent, retry, verification, capture, refund, gateway and webhook | `NABDAH_PHASE5_PAYMENT_ENGINE_CONTRACT_GAPS_20260819.md`; `NABDAH_PHASE5_TRANSACTION_SCHEMA_DATA_GAPS_20260819.md` | **Reviewed — P0 FIX/BLOCKED** |`
### backend_consumers_or_contracts
- `18: | WebSocket rooms, waiting-room, presence, offline replay and chat receipts | `NABDAH_PHASE5_REALTIME_WEBSOCKET_SECURITY_GAPS_20260819.md` | **Reviewed — P0 FIX/BLOCKED** |`
- `31: **AUDIT-COMPLETE / REMEDIATION-DEFERRED.** Backend and database cross-application contracts are **not release-ready**. Critical blockers include legacy dual writes, bypassable workflow policy, unsigned public webhooks, non-atomic financial `
### auth_ownership
- `16: | Object storage, media visibility, document ownership and signed delivery | `NABDAH_PHASE5_STORAGE_MEDIA_PRIVACY_GAPS_20260819.md` | **Reviewed — P0 FIX/BLOCKED** |`
- `17: | JWT, roles, ownership, scope and impersonation | `NABDAH_PHASE5_AUTHORIZATION_GUARD_GAPS_20260819.md` | **Reviewed — P0 FIX/BLOCKED** |`
- `24: 2. **No contract is promoted merely because a client endpoint exists.** Ownership, monetary truth, atomicity, persistence, event delivery, state projection and privacy boundaries were checked separately.`
- `26: 4. **Moyasar remains owner-deferred.** Payment source remediation may improve readiness but must not activate live financial testing or deployment before explicit owner action.`
- `31: **AUDIT-COMPLETE / REMEDIATION-DEFERRED.** Backend and database cross-application contracts are **not release-ready**. Critical blockers include legacy dual writes, bypassable workflow policy, unsigned public webhooks, non-atomic financial `
### state_transitions
- `5: This closes **source-level contract discovery and reconciliation analysis**, not source remediation, migrations, production deployment, or E2E evidence. Every confirmed defect remains open in `todo.md` for Phase 8 and later test gates.`
- `9: | Planned Backend/Database cross-app area | Evidence | Status |`
- `11: | Canonical versus legacy collections, provider profiles and pharmacy state | `NABDAH_PHASE5_LEGACY_CANONICAL_DATA_SOURCE_GAPS_20260819.md` | **Reviewed — P0 FIX/BLOCKED** |`
- `12: | Workflow state map, cross-domain transitions, matching and lifecycle contract | `NABDAH_PHASE5_WORKFLOW_ENGINE_CONTRACT_GAPS_20260819.md` | **Reviewed — P0 FIX/BLOCKED** |`
- `14: | Payment intent, retry, verification, capture, refund, gateway and webhook | `NABDAH_PHASE5_PAYMENT_ENGINE_CONTRACT_GAPS_20260819.md`; `NABDAH_PHASE5_TRANSACTION_SCHEMA_DATA_GAPS_20260819.md` | **Reviewed — P0 FIX/BLOCKED** |`
- `24: 2. **No contract is promoted merely because a client endpoint exists.** Ownership, monetary truth, atomicity, persistence, event delivery, state projection and privacy boundaries were checked separately.`
### payment_insurance_relevance
- `14: | Payment intent, retry, verification, capture, refund, gateway and webhook | `NABDAH_PHASE5_PAYMENT_ENGINE_CONTRACT_GAPS_20260819.md`; `NABDAH_PHASE5_TRANSACTION_SCHEMA_DATA_GAPS_20260819.md` | **Reviewed — P0 FIX/BLOCKED** |`
- `15: | Quote, insurance policy, provider decision, copay and finance rules | `NABDAH_PHASE5_INSURANCE_QUOTE_CONTRACT_GAPS_20260819.md` | **Reviewed — P0 FIX/BLOCKED** |`
- `26: 4. **Moyasar remains owner-deferred.** Payment source remediation may improve readiness but must not activate live financial testing or deployment before explicit owner action.`
### error_empty_loading_retry_cancel
- `14: | Payment intent, retry, verification, capture, refund, gateway and webhook | `NABDAH_PHASE5_PAYMENT_ENGINE_CONTRACT_GAPS_20260819.md`; `NABDAH_PHASE5_TRANSACTION_SCHEMA_DATA_GAPS_20260819.md` | **Reviewed — P0 FIX/BLOCKED** |`
- `18: | WebSocket rooms, waiting-room, presence, offline replay and chat receipts | `NABDAH_PHASE5_REALTIME_WEBSOCKET_SECURITY_GAPS_20260819.md` | **Reviewed — P0 FIX/BLOCKED** |`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
