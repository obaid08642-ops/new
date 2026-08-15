# سجل المصالحة مع المصدر الحي — منصة نبض الصحية

**المرحلة:** Phase 0 — تأسيس ومطابقة قبل أي تعديل برمجي
**الوثيقة الحاكمة:** `MANUS_EXECUTION_DIRECTIVE`، إصدار 15 أغسطس 2026
**مصدر الحقيقة:** `m7-quality` عند الرأس `fcb8d063a96eb72a2f970c8a2723bb726bf69b4d`
**فرع العمل الحصري:** `manus/on-live-reconciliation`
**فرع Manus التاريخي المحظور دمجه:** `fix/e2e-operational-contracts-20260814`

> هذه الوثيقة تحل محل أحكام التقارير السابقة عند التعارض. لا يعني ظهور كلمة `mock` أو `demo` أو `simulated` أن الميزة وهمية؛ لا يصدر حكم إلا بعد تتبع المصدر الحي والعقد الخلفي والمخطط ومستهلك الواجهة.

## 1. سلامة المصدر ونطاق العمل

مصدر `m7-quality` محفوظ في الجذر على هيئة حزم كاملة متتبعة: `nabdah-backend.zip` و`nabd_plus_patient_app.zip` و`NabdProvider-provider.zip` و`Napd-admin-dashboard.zip`. اجتازت الحزم الأربع فحص تكامل الأرشيف ومساراته قبل استخراجها إلى مساحة بناء محلية معزولة؛ لم يُشغل أي كود أثناء الفحص ولم تُعدّل الحزم في Phase 0.

| الحزمة | الأصل الداخلي المكتشف | الغرض |
|---|---|---|
| `nabdah-backend.zip` | `nabdah-backend/` | NestJS وFastAPI والـschemas والخدمات والاختبارات |
| `nabd_plus_patient_app.zip` | `nabd_plus/` | تطبيق المريض Expo |
| `NabdProvider-provider.zip` | `NabdProvider/` | تطبيق مزود الخدمة Expo |
| `Napd-admin-dashboard.zip` | `web-admin/` | لوحة الإدارة Next.js |

## 2. وسم التقارير التاريخية قبل التعديل

| التصنيف | البنود أو الأحكام التاريخية المتأثرة | الحكم في المصدر الحي | القرار |
|---|---|---|---|
| `STALE / OBSOLETE` | حجب broadcast وallocations ومحفظة المزوّد والسلة والتأمين والتوصيل والمرتجعات والمخزون | العقود والخدمات ومستهلكات التطبيق موجودة في المصدر الحي | ممنوع الحذف أو الحجب؛ تدقق فجوات التنفيذ فقط |
| `STALE / OBSOLETE` | وصف provider/features بأنه محاكاة بسبب اسم `simulated-features` | التطبيق يستهلك promotions وCRM وstaff وreferrals ومسارات الحجز والتقارير | يحتفظ بالمسارات؛ إعادة تسمية اختيارية لاحقاً بعد نقل المستهلكات |
| `STALE / OBSOLETE` | وصف دعوات المنشآت بأنها `setTimeout` وهمي | توجد دعوات backend وشاشات provider تستهلك inbox/respond | لا نقل من الفرع التاريخي لهذه المنطقة |
| `STALE / OBSOLETE` | اعتبار المحفظة والمحادثات والـKYC والتخزين ودليل الأدوية غير متاحة | ظهرت مسارات ومستهلكات حية في المصدر | يحظر التعطيل قبل فحص lifecycle الكامل |
| `EVIDENCE ONLY` | جرد 526 مرشح توطين و893 مرشحاً ثابتاً من الفرع التاريخي | الجرد يصلح كنقطة بدء لكنه ليس حكماً على `m7-quality` | يعاد تشغيله ومعايرته في Phase 5 |
| `SECURITY ISSUE` | OTP نص صريح في Redis، seed FastAPI، seed production، seed الإداري، samples بلا scope | مواضع محددة في الوثيقة الحاكمة، قيد الفحص في Phase 1 | لا تعديل في Phase 0؛ تنفذ SEC-01..05 بعد إثبات المصدر الحالي |
| `CONFIGURATION / DEPLOYMENT ISSUE` | فوالب localhost وdummy-project-id | مواضع محددة في backend والمرضى والمزوّد والإدارة | تنفذ في Phase 2 بعد فحص المستهلكات وسياق التطوير |
| `PARTIAL` | checkout وQR الهوية وrouteLine وDummyFetusRoute وفوالب المختبر وخريطة الطوارئ | تحتاج مطابقة حيّة شاشة/عقد قبل التعديل | تنفذ في Phase 3 فقط عند تأكيد الدليل |
| `NEEDS BACKEND FIRST` | GPS، قرار التأمين اليدوي، ledger، OCR، QR موقّع | لا تبنى واجهة إضافية قبل عقد method/auth/role/ownership/DTO/errors/transitions/audit | تؤجل إلى Phase 6 بعد اعتماد العقود |

