# Nabd Plus — تنفيذ مرحلي قابل للتحقق

المصدر الأساسي: فرع `main` في المستودع الرسمي.

## قواعد العمل
- كل تعديل مستقل في commit منفصل على فرع feature.
- لا دمج تلقائي لفروع قديمة قبل فحص diff والاختبارات.
- لا mock أو fake production flow؛ بيانات الاختبار تبقى معزولة في test fixtures.
- لا إعلان اكتمال إلا بعد typecheck/build/test وE2E مناسبين.
- لا تغيير في الدفع أو التأمين أو PHI إلا مع اختبار صلاحيات وidempotency وaudit.

## ترتيب البنود

1. **Public-first launch — Patient Mobile**
   - الملفات: `patient-app/app/index.tsx`.
   - القبول: المستخدم غير المسجل يدخل للتصفح؛ الجلسات الحالية لا تتأثر؛ Patient Mobile typecheck/tests تمر.
   - الحالة: منفذ في commit `c1547384`.

2. **Canonical pharmacy radius compatibility**
   - الملفات: `backend/src/modules/orders/dispatch.service.ts`، اختبار `backend/src/modules/orders/dispatch.service.spec.ts`.
   - القبول: مسار legacy لا يستخدم 3→7→10→15؛ ladder القياسي 3→5→8؛ typecheck/build واختبار مباشر يمر.
   - الحالة: منفذ في commit `396ceca5`.

3. **Pharmacy quote integrity regression coverage**
   - الملفات: `backend/src/modules/pharmacy/tests/pharmacy-offer.service.spec.ts`.
   - القبول: partial/unavailable items واضحة؛ price override على مستوى العرض؛ audit row؛ 3 اختبارات مركزة وtypecheck تمر.
   - الحالة: منفذ في commit `396ceca5`.

4. **CI coverage for Provider and Admin**
   - الملفات: `.github/workflows/patient-production-ci.yml`.
   - القبول: Provider يخضع لـ`npm ci`, typecheck, tests؛ Admin يخضع لـ`npm ci`, typecheck, build؛ YAML diff نظيف.

5. **Full test-suite stability**
   - النطاق: Backend Jest/open handles/segmentation.
   - القبول: full suite تنتهي بنتيجة موثوقة بدون OOM أو يتم تقسيمها إلى gates مستقلة مع نتائجها.

6. **Patient Mobile journey matrix**
   - النطاق: كل routes في `patient-app/app` ومصادر API في `patient-app/src`.
   - القبول: مصفوفة screen→action→API→state→permission، ثم إصلاح الفجوات الأعلى خطورة.

7. **Patient Web parity**
   - النطاق: `patient-web/app`, `patient-web/client`, `patient-web/lib`.
   - القبول: لكل رحلة Mobile equivalent Web أو سبب platform-specific موثق؛ typecheck/tests/build.

8. **Provider onboarding and provider-specific operations**
   - النطاق: `provider-app/src/screens`, Backend provider/onboarding modules, Admin moderation.
   - القبول: legal/display identity، documents، approval/rejection/resubmission، settings، permissions، operational lifecycle.

9. **Pharmacy broadcast/insurance/cash E2E**
   - النطاق: canonical pharmacy services, offers, payment evidence, insurance decision, notifications.
   - القبول: 3→5→8، cumulative offers، self-pickup 15km، own-delivery radius، privacy projection، cash/insurance states.

10. **Admin, security, performance, design system, production gates**
    - النطاق: Admin RBAC/passkey/audit، uploads، performance، shared UI tokens، staging/device/rollback.
    - القبول: تشغيل مصرح به على staging مع evidence؛ لا GO للإنتاج قبل إغلاق critical gaps.
