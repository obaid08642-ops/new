# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE8_BATCH_G_CLINICAL_VITALS_CONTRACT_20260819.md`
- **Member SHA-256:** `dd1d06ce784a03bb4cfd2d4dc5079c5600b7e0009222609972fe84c768945f0e`
- **Line count:** 29
- **Read range:** `1-29`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: Phase 2 identified a clinical data-contract risk where Patient vital workflows and Backend data could diverge between `sugar`/`heart` and canonical `glucose`/`heart_rate`. The current Patient vital screen already emits canonical types, but `
- `12: | Patient contract compatibility | The current Patient `vitals-log` screen uses `bp`, `glucose`, `heart_rate`, `weight`, `temperature` and `spo2`; its payloads remain compatible with the canonical Backend contract and units. |`
- `25: | Branch upload | **PASS** — source commit `d2259f9` (`fix: normalize vital measurement contracts`) is on `manus/on-live-reconciliation`. |`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `5: Phase 2 identified a clinical data-contract risk where Patient vital workflows and Backend data could diverge between `sugar`/`heart` and canonical `glucose`/`heart_rate`. The current Patient vital screen already emits canonical types, but `
### payment_insurance_relevance
- `12: | Patient contract compatibility | The current Patient `vitals-log` screen uses `bp`, `glucose`, `heart_rate`, `weight`, `temperature` and `spo2`; its payloads remain compatible with the canonical Backend contract and units. |`
- `20: | Combined Backend Phase 8 regressions | **PASS** — 6 suites, 41 tests across public discovery, Realtime, payments, JWT, family and health contracts. |`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
