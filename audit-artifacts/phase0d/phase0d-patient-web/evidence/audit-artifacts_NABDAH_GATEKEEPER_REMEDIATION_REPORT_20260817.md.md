# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_GATEKEEPER_REMEDIATION_REPORT_20260817.md`
- **Member SHA-256:** `57a906c9a8ba607e84485541422a38be2b93d62dc69a5ab815ab7d3a539bb79d`
- **Line count:** 184
- **Read range:** `1-184`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `23: | BOLA cancel | اختبارات رفض لهويتين غير مرتبطتين | يحتاج staging |`
- `32: كان `OrdersService.cancel` يجلب الطلب بالمعرف ثم يمرر التنفيذ إلى سياسة الإلغاء والتدفق المالي دون التحقق من أن actor يملك الطلب أو الصيدلية المعيّنة له. أضيف تحقق مبكر قبل أي refund أو release أو stock restoration أو transition. يسمح العقد`
- `83: | `src/modules/radiology/radiology.controller.ts` | radiology provider route roles |`
- `108: لا تزال إعادة تشغيل مصفوفة E2E على staging مفتوحة. يجب تنفيذ حسابين على الأقل في مسار إلغاء الطلب: patient owner ينجح وفق السياسة، وidentity غير مرتبطة تفشل بـ403 دون أي refund أو transition. كما يجب اختبار provider token بصيغة `role=provid`
- `125: [1]: NABDAH_LIVE_RECONCILIATION_REGISTER_20260815.md "سجل المصالحة الحاكم"`
- `139: تم تسجيل الدخول بنجاح على staging بحساب المريض وحسابات المختبر والأشعة والتمريض والمنشأة؛ ردود provider login كانت `201`، وتبيّن أن عقدها يعيد `access_token` وحقول `provider_type` و`role` على المستوى الأعلى. نجح `GET /orders/mine` للمريض بح`
- `143: | provider login: lab/radiology/nursing/hospital | `201` | الحسابات وكلمة المرور وعقد login متاحة |`
- `147: | `/home-care/provider/bookings` بحساب nursing | `404` | المسار غير موجود في العقد؛ المسار المصدر الفعلي هو `/nursing/visits?provider_id=...`، لذلك لا تُصنف 404 كفشل صلاحية |`
- `150: > **حكم E2E المرحلي:** لم تُغلق الجولة. أثبتت الجولة أن staging متاحة وأن provider login يعمل، لكنها أثبتت أيضاً أن المختبر ومسار hospital staff ما زالا غير قابلين للقبول على النشر الحالي. لم يُنفذ BOLA mutation destructive على order في هذه`
- `159: في هذه الدفعة ظهرت وعولجت عيوب مصدرية إضافية. أزيلت مفاتيح `fake_key` و`fake_secret` من `LiveKitWebhookGuard` وأصبح غياب إعدادات LiveKit رفضاً آمناً. صار Device Trust يرفض العمل دون Redis، ويتحقق من مالك challenge، ولا يعيد إشارات placehold`
- `166: | Jest قبل الدفعة | 26 suites / 215 tests، مع فشل حدود refund واحد |`
- `182: | admin | ناجح بعد تنظيف `.next` وتشغيل `NODE_ENV=production` | Next production build، 34 صفحة static وdynamic routes |`
### backend_consumers_or_contracts
- `36: | `nabdah-backend/src/modules/orders/orders.service.ts` | مقارنة actor id مع patient/pharmacy وإطلاق `ForbiddenException` عند عدم التطابق | يمنع إلغاء طلب مريض من طبيب أو صيدلية أخرى |`
- `37: | `nabdah-backend/src/modules/orders/orders.service.spec.ts` | حالات رفض لطبيب وصيدلية غير معيّنة | يثبت BOLA بين هويتين غير مالكتين |`
- `45: | الحارس المركزي | `src/common/auth.guard.ts` | `role=provider, provider_type=lab` يطابق `UserRole.LAB`؛ النوع غير المطابق يُرفض |`
- `46: | الاختبارات | `src/common/auth.guard.spec.ts` | قبول lab ورفض radiology عند provider_type=lab |`
- `47: | المختبر | `src/modules/labs/labs.service.ts` | تطبيع داخلي لكل مسارات inbox/samples/report/transition |`
- `48: | الرعاية المنزلية والتمريض | `src/modules/home-care/home-care.service.ts` | تطبيع check-in/report/care-plan/supplies واشتقاق doctor/nurse من النوع الفعلي |`
- `50: | الأشعة | `src/modules/radiology/radiology.controller.ts` | إضافة `Roles(radiology, hospital, admin)` للعمليات التشغيلية |`
- `76: | `src/modules/orders/orders.service.ts` | P0 authorization |`
- `77: | `src/modules/orders/orders.service.spec.ts` | BOLA regression tests |`
- `78: | `src/common/auth.guard.ts` | provider role normalization |`
- `79: | `src/common/auth.guard.spec.ts` | role contract tests |`
- `80: | `src/modules/labs/labs.service.ts` | provider_type internal gates |`
### auth_ownership
- `32: كان `OrdersService.cancel` يجلب الطلب بالمعرف ثم يمرر التنفيذ إلى سياسة الإلغاء والتدفق المالي دون التحقق من أن actor يملك الطلب أو الصيدلية المعيّنة له. أضيف تحقق مبكر قبل أي refund أو release أو stock restoration أو transition. يسمح العقد`
- `39: ### 2.2 P1 — توحيد provider role/provider_type`
- `41: كانت بعض الرموز تصدر `role=provider` مع `provider_type` محدد، بينما الحارس وبعض الخدمات تقبل القيم المتخصصة فقط. أصبح JwtAuthGuard يبني أدواراً فعالة من `role` و`provider_type` من دون تغيير payload الأصلي أو منح صلاحيات عامة. كما أزيلت المق`
- `45: | الحارس المركزي | `src/common/auth.guard.ts` | `role=provider, provider_type=lab` يطابق `UserRole.LAB`؛ النوع غير المطابق يُرفض |`
- `50: | الأشعة | `src/modules/radiology/radiology.controller.ts` | إضافة `Roles(radiology, hospital, admin)` للعمليات التشغيلية |`
- `76: | `src/modules/orders/orders.service.ts` | P0 authorization |`
- `78: | `src/common/auth.guard.ts` | provider role normalization |`
- `79: | `src/common/auth.guard.spec.ts` | role contract tests |`
- `82: | `src/modules/hospital-staff/hospital-staff.module.ts` | hospital owner role contract |`
- `83: | `src/modules/radiology/radiology.controller.ts` | radiology provider route roles |`
- `104: كما أُجري فحص ثابت للتأكد من عدم بقاء التحويلات المستهدفة `new Types.ObjectId(hospitalId)` أو `new Types.ObjectId(doctorId)` أو بوابة Labs القديمة القائمة على `user.role` فقط. بقيت سلاسل localhost في المصدر، لكنها ظهرت داخل شروط non-product`
- `108: لا تزال إعادة تشغيل مصفوفة E2E على staging مفتوحة. يجب تنفيذ حسابين على الأقل في مسار إلغاء الطلب: patient owner ينجح وفق السياسة، وidentity غير مرتبطة تفشل بـ403 دون أي refund أو transition. كما يجب اختبار provider token بصيغة `role=provid`
### state_transitions
- `23: | BOLA cancel | اختبارات رفض لهويتين غير مرتبطتين | يحتاج staging |`
- `32: كان `OrdersService.cancel` يجلب الطلب بالمعرف ثم يمرر التنفيذ إلى سياسة الإلغاء والتدفق المالي دون التحقق من أن actor يملك الطلب أو الصيدلية المعيّنة له. أضيف تحقق مبكر قبل أي refund أو release أو stock restoration أو transition. يسمح العقد`
- `108: لا تزال إعادة تشغيل مصفوفة E2E على staging مفتوحة. يجب تنفيذ حسابين على الأقل في مسار إلغاء الطلب: patient owner ينجح وفق السياسة، وidentity غير مرتبطة تفشل بـ403 دون أي refund أو transition. كما يجب اختبار provider token بصيغة `role=provid`
- `110: تبقى كذلك موانع تشغيلية لا يحلها تعديل TypeScript وحده: تدوير اعتماد R2 المكشوف تاريخياً، إعادة بناء صورة FastAPI التي قد تحمل seed القديم، واعتماد العقود النهائية لـconsent وQR وlocation وerror-codes. هذه البنود موثقة كموانع منفصلة ولا يجو`
- `117: | consent/QR/location/error codes | اعتماد API contract وDTO والـownership والاختبارات | قبول backend + consumer + staging |`
- `121: الحكم الحالي هو **SOURCE REMEDIATED / BUILD AND LOCAL TESTS PASS / STAGING REVALIDATION REQUIRED**. لا يثبت هذا التقرير أن المنصة جاهزة للإنتاج أو المتاجر؛ يثبت أن عيوب Gatekeeper المحددة عولجت في المصدر وأن backend يترجم ويجتاز الاختبارات `
- `134: في 17 أغسطس 2026 استجاب العنوان `http://57.131.133.208:8003/api/v1` بنتيجة `status=ok`، والتطبيق المعلن `Nabd Healthcare OS (NestJS)` والإصدار `1.0.0`. هذا يثبت توفر نقطة البداية الصحية فقط، ولا يثبت نجاح تسجيل الدخول أو BOLA أو provider-ro`
- `148: | `GET /hospital/staff` بحساب hospital | `500 Internal server error` | يطابق عيب UUID/ObjectId الذي كشفه Gatekeeper في النشر الحالي؛ يحتاج نشر الإصلاح وجمع stack trace بعده |`
- `166: | Jest قبل الدفعة | 26 suites / 215 tests، مع فشل حدود refund واحد |`
- `170: > هذه الدفعة لا تغلق consent/QR/location/error-code contracts، ولا تعوض E2E الحي أو مراجعة تطبيقات Expo وNext على الأجهزة. ستبقى هذه البنود مفتوحة حتى تنفيذ الأدلة المحددة في خطة E2E.`
### payment_insurance_relevance
- `32: كان `OrdersService.cancel` يجلب الطلب بالمعرف ثم يمرر التنفيذ إلى سياسة الإلغاء والتدفق المالي دون التحقق من أن actor يملك الطلب أو الصيدلية المعيّنة له. أضيف تحقق مبكر قبل أي refund أو release أو stock restoration أو transition. يسمح العقد`
- `41: كانت بعض الرموز تصدر `role=provider` مع `provider_type` محدد، بينما الحارس وبعض الخدمات تقبل القيم المتخصصة فقط. أصبح JwtAuthGuard يبني أدواراً فعالة من `role` و`provider_type` من دون تغيير payload الأصلي أو منح صلاحيات عامة. كما أزيلت المق`
- `99: Test Suites: 26 passed, 26 total`
- `100: Tests:       215 passed, 215 total`
- `101: Snapshots:   0 total`
- `108: لا تزال إعادة تشغيل مصفوفة E2E على staging مفتوحة. يجب تنفيذ حسابين على الأقل في مسار إلغاء الطلب: patient owner ينجح وفق السياسة، وidentity غير مرتبطة تفشل بـ403 دون أي refund أو transition. كما يجب اختبار provider token بصيغة `role=provid`
- `166: | Jest قبل الدفعة | 26 suites / 215 tests، مع فشل حدود refund واحد |`
### error_empty_loading_retry_cancel
- `23: | BOLA cancel | اختبارات رفض لهويتين غير مرتبطتين | يحتاج staging |`
- `32: كان `OrdersService.cancel` يجلب الطلب بالمعرف ثم يمرر التنفيذ إلى سياسة الإلغاء والتدفق المالي دون التحقق من أن actor يملك الطلب أو الصيدلية المعيّنة له. أضيف تحقق مبكر قبل أي refund أو release أو stock restoration أو transition. يسمح العقد`
- `110: تبقى كذلك موانع تشغيلية لا يحلها تعديل TypeScript وحده: تدوير اعتماد R2 المكشوف تاريخياً، إعادة بناء صورة FastAPI التي قد تحمل seed القديم، واعتماد العقود النهائية لـconsent وQR وlocation وerror-codes. هذه البنود موثقة كموانع منفصلة ولا يجو`
- `117: | consent/QR/location/error codes | اعتماد API contract وDTO والـownership والاختبارات | قبول backend + consumer + staging |`
- `121: الحكم الحالي هو **SOURCE REMEDIATED / BUILD AND LOCAL TESTS PASS / STAGING REVALIDATION REQUIRED**. لا يثبت هذا التقرير أن المنصة جاهزة للإنتاج أو المتاجر؛ يثبت أن عيوب Gatekeeper المحددة عولجت في المصدر وأن backend يترجم ويجتاز الاختبارات `
- `148: | `GET /hospital/staff` بحساب hospital | `500 Internal server error` | يطابق عيب UUID/ObjectId الذي كشفه Gatekeeper في النشر الحالي؛ يحتاج نشر الإصلاح وجمع stack trace بعده |`
- `170: > هذه الدفعة لا تغلق consent/QR/location/error-code contracts، ولا تعوض E2E الحي أو مراجعة تطبيقات Expo وNext على الأجهزة. ستبقى هذه البنود مفتوحة حتى تنفيذ الأدلة المحددة في خطة E2E.`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
