# Semantic evidence — Mobile Pharmacy Drug Not Found

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/pharmacy/drug-not-found.tsx:12–26,102–120` presents a manual medicine form and an image area, but `pickImage` only sets `hasImage` to true; no image picker, URI, upload, validation, size limit, retention or file ID is created. The resulting “تم رفع الصورة” badge is therefore a local false-success label. The form captures name, dose, quantity and notes, but only `name` is required (`:15–20,28–30,88–99`); dose, quantity bounds, notes and medicine identifiers are not typed or validated.

`handleSubmit` calls only `/patient/pharmacy/shortage-flags/lookup?generic_name=...` (`:28–33`). It does not submit the patient request, quantity, dose, notes or image, does not bind a source order/cart/address/account, and has no visible Idempotency-Key, ownership, consent, rate limit or replay protection. If the lookup says flagged, the “find equivalent alternative” choice only sets local `sent` state (`:34–41`); if it is not flagged, it also sets `sent` locally (`:43–45`). Any lookup exception is caught and likewise sets `sent` to true (`:46–50`).

The success screen claims a pharmacist received and will review the request, send availability/price, and allow confirmation/delivery (`:52–64`), but no server request ID, persisted status, notification linkage, pharmacist queue contract, alternative approval, price quote, substitution consent, retry or failure state exists in this source. “Add another medicine” resets local fields only. No Phase 0 remediation was made.
