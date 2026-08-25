# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/IMPLEMENTATION_WAVE2_PHARMACY_BOUNDARY_AR.md`
- **Member SHA-256:** `b91868bcce9da7ebc88bb2c774f3397432718a9bde237ace8947ad2515616ecd`
- **Line count:** 15
- **Read range:** `1-15`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: تمت مراجعة شاشات Pharmacy في React Native، بما في ذلك البحث، product detail، cart، checkout، payment، prescription upload، order tracking، wishlist، pharmacist chat، barcode scanner، وmanual order. Web يملك `medicine-catalog` و`medicines/[m`
- `9: لم تتم إضافة cart، wishlist، prescription upload، order creation، payment، chat، scanner، أو tracking. هذه أفعال/بيانات خاصة تتطلب عقودًا مثبتة للهوية والملكية والـauthorization وprice integrity وupload security وpayment/CSRF.`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `9: لم تتم إضافة cart، wishlist، prescription upload، order creation، payment، chat، scanner، أو tracking. هذه أفعال/بيانات خاصة تتطلب عقودًا مثبتة للهوية والملكية والـauthorization وprice integrity وupload security وpayment/CSRF.`
### state_transitions
- `11: `availabilityStatus` موجود في parser لكنه غير معروض؛ وهذا مقصود لأن عقد public catalogue لا يضمن التوفر ولا السعر، ورسائل الواجهة تمنع عرض availability guarantee أو purchase information.`
### payment_insurance_relevance
- `5: تمت مراجعة شاشات Pharmacy في React Native، بما في ذلك البحث، product detail، cart، checkout، payment، prescription upload، order tracking، wishlist، pharmacist chat، barcode scanner، وmanual order. Web يملك `medicine-catalog` و`medicines/[m`
- `9: لم تتم إضافة cart، wishlist، prescription upload، order creation، payment، chat، scanner، أو tracking. هذه أفعال/بيانات خاصة تتطلب عقودًا مثبتة للهوية والملكية والـauthorization وprice integrity وupload security وpayment/CSRF.`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
