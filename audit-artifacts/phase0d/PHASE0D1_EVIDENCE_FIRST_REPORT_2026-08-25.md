# Phase 0D.1 — Evidence-First Journey Reconciliation

## Scope and prohibition

This artifact replaces the mechanical reconciliation approach. The previous 40 rows remain preserved in `PHASE0D_JOURNEY_CONTRACT_RECONCILIATION_REJECTED_MECHANICAL_ANCHOR.tsv` with `status=REJECTED_MECHANICAL_ANCHOR`. They are historical only and are not used in the active backlog.

No keyword ranking, score, first-match selection, runtime test, build, product change, remediation, migration, merge, or deployment was performed.

## Active rows

`PHASE0D1_EVIDENCE_FIRST_JOURNEY_ROWS.tsv` contains **77 active rows** across ten journeys and four application surfaces. A row exists only from an explicit catalog entry with a named step and exact member path; the generator never ranks candidates or chooses the first/highest keyword match.

| Journey | Rows |
|---|---:|
| Pharmacy | 11 |
| Consultation | 11 |
| Labs | 5 |
| Radiology | 5 |
| Nursing/Home-care | 8 |
| Identity/OTP/Roles | 10 |
| Family/Health | 5 |
| Prescription/Chat/Support | 8 |
| Wallet/Insurance/Payment | 8 |
| Settings/Accessibility/Location | 6 |
| **Total** | **77** |

The active rows use exact frontend member paths and source lines from the relevant baseline archive. Backend anchors are restricted to explicit production controller/service/schema paths from the backend baseline archive; test/spec files are excluded from backend production anchors.

## Required row evidence

Each row includes surface, actor, exact screen/route, exact CTA/action or a row-specific missing-capability statement, navigation/next-state evidence, request method/path or socket event and payload status, controller → service → schema/state anchors, ownership/role status, authoritative price/stock/provider/insurance status, payment/COD/co-pay status, provider/admin action, notification/result/report status, and distinct happy/negative/validation/error/loading/empty/retry/cancel/refund states.

Where an exact capability is absent from the selected member or cannot be proven from baseline bytes, the row records `MISSING_CAPABILITY` with the exact row-specific path/line and reason. It does not use a generic `PRESENT` or `Trace required` placeholder.

## Evidence classifications

| Classification | Rows |
|---|---:|
| `CONFIRMED_DEFECT` | 0 |
| `STATIC_MATCHED_PARTIAL` | 0 |
| `RUNTIME_REQUIRED` | 16 |
| `INSUFFICIENT_EVIDENCE` | 61 |
| `MISSING_CAPABILITY` | 0 |
| **Total** | **77** |

No `STATIC_MATCHED_PARTIAL` row was accepted because an exact frontend request method/path or socket event was not established together with the complete backend chain. This is a conservative result, not a claim that the product has no matching APIs.

## Business rules

The payment-state field is journey-specific. Pharmacy rows explicitly require the chosen-offer gate before Cash/card and identify COD as deferred collection only when policy exists; insurance must wait for the pharmacy’s full/partial/rejected decision and co-pay. Consultation, labs, radiology, and home-care rows explicitly require service/provider/slot selection before Cash confirmation and require the insurance request → provider decision/co-pay → patient share → confirmation sequence. Non-payment journeys do not receive an unrelated payment rule.

## Automated semantic validation

`PHASE0D1_SEMANTIC_VALIDATION.json` reports:

| Gate | Result |
|---|---:|
| Active rows | 77 |
| Unique journey/surface/step keys | 77 |
| Exact frontend paths/lines validated against baseline | 0 failures |
| Backend anchor paths/lines validated against baseline | 0 failures |
| Missing-capability evidence notes | 0 failures |
| Generic/repeated state fields | 0 failures |
| Unrelated payment rules | 0 failures |
| Invalid classifications | 0 failures |

## Inputs and outputs

The raw candidate index `PHASE0D_DOMAIN_ANCHOR_CANDIDATES.tsv` is retained as an unselected search inventory only. It is not used as a reconciliation result. The active generator is `scripts/generate_phase0d1_evidence_first.py`, whose catalog contains explicit paths and named steps. The validator is `scripts/validate_phase0d1_semantic_rows.py`.

## Decision boundary

This is an audit-artifact correction and evidence classification. It does not close any journey, prove runtime behavior, authorize a build plan, or change the NO-GO decision. The independent reviewer must review the 77 active rows and decide whether any row is accepted for later runtime verification or remediation.
