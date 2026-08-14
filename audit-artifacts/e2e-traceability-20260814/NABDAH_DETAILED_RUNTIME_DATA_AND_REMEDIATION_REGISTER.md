# سجل البيانات الوهمية والعقود والعيوب والمعالجة — منصة نبض

**الحالة:** سجل حي؛ يُحدَّث مع كل اكتشاف أو تعديل لاحق على المصدر.
**تاريخ آخر فهرسة:** 14 أغسطس 2026.
**فرع المصدر:** `fix/e2e-operational-contracts-20260814` عند الالتزام المرجعي `e92222f`.
**النطاق:** `backend/` و`patient-app/` و`provider-app/` و`admin-app/` فقط، مع تمييز مصدر الإنتاج من الأكواد التاريخية والاختبارية.
**قاعدة القراءة:** لا يتضمن السجل أسراراً أو بيانات اعتماد أو معرّفات اختبار أو بيانات مرضى.

> **الإجابة المباشرة:** لا، لم أزل كل البيانات الوهمية ثم ادعِ أنها استُبدلت بالحقيقة. هناك ثلاث حالات مختلفة موثقة هنا: **استبدلت بعقد وبيانات حقيقية**، أو **أزيلت وعُرضت حالة عدم إتاحة صريحة** لأن العقد غير موجود أو غير مصرح، أو **ما زالت مفتوحة** وتحتاج API contract أو backend أو staging. لا تعد واجهة الحالة الفارغة بديلاً عن وظيفة حقيقية.

## 1. طريقة الفهرسة وحدودها

أُنشئ فهرس آلي تشغيلي قابل للتكرار يطابق المحاكاة والـ placeholder والـ seed والعناوين المحلية والمعرفات الثابتة في الشجرات الأربع، مع استبعاد الاختبارات والاعتماديات ونتائج البناء. أظهر **893 مرشحاً تشغيلياً**: 117 في الخلفية، و181 في تطبيق المريض، و357 في تطبيق المزوّد، و238 في الإدارة. لا يعني كل تطابق عيباً؛ فحقل إدخال يحمل `placeholder` إرشادي لا يعد بيانات طبية وهمية. لذلك يجب استخدام الفهرس الكامل مع التصنيف اليدوي في هذا السجل.

| ملف الدليل | المضمون | الاستخدام الصحيح |
|---|---|---|
| [`NABDAH_RUNTIME_STATIC_CANDIDATE_INDEX.md`](./NABDAH_RUNTIME_STATIC_CANDIDATE_INDEX.md) | كل مرشح بمكوّنه وملفه وسطره ومقتطفه | قائمة شاملة قابلة للبحث والمراجعة، لا حكم نهائي منفرد |
| هذا السجل | التصنيف اليدوي للأثر وقرار الإصلاح أو العقد المطلوب | القرار التنفيذي ومصدر الحقيقة التشغيلي |
| [`NABDAH_FINAL_REMEDIATION_REPORT.md`](./NABDAH_FINAL_REMEDIATION_REPORT.md) | حكم الجاهزية والبوابات | قرار الإطلاق لا جرد السطور |
| [`POST_REMEDIATION_E2E_EXECUTION_PLAN.md`](./POST_REMEDIATION_E2E_EXECUTION_PLAN.md) | حالات التحقق المنشور | لا ينفذ على الإنتاج الحالي |

## 2. ملخص الحالات

| الحالة | المعنى | كيف تعاملنا معها |
|---|---|---|
| **استبدال حقيقي** | واجهة أو خدمة أصبحت تقرأ أو تكتب عبر عقد خلفي مخزن ومصرح | يلزم E2E على staging لإثبات الدور والملكية والأثر |
| **إزالة آمنة** | حذفنا نجاحاً أو بيانات وهمية ولم نخترع عقداً | تظهر حالة فارغة أو عدم إتاحة صريحة |
| **مفتوح — يحتاج عقداً** | تجربة مستخدم موجودة لكن لا يوجد API أو نموذج تخزين أو RBAC كافٍ | يجب توفير contract أو بناء backend قبل تفعيلها |
| **مفتوح — يحتاج hardening** | يوجد مسار أو تخزين فعلي لكن التفويض أو الملكية أو النشر أو الاختبار غير مكتمل | يعالج محلياً ثم يثبت على staging |
| **اختباري أو تاريخي** | seed أو test أو ملف مصدر غير منشور | يحظر تشغيله في الإنتاج أو يحذف بعد تحقق عدم استخدامه |

