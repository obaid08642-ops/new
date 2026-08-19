# Phase 2 Patient — prescription translator contract and safety gaps

## Confirmed defects

| Priority | Finding | Evidence | Required remediation |
|---|---|---|
| **P0** | OCR response contract is incompatible with the screen | Backend OCR returns `{items: [{medicine_id, raw_name_string, requested_quantity, notes}]}`; screen reads `res.medications`. It then displays a successful translation even when medication list is empty. | Define and test one typed OCR/translation DTO; use a clear no-items/manual-review state and do not display success until validated extraction is present. |
| **P0** | Screen fabricates medication directions, availability, alternatives, doctor/date, and clinical information | Missing OCR fields become “قرص عند الحاجة,” “حسب إرشاد الطبيب,” “استخدام طبي موصوف,” “متوفر بدائل بالصيدلية,” a current date, and unknown doctor. These are medical/business assertions not present in a prescription. | Preserve only OCR-extracted source text and confidence; mark unverified content; require pharmacist/clinician confirmation before any directions, substitution, pricing, interaction, or ordering claim. |
| **P0** | Prescription image is sent to AI without a specific sensitive-document consent contract | Image base64 is sent to `/ai/ocr-translate` after camera/gallery permission only; no explicit purpose/processor/retention/deletion/verification consent is gathered. | Keep prescription OCR/image transmission fail-closed pending approved health-document consent and secure processing contract; add file validation, audit, retention/deletion, and user-visible limitations. |
| **P1** | Ordering, product-details, reminder, and doctor-sharing handoffs discard the extracted item identity | All routes navigate generically; they do not pass approved medicine ID, verified prescription reference, dose, or clinician context. Product detail has no ID and “order all” does not create a cart. | Remove inactive promises or implement server-owned, prescription-linked and authorization-checked handoffs; require pharmacy verification prior to cart/order. |
| **P1** | OCR failure/success and clinical copy are Arabic-only and not safely differentiated | A missing/empty extraction is indistinguishable from success; raw Arabic defaults and actions lack six-language medical review. | Provide reviewed all-language copy, accessible error/retry/manual-entry paths, and a high-visibility non-medical-advice disclaimer. |

## Decision

Prescription translation/OCR is **P0 FIX/BLOCKED**. It must not render medical instructions, ordering, substitutions, or sharing claims until the response contract, clinical verification, prescription-image consent/privacy, and linked pharmacy/consultation workflows are implemented.
