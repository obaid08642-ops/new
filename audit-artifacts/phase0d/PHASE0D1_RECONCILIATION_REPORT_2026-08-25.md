# Phase 0D.1 — Journey Contract Reconciliation Report

## Scope

This phase implements the independent reviewer’s Phase 0D.1 order on the baseline archive bytes associated with `main @ 22526bedb77a3d8148219036367e4714f401aecc`. It is audit-only. No product source, feature, migration, build, runtime test, deployment, or merge was performed.

## Manifest correction

Six zero-line archive members previously marked `fully_read=YES` with `line_ranges_read=N/A` were reclassified to `fully_read=N/A` with an explicit accepted reason. Five are in Patient Mobile: `docs/DATA_FLOW.md`, `docs/RECOVERY_GUIDE.md`, `docs/OFFLINE_SYNC_FLOW.md`, `docs/DATABASE_SCHEMA.md`, and `docs/SYNC_ENGINE.md`. One is in Patient Web: `audit-artifacts/full-audit-20260823/phase9-babel-why-prod.txt`.

Each has line_count zero, SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`, no valid line range, and a manifest note explaining the reclassification. The manifest validator reports zero failures and zero remaining `YES` rows with an invalid N/A line range.

## Reconciliation rows

`PHASE0D_JOURNEY_CONTRACT_RECONCILIATION.tsv` contains 40 rows: the ten required journeys across Patient Mobile, Patient Web, Provider, and Admin. Each row includes the requested fields for surface, journey, screen/route, CTA/action, actor, exact frontend path and line where a static anchor exists, request method/path or socket signal where one is present, exact backend production source path and line where a static anchor exists, ownership/role boundary, server-of-truth requirements, payment/insurance sequence, provider/admin step, result/notification, all required positive and negative states, and the evidence classification.

The generator deliberately excludes backend test/spec files from production handler anchors. `STATIC_MATCHED` is emitted only when a literal frontend endpoint is found in backend production bytes; similarity of domain keywords is not enough. When a screen or backend anchor exists but the exact contract chain cannot be proven from static bytes, the row is `INSUFFICIENT_EVIDENCE`. When a frontend endpoint exists but its backend literal is not matched, the row is `RUNTIME_REQUIRED`. Missing anchors are recorded as `MISSING_CAPABILITY` or `STATIC_MISMATCH`, not `PRESENT`.

| Evidence classification | Rows |
|---|---:|
| `STATIC_MATCHED` | 0 |
| `STATIC_MISMATCH` | 0 |
| `RUNTIME_REQUIRED` | 6 |
| `INSUFFICIENT_EVIDENCE` | 34 |
| `MISSING_CAPABILITY` | 0 |
| **Total** | **40** |

The absence of `STATIC_MATCHED` is intentional: no complete frontend endpoint-to-backend-contract chain was accepted solely from static keyword matching. This is not a runtime failure claim; it is a conservative evidence classification.

## Mandatory business rules recorded

The reconciliation rows explicitly preserve the required sequence. Pharmacy must move from cart to broadcast and selected pharmacy offer before card payment; COD is allowed only when an explicit policy exists. Insurance pharmacy requests must wait for pharmacy approval and full/partial/rejected decision plus co-pay before confirmation. Consultation, diagnostics, and home-care cash flows must select service, provider, and slot before payment and confirmation. Their insurance flows must request without payment, wait for provider decision and co-pay, then collect the patient share before confirmation.

The rows do not claim that any of these sequences are implemented. Exact UI, API, handler, DB/state, ownership, payment, insurance, provider/admin, notification, and negative-state validation remains required before closure.

## Validation

`PHASE0D_JOURNEY_CONTRACT_RECONCILIATION_VALIDATION.json` reports:

| Gate | Result |
|---|---:|
| Reconciliation rows | 40/40 |
| Required fields non-empty | 0 failures |
| Frontend paths/lines valid against baseline archives | 0 failures |
| Backend paths/lines valid against baseline backend archive | 0 failures |
| Classification vocabulary valid | 0 failures |
| Manifest validation failures | 0 |

## Deliverables

- `PHASE0D_JOURNEY_CONTRACT_RECONCILIATION.tsv`
- `PHASE0D_JOURNEY_CONTRACT_RECONCILIATION_VALIDATION.json`
- Four corrected Phase 0D manifests and evidence directories
- `scripts/fix_phase0d1_empty_members.py`
- `scripts/generate_phase0d1_reconciliation.py`
- `scripts/validate_phase0d1_reconciliation.py`
- Updated `PHASE0D_MANIFEST_VALIDATION.json`

## Decision boundary

Phase 0D.1 is an audit artifact delivery, not journey closure. The reviewer must accept the row-level evidence and decide which rows proceed to separately authorized runtime verification or remediation. The branch remains NO-GO for merge, build planning, production activation, and deployment.
