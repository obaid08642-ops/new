# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE2_MONTHLY_REPORT_DATA_LOCALIZATION_GAP_20260819.md`
- **Member SHA-256:** `7423ef2b95b9c772d21c4f50034a2038bdfaa8c6a424a6dfabd84f341f75691c`
- **Line count:** 19
- **Read range:** `1-19`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `15: | Screen state | Four API calls fall back independently to empty arrays | **FIX — distinguish partial-data/error state from true “no data yet,” and identify which source failed** |`
### backend_consumers_or_contracts
- `5: Patient monthly report requests real appointments from `GET /care/appointments`, then filters and renders them using `scheduled_at`. The authoritative appointment creation contract stores the time as `slot_start` (and `slot_end`), not `sche`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `3: ## Confirmed data-contract mismatch`
- `7: Consequently, the report’s month counts, completed/upcoming cards, and appointment list can appear empty even when the patient has real appointments.`
- `11: | Monthly appointment filters | Uses `a.scheduled_at` for date parsing | **P1 FIX — map the canonical `slot_start` field or a normalized Backend report DTO; test real appointment counts/statuses** |`
- `13: | Clinical status inheritance | Report renders health vital summary produced by a Backend summary that currently labels readings normal without value assessment | **FIX — consume corrected neutral/reviewed vital status only after the vital `
- `14: | Month label | Uses an Arabic-only `AR_MONTHS` array and raw Arabic labels irrespective of selected language | **FIX — use locale-aware date formatting and key-based translation for all title/empty/stat/action copy** |`
- `15: | Screen state | Four API calls fall back independently to empty arrays | **FIX — distinguish partial-data/error state from true “no data yet,” and identify which source failed** |`
- `19: The monthly report remains **FIX/BLOCKED** for reliable appointment reporting and full localization. It must use canonical server fields, truthful partial-error states, corrected vital status semantics, and multilingual date/copy coverage b`
### payment_insurance_relevance
- `7: Consequently, the report’s month counts, completed/upcoming cards, and appointment list can appear empty even when the patient has real appointments.`
- `19: The monthly report remains **FIX/BLOCKED** for reliable appointment reporting and full localization. It must use canonical server fields, truthful partial-error states, corrected vital status semantics, and multilingual date/copy coverage b`
### error_empty_loading_retry_cancel
- `7: Consequently, the report’s month counts, completed/upcoming cards, and appointment list can appear empty even when the patient has real appointments.`
- `14: | Month label | Uses an Arabic-only `AR_MONTHS` array and raw Arabic labels irrespective of selected language | **FIX — use locale-aware date formatting and key-based translation for all title/empty/stat/action copy** |`
- `15: | Screen state | Four API calls fall back independently to empty arrays | **FIX — distinguish partial-data/error state from true “no data yet,” and identify which source failed** |`
- `19: The monthly report remains **FIX/BLOCKED** for reliable appointment reporting and full localization. It must use canonical server fields, truthful partial-error states, corrected vital status semantics, and multilingual date/copy coverage b`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
