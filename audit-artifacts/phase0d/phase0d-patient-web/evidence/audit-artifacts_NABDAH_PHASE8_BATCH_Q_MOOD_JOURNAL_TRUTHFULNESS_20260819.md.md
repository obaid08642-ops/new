# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE8_BATCH_Q_MOOD_JOURNAL_TRUTHFULNESS_20260819.md`
- **Member SHA-256:** `c7e0d1c8d7e9a0667bb452666679f15cf1fac707364c4bd471d4dbe0b3a19664`
- **Line count:** 31
- **Read range:** `1-31`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `11: | Submission payload | The screen now builds its request through a typed contract helper. It requires an explicit mood selection and sends energy, stress, sleep, notes, and tags only when the patient actually supplied them. No mood score, d`
- `13: | History response | The screen accepts only the Backend's patient-owned array contract. Every entry must have an allowed mood and a valid server/legacy timestamp (`logged_at` or `createdAt`). An unexpected payload becomes an explicit load `
- `27: | Branch upload | **PASS** — source commit `c865fbf` (`fix: validate patient mood journal contract`) is on `manus/on-live-reconciliation`. |`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `5: The Patient audit identified a risk that mood-history failures or malformed responses could be displayed as an empty owned history, and that optional wellbeing fields could drift from the Backend contract. A mood journal is a **self-reporte`
- `12: | Client validation | Optional energy/stress values are constrained to integer 1–5, sleep to finite 0–24, and tags to a unique non-empty string list before the request. Server validation remains the authority. |`
- `13: | History response | The screen accepts only the Backend's patient-owned array contract. Every entry must have an allowed mood and a valid server/legacy timestamp (`logged_at` or `createdAt`). An unexpected payload becomes an explicit load `
### payment_insurance_relevance
- `11: | Submission payload | The screen now builds its request through a typed contract helper. It requires an explicit mood selection and sends energy, stress, sleep, notes, and tags only when the patient actually supplied them. No mood score, d`
- `13: | History response | The screen accepts only the Backend's patient-owned array contract. Every entry must have an allowed mood and a valid server/legacy timestamp (`logged_at` or `createdAt`). An unexpected payload becomes an explicit load `
- `15: | Regression tests | A new pure contract suite verifies selected-only payloads, invalid reading rejection, legacy timestamp normalization, and malformed-response failure behavior. |`
### error_empty_loading_retry_cancel
- `5: The Patient audit identified a risk that mood-history failures or malformed responses could be displayed as an empty owned history, and that optional wellbeing fields could drift from the Backend contract. A mood journal is a **self-reporte`
- `12: | Client validation | Optional energy/stress values are constrained to integer 1–5, sleep to finite 0–24, and tags to a unique non-empty string list before the request. Server validation remains the authority. |`
- `13: | History response | The screen accepts only the Backend's patient-owned array contract. Every entry must have an allowed mood and a valid server/legacy timestamp (`logged_at` or `createdAt`). An unexpected payload becomes an explicit load `

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
