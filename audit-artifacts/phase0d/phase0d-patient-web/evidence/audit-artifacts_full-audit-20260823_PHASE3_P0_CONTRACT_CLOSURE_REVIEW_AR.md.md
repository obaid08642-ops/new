# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/full-audit-20260823/PHASE3_P0_CONTRACT_CLOSURE_REVIEW_AR.md`
- **Member SHA-256:** `3ee2aa0016c01461a2fb3e721b6d01e72262d5ea1a684d5a0a5c6599afa0fc53`
- **Line count:** 44
- **Read range:** `1-44`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `13: | POST | `/auth/otp/request` | 400 | route موجود؛ رفض payload الفارغ |`
- `14: | POST | `/auth/otp/verify` | 400 | route موجود؛ رفض payload الفارغ |`
- `15: | POST | `/auth/session/exchange` | 400 | route موجود؛ رفض exchange غير صالح |`
- `16: | POST | `/unified-bookings` | 401 | route موجود ومحمي |`
- `17: | POST | `/unified-bookings/consultation/{id}/cancel` | 401 | route موجود ومحمي |`
- `18: | PATCH | `/unified-bookings/consultation/{id}/reschedule` | 401 | route الصحيح موجود ومحمي |`
- `19: | POST | `/payments/intent/consultation/{id}` | 401 | route موجود ومحمي |`
- `25: تم تصحيح Reschedule في BFF والواجهة إلى PATCH، وتثبيت `Idempotency-Key`، والتحقق من UUID وpayload، وhttpOnly access cookie، وعدم تمرير raw upstream response أو tokens إلى المتصفح. booking/cancel/payment/call-token وOTP لها BFF routes واختبا`
- `31: | Auth/OTP + booking + cancel + reschedule + payment + call-token | 6 test files / 21 tests passed |`
- `33: | Full test السابق بعد إصلاح Reschedule | 130 files / 251 tests passed، 14 files / 23 tests skipped |`
### backend_consumers_or_contracts
- `13: | POST | `/auth/otp/request` | 400 | route موجود؛ رفض payload الفارغ |`
- `14: | POST | `/auth/otp/verify` | 400 | route موجود؛ رفض payload الفارغ |`
- `15: | POST | `/auth/session/exchange` | 400 | route موجود؛ رفض exchange غير صالح |`
- `44: يمكن الانتقال إلى Phase 4 لإغلاق Diagnostics/Home-care/Pharmacy/Orders دون اعتبار Sandbox passراً أو اختلاق نجاح.`
### auth_ownership
- `5: **PASS مشروط للعقود المحلية والـBFF؛ Live owner/replay ما زال محجوباً بحسابات Sandbox.**`
- `13: | POST | `/auth/otp/request` | 400 | route موجود؛ رفض payload الفارغ |`
- `14: | POST | `/auth/otp/verify` | 400 | route موجود؛ رفض payload الفارغ |`
- `15: | POST | `/auth/session/exchange` | 400 | route موجود؛ رفض exchange غير صالح |`
- `25: تم تصحيح Reschedule في BFF والواجهة إلى PATCH، وتثبيت `Idempotency-Key`، والتحقق من UUID وpayload، وhttpOnly access cookie، وعدم تمرير raw upstream response أو tokens إلى المتصفح. booking/cancel/payment/call-token وOTP لها BFF routes واختبا`
- `31: | Auth/OTP + booking + cancel + reschedule + payment + call-token | 6 test files / 21 tests passed |`
- `34: | Live owner/stranger/replay | لم يُغلق؛ يتطلب حسابات Sandbox الرسمية |`
- `38: لا يمكن إعلان رحلة الحجز والدفع Production-ready بالكامل قبل تشغيل owner/stranger/replay على Sandbox، والتحقق من stale slot وduplicate click وpayment failure/reconciliation. الاختبارات الحالية تثبت wiring وsecurity boundaries محلياً، لكنها `
### state_transitions
- `11: | Method | Path | Status دون جلسة | النتيجة |`
- `17: | POST | `/unified-bookings/consultation/{id}/cancel` | 401 | route موجود ومحمي |`
- `25: تم تصحيح Reschedule في BFF والواجهة إلى PATCH، وتثبيت `Idempotency-Key`، والتحقق من UUID وpayload، وhttpOnly access cookie، وعدم تمرير raw upstream response أو tokens إلى المتصفح. booking/cancel/payment/call-token وOTP لها BFF routes واختبا`
- `31: | Auth/OTP + booking + cancel + reschedule + payment + call-token | 6 test files / 21 tests passed |`
### payment_insurance_relevance
- `13: | POST | `/auth/otp/request` | 400 | route موجود؛ رفض payload الفارغ |`
- `14: | POST | `/auth/otp/verify` | 400 | route موجود؛ رفض payload الفارغ |`
- `19: | POST | `/payments/intent/consultation/{id}` | 401 | route موجود ومحمي |`
- `25: تم تصحيح Reschedule في BFF والواجهة إلى PATCH، وتثبيت `Idempotency-Key`، والتحقق من UUID وpayload، وhttpOnly access cookie، وعدم تمرير raw upstream response أو tokens إلى المتصفح. booking/cancel/payment/call-token وOTP لها BFF routes واختبا`
- `31: | Auth/OTP + booking + cancel + reschedule + payment + call-token | 6 test files / 21 tests passed |`
- `38: لا يمكن إعلان رحلة الحجز والدفع Production-ready بالكامل قبل تشغيل owner/stranger/replay على Sandbox، والتحقق من stale slot وduplicate click وpayment failure/reconciliation. الاختبارات الحالية تثبت wiring وsecurity boundaries محلياً، لكنها `
### error_empty_loading_retry_cancel
- `17: | POST | `/unified-bookings/consultation/{id}/cancel` | 401 | route موجود ومحمي |`
- `25: تم تصحيح Reschedule في BFF والواجهة إلى PATCH، وتثبيت `Idempotency-Key`، والتحقق من UUID وpayload، وhttpOnly access cookie، وعدم تمرير raw upstream response أو tokens إلى المتصفح. booking/cancel/payment/call-token وOTP لها BFF routes واختبا`
- `31: | Auth/OTP + booking + cancel + reschedule + payment + call-token | 6 test files / 21 tests passed |`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
