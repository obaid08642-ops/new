# Phase 8 — Batch J: medication-reminder fidelity

## Purpose

The Phase 2 audit recorded a risk that a noncanonical monthly recurrence could be coerced to weekly and that dose precision could be lost between form, server record and on-device notification. The canonical schema supports only `daily`, `weekly` and `as_needed`; “monthly” refers only to chronic refill tracking and must never become a medication dose recurrence.

## Source change

| Surface | Implemented control |
|---|---|
| Backend recurrence contract | The existing Backend normalization explicitly rejects `monthly`; this batch adds regression proof that unsupported monthly recurrence is rejected while exact fractional `dosage_count` remains persisted for a supported weekly reminder. |
| Device alert scheduler | The scheduler now returns zero schedules for any unexpected frequency rather than defaulting it to a daily alert. It keeps `as_needed` intentionally unscheduled. |
| Patient reminder list | The patient can now see saved frequency and numeric dosage count alongside the exact free-text dose/instructions. Unknown values are displayed plainly rather than silently presented as “as needed.” |
| Persistence ordering | Local notification setup still occurs only after a saved Backend reminder returns a canonical reminder ID and normalized saved fields. |

## Verification

| Gate | Result |
|---|---|
| Focused health regression | **PASS** — `health.service.spec.ts`: 1 suite, 8 tests. New coverage rejects `monthly` and proves `dosage_count: 0.5`, exact dose text and `weekly` are preserved. |
| Combined Backend Phase 8 regressions | **PASS** — 8 suites, 50 tests across public discovery, Realtime, payments, JWT, family, health, maternity and nutrition. |
| Backend production build | **PASS** — `npm run build` (`nest build`). |
| Patient TypeScript | **PASS** — `npm run typecheck`. |
| Archive integrity | **PASS** — both rebuilt archives validate with `unzip -tq`; dependency/build outputs are excluded. |
| Backend archive SHA-256 | `c9b7bb6435fc59a3513d920672296067c3e05a66de984c3b5a425bdfea4fcadb` |
| Patient archive SHA-256 | `fc73969c72994b04a51558874aca70e1a6ef9f0b9d0cec7c261884615a73955f` |
| Branch upload | **PASS** — source commit `0eedead` (`fix: preserve medication reminder fidelity`) is on `manus/on-live-reconciliation`. |

## Remaining acceptance

Phase 10/11 must validate saved daily/weekly/as-needed reminders on approved simulators/sandbox deployment, device scheduling outcomes, timezone behavior, and that unknown recurrence is never scheduled. Monthly dose recurrence remains intentionally unavailable until a future server-side recurrence model, UI semantics and clinical/product approval exist.
