# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/IMPLEMENTATION_WAVE2_MEDICINES_PRIVATE_READONLY_AR.md`
- **Member SHA-256:** `2414f94b263f11a81313ded7cca0a27387fa4eac5848245d94c4e74c1753249e`
- **Line count:** 19
- **Read range:** `1-19`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `9: لم يتغير backend contract. الصفحة ما زالت تستدعي `requirePatientAccess` ثم `getPatientMedicines(token, search)` عبر server boundary، ولا تُرسل token إلى HTML أو browser storage. الحقول المعروضة تأتي من `extractMedicineRows` فقط، ولا يتم عرض`
### state_transitions
- `5: تم تحديث `/[locale]/medicines` ليستخدم نفس Premium catalogue surface الموجود في public medicine catalogue: hero واضح، search field، vector icons، responsive card grid، prescription badge، وkeyboard/focus states الموروثة من design module.`
### payment_insurance_relevance
- `5: تم تحديث `/[locale]/medicines` ليستخدم نفس Premium catalogue surface الموجود في public medicine catalogue: hero واضح، search field، vector icons، responsive card grid، prescription badge، وkeyboard/focus states الموروثة من design module.`
- `9: لم يتغير backend contract. الصفحة ما زالت تستدعي `requirePatientAccess` ثم `getPatientMedicines(token, search)` عبر server boundary، ولا تُرسل token إلى HTML أو browser storage. الحقول المعروضة تأتي من `extractMedicineRows` فقط، ولا يتم عرض`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