## 3. ما استُبدل بعقود وبيانات حقيقية

| المعرف | التطبيق أو الخدمة | الشاشة/الملف | ما كان موجوداً | الاستبدال المنفذ | حالة الإثبات |
|---|---|---|---|---|---|
| RPL-001 | الخلفية/المزوّد | JWT ومصادقة المزوّد | غياب `provider_account_id` و`provider_profile_id` من claims | إضافة claims واستهلاك هوية المزوّد خادمياً | بناء NestJS؛ E2E staging مطلوب |
| RPL-002 | الخلفية | OTP ومصادقة الإدارة | دورة رمز حساسة غير منضبطة | Redis مع hash وTTL وحدود محاولة | بناء NestJS؛ 2FA staging مطلوب |
| RPL-003 | الخلفية | متحكمات متعددة | بادئة `api/v1` مكررة | توحيد المسارات الفعلية | بناء NestJS؛ تثبيت OpenAPI مطلوب |
| RPL-004 | الخلفية/المريض | باركود الصيدلية | محاكاة مسح دواء | كاميرا Expo ثم `GET /patient/pharmacy/medicines/barcode/:barcode` | تصدير iOS؛ E2E المريض مطلوب |
| RPL-005 | الخلفية/المريض | الطوارئ | بيانات إسعاف وموقع افتراضيان | `GET /emergency/my-active` مملوك للمريض | بناء الخلفية؛ E2E ملكية مطلوب |
| RPL-006 | الخلفية/المزوّد | وارد الصيدلية | event bus غير مخزن | `GET /provider/pharmacy/orders/incoming` وخدمة طلبات مخزنة للقبول والرفض والتحضير | بناء الخلفية واختبار مزوّد؛ E2E صيدلية مطلوب |
| RPL-007 | المريض | استعادة الجلسة وتسجيل الدخول | مسح جلسة ورمز JWT وهمي | استعادة رمز الجلسة الحقيقي و`identifier` والتحقق من الدور | تصدير iOS؛ E2E دخول مطلوب |
| RPL-008 | المريض | طلب وتتبّع الصيدلية | طلب/صيدلية/حالة تتبع ثابتة | عميل API موحد وحالة فشل صريحة | تصدير iOS؛ E2E طلب مطلوب |
| RPL-009 | المريض | تأكيد حجز الاستشارة | `localhost` مباشر | `apiFetch` وتحقق تأمين موحد | تصدير iOS؛ E2E حجز مطلوب |
| RPL-010 | المزوّد | `PharmacyDashboard.tsx`، تفاصيل الطلب وtimeline | `#123` و`RET-421` وسلة أدوية وأحداث وأوقات ومندوب ثابتون | تمرير بيانات الطلب الفعلية؛ قراءة `timeline`/`state_history`؛ معرف الطلب من الاستجابة | Jest 3/3 وTypeScript؛ E2E صيدلية مطلوب |
| RPL-011 | المزوّد | لوحة المختبر | تقرير ونتيجة تحليل ثابتان | قراءة النتائج المخزنة فقط ومنع النشر عند غيابها | Jest 3/3؛ E2E مختبر مطلوب |
| RPL-012 | الإدارة | بناء CRA/CRACO | React Refresh في بناء إنتاجي محتمل | `BABEL_ENV=production` في نص البناء | CRA production build ناجح |

## 4. ما أزيل فقط ولم يستبدل بعد

هذه العناصر **ليست وظائف حقيقية الآن**. أزيلت حتى لا يرى المستخدم نجاحاً أو بيانات مزيفة، لكنها تحتاج عقداً حقيقياً قبل إعادة التفعيل.

