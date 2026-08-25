# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/PHASE8_MUTATION_CONTRACT_AUDIT_AR.md`
- **Member SHA-256:** `fd19939514a889624ca8c5815d1ef37b4deb454a71dcfb453118f1c2cce16e41`
- **Line count:** 7
- **Read range:** `1-7`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `3: تمت مراجعة patient-facing mutation routes في Pharmacy، Insurance/Claims، وUnified Bookings مقابل المصدر الحقيقي. توجد بعض فحوص ownership داخل الخدمات، مثل lookup بـ `patient_id: user.id` في unified bookings، لكن لم يتم إثبات contract موحد ل`
- `5: لذلك بقيت العمليات التالية Deferred: إضافة عناصر السلة، إنشاء/إرسال طلب pharmacy، submit claim، إنشاء insurance request، دفع copay، cancel/resubmit/appeal، حجز/إلغاء/إعادة جدولة booking، ورفع ملفات التأمين أو التقارير. عدم وجود زر في Web لي`
### backend_consumers_or_contracts
- `7: ما يلزم لفتح mutation هو DTO/OpenAPI محدد، idempotency key أو backend deduplication مثبت، ownership/authorization tests للمريض والـstranger، status/error mapping، وSandbox حي يثبت replay وtimeout behavior. حتى ذلك الحين لا تُرسل الواجهة POS`
### auth_ownership
- `3: تمت مراجعة patient-facing mutation routes في Pharmacy، Insurance/Claims، وUnified Bookings مقابل المصدر الحقيقي. توجد بعض فحوص ownership داخل الخدمات، مثل lookup بـ `patient_id: user.id` في unified bookings، لكن لم يتم إثبات contract موحد ل`
- `7: ما يلزم لفتح mutation هو DTO/OpenAPI محدد، idempotency key أو backend deduplication مثبت، ownership/authorization tests للمريض والـstranger، status/error mapping، وSandbox حي يثبت replay وtimeout behavior. حتى ذلك الحين لا تُرسل الواجهة POS`
### state_transitions
- `5: لذلك بقيت العمليات التالية Deferred: إضافة عناصر السلة، إنشاء/إرسال طلب pharmacy، submit claim، إنشاء insurance request، دفع copay، cancel/resubmit/appeal، حجز/إلغاء/إعادة جدولة booking، ورفع ملفات التأمين أو التقارير. عدم وجود زر في Web لي`
- `7: ما يلزم لفتح mutation هو DTO/OpenAPI محدد، idempotency key أو backend deduplication مثبت، ownership/authorization tests للمريض والـstranger، status/error mapping، وSandbox حي يثبت replay وtimeout behavior. حتى ذلك الحين لا تُرسل الواجهة POS`
### payment_insurance_relevance
- `3: تمت مراجعة patient-facing mutation routes في Pharmacy، Insurance/Claims، وUnified Bookings مقابل المصدر الحقيقي. توجد بعض فحوص ownership داخل الخدمات، مثل lookup بـ `patient_id: user.id` في unified bookings، لكن لم يتم إثبات contract موحد ل`
- `5: لذلك بقيت العمليات التالية Deferred: إضافة عناصر السلة، إنشاء/إرسال طلب pharmacy، submit claim، إنشاء insurance request، دفع copay، cancel/resubmit/appeal، حجز/إلغاء/إعادة جدولة booking، ورفع ملفات التأمين أو التقارير. عدم وجود زر في Web لي`
### error_empty_loading_retry_cancel
- `5: لذلك بقيت العمليات التالية Deferred: إضافة عناصر السلة، إنشاء/إرسال طلب pharmacy، submit claim، إنشاء insurance request، دفع copay، cancel/resubmit/appeal، حجز/إلغاء/إعادة جدولة booking، ورفع ملفات التأمين أو التقارير. عدم وجود زر في Web لي`
- `7: ما يلزم لفتح mutation هو DTO/OpenAPI محدد، idempotency key أو backend deduplication مثبت، ownership/authorization tests للمريض والـstranger، status/error mapping، وSandbox حي يثبت replay وtimeout behavior. حتى ذلك الحين لا تُرسل الواجهة POS`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
