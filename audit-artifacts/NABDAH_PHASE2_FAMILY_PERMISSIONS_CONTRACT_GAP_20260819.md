# Phase 2 Patient — family permissions route and authorization gap

## Confirmed route-parameter defect

`health/family-hub.tsx` opens the permissions screen with:

```ts
router.push({ pathname: '/family/permissions', params: { memberId: m.user_id } })
```

`family/permissions.tsx` reads `params.id` instead of `params.memberId`. As a result, `memberId` is undefined on this navigation path. The screen then attempts calls such as:

```ts
PATCH /family/member/undefined/permissions
DELETE /family/remove-member/undefined
POST /family/permissions/request { target_member_id: undefined }
```

This is a **P0 Patient UI contract failure**: permission viewing, saving, requesting, and removal cannot reliably operate from the Family Hub.

## Additional flow defects

| Behavior | Finding | Required disposition |
|---|---|---|
| On permission-load failure, UI retains `INITIAL_PERMS` with several enabled entries | Defaults can look like real grants despite inability to read current group state | **FIX — use a blocked/error state and retry; never render assumed medical-data permissions as real** |
| UI first tries owner-only direct permission replacement, then treats any error as proof caller is not owner and submits a request | A network/validation/authorization error is conflated with role state | **FIX — determine caller role from group state or structured error code; do not mutate through a fallback after arbitrary failure** |
| Success copy always says an approval request was sent | Owner direct update does not follow the request path | **FIX — render outcome specific to actual operation** |
| Remove-member failure catches the error and still calls `router.back()` | Failed destructive operation is hidden from the user | **P1 FIX — retain screen, show error/retry, and reload authoritative member list only after success** |
| Family Hub exposes permissions navigation to all non-owner member cards | Backend mutation is owner-only | **FIX — render controls according to the current caller’s owner role, while retaining Backend enforcement** |

## Backend control

Backend `PATCH /family/member/:userId/permissions` and `DELETE /family/remove-member/:userId` enforce owner-oriented service checks. The Patient parameter mismatch prevents legitimate owner flow; the client fallback does not make the contract safe.

## Decision

Family permission administration must be **blocked from release** until the parameter contract, role-aware paths, loading/error state, destructive-action behavior, and owner/non-owner tests are fixed.
