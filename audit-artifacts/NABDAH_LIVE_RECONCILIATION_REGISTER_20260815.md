# سجل المصالحة مع المصدر الحي — منصة نبض الصحية

**المرحلة:** Phase 1 — تقوية الأمن الحرج بعد تأسيس المصدر الحي
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
| commit ورفع `phase-0-baseline` | مكتمل | حُفظت إصلاحات baseline على فرع المصالحة المستقل قبل بدء Phase 1 |

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

## 9. Phase 1 — SEC-01 إلى SEC-05 والاعتماد الثابت المكتشف

| البند | الملفات الحية المعالجة | المشكلة المثبتة | المعالجة المنفذة | أثر العقد/المخطط |
|---|---|---|---|---|
| `SEC-01` | `src/modules/auth/auth.service.ts` و`auth.service.spec.ts` | كان OTP المستخدم/المدير يحفظ نصاً في Redis تحت مفتاح عام نسبياً من دون حد تحقق داخلي واضح | مفتاح مجزأ `auth:otp:login-2fa:<normalized>`، bcrypt hash فقط، TTL خمس دقائق، rate limits مستقلة للإصدار والتحقق، وحذف الكود ومفتاح حد التحقق عند النجاح | حافظ على `requires_2fa` و`verify-otp` و`verify2fa`؛ لا تعديل لOTP المزوّد |
| `SEC-02` | `infra/fastapi/server.py` و`seed_dev.py` | startup كان يستدعي seed تلقائياً وينشئ سجلات تركيبية وحساب مدير ثابت؛ كشف الفحص أيضاً بيانات اعتماد object storage مضمّنة في المصدر | نقل seed إلى module تطويري، لا ينفذ إلا عند `NODE_ENV=test` و`ALLOW_TEST_SEED=true`، حذف حساب المدير الثابت، وتحويل إعداد التخزين وJWT إلى متغيرات بيئية تفشل بأمان عند غيابها | لا تغيير لمسارات FastAPI؛ لا secret أو حساب ثابت يبقى في المصدر. يلزم تدوير بيانات الاعتماد المكشوفة سابقاً خارج Git |
| `SEC-03` | `modules/seed/seed.service.ts` و`src/scripts/seed_test.ts` و`seed_test_providers.ts` | كان demo data يمكن تفعيله بعلم منفرد، وكانت سكربتات seed تستعمل عنوان Mongo محلياً افتراضياً | demo identities محصورة بشرطي test + allow، وأزيل URL الافتراضي وأضيف حاجز قبل اتصال Mongo لسكربتات الاختبار | تبقى reference/master data المشروعة فقط في الإقلاع العادي؛ لا تغيير schema |
| `SEC-04` | `pharmacy.controllers.ts` و`pharmacy-seed.service.ts` و`pharmacy.controllers.spec.ts` | endpoints الإدارية للـseed/sample-order كانت متاحة لكل admin في أي بيئة | حارس 503 في controller وحارس دفاعي ثانٍ في service خارج اختبار مفعّل صراحة | لا أثر على broadcast أو allocation أو مسارات الصيدلية الحية؛ test جديد يثبت عدم إنشاء records في production |
| `SEC-05` | `labs.service.ts` و`labs.service.spec.ts` | `listSamples` يعيد كل العينات لمزود lab/hospital، كما كان تسجيل/تعديل العينة لا يتحقق من provider booking ownership | admin فقط يرى الجميع؛ المزوّد يستخرج bookings المملوكة ثم samples التابعة لها؛ تسجيل وتعديل العينة يرفضان ownership المخالف | لا schema change؛ أضيف اختبار BOLA بهويتين يثبت منع القراءة والتعديل عبر مختبر آخر |

### بوابات Phase 1

| البوابة | النتيجة |
|---|---|
| `backend: npm run build` | ناجح |
| `backend: npm test -- --runInBand` | 25 suite / 207 test ناجحة |
| اختبارات OTP وBOLA وseed guard المستحدثة | ناجحة ضمن المجموعة الكاملة |
| فحص صياغة FastAPI | ناجح للملفات المعدلة |
| مسح seed/credentials/preview hardening | ناجح؛ لا استيراد `seed_data` أو seed تلقائي أو عنوان preview أو اعتماد R2 صريح أو Mongo URL افتراضي في النطاق المفحوص |