| المعرف | التطبيق | الشاشة/الملف | البيانات أو السلوك الذي أزيل | الحالة الحالية | ما يلزم لإعادته كوظيفة حقيقية |
|---|---|---|---|---|---|
| RMV-001 | المزوّد | `PharmacyDashboard.tsx` — المحفظة | أرصدة ومعاملات وأرقام مالية ثابتة | حالة “المحفظة غير متاحة” | عقد محفظة مزود: رصيد، ledger، سحب، تسوية، RBAC، مزود دفع |
| RMV-002 | المزوّد | `PharmacyDashboard.tsx` — تفاصيل الصيدلية | بدائل دواء وأسعار وسلة محلية | عرض عناصر الطلب الفعلية أو فارغ | عقد تعديل عناصر السلة والبدائل والمراجعة الذرية |
| RMV-003 | المزوّد | `PharmacyDashboard.tsx` — التأمين | موافقة NPHIES وcopay محليان | لا موافقة محلية؛ حالة تكامل | عقد authorization مزود الصيدلية، سبب الرفض، مبلغ تحمل، سجل قرار |
| RMV-004 | المزوّد | `PharmacyDashboard.tsx` — التوصيل | تعيين مندوب وخريطة وتسليم ومحاكاة POD | عدم إتاحة صريحة | عقد delivery assignment وGPS وproof-of-delivery وstate machine |
| RMV-005 | المزوّد | `PharmacyDashboard.tsx` — المرتجعات | مرتجع ثابت وقرار استرداد مزعوم | أزيل التدفق للمزوّد | API مرتجعات مصرح بدور المزوّد أو إبقاؤه إدارياً فقط مع RBAC |
| RMV-006 | المزوّد | `PharmacyDashboard.tsx` — المخزون والتاريخ والدردشة | منتجات وكميات وأسعار ورسائل وطلبات ثابتة | حالات فارغة صريحة | عقود قائمة مخزون وتاريخ طلبات ومراسلة مرتبطة بطلب وملكية |
| RMV-007 | المريض | `app/nursing/live-tracking.tsx` و`app/emergency/sos-active.tsx` | خريطة وETA وبيانات سيارة/مسعف افتراضية | لا بيانات بديلة عند غياب المورد | عقد تتبع ميداني أو توصيل فعلي مع بث مصادق |
| RMV-008 | المريض | `app/pharmacy/order-confirm.tsx` و`order-tracking.tsx` | تأكيد وتتبع صيدلية وهميان | فشل API ظاهر ولا انتقال مزعوم | إكمال workflow الصيدلية وE2E |
| RMV-009 | المزوّد | `LabDashboard.tsx` — نشر النتائج | ملف تقرير/نتيجة افتراضية | رفض نشر بلا نتيجة مخزنة | عقد نتائج مخبرية موقع ومرفق مخزن وسجل نشر |
| RMV-010 | الإدارة | `frontend/src/components/NursingPortal.js` | قائمة ممرضين وGPS وتوقيع وطوارئ تجريبية | API أو حالة خطأ صريحة في المسارات المعالجة | E2E إدارة وتمريض وصلاحية وتدقيق |

## 5. البيانات الوهمية أو البدائل المتبقية — تطبيق المريض

