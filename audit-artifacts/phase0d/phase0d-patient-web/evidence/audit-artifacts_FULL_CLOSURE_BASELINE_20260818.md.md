# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/FULL_CLOSURE_BASELINE_20260818.md`
- **Member SHA-256:** `9bc6128714da95850ec93eae47cb7026ab2fdbb9d7361f419de55da1fbd454af`
- **Line count:** 15
- **Read range:** `1-15`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `11: The Provider source has verified snapshots and an authoritative `App.tsx` restoration path. The Patient and Backend snapshots exist in separate local trees and require commit/hash reconciliation before any new source patch. The full Admin t`
### state_transitions
- `7: The local `/home/ubuntu/nabdah-live-work` tree is the QA/evidence worktree. The expanded full-closure program has been appended to `todo.md` and is currently uncommitted pending this baseline commit.`
- `9: ## Source-authority status`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `7: The local `/home/ubuntu/nabdah-live-work` tree is the QA/evidence worktree. The expanded full-closure program has been appended to `todo.md` and is currently uncommitted pending this baseline commit.`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