> **قيد Phase 1:** لا يثبت هذا تشغيل FastAPI أو التخزين أو Redis أو SMTP/SMS على staging. إنذار الاختبار لغياب قناة OTP لا يكشف code ولا يغير عقد الإنتاج؛ اختبار القناة الحية مؤجل إلى staging. دوران بيانات اعتماد التخزين التي كانت مضمّنة سابقاً واجب تشغيلي خارج المستودع قبل أي نشر.

## 10. بوابة الانتقال إلى Phase 1.5

تم إغلاق تنفيذ SEC-01..05 محلياً ببوابات البناء والاختبار أعلاه، ويبقى تغليف الحزم المتتبعة وفحصها وحفظ التزام `phase-1-security` على `manus/on-live-reconciliation`. المرحلة التالية لا تبدأ قبل ذلك، ثم تقتصر على فحص idempotency للمسارات الحساسة التي تصل الأدلة الحية إليها.

## 11. Phase 1.5 — تقوية الإديمبوتنسي المثبتة

أظهر الجرد أن `IdempotencyInterceptor` موجود مسبقاً ويستخدم في `POST /moyasar/payments` فقط. النسخة السابقة كانت تخزن الاستجابة بمفتاح العميل وحده؛ ولذلك أمكن نظرياً تصادم مستخدمين أو مسارات مختلفة عند تكرار المفتاح، كما لم يكن هناك قفل `NX` يمنع تنفيذ طلبين متوازيين قبل تخزين الاستجابة.

| النطاق | المعالجة | التحقق |
|---|---|---|
| `common/idempotency.interceptor.ts` | نطاق المفتاح صار بالمستخدم والطريقة والمسار والمفتاح؛ تحفظ بصمة SHA-256 للحمولة؛ يعاد نفس الرد للطلب المتطابق، ويرفض استعمال المفتاح مع حمولة مختلفة | اختبار مباشر للرد المخزن، اختلاف الحمولة، وعزل مفتاح مستخدم ثانٍ |
| الدفع المحمي في Moyasar | قفل Redis `NX` لمدة 120 ثانية قبل تنفيذ mutation، وتخزين الرد الناجح 24 ساعة، وحذف القفل عند النجاح أو الخطأ | اختبار مباشر يثبت `409 idempotency_request_in_progress` للطلب المتوازي |
| نطاق المرحلة | لا يزال interceptor مقتصراً على route Moyasar الذي كان يستهلكه فعلاً | لم يضف عقد header جديد إلى مسارات مالية أو صيدلانية أخرى بلا مراجعة endpoint-by-endpoint |

بوابة التحقق بعد Phase 1.5: `backend build` ناجح و`backend npm test -- --runInBand` ناجح بعدد **26 suite / 211 test**. فحص تعميم الإديمبوتنسي على refunds وwallet وbilling وpharmacy mutations مؤجل عمداً إلى مراحل العقود أو المراجعة المسارية؛ لا يُفترض أن وجود interceptor واحد يكفي لإغلاق كل عمليات المال.

## 12. Phase 2 — تقوية التهيئة والشبكة

> **نطاق الدليل:** نُفذت هذه المرحلة داخل مساحة المصدر المستخرجة والمعزولة فقط. لا يوجد اتصال بالإنتاج أو إجراء على بيانات حية. يعتمد التشغيل النهائي على تزويد بيئة staging بالقيم الفعلية والتحقق من صلاحية origin وRedis وMongo وJWT قبل النشر.

