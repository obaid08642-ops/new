# Phase 8 — Batch A: public care discovery remediation

## Purpose

This batch remediates the confirmed Phase 6 finding that public care endpoints could return raw provider/facility data and did not consistently restrict public details and slots to active records. The change was made only in the Backend source archive on `manus/on-live-reconciliation`; no production deployment, database migration, payment attempt or non-sandbox action occurred.

## Source change

| Item | Implemented control |
|---|---|
| Public doctor detail and slot | `doctorById` and `doctorSlots` now require `type=DOCTOR` and `status=ACTIVE`; unknown, pending, rejected and suspended records resolve as not found. |
| Public provider DTO | Doctor list, detail, similarity and search now flow through an explicit allowlist. It excludes internal user/account IDs, licensing/KYC files and verification history, bank details, exact address/coordinates, insurance contracts, operational schedules and other raw schema fields. |
| Public facility DTO | Facility list/detail require `is_active=true` and use a public allowlist; contact channels, exact address/coordinates and insurance contracts remain private. |
| Similar providers and facility members | Similar-doctor and facility-doctor lookups require active provider status and use the same public DTO. |
| Search safety | User search text is trimmed, length-bounded to 80 characters and regex-escaped before repository matching. |
| Pagination truthfulness | Doctor list returns an exact total only where it is exact; distance/availability-derived result sets mark total as non-exact and expose `has_more` rather than reporting the page length as a total. |

## Explicit non-goals and preserved restrictions

The batch does not treat provider status as a substitute for legal content approval, does not publish an exact location, does not expose KYC/document URLs, does not change appointment/payment/insurance workflows, and does not activate consent, emergency, QR or location functions. It keeps all Phase 2–6 fail-closed decisions intact.

## Verification

| Gate | Result |
|---|---|
| Focused Jest regression | **PASS** — `src/modules/care/tests/public-discovery.spec.ts`: 1 suite, 4 tests. It verifies active-only doctor/slot lookup, DTO redaction, active-only facility detail, escaped metacharacter search and pagination metadata. |
| Backend production build | **PASS** — `npm run build` (`nest build`). |
| Archive integrity | **PASS** — rebuilt `nabdah-backend.zip` validates with `unzip -tq`; `node_modules`, `dist` and `coverage` were excluded. |
| Source archive SHA-256 | `e6effb4fea968828eb47333212cb407630143f5ce0b9ecaf4cb4e74e7aaf591e` |
| Branch upload | **PASS** — source commit `7cd5c71` (`fix: secure public care discovery`) is on `manus/on-live-reconciliation`. |

## Remaining acceptance work

Phase 9 must run the broader Backend suite and contract tests. Phase 11 must perform public/foreign negative HTTP checks against a non-production or approved sandbox deployment: pending/suspended provider detail and slots must return the same safe not-found outcome; raw KYC/bank/exact-location fields must never appear; inactive facility detail must be unavailable; and literal search punctuation must not change match semantics.
