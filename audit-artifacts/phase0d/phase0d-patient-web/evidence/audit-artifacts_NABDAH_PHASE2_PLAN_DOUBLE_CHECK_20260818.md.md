# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE2_PLAN_DOUBLE_CHECK_20260818.md`
- **Member SHA-256:** `3c4240141c62e648fa9380ea9a8c21ef5beedeb091db4d8a634e8e4ad5d4afcd`
- **Line count:** 74
- **Read range:** `1-74`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `12: | Inventory Patient screens, routes, actions, and UI states | Current Patient inventory and 2,276 UI action markers recorded | PASS |`
- `13: | Compare API consumers with Backend routes from the same baseline | 333 Patient calls compared with 1,310 corrected main routes; 301 direct matches and 32 review items | FIX |`
- `17: | Review nutrition screens | Feature-rich main screens retained; synthetic/default markers and API/state behavior require remediation review | FIX |`
- `18: | Review cycle, maternity, pregnancy, baby growth, and related screens | Main feature breadth retained; fail-closed and medical-safety behavior require review | FIX |`
- `19: | Review mental-health screens | Assessment questions/submission contracts identified; crisis and therapist flows require safety/consent validation | FIX |`
- `21: | Distinguish existing-screen rebuilds from genuine additions | Six dictionaries/tests, medication notification utility/test, and three Provider map files identified as actual additions; Admin has no new pages | PASS |`
- `23: | Verify loading, empty, error, retry, and offline behavior | Static markers reviewed; runtime verification pending | BLOCKED |`
- `32: No new screen is claimed merely because an existing screen was rewritten. No QA-only archive has been silently merged into `main`. No `.env`, Firebase secret, deliberately removed repository, or synthetic production record has been restored`
- `36: Phase 2 remains open until all remaining patient screens listed below are reviewed, the API review items are resolved or explicitly classified, selected file decisions are finalized, and the complete status is rechecked against this table. `
- `44: | Home-care/nursing booking and tracking | FIX/BLOCKED | `NABDAH_PHASE2_HOME_CARE_NURSING_WORKFLOW_CONTRACT_GAPS_20260819.md` |`
- `53: 1. Complete static/contract review of the remaining AI utilities, prescription translation, support/chat, and non-clinical settings/data screens. **Completed:** findings are recorded in the final closure artifact.`
- `54: 2. Reconcile every new confirmed contract defect into the closure matrix and the master remediation register. **Completed:** every confirmed defect is a retained unchecked Phase 8 remediation item in `todo.md`.`
### backend_consumers_or_contracts
- `17: | Review nutrition screens | Feature-rich main screens retained; synthetic/default markers and API/state behavior require remediation review | FIX |`
- `27: | Re-audit remaining nursing/home-care, laboratory, radiology, report, wallet, profile, notification, and settings workflows | Source-to-Backend review completed; confirmed P0/P1 findings have individual audit artifacts and tracked remediat`
- `44: | Home-care/nursing booking and tracking | FIX/BLOCKED | `NABDAH_PHASE2_HOME_CARE_NURSING_WORKFLOW_CONTRACT_GAPS_20260819.md` |`
- `65: The initial 32-call count was corrected in stages: the classifier first used the wrong route-column name, then the confirmed Chat/Insurance aliases were expanded. The final alias-aware queue initially recorded 9 alias-compatible calls, 20 m`
### auth_ownership
- `16: | Review medication reminders, chronic medicines, and refill/reorder | Main Health contracts match the reminder/refill consumers; ownership/idempotency and runtime tests pending | REVIEW |`
- `21: | Distinguish existing-screen rebuilds from genuine additions | Six dictionaries/tests, medication notification utility/test, and three Provider map files identified as actual additions; Admin has no new pages | PASS |`
- `25: | Verify security, ownership, consent, and medical-safety behavior | Static contract review started; E2E and mutation checks remain later gates | BLOCKED |`
### state_transitions
- `5: This checklist compares the current Phase 2 work against the approved phased plan. It is an interim closure review, not a Phase 2 completion declaration.`
- `9: | Planned item | Evidence or result | Status |`
- `12: | Inventory Patient screens, routes, actions, and UI states | Current Patient inventory and 2,276 UI action markers recorded | PASS |`
- `15: | Review profile and account flows | Profile, addresses, loyalty, insurance, and edit flows inspected; runtime gate pending | REVIEW |`
- `16: | Review medication reminders, chronic medicines, and refill/reorder | Main Health contracts match the reminder/refill consumers; ownership/idempotency and runtime tests pending | REVIEW |`
- `17: | Review nutrition screens | Feature-rich main screens retained; synthetic/default markers and API/state behavior require remediation review | FIX |`
- `23: | Verify loading, empty, error, retry, and offline behavior | Static markers reviewed; runtime verification pending | BLOCKED |`
- `27: | Re-audit remaining nursing/home-care, laboratory, radiology, report, wallet, profile, notification, and settings workflows | Source-to-Backend review completed; confirmed P0/P1 findings have individual audit artifacts and tracked remediat`
- `36: Phase 2 remains open until all remaining patient screens listed below are reviewed, the API review items are resolved or explicitly classified, selected file decisions are finalized, and the complete status is rechecked against this table. `
- `38: ### Newly completed workflow review evidence`
- `40: | Workflow group | Current status | Evidence |`
- `53: 1. Complete static/contract review of the remaining AI utilities, prescription translation, support/chat, and non-clinical settings/data screens. **Completed:** findings are recorded in the final closure artifact.`
### payment_insurance_relevance
- `15: | Review profile and account flows | Profile, addresses, loyalty, insurance, and edit flows inspected; runtime gate pending | REVIEW |`
- `20: | Review AI, diagnostics, reports, family, wallet, and support surfaces | Present in the broader inventory; selected API mismatches remain in the remediation queue | FIX |`
- `27: | Re-audit remaining nursing/home-care, laboratory, radiology, report, wallet, profile, notification, and settings workflows | Source-to-Backend review completed; confirmed P0/P1 findings have individual audit artifacts and tracked remediat`
- `46: | Wallet transfers and saved cards | FIX/BLOCKED | `NABDAH_PHASE2_WALLET_TRANSFER_CARD_CONTRACT_GAPS_20260819.md` |`
- `65: The initial 32-call count was corrected in stages: the classifier first used the wrong route-column name, then the confirmed Chat/Insurance aliases were expanded. The final alias-aware queue initially recorded 9 alias-compatible calls, 20 m`
- `70: A context-window scan across profile, nutrition, maternity, health, consultations, pharmacy, insurance, and family screens found one unbound action candidate: `profile/addresses.tsx:151` (`إضافة عنوان جديد`). This matches the manually confi`
- `74: A repository-wide JSX action scan over Patient `app/**/*.tsx` found two syntactic candidates. `profile/addresses.tsx:151` is confirmed unbound: the visible `Button` has no `onPress` and no surrounding navigation/form handler. `wallet/hub.ts`
### error_empty_loading_retry_cancel
- `15: | Review profile and account flows | Profile, addresses, loyalty, insurance, and edit flows inspected; runtime gate pending | REVIEW |`
- `16: | Review medication reminders, chronic medicines, and refill/reorder | Main Health contracts match the reminder/refill consumers; ownership/idempotency and runtime tests pending | REVIEW |`
- `23: | Verify loading, empty, error, retry, and offline behavior | Static markers reviewed; runtime verification pending | BLOCKED |`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