| المعرّف | الخطر أو الانحراف المثبت | المعالجة المنفذة | الدليل المحلي |
|---|---|---|---|
| `CFG-01` | كان تشغيل الإنتاج يسمح بتكوين ناقص في نقاط بنية تحتية حساسة | أضيف `config/env.validation.ts` إلى `ConfigModule` ليلزم `MONGO_URL` و`REDIS_URL` و`JWT_SECRET` و`ALLOWED_ORIGINS` في الإنتاج، ويرفض JWT الأقصر من 32 محرفاً وorigin النجمي | `npm run build` للـbackend ناجح |
| `CFG-02` | كان `auth.guard.ts` يقبل سراً تطويرياً ضمنياً عند غياب `JWT_SECRET` | أصبح الحارس يرفض المصادقة عند غياب السر، وأزيلت الأسرار التطويرية من `AuthModule` و`ProviderModule` و`ChatGateway` | مسح المصدر لا يجد secret تطويرياً؛ اختبار `auth.guard` ناجح |
| `CFG-03` | إعداد BullMQ لم يكن يستهلك `REDIS_URL` الموحد | يحلل `app.module.ts` العنوان إلى host/port/password وTLS لمسار `rediss` مع بقاء التحقق الإنتاجي مستقلاً | بناء Nest ناجح؛ لا يثبت اتصال Redis حقيقياً |
| `CFG-04` | احتفظ عميل API الموروث للمريض بمنطق localhost وإحلال host خاص به | أصبح `src/utils/api.ts` يقرأ `apiBaseUrl` و`fastapiBaseUrl` و`cdnUrl` من `ConfigManager` فقط | تصدير iOS واختبارات المريض ناجحة |
| `CFG-05` | كان مسارا push للمزوّد يرسلان `dummy-project-id` عند غياب إعداد Expo | أصبح التسجيل يتوقف بأمان عند غياب `EXPO_PUBLIC_PROJECT_ID`؛ لا يُنشأ token وهمي | تصدير iOS واختبارات المزوّد ناجحة |
| `CFG-06` | 13 ملفاً في الإدارة كانت تملك fallback `localhost:8002` أو تبني base محلياً | أزيل localhost من كل مصدر runtime، وأضيف `adminApiBase()` كمصدر موحد ويُمرر لجميع المواقع المحولة؛ يتوقف العميل بخطأ إعداد واضح إذا غاب متغير API في المتصفح | مسح المصدر ناجح وبناء Next الإنتاجي ناجح |
| `CFG-07` | بوابتا Socket وRealtime استعملتا `origin: '*'`، وكانت Chat تقبل سر JWT تطويرياً و`userId` غير موثق في non-production | أضيفت سياسة WebSocket واحدة: allow-list من `ALLOWED_ORIGINS` في الإنتاج ورفض البدء إن غابت؛ أزيل wildcard وfallback السر وهوية handshake غير الموثقة | بناء Nest ناجح؛ مسح المصدر لا يجد wildcard أو fallback JWT أو userId handshake في Chat |

### بوابات Phase 2

| البوابة | النتيجة |
|---|---|
| `backend: npm run build` | ناجح بعد تحليل `REDIS_URL` وتطبيق سياسة WebSocket |
| `backend: npm test -- --runInBand` | **26 suite / 211 test** ناجحة |
| `patient: expo export --platform ios` | ناجح |
| `patient: npm test -- --runInBand` | **7 suites / 23 tests** ناجحة |
| `provider: expo export --platform ios` | ناجح |
| `provider: npm test -- --runInBand` | **1 suite / 3 tests** ناجحة |
| `web-admin: NODE_ENV=production npm run build` | ناجح؛ الصفحات static/dynamic تُبنى بلا prerender failure |
| مسح منع localhost وwildcard وsecret التطويري | ناجح في النطاق المعدل؛ لا يثبت صحة متغيرات بيئة حقيقية |

### قيود وإجراءات تشغيلية مفتوحة

لا تغيّر هذه المرحلة إعدادات deployment أو قيم secrets. يجب قبل نشر أي نسخة جديدة ضبط `MONGO_URL` و`REDIS_URL` و`JWT_SECRET` و`ALLOWED_ORIGINS` الصحيحة في بيئة staging، ثم إجراء اتصال end-to-end للـREST وWebSocket من كل origin معتمد. تظل **إعادة تدوير بيانات اعتماد التخزين المكشوفة سابقاً** إجراءً تشغيلياً إلزامياً خارج Git. كما تظل مراجعة صلاحيات الغرف في `AppSocketGateway` موضوع Phase 3؛ لم تُحذف أو تُعطّل قناة حية بلا سلسلة إثبات المستهلكين والعقد.

