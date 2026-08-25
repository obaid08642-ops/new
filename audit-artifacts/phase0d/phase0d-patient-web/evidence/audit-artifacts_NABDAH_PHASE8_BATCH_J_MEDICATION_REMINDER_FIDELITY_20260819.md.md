# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE8_BATCH_J_MEDICATION_REMINDER_FIDELITY_20260819.md`
- **Member SHA-256:** `9aba068028672e9a29492a4c93b1080385b9a2ec64314f54d73c940f234315e6`
- **Line count:** 31
- **Read range:** `1-31`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `27: | Branch upload | **PASS** — source commit `0eedead` (`fix: preserve medication reminder fidelity`) is on `manus/on-live-reconciliation`. |`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `11: | Backend recurrence contract | The existing Backend normalization explicitly rejects `monthly`; this batch adds regression proof that unsupported monthly recurrence is rejected while exact fractional `dosage_count` remains persisted for a `
- `31: Phase 10/11 must validate saved daily/weekly/as-needed reminders on approved simulators/sandbox deployment, device scheduling outcomes, timezone behavior, and that unknown recurrence is never scheduled. Monthly dose recurrence remains inten`
### payment_insurance_relevance
- `20: | Focused health regression | **PASS** — `health.service.spec.ts`: 1 suite, 8 tests. New coverage rejects `monthly` and proves `dosage_count: 0.5`, exact dose text and `weekly` are preserved. |`
- `21: | Combined Backend Phase 8 regressions | **PASS** — 8 suites, 50 tests across public discovery, Realtime, payments, JWT, family, health, maternity and nutrition. |`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
