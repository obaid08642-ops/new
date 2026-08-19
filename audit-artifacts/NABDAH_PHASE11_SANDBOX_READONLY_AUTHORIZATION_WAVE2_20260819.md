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
| Patient1 → `GET /unified-bookings/mine` | Own timeline only | No response before browser-operation timeout in two read-only attempts | **BLOCKED — availability/performance investigation required** |
| Patient2 → Patient1 unified-booking detail | `403` or existence-hiding `404` | Not executable because source list did not complete | **BLOCKED** |
| Unauthenticated → `GET /orders/mine` | `401`/`403` | `401` | **PASS** |
| Patient1 → known admin report `GET /admin/referrals/report` | `401`/`403` | `403` | **PASS** |

## Contract corroboration and risk note

The local release source validates the intended ownership model for lab results: `mine` filters by the authenticated patient and singular reads hide a foreign record as `404`. It also validates the intended unified-booking model: list queries filter by authenticated `patient_id` and singular reads filter by both identifier and `patient_id`, hiding a foreign record as `404`.

The available local prescription source is materially different: its `GET /prescriptions/:id` controller path calls a bare identifier lookup without a current-user ownership argument. The live BOLA test could not be exercised because Patient1 had no prescription record. Therefore this is **not marked PASS** and remains a **source-level P1 candidate requiring an ownership guard, regression test, rebuild and a post-deployment sandbox proof** before readiness can be claimed.

## Limits

The bounded live checks prove only the results in the table. They do not establish successful end-to-end service workflow, payment, claims, messaging, realtime, notification delivery, storage, device behavior or release readiness. The unified-bookings response-time failure is recorded as a Phase 11 blocker, not interpreted as an authorization pass or fail.