## 3. وظائف حية محمية من الحذف أو الحجب

| المجال | دليل المطابقة الأولي | حالة Phase 0 |
|---|---|---|
| بث الصيدلية والعروض والـallocation | `pharmacy-broadcast.service.ts` و`pharmacy-allocation.service.ts` في الحزمة الخلفية | `ALREADY IMPLEMENTED IN LIVE` — فحص تفصيلي في Phase 4 فقط |
| محفظة المزوّد | مستهلكات `GET /provider/wallet` و`GET /provider/wallet/transactions` في الطبيب والتمريض والصيدلية | `ALREADY IMPLEMENTED IN LIVE` — لا fallback مالي جديد |
| دعوات المنشآت والعلاقات | `FacilityInvitationScreen` و`FacilityInvitationsScreen` مع `/hospital/invitations` و`/inbox` و`/:id/respond` | `ALREADY IMPLEMENTED IN LIVE` |
| provider/features | مستهلكات حية في `BlueprintScreens.tsx` و`FacilityDashboard.tsx` و`DoctorDashboard.tsx` | `ALREADY IMPLEMENTED IN LIVE` — الاسم لا يبرر التعطيل |
| المحادثات وKYC والتخزين والأدوية وprocurement | مذكورة كمسارات حية في الوثيقة الحاكمة؛ يلزم فحص end-to-end حسب المرحلة | `DO NOT TOUCH` حتى مطابقة الكود والعقد والمستهلك |

## 4. بوابة Phase 0

| البند | الحالة | الدليل أو الملاحظة |
|---|---|---|
| جلب رأس `m7-quality` | مكتمل | `fcb8d063a96eb72a2f970c8a2723bb726bf69b4d` |
| إنشاء فرع المصالحة من الرأس الحي | مكتمل محلياً | `manus/on-live-reconciliation` |
| العمل بعيداً عن فرع Manus التاريخي | مكتمل | مساحة عمل منفصلة، بلا merge أو cherry-pick |
| مطابقة أولية للميزات الحية المحمية | مكتمل | خدمات/مسارات/مستهلكات مستخرجة من المصدر الحي |
| كتابة الوسوم الحاكمة قبل كود | مكتمل | هذا السجل |
| اختبار سلامة حزم المصدر | مكتمل | 4/4 أرشيفات اجتازت اختبار التكامل؛ رفض مسارات traversal قبل الاستخراج |
| بناء baseline للمكونات القابلة للبناء | مكتمل بعد معالجة حاجز واحد | backend build، patient/provider Expo iOS export، وweb-admin Next build كلها ناجحة |
| اختبارات baseline المتاحة | مكتمل بعد معالجة فشلين | backend 200/200، patient 23/23، provider 3/3 |
| إعادة فحص سلامة الحزم بعد التحديث | مكتمل | الحزم الثلاث المعدلة اجتازت `unzip -tqq` |
| commit ورفع `phase-0-baseline` | مفتوح في Phase 0 | ينفذ بعد فحص الفروق وتأكيد محتوى الحزم المحدثة |

## 5. إصلاحات Phase 0 اللازمة لإغلاق بوابة البناء والاختبار

