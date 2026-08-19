# Phase 8 — Batch AP: admin service-catalog publication containment

## Purpose

The catalogue manager made laboratory, radiology and nursing services available for immediate creation, modification and deletion, including patient-facing name, price, turn-around time, images and activation state. These changes could affect care selection and price without a versioned clinical, operations and finance approval, dependency-aware retirement/rollback path or approved media/typed-service policy.

## Source change

| Surface | Implemented control |
|---|---|
| Laboratory catalogue | Create/update routes return `503` before a service record changes; retirement returns `503` before deletion. |
| Radiology catalogue | Create/update routes return `503` before a service record changes; retirement returns `503` before deletion. |
| Nursing catalogue | Create/update routes return `503` before a service record changes; retirement returns `503` before soft deletion. |
| Browser catalogue manager | The page is an explicit unavailable surface; it does not list operational catalogue data or permit create/edit/delete actions. |

## Verification

| Gate | Result |
|---|---|
| Backend regression suite | **PASS** — 64 suites, 364 tests. |
| Backend production build | **PASS** — `nest build`. |
| Admin source contracts | **PASS** — 7/7, including explicit catalogue publication containment. |
| Next production build | **PASS** — clean-environment `next build`, TypeScript/compile/prerender, 34 static admin routes. |
| Backend archive integrity | **PASS** — `unzip -tq`; SHA-256 `5a436d0147fa068b4d419b7861c46b5053cc957dc8853a772e4ddfc7ea45b392`. |
| Admin archive integrity | **PASS** — `unzip -tq`; SHA-256 `5f59cf5ca7515228bf035c2fbf6aa1caa114dfb316da12b47ff2a18fa7abfda0`. |
| Branch upload | **PASS** — archive commit `7dd7466` (`fix: contain ungoverned admin catalog publication`) is pushed to `manus/on-live-reconciliation`. |

## Acceptance limits

No clinical service, package, price, availability, result time, media URL, patient booking, provider selection or catalogue history was read, created or modified. This containment does not implement catalogue governance. Before reopening it, the owner must approve version ownership, clinical/operations/finance approvals, effective dates, dependency checks, retirement/rollback, typed validation, trusted media sourcing, audit/events and patient/provider communication. Phase 11 must test only reviewer-authorized sandbox records.
