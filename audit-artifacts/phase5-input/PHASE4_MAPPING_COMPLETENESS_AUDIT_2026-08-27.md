# Phase 4 Mapping Completeness Audit — 2026-08-27

## Scope and boundary

This independent reconciliation reads only the local working mapping and the frozen reviewer gate ledger for `main @ 22526bedb77a3d8148219036367e4714f401aecc`. It makes **no product-source change**, no runtime call, no database/Redis/PSP/Sentry access, and no claim that a static review verifies runtime behavior or production readiness.

The audit tests deterministic closure conditions: candidate coverage, disposition, non-empty required fields, raw-ID uniqueness/completeness against `CONFIRMED_ROOT`, literal equality of stored exact evidence to ledger evidence, derived-ID existence/status/non-overlap with mapped raw IDs, documented fan-out, and root-ID format. It does **not** infer semantic equivalence from root names, keywords, or frequency; manual evidence-first decisions and documented root boundaries remain controlling.

## Results

| Check | Result |
|---|---:|
| `candidate_labels` | PASS |
| `all_final_mapped` | PASS |
| `required_fields_nonempty` | PASS |
| `raw_id_unique_complete_confirmed` | PASS |
| `exact_evidence_equals_ledger` | PASS |
| `derived_claims_valid_no_raw_overlap` | PASS |
| `root_id_format` | PASS |

| Metric | Value |
|---|---:|
| Mapping rows | 852 |
| Frozen ledger `CONFIRMED_ROOT` IDs | 852 |
| Unique mapped raw IDs | 852 |
| Final mappings | 852 |
| Unreviewed mappings | 0 |
| Unique final root IDs | 125 |
| Claimed derived duplicate IDs | 205 |
| Blocking issues | 0 |
| Derived-graph fan-out advisories | 178 |

> **Conclusion:** PASS — deterministic completeness and frozen-ledger reconciliation checks passed; derived-graph fan-out is separately documented as a non-owning cross-reference.

## Root population

| Final root ID | Candidate-label rows |
|---|---:|
| `R-01A` | 5 |
| `R-01B` | 2 |
| `R-01C` | 1 |
| `R-01D` | 1 |
| `R-02A` | 10 |
| `R-03A` | 12 |
| `R-03B` | 12 |
| `R-03C` | 10 |
| `R-03D` | 8 |
| `R-04A` | 2 |
| `R-04A1` | 14 |
| `R-04A2` | 3 |
| `R-04A3` | 3 |
| `R-04A4` | 7 |
| `R-04B` | 4 |
| `R-04C` | 5 |
| `R-04D` | 10 |
| `R-04E` | 8 |
| `R-05A1` | 7 |
| `R-05A2` | 2 |
| `R-05B1` | 16 |
| `R-05B2` | 5 |
| `R-05C` | 17 |
| `R-05D` | 17 |
| `R-05E` | 1 |
| `R-05F` | 1 |
| `R-06A1` | 3 |
| `R-06A2` | 1 |
| `R-06C1` | 15 |
| `R-06C2` | 4 |
| `R-06D` | 2 |
| `R-06E` | 4 |
| `R-07A1` | 2 |
| `R-07A2` | 2 |
| `R-07A3` | 5 |
| `R-07A4` | 2 |
| `R-07A5` | 2 |
| `R-07A6` | 1 |
| `R-07A7` | 2 |
| `R-07B1` | 3 |
| `R-07B2` | 3 |
| `R-07B3` | 3 |
| `R-07B4` | 1 |
| `R-07C` | 14 |
| `R-08A` | 2 |
| `R-08B` | 9 |
| `R-09A` | 16 |
| `R-09B` | 25 |
| `R-09C` | 8 |
| `R-09D` | 4 |
| `R-10A` | 6 |
| `R-10B` | 19 |
| `R-11A` | 7 |
| `R-11B` | 4 |
| `R-12A` | 10 |
| `R-12B` | 11 |
| `R-12C` | 18 |
| `R-12D` | 3 |
| `R-12E` | 1 |
| `R-12F` | 1 |
| `R-12G` | 1 |
| `R-12H` | 1 |
| `R-12I` | 1 |
| `R-13A` | 9 |
| `R-13D` | 15 |
| `R-13E` | 6 |
| `R-14A` | 2 |
| `R-14B` | 1 |
| `R-14C` | 1 |
| `R-15A` | 9 |
| `R-15B` | 16 |
| `R-15C` | 7 |
| `R-15D` | 7 |
| `R-15E` | 10 |
| `R-15F` | 5 |
| `R-15G` | 2 |
| `R-16A` | 10 |
| `R-16B` | 5 |
| `R-16C` | 12 |
| `R-16D` | 11 |
| `R-16E` | 6 |
| `R-16F` | 5 |
| `R-16G` | 5 |
| `R-17A` | 4 |
| `R-18A` | 10 |
| `R-18B` | 13 |
| `R-18C` | 13 |
| `R-18D` | 4 |
| `R-18E` | 1 |
| `R-19A` | 2 |
| `R-20A` | 1 |
| `R-20B` | 1 |
| `R-21A` | 15 |
| `R-21B` | 11 |
| `R-21C` | 24 |
| `R-21D` | 7 |
| `R-21E` | 13 |
| `R-21F` | 9 |
| `R-21G` | 16 |
| `R-21H` | 7 |
| `R-21I` | 3 |
| `R-21K` | 6 |
| `R-21L` | 7 |
| `R-21M` | 5 |
| `R-21N` | 4 |
| `R-21O` | 4 |
| `R-21P` | 2 |
| `R-21Q` | 2 |
| `R-21R` | 2 |
| `R-22A` | 21 |
| `R-22B` | 2 |
| `R-22C` | 6 |
| `R-22D` | 26 |
| `R-22E` | 4 |
| `R-22F` | 7 |
| `R-22G` | 8 |
| `R-22H` | 1 |
| `R-22I` | 1 |
| `R-22J` | 1 |
| `R-23A` | 8 |
| `R-23B` | 12 |
| `R-23C` | 13 |
| `R-24A` | 11 |
| `R-25A` | 1 |
| `R-25B` | 1 |

## Reconciliation advisories and blocking issues

| Issue type | Count |
|---|---:|
| `DERIVED_ID_CLAIMED_MULTIPLE_TIMES` | 178 |

The row-level machine-readable output is `phase4_mapping_completeness_issues_2026-08-27.tsv`. `DERIVED_ID_CLAIMED_MULTIPLE_TIMES` rows are non-blocking graph-fan-out advisories and are reconciled in `PHASE4_CROSS_ROOT_DERIVED_REVIEW_2026-08-27.md`; any other row is blocking. Even a pass supports deterministic reconciliation only; it does not independently validate unexercised state transitions, external integrations, operational data, clinical accuracy, payment behavior, data migration, or deployment safety.
