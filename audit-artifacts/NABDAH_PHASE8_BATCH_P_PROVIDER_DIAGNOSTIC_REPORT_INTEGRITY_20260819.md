# Phase 8 — Batch P: provider diagnostic report integrity

## Purpose

The Phase 3 audit found radiology report upload accepted client-supplied PDF/DICOM/image URLs and stored them on bookings. A provider could claim that arbitrary location was a medical report, and downstream patient/doctor notifications would carry the claimed link. This is incompatible with private media/PHI control.

## Source change

| Surface | Implemented control |
|---|---|
| Radiology report upload | The operations upload route rejects `pdf_url`, `dicom_url`, and `image_urls`. It now requires `report_storage_object_id`; the object must exist, be private, be owned by the authenticated provider and have PDF MIME type. Optional DICOM/image IDs receive the same private-owner check. |
| Booking persistence | Both legacy and center booking schemas now carry storage-object ID fields for report, DICOM and image artifacts. Raw URL fields are cleared on secure upload; report review requires a secure report object ID. |
| Legacy provider endpoint | `radiology/provider/finalize-scan/:id`, which still accepts raw URL payloads, now fails closed with an explicit migration error. It cannot create a report-ready record from a client URL. |
| Module wiring | The radiology module registers the existing StorageObject schema so report validation has a server-side source of truth. |

## Verification

| Gate | Result |
|---|---|
| Focused report-storage regression | **PASS** — 1 suite, 2 tests. It rejects a raw report URL before state mutation and accepts only a private provider-owned PDF object reference. |
| Combined Backend Phase 8 regressions | **PASS** — 14 suites, 110 tests. |
| Backend production build | **PASS** — `npm run build` (`nest build`). |
| Archive integrity | **PASS** — rebuilt Backend archive validates with `unzip -tq`; dependency/build outputs are excluded. |
| Backend archive SHA-256 | `68f7844295c8acb699323216d57e468937692f7693877388f2b9aea984bce436` |
| Branch upload | **PASS** — source commit `29a5927` (`fix: require private storage for radiology reports`) is on `manus/on-live-reconciliation`. |

## Compatibility and remaining work

The legacy raw report endpoint is intentionally unavailable until the Provider app migrates to upload a private StorageObject then submits its ID. It is safer to block this path than manufacture a report or accept arbitrary URLs. Patient delivery remains blocked on a dedicated report-access contract that authorizes patient/referrer from the booking and mints a short-lived storage read; Phase 9/11 must validate that contract with sandbox provider/patient/foreign-user/expired-link cases. No report, diagnostic image or non-sandbox record was uploaded or read in this batch.
