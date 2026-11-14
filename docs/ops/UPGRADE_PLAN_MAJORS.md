# Plan for pending major upgrades

Source: `node tools/supply-chain/majors.mjs`, run on 2026-11-07 against the lockfiles in `main` and the npm registry's `latest` tag. It lists direct dependencies only. Nothing below has been attempted or tested: the order and the risks are an engineering judgement, to be confirmed by the first branch of each batch. Re-run the script for the current numbers (the weekly window workflow does).

Counts: backend 31, admin 6, patient-web 8, patient-app 11, provider-app 8 = 64 major-behind direct dependencies.

## Rules for every batch
One batch = one branch = one PR. Gates: `tsc`, full backend test run, `npm run build`, the audit gate (`tools/audit/audit_gate.mjs`, 16.7) must not get worse. Never mix a batch with a feature. Never on a Friday or before a holiday peak. Rollback is the previous image tag (and, once R20 is adopted, the previous signed digest).

## Batch 1 — tooling and types that cannot change runtime behaviour (low risk, do first)
| app | package | current → latest | note |
|---|---|---|---|
| backend | `@types/jest` | 29.5 → 30 | follows the jest major; do together with jest 30 only if jest is moved, otherwise keep |
| backend | `@types/uuid` | 10 → 11 | with uuid below |
| backend, admin, patient-web | `@types/node` | 22/20/24 → 26 | **do not**: types must match the Node runtime (22 in every Dockerfile). Pin to 22 and let Dependabot ignore this major until the runtime moves |
| admin | `jsdom` 26 → 31, `vitest` 3 → 5, `eslint` 9 → 10 | | test and lint only; vitest 5 and vite 8 in patient-web belong together |
| patient-web | `vite` 7 → 8, `vitest` 3 → 5 | | dev dependencies; run the web test suite |

## Batch 2 — small runtime libraries (one at a time, each its own PR)
| app | package | current → latest | what to check |
|---|---|---|---|
| backend | `uuid` | 10 → 14 | ESM-only releases; check imports in `src/**` and jest transform |
| backend | `web-push` | 3.6 → 4 | push sending path (notifications queue spec, VAPID) |
| backend | `opossum` | 9 → 10 | circuit-breaker wrappers (R3/R15 specs) |
| backend | `nest-winston` | 1.10 → 2 | logger bootstrap, `structured-logger` specs |
| backend | `nodemailer` | 9 → 10 | also clears the open advisory noted in 16.7; mail provider specs |
| backend | `@simplewebauthn/server` + admin `@simplewebauthn/browser` | 13 → 14 | **must move together**; passkey login flow end to end |
| patient-web | `cookie` 1 → 2, `lucide-react` 0.453 → 1.70, `redis` 4 → 6 | | `redis` client API changed across majors: run the ISR/cache specs |

## Batch 3 — the NestJS 12 family (high risk, one coordinated PR, own branch for a week)
`@nestjs/common`, `core`, `platform-express`, `platform-fastify`, `platform-socket.io`, `websockets`, `testing` 11 → 12, plus every `@nestjs/*` add-on that also moved to 12: `bullmq`, `config`, `cqrs`, `event-emitter`, `jwt`, `mongoose`, `schedule`, `swagger`, `terminus`, `cli`. They share peer ranges, so they cannot be moved one by one. Before starting: read the Nest 12 migration guide, check the guards, interceptors and middleware added in R5, R12, R16 (they use Nest APIs directly), and run the whole backend suite plus the boot tests (`jest.boot.config.js`). Expect to touch the public-API surface of every module.

## Batch 4 — data and observability majors (after batch 3)
| package | current → latest | note |
|---|---|---|
| `mongoose` | 8.24 → 9 | schemas, plugins (audit and health-field encryption plugins), `lean()` typing. Run every spec that uses MongoMemoryServer and the R14 validators |
| `bullmq` | 5.81 → 6 | queues, outbox and R25-style fan-out; must match `@nestjs/bullmq` 12 |
| `@sentry/nestjs`, `@sentry/profiling-node`, patient-web `@sentry/nextjs` | 10 → 11 | tracing helpers (R5 `traced`), source-map upload config (`SENTRY_20.4.md`) |

## Batch 5 — TypeScript 7 (separate decision)
`typescript` 5.9 / 6.0 → 7.0 in every app. A new compiler generation: run it first in a throwaway branch with `tsc --noEmit` per app to measure the error count, then decide. Do not schedule until batches 3 and 4 are merged, so a failure cannot be blamed on two things at once.

## Batch 6 — mobile apps, tied to the Expo SDK (owner and mobile team)
Both apps are pinned by the Expo SDK; these majors move with an SDK upgrade, not alone: `@babel/core` 7 → 8, `@react-native-async-storage/async-storage` 2 → 3, `react-native-callkeep` 3 → 4, `@livekit/react-native` 2 → 3 and `@livekit/react-native-webrtc` 144 → 150 (**calls**: test on real devices over wifi and mobile data), `@react-native-firebase/app` and `messaging` 25 → 27 (push), `jest-circus` 29 → 30. patient-app only: `zod` 3 → 4 (schema API changes across the app), `@hookform/resolvers` 3 → 7 (must match zod 4 and react-hook-form), `react-native-chart-kit` 6 → 7. `react-native-modal` 14.0.0-rc.1 is a **release candidate** published as `latest`: do not adopt.
Next step for this batch: pick the target Expo SDK, then list what it requires; do not bump these in isolation.

## Not planned
`@types/node` 26 until the runtime image moves off Node 22.
