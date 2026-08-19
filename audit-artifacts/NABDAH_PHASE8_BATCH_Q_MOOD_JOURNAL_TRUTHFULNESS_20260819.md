# Phase 8 — Batch Q: Patient mood-journal truthfulness

## Purpose

The Patient audit identified a risk that mood-history failures or malformed responses could be displayed as an empty owned history, and that optional wellbeing fields could drift from the Backend contract. A mood journal is a **self-reported wellbeing record**, not a diagnostic assessment; the client must never synthesize inputs, date values, or clinical interpretation.

## Source change

| Surface | Implemented control |
|---|---|
| Submission payload | The screen now builds its request through a typed contract helper. It requires an explicit mood selection and sends energy, stress, sleep, notes, and tags only when the patient actually supplied them. No mood score, default energy/stress/sleep value, or inferred date is added. |
| Client validation | Optional energy/stress values are constrained to integer 1–5, sleep to finite 0–24, and tags to a unique non-empty string list before the request. Server validation remains the authority. |
| History response | The screen accepts only the Backend's patient-owned array contract. Every entry must have an allowed mood and a valid server/legacy timestamp (`logged_at` or `createdAt`). An unexpected payload becomes an explicit load error with retry rather than a misleading empty history. |
| Display | The history view no longer substitutes the current device time for missing server record time. |
| Regression tests | A new pure contract suite verifies selected-only payloads, invalid reading rejection, legacy timestamp normalization, and malformed-response failure behavior. |

## Verification

| Gate | Result |
|---|---|
| Focused mood contract and mental-health localization tests | **PASS** |
| Full Patient Jest suite | **PASS** — 16 suites, 45 tests. |
| Patient TypeScript check | **PASS** — `npm run typecheck`. |
| Production-mode Expo web export | **PASS** — one web bundle emitted; temporary output deleted after validation. |
| Archive integrity | **PASS** — rebuilt Patient archive validates with `unzip -tq`; dependencies and build outputs are excluded. |
| Patient archive SHA-256 | `2c3aef3aba13a981c8af2778519b2208d02c5ecf2cf1f7ee51b12ce34bf69415` |
| Branch upload | **PASS** — source commit `c865fbf` (`fix: validate patient mood journal contract`) is on `manus/on-live-reconciliation`. |

## Boundaries and remaining acceptance

This batch neither diagnoses a mental-health condition nor adds treatment recommendations. It does not seed, read, or mutate production records. Runtime verification on Android/iOS, six-language copy review, and an owned sandbox history lifecycle remain Phase 10–11 acceptance gates.
