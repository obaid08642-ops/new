# Phase 3 — إغلاق عقود Auth والحجز والدفع

## الحكم المرحلي

**PASS مشروط للعقود المحلية والـBFF؛ Live owner/replay ما زال محجوباً بحسابات Sandbox.**

تمت مراجعة العقود الحية بالـmethod والمسار معاً دون جلسة، ثم فُحصت طبقة BFF والواجهة والاختبارات. لم يتم استخدام بيانات قابلة للإنشاء أو credentials غير معتمدة.

## Live method/path evidence

| Method | Path | Status دون جلسة | النتيجة |
|---|---|---:|---|
| POST | `/auth/otp/request` | 400 | route موجود؛ رفض payload الفارغ |
| POST | `/auth/otp/verify` | 400 | route موجود؛ رفض payload الفارغ |
| POST | `/auth/session/exchange` | 400 | route موجود؛ رفض exchange غير صالح |
| POST | `/unified-bookings` | 401 | route موجود ومحمي |
| POST | `/unified-bookings/consultation/{id}/cancel` | 401 | route موجود ومحمي |
| PATCH | `/unified-bookings/consultation/{id}/reschedule` | 401 | route الصحيح موجود ومحمي |
| POST | `/payments/intent/consultation/{id}` | 401 | route موجود ومحمي |

تم تسجيل الدليل في `phase3-live-method-probe.tsv`. قاعدة 401/403 مقابل 404 أصبحت شرطاً قبل كل mutation جديد.

## التنفيذ المراجع

تم تصحيح Reschedule في BFF والواجهة إلى PATCH، وتثبيت `Idempotency-Key`، والتحقق من UUID وpayload، وhttpOnly access cookie، وعدم تمرير raw upstream response أو tokens إلى المتصفح. booking/cancel/payment/call-token وOTP لها BFF routes واختبارات مخصصة ضمن الشجرة الحالية.

## الاختبارات

| البوابة | النتيجة |
|---|---|
| Auth/OTP + booking + cancel + reschedule + payment + call-token | 6 test files / 21 tests passed |
| TypeScript check | passed |
| Full test السابق بعد إصلاح Reschedule | 130 files / 251 tests passed، 14 files / 23 tests skipped |
| Live owner/stranger/replay | لم يُغلق؛ يتطلب حسابات Sandbox الرسمية |

## الفجوة المتبقية

لا يمكن إعلان رحلة الحجز والدفع Production-ready بالكامل قبل تشغيل owner/stranger/replay على Sandbox، والتحقق من stale slot وduplicate click وpayment failure/reconciliation. الاختبارات الحالية تثبت wiring وsecurity boundaries محلياً، لكنها لا تثبت تحصيل PSP أو إنشاء مورد حقيقي في البيئة الحية.

## قرار الانتقال

**Phase 3 local contract closure: PASS.**  
**Phase 3 live mutation closure: DEFERRED حتى توفير `NABD_SANDBOX_*`.**  
يمكن الانتقال إلى Phase 4 لإغلاق Diagnostics/Home-care/Pharmacy/Orders دون اعتبار Sandbox passراً أو اختلاق نجاح.
