# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_READINESS_RESUMPTION_BLOCKER_RECONCILIATION_20260819.md`
- **Member SHA-256:** `376d0866113be6c1eb136fc05c3ac74d749c83f5e50be9047f1041f57061e2b3`
- **Line count:** 44
- **Read range:** `1-44`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `29: | Six-language, RTL and accessibility review | Human-quality gated | Human screen-by-screen review using the documented test matrix and real render targets. | Static translation-key count alone. |`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `5: This reconciliation reopens the work after the Phase 12 **NO-GO** decision. It distinguishes work that can proceed safely on the source branch from actions that require a reviewer, owner approval, external credentials or real devices. It do`
- `9: `npm audit --json` was rerun against the current package locks on 19 August 2026. The Admin dashboard remains at zero findings. Backend and both mobile applications retain the same high-risk migration class reported at Phase 10.`
- `16: | Admin | 0 | 0 | 0 | 0 | Current lock is clean. | **No dependency action** |`
- `18: The figures are a current vulnerability inventory, not permission to run an automated major update. The backend migration must first split Nest ecosystem upgrades from the unsupported `xlsx` replacement/containment decision. Each mobile mig`
- `24: | Prescription detail authorization | Deployment-gated | Reviewer-owned deployment candidate, rollback point and live Patient1→Patient2 BOLA proof. | Local tests or archive integrity alone. |`
- `26: | Moyasar | Owner/external | Owner activates account, then authorizes limited sandbox financial acceptance. | Mocking a payment or suppressing errors. |`
- `37: 4. Prepare, but do not execute, the owner/reviewer deployment and external-acceptance packages.`
- `43: [2]: NABDAH_PHASE11_PRESCRIPTIONS_AUTHORIZATION_REMEDIATION_20260819.md "Phase 11 prescription detail authorization remediation"`
### state_transitions
- `26: | Moyasar | Owner/external | Owner activates account, then authorizes limited sandbox financial acceptance. | Mocking a payment or suppressing errors. |`
- `30: | Final production rollout | Reviewer-gated | Approved deployment, backup/rollback, smoke plan and monitoring. | A Git push. |`
### payment_insurance_relevance
- `5: This reconciliation reopens the work after the Phase 12 **NO-GO** decision. It distinguishes work that can proceed safely on the source branch from actions that require a reviewer, owner approval, external credentials or real devices. It do`
- `26: | Moyasar | Owner/external | Owner activates account, then authorizes limited sandbox financial acceptance. | Mocking a payment or suppressing errors. |`
- `38: 5. Execute deployment, payment, contract and device acceptance only after explicit authorized access and a bounded test plan.`
### error_empty_loading_retry_cancel
- `26: | Moyasar | Owner/external | Owner activates account, then authorizes limited sandbox financial acceptance. | Mocking a payment or suppressing errors. |`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
