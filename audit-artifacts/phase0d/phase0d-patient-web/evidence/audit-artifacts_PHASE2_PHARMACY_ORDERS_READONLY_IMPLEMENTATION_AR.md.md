# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/PHASE2_PHARMACY_ORDERS_READONLY_IMPLEMENTATION_AR.md`
- **Member SHA-256:** `629bbd53ea58a0534c8adc1bf374370f788713ca721dd273ef63481bebeabf0e`
- **Line count:** 25
- **Read range:** `1-25`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: تمت مطابقة Web مع عقود patient-scoped الموجودة في OpenAPI بدل الاعتماد على compat route القديم فقط. أصبحت قائمة Orders تستدعي `GET /patient/pharmacy/orders`، وأصبح detail يستدعي `GET /patient/pharmacy/orders/{id}`. أضيفت المسارات إلى BFF al`
- `9: ثبتت OpenAPI وجود `GET /orders/{id}/tracking`، فأضيف إلى allowlist كـGET فقط، وبُني له route SSR read-only مرتبط من Order detail. الـparser يعرض status فقط من tracking payload مع حماية token/private payload. لم تُفتح أي POST/PATCH/DELETE في`
- `13: Mobile Order History يستخدم `/orders/mine` ويعرض filters وstatus وdate/items/total، ويفتح order tracking. Mobile tracking يستخدم `GET /orders/{id}/tracking` ويعرض timeline وpharmacy/ETA/delivery mode/total، مع polling كل 30 ثانية. Web أصبح `
- `17: Cart add/update/delete، order create/update/submit/cancel، approve/reject basket، checkout/payment، prescription upload/OCR، addresses mutations، wishlist mutations، reorder، pharmacy chat، review، وdelivery actions ما زالت محجوبة. وجود أسم`
### backend_consumers_or_contracts
- `1: # Phase 2 — Pharmacy/Orders read-only Contract Pack`
- `5: تمت مطابقة Web مع عقود patient-scoped الموجودة في OpenAPI بدل الاعتماد على compat route القديم فقط. أصبحت قائمة Orders تستدعي `GET /patient/pharmacy/orders`، وأصبح detail يستدعي `GET /patient/pharmacy/orders/{id}`. أضيفت المسارات إلى BFF al`
- `9: ثبتت OpenAPI وجود `GET /orders/{id}/tracking`، فأضيف إلى allowlist كـGET فقط، وبُني له route SSR read-only مرتبط من Order detail. الـparser يعرض status فقط من tracking payload مع حماية token/private payload. لم تُفتح أي POST/PATCH/DELETE في`
- `13: Mobile Order History يستخدم `/orders/mine` ويعرض filters وstatus وdate/items/total، ويفتح order tracking. Mobile tracking يستخدم `GET /orders/{id}/tracking` ويعرض timeline وpharmacy/ETA/delivery mode/total، مع polling كل 30 ثانية. Web أصبح `
### auth_ownership
- `9: ثبتت OpenAPI وجود `GET /orders/{id}/tracking`، فأضيف إلى allowlist كـGET فقط، وبُني له route SSR read-only مرتبط من Order detail. الـparser يعرض status فقط من tracking payload مع حماية token/private payload. لم تُفتح أي POST/PATCH/DELETE في`
- `17: Cart add/update/delete، order create/update/submit/cancel، approve/reject basket، checkout/payment، prescription upload/OCR، addresses mutations، wishlist mutations، reorder، pharmacy chat، review، وdelivery actions ما زالت محجوبة. وجود أسم`
- `25: لا تنتقل المجموعة إلى mutations أو إلى المرحلة التالية حتى يتم استخراج DTOs الفعلية، تثبيت owner/stranger results باستخدام Sandbox accounts، وإغلاق tracking read-only بواجهة SSR/UX واختبارات polling أو refresh آمنة. أي feature بلا contract `
### state_transitions
- `7: تم توسيع `extractOrderRows` بحدود ثابتة إلى `id`, `status/effective_status`, `reference`, `createdAt`, `itemCount`, `total`, و`currency`. لا يقوم parser بإخراج `patient_account_id` أو `delivery_address` أو `patient_notes` أو `prescription_a`
- `9: ثبتت OpenAPI وجود `GET /orders/{id}/tracking`، فأضيف إلى allowlist كـGET فقط، وبُني له route SSR read-only مرتبط من Order detail. الـparser يعرض status فقط من tracking payload مع حماية token/private payload. لم تُفتح أي POST/PATCH/DELETE في`
- `13: Mobile Order History يستخدم `/orders/mine` ويعرض filters وstatus وdate/items/total، ويفتح order tracking. Mobile tracking يستخدم `GET /orders/{id}/tracking` ويعرض timeline وpharmacy/ETA/delivery mode/total، مع polling كل 30 ثانية. Web أصبح `
- `17: Cart add/update/delete، order create/update/submit/cancel، approve/reject basket، checkout/payment، prescription upload/OCR، addresses mutations، wishlist mutations، reorder، pharmacy chat، review، وdelivery actions ما زالت محجوبة. وجود أسم`
### payment_insurance_relevance
- `7: تم توسيع `extractOrderRows` بحدود ثابتة إلى `id`, `status/effective_status`, `reference`, `createdAt`, `itemCount`, `total`, و`currency`. لا يقوم parser بإخراج `patient_account_id` أو `delivery_address` أو `patient_notes` أو `prescription_a`
- `9: ثبتت OpenAPI وجود `GET /orders/{id}/tracking`، فأضيف إلى allowlist كـGET فقط، وبُني له route SSR read-only مرتبط من Order detail. الـparser يعرض status فقط من tracking payload مع حماية token/private payload. لم تُفتح أي POST/PATCH/DELETE في`
- `13: Mobile Order History يستخدم `/orders/mine` ويعرض filters وstatus وdate/items/total، ويفتح order tracking. Mobile tracking يستخدم `GET /orders/{id}/tracking` ويعرض timeline وpharmacy/ETA/delivery mode/total، مع polling كل 30 ثانية. Web أصبح `
- `17: Cart add/update/delete، order create/update/submit/cancel، approve/reject basket، checkout/payment، prescription upload/OCR، addresses mutations، wishlist mutations، reorder، pharmacy chat، review، وdelivery actions ما زالت محجوبة. وجود أسم`
### error_empty_loading_retry_cancel
- `17: Cart add/update/delete، order create/update/submit/cancel، approve/reject basket، checkout/payment، prescription upload/OCR، addresses mutations، wishlist mutations، reorder، pharmacy chat، review، وdelivery actions ما زالت محجوبة. وجود أسم`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
