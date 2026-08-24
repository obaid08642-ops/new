# Phase 0 semantic coverage status — main baseline

## Baseline and governance

The audit branch is based on `main` at `22526bedb77a3d8148219036367e4714f401aecc`. This document is a work-in-progress coverage register. It does not authorize remediation, deployment, or a production-readiness claim.

## Read directly from first-party source

| Area | Files/surfaces read | Evidence captured |
|---|---|---|
| Backend bootstrap | `src/main.ts`, `src/app.module.ts` | Prefix/versioning, validation, global guards/interceptors/middleware, environment fallbacks. |
| Patient Web | `app/layout.tsx`, `app/robots.ts`, patient allowlist, patient BFF catch-all | Global indexing metadata, GET-only allowlist, cookie/BFF behavior. |
| Patient Mobile | API layer, app root/tabs, EmailAuthProvider | Secure/session/retry behavior, guest state, navigation and token-returning legacy provider. |
| Provider Doctor | `DoctorDashboard.tsx`, `ContractModal.tsx` | Queue/payment/insurance/fallback/Socket/legal acceptance observations. |
| Provider Nursing | `NursingDashboard.tsx`, `NursingFieldOps.tsx` | Queue/availability/respond/GPS/check-in/report/care-plan and local fallback observations. |
| Backend nursing | `home-care-compat.module.ts` | Canonical paths, role predicate, ownership, state transitions, GPS, care-plan and booking behavior. |
| Project backlog | `todo.md` lines 1–1104 | 729 checklist records: 367 checked, 361 open, 1 warning. |
| Historical contract evidence | `NABDAH_PHASE13_CONTRACT_CLASSIFICATION_20260819.md` | 1,342 historical routes, 333 consumer call sites, 238 unique candidate contracts; evidence branch only. |

## Automated/source indexes available

The main baseline contains 1,663 raw Backend decorator evidence lines, 3,489 manifest rows across tracked archives/source members, and a first-pass action/consumer index. These are search/index artifacts, not semantic acceptance.

## Remaining semantic coverage

The following work remains before Phase 0 can produce a final findings register: read every remaining Patient, Provider and Admin consumer screen/action with its referenced API client; match every candidate to current Backend controller, DTO/schema, service/repository, role/ownership guard, state transition, pricing/insurance/payment behavior, persistence/audit/outbox, error/loading/empty/retry UI, localization/accessibility, and test evidence; reconcile all historical candidates against current main; and record `PASS`, `FIX`, `BLOCKED`, or `INCONCLUSIVE` for each unique surface.

## Current status

Phase 0 remains `OPEN/PARTIAL`. No feature remediation, migration, payment activation, live data mutation, deployment, or production claim is permitted from this checkpoint.