## 13. بوابة الانتقال إلى Phase 3

أغلقت Phase 2 محلياً بعد بوابات البناء والاختبار والمسح أعلاه. الخطوة التالية هي تغليف الحزم الأربع المستخرجة، فحص محتواها من الأسرار وملفات البناء، ثم حفظ التزام مستقل على `manus/on-live-reconciliation`. بعد ذلك يبدأ فحص الواجهات المثبتة وعقودها: checkout، QR الهوية، خرائط routeLine والطوارئ، وفوالب المختبر، دون اعتماد أن مصدر واجهة أو متغير بيئة وحده دليل كافٍ على تشغيل الإنتاج.

## 14. Phase 3 — الواجهات المثبتة وعقود الحجز والهوية

| المعرّف | المشكلة المثبتة | المعالجة المنفذة | أثر العقد أو القيد |
|---|---|---|---|
| `UI-CHK-01` | checkout التحاليل كان يعرض اسم مزوّد وسعراً وفتحات ثابتة، ثم يسمي إنشاء booking «دفعاً» وينتقل إلى نجاح بلا معرف الخادم | يقرأ الإجمالي من السلة، يلزم items وprovider account، ويرسل booking فقط ثم يمرر `id` و`tracking_id` و`total` من الاستجابة؛ غُيّرت الرسالة إلى «إرسال طلب الحجز» وأزيلت بطاقة نجاح/عنوان/مرجع ثابتة | لا يوجد عقد دفع متصل بهذا المسار؛ التوفر النهائي والسعر يؤكدهما الخادم والمزوّد |
| `UI-LAB-02` | `compatible-providers` كان يولد rating ومسافة وسرعة وpriceMultiplier من ترتيب السجل، ويرسل `Facility.id` حيث يتطلب الحجز `provider_account_id` | الاستعلام صار عن `ProviderProfile` نشط له `account_id` حقيقي وفئات مختبر متوافقة؛ يعيد الاسم وخيار الزيارة المنزلية والتقييم المرصود فقط؛ السلة والمقارنة تثبتان provider account ولا تضربان السعر بمضاعف | عدم وجود provider مطابق يعيد قائمة فارغة صادقة؛ لا seed أو مزود وهمي |
| `UI-LAB-03` | شاشة `book-sample` القديمة تحتوي مختبر ورسوم وموعد ثابتة وتتجه إلى `/payments/processing` بلا عقد حجز | تحولت إلى نقطة انتقال للسلة الحية، تعرض عناصر السلة فقط وتوضح أن اختيار المزوّد والتوفر والسعر يتم من الخادم | لم تُحذف رحلة مستخدم؛ أزيل مسار الدفع الوهمي وحُوّل إلى المسار القابل للتتبع |
| `UI-LAB-04` | تفاصيل الحجز تستهلك `status/type/date` القديمة، وتحدث حالة الإلغاء محلياً، ويتتبع الفني برقم افتراضي | تُطبع `state` و`location_type` و`scheduled_at` الفعلية؛ إلغاء الخادم يعيد حالة الاستجابة؛ لا يظهر اتصال من دون `technician_phone` | تبقى مواءمة تفاصيل الأشعة رهناً بعقد radiology المنفصل، من دون استخدام بيانات placeholder |
| `SEC-QR-01` | جواز الصحة يضمّن الاسم والدم والحساسية والأمراض مباشرة في QR ويزعم التشفير | أضيف `GET /medical-profile/passport-token` المحمي، يوقع JWT غامضاً قصير العمر خمس دقائق بلا بيانات صحية؛ QR يحمل format/version/token فقط | يلزم في Phase 6 اعتماد consumer/validator للـtoken وscope/consent/audit قبل توفير مشاركة للطرف الثالث |
| `UI-EMS-01` | تسميات `mapPlaceholder` و`routeLine` توحي بمسار مرسوم لا يوفره العقد | حُذفت أنماط routeLine غير المستهلكة؛ تتبع الطوارئ يعرض حالة GPS والبعد ووقت التحديث من الخادم فقط، ويقر صراحة أن رسم route يحتاج عقد موقع مصرحاً به | لا يُنشأ مسار أو خريطة مزعومان من إحداثيات لا يجيز عقد المريض كشفها |
| `EVID-03` | مرشحا `DummyFetusRoute` و`routeLine` التاريخيان قد يخلطان بين المصدر الحي والقديم | لا وجود لمعرّف `DummyFetusRoute` في المصدر الحي؛ أما صور نمو الجنين فهي محتوى مرجعي أسبوعي محلي لا تدّعي بيانات شخصية أو مساراً حياً | لا تعديل للمرجع التعليمي دون عقد طبي/موافقة محتوى مستقلة |