| النطاق | الملفات | المشكلة المثبتة | المعالجة | أثر العقد/المخطط |
|---|---|---|---|---|
| لوحة الإدارة Next.js | `_app.tsx` و`AdminGuard.tsx` و`order-detail.tsx` | `next build` فشل في prerender لمساري `/admin/ai-control` و`/admin/order-detail` بسبب `NextRouter was not mounted` | أزيل اعتماد render على `useRouter` من الغلاف والحارس؛ يمر pathname من `_app`، والتنقل وقراءة query يجريان داخل المتصفح فقط | لا API أو schema change؛ يبقى فحص admin token والدور والتنقل للـlogin |
| تطبيق المريض | `SecureStorageAdapter.ts` واختباره | `WordArray` كان يبنى من مصفوفة بايتات لا `Uint8Array`؛ فشل round-trip AES في الاختبار | استخدام `Uint8Array` المدعوم في CryptoJS واكتمال mock Promise لـAsyncStorage | لا API أو schema change؛ تخزين Redux يبقى مشفراً |
| تطبيق المزوّد | `jest.setup.js` و`ClinicalWorkflows.test.tsx` | اختبار عقد إحالة المختبر كان ينفذ Animated native أو يستخدم مسار helper قديم في React Native 0.81 | mock Expo-compatible لمسار `NativeAnimatedHelper` الفعلي؛ الاختبار يقيس POST والعرض الصريح فقط | لا API أو schema change؛ عقد الإحالة لم يتغير |

## 6. نتائج التحقق التفصيلية

| البوابة | النتيجة |
|---|---|
| `backend: npm run build` | ناجح |
| `backend: npm test -- --runInBand` | 24 suite / 200 test ناجحة |
| `patient: expo export --platform ios` | ناجح |
| `patient: npm test -- --runInBand` | 7 suites / 23 tests ناجحة |
| `provider: expo export --platform ios` | ناجح |
| `provider: npm test -- --runInBand` | 1 suite / 3 tests ناجحة |
| `web-admin: NODE_ENV=production npm run build` | ناجح؛ 34 صفحة static تولدت، بما فيها الصفحتان اللتان كانتا تفشلان |
| تثبيت الاعتمادات التكراري بـ`npm ci` | محجوب: تعارض peer NestJS في backend وعدم تطابق `package-lock.json` مع manifests في تطبيقات Expo؛ استُخدم `npm install --legacy-peer-deps --package-lock=false` في مساحة بناء خارج Git للتحقق فقط |

> **قيد مفتوح موثق:** عدم تطابق lockfiles مع `package.json` ليس قد عولج في Phase 0 حتى لا يدخل تحديث اعتماديات واسع بلا تحليل توافق وأمن. يسجل كعمل configuration/dependency مستقل قبل إصدار نهائي، ولا يمنع إثبات البناء الحالي في مساحة الاختبار.

## 7. Phase 1 المخول بعد إغلاق البوابة

المرحلة التالية الوحيدة المخولة هي `SEC-01..05`: تجزئة OTP المستخدم/المدير مع الحفاظ على عقد `requires_2fa` و`verify-otp` ودون مساس OTP المزوّد؛ إزالة seed FastAPI الثابت؛ حصر seed الإنتاجي بالاختبار؛ حاجز بيئي لمسارات seed الإدارية؛ وربط `listSamples()` بملكية المختبر مع اختبار BOLA بهويتين. أي نقل من فرع Manus التاريخي يقتصر على diff OTP بعد مطابقة السياق الحي واختبارات الرجوع.

## 8. قواعد حظر دائمة أثناء التنفيذ

لا وصول إنتاج، ولا أسرار أو OTP أو حسابات اختبار في Git أو التقرير. لا mock جديد. لا feature تعطّل قبل سلسلة الإثبات: المصدر الحي ثم backend ثم route/controller/service ثم schema/model ثم تخزين ثم مستهلك الواجهة. كل مرحلة تغلق فقط بعد `INSPECT → IMPLEMENT → BUILD → TEST → FIX → RETEST → VERIFY → COMMIT` وتقرير تغييرات وواجهات وschemas ونتائج اختبار كاملة وملاحظات rollback.