| المعرف | الشاشة أو الملف | العنصر المحدد | الحكم | القرار والعقد أو الإصلاح المطلوب |
|---|---|---|---|---|
| PAT-001 | `app/pharmacy/payment.tsx:33` | محاكاة نسبة copay ثابتة | مفتوح — مالي | حساب التأمين يجب أن يأتي من quotation/authorization خادمي موقّع؛ لا قيمة مشتقة محلياً |
| PAT-002 | `app/pharmacy/checkout.tsx:7` | fallback محاكٍ عند انقطاع الخلفية | مفتوح — طلبات | إزالة مسار المحاكاة أو حصره في test build؛ API إنشاء/استئناف سلة idempotent |
| PAT-003 | `app/health/refills.tsx:28,56` | أيام متبقية عشوائية وتحديث refill محلي | مفتوح — طبي | `GET/POST /patients/medication-refills` بسجل التزام وملكية ووصفة |
| PAT-004 | `app/health/health-id.tsx:84,87` | QR مرسوم ومحاكى | مفتوح — هوية صحية | توحيد الشاشة مع محتوى جواز صحي موقّع؛ إلغاء الرسم المحلي |
| PAT-005 | `app/emergency/tracking.tsx:76` | خريطة placeholder | مفتوح — طوارئ | مورد طوارئ مملوك وبث موقع مصادق أو حالة انتظار صريحة |
| PAT-006 | `app/nursing/live-doctor-tracking.tsx:51` | خريطة placeholder | مفتوح — تمريض | عقد تتبع زيارة ومندوب يثبت الملكية والموافقة |
| PAT-007 | `app/diagnostics/order/[id].tsx:143-156` | خريطة ومسار منقط لمحاكاة النقل | مفتوح — تشخيص | عقد جمع عينة/سائق وموقع حقيقي أو إخفاء الخريطة |
| PAT-008 | `app/diagnostics/insurance-upload.tsx:85` | محاكاة معالجة AI لخلفية التأمين | مفتوح — تأمين | رفع ملف مخزن، OCR/تحقق مصادق، حالة processing قابلة للاستعلام |
| PAT-009 | `app/insurance/add-policy.tsx:35` | `base64_simulated_data` | مفتوح — ملفات/تأمين | خدمة رفع فعلية، فحص نوع/حجم/AV، مرجع ملف فقط في API |
| PAT-010 | `app/reports/passport.tsx:302,307` | `fakeQRRow` و`fakeQRBlock` | مفتوح — هوية صحية | استخدام QR موقّع من backend أو إخفاء العرض عند فشل العقد |
| PAT-011 | `app/voice/index.tsx:153` | محاكاة التعرف الصوتي | مفتوح — صوت | خدمة Speech-to-Text مصرح بها أو تعطيل الزر |
| PAT-012 | `app/community/live-session.tsx:65` و`app/room/[id].tsx:77` و`src/components/livekit-view.tsx:38` | فيديو/كاميرا placeholder | مفتوح — اتصال حي | LiveKit room token، membership، tracks، سجل انتهاء الجلسة |
| PAT-013 | `app/nutrition/food-scanner.tsx:40` و`calorie-analyzer.tsx:52` | مسح/تحليل غذائي محاكى أو placeholder text | مفتوح — AI | عقد تحليل غذائي، مصدر صورة حقيقي، سياسة سلامة طبية ونسب ثقة |
| PAT-014 | `app/programs/active.tsx:131` | تقدم برنامج محاكى | مفتوح — برامج | API تقدم برنامج مملوك للمريض وtimeline |
| PAT-015 | `app/maternity/fetus-data.ts:175` | `DummyFetusRoute` | مفتوح — طريق ميت | حذف route أو بناء شاشة مرتبطة ببيانات الحمل المملوكة |
| PAT-016 | `src/core/platform/auth/AuthAuditLogger.ts:15,27,38` | `IP_PLACEHOLDER` | مفتوح — تدقيق | التقاط IP/الجهاز في الخادم، لا اعتماد على العميل |
| PAT-017 | `src/core/platform/auth/SessionManager.ts:73` | تدوير token placeholder | مفتوح — هوية | endpoint refresh rotation وrevoke وsecure storage |
| PAT-018 | `src/config/chatSecurity.ts:139` و`src/utils/security.ts:161` و`guided-tour/engines/AnalyticsCollector.ts:24` | إرسال تدقيق/تحليلات محاكى أو مؤجل | مفتوح — تدقيق | API سجل تدقيق مصادق مع privacy policy وretention |
| PAT-019 | `src/context/AppContext.tsx:84` و`src/core/config/ConfigManager.ts:49-52` و`RealtimeClient.ts:30` و`SocketContext.tsx:11` | fallback عناوين localhost في وقت التشغيل | مفتوح — تهيئة | منع fallback في الإنتاج مثل عميل API الرئيسي، وإلزام متغير بيئة صحيح |

## 6. البيانات الوهمية أو البدائل المتبقية — تطبيق مزود الخدمة

