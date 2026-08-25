# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE2_PRESCRIPTION_TRANSLATOR_CONTRACT_SAFETY_GAPS_20260819.md`
- **Member SHA-256:** `5c2d70e7b994de4b2b199e850bce93b3a979c0a3ee4813b46aecd499b4addc77`
- **Line count:** 15
- **Read range:** `1-15`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `7: | **P0** | OCR response contract is incompatible with the screen | Backend OCR returns `{items: [{medicine_id, raw_name_string, requested_quantity, notes}]}`; screen reads `res.medications`. It then displays a successful translation even wh`
- `8: | **P0** | Screen fabricates medication directions, availability, alternatives, doctor/date, and clinical information | Missing OCR fields become “قرص عند الحاجة,” “حسب إرشاد الطبيب,” “استخدام طبي موصوف,” “متوفر بدائل بالصيدلية,” a current `
- `10: | **P1** | Ordering, product-details, reminder, and doctor-sharing handoffs discard the extracted item identity | All routes navigate generically; they do not pass approved medicine ID, verified prescription reference, dose, or clinician co`
- `11: | **P1** | OCR failure/success and clinical copy are Arabic-only and not safely differentiated | A missing/empty extraction is indistinguishable from success; raw Arabic defaults and actions lack six-language medical review. | Provide revie`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `9: | **P0** | Prescription image is sent to AI without a specific sensitive-document consent contract | Image base64 is sent to `/ai/ocr-translate` after camera/gallery permission only; no explicit purpose/processor/retention/deletion/verifica`
- `10: | **P1** | Ordering, product-details, reminder, and doctor-sharing handoffs discard the extracted item identity | All routes navigate generically; they do not pass approved medicine ID, verified prescription reference, dose, or clinician co`
### state_transitions
- `3: ## Confirmed defects`
- `7: | **P0** | OCR response contract is incompatible with the screen | Backend OCR returns `{items: [{medicine_id, raw_name_string, requested_quantity, notes}]}`; screen reads `res.medications`. It then displays a successful translation even wh`
- `9: | **P0** | Prescription image is sent to AI without a specific sensitive-document consent contract | Image base64 is sent to `/ai/ocr-translate` after camera/gallery permission only; no explicit purpose/processor/retention/deletion/verifica`
- `10: | **P1** | Ordering, product-details, reminder, and doctor-sharing handoffs discard the extracted item identity | All routes navigate generically; they do not pass approved medicine ID, verified prescription reference, dose, or clinician co`
- `11: | **P1** | OCR failure/success and clinical copy are Arabic-only and not safely differentiated | A missing/empty extraction is indistinguishable from success; raw Arabic defaults and actions lack six-language medical review. | Provide revie`
### payment_insurance_relevance
- `10: | **P1** | Ordering, product-details, reminder, and doctor-sharing handoffs discard the extracted item identity | All routes navigate generically; they do not pass approved medicine ID, verified prescription reference, dose, or clinician co`
### error_empty_loading_retry_cancel
- `7: | **P0** | OCR response contract is incompatible with the screen | Backend OCR returns `{items: [{medicine_id, raw_name_string, requested_quantity, notes}]}`; screen reads `res.medications`. It then displays a successful translation even wh`
- `9: | **P0** | Prescription image is sent to AI without a specific sensitive-document consent contract | Image base64 is sent to `/ai/ocr-translate` after camera/gallery permission only; no explicit purpose/processor/retention/deletion/verifica`
- `11: | **P1** | OCR failure/success and clinical copy are Arabic-only and not safely differentiated | A missing/empty extraction is indistinguishable from success; raw Arabic defaults and actions lack six-language medical review. | Provide revie`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
