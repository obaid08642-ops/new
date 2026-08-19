# Phase 11 — sandbox read-only authorization wave 2

## Scope and handling

This wave used the two supplied patient sandbox accounts and read-only requests to the production API. When a Patient1 record was required, its opaque identifier was used only in-memory to make a Patient2 request. No identifier, token, clinical field, account field or response body is retained here. No mutation was issued.

## Results

| Case | Expected safe result | Observed result | Verdict |
|---|---|---:|---|
| Patient1 → `GET /lab-results/mine` | Own records only | `200`; one sandbox source record available | **PASS** |
| Patient2 → Patient1 lab result detail | `403` or existence-hiding `404` | `404` | **PASS** |
| Patient1 → `GET /prescriptions/mine` | Own list only | `200`; no usable sandbox prescription source record | **PASS (list only)** |
| Patient2 → Patient1 prescription detail | `403` or `404` | Not executable: no Patient1 sandbox record in list | **BLOCKED — no source data** |
| Patient1 → `GET /unified-bookings/mine` | Own timeline only | Final bounded recheck returned `200` | **PASS** |
| Patient2 → Patient1 unified-booking detail | `403` or existence-hiding `404` | `404` | **PASS** |
| Unauthenticated → `GET /orders/mine` | `401`/`403` | `401` | **PASS** |
| Patient1 → known admin report `GET /admin/referrals/report` | `401`/`403` | `403` | **PASS** |

## Contract corroboration and risk note

The local release source validates the intended ownership model for lab results: `mine` filters by the authenticated patient and singular reads hide a foreign record as `404`. It also validates the intended unified-booking model: list queries filter by authenticated `patient_id` and singular reads filter by both identifier and `patient_id`, hiding a foreign record as `404`. A final live recheck with an explicit eight-second request bound returned `200` for the owner timeline and `404` for the foreign detail request. The earlier browser-operation timeouts did not recur and are recorded as transient/inconclusive transport observations, not as an availability defect.

The pre-remediation archive exposed a material prescription-detail gap: `GET /prescriptions/:id` supplied only a bare identifier lookup without a current-user ownership argument. The live BOLA test could not be exercised because Patient1 had no prescription record. The finding was subsequently fixed in source, covered by focused and full Backend gates, and re-archived in the separate remediation evidence. It remains **not marked live PASS** until a reviewer-authorized deployment and a post-deployment cross-account sandbox proof can use an actual Patient1 prescription record.

## Limits

The bounded live checks prove only the results in the table. They do not establish successful end-to-end service workflow, payment, claims, messaging, realtime, notification delivery, storage, device behavior or release readiness.
