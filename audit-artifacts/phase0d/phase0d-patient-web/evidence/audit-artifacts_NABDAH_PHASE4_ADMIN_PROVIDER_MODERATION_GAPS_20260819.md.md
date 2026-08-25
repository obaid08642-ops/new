# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE4_ADMIN_PROVIDER_MODERATION_GAPS_20260819.md`
- **Member SHA-256:** `d1b790b3117174374af02e7f953c520546e491d1bb2a3872e29c328ddb0acc8a`
- **Line count:** 20
- **Read range:** `1-20`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: The moderation page uses the protected provider detail and onboarding/delta endpoints rather than presenting seeded providers. It also loads a detailed provider file before exposing approval controls. This is a useful basis, but the decisio`
- `13: | **P1** | Moderation errors are displayed as empty queues | Fetch errors are console-only; empty pending lists can mean no work or failed data access. Provider detail failure gives generic text without retry/status. | Add per-query error, `
- `15: | **P1** | Suspend workflow lacks structured policy/case linkage in the UI | It accepts free text reason and asserts socket/search consequences, but does not select policy code, case, effective time, appeal/review route or returned enforcem`
### backend_consumers_or_contracts
- `15: | **P1** | Suspend workflow lacks structured policy/case linkage in the UI | It accepts free text reason and asserts socket/search consequences, but does not select policy code, case, effective time, appeal/review route or returned enforcem`
### auth_ownership
- `1: # Phase 4 Admin Dashboard — provider moderation and KYC review gaps`
- `12: | **P1** | Delta approval/rejection has no reason, field risk classification, diff validation or re-authentication | Admin can apply/reject arbitrary `requested_changes` in one click; UI serializes raw object values without field-level clas`
- `14: | **P1** | Provider delta inspector reveals arbitrary raw data to every rendered admin | `JSON.stringify` renders all requested values, potentially including bank, identity, location, contract or document data without masking or role-specif`
- `16: | **P1** | Administration workflow is Arabic/raw and not six-language accessible | Labels, alerts, reason fields, document/decision content and layout are Arabic-first with no tested LTR/locale support. | Complete role-appropriate AR/EN/UR/`
### state_transitions
- `3: ## Confirmed positive alignment`
- `7: ## Confirmed defects`
- `11: | **P0** | Provider approval is an immediate one-click activation action without a decision record/UI confirmation | `handleApprove` posts an empty body and immediately announces the provider is active/visible; UI captures no verifier attes`
- `13: | **P1** | Moderation errors are displayed as empty queues | Fetch errors are console-only; empty pending lists can mean no work or failed data access. Provider detail failure gives generic text without retry/status. | Add per-query error, `
- `16: | **P1** | Administration workflow is Arabic/raw and not six-language accessible | Labels, alerts, reason fields, document/decision content and layout are Arabic-first with no tested LTR/locale support. | Complete role-appropriate AR/EN/UR/`
### payment_insurance_relevance
- `12: | **P1** | Delta approval/rejection has no reason, field risk classification, diff validation or re-authentication | Admin can apply/reject arbitrary `requested_changes` in one click; UI serializes raw object values without field-level clas`
### error_empty_loading_retry_cancel
- `11: | **P0** | Provider approval is an immediate one-click activation action without a decision record/UI confirmation | `handleApprove` posts an empty body and immediately announces the provider is active/visible; UI captures no verifier attes`
- `13: | **P1** | Moderation errors are displayed as empty queues | Fetch errors are console-only; empty pending lists can mean no work or failed data access. Provider detail failure gives generic text without retry/status. | Add per-query error, `

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
