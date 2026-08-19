# Phase 8 — Batch U: monthly health-report temporal integrity

## Purpose

The Patient monthly report displayed consultation counts and timelines using `scheduled_at`, while the current appointment contract uses `slot_start`. In addition, every failed report endpoint was coerced to `[]`, allowing a total data-loading failure to look like an honest empty report.

## Source change

| Surface | Implemented control |
|---|---|
| Appointment time | A pure contract helper now reads `slot_start` first. `scheduled_at` is a read-only compatibility fallback for valid legacy records; malformed dates are omitted from counts and display rather than assigned a guessed time. |
| Collection validation | Report collections accept only an array or a `{ data: [] }` contract. Other response shapes reject instead of becoming an empty list. |
| Load state | The report uses settled fetch results and renders an explicit retryable load-failure state when every source fails. A genuine all-empty result remains a distinct empty-state experience. |
| Scope | Counts, upcoming status, and rendered appointment date/time now use the same normalized time function; no health scores, trend narratives, diagnosis, or recommendations are generated. |

## Verification

| Gate | Result |
|---|---|
| Focused monthly-report contract | **PASS** — 2 tests. |
| Patient TypeScript check | **PASS**. |
| Production Expo web export | **PASS**. |
| Full Patient Jest suite | **PASS** — 20 suites, 53 tests. |
| Archive integrity | **PASS** — rebuilt Patient archive validates with `unzip -tq`; dependencies and build outputs are excluded. |
| Patient archive SHA-256 | `b3dd7fa51e8f6d4ffa01027fc5f58a3e2a5a3c875b901d6279e61785c5b660f0` |
| Branch upload | **PASS** — source commit `a08bbb6` (`fix: normalize monthly report appointment dates`) is on `manus/on-live-reconciliation`. |

## Acceptance limits

No report, appointment, vital, medication, trend, or production record was created or changed. Phase 10–11 must still inspect report rendering on Android/iOS at supported breakpoints, test time-zone boundary cases against linked sandbox appointments, complete six-language copy review, and verify patient ownership against foreign account access.
