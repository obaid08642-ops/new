# Provider my-profile source drift — 2026-08-18

## Finding

The local backend snapshot at `/tmp/nabdah-appointment-work/nabdah-backend/src/modules/provider-onboarding/provider-onboarding.module.ts` declares:

```ts
@UseGuards(JwtAuthGuard) @Get('my-profile')
myProfile(@CurrentUser() u: any) { return this.svc.getMyProfile(u); }
```

The same `ProviderOnboardingService` contains `getProgress(user)` but no `getMyProfile(user)` implementation. The Provider App consumer inventory does not call `my-profile`; its onboarding API calls `start`, `step2`, `step3`, and `submit`.

## Live evidence

A single doctor sandbox read-only probe returned:

| Path | Status | Classification |
|---|---:|---|
| `/provider-onboarding/my-profile` | 404 | unresolved; could be deployed-contract/data behavior or source drift |
| `/provider-onboarding/progress` | 200 | live contract responds |

No token or response body was persisted.

## Decision

Classify as **UNRECONCILED_SOURCE_DRIFT**, not as a confirmed production route defect. The backend snapshot is not a Git working tree in the current workspace, so no backend patch is applied from this snapshot. Before any code fix, reconcile the authoritative backend repository/image against the deployed commit, then either implement `getMyProfile` with an approved response contract or remove the unused route and add a boot/typecheck test that prevents controller calls to missing service methods.