### بوابات Phase 3

| البوابة | النتيجة |
|---|---|
| `backend: npm run build` | ناجح |
| `backend: npm test -- --runInBand` | **26 suite / 211 test** ناجحة، بما فيها fixture Labs بعد إضافة نموذج ProviderProfile |
| `patient: expo export --platform ios` | ناجح |
| `patient: npm test -- --runInBand` | **7 suites / 23 tests** ناجحة |
| المسح المستهدف | لا `priceMultiplier` أو مختبر/مرجع/رقم فني/routeLine أو دفع placeholder في نطاق diagnostics وlabs والطوارئ المفحوص |

> **قيد Phase 3:** لا تثبت هذه النتائج وجود ProviderProfile نشط فعلياً أو جدول فتحة أو تنفيذ card payment أو scanner/validator للـQR في staging. بدلاً من اختراع هذه البيانات، يعرض العميل قائمة فارغة أو طلباً معلقاً أو حالة عدم إتاحة صادقة. يلزم Phase 6 عقد توفّر وحجز ودفع وQR مشترك، ثم E2E staging بحسابات اختبار.

## 15. بوابة الانتقال إلى Phase 4

اكتمل فحص المواضع المثبتة في Phase 3 وعلاج ما أمكن إثباته من المصدر الحي، مع حفظ القيود التي تحتاج عقداً أو staging. تتجه المرحلة التالية إلى مسار الصيدلية التجاري ثم التوطين والعقود المتبقية، وفق تسلسل مصدر حي → controller/service → schema → مستهلك واجهة → بوابة اختبار مستقلة.

## 16. Phase 4 — مسار الصيدلية التجاري والوصفة

