# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_SOURCE_AUTHORITY_CORRECTION_20260818.md`
- **Member SHA-256:** `1da55d0feb1445c9b28034eda6a3d0b0c005bbf010aa49bb3ee63b3636196dd0`
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
- `3: The earlier statement that the implementation source should remain on `fix/e2e-operational-contracts-20260814` at `21006cc` was **incorrect after the owner’s correction**.`
- `13: The requested commit `d59a8bfa` exists and is the current remote tip of `manus/on-live-reconciliation`. The implementation worktree has been switched to that branch and is clean at that commit. The branch’s cleaned single-artifact structure`
### state_transitions
- `3: The earlier statement that the implementation source should remain on `fix/e2e-operational-contracts-20260814` at `21006cc` was **incorrect after the owner’s correction**.`
- `10: | `manus/on-live-reconciliation` | `d59a8bf` | Approved current execution/reference branch. It is 311 commits ahead of the old fix branch and contains the merged reconciliation history. |`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
