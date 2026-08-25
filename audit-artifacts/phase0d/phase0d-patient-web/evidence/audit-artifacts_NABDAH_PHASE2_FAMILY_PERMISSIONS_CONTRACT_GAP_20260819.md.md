# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE2_FAMILY_PERMISSIONS_CONTRACT_GAP_20260819.md`
- **Member SHA-256:** `78c73bcecd270280a276a6ad5d5cfc93a8efa3ca453e36b437cd246f5e48dbcf`
- **Line count:** 37
- **Read range:** `1-37`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `1: # Phase 2 Patient — family permissions route and authorization gap`
- `3: ## Confirmed route-parameter defect`
- `5: `health/family-hub.tsx` opens the permissions screen with:`
- `8: router.push({ pathname: '/family/permissions', params: { memberId: m.user_id } })`
- `11: `family/permissions.tsx` reads `params.id` instead of `params.memberId`. As a result, `memberId` is undefined on this navigation path. The screen then attempts calls such as:`
- `25: | On permission-load failure, UI retains `INITIAL_PERMS` with several enabled entries | Defaults can look like real grants despite inability to read current group state | **FIX — use a blocked/error state and retry; never render assumed med`
- `26: | UI first tries owner-only direct permission replacement, then treats any error as proof caller is not owner and submits a request | A network/validation/authorization error is conflated with role state | **FIX — determine caller role from`
- `28: | Remove-member failure catches the error and still calls `router.back()` | Failed destructive operation is hidden from the user | **P1 FIX — retain screen, show error/retry, and reload authoritative member list only after success** |`
### backend_consumers_or_contracts
- `26: | UI first tries owner-only direct permission replacement, then treats any error as proof caller is not owner and submits a request | A network/validation/authorization error is conflated with role state | **FIX — determine caller role from`
### auth_ownership
- `1: # Phase 2 Patient — family permissions route and authorization gap`
- `5: `health/family-hub.tsx` opens the permissions screen with:`
- `8: router.push({ pathname: '/family/permissions', params: { memberId: m.user_id } })`
- `11: `family/permissions.tsx` reads `params.id` instead of `params.memberId`. As a result, `memberId` is undefined on this navigation path. The screen then attempts calls such as:`
- `14: PATCH /family/member/undefined/permissions`
- `16: POST /family/permissions/request { target_member_id: undefined }`
- `19: This is a **P0 Patient UI contract failure**: permission viewing, saving, requesting, and removal cannot reliably operate from the Family Hub.`
- `25: | On permission-load failure, UI retains `INITIAL_PERMS` with several enabled entries | Defaults can look like real grants despite inability to read current group state | **FIX — use a blocked/error state and retry; never render assumed med`
- `26: | UI first tries owner-only direct permission replacement, then treats any error as proof caller is not owner and submits a request | A network/validation/authorization error is conflated with role state | **FIX — determine caller role from`
- `27: | Success copy always says an approval request was sent | Owner direct update does not follow the request path | **FIX — render outcome specific to actual operation** |`
- `29: | Family Hub exposes permissions navigation to all non-owner member cards | Backend mutation is owner-only | **FIX — render controls according to the current caller’s owner role, while retaining Backend enforcement** |`
- `33: Backend `PATCH /family/member/:userId/permissions` and `DELETE /family/remove-member/:userId` enforce owner-oriented service checks. The Patient parameter mismatch prevents legitimate owner flow; the client fallback does not make the contra`
### state_transitions
- `3: ## Confirmed route-parameter defect`
- `25: | On permission-load failure, UI retains `INITIAL_PERMS` with several enabled entries | Defaults can look like real grants despite inability to read current group state | **FIX — use a blocked/error state and retry; never render assumed med`
- `26: | UI first tries owner-only direct permission replacement, then treats any error as proof caller is not owner and submits a request | A network/validation/authorization error is conflated with role state | **FIX — determine caller role from`
- `27: | Success copy always says an approval request was sent | Owner direct update does not follow the request path | **FIX — render outcome specific to actual operation** |`
- `28: | Remove-member failure catches the error and still calls `router.back()` | Failed destructive operation is hidden from the user | **P1 FIX — retain screen, show error/retry, and reload authoritative member list only after success** |`
- `37: Family permission administration must be **blocked from release** until the parameter contract, role-aware paths, loading/error state, destructive-action behavior, and owner/non-owner tests are fixed.`
### payment_insurance_relevance
- `29: | Family Hub exposes permissions navigation to all non-owner member cards | Backend mutation is owner-only | **FIX — render controls according to the current caller’s owner role, while retaining Backend enforcement** |`
### error_empty_loading_retry_cancel
- `25: | On permission-load failure, UI retains `INITIAL_PERMS` with several enabled entries | Defaults can look like real grants despite inability to read current group state | **FIX — use a blocked/error state and retry; never render assumed med`
- `26: | UI first tries owner-only direct permission replacement, then treats any error as proof caller is not owner and submits a request | A network/validation/authorization error is conflated with role state | **FIX — determine caller role from`
- `28: | Remove-member failure catches the error and still calls `router.back()` | Failed destructive operation is hidden from the user | **P1 FIX — retain screen, show error/retry, and reload authoritative member list only after success** |`
- `37: Family permission administration must be **blocked from release** until the parameter contract, role-aware paths, loading/error state, destructive-action behavior, and owner/non-owner tests are fixed.`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
