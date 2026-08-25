# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/PHASE4_PRESCRIPTION_DETAIL_READONLY_AR.md`
- **Member SHA-256:** `bc9f26d5fc5c88301a9a04c8ad3d21521b69144e3987125e0adf27e05f6e3acf`
- **Line count:** 7
- **Read range:** `1-7`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: تم إسقاط diagnosis وnotes وupload_image وpatient IDs، ولا توجد أزرار upload أو renew أو dispense أو order/payment. البحث عن prescriptionId يتم داخل القائمة التي أعادها نفس patient-owned GET، مع UUID validation و404 عند عدم وجود العنصر.`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- `5: تم إسقاط diagnosis وnotes وupload_image وpatient IDs، ولا توجد أزرار upload أو renew أو dispense أو order/payment. البحث عن prescriptionId يتم داخل القائمة التي أعادها نفس patient-owned GET، مع UUID validation و404 عند عدم وجود العنصر.`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
