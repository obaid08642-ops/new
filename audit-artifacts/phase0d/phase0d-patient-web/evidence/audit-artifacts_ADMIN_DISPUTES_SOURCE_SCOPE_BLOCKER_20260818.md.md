# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/ADMIN_DISPUTES_SOURCE_SCOPE_BLOCKER_20260818.md`
- **Member SHA-256:** `73c2592f7886c8fad2a52204f9028c868b72be57f55c9baed8be514d46e10280`
- **Line count:** 5
- **Read range:** `1-5`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `3: The full Admin snapshot used for inventory contains a real fabricated-data fallback in `src/pages/admin/disputes.tsx`: missing `amount` renders `150 ر.س`, missing patient/provider names render synthetic labels, and missing reason renders a `
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `1: # Admin disputes source-scope blocker — 2026-08-18`
- `3: The full Admin snapshot used for inventory contains a real fabricated-data fallback in `src/pages/admin/disputes.tsx`: missing `amount` renders `150 ر.س`, missing patient/provider names render synthetic labels, and missing reason renders a `
- `5: The current reconciliation worktree `/home/ubuntu/nabdah-live-work` does not contain an Admin source tree. The complete Admin snapshot is stored in separate worktrees (`/home/ubuntu/nabdah-live-extracted/admin-app/web-admin` and `/home/ubun`
### state_transitions
- `3: The full Admin snapshot used for inventory contains a real fabricated-data fallback in `src/pages/admin/disputes.tsx`: missing `amount` renders `150 ر.س`, missing patient/provider names render synthetic labels, and missing reason renders a `
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
