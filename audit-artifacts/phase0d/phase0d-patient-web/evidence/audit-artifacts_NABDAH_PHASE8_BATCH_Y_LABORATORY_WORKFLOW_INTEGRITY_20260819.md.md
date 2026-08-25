# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE8_BATCH_Y_LABORATORY_WORKFLOW_INTEGRITY_20260819.md`
- **Member SHA-256:** `4bc6323f14be3b6a3dcec8ec9d3138f3cc4c565207c76d620c028896e44ea11b`
- **Line count:** 35
- **Read range:** `1-35`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: The lab surface had multiple lifecycle bypasses. Sample registration accepted `NEW_REQUEST` and wrote booking state directly; sample stages could leap directly from received to result-ready; uploading a report changed booking state outside `
- `11: | Legal lab transition map | `RESULT_UPLOADED → REPORTED` is now an explicit domain transition. |`
- `12: | Sample registration | Requires an owned lab booking in `CONFIRMED`, `IN_TRANSIT` or `IN_LAB`; `NEW_REQUEST` cannot become sample-collected. The booking mutation runs inside `WorkflowEngineService.apply`. |`
- `13: | Sample stages | The only sample sequence is `received → analyzing → result_ready → sent`. Booking stages advance through the workflow engine for analyzing and result-ready; sending is blocked until the booking is reported. |`
- `14: | Report release | Report persistence is allowed only from `RESULT_UPLOADED` or an existing `REPORTED` booking. The release transition uses the workflow engine instead of an unmanaged direct state write. |`
- `15: | Structured lab results | `LabResultsService.create` now requires an assigned lab/hospital provider or admin, requires `RESULT_UPLOADED`, and creates/releases the result inside the workflow engine. A foreign provider or an early state cann`
- `16: | Provider UI | Sample registration uses `/labs/samples/register`; old direct `PROCESSING` writes are gone. Unsupported sample stages and placeholder report uploads are removed/contained. Result review requires actual `structuredData`; hard`
- `31: | Branch upload | **PASS** — source commit `7f6e811` (`fix: enforce lab lifecycle workflow`) is on `manus/on-live-reconciliation`. |`
- `35: The UI intentionally disables generic file upload and local draft claims until the existing private StorageObject binding is completed for lab reports. Likewise, sample rejection remains unavailable in this screen until the documented QC wo`
### backend_consumers_or_contracts
- `16: | Provider UI | Sample registration uses `/labs/samples/register`; old direct `PROCESSING` writes are gone. Unsupported sample stages and placeholder report uploads are removed/contained. Result review requires actual `structuredData`; hard`
### auth_ownership
- `15: | Structured lab results | `LabResultsService.create` now requires an assigned lab/hospital provider or admin, requires `RESULT_UPLOADED`, and creates/releases the result inside the workflow engine. A foreign provider or an early state cann`
- `35: The UI intentionally disables generic file upload and local draft claims until the existing private StorageObject binding is completed for lab reports. Likewise, sample rejection remains unavailable in this screen until the documented QC wo`
### state_transitions
- `5: The lab surface had multiple lifecycle bypasses. Sample registration accepted `NEW_REQUEST` and wrote booking state directly; sample stages could leap directly from received to result-ready; uploading a report changed booking state outside `
- `12: | Sample registration | Requires an owned lab booking in `CONFIRMED`, `IN_TRANSIT` or `IN_LAB`; `NEW_REQUEST` cannot become sample-collected. The booking mutation runs inside `WorkflowEngineService.apply`. |`
- `14: | Report release | Report persistence is allowed only from `RESULT_UPLOADED` or an existing `REPORTED` booking. The release transition uses the workflow engine instead of an unmanaged direct state write. |`
- `15: | Structured lab results | `LabResultsService.create` now requires an assigned lab/hospital provider or admin, requires `RESULT_UPLOADED`, and creates/releases the result inside the workflow engine. A foreign provider or an early state cann`
- `35: The UI intentionally disables generic file upload and local draft claims until the existing private StorageObject binding is completed for lab reports. Likewise, sample rejection remains unavailable in this screen until the documented QC wo`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `5: The lab surface had multiple lifecycle bypasses. Sample registration accepted `NEW_REQUEST` and wrote booking state directly; sample stages could leap directly from received to result-ready; uploading a report changed booking state outside `

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
