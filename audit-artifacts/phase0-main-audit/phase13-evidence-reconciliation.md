# Phase 13 evidence reconciliation — main audit

## Scope

The tracked report `NABDAH_PHASE13_CONTRACT_CLASSIFICATION_20260819.md` identifies a static classification from branch `manus/on-live-reconciliation` at `9fdd99921023547080358858223f577c663a1b66`. It is evidence only. It is not silently adopted as the implementation source and does not replace the current main baseline `22526bedb77a3d8148219036367e4714f401aecc`.

## Evidence recorded in the report

| Measure | Reported value | Interpretation for current audit |
|---|---:|---|
| Backend routes observed | 1,342 | Historical/evidence-branch static observation; must be recomputed or reconciled against current main. |
| Raw consumer call sites | 333 | Static candidates, not proof of runtime reachability. |
| Unique contracts | 238 | Candidate set requiring DTO, role, ownership, transition, persistence, audit and live evidence. |
| Provider method/path candidates | 215 | Initial matches, not acceptance. |
| Provider missing/stale candidates | 10 | Carried as review candidates; no automatic source edit. |
| Patient method/path candidates | 4 | Historical count; must be compared with current main tree. |
| Admin method/path candidates | 7 | Historical count; must be compared with current main tree. |
| Dynamic paths | 2 | Remain INCONCLUSIVE until runtime trace. |

## Explicit candidate classifications carried forward

| Consumer/surface | Candidate | Historical status | Phase 0 treatment |
|---|---|---|---|
| DoctorChatTab | `GET /chats/provider` | STALE | Reconcile against current main thread contract; no redirect by filename. |
| DoctorChatTab | `GET/POST /chats/:id/messages` | STALE | Verify thread type, participant and DTO before any fix. |
| Doctor dashboard | `POST /provider/chat/send` | MISSING | Keep fail-closed unless a current authoritative contract is found. |
| NursingDashboard | `GET /home-care/visits` | STALE | Compare current consumer with `/nursing/visits` and role guard. |
| NursingDashboard | `POST /home-care/visits/:id/respond` | STALE | Verify state transition and cross-provider rejection. |
| Nursing note | `POST /home-care/notes` | STALE | Verify required patient/booking identity and ownership. |
| ContractModal | legal policy/acceptance paths | STALE | Verify exact dynamic `:key` contract and versioned acceptance. |
| Pharmacy inventory expiry | `GET /pharmacy/inventory/expiry` | MISSING | Keep unavailable; schema presence alone is not an endpoint. |
| Dynamic bases | Admin/Patient generic data layers | INCONCLUSIVE | Reconstruct runtime path only from consumer context. |

## Required final status vocabulary

Every surface must end as one of `PASS`, `FIX`, `BLOCKED`, or `INCONCLUSIVE`, with source path/line, contract, actor/ownership, state, data truthfulness, test and deployment evidence. Static method/path matching alone cannot produce `PASS`.

## Open reconciliation work

1. Recompute the route/consumer comparison from current main and record deltas from the historical report.
2. Read each candidate consumer and its referenced controller/service/schema before classification.
3. Reconcile all 238 historical candidates with current main, not just the ten explicitly listed stale/missing records.
4. Keep all live Sandbox and deployment gates separate from static source findings.
5. Do not alter production code during Phase 0.