| المعرف | الشاشة أو الملف | العنصر المحدد | الحكم | القرار والعقد أو الإصلاح المطلوب |
|---|---|---|---|---|
| PRO-001 | `src/utils/notifications.ts:42` و`src/utils/PushNotifications.ts:30` | `dummy-project-id` | مفتوح — إشعارات | لا يصدر token عند غياب project ID؛ حذف fallback وتسجيل خطأ تهيئة |
| PRO-002 | `src/screens/doctor/DoctorDashboard.tsx:463,1223` | fallback مواعيد demo/offline | مفتوح — طبي | إزالة بيانات الموعد والمريض البديلة؛ عرض خطأ وإعادة جلب فقط |
| PRO-003 | `DoctorDashboard.tsx:2086,2098` | ربط منشأة وصلاحيات mock | مفتوح — RBAC | عقد provider-facility membership وpermissions مصدره الخادم |
| PRO-004 | `DoctorDashboard.tsx:3179` | مخطط إحصائي mock | مفتوح — تحليلات | API metrics تحدد الفترة والمالك ومصدر الحساب |
| PRO-005 | `DoctorDashboard.tsx:4214` | جلب تقارير واردة محاكى | مفتوح — تقارير | قائمة تقارير مخزنة مع assignment وread receipts |
| PRO-006 | `src/screens/lab/LabDashboard.tsx:1091` | fallback طلب `dummy` عند تعيين فني | مفتوح — مختبر | منع الاستدعاء بلا `order.id`؛ DTO تعيين فني وملكية مختبر |
| PRO-007 | `LabDashboard.tsx:1119,1122` | باركود `SMP-2025-XXX` و`['cbc']` افتراضيان | مفتوح — مختبر | لا ملصق QR دون عينة واختبارات مخزنة |
| PRO-008 | `src/screens/shared/SharedScreens.tsx:2259` | قيمة `128` للعينات المسحوبة | مفتوح — تحليلات | استبدالها بـ metrics API أو حالة فارغة |
| PRO-009 | `src/screens/shared/BlueprintScreens.tsx:980` | خريطة GPS محاكية | مفتوح — توصيل/ملاحة | map provider وGPS live مصادق أو تعطيل الشاشة |
| PRO-010 | `src/screens/shared/LiveKitRoomProvider.tsx:27` | “Simplified for demo” | مفتوح — اتصال حي | LiveKit hooks وtracks ومعالجة خطأ ومغادرة غرفة |
| PRO-011 | `src/screens/facility/FacilityInvitationScreen.tsx:51` | محاكاة إنشاء دعوة منشأة | مفتوح — منشأة | API دعوات: create/list/revoke/accept، انتهاء، RBAC وسجل تدقيق |
| PRO-012 | `src/components/ui.tsx:768-786` | مقياس دائرة/خلفية وخانات خريطة mock | مفتوح — UI ميداني | استخدام خريطة حقيقية أو وضع UI تجميلي لا يدعي موقعاً حقيقياً |
| PRO-013 | `PharmacyDashboard.tsx:611,937,953` | نصوص تشير لعناصر تجريبية أزيلت | **معالج بالإزالة** | لا بيانات بديلة؛ يلزم عقود محفظة/مخزون/مراسلة قبل الإحياء |

## 7. البيانات الوهمية أو البدائل المتبقية — الخلفية وFastAPI

| المعرف | الملف أو المسار | العنصر المحدد | الحكم | القرار والعقد أو الإصلاح المطلوب |
|---|---|---|---|---|
| BE-001 | `infra/fastapi/server.py:246-292` | startup seed لأطباء وصيدليات ومنتجات وحساب إداري ثابت | حرج — تشغيل | إزالة seed التلقائي من startup؛ script اختبار منفصل بحاجز `TEST_DATA_ALLOWED`؛ تدوير أي حسابات قائمة |
| BE-002 | `infra/fastapi/seed_data.py:245+` | `SAMPLE_DOCTORS` و`SAMPLE_PHARMACIES` و`SAMPLE_PRODUCTS` | مفتوح — بيانات | نقل لبيانات fixture غير منشورة أو حزمة staging مخصصة فقط |
| BE-003 | `scripts/seed_test_providers.js` و`src/scripts/seed_test_providers.ts` | seed مزودين اختبار وعنوان Mongo محلي | اختباري حساس | حصر التنفيذ في DB اختبارية ورفض الإنتاج؛ إزالة أي كلمة مرور من السجل قبل commit |
| BE-004 | `scripts/seed-medicines.js` | أدوية وصور R2 وهمية وMongo محلي | اختباري/بديل | حذف أو تحويله إلى fixture مع روابط مخزنة صحيحة؛ لا ينفذ في النشر |
| BE-005 | `src/scripts/seed_production.ts` | seed “production” مع fallback Mongo محلي | حرج — نشر | إيقاف التنفيذ التلقائي؛ مراجعة البيانات واشتراط موافقة بيئة قبل التشغيل |
| BE-006 | `src/modules/pharmacy/pharmacy.controllers.ts:131-132` | endpoints `admin/pharmacy/seed` و`seed/sample-order` | مفتوح — إدارة | تعطيل/حذف من production أو حصرها في staging مع guard بيئي وموافقة audit |
| BE-007 | `src/modules/pharmacy/services/pharmacy-orders-provider.service.ts:54-82` | basket/insurance/dispatch ترمي `NotImplementedException` | **صحيح كمنع، لكنه فجوة وظيفية** | بناء عقود مراجعة سلة وتأمين وتوصيل مخزنة قبل تفعيل الواجهة |
| BE-008 | `src/modules/pharmacy/pharmacy.controllers.ts:221-233` | Voice-to-order وPrescription OCR غير منفذين | مفتوح — AI | مزود OCR/AI موثق، رفع ملفات، consent، schema نتائج، مراجعة بشرية |
| BE-009 | `src/modules/provider/simulated-features.controller.ts` | متحكم منشور باسم simulated وعمليات تحقق/تسجيل غير محكمة | مفتوح — provider features | فصل الخدمات إلى وحدات حقيقية؛ تحقق ملكية الحجز، الدور، الانتقال السابق وسجل التدقيق قبل check-in/report/radiology |
| BE-010 | `src/modules/returns/returns.service.ts` | fallback مبلغ وorder id مصطنع عند إنشاء مرتجع | مفتوح — مالي | إلزام order حقيقي ومبلغ مشتق منه وقواعد استرداد وسجل موافقة |
| BE-011 | `src/modules/labs/labs.service.ts:400-402` | `listSamples()` يعيد كل العينات بلا scope مختبر ظاهر | مفتوح — خصوصية | filter بـ provider/lab ownership وBOLA test بهويتين |
| BE-012 | `src/app.module.ts:119,129` | fallback Mongo/Redis localhost | مفتوح — تهيئة | فشل آمن خارج development عند غياب متغيرات البيئة |
| BE-013 | `infra/fastapi/nestjs_proxy.py` و`ai_routes.py` | عناوين localhost ثابتة لخدمات داخلية | يحتاج ضبط نشر | استخدام متغيرات خدمة داخلية وبنية شبكة خاصة، لا عنوان عام |

