# Phase 15 — final gate evidence (pushed)

Branch: `fix/audit-2026-09` · Phase 15 tip: `68049253` · base `f0551ec`
Orchestrator-verified on the **merged** tree (Phase 15 + 278 newer commits from `origin`).

## Compile — all five projects clean
| Project | `tsc --noEmit` |
|---|---|
| backend | exit 0 |
| admin | exit 0 |
| patient-web | exit 0 |
| patient-app | exit 0 (after installing `packages/ui-native`, exactly as CI does) |
| provider-app | exit 0 |

## Tests
| Suite | Result |
|---|---|
| patient-app jest | **68/68 suites, 423/423 tests pass** |
| provider-app jest | **16/16 suites, 147/147 tests pass** |
| patient-web vitest | **196 files passed / 14 skipped, 701 tests passed / 23 skipped, 0 failed** (the 23 skips are frozen pre-existing debt, unchanged) |
| admin vitest | **8 files, 87/87** |
| admin node:test | **2 files, 6 assertions** (newly wired into `npm test`) |
| backend P15 + resilience surface | **26/27 suites, 138/150 tests** |
| admin `next build` | exit 0 |

## Static audit gates — all zero
```
dtolint        == @Body() typed as non-class / unvalidated key (ValidationPipe skips): 0   (all 4 categories 0, exit 0)
routes --dups  == duplicate routes across files: 0
schemadrift    == writes to fields the schema does not declare (silently dropped): 0
dtocheck       639 DTO routes checked, 319 matched by client calls, 0 mismatches
idemcheck      == routes requiring an idempotency key: 44
               == client calls to them without a key: 0
```

## Known reds — pre-existing, NOT Phase 15, deliberately untouched
1. **`backend/src/modules/events/auto-entity-seo-pipeline.spec.ts` Scenario 20** — sitemap
   assertion fails. Tracked as Round 10 item 11. The file does not appear anywhere in the
   Phase 15 diff.
2. **`refund-request.q96.mongo.spec.ts`** (12 tests) — fails at
   `MongoMemoryServer.create()` with `UnexpectedCloseError … signal "SIGABRT"`.
   This machine cannot launch `mongod`; the assertions never execute. Documented in
   `AGENT_PROGRESS.md` as a known environment blocker.
3. **`OtpModal.test.tsx` cold-cache flake** (provider-app) — timing; passes on re-run.

## Merge work (278 upstream commits, 10 conflicts)
All resolved semantically, keeping both sides' intent — never by taking a whole side:

| Conflict | Resolution |
|---|---|
| `backend/.../livekit.service.ts` | Their superseded `APPT_STATES` import dropped; `CHAOS_FAIL_LIVEKIT` gate and all `livekitCall` wrappers kept |
| `backend/.../moyasar/module.ts` | **Genuinely contested** — see below |
| `backend/.../notifications.service.ts` | Both imports kept: our breaker wrapper + their `escapeHtml` (security fix) |
| `patient-web/app/[locale]/layout.tsx` | Our `NetworkPolicy`/`OfflineBanner`/`ToastViewport` kept **and** their self-hosted font migration applied |
| `patient-web/messages/{ur,hi,bn,fil}.json` | Union of both sides' keys; their dedicated translation pass won on `Errors.*` wording, our 25 `Network.*`/`RouteState` keys preserved. Parity test green |
| `admin/.../api/admin/[...path].ts` | Our resilient upstream client + their `staffRoleOf` gate + `Secure` cookie; **gate secret never weakened or reordered** |
| `admin/.../s/[type]/[slug].tsx` | Our `httpRequest` + their `jsonLdHtml` (XSS fix) |

### Q81 refund endpoint — a Phase 15 regression, found and reverted
Phase 15 commit `2aac2c4` had changed `payments.module.ts` and `finance-engine.module.ts`
to a **plural** `/payments/{id}/refunds`, based on a circular reading of existing code that
treated the local fake gateway as the bug. After the merge this left the repo split three ways.

Verified against the vendor reference (`docs.moyasar.com` Payments API, which documents
`POST /payments/:id/refund` beside `/payments/:id/capture` and `/payments/:id/void`, with no
plural route) and corroborated by `tools/live/fake_moyasar.py`, which dispatches the
**singular** path and 404s anything else. All three Moyasar call sites are now singular.
`payments.module.ts:134`/`:168` are Stripe/Tap charge-refund endpoints and were correctly left alone.

Two specs encoded the wrong contract and were rewritten to assert the true one —
`payments-refund-url.p15.spec.ts` now sweeps **every** non-spec backend file asserting zero
plural occurrences, which is strictly stronger than its previous single-call assertion.

Note for the reviewer: `docs/review/QA_DEFECTS.md:91` still proposes changing the *fake gateway*
to plural. That recommendation is backwards given the vendor docs. `QA_DEFECTS.md:110` (Q100,
Critical/money) already registers the correct direction. `j_payments.py:90` posts to the
controller route, never the gateway URL, so **the Q81 fix remains unit-proven, not live-proven** —
a follow-up journey step is warranted.

## Environment BLOCKED (no docker / no accounts on this machine)
`tools/live/run_gate.sh` and every live journey · live Sentry send (DSN) · device-farm run ·
test OTA 5 % + rollback (Expo account) · Schemathesis live fuzz (needs a server) ·
≥99.5 % crash-free measurement (production data only).

No journey output was fabricated anywhere in this work.

## Per-slice evidence
`patient-app/P15_NOTES.md`, `provider-app/P15_NOTES.md`, `patient-web/P15_NOTES.md`,
`backend/P15_NOTES.md`, `admin/P15_NOTES.md`, `docs/audit/P15_GATES_NOTES.md` —
each with real command output, mutation proofs (break → red → restore), and BLOCKED lines.