# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_LIVE_RECONCILIATION_REGISTER_20260815.md`
- **Member SHA-256:** `26a7d6a4f26628a7b92ad19a29dc57a3afb2e0d5d07950f066195f7ad6caf404`
- **Line count:** 341
- **Read range:** `1-341`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `33: | `PARTIAL` | checkout وQR الهوية وrouteLine وDummyFetusRoute وفوالب المختبر وخريطة الطوارئ | تحتاج مطابقة حيّة شاشة/عقد قبل التعديل | تنفذ في Phase 3 فقط عند تأكيد الدليل |`
- `42: | دعوات المنشآت والعلاقات | `FacilityInvitationScreen` و`FacilityInvitationsScreen` مع `/hospital/invitations` و`/inbox` و`/:id/respond` | `ALREADY IMPLEMENTED IN LIVE` |`
- `43: | provider/features | مستهلكات حية في `BlueprintScreens.tsx` و`FacilityDashboard.tsx` و`DoctorDashboard.tsx` | `ALREADY IMPLEMENTED IN LIVE` — الاسم لا يبرر التعطيل |`
- `65: | لوحة الإدارة Next.js | `_app.tsx` و`AdminGuard.tsx` و`order-detail.tsx` | `next build` فشل في prerender لمساري `/admin/ai-control` و`/admin/order-detail` بسبب `NextRouter was not mounted` | أزيل اعتماد render على `useRouter` من الغلاف وال`
- `90: لا وصول إنتاج، ولا أسرار أو OTP أو حسابات اختبار في Git أو التقرير. لا mock جديد. لا feature تعطّل قبل سلسلة الإثبات: المصدر الحي ثم backend ثم route/controller/service ثم schema/model ثم تخزين ثم مستهلك الواجهة. كل مرحلة تغلق فقط بعد `INSP`
- `96: | `SEC-01` | `src/modules/auth/auth.service.ts` و`auth.service.spec.ts` | كان OTP المستخدم/المدير يحفظ نصاً في Redis تحت مفتاح عام نسبياً من دون حد تحقق داخلي واضح | مفتاح مجزأ `auth:otp:login-2fa:<normalized>`، bcrypt hash فقط، TTL خمس دقا`
- `100: | `SEC-05` | `labs.service.ts` و`labs.service.spec.ts` | `listSamples` يعيد كل العينات لمزود lab/hospital، كما كان تسجيل/تعديل العينة لا يتحقق من provider booking ownership | admin فقط يرى الجميع؛ المزوّد يستخرج bookings المملوكة ثم samples`
- `126: | نطاق المرحلة | لا يزال interceptor مقتصراً على route Moyasar الذي كان يستهلكه فعلاً | لم يضف عقد header جديد إلى مسارات مالية أو صيدلانية أخرى بلا مراجعة endpoint-by-endpoint |`
- `128: بوابة التحقق بعد Phase 1.5: `backend build` ناجح و`backend npm test -- --runInBand` ناجح بعدد **26 suite / 211 test**. فحص تعميم الإديمبوتنسي على refunds وwallet وbilling وpharmacy mutations مؤجل عمداً إلى مراحل العقود أو المراجعة المسارية؛`
- `163: أغلقت Phase 2 محلياً بعد بوابات البناء والاختبار والمسح أعلاه. الخطوة التالية هي تغليف الحزم الأربع المستخرجة، فحص محتواها من الأسرار وملفات البناء، ثم حفظ التزام مستقل على `manus/on-live-reconciliation`. بعد ذلك يبدأ فحص الواجهات المثبتة و`
- `169: | `UI-CHK-01` | checkout التحاليل كان يعرض اسم مزوّد وسعراً وفتحات ثابتة، ثم يسمي إنشاء booking «دفعاً» وينتقل إلى نجاح بلا معرف الخادم | يقرأ الإجمالي من السلة، يلزم items وprovider account، ويرسل booking فقط ثم يمرر `id` و`tracking_id` و``
- `171: | `UI-LAB-03` | شاشة `book-sample` القديمة تحتوي مختبر ورسوم وموعد ثابتة وتتجه إلى `/payments/processing` بلا عقد حجز | تحولت إلى نقطة انتقال للسلة الحية، تعرض عناصر السلة فقط وتوضح أن اختيار المزوّد والتوفر والسعر يتم من الخادم | لم تُحذف `
### backend_consumers_or_contracts
- `34: | `NEEDS BACKEND FIRST` | GPS، قرار التأمين اليدوي، ledger، OCR، QR موقّع | لا تبنى واجهة إضافية قبل عقد method/auth/role/ownership/DTO/errors/transitions/audit | تؤجل إلى Phase 6 بعد اعتماد العقود |`
- `41: | محفظة المزوّد | مستهلكات `GET /provider/wallet` و`GET /provider/wallet/transactions` في الطبيب والتمريض والصيدلية | `ALREADY IMPLEMENTED IN LIVE` — لا fallback مالي جديد |`
- `96: | `SEC-01` | `src/modules/auth/auth.service.ts` و`auth.service.spec.ts` | كان OTP المستخدم/المدير يحفظ نصاً في Redis تحت مفتاح عام نسبياً من دون حد تحقق داخلي واضح | مفتاح مجزأ `auth:otp:login-2fa:<normalized>`، bcrypt hash فقط، TTL خمس دقا`
- `97: | `SEC-02` | `infra/fastapi/server.py` و`seed_dev.py` | startup كان يستدعي seed تلقائياً وينشئ سجلات تركيبية وحساب مدير ثابت؛ كشف الفحص أيضاً بيانات اعتماد object storage مضمّنة في المصدر | نقل seed إلى module تطويري، لا ينفذ إلا عند `NODE_`
- `142: | `CFG-07` | بوابتا Socket وRealtime استعملتا `origin: '*'`، وكانت Chat تقبل سر JWT تطويرياً و`userId` غير موثق في non-production | أضيفت سياسة WebSocket واحدة: allow-list من `ALLOWED_ORIGINS` في الإنتاج ورفض البدء إن غابت؛ أزيل wildcard وf`
- `148: | `backend: npm run build` | ناجح بعد تحليل `REDIS_URL` وتطبيق سياسة WebSocket |`
- `159: لا تغيّر هذه المرحلة إعدادات deployment أو قيم secrets. يجب قبل نشر أي نسخة جديدة ضبط `MONGO_URL` و`REDIS_URL` و`JWT_SECRET` و`ALLOWED_ORIGINS` الصحيحة في بيئة staging، ثم إجراء اتصال end-to-end للـREST وWebSocket من كل origin معتمد. تظل **`
- `198: | `PHARM-02` | tracking يعرض صيدلية وETA وإجمالياً وطريقة توصيل دون أن يعيدها `/orders/:id/tracking`، ولم يتحقق endpoint من الملكية | صار tracking يتحقق من patient/pharmacy/admin، ويعيد `updated_at` و`delivery_mode` و`total` واسم الصيدلية إ`
- `216: > **قيد Phase 4:** لا تثبت البوابات المحلية نجاح dispatch، قبول bid، wallet/card/insurance، أو delivery في بيئة متصلة. كما لا تُستنتج صلاحية OCR الطبية من نجاح النداء التقني. يلزم staging مع أدوية ومخزون وصيدلي ومندوب وحسابي مريض معزولين، ث`
- `277: أُعدت وثيقتا تسليم مستقلتان بلا أسرار أو حسابات اختبار: `NABDAH_FINAL_REMEDIATION_AND_RELEASE_READINESS_20260815.md` كملخص تنفيذي للمبرمج وقرار الإطلاق، و`POST_REMEDIATION_E2E_EXECUTION_PLAN.md` كمصفوفة تنفيذ staging. تغطي الخطة الهوية وOTP`
- `301: | اختبارات API/staging الفعلية | لم تُنفذ؛ تحتاج بيئة منفصلة |`
- `322: | P0-BOLA | `POST /orders/:id/cancel` كان يسمح لهوية غير مالكة بالوصول إلى الإلغاء المالي والانتقال | أضيف فحص يطابق `by.id` مع `patient_id` أو `pharmacy_id` المعيّنة، أو دور admin/super_admin، قبل policy/refund/transition | اختبارات `Order`
### auth_ownership
- `13: مصدر `m7-quality` محفوظ في الجذر على هيئة حزم كاملة متتبعة: `nabdah-backend.zip` و`nabd_plus_patient_app.zip` و`NabdProvider-provider.zip` و`Napd-admin-dashboard.zip`. اجتازت الحزم الأربع فحص تكامل الأرشيف ومساراته قبل استخراجها إلى مساحة ب`
- `20: | `Napd-admin-dashboard.zip` | `web-admin/` | لوحة الإدارة Next.js |`
- `31: | `SECURITY ISSUE` | OTP نص صريح في Redis، seed FastAPI، seed production، seed الإداري، samples بلا scope | مواضع محددة في الوثيقة الحاكمة، قيد الفحص في Phase 1 | لا تعديل في Phase 0؛ تنفذ SEC-01..05 بعد إثبات المصدر الحالي |`
- `34: | `NEEDS BACKEND FIRST` | GPS، قرار التأمين اليدوي، ledger، OCR، QR موقّع | لا تبنى واجهة إضافية قبل عقد method/auth/role/ownership/DTO/errors/transitions/audit | تؤجل إلى Phase 6 بعد اعتماد العقود |`
- `56: | بناء baseline للمكونات القابلة للبناء | مكتمل بعد معالجة حاجز واحد | backend build، patient/provider Expo iOS export، وweb-admin Next build كلها ناجحة |`
- `65: | لوحة الإدارة Next.js | `_app.tsx` و`AdminGuard.tsx` و`order-detail.tsx` | `next build` فشل في prerender لمساري `/admin/ai-control` و`/admin/order-detail` بسبب `NextRouter was not mounted` | أزيل اعتماد render على `useRouter` من الغلاف وال`
- `79: | `web-admin: NODE_ENV=production npm run build` | ناجح؛ 34 صفحة static تولدت، بما فيها الصفحتان اللتان كانتا تفشلان |`
- `86: المرحلة التالية الوحيدة المخولة هي `SEC-01..05`: تجزئة OTP المستخدم/المدير مع الحفاظ على عقد `requires_2fa` و`verify-otp` ودون مساس OTP المزوّد؛ إزالة seed FastAPI الثابت؛ حصر seed الإنتاجي بالاختبار؛ حاجز بيئي لمسارات seed الإدارية؛ وربط ``
- `90: لا وصول إنتاج، ولا أسرار أو OTP أو حسابات اختبار في Git أو التقرير. لا mock جديد. لا feature تعطّل قبل سلسلة الإثبات: المصدر الحي ثم backend ثم route/controller/service ثم schema/model ثم تخزين ثم مستهلك الواجهة. كل مرحلة تغلق فقط بعد `INSP`
- `96: | `SEC-01` | `src/modules/auth/auth.service.ts` و`auth.service.spec.ts` | كان OTP المستخدم/المدير يحفظ نصاً في Redis تحت مفتاح عام نسبياً من دون حد تحقق داخلي واضح | مفتاح مجزأ `auth:otp:login-2fa:<normalized>`، bcrypt hash فقط، TTL خمس دقا`
- `99: | `SEC-04` | `pharmacy.controllers.ts` و`pharmacy-seed.service.ts` و`pharmacy.controllers.spec.ts` | endpoints الإدارية للـseed/sample-order كانت متاحة لكل admin في أي بيئة | حارس 503 في controller وحارس دفاعي ثانٍ في service خارج اختبار مف`
- `100: | `SEC-05` | `labs.service.ts` و`labs.service.spec.ts` | `listSamples` يعيد كل العينات لمزود lab/hospital، كما كان تسجيل/تعديل العينة لا يتحقق من provider booking ownership | admin فقط يرى الجميع؛ المزوّد يستخرج bookings المملوكة ثم samples`
### state_transitions
- `34: | `NEEDS BACKEND FIRST` | GPS، قرار التأمين اليدوي، ledger، OCR، QR موقّع | لا تبنى واجهة إضافية قبل عقد method/auth/role/ownership/DTO/errors/transitions/audit | تؤجل إلى Phase 6 بعد اعتماد العقود |`
- `128: بوابة التحقق بعد Phase 1.5: `backend build` ناجح و`backend npm test -- --runInBand` ناجح بعدد **26 suite / 211 test**. فحص تعميم الإديمبوتنسي على refunds وwallet وbilling وpharmacy mutations مؤجل عمداً إلى مراحل العقود أو المراجعة المسارية؛`
- `172: | `UI-LAB-04` | تفاصيل الحجز تستهلك `status/type/date` القديمة، وتحدث حالة الإلغاء محلياً، ويتتبع الفني برقم افتراضي | تُطبع `state` و`location_type` و`scheduled_at` الفعلية؛ إلغاء الخادم يعيد حالة الاستجابة؛ لا يظهر اتصال من دون `technicia`
- `229: | `I18N-04` | كانت رسائل `Alert.alert` الحرفية خارج تغطية عناصر UI، بما فيها عناوين ورسائل الأخطاء | أضيف `showLocalizedAlert` وحُولت استدعاءات alert في routes إلى بوابة توطن العنوان والرسالة وتسميات الأزرار | رسائل أخطاء backend الخام لا ي`
- `242: > **قيد Phase 5:** نجاح البنية والقاموس لا يكافئ مراجعة مترجم طبي أصلي أو اختبار تنسيق واجهات كل لغة على iOS/Android. لا يُدّعى اكتمال التوطين في محتوى API الديناميكي، أو النصوص داخل SDKs الخارجية، أو رسائل backend؛ يعالج ذلك بعقود error co`
- `256: | `CON-04` | رسائل أخطاء API تختلف بين الخدمات وبعضها قد يصل كنص خام | لم يُنشأ قاموس أخطاء متخيل؛ واجهات العميل تملك حواجز صادقة محلياً فقط | Phase 7 يتطلب قائمة error codes/HTTP outcomes مع owner لكل عقد قبل UAT متعدد اللغات |`
- `269: > **حكم Phase 6:** الحماية المصدرية أُغلقت، لكن عقود consent/QR/location/error-code لا تزال **تصميمات مطلوبة قبل الإطلاق** وليست ميزات مكتملة. لا يبرر build الناجح تمكينها أو تجاوز تجربة staging وE2E.`
- `287: | consent/QR/location/error-code contracts | **عقود مفتوحة قبل تمكين المزايا** |`
- `307: أعيدت مطابقة مراحل Phase 0 إلى Phase 7، والالتزامات، وبوابات البناء والاختبار، وخطة staging/E2E، ثم أُنشئت الوثيقة `EXECUTION_COMPLETION_MATRIX_20260816.md`. الحكم المصحح هو أن المعالجة المصدرية المحلية أغلقت ما أمكن إثباته، لكنها لا تعني ت`
- `322: | P0-BOLA | `POST /orders/:id/cancel` كان يسمح لهوية غير مالكة بالوصول إلى الإلغاء المالي والانتقال | أضيف فحص يطابق `by.id` مع `patient_id` أو `pharmacy_id` المعيّنة، أو دور admin/super_admin، قبل policy/refund/transition | اختبارات `Order`
- `330: **موانع غير مصدرية بقيت مفتوحة:** تدوير اعتماد R2 المكشوف تاريخياً، إعادة بناء صورة FastAPI التي تحمل seed القديم، واعتماد عقود consent/QR/location/error-codes. لا يجوز تقديم حكم production-ready أو store-ready قبل إغلاقها وتوثيق نتائج stag`
- `337: أعيد فتح الخطة الأساسية بعد ملاحظة أن معالجة Gatekeeper السابقة أغلقت عيوباً محددة فقط ولم تغلق كل بنود Phase 0–7 وخطة E2E. تمت إعادة قراءة مصفوفة الإكمال وخطة E2E الرسمية، وثُبت أن consent/QR/location/error-code، lockfiles، مراجعة اللغات و`
### payment_insurance_relevance
- `41: | محفظة المزوّد | مستهلكات `GET /provider/wallet` و`GET /provider/wallet/transactions` في الطبيب والتمريض والصيدلية | `ALREADY IMPLEMENTED IN LIVE` — لا fallback مالي جديد |`
- `120: أظهر الجرد أن `IdempotencyInterceptor` موجود مسبقاً ويستخدم في `POST /moyasar/payments` فقط. النسخة السابقة كانت تخزن الاستجابة بمفتاح العميل وحده؛ ولذلك أمكن نظرياً تصادم مستخدمين أو مسارات مختلفة عند تكرار المفتاح، كما لم يكن هناك قفل `NX`
- `125: | الدفع المحمي في Moyasar | قفل Redis `NX` لمدة 120 ثانية قبل تنفيذ mutation، وتخزين الرد الناجح 24 ساعة، وحذف القفل عند النجاح أو الخطأ | اختبار مباشر يثبت `409 idempotency_request_in_progress` للطلب المتوازي |`
- `126: | نطاق المرحلة | لا يزال interceptor مقتصراً على route Moyasar الذي كان يستهلكه فعلاً | لم يضف عقد header جديد إلى مسارات مالية أو صيدلانية أخرى بلا مراجعة endpoint-by-endpoint |`
- `128: بوابة التحقق بعد Phase 1.5: `backend build` ناجح و`backend npm test -- --runInBand` ناجح بعدد **26 suite / 211 test**. فحص تعميم الإديمبوتنسي على refunds وwallet وbilling وpharmacy mutations مؤجل عمداً إلى مراحل العقود أو المراجعة المسارية؛`
- `142: | `CFG-07` | بوابتا Socket وRealtime استعملتا `origin: '*'`، وكانت Chat تقبل سر JWT تطويرياً و`userId` غير موثق في non-production | أضيفت سياسة WebSocket واحدة: allow-list من `ALLOWED_ORIGINS` في الإنتاج ورفض البدء إن غابت؛ أزيل wildcard وf`
- `155: | مسح منع localhost وwildcard وsecret التطويري | ناجح في النطاق المعدل؛ لا يثبت صحة متغيرات بيئة حقيقية |`
- `169: | `UI-CHK-01` | checkout التحاليل كان يعرض اسم مزوّد وسعراً وفتحات ثابتة، ثم يسمي إنشاء booking «دفعاً» وينتقل إلى نجاح بلا معرف الخادم | يقرأ الإجمالي من السلة، يلزم items وprovider account، ويرسل booking فقط ثم يمرر `id` و`tracking_id` و``
- `170: | `UI-LAB-02` | `compatible-providers` كان يولد rating ومسافة وسرعة وpriceMultiplier من ترتيب السجل، ويرسل `Facility.id` حيث يتطلب الحجز `provider_account_id` | الاستعلام صار عن `ProviderProfile` نشط له `account_id` حقيقي وفئات مختبر متوافق`
- `171: | `UI-LAB-03` | شاشة `book-sample` القديمة تحتوي مختبر ورسوم وموعد ثابتة وتتجه إلى `/payments/processing` بلا عقد حجز | تحولت إلى نقطة انتقال للسلة الحية، تعرض عناصر السلة فقط وتوضح أن اختيار المزوّد والتوفر والسعر يتم من الخادم | لم تُحذف `
- `185: | المسح المستهدف | لا `priceMultiplier` أو مختبر/مرجع/رقم فني/routeLine أو دفع placeholder في نطاق diagnostics وlabs والطوارئ المفحوص |`
- `187: > **قيد Phase 3:** لا تثبت هذه النتائج وجود ProviderProfile نشط فعلياً أو جدول فتحة أو تنفيذ card payment أو scanner/validator للـQR في staging. بدلاً من اختراع هذه البيانات، يعرض العميل قائمة فارغة أو طلباً معلقاً أو حالة عدم إتاحة صادقة. `
### error_empty_loading_retry_cancel
- `28: | `STALE / OBSOLETE` | وصف دعوات المنشآت بأنها `setTimeout` وهمي | توجد دعوات backend وشاشات provider تستهلك inbox/respond | لا نقل من الفرع التاريخي لهذه المنطقة |`
- `34: | `NEEDS BACKEND FIRST` | GPS، قرار التأمين اليدوي، ledger، OCR، QR موقّع | لا تبنى واجهة إضافية قبل عقد method/auth/role/ownership/DTO/errors/transitions/audit | تؤجل إلى Phase 6 بعد اعتماد العقود |`
- `201: | `PHARM-05` | OCR الوصفة يحتفظ URI محلياً، يصنع `ocr-*` عشوائياً، ويضيف نتائج AI مباشرة إلى السلة مع timeout | يحفظ الصورة وعناصر OCR عبر `/prescriptions/upload`، ويستخدم prescription id وعناصر backend ذات medicine_id فقط؛ غير المطابق يبقى`
- `229: | `I18N-04` | كانت رسائل `Alert.alert` الحرفية خارج تغطية عناصر UI، بما فيها عناوين ورسائل الأخطاء | أضيف `showLocalizedAlert` وحُولت استدعاءات alert في routes إلى بوابة توطن العنوان والرسالة وتسميات الأزرار | رسائل أخطاء backend الخام لا ي`
- `242: > **قيد Phase 5:** نجاح البنية والقاموس لا يكافئ مراجعة مترجم طبي أصلي أو اختبار تنسيق واجهات كل لغة على iOS/Android. لا يُدّعى اكتمال التوطين في محتوى API الديناميكي، أو النصوص داخل SDKs الخارجية، أو رسائل backend؛ يعالج ذلك بعقود error co`
- `256: | `CON-04` | رسائل أخطاء API تختلف بين الخدمات وبعضها قد يصل كنص خام | لم يُنشأ قاموس أخطاء متخيل؛ واجهات العميل تملك حواجز صادقة محلياً فقط | Phase 7 يتطلب قائمة error codes/HTTP outcomes مع owner لكل عقد قبل UAT متعدد اللغات |`
- `269: > **حكم Phase 6:** الحماية المصدرية أُغلقت، لكن عقود consent/QR/location/error-code لا تزال **تصميمات مطلوبة قبل الإطلاق** وليست ميزات مكتملة. لا يبرر build الناجح تمكينها أو تجاوز تجربة staging وE2E.`
- `287: | consent/QR/location/error-code contracts | **عقود مفتوحة قبل تمكين المزايا** |`
- `307: أعيدت مطابقة مراحل Phase 0 إلى Phase 7، والالتزامات، وبوابات البناء والاختبار، وخطة staging/E2E، ثم أُنشئت الوثيقة `EXECUTION_COMPLETION_MATRIX_20260816.md`. الحكم المصحح هو أن المعالجة المصدرية المحلية أغلقت ما أمكن إثباته، لكنها لا تعني ت`
- `322: | P0-BOLA | `POST /orders/:id/cancel` كان يسمح لهوية غير مالكة بالوصول إلى الإلغاء المالي والانتقال | أضيف فحص يطابق `by.id` مع `patient_id` أو `pharmacy_id` المعيّنة، أو دور admin/super_admin، قبل policy/refund/transition | اختبارات `Order`
- `330: **موانع غير مصدرية بقيت مفتوحة:** تدوير اعتماد R2 المكشوف تاريخياً، إعادة بناء صورة FastAPI التي تحمل seed القديم، واعتماد عقود consent/QR/location/error-codes. لا يجوز تقديم حكم production-ready أو store-ready قبل إغلاقها وتوثيق نتائج stag`
- `337: أعيد فتح الخطة الأساسية بعد ملاحظة أن معالجة Gatekeeper السابقة أغلقت عيوباً محددة فقط ولم تغلق كل بنود Phase 0–7 وخطة E2E. تمت إعادة قراءة مصفوفة الإكمال وخطة E2E الرسمية، وثُبت أن consent/QR/location/error-code، lockfiles، مراجعة اللغات و`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
