# Phase 2 Patient — monthly health report data and localization gap

## Confirmed data-contract mismatch

Patient monthly report requests real appointments from `GET /care/appointments`, then filters and renders them using `scheduled_at`. The authoritative appointment creation contract stores the time as `slot_start` (and `slot_end`), not `scheduled_at`.

Consequently, the report’s month counts, completed/upcoming cards, and appointment list can appear empty even when the patient has real appointments.

| Area | Evidence | Required disposition |
|---|---|---|
| Monthly appointment filters | Uses `a.scheduled_at` for date parsing | **P1 FIX — map the canonical `slot_start` field or a normalized Backend report DTO; test real appointment counts/statuses** |
| Report precision | The report declares it is built only from real data, while a core real-data section is read through a noncanonical field | **P1 truthfulness FIX — render unavailable data explicitly until normalized contract is present** |
| Clinical status inheritance | Report renders health vital summary produced by a Backend summary that currently labels readings normal without value assessment | **FIX — consume corrected neutral/reviewed vital status only after the vital remediation is completed** |
| Month label | Uses an Arabic-only `AR_MONTHS` array and raw Arabic labels irrespective of selected language | **FIX — use locale-aware date formatting and key-based translation for all title/empty/stat/action copy** |
| Screen state | Four API calls fall back independently to empty arrays | **FIX — distinguish partial-data/error state from true “no data yet,” and identify which source failed** |

## Decision

The monthly report remains **FIX/BLOCKED** for reliable appointment reporting and full localization. It must use canonical server fields, truthful partial-error states, corrected vital status semantics, and multilingual date/copy coverage before it can be described as a real-data monthly report.
