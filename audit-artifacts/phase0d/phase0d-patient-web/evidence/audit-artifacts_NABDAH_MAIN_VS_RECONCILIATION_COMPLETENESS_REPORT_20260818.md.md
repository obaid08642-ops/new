# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_MAIN_VS_RECONCILIATION_COMPLETENESS_REPORT_20260818.md`
- **Member SHA-256:** `7d234a0a5dcc6d5c646333d81b4c0604f8f41835836fc259f5c68fab3744f0fa`
- **Line count:** 58
- **Read range:** `1-58`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: Neither reference is a complete standalone release source. `main` is the owner-requested clean baseline, but it is older than the reconciliation branch by 22 commits at this comparison point and lacks later functional archive refreshes and `
- `14: | `origin/manus/on-live-reconciliation` | `9bff7c6` locally after Phase 1 evidence | 22 commits ahead of main | later QA history, regenerated artifacts, Patient route cleanup, and plan/evidence files |`
- `16: The QA-ahead history contains five functional/artifact commits after the last shared state: Backend verified rebuild, Provider verified rebuild, Admin verified rebuild, Patient verified rebuild, and removal of 13 `*.backup.tsx` files that E`
- `35: QA contains later changes across diagnostics booking/checkout/tracking, AI, health records, maternity, mental health, nutrition, reports, family permissions, and additional localization/medication-notification modules. It also removed the 1`
- `41: QA adds three platform-map implementations and changes Provider package metadata, contract tests, location picker/context, Doctor, Pharmacy, and Radiology screens. These are functional/provider-operational updates, so QA is newer for Provid`
- `49: The archive comparison alone cannot prove that all business data is real. It does prove that the branch contents differ. Every changed/unique file must be scanned during the application inventory for mock/demo/sample data, hardcoded busines`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `5: Neither reference is a complete standalone release source. `main` is the owner-requested clean baseline, but it is older than the reconciliation branch by 22 commits at this comparison point and lacks later functional archive refreshes and `
- `13: | `origin/main` | `53ba7da` | ancestor of QA | clean owner baseline; older functional state |`
- `16: The QA-ahead history contains five functional/artifact commits after the last shared state: Backend verified rebuild, Provider verified rebuild, Admin verified rebuild, Patient verified rebuild, and removal of 13 `*.backup.tsx` files that E`
- `25: | Admin | 66 | 66 | 0 | 0 | 2 |`
- `35: QA contains later changes across diagnostics booking/checkout/tracking, AI, health records, maternity, mental health, nutrition, reports, family permissions, and additional localization/medication-notification modules. It also removed the 1`
- `43: ### Admin`
- `45: Both archives contain the same member count. QA changes the Admin dashboard and API utility. These changes require build/typecheck and contract verification, but there is no archive member missing on either side.`
- `53: Phase 2 is **BLOCKED pending source-set reconciliation**. Before Patient inventory begins, the owner-approved source baseline must be one of:`
### state_transitions
- `7: Therefore the correct decision is **not** to select a branch by date or archive size alone. Before Phase 2, the approved source set must be reconciled as a reviewed union: use the later functional source fixes from the reconciliation artifa`
- `13: | `origin/main` | `53ba7da` | ancestor of QA | clean owner baseline; older functional state |`
- `16: The QA-ahead history contains five functional/artifact commits after the last shared state: Backend verified rebuild, Provider verified rebuild, Admin verified rebuild, Patient verified rebuild, and removal of 13 `*.backup.tsx` files that E`
- `37: `main` contains seven files absent from QA: `.env*`, Firebase configuration files, and `expo-env.d.ts`. These must be treated as environment/release assets, not copied blindly into source; secrets and production credentials must be provisio`
- `49: The archive comparison alone cannot prove that all business data is real. It does prove that the branch contents differ. Every changed/unique file must be scanned during the application inventory for mock/demo/sample data, hardcoded busines`
- `51: ## Approved action before Phase 2`
- `53: Phase 2 is **BLOCKED pending source-set reconciliation**. Before Patient inventory begins, the owner-approved source baseline must be one of:`
- `58: No blind overwrite, force-push, secret commit, or direct production mutation is permitted. Once the source-set decision is approved, rerun archive hashes, file counts, build manifests, and smoke builds, then close Phase 1 and begin Phase 2.`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `53: Phase 2 is **BLOCKED pending source-set reconciliation**. Before Patient inventory begins, the owner-approved source baseline must be one of:`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
