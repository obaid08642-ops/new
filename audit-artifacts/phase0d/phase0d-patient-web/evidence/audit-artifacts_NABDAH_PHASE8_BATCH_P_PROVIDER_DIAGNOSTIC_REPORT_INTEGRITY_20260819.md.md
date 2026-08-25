# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE8_BATCH_P_PROVIDER_DIAGNOSTIC_REPORT_INTEGRITY_20260819.md`
- **Member SHA-256:** `1317b89df880fa2b745fdd5d6395561b3cedc1586816bca3b93926113989a960`
- **Line count:** 29
- **Read range:** `1-29`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: The Phase 3 audit found radiology report upload accepted client-supplied PDF/DICOM/image URLs and stored them on bookings. A provider could claim that arbitrary location was a medical report, and downstream patient/doctor notifications woul`
- `11: | Radiology report upload | The operations upload route rejects `pdf_url`, `dicom_url`, and `image_urls`. It now requires `report_storage_object_id`; the object must exist, be private, be owned by the authenticated provider and have PDF MIM`
- `12: | Booking persistence | Both legacy and center booking schemas now carry storage-object ID fields for report, DICOM and image artifacts. Raw URL fields are cleared on secure upload; report review requires a secure report object ID. |`
- `14: | Module wiring | The radiology module registers the existing StorageObject schema so report validation has a server-side source of truth. |`
- `25: | Branch upload | **PASS** — source commit `29a5927` (`fix: require private storage for radiology reports`) is on `manus/on-live-reconciliation`. |`
- `29: The legacy raw report endpoint is intentionally unavailable until the Provider app migrates to upload a private StorageObject then submits its ID. It is safer to block this path than manufacture a report or accept arbitrary URLs. Patient de`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `11: | Radiology report upload | The operations upload route rejects `pdf_url`, `dicom_url`, and `image_urls`. It now requires `report_storage_object_id`; the object must exist, be private, be owned by the authenticated provider and have PDF MIM`
### state_transitions
- `13: | Legacy provider endpoint | `radiology/provider/finalize-scan/:id`, which still accepts raw URL payloads, now fails closed with an explicit migration error. It cannot create a report-ready record from a client URL. |`
- `20: | Focused report-storage regression | **PASS** — 1 suite, 2 tests. It rejects a raw report URL before state mutation and accepts only a private provider-owned PDF object reference. |`
### payment_insurance_relevance
- `13: | Legacy provider endpoint | `radiology/provider/finalize-scan/:id`, which still accepts raw URL payloads, now fails closed with an explicit migration error. It cannot create a report-ready record from a client URL. |`
### error_empty_loading_retry_cancel
- `13: | Legacy provider endpoint | `radiology/provider/finalize-scan/:id`, which still accepts raw URL payloads, now fails closed with an explicit migration error. It cannot create a report-ready record from a client URL. |`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
