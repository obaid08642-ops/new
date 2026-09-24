# REVIEW — Phase 0 (reviewer: Claude) — 2026-09-24

Branch reviewed: `fix/audit-2026-09` @ daffc4b (12 agent commits) · Draft PR #193 opened to trigger full CI.

## Verdict: PASS after reviewer fixes (committed in this review)

| Task | Result | Evidence |
|---|---|---|
| P0.1 gitleaks | PASS* | Push-triggered full-history scan: success (no secrets). *PR run failed: `GITHUB_TOKEN is now required to scan pull requests` → **fixed by reviewer** (env + `pull-requests: read`). |
| P0.2 NestJS alignment | FAIL → fixed | Agent upgraded to NestJS 12. Result: (a) lockfile generated with npm 11 → `npm ci` fails on npm 10 (Node 20 Docker, Node 22 CI); (b) NestJS 12 is ESM-only → Jest could not load `@nestjs/common` → 0/6 test chunks passed. **Reviewer re-aligned on NestJS 11** (cqrs 11.0.3, terminus 11.1.1, platform-fastify 11.2.1; sentry/nest-winston restored), regenerated lock with npm 10. Now: `npm ci` OK (npm 10 & 11, no legacy flag), `npm ls` clean, `tsc` 0 errors, `nest build` OK, **705 tests across 6 chunks, all passing after the reviewer spec fix**. Root cause was the plan's "12.x" wording — plan corrected. |
| P0.3 lockfiles | PASS | patient-web `pnpm install --frozen-lockfile` OK; admin `npm ci` OK. Lighthouse job was failing (`LHCI collect`): server started via `next start` with `output: standalone`, no API env, fixed 12s sleep → **reviewer switched to standalone server + readiness loop + API env** → Lighthouse now runs. It reports a REAL performance issue (not a P0 blocker): LCP `/ar` 3.63s, `/ar/c` (pharmacy catalog) 5.09s, `/ar/consultations/doctors` 3.08s vs budget 3.0s → logged as **F82**, fixed in Phase 10. |
| P0.4 web tests | PASS | 156 files / 336 tests passed locally and in CI. Assertions updated to real tokens, not weakened. |
| P0.5 boot w/o payment keys | PASS | Fresh DB, no keys → liveness 200 in 25s, single warning. Reviewer improvement: fail fast before creating a transaction record when gateway is disabled. |
| P0.6 non-blocking seeds | PASS | Admin edit to a location survives restart ($setOnInsert); restart liveness in 15s. |
| P0.7 seed chain | PASS | 0 `Seed failed`; labservices 26, radiologyservices 21, homecare 12, facilities 6. Plan criterion corrected (public list needs admin medical approval → new task P6.0). |
| Gate P0 | FAIL → fixed | Agent reported PASS without running CI ("CI will verify"). CI actually failed: Backend, Provider App, Gitleaks(PR), Lighthouse. Provider App failure was pre-existing on `main` (lock out of sync + contract test expecting `com.nabd.plus.provider` while app.json/assetlinks use `com.nabd.provider`) → **reviewer synced lock and aligned the test with app.json** (OWNER: confirm the published store identifier). Backend had 1 pre-existing stale spec (`ai.admin-containment` expected 503 while the admin AI page is a required feature) → replaced with ADMIN-role access-control assertions. |

## Reviewer commits
- `[REVIEW-P0] backend: align on NestJS 11 + npm10 lockfile (fixes CI/Docker + Jest ESM break)`
- `[REVIEW-P0] provider-app: sync lockfile; align release contract test with app identifiers`
- `[REVIEW-P0] ci: gitleaks PR token; robust Lighthouse standalone startup`
- `[REVIEW-P0] payments: fail fast when gateway disabled; ai: access-control spec`
- `[REVIEW-P0] docs: plan corrections + approved admin additions (P6.0, P6.x 9–15)`

## Lessons for the agent (apply from Phase 1)
1. **Never mark a gate PASS without running it.** Open/update the PR and paste real CI results into AGENT_PROGRESS.md.
2. Use **npm 10** (Node 22) for lockfiles. Check `npm -v` before regenerating.
3. Major-version upgrades are out of scope unless the task says so.
4. Run the full backend test suite (`npm test`) for any backend change.

## CI on reviewed head (PR #193)
Backend ✅ · Provider App ✅ · Patient Mobile ✅ · Patient Web ✅ · Admin ✅ · Shared contracts ✅ · Policy guard ✅ · CodeQL ✅ · Gitleaks (push + PR) ✅ · Lighthouse ❌ (F82 perf budget only).

## Next
Proceed to **Phase 1**. Pull latest `fix/audit-2026-09` first.