| المعرّف | المشكلة المثبتة | المعالجة المنفذة | أثر العقد أو القيد |
|---|---|---|---|
| `PHARM-01` | checkout كان يرسل إحداثيات الرياض افتراضياً ولا يمرر طريقة الاستلام، بينما يفرض dispatch إحداثيات حقيقية | منع الإرسال من دون lat/lng حقيقيين؛ يمرر العميل `delivery_mode`؛ يحفظ الخادم `PICKUP` أو `DELIVERY` ويحسب رسوم الاستلام صفراً في الخادم | يظل العميل يعرض تقديراً متوافقاً مع القاعدة الحالية؛ السعر النهائي المرجعي هو order من الخادم |
| `PHARM-02` | tracking يعرض صيدلية وETA وإجمالياً وطريقة توصيل دون أن يعيدها `/orders/:id/tracking`، ولم يتحقق endpoint من الملكية | صار tracking يتحقق من patient/pharmacy/admin، ويعيد `updated_at` و`delivery_mode` و`total` واسم الصيدلية إن وجد وبيانات delivery الحية؛ الواجهة تفرق بين pickup وdelivery ولا تعرض ETA بلا قيمة خادم | يحتاج اختبار BOLA وdelivery GPS في staging بحسابين مختلفين قبل الإطلاق |
| `PHARM-03` | `/cart/prescription` الحي المسجل كان يعيد طبيباً وتاريخاً وثلاثة أدوية وأسعاراً ثابتة | أزيل controller الموروث غير المسجل؛ أضيف endpoint مسجل في CartModule يقرأ أحدث Prescription نشطة للمريض ويعيد العناصر المحفوظة فقط | لا يعرض endpoint سعراً؛ الأسعار والتوفر يتحققان لاحقاً في طلب الصيدلية |
| `PHARM-04` | `rx-order` كان يحسب ضريبة ورسوم محلية، يزعم رفع وثائق ويؤخر النتيجة ثم يفتح `RX001` | تحولت الشاشة إلى مراجعة وصفة حية ونقل عناصر ذات medicine id إلى CartContext ثم checkout؛ لا تنشئ أمراً أو دفعاً أو معرفاً محلياً | العناصر غير المطابقة تحتاج مراجعة صيدلي/كتالوج، ولا تدخل الأمر آلياً باسم أو سعر مولد |
| `PHARM-05` | OCR الوصفة يحتفظ URI محلياً، يصنع `ocr-*` عشوائياً، ويضيف نتائج AI مباشرة إلى السلة مع timeout | يحفظ الصورة وعناصر OCR عبر `/prescriptions/upload`، ويستخدم prescription id وعناصر backend ذات medicine_id فقط؛ غير المطابق يبقى للوصفة للمراجعة | يلزم فحص حجم/نوع الصورة وسياسة موافقة OCR في staging؛ لا يعد استخراج AI وصفة مصروفة |
| `PHARM-06` | عروض البث تستخدم مؤقت 120 ثانية وخصماً/مسافة/ETA/توفيراً مصطنعاً ثم تنتقل إلى `ORD001` | الشاشة تسحب bids الحية وتعرض total_price والعناصر المتاحة فقط؛ قبول bid ينتقل إلى tracking بـrequestId الحقيقي | تفاصيل موقع وETA للصيدلية غير معروضة بلا عقد داعم |
| `PHARM-07` | إعادة الطلب كانت تجمع خيارات عنوان واستلام ودفع محلية لا ترسلها، ثم تفتح `/payments/processing` بلا intent/order | يحتفظ backend بطريقة الاستلام والدفع المحفوظتين للطلب السابق؛ الواجهة تستلم order id الناتج وتنتقل إلى waiting-for-pharmacy | تعديل عنوان/دفع إعادة الطلب يحتاج UX وعقد تعديل صريحين، ولا يُدّعى أنهما مطبقان |
| `PHARM-08` | سجل الطلبات ولّد مفتاح صنف عشوائياً عند نقص medicine id | صار المفتاح المفقود مشتقاً حتمياً من order id وفهرس الصنف ولا يمثل medicine id حقيقياً | الاسم/السعر في السجل يبقيان بيانات order التاريخية من الخادم |

### بوابات Phase 4

| البوابة | النتيجة |
|---|---|
| `backend: npm run build` | ناجح |
| `backend: npm test -- --runInBand` | **26 suite / 211 test** ناجحة |
| `patient: expo export --platform ios` | ناجح |
| `patient: npm test -- --runInBand` | **7 suites / 23 tests** ناجحة |
| مسح الصيدلية المستهدف | لا `ORD001` أو `RX001` أو وصفة/طبيب/دواء ثابت أو URI محلي أو `Math.random` أو إحداثيات fallback أو `priceMultiplier` في نطاق Cart والصيدلية المفحوص |

> **قيد Phase 4:** لا تثبت البوابات المحلية نجاح dispatch، قبول bid، wallet/card/insurance، أو delivery في بيئة متصلة. كما لا تُستنتج صلاحية OCR الطبية من نجاح النداء التقني. يلزم staging مع أدوية ومخزون وصيدلي ومندوب وحسابي مريض معزولين، ثم سيناريو create → dispatch → accept → payment → delivery → tracking ورفض الوصول عبر الحساب الآخر.

## 17. بوابة الانتقال إلى Phase 5

أغلقت Phase 4 إصلاحات المصدر المثبتة لمسار الصيدلية، مع إبقاء ما يتطلب موافقة عقد أو تجربة staging صريحاً. تنتقل المعالجة التالية إلى توطين تطبيق المريض للغات الست، ثم تصميم العقود الناقصة وخطة E2E والإطلاق المحكوم.
