# Semantic evidence — Mobile Pharmacy Scan Prescription

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/pharmacy/scan-prescription.tsx:35–70` requests camera/library permissions and captures images with `base64: true`, preserving only a local URI for preview. There is no visible file size/type/content/legibility validation, consent/retention disclosure, or user correction/crop/retake flow before transmission. Permission and picker exceptions are logged or alerted without a structured retry state.

`processOCR` posts the full data URI to `/ai/prescription-ocr`, then posts the same base64 image and OCR items to `/prescriptions/upload` (`:72–98`). These are sensitive mutations without visible Idempotency-Key, upload/file identity, ownership binding, malware/content scan, OCR confidence, clinician/pharmacist review state, or duplicate/replay protection. The flow writes `setPrescriptionUrl(savedPrescription.id)` only after persistence succeeds, which is directionally correct, but no schema validation proves the returned ID belongs to the authenticated patient or that OCR items were server-normalized.

The screen adds persisted items with a backend `medicine_id` but assigns `price: 0`, `rx: true`, local icon fields and quantity (`:100–116`). This is an explicit zero-price placeholder-like value that may enter the local cart before server quote/stock resolution. Each add is sequential and a later failure can leave partial cart state without rollback. Unmatched OCR lines remain only in the prescription, while the UI routes to cart if any item was added and otherwise to `/pharmacy/rx-order` (`:118–124`); there is no visible review/edit of OCR lines, unmatched-item resolution, prescription status screen, or server-side cart binding.

The screen promises automatic extraction and addition (`:184–197`) but has no explicit “AI result may be wrong” confirmation or clinical safety guard. There is no cancellation/timeout/background resume/restart recovery, no duplicate submission guard beyond local loading, and no observability correlation. No Phase 0 remediation was made.
