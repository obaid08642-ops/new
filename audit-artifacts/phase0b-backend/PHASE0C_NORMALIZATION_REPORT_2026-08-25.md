# Phase 0C Finding Normalization Report

## Scope and guardrails

This is an audit-only normalization of `audit-artifacts/phase0-main-audit/confirmed-findings-v1.md` from the Nabd baseline. It does not delete or rewrite raw evidence, change `main @ 22526bedb77a3d8148219036367e4714f401aecc`, modify product source, add mocks, execute remediation, run builds/tests, migrate data, merge, or deploy.

## Before/after counts

| Measure | Before | After |
|---|---:|---:|
| Raw observation occurrences | 4,243 | 4,243 mapped |
| Raw severity P0/P1/P2 | 2,092 / 2,057 / 94 | preserved per mapping |
| Normalized root defects | N/A | 80 |
| Normalized root severity P0/P1/P2 | N/A | 39 / 23 / 18 |
| Unread raw observations | N/A | 0 in source register parser |

The raw register contains 27 noncanonical repeated IDs (`F-341?` and `F-345?`). They were not silently discarded or renamed in the raw register. The companion TSV preserves them as stable occurrence IDs such as `F-341?#01` and `F-345?#01`, while retaining the original F-ID in `original_f_id`.

## Rooting method

Observations were grouped into vertical workstreams and control categories rather than by directory alone. Each root defect has a stable `RD-####` ID, normalized severity, one of four disjoint queues, workstream, category, owner, status, observation count, affected journeys, source-path references, root-cause summary, decision dependency, accepted behavior and tests required for closure. Each raw observation maps to exactly one root defect in the companion TSV with an explicit relation: `root`, `derived-from`, `blocked-by-decision`, or `unverified-runtime`.

The parser uses the first two table cells and the final two table cells, preserving pipes such as `||` inside finding text. This prevents raw observations from being lost when a finding contains code operators. Evidence cells remain the original source-path references.

## Queue and status results

| Queue | Root defects |
|---|---:|
| `SECURITY_RELEASE_BLOCKER` | 39 |
| `FUNCTIONAL_ROOT_DEFECT` | 2 |
| `PRODUCT_DECISION_REQUIRED` | 36 |
| `RUNTIME_OR_EXTERNAL_VERIFICATION_REQUIRED` | 3 |

| Status | Root defects |
|---|---:|
| `BLOCKED_BY_DECISION` | 74 |
| `BLOCKED_BY_EVIDENCE` | 4 |
| `READY_FOR_BUILD` | 2 |

`READY_FOR_BUILD` is limited to roots that are not identified as financial, clinical, authorization or state-machine controls and have no detected decision or runtime dependency. It is not a production approval; all product work remains prohibited by the reviewer order until Phase 0C is accepted.

## Workstreams

The root register covers the requested vertical workstreams: platform/identity/audit; catalog/quote; pharmacy offers+settlement; consultation; diagnostics/homecare; insurance/payment; provider/admin operations; patient web/mobile parity; and release operations. Workstream status and root counts are included in the normalized Markdown backlog.

## Deliverables

- `NABD_Normalized_Remediation_Backlog_2026-08-25.md`: readable root-defect register, counts, queues, statuses, journeys, source paths, decisions, accepted behavior and tests.
- `NABD_Normalized_Remediation_Backlog_2026-08-25.tsv`: one mapping row for every one of the 4,243 raw observation occurrences, including duplicate/noncanonical IDs.
- `scripts/normalize_findings.py`: reproducible generator preserving raw rows and occurrence identity.
- `confirmed-findings-v1.md`: unchanged raw evidence register.

## Acceptance boundary

No root defect is closed by this report. The owner, decision prerequisite, server-governed behavior and tests are recorded so the reviewer can select the next authorized phase. Runtime, sandbox, payment, device, human/legal and deployment verification remain outside Phase 0C.
