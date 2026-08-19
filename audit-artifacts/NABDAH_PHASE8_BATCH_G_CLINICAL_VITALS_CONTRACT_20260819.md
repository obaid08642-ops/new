# Phase 8 — Batch G: clinical vitals contract

## Purpose

Phase 2 identified a clinical data-contract risk where Patient vital workflows and Backend data could diverge between `sugar`/`heart` and canonical `glucose`/`heart_rate`. The current Patient vital screen already emits canonical types, but Backend write/read normalization was not centralized: a legacy list query could be silently queried under a noncanonical type while unknown types were not rejected.

## Source change

| Surface | Implemented control |
|---|---|
| Canonical type normalization | Backend now uses one `normalizeVitalType` function for both writes and list filtering. It maps supported legacy aliases `sugar → glucose` and `heart → heart_rate`; it normalizes case/whitespace; it rejects unsupported types. |
| Patient contract compatibility | The current Patient `vitals-log` screen uses `bp`, `glucose`, `heart_rate`, `weight`, `temperature` and `spo2`; its payloads remain compatible with the canonical Backend contract and units. |
| Clinical validation | Existing physiological range checks and BP systolic/diastolic validation remain enforced. This batch does not infer diagnosis, alter readings or invent values. |

## Verification

| Gate | Result |
|---|---|
| Focused health regression | **PASS** — `health.service.spec.ts`: 1 suite, 7 tests. New tests assert canonical persisted glucose/heart-rate values, canonicalized legacy list query and explicit unknown-type rejection. |
| Combined Backend Phase 8 regressions | **PASS** — 6 suites, 41 tests across public discovery, Realtime, payments, JWT, family and health contracts. |
| Backend production build | **PASS** — `npm run build` (`nest build`). |
| Patient TypeScript | **PASS** — `npm run typecheck`. |
| Archive integrity | **PASS** — rebuilt Backend archive validates with `unzip -tq`; dependency/build outputs are excluded. |
| Backend archive SHA-256 | `375267d59c43766e1da278f13cf5d12a20ba9e7b964de8df75e385cf4eed594a` |
| Branch upload | **PASS** — source commit `d2259f9` (`fix: normalize vital measurement contracts`) is on `manus/on-live-reconciliation`. |

## Remaining acceptance

Phase 11 must create only sandbox-owned readings through the Patient app and verify the persisted/history/summary contracts for `glucose` and `heart_rate`, including invalid range/type rejection. Clinical diagnosis, emergency escalation, care advice and medical-device accuracy are outside this code-batch claim and remain subject to governance and device validation.