## 8. البيانات الوهمية أو البدائل المتبقية — الإدارة

| المعرف | الملف أو الصفحة | العنصر المحدد | الحكم | القرار والعقد أو الإصلاح المطلوب |
|---|---|---|---|---|
| ADM-001 | `admin-app/source_files/Part1.jsx:94+` | كائن `MOCK` يشمل الطلبات والبث والطوارئ والمزودين والمرضى والأدوية والموافقات والتراخيص والنقل والتمريض والتحاليل والتدقيق | تاريخي غير منشور | لا يعد واجهة إنتاجية ما لم يستورد في build؛ احذف أو انقل إلى fixture غير منشور بعد تحقق عدم الاستيراد |
| ADM-002 | `source_files/Part3.jsx:365` | حدث `fake_prescription` وبيانات احتيال ثابتة | تاريخي غير منشور | حذف أو تحويله إلى test fixture خارج الشجرة المنشورة |
| ADM-003 | `frontend/src/App_old.js:2584-2597` | زر/طلب seed-demo | مفتوح — إدارة قديمة | إزالة زر seed من الإنتاج أو حصره بـ staging guard وaudit approval |
| ADM-004 | `frontend/src/App_old.js:314,2343` | تعليق استبدال MOCK وfallback demo | مفتوح — إدارة قديمة | فصل أو إيقاف اللوحة القديمة؛ لا تعرض fallback تشغيلي |
| ADM-005 | `web-admin/src/utils/api.ts:26` وصفحات الإدارة | fallback `http://localhost:8002` | مفتوح — تهيئة | إلزام `NEXT_PUBLIC_API_URL` خارج development وفشل آمن عند غيابه |
| ADM-006 | `web-admin/src/pages/admin/dashboard.tsx:63` | polling موصوف كمحاكاة | مراجعة مطلوبة | إما polling حقيقي بعقد metrics أو تسمية دقيقة ومنع مؤشرات ثابتة |
| ADM-007 | `frontend/src/components/NursingPortal.js` | بيانات تمريض تجريبية تاريخية في المسارات المعالجة | **معالج جزئياً** | API أو حالة خطأ صريحة؛ E2E إدارة وتمريض مطلوب |

## 9. قائمة جميع التعديلات المنفذة على المصدر منذ بدء العمل

