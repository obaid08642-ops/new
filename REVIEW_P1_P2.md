# REVIEW — Phase 1 + Phase 2 (fix/audit-2026-09)

Reviewer: Claude (independent review, 2026-09-24)
Scope: all P1.1–P1.8, Gate P1, P2.1–P2.5, Gate P2 commits (`682b4e8` … `3185399`), 157 files.
Verdict: **APPROVED with 4 fixes applied in this review** (commit `[REVIEW-P1P2]`). Merged together with reviewed Phase 0 into `main`.

## Verification run (this review, on the merged result)

| Check | Result |
|---|---|
| backend `tsc --noEmit` + `nest build` | exit 0 |
| backend unit (`npm test -- --runInBand`) | 132 suites, **718/718** passed |
| security + journey e2e (`test/security`, `test/journeys`) | 13 suites, **53/53** passed (was 49; +4 new regression tests) |
| patient-web `pnpm test` | 156 files, 336 passed, 0 failed |
| provider-app `npm ci --legacy-peer-deps` + `tsc --noEmit` | exit 0 |
| admin `npm ci` + `tsc --noEmit` | exit 0 |
| New regression tests fail on the pre-fix code | confirmed (2/2 fail on old guard) |

## Findings fixed in this review

### R1 — HIGH — Payment idempotency silently disabled (P1-gate `ff8b6caf`)
The double-lock 409 fix made the interceptor return early for every route without `@RequireIdempotency()`.
`POST /payments/intent/:type/:id`, `POST /payments/retry/:type/:id` and `POST /moyasar/payments` use
`@UseInterceptors(IdempotencyInterceptor)` but do not carry `@RequireIdempotency()`, so they lost replay
protection entirely (double-charge risk on client retry). Routes that carry both the class-level interceptor
and `@RequireIdempotency()` (health, medical-programs) still double-locked.
**Fix:** per-request marker `request.__idempotencyHandled` — the first interceptor instance processes, any
second instance passes through. Original semantics restored (every keyed mutation is protected; key is
mandatory only on `@RequireIdempotency()` routes). Tests: stacked global+handler instance → exactly one
NX lock; unannotated keyed payment route → replayed from cache.

### R2 — HIGH — Provider session revocation checked the wrong counter (P1.3 × P2.1)
Provider tokens are signed with `provider_accounts.token_version`, but `JwtAuthGuard` looked up `users`
first. Since P2.1 a provider account shares its id with the linked user, so the guard compared the provider
token against `users.token_version`:
- **suspend** bumps only the provider counter → suspended provider's token kept working (F09 defeated);
- **provider password reset** bumps only the provider counter → the provider's fresh token 401'd forever (lock-out).
The Gate-P2 journey did not catch it because approve bumps both counters symmetrically.
**Fix:** guard selects the store by token scope (`scope === 'provider'` → `provider_accounts`, else `users`).
Tokens without `tv` (impersonation/support — validated against their durable session; health-passport QR;
pre-release access tokens, ≤1h) are not version-checked, which also stops impersonation of any user whose
counter was ever bumped from 401-ing. Tests added for both scenarios.

### R3 — MEDIUM — Banned user could keep/obtain provider sessions
Admin ban bumped only `users.token_version`; provider login/refresh did not look at the linked user.
**Fix:** ban also bumps `provider_accounts.token_version` for the linked account; provider `login` (403
`account_suspended`) and `refresh` (401) reject when the linked user is banned (`active=false`). Test added.

### R4 — MEDIUM (performance) — per-request lookup on an unindexed field
P1.3 added a `users.findOne({ id })` to every authenticated request, but `users.id` had no index
(collection scan per request). **Fix:** `index: true` on `users.id` (non-unique, safe to build on existing
data; `provider_accounts.id` already unique-indexed).

## Reviewed and accepted as-is
- P1.1 deny-by-default `WriteGuard` + annotations: spot-checked; provider tokens satisfy `@Roles(<type>)` via
  `provider_type` normalization; live sweep evidence (zero 2xx on admin/provider paths for patient token) accepted.
- P1.4 RolesGuard removal, P1.5 test-only seed controllers, P1.6 prescription provenance, P1.7 OTP channels,
  P1.8 admin Next upgrade, P2.1–P2.5 provider identity/role flip/reactivate/KYC 404/provider-app auth endpoints.

## Follow-ups (not blocking; for the next phase plan)
1. **Password change keeps refresh tokens alive** (pre-existing): a stolen refresh token can mint a new
   access token after the victim changes password. Recommend: change-password revokes all refresh sessions
   and returns fresh tokens for the current device.
2. **Duplicated credential** (P2.1 password mirror): after either side changes password, patient and provider
   logins diverge. Decide on a single credential source.
3. **Deferred live checks:** run `2026-09-link-provider-accounts.ts` and `2026-09-purge-demo.ts` in dry-run
   against staging data before applying; re-run `tools/audit/sweep.py` on staging; confirm CI green on `main`.
4. provider-app still needs `npm ci --legacy-peer-deps` (react-server-dom-webpack RC pin) — pre-existing.
