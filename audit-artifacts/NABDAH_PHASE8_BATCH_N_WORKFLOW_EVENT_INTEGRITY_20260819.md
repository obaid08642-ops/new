# Phase 8 — Batch N: workflow and event integrity

## Purpose

Phase 5 established two cross-domain integrity gaps: an unrecognized domain state silently mapped to universal `REQUESTED`, and the event bus delivered in-process effects even if durable event persistence failed. This can produce misleading queues, notifications or audit assertions detached from the source of truth.

## Source change

| Surface | Implemented control |
|---|---|
| State normalization | `toUniversal` now trims/normalizes an input and throws `unknown_domain_state` for a state not explicitly declared in the domain map. It no longer silently falls back to `REQUESTED`. |
| Event durability boundary | Event bus persistence happens before in-process fanout. If durable event creation fails, `emit` logs and rethrows; no `EventEmitter2` notification is delivered. |
| Existing callers | Callers that deliberately tolerate non-critical notification/audit loss retain explicit `.catch(...)`; they are now visible policy decisions rather than a central hidden fanout behavior. |

## Verification

| Gate | Result |
|---|---|
| Focused workflow/event regression | **PASS** — 2 suites, 4 tests. It proves unknown-state rejection, deterministic declared mapping, no fanout after persistence failure, and fanout only after persistence. |
| Combined Backend Phase 8 regressions | **PASS** — 13 suites, 108 tests. |
| Backend production build | **PASS** — `npm run build` (`nest build`). |
| Archive integrity | **PASS** — rebuilt Backend archive validates with `unzip -tq`; dependency/build outputs are excluded. |
| Backend archive SHA-256 | `e73a69d9e528a320e364b36b10d9569d639fe3394554c6c0679be6661c1d857f` |
| Branch upload | **PASS** — source commit `28524aa` (`fix: fail closed workflow event persistence`) is on `manus/on-live-reconciliation`. |

## Remaining scope

This batch hardens the canonical mapper and event boundary; it does **not** claim every historical direct state write across every module has yet been migrated into a transaction/outbox-backed workflow transition. Phase 8 must continue that migration by service category. Phase 9/11 must test persistence outage, retry/outbox behavior and all externally reachable state transitions with patient/provider/admin roles before release.