| المجموعة | الملفات/المكونات الرئيسية | التعديل | هل استبدل بحقيقة؟ |
|---|---|---|---|
| الهوية والتفويض | JWT المزوّد، OTP، auth guards | claims مزود، OTP Redis، ربط دورة إعادة الضبط، تنظيف مسارات | نعم، منطق خادمي؛ E2E مطلوب |
| الخلفية الطبية | الأشعة والطوارئ والتمريض والولاء وامتدادات نبض | JWT/ملكية، إزالة مسارات عامة وبيانات مالية/موقع افتراضية | مختلط: حماية حقيقية وحالات فارغة |
| الصيدلية الخلفية | أوامر المزوّد والباركود | قائمة واردة وقبول/رفض/تحضير مخزنة، بحث باركود مريض | نعم للعمليات المنشورة؛ السلة/التأمين/التوصيل ناقصة |
| تطبيق المريض | الجلسة، الدخول، الصيدلية، الباركود، الطوارئ، التمريض، حجز الاستشارة، API | إزالة JWT والطلب والتتبع والخرائط الوهمية؛ ربط بالعقود المتاحة | مختلط ومفصل في الأقسام أعلاه |
| تطبيق المزوّد | الصيدلية والمختبر | إزالة سلة/IDs/مخزون/دردشة/توصيل/نتائج وهمية؛ منع نجاح محلي | مختلط؛ عقود كثيرة ناقصة |
| الإدارة | CRACO وعميل API والتمريض | بناء إنتاج ثابت وإزالة ادعاء mock في التوثيق وتنظيف تمريض محدد | نعم للبناء؛ إدارة قديمة ما زالت مفتوحة |

## 10. عقود API أو وظائف backend المطلوبة من المالك

لا أحتاج بيانات اعتماد أو بيانات إنتاج. إذا كان لديك OpenAPI أو قائمة endpoints أو DTOs أو أمثلة استجابة **منقحة من الأسرار والبيانات الشخصية**، فأرسلها. الأولوية التالية تمكننا من استبدال حالات عدم الإتاحة بوظائف حقيقية:

| الأولوية | مجال العقد المطلوب | الحد الأدنى المطلوب في العقد |
|---|---|---|
| P0 | صيدلية: سلة/تأمين/توصيل | إنشاء/قراءة/تعديل سلة، alternatives، submit/approve/reject، authorization، driver assignment، POD، state machine، RBAC وملكية |
| P0 | FastAPI وseed | بيان ما إذا كانت الخدمة جزءاً من الإنتاج، وسياسة seed، وعقود المصادقة/الدردشة/الملفات بينها وبين NestJS |
| P0 | هوية وإعدادات عملاء | OpenAPI/ENV contract للمريض والمزوّد والإدارة؛ سلوك إلزام المتغيرات خارج development |
| P1 | مختبر | قائمة عينات scoped، تعيين فني، QR label، نتائج ومرفقات وتدقيق نشر |
| P1 | تمريض وطوارئ وتتبع | مصدر GPS، subscription/broadcast، صلاحية القراءة، retention، وسجل تدقيق |
| P1 | محفظة ومدفوعات ومرتجعات | ledger، idempotency، payment provider sandbox، refund/withdraw approvals، تجميد/rollback |
| P1 | المراسلة وLiveKit | room creation، membership، token scope/TTL، attachments، retention وmoderation |
| P2 | تحليلات وبرامج وصحة شخصية | metrics، progress، refills، nutrition/AI، مصادر الحساب وسياسات السلامة |

## 11. قواعد التحديث المستمر

عند اكتشاف أي عنصر جديد أو إجراء أي تعديل لاحق، يضاف صف جديد إلى هذا السجل بالمعرف والمكوّن والملف والسطر والحالة والعقد أو الاختبار المطلوب. ويعاد توليد `NABDAH_RUNTIME_STATIC_CANDIDATE_INDEX.md` بعد كل موجة مصدرية، ثم يجرى فحص أسرار لأسطر الإضافة قبل دفع الفرع المستقل.

## المراجع الداخلية

| المرجع | الغرض |
|---|---|
| [`NABDAH_RUNTIME_STATIC_CANDIDATE_INDEX.md`](./NABDAH_RUNTIME_STATIC_CANDIDATE_INDEX.md) | القائمة الشاملة المرشحة بمسار وسطر ومقتطف |
| [`NABDAH_FINAL_REMEDIATION_REPORT.md`](./NABDAH_FINAL_REMEDIATION_REPORT.md) | ملخص المعالجة وحكم الجاهزية |
| [`NABDAH_E2E_TRACEABILITY_REPORT.md`](./NABDAH_E2E_TRACEABILITY_REPORT.md) | خريطة الواجهات والعقود وحالة E2E |
| [`POST_REMEDIATION_E2E_EXECUTION_PLAN.md`](./POST_REMEDIATION_E2E_EXECUTION_PLAN.md) | خطة التحقق المنشور اللاحقة |
