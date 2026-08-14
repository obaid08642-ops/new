# سجل البيانات الوهمية والعقود والعيوب والمعالجة — منصة نبض

**الحالة:** سجل حي؛ يُحدَّث مع كل اكتشاف أو تعديل لاحق على المصدر.
**تاريخ آخر فهرسة:** 14 أغسطس 2026.
**فرع المصدر:** `fix/e2e-operational-contracts-20260814`.
**النطاق:** `backend/` و`patient-app/` و`provider-app/` و`admin-app/` فقط، مع تمييز مصدر الإنتاج من الأكواد التاريخية والاختبارية.
**قاعدة القراءة:** لا يتضمن السجل أسراراً أو بيانات اعتماد أو معرّفات اختبار أو بيانات مرضى.

> **الإجابة المباشرة:** لا، لم أزل كل البيانات الوهمية ثم ادعِ أنها استُبدلت بالحقيقة. هناك ثلاث حالات مختلفة موثقة هنا: **استبدلت بعقد وبيانات حقيقية**، أو **أزيلت وعُرضت حالة عدم إتاحة صريحة** لأن العقد غير موجود أو غير مصرح، أو **ما زالت مفتوحة** وتحتاج API contract أو backend أو staging. لا تعد واجهة الحالة الفارغة بديلاً عن وظيفة حقيقية.

## 1. طريقة الفهرسة وحدودها

أُنشئ فهرس آلي تشغيلي قابل للتكرار يطابق المحاكاة والـ placeholder والـ seed والعناوين المحلية والمعرفات الثابتة في الشجرات الأربع، مع استبعاد الاختبارات والاعتماديات ونتائج البناء. أظهر **893 مرشحاً تشغيلياً**: 117 في الخلفية، و181 في تطبيق المريض، و357 في تطبيق المزوّد، و238 في الإدارة. لا يعني كل تطابق عيباً؛ فحقل إدخال يحمل `placeholder` إرشادي لا يعد بيانات طبية وهمية. لذلك يجب استخدام الفهرس الكامل مع التصنيف اليدوي في هذا السجل.

| ملف الدليل | المضمون | الاستخدام الصحيح |
|---|---|---|
| القسم 12 من هذا الملف | كل مرشح بمكوّنه وملفه وسطره ومقتطفه | قائمة شاملة قابلة للبحث والمراجعة، لا حكم نهائي منفرد |
| هذا السجل | التصنيف اليدوي للأثر وقرار الإصلاح أو العقد المطلوب | القرار التنفيذي ومصدر الحقيقة التشغيلي |
| [`NABDAH_FINAL_REMEDIATION_REPORT.md`](./NABDAH_FINAL_REMEDIATION_REPORT.md) | حكم الجاهزية والبوابات | قرار الإطلاق لا جرد السطور |
| [`POST_REMEDIATION_E2E_EXECUTION_PLAN.md`](./POST_REMEDIATION_E2E_EXECUTION_PLAN.md) | حالات التحقق المنشور | لا ينفذ على الإنتاج الحالي |
| [`NABDAH_OPERATIONAL_SCENARIO_ACCEPTANCE_MAP_20260814.md`](./NABDAH_OPERATIONAL_SCENARIO_ACCEPTANCE_MAP_20260814.md) | خريطة سيناريوهات المريض والمزوّد والإدارة والدفع والتأمين | تمييز ما تؤكده الشيفرة من المتطلبات التي تحتاج عقداً أو staging |

## 2. ملخص الحالات

| الحالة | المعنى | كيف تعاملنا معها |
|---|---|---|
| **استبدال حقيقي** | واجهة أو خدمة أصبحت تقرأ أو تكتب عبر عقد خلفي مخزن ومصرح | يلزم E2E على staging لإثبات الدور والملكية والأثر |
| **إزالة آمنة** | حذفنا نجاحاً أو بيانات وهمية ولم نخترع عقداً | تظهر حالة فارغة أو عدم إتاحة صريحة |
| **مفتوح — يحتاج عقداً** | تجربة مستخدم موجودة لكن لا يوجد API أو نموذج تخزين أو RBAC كافٍ | يجب توفير contract أو بناء backend قبل تفعيلها |
| **مفتوح — يحتاج hardening** | يوجد مسار أو تخزين فعلي لكن التفويض أو الملكية أو النشر أو الاختبار غير مكتمل | يعالج محلياً ثم يثبت على staging |
| **اختباري أو تاريخي** | seed أو test أو ملف مصدر غير منشور | يحظر تشغيله في الإنتاج أو يحذف بعد تحقق عدم استخدامه |

## 2A. تحديث دفعة أمر المعالجة — 14 أغسطس 2026

> يسود هذا القسم على أي توصيف أقدم متعارض في السجل. كل بند أدناه إما **استبدال بعقد حقيقي** أو **إزالة آمنة**؛ ولا يمثل أي منها إثبات تشغيل حي قبل staging.

| المعرف | المكوّن والموضع | الحالة الحالية | التعديل المنفذ | التحقق المحلي | المتبقي للإغلاق النهائي |
|---|---|---|---|---|---|
| ORD-001 | `backend/infra/fastapi/server.py` | استبدال أمني | أُلزمت أسرار البيئة، ومُنع seed وحساب demo التلقائيان خارج تطوير مصرح | بناء NestJS | تشغيل FastAPI على staging ورفض تشغيله بلا إعدادات |
| ORD-002 | `backend/src/modules/providers/providers.controller.ts` و`provider/simulated-features.controller.ts` | إزالة آمنة | حُذف route `seed-demo` ومتحكم الميزات المحاكي غير المصرح | بناء NestJS | بدائل guarded للعروض/الإحالات/الموظفين عند اعتماد العقود |
| ORD-003 | `backend/src/modules/labs/labs.service.ts` و`schemas/lab.schema.ts` | استبدال أمني | عزلت الحجوزات والعينات حسب مزود المختبر ومنعت قفز مراحل العينة | بناء NestJS | BOLA وstate-transition على staging بهويتين |
| ORD-004 | `backend/src/modules/returns/*` و`pharmacy/*` | استبدال أمني | ربطت المرتجعات بطلب صيدلية مملوك ومبلغ خادمي؛ حُذف قرار مرتجع وهمي | بناء NestJS | اختبار refund وسجل تدقيق وتسوية sandbox |
| ORD-005 | `backend/src/common/idempotency.interceptor.ts` و`pharmacy.controllers.ts` | استبدال أمني | عُزلت مفاتيح الإديمبوتنسي بالهوية والطريقة والمسار، مع قفل Redis ذري، وطُبقت على POST الصيدلية | بناء NestJS | اختبار تكرار/توازي على Redis وstaging |
| ORD-006 | `backend/src/modules/payments/paymob.*` و`moyasar.module.ts` | استبدال أمني | لا يقبل Paymob مبلغ العميل؛ يقرأ إجمالي طلب مملوك وموافق عليه. حُذف نجاح Moyasar sandbox المحلي بلا مفتاح | بناء NestJS | gateway sandbox، webhook موقّع، refund وreconciliation |
| ORD-007 | `backend/src/modules/push/push.module.ts` و`provider-app/src/utils/*notifications*` | استبدال/إزالة | لا project ID افتراضي، ولا رمز push غير مسجل، ولا حملة نجاح وهمية، ولا Redis محلي صامت | بناء NestJS وJest المزوّد | Push sandbox واختبارات delivery/retry |
| ORD-008 | `patient-app/app/pharmacy/{checkout,payment}.tsx` | استبدال/إزالة | حُذف السعر ورسوم التوصيل وcopay والموقع والنجاح المحلي؛ الإنشاء والإرسال والدفع مشروطة بعقد وسعر عرض خادمي | تصدير iOS | عروض الصيدلية والتأمين والتسليم ودفع sandbox |
| ORD-009 | `patient-app/app/insurance/add-policy.tsx` | إزالة آمنة | حُذف OCR و`base64_simulated_data` والتحقق/الحفظ الافتراضيان؛ الواجهة تصرح بعدم الإتاحة | تصدير iOS | upload مخزن وفحص ملف وOCR/تحقق مؤمن |
| ORD-010 | `patient-app/app/reports/passport.tsx` وبيانات الجنين | إزالة آمنة | حُذفت أنماط QR المزيفة ونُقلت بيانات الجنين خارج شجرة Expo Router لإزالة route فارغ | تصدير iOS | QR موقع وhealth-ID موحدان عند اكتمال العقد |
| ORD-011 | `provider-app/src/screens/{doctor,facility}/*` | إزالة آمنة | حُذفت مواعيد وإجازات وتحويلات وتفاصيل طبية وإدارة كوادر/كلمات مرور محلية؛ تعرض الآن خطأ أو عدم إتاحة صريحاً | Jest 3/3 | عقود مزود guarded للإحالة والإجازة والكوادر |
| ORD-012 | `admin-app/web-admin/*` و`frontend/App_old.js` | إزالة/استبدال | حُذفت مصادر MOCK وseed-demo التاريخية، وأزيل localhost وبطاقات مالية ثابتة، وأُصلح prerender للحارس | CRA وNext.js builds | عقود مالية وonboarding وapproval/audit حية |
| ORD-013 | `backend/src/modules/insurance/insurance.module.ts` | إزالة آمنة | أوقفت OCR البوليصة، رفع البوليصة، أهلية NPHIES، حفظ بوليصة العميل، والمطالبة التأمينية التي كانت تولد بوالص ومبالغ وأهلية محلية؛ صارت ترجع `503` صريحاً إلى أن يتوفر تكامل موثق | `backend: npm run build` ناجح | تخزين ملفات آمن، OCR/NPHIES حقيقي، مصدر مطالبة خادمي مملوك ومسعّر، وسجل تدقيق وموافقات |

| بوابة التحقق | النتيجة الحالية | القيد الصريح |
|---|---|---|
| `backend: npm run build` | ناجح | لا يثبت تشغيل Redis أو Mongo أو مزودي الدفع |
| `patient-app: expo export --platform ios` | ناجح | لا يثبت جهازاً فعلياً أو صلاحيات كاميرا/رفع/Push |
| `provider-app: npm test -- --runInBand` | 3/3 ناجحة | تغطي workflows محددة فقط وليست E2E |
| `admin-app/frontend: npm run build` | ناجح | لا يثبت APIs الإدارة |
| `admin-app/web-admin: NODE_ENV=production npm run build` | ناجح | لا يثبت حراسة الدور عبر API حي |
| `patient-app: npm run lint` | **فشل: 96 أخطاء و1026 تحذيراً** | مشكلات تاريخية، منها رموز JSX غير معرّفة ومتغيرات غير مستخدمة؛ بوابة الإصدار غير مغلقة |

## 2B. دفعة التوطين والوضع الداكن — 14 أغسطس 2026

> لا تثبت هذه الدفعة أن جميع العبارات الطبية أو القانونية أو المالية صارت معتمدة للنشر. هي تثبت **تغطية القاموس وبنية تمرير اللغة**، وتعالج عيوب سمة محلية واضحة. يلزم اعتماد مترجمين أصليين مؤهلين واختبار بصري على أجهزة قبل إغلاق الجاهزية للمتاجر.

| المعرف | المكوّن والموضع | الحالة الحالية | التعديل المنفذ | التحقق المحلي | المتبقي للإغلاق النهائي |
|---|---|---|---|---|---|
| LOC-001 | `patient-app/app/**` و`src/**`، `src/i18n/generatedStaticTranslations.ts` | معالجة محلية جزئية | جردت 4422 مطابقة عربية في 479 ملفاً، منها 3272 نصاً فريداً مرشحاً. ولدت 3011 مفتاح واجهة صادر من الشاشات/المكونات إلى الإنجليزية والأوردية والهندية والبنغالية والفلبينية، ثم راجعت جميع الدفعات 151/151 دلالياً وطبقت 90 تصحيحاً آمنًا؛ العربية تظل نص المصدر | `PATIENT_APP_TRANSLATION_QA.md`: لا حقل لغة أو متغير قالب مفقود؛ `PATIENT_APP_TRANSLATION_SEMANTIC_REVIEW.md` | اعتماد بشري للمصطلحات السريرية والمالية والقانونية، وقرار تحريري لـ329 قيمة مطابقة للمصدر لأنها أسماء/رموز أو تحتاج سياسة عرض |
| LOC-002 | `src/i18n/index.ts` و`src/i18n/LanguageManager.ts` و`src/context/AppContext.tsx` و`src/components/Header.tsx` | إصلاح محلي | ربط القاموس المولد في `autoTranslate`، ووحد رمز الفلبينية على `fil` مع ترحيل القيمة المخزنة `tl`، وموحد التخزين، ومختار الرأس يستخدم قائمة اللغات الست المركزية | تصدير Expo iOS ناجح؛ لا مرجع تشغيلي لـ`tl` إلا مسار الترحيل المتوافق | اختبار تبديل اللغة وRTL/LTR في كل شاشة وعلى نظامين |
| LOC-003 | `app/mental-health/breathing.tsx` و`src/features/{consultation,medical-orders}/*` و`src/guided-tour/ui/SpotlightRenderer.tsx` | إصلاح محلي | نقلت أسطح ونصوص وحدود الشاشات ذات الأولوية إلى ألوان `AppContext` واستبدلت رموز emoji في شاشة التنفس بأيقونات متجهية | تصدير Expo iOS ناجح | فحص بصري على جهاز، وحالات تكبير الخط والتباين والوصول |
| LOC-004 | `app/{diagnostics/lab-comparison,diagnostics/packages,health/actionable-order}.tsx` | إصلاح محلي | أزيل تثبيت `Colors.light` والأسطح الشفافة المعيبة؛ أُصلح `theme` خارج نطاقه في شاشة الأوامر الطبية والذي كان مرشحاً لعطل وقت تشغيل | لا `Colors.light` متبقٍ في `patient-app/app/`؛ تصدير Expo iOS ناجح | فحص المسارات ببيانات حقيقية وعقود صيدلية/تحاليل على staging |
| LOC-005 | `PATIENT_APP_DARK_MODE_AUDIT.md` | دليل قياس | جرد ساكن لـ477 ملفاً: من 12 ملفاً غير ظاهر ربطها بالسمة و8 أولويات أبيض/أسود، إلى 6 ملفات و2 استثناءين مقصودين (`room/[id]` لفيديو أسود ثابت و`src/theme/index.ts` لتعريف الرموز) | إعادة تشغيل مولد التدقيق بعد التعديلات | لا يعوض route-by-route visual QA؛ 168 ملفاً فيها ألوان صريحة يجب مراجعة دلالتها عند المرور البصري |
| LOC-006 | `PATIENT_APP_UNLOCALIZED_LITERAL_AUDIT.md` | فجوة مثبتة ومخففة | بعد ترحيل النصوص الخام إلى أغلفة مركزية واعتماد المكونات المشتركة، انخفض الجرد الساكن إلى 536 مرشحاً في 142 ملفاً؛ لا يعني هذا أن 536 نصاً غير مترجماً، بل أنها تحتاج تصنيفاً حسب مصدر المكوّن أو البيانات | تقارير الجرد والتصنيف القابلة للتكرار | route-by-route visual QA، ومراجعة عناصر البيانات والخصائص التي لا يمكن إثبات مسارها بالتحليل الساكن |
| LOC-007 | `src/components/{LocalizedText,LocalizedTextInput,LocalizedAlert}.tsx` و`src/design-system/components/Text.tsx` | توسيع مسار الترجمة | رُحّل 46 ملف JSX من `Text` الخام، و37 ملف إدخال، و53 ملف Alert إلى أغلفة تستخدم `autoTranslate`؛ كما صار `DSText` يترجم الأطفال النصيين، وتُترجم قوالب وقت التشغيل مع حفظ القيم الديناميكية | تصدير Expo iOS ناجح | لا يعوض اختبار كل مسار أو التحقق البصري من طول النص وخطوط اللغات الخمس |
| LOC-008 | `PATIENT_APP_EMOJI_ICON_AUDIT.md` | إصلاح محلي | أزيلت كل رموز emoji المرصودة من المصدر المرئي أو استبدلت بأيقونات `Icon` متجهية؛ جرد الرموز النهائي أعاد 0 | مولد جرد emoji، تصدير Expo iOS | فحص بصري للأيقونات والاتجاه والتباين على أجهزة فعلية |

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
| PAT-003 | `app/health/refills.tsx` | أيام متبقية وأسعار وإعادة صرف محلية عشوائية | أزيلت محلياً | لا يعرض refill ناقص البيانات ولا ينشئ طلباً أو سعراً؛ يلزم `GET/POST /patients/medication-refills` بسجل التزام وملكية ووصفة |
| PAT-004 | `app/health/health-id.tsx:84,87` | QR مرسوم ومحاكى | مفتوح — هوية صحية | توحيد الشاشة مع محتوى جواز صحي موقّع؛ إلغاء الرسم المحلي |
| PAT-005 | `app/emergency/tracking.tsx:76` | خريطة placeholder | مفتوح — طوارئ | مورد طوارئ مملوك وبث موقع مصادق أو حالة انتظار صريحة |
| PAT-006 | `app/nursing/live-doctor-tracking.tsx` | خريطة وETA وموقع واسم طبيب وتقييم وزيارة محاكية | أزيلت محلياً | تعرض الشاشة عدم إتاحة صريحة؛ يلزم عقد تتبع زيارة ومندوب يثبت الملكية والموافقة |
| PAT-007 | `app/diagnostics/order/[id].tsx:143-156` | خريطة ومسار منقط لمحاكاة النقل | مفتوح — تشخيص | عقد جمع عينة/سائق وموقع حقيقي أو إخفاء الخريطة |
| PAT-008 | `app/diagnostics/insurance-upload.tsx:85` | محاكاة معالجة AI لخلفية التأمين | مفتوح — تأمين | رفع ملف مخزن، OCR/تحقق مصادق، حالة processing قابلة للاستعلام |
| PAT-009 | `app/insurance/add-policy.tsx:35` | `base64_simulated_data` | مفتوح — ملفات/تأمين | خدمة رفع فعلية، فحص نوع/حجم/AV، مرجع ملف فقط في API |
| PAT-010 | `app/reports/passport.tsx:302,307` | `fakeQRRow` و`fakeQRBlock` | مفتوح — هوية صحية | استخدام QR موقّع من backend أو إخفاء العرض عند فشل العقد |
| PAT-011 | `app/voice/index.tsx` | تعرف صوتي وأوامر وحجوزات ومواعيد وصيدلية محاكية | أزيلت محلياً | تعرض الشاشة عدم إتاحة صريحة؛ يلزم Speech-to-Text مصرح وعقود تنفيذ مملوكة لكل إجراء |
| PAT-012 | `app/community/live-session.tsx:65` و`app/room/[id].tsx:77` و`src/components/livekit-view.tsx:38` | فيديو/كاميرا placeholder | مفتوح — اتصال حي | LiveKit room token، membership، tracks، سجل انتهاء الجلسة |
| PAT-013 | `app/nutrition/food-scanner.tsx` و`calorie-analyzer.tsx` | مسح/تحليل غذائي محاكى أو placeholder text | معالجة جزئية | أزيل تحليل الصورة المحاكي ونجاح حفظ الوجبة عند الفشل؛ يبقى تحليل النص متوقفاً على API حقيقي لم يثبت على staging | عقد تحليل غذائي، مصدر صورة حقيقي، سياسة سلامة طبية ونسب ثقة |
| PAT-014 | `app/programs/active.tsx` | برنامج علاجي وموعد ونقاط وتقدم محاكون | أزيلت محلياً | لا يظهر برنامج احتياطي عند غياب API؛ يلزم API تقدم برنامج مملوك للمريض وtimeline |
| PAT-015 | `app/maternity/fetus-data.ts:175` | `DummyFetusRoute` | مفتوح — طريق ميت | حذف route أو بناء شاشة مرتبطة ببيانات الحمل المملوكة |
| PAT-016 | `src/core/platform/auth/AuthAuditLogger.ts:15,27,38` | `IP_PLACEHOLDER` | مفتوح — تدقيق | التقاط IP/الجهاز في الخادم، لا اعتماد على العميل |
| PAT-017 | `src/core/platform/auth/SessionManager.ts:73` | تدوير token placeholder | مفتوح — هوية | endpoint refresh rotation وrevoke وsecure storage |
| PAT-018 | `src/config/chatSecurity.ts:139` و`src/utils/security.ts:161` و`guided-tour/engines/AnalyticsCollector.ts:24` | إرسال تدقيق/تحليلات محاكى أو مؤجل | مفتوح — تدقيق | API سجل تدقيق مصادق مع privacy policy وretention |
| PAT-019 | `RealtimeClient.ts:30` و`SocketContext.tsx:11` | fallback عناوين localhost في وقت التشغيل | مفتوح — تهيئة | عولج `AppContext` و`ConfigManager` في الدفعات السابقة؛ يبقى منع fallback في عملاء الوقت الحقيقي وإلزام متغير بيئة صحيح |
| PAT-020 | `app/health/health-id.tsx` و`app/profile/index.tsx` | اسم ومعلومات صحية وجهات اتصال وQR ونقاط ثابتة | أزيلت محلياً | بطاقة الهوية تقرأ `/users/me/profile` وتعرض حالة فارغة/خطأ؛ الملف يقرأ الاسم من `state.auth.user`؛ تحتاج الحقول غير المتعاقد عليها API موثق وQR موقع |
| PAT-021 | `app/(tabs)/pharmacy.tsx` و`app/search/index.tsx` | أدوية وأسعار وسجل بحث محليون، منها بانادول | أزيلت محلياً | لا fallback منتجات أو أسعار أو اقتراحات سجل ثابتة؛ يتطلب الكتالوج والسجل عقدي API مملوكين |
| PAT-022 | `app/community/live-session.tsx` و`app/nutrition/exercise-plan.tsx` | بث وتعليقات وخطة تمارين صحية محاكية، منها «أحمد م.» و«باي كيرل» | أزيلت محلياً | تعرض الشاشات عدم إتاحة صريحاً؛ يلزم عقد LiveKit/مراسلة وخطة صحية معتمدة قبل التفعيل |
| PAT-023 | `src/constants/insurance.ts` و`src/constants/index.ts` | كتالوج شركات وخطط تأمين ثابت في العميل | مفتوح — مرجع بيانات | لا دليل أنه يطابق قاعدة البيانات أو صلاحيات التأمين؛ يلزم API مرجعي `name_ar/name_en` وخطط مرتبطة بشركة وتغطية، ثم حذف/تقليل الكتالوج المكرر |
| PAT-024 | `app/insurance/coverage-check.tsx` | نسب وأسعار وحدود ونتيجة تأمين محلية | أزيلت محلياً | لا يعرض التطبيق نتيجة تغطية أو دفع؛ يلزم عقد تحقق تأميني موثق يعيد القيم المعتمدة من شركة التأمين |
| PAT-025 | `app/ai/{monthly-report,prescription-translator,symptom-checker}.tsx` | تقرير سريري وOCR/دواء وسعر ودقة وتحليل أعراض واحتمالات محلية | أزيلت محلياً | حالات عدم إتاحة صريحة حتى عقد تقارير/OCR/فرز سريري موثق ومراجعة مختصة |
| PAT-026 | `app/nutrition/ai-meal-planner.tsx` | عمر وجنس ووزن وسعرات وخطة غذائية ثابتة | أزيلت محلياً | يلزم عقد خدمة يعتمد ملف المستخدم ومدخلاته الصحية والموافقة وسياسة سلامة |
| PAT-027 | `app/wearables/hub.tsx` | قراءات قلب ونوم وضغط وسكر ووزن مولدة عشوائياً ومزامنة ناجحة محلية | أزيلت محلياً | يلزم تكامل مصنع الجهاز وموافقة المستخدم وعقد مزامنة وسجل تدقيق |

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
| BE-014 | `src/modules/insurance/insurance.module.ts` | OCR ورفع بوليصة وأهلية NPHIES وبوليصة/مطالبة عميل كانت تعيد أسماء وأرقاماً ونسباً ومبالغ مولدة | أزيلت محلياً | أُعيدت `503 Service Unavailable` بدلاً من بيانات تأمين مزعومة؛ يلزم عقد NPHIES/تخزين/OCR ومصدر طلب يحدد السعر والملكية قبل الإحياء |

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

عند اكتشاف أي عنصر جديد أو إجراء أي تعديل لاحق، يضاف صف جديد إلى هذا السجل بالمعرف والمكوّن والملف والسطر والحالة والعقد أو الاختبار المطلوب. ويعاد توليد الملحق الكامل في القسم 12 بعد كل موجة مصدرية، ثم يجرى فحص أسرار لأسطر الإضافة قبل دفع الفرع المستقل.

## 12. الملحق الكامل: فهرس المرشحات التشغيلية بالمسار والسطر

> أُدرج هذا الملحق داخل الملف الرئيسي بطلب المالك، حتى يصبح هذا السجل **ملف Markdown واحداً كافياً**: يحتوي التصنيف التنفيذي في الأقسام السابقة، ثم كل مرشح آلي مع المكوّن والملف والسطر والمقتطف. لا يعني تطابق واحد أن السطر عيب؛ يعود الحكم التنفيذي إلى الأقسام 3–10 أعلاه.

### فهرس المرشحات التشغيلية للبيانات الوهمية والعقود غير المنفذة

> هذا **فهرس آلي مرشح للمراجعة** وليس حكماً بأن كل سطر عيب. يستبعد الاختبارات والاعتماديات ونواتج البناء، ويعرض كل تطابق تشغيلي لنمط محاكاة أو placeholder أو زرع أو عنوان تطوير أو معرف ثابت. التصنيف النهائي وحالة الاستبدال موثقان في سجل المعالجة التفصيلي.

**نطاق المسح:** backend، patient-app، provider-app، admin-app.
**عدد المرشحات التشغيلية:** 893.

## الملخص حسب المكوّن

| المكوّن | عدد المرشحات |
|---|---:|
| backend | 117 |
| patient-app | 181 |
| provider-app | 357 |
| admin-app | 238 |

## الملخص حسب الفئة

| الفئة | العدد |
|---|---:|
| عقد أو قدرة غير منفذة | 549 |
| زرع أو بيانات تهيئة | 141 |
| بيانات أو سلوك محاكى | 111 |
| عنوان تطوير محلي | 56 |
| معرف ثابت مرشح للمراجعة | 30 |
| بيانات أو سلوك محاكى؛ زرع أو بيانات تهيئة | 3 |
| بيانات أو سلوك محاكى؛ عقد أو قدرة غير منفذة | 1 |
| عقد أو قدرة غير منفذة؛ معرف ثابت مرشح للمراجعة | 1 |
| عقد أو قدرة غير منفذة؛ زرع أو بيانات تهيئة | 1 |

## الفهرس الكامل

| المكوّن | الفئة | الملف | السطر | المقتطف |
|---|---|---|---:|---|
| admin-app | بيانات أو سلوك محاكى | admin-app/frontend/src/App_old.js | 104 | // MOCK DATA — نبض بلس ال |
| admin-app | عقد أو قدرة غير منفذة | admin-app/frontend/src/App_old.js | 160 | const Input = ({ placeholder, value, onChange, type="text", full, small }) => ( |
| admin-app | عقد أو قدرة غير منفذة | admin-app/frontend/src/App_old.js | 161 | <input type={type} placeholder={placeholder} value={value\|\|""} onChange={e=>onChange(e.target.value)} |
| admin-app | عقد أو قدرة غير منفذة | admin-app/frontend/src/App_old.js | 168 | const Textarea = ({ placeholder, value, onChange, rows=3 }) => ( |
| admin-app | عقد أو قدرة غير منفذة | admin-app/frontend/src/App_old.js | 169 | <textarea placeholder={placeholder} value={value\|\|""} onChange={e=>onChange(e.target.value)} rows={rows} |
| admin-app | بيانات أو سلوك محاكى | admin-app/frontend/src/App_old.js | 314 | // Replace MOCK with data |
| admin-app | عقد أو قدرة غير منفذة | admin-app/frontend/src/App_old.js | 549 | <FormRow label="سبب الإسناد اليدوي" required><Textarea placeholder="لماذا تتدخل يدوياً؟" value="" onChange={()=>{}} rows={2} /></FormRow> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/frontend/src/App_old.js | 749 | <Input id="kill-reason" full placeholder="سبب هذا الإجراء (إلزامي)" /> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/frontend/src/App_old.js | 972 | <Input value={surgePricing.reason} onChange={v => setSurgePricing(s => ({...s, reason: v}))} placeholder="مثال: ازدياد الطلب خلال فصل الشتاء" /> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/frontend/src/App_old.js | 1029 | <FormRow label="ID المستخدم" required><Input value={creditForm.user_id} onChange={v=>setCreditForm(s=>({...s, user_id:v}))} placeholder="user-uuid" /></FormRow> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/frontend/src/App_old.js | 1031 | <FormRow label="سبب الإيداع" required><Input value={creditForm.reason} onChange={v=>setCreditForm(s=>({...s, reason:v}))} placeholder="تعويض عن تأخر الطلب..." /></FormRow> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/frontend/src/App_old.js | 1171 | <FormRow label="كود الكوبون"><Input value={form.code} onChange={v=>setForm(s=>({...s,code:v}))} placeholder="NABD50" /></FormRow> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/frontend/src/App_old.js | 1240 | placeholder="أنت مساعد طبي ذكي اسمه نبضي، تساعد المرضى في الحصول على الرعاية الصحية المناسبة. تتحدث بأسلوب ودود ومهني باللغة العربية..." |
| admin-app | عقد أو قدرة غير منفذة | admin-app/frontend/src/App_old.js | 1248 | <Input value={newKeyword} onChange={setNewKeyword} placeholder="مثال: ألم في الصدر، ضيق تنفس..." /> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/frontend/src/App_old.js | 1345 | <Input value={search} onChange={setSearch} placeholder="بحث بالاسم العربي أو التجاري..." /> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/frontend/src/App_old.js | 1681 | <FormRow label="عنوان الإشعار" required><Input value={form.title} onChange={v=>setForm(s=>({...s,title:v}))} placeholder="عروض نبض بلس الجديدة!" /></FormRow> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/frontend/src/App_old.js | 1682 | <FormRow label="نص الإشعار" required><Textarea value={form.body} onChange={v=>setForm(s=>({...s,body:v}))} placeholder="اكتشف خدماتنا..." /></FormRow> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/frontend/src/App_old.js | 1772 | <FormRow label="رابط الصورة"><Input value={form.image_url} onChange={v=>setForm(s=>({...s,image_url:v}))} placeholder="https://..." /></FormRow> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/frontend/src/App_old.js | 2310 | <div style={{ width:300 }}><Input placeholder="بحث برقم الجوال أو الاسم..." value={search} onChange={setSearch} /></div> |
| admin-app | بيانات أو سلوك محاكى | admin-app/frontend/src/App_old.js | 2343 | // Fallback for demo |
| admin-app | عقد أو قدرة غير منفذة | admin-app/frontend/src/App_old.js | 2505 | <div style={{ flex: 1, minWidth: 200 }}><Input full placeholder="بحث برقم الجوال، الاسم..." value={search} onChange={e => setSearch(e)} /></div> |
| admin-app | بيانات أو سلوك محاكى؛ زرع أو بيانات تهيئة | admin-app/frontend/src/App_old.js | 2587 | await client.post('/providers/admin/seed-demo'); |
| admin-app | عقد أو قدرة غير منفذة | admin-app/frontend/src/App_old.js | 2658 | <Input full placeholder="سبب الرفض (إلزامي للرفض)..." value={rejectReason} onChange={e => setRejectReason(e)} /> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/frontend/src/App_old.js | 2803 | <Input full value={targetId} onChange={setTargetId} placeholder="مثال: USER-123456" /> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/frontend/src/App_old.js | 3064 | <Input placeholder="🔍 ابحث عن مريض، مزود، دواء، طلب، تحليل..." value={searchQuery} onChange={setSearchQuery} full /> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/frontend/src/App_old.js | 3198 | <Input full type="text" value={otp} onChange={setOtp} required placeholder="123456" style={{ textAlign:'center', letterSpacing:5, fontSize:20 }} /> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/frontend/src/components/AuditLogViewer.js | 37 | placeholder="بحث في السجلات..." |
| admin-app | عقد أو قدرة غير منفذة | admin-app/frontend/src/components/NursingPortal.js | 82 | const Input = ({ placeholder, value, onChange, type = "text", full, small, style = {} }) => ( |
| admin-app | عقد أو قدرة غير منفذة | admin-app/frontend/src/components/NursingPortal.js | 83 | <input type={type} placeholder={placeholder} value={value \|\| ""} onChange={e => onChange(e.target.value)} |
| admin-app | عقد أو قدرة غير منفذة | admin-app/frontend/src/components/NursingPortal.js | 90 | const Textarea = ({ placeholder, value, onChange, rows = 3 }) => ( |
| admin-app | عقد أو قدرة غير منفذة | admin-app/frontend/src/components/NursingPortal.js | 91 | <textarea placeholder={placeholder} value={value \|\| ""} onChange={e => onChange(e.target.value)} rows={rows} |
| admin-app | عقد أو قدرة غير منفذة | admin-app/frontend/src/components/NursingPortal.js | 621 | <Input placeholder="120/80" value={vitals.bp} onChange={v => setVitals(prev => ({ ...prev, bp: v }))} full small /> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/frontend/src/components/NursingPortal.js | 625 | <Input type="number" placeholder="80" value={vitals.pulse} onChange={v => setVitals(prev => ({ ...prev, pulse: v }))} full small /> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/frontend/src/components/NursingPortal.js | 629 | <Input type="number" placeholder="37" value={vitals.temp} onChange={v => setVitals(prev => ({ ...prev, temp: v }))} full small /> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/frontend/src/components/NursingPortal.js | 633 | <Input type="number" placeholder="110" value={vitals.glucose} onChange={v => setVitals(prev => ({ ...prev, glucose: v }))} full small /> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/frontend/src/components/NursingPortal.js | 664 | <Textarea placeholder="اكتب ملاحظاتك الطبية هنا بالتفصيل عن حالة المريض الصحية..." value={notes} onChange={setNotes} rows={3} /> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/frontend/src/components/NursingPortal.js | 683 | <Input placeholder="شاش / إبر / محلول..." value={newItem.name} onChange={v => setNewItem(prev => ({ ...prev, name: v }))} small /> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/frontend/src/components/NursingPortal.js | 684 | <Input type="number" placeholder="الكمية" value={newItem.qty} onChange={v => setNewItem(prev => ({ ...prev, qty: v }))} small /> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/frontend/src/components/ui/command.jsx | 41 | "flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50", |
| admin-app | عقد أو قدرة غير منفذة | admin-app/frontend/src/components/ui/input.jsx | 10 | "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none foc |
| admin-app | عقد أو قدرة غير منفذة | admin-app/frontend/src/components/ui/select.jsx | 17 | "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:c |
| admin-app | عقد أو قدرة غير منفذة | admin-app/frontend/src/components/ui/textarea.jsx | 9 | "flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:t |
| admin-app | بيانات أو سلوك محاكى | admin-app/source_files/Part1.jsx | 94 | // MOCK DATA — نبض بلس الحقيقي |
| admin-app | بيانات أو سلوك محاكى | admin-app/source_files/Part1.jsx | 96 | const MOCK = { |
| admin-app | معرف ثابت مرشح للمراجعة | admin-app/source_files/Part1.jsx | 113 | { id:"ORD-8821", patient:"أحمد الزهراني", provider:"مختبر الدقة", type:"Lab", subtype:"سحب منزلي", status:"in_progress", amount:320, time:"10:24", assigned:"فني سامي", priority:"normal", broadcast_radius:4 }, |
| admin-app | معرف ثابت مرشح للمراجعة | admin-app/source_files/Part1.jsx | 114 | { id:"ORD-8820", patient:"سارة العتيبي", provider:null, type:"Doctor", subtype:"كشف منزلي", status:"broadcasting", amount:180, time:"10:18", assigned:null, priority:"urgent", broadcast_radius:4 }, |
| admin-app | معرف ثابت مرشح للمراجعة | admin-app/source_files/Part1.jsx | 115 | { id:"ORD-8819", patient:"فاطمة الدوسري", provider:"صيدلية النهدي", type:"Pharmacy", subtype:"توصيل أدوية", status:"pending_payment", amount:95, time:"10:05", assigned:"مندوب خالد", priority:"normal", broadcast_radius:4 }, |
| admin-app | معرف ثابت مرشح للمراجعة | admin-app/source_files/Part1.jsx | 116 | { id:"ORD-8818", patient:"خالد المطيري", provider:"مركز النبض", type:"Nursing", subtype:"غيار جرح", status:"completed", amount:450, time:"09:45", assigned:"ممرضة نورا", priority:"normal", broadcast_radius:4 }, |
| admin-app | معرف ثابت مرشح للمراجعة | admin-app/source_files/Part1.jsx | 117 | { id:"ORD-8817", patient:"أحمد الزهراني", provider:null, type:"Pharmacy", subtype:"روشتة OCR", status:"pending_approval", amount:0, time:"09:30", assigned:null, priority:"normal", broadcast_radius:6, ocr_items:[{name:"بنادول",qty:2,found:true,rx:false},{name:" |
| admin-app | معرف ثابت مرشح للمراجعة | admin-app/source_files/Part1.jsx | 148 | { id:"BC001", order_id:"ORD-8820", type:"Doctor", patient:"سارة العتيبي", area:"جدة - حي الحمراء", radius:4, started:"10:15", elapsed:"8 دقائق", providers_notified:12, accepted:0, status:"expanding", next_expand:"10:18" }, |
| admin-app | معرف ثابت مرشح للمراجعة | admin-app/source_files/Part1.jsx | 149 | { id:"BC002", order_id:"ORD-8817", type:"Pharmacy", patient:"أحمد الزهراني", area:"الرياض - الياسمين", radius:4, started:"09:30", elapsed:"5 دقائق", providers_notified:8, accepted:0, status:"active", next_expand:"09:33" }, |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part1.jsx | 290 | const Input = ({ placeholder, value, onChange, type="text", full, small }) => ( |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part1.jsx | 291 | <input type={type} placeholder={placeholder} value={value\|\|""} onChange={e=>onChange(e.target.value)} |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part1.jsx | 298 | const Textarea = ({ placeholder, value, onChange, rows=3 }) => ( |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part1.jsx | 299 | <textarea placeholder={placeholder} value={value\|\|""} onChange={e=>onChange(e.target.value)} rows={rows} |
| admin-app | بيانات أو سلوك محاكى | admin-app/source_files/Part1.jsx | 474 | {MOCK.orders.map(o=>( |
| admin-app | بيانات أو سلوك محاكى | admin-app/source_files/Part1.jsx | 497 | {MOCK.broadcast_live.map(b=>( |
| admin-app | بيانات أو سلوك محاكى | admin-app/source_files/Part1.jsx | 537 | {MOCK.emergency_live.map(em=>( |
| admin-app | بيانات أو سلوك محاكى | admin-app/source_files/Part1.jsx | 555 | <h3 style={{ color:T.orange, margin:"0 0 12px", fontSize:14, fontWeight:700 }}>⏳ موافقات ({MOCK.pending_approvals.length})</h3> |
| admin-app | بيانات أو سلوك محاكى | admin-app/source_files/Part1.jsx | 556 | {MOCK.pending_approvals.map(p=>( |
| admin-app | بيانات أو سلوك محاكى | admin-app/source_files/Part1.jsx | 571 | {MOCK.compliance.filter(c=>c.status!=="valid").slice(0,3).map(c=>( |
| admin-app | بيانات أو سلوك محاكى | admin-app/source_files/Part1.jsx | 606 | {MOCK.broadcast_live.map(b=>( |
| admin-app | بيانات أو سلوك محاكى | admin-app/source_files/Part1.jsx | 645 | <Sel options={[{value:"",label:"اختر مزوداً"}, ...MOCK.providers.filter(p=>p.available&&p.status==="active").map(p=>({value:p.id,label:\`${p.name} (${p.area})\`}))]} value="" onChange={()=>{}} /> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part1.jsx | 647 | <FormRow label="سبب الإسناد اليدوي" required><Textarea placeholder="لماذا تتدخل يدوياً؟" value="" onChange={()=>{}} rows={2} /></FormRow> |
| admin-app | بيانات أو سلوك محاكى | admin-app/source_files/Part1.jsx | 670 | {MOCK.emergency_live.map(em=>( |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part1.jsx | 709 | <FormRow label="موقع المريض"><Input placeholder="العنوان أو الإحداثيات" value="" onChange={()=>{}} full /></FormRow> |
| admin-app | بيانات أو سلوك محاكى | admin-app/source_files/Part1.jsx | 714 | <Sel options={[{value:"",label:"اختر مستشفى"},...MOCK.providers.filter(p=>p.type==="Hospital").map(p=>({value:p.id,label:p.name}))]} value="" onChange={()=>{}} /> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part1.jsx | 716 | <FormRow label="سبب التجاوز"><Input placeholder="سبب الإسناد اليدوي..." value="" onChange={()=>{}} full /></FormRow> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part1.jsx | 721 | <FormRow label="موقع المريض" required><Input placeholder="العنوان التفصيلي" value="" onChange={()=>{}} full /></FormRow> |
| admin-app | بيانات أو سلوك محاكى | admin-app/source_files/Part1.jsx | 723 | <FormRow label="المستشفى" required><Sel options={[{value:"",label:"اختر مستشفى"},...MOCK.providers.filter(p=>p.type==="Hospital").map(p=>({value:p.id,label:p.name}))]} value="" onChange={()=>{}} /></FormRow> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part1.jsx | 724 | <FormRow label="رقم الإسعاف"><Input placeholder="AMB-XXX (اختياري)" value="" onChange={()=>{}} /></FormRow> |
| admin-app | بيانات أو سلوك محاكى | admin-app/source_files/Part1.jsx | 737 | const [switches, setSwitches] = useState(MOCK.kill_switches); |
| admin-app | بيانات أو سلوك محاكى | admin-app/source_files/Part1.jsx | 796 | <SectionHeader title="✅ نظام موافقة المزودين (KYC كامل)" subtitle={\`${MOCK.pending_approvals.length} طلبات تنتظر المراجعة\`} actions={[ |
| admin-app | بيانات أو سلوك محاكى | admin-app/source_files/Part1.jsx | 803 | {MOCK.pending_approvals.map(p=>( |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part1.jsx | 893 | <FormRow label="سبب الرفض (سيُرسل للمزود)" required><Textarea value={reason} onChange={setReason} placeholder="اكتب سبب الرفض بوضوح..." rows={4} /></FormRow> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part1.jsx | 911 | <FormRow label="ملاحظات إضافية"><Textarea placeholder="تفاصيل إضافية..." value="" onChange={()=>{}} rows={3} /></FormRow> |
| admin-app | بيانات أو سلوك محاكى | admin-app/source_files/Part1.jsx | 927 | const filtered = filter==="all" ? MOCK.sub_accounts : MOCK.sub_accounts.filter(s=>s.parent_id===filter); |
| admin-app | بيانات أو سلوك محاكى | admin-app/source_files/Part1.jsx | 930 | <SectionHeader title="🏢 الحسابات الفرعية (Sub-Accounts)" subtitle={\`${MOCK.sub_accounts.length} حساب فرعي نشط\`} actions={[ |
| admin-app | بيانات أو سلوك محاكى | admin-app/source_files/Part1.jsx | 935 | <StatCard label="إجمالي الحسابات" value={MOCK.sub_accounts.length} color={T.accent} icon="🏢" /> |
| admin-app | بيانات أو سلوك محاكى | admin-app/source_files/Part1.jsx | 936 | <StatCard label="أطباء" value={MOCK.sub_accounts.filter(s=>s.role==="doctor").length} color={T.purple} icon="👨‍⚕️" /> |
| admin-app | بيانات أو سلوك محاكى | admin-app/source_files/Part1.jsx | 937 | <StatCard label="موظفو تأمين" value={MOCK.sub_accounts.filter(s=>s.role==="insurance_officer").length} color={T.gold} icon="🛡️" /> |
| admin-app | بيانات أو سلوك محاكى | admin-app/source_files/Part1.jsx | 938 | <StatCard label="فنيو مختبر" value={MOCK.sub_accounts.filter(s=>s.role==="lab_tech").length} color={T.teal} icon="🧪" /> |
| admin-app | بيانات أو سلوك محاكى | admin-app/source_files/Part1.jsx | 942 | {[{id:"all",label:"الكل"},...MOCK.providers.filter(p=>p.sub_accounts>0).map(p=>({id:p.id,label:p.name}))].map(f=>( |
| admin-app | بيانات أو سلوك محاكى | admin-app/source_files/Part1.jsx | 965 | <Sel options={MOCK.providers.map(p=>({value:p.id,label:p.name}))} value="" onChange={()=>{}} /> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part1.jsx | 971 | <FormRow label="الاسم الكامل" required><Input placeholder="الاسم الكامل" value="" onChange={()=>{}} full /></FormRow> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part1.jsx | 972 | <FormRow label="البريد الإلكتروني" required><Input type="email" placeholder="email@example.com" value="" onChange={()=>{}} full /></FormRow> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part1.jsx | 973 | <FormRow label="التخصص / القسم"><Input placeholder="باطنية / تحاليل / تمريض..." value="" onChange={()=>{}} full /></FormRow> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part1.jsx | 974 | <FormRow label="رقم SCFHS (إن وجد)"><Input placeholder="SCFHS-XXXX-XXXX" value="" onChange={()=>{}} full /></FormRow> |
| admin-app | بيانات أو سلوك محاكى | admin-app/source_files/Part1.jsx | 991 | const [rules, setRules] = useState(MOCK.auto_notification_rules); |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part1.jsx | 1050 | <Input placeholder="مثال: 30 دقيقة / فوري / 24 ساعة قبل" value={editRule?.delay\|\|""} onChange={()=>{}} full /> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part1.jsx | 1053 | <FormRow label="عنوان الإشعار" required><Input placeholder="عنوان الإشعار..." value={editRule?.title\|\|""} onChange={()=>{}} full /></FormRow> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part1.jsx | 1054 | <FormRow label="نص الرسالة" required><Textarea placeholder="نص الإشعار..." value={editRule?.body\|\|""} onChange={()=>{}} /></FormRow> |
| admin-app | بيانات أو سلوك محاكى | admin-app/source_files/Part1.jsx | 1102 | ]} data={MOCK.notifications_history} onRowAction={()=><Btn small variant="ghost">تفاصيل</Btn>} /> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part1.jsx | 1132 | {targetType==="specific_users"&&<Input placeholder="أدخل أرقام الجوال أو IDs مفصولة بفاصلة" value="" onChange={()=>{}} full />} |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part1.jsx | 1145 | <FormRow label="عنوان الإشعار (عربي)" required><Input placeholder="عنوان الإشعار..." value="" onChange={()=>{}} full /></FormRow> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part1.jsx | 1146 | <FormRow label="نص الرسالة (عربي)" required><Textarea placeholder="نص الإشعار..." value="" onChange={()=>{}} /></FormRow> |
| admin-app | بيانات أو سلوك محاكى | admin-app/source_files/Part1.jsx | 1181 | ]} data={MOCK.market_shortage} onRowAction={r=><> |
| admin-app | بيانات أو سلوك محاكى | admin-app/source_files/Part1.jsx | 1214 | ]} data={MOCK.b2b_requests} onRowAction={r=><> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part1.jsx | 1238 | <FormRow label="ملاحظة للصيدلية"><Textarea placeholder="رسالة للصيدلية..." value="" onChange={()=>{}} rows={2} /></FormRow> |
| admin-app | بيانات أو سلوك محاكى | admin-app/source_files/Part1.jsx | 1261 | <StatCard label="معلقة" value={MOCK.insurance_claims.filter(c=>c.status==="pending_manual").length} color={T.orange} icon="⏳" /> |
| admin-app | بيانات أو سلوك محاكى | admin-app/source_files/Part1.jsx | 1262 | <StatCard label="موافق عليها" value={MOCK.insurance_claims.filter(c=>c.status==="approved").length} color={T.green} icon="✅" /> |
| admin-app | بيانات أو سلوك محاكى | admin-app/source_files/Part1.jsx | 1263 | <StatCard label="مرفوضة" value={MOCK.insurance_claims.filter(c=>c.status==="rejected").length} color={T.red} icon="❌" /> |
| admin-app | بيانات أو سلوك محاكى | admin-app/source_files/Part1.jsx | 1276 | ]} data={MOCK.insurance_claims} onRowAction={r=><Btn small variant="primary" onClick={()=>{ setDrawer(r); setCopayPercent(String(r.copay_percent)); }}>معالجة</Btn>} /> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part1.jsx | 1314 | <FormRow label="ملاحظة"><Textarea placeholder="ملاحظة للمطالبة..." value="" onChange={()=>{}} rows={2} /></FormRow> |
| admin-app | بيانات أو سلوك محاكى | admin-app/source_files/Part1.jsx | 1337 | <StatCard label="تراخيص سارية" value={MOCK.compliance.filter(c=>c.status==="valid").length} color={T.green} icon="✅" /> |
| admin-app | بيانات أو سلوك محاكى | admin-app/source_files/Part1.jsx | 1338 | <StatCard label="تنتهي خلال 30 يوم" value={MOCK.compliance.filter(c=>c.status==="expiring_soon").length} color={T.orange} icon="⚠️" /> |
| admin-app | بيانات أو سلوك محاكى | admin-app/source_files/Part1.jsx | 1339 | <StatCard label="منتهية الصلاحية!" value={MOCK.compliance.filter(c=>c.status==="expired").length} color={T.red} icon="❌" /> |
| admin-app | بيانات أو سلوك محاكى | admin-app/source_files/Part1.jsx | 1353 | ]} data={MOCK.compliance} onRowAction={r=><> |
| admin-app | بيانات أو سلوك محاكى | admin-app/source_files/Part1.jsx | 1374 | {MOCK.transport.filter(t=>t.type==="courier").map(t=>( |
| admin-app | بيانات أو سلوك محاكى | admin-app/source_files/Part1.jsx | 1388 | {MOCK.transport.filter(t=>t.type==="provider_transport").map(t=>( |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part1.jsx | 1400 | <FormRow label="اسم الشركة" required><Input placeholder="اسم الشركة" value="" onChange={()=>{}} full /></FormRow> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part1.jsx | 1402 | <FormRow label="المدن المغطاة"><Input placeholder="الرياض، جدة، الدمام..." value="" onChange={()=>{}} full /></FormRow> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part1.jsx | 1403 | <FormRow label="نسبة العمولة (%)"><Input type="number" placeholder="5" value="" onChange={()=>{}} /></FormRow> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part1.jsx | 1404 | <FormRow label="معلومات التواصل / API Endpoint"><Input placeholder="+966XXXXXXXXX أو رابط API" value="" onChange={()=>{}} full /></FormRow> |
| admin-app | بيانات أو سلوك محاكى | admin-app/source_files/Part1.jsx | 1419 | <SectionHeader title="💉 خدمات التمريض المنزلي المعتمدة" subtitle={\`${MOCK.nursing_services.length} خدمات تمريضية\`} actions={[ |
| admin-app | بيانات أو سلوك محاكى | admin-app/source_files/Part1.jsx | 1437 | ]} data={MOCK.nursing_services} onRowAction={()=><><Btn small variant="primary">تعديل</Btn><Btn small variant="danger">حذف</Btn></>} /> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part1.jsx | 1440 | <FormRow label="اسم الخدمة" required><Input placeholder="مثال: تغيير الجروح والضمادات" value="" onChange={()=>{}} full /></FormRow> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part1.jsx | 1443 | <FormRow label="السعر الأساسي (ر)" required><Input type="number" placeholder="150" value="" onChange={()=>{}} /></FormRow> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part1.jsx | 1445 | <FormRow label="مدة الخدمة (دقيقة)"><Input type="number" placeholder="30" value="" onChange={()=>{}} /></FormRow> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part1.jsx | 1451 | <FormRow label="ملاحظات للمريض" hint="تُعرض للمريض عند اختيار الخدمة"><Textarea placeholder="مثال: هذه الخدمة تشمل أجر يد الممرض فقط..." value="" onChange={()=>{}} rows={2} /></FormRow> |
| admin-app | بيانات أو سلوك محاكى | admin-app/source_files/Part1.jsx | 1467 | <SectionHeader title="🩺 التخصصات والدرجات العلمية" subtitle={\`${MOCK.specialties.length} تخصص مسجل — مستوحى من SCFHS\`} actions={[ |
| admin-app | بيانات أو سلوك محاكى | admin-app/source_files/Part1.jsx | 1493 | ]} data={MOCK.specialties} onRowAction={()=><><Btn small variant="primary">تعديل</Btn><Btn small variant="danger">حذف</Btn></>} /> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part1.jsx | 1497 | <FormRow label="الاسم العربي" required><Input placeholder="طب الأعصاب" value="" onChange={()=>{}} full /></FormRow> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part1.jsx | 1498 | <FormRow label="الاسم الإنجليزي" required><Input placeholder="Neurology" value="" onChange={()=>{}} full /></FormRow> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part1.jsx | 1499 | <FormRow label="أيقونة (Emoji)" required><Input placeholder="🧠" value="" onChange={()=>{}} /></FormRow> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part1.jsx | 1500 | <FormRow label="كود SCFHS"><Input placeholder="NEUR" value="" onChange={()=>{}} /></FormRow> |
| admin-app | بيانات أو سلوك محاكى | admin-app/source_files/Part1.jsx | 1520 | <SectionHeader title="🧪 قاعدة بيانات التحاليل" subtitle={\`${MOCK.lab_tests.length} تحليل مسجل\`} actions={[ |
| admin-app | بيانات أو سلوك محاكى | admin-app/source_files/Part1.jsx | 1535 | ]} data={MOCK.lab_tests} onRowAction={r=><> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part1.jsx | 1567 | <FormRow label="اسم التحليل" required><Input placeholder="CBC - صورة دم كاملة" value="" onChange={()=>{}} full /></FormRow> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part1.jsx | 1568 | <FormRow label="الفئة" required><Input placeholder="دم / سكري / هرمونات..." value="" onChange={()=>{}} full /></FormRow> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part1.jsx | 1569 | <FormRow label="السعر المرجعي (ر)" required><Input type="number" placeholder="80" value="" onChange={()=>{}} /></FormRow> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part1.jsx | 1570 | <FormRow label="وقت إصدار النتيجة" required><Input placeholder="2 ساعة" value="" onChange={()=>{}} /></FormRow> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part1.jsx | 1571 | <FormRow label="ساعات الصيام (إن وجد)"><Input type="number" placeholder="0 = لا يلزم صيام" value="" onChange={()=>{}} /></FormRow> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part1.jsx | 1577 | <Textarea placeholder="مثال: صيام كامل 12 ساعة عن الأكل والشرب عدا الماء. توقف عن مميعات الدم 24 ساعة قبل الفحص باستشارة طبيبك." value="" onChange={()=>{}} /> |
| admin-app | بيانات أو سلوك محاكى | admin-app/source_files/Part1.jsx | 1594 | <SectionHeader title="💉 قاعدة بيانات الأدوية" subtitle={\`${MOCK.medicines.length} دواء مسجل\`} actions={[ |
| admin-app | بيانات أو سلوك محاكى | admin-app/source_files/Part1.jsx | 1597 | <Btn key="s" variant="warning" onClick={()=>{}} icon="⚠️">نواقص السوق ({MOCK.market_shortage.length})</Btn>, |
| admin-app | بيانات أو سلوك محاكى | admin-app/source_files/Part1.jsx | 1611 | ]} data={MOCK.medicines} onRowAction={r=><> |
| admin-app | بيانات أو سلوك محاكى | admin-app/source_files/Part1.jsx | 1623 | const alt = MOCK.medicines.find(m=>m.id===id); |
| admin-app | بيانات أو سلوك محاكى | admin-app/source_files/Part1.jsx | 1640 | <Sel options={[{value:"",label:"اختر دواء بديل"},...MOCK.medicines.filter(m=>m.id!==altModal?.id).map(m=>({value:m.id,label:\`${m.name_ar} (${m.brand}) — ${m.active_ingredient}\`}))]} value="" onChange={()=>{}} /> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part1.jsx | 1652 | <FormRow label="الاسم العربي" required><Input placeholder="باراسيتامول" value="" onChange={()=>{}} full /></FormRow> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part1.jsx | 1653 | <FormRow label="الاسم العلمي (Generic)" required><Input placeholder="Paracetamol" value="" onChange={()=>{}} full /></FormRow> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part1.jsx | 1654 | <FormRow label="العلامة التجارية (Brand)" required><Input placeholder="بنادول" value="" onChange={()=>{}} full /></FormRow> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part1.jsx | 1655 | <FormRow label="المادة الفعالة والتركيز" required><Input placeholder="Paracetamol 500mg" value="" onChange={()=>{}} full /></FormRow> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part1.jsx | 1659 | <FormRow label="السعر المرجعي (ر)"><Input type="number" placeholder="15" value="" onChange={()=>{}} /></FormRow> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part1.jsx | 1660 | <FormRow label="رقم التسجيل الصحي"><Input placeholder="SA-XXXX-XXXX" value="" onChange={()=>{}} full /></FormRow> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part1.jsx | 1685 | <div style={{ flex:1, minWidth:200 }}><Input placeholder="🔍 بحث..." value="" onChange={()=>{}} full /></div> |
| admin-app | بيانات أو سلوك محاكى | admin-app/source_files/Part1.jsx | 1692 | {MOCK.audit_logs.map(log=>( |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part1.jsx | 1717 | // ── PLACEHOLDER ────────────────────────────────────────────── |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part1.jsx | 1906 | <Input placeholder="🔍 ابحث عن مريض، مزود، دواء، طلب، تحليل..." value={searchQuery} onChange={setSearchQuery} full /> |
| admin-app | بيانات أو سلوك محاكى | admin-app/source_files/Part1.jsx | 1909 | {MOCK.providers.filter(p=>p.name.includes(searchQuery)).map(p=>( |
| admin-app | بيانات أو سلوك محاكى | admin-app/source_files/Part1.jsx | 1919 | {MOCK.patients.filter(p=>p.name.includes(searchQuery)).map(p=>( |
| admin-app | بيانات أو سلوك محاكى | admin-app/source_files/Part1.jsx | 1929 | {MOCK.medicines.filter(m=>m.name_ar.includes(searchQuery)\|\|m.generic.toLowerCase().includes(searchQuery.toLowerCase())).map(m=>( |
| admin-app | بيانات أو سلوك محاكى | admin-app/source_files/Part1.jsx | 1939 | {[...MOCK.providers,...MOCK.patients,...MOCK.medicines].filter(x=>(x.name\|\|x.name_ar\|\|"").includes(searchQuery)).length===0&&( |
| admin-app | معرف ثابت مرشح للمراجعة | admin-app/source_files/Part2.jsx | 19 | { id:"ORD-8821", patient:"أحمد الزهراني", provider:"مختبر الدقة", type:"Lab", subtype:"سحب منزلي", status:"in_progress", amount:320, time:"10:24", assigned:"فني سامي", priority:"normal", broadcast_radius:4 }, |
| admin-app | معرف ثابت مرشح للمراجعة | admin-app/source_files/Part2.jsx | 20 | { id:"ORD-8820", patient:"سارة العتيبي", provider:null, type:"Doctor", subtype:"كشف منزلي", status:"broadcasting", amount:180, time:"10:18", assigned:null, priority:"urgent", broadcast_radius:4 }, |
| admin-app | معرف ثابت مرشح للمراجعة | admin-app/source_files/Part2.jsx | 21 | { id:"ORD-8819", patient:"فاطمة الدوسري", provider:"صيدلية النهدي", type:"Pharmacy", subtype:"توصيل أدوية", status:"pending_payment", amount:95, time:"10:05", assigned:"مندوب خالد", priority:"normal", broadcast_radius:4 }, |
| admin-app | معرف ثابت مرشح للمراجعة | admin-app/source_files/Part2.jsx | 22 | { id:"ORD-8818", patient:"خالد المطيري", provider:"مركز النبض", type:"Nursing", subtype:"غيار جرح", status:"completed", amount:450, time:"09:45", assigned:"ممرضة نورا", priority:"normal", broadcast_radius:4 }, |
| admin-app | معرف ثابت مرشح للمراجعة | admin-app/source_files/Part2.jsx | 23 | { id:"ORD-8817", patient:"أحمد الزهراني", provider:null, type:"Pharmacy", subtype:"روشتة OCR", status:"pending_approval",amount:0, time:"09:30", assigned:null, priority:"normal", broadcast_radius:6 }, |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part2.jsx | 141 | <textarea rows={2} placeholder="لماذا تتدخل يدوياً؟" style={{background:"#10121c",border:"1px solid #1a1c2e",color:"#e8eaf6",borderRadius:8,padding:"10px 14px",fontSize:13,fontFamily:"'Cairo',sans-serif",outline:"none",width:"100%",resize:"none"}}/> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part2.jsx | 188 | <input placeholder="🔍 بحث بالاسم أو النوع..." value={search} onChange={e=>setSearch(e.target.value)} style={{flex:1,minWidth:200,background:"#10121c",border:"1px solid #1a1c2e",color:"#e8eaf6",borderRadius:8,padding:"10px 14px",fontSize:13,fontFamily:"'Cairo' |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part2.jsx | 311 | <input placeholder="🔍 بحث بالاسم أو الجوال..." value={search} onChange={e=>setSearch(e.target.value)} style={{width:"100%",background:"#10121c",border:"1px solid #1a1c2e",color:"#e8eaf6",borderRadius:8,padding:"10px 14px",fontSize:13,fontFamily:"'Cairo',sans- |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part2.jsx | 372 | <textarea rows={3} placeholder="ملاحظة داخلية..." style={{width:"100%",background:"#10121c",border:"1px solid #1a1c2e",color:"#e8eaf6",borderRadius:8,padding:"10px 14px",fontSize:13,fontFamily:"'Cairo',sans-serif",outline:"none",resize:"none",boxSizing:"border |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part2.jsx | 443 | <input type={t} placeholder={p} style={{width:"100%",background:"#10121c",border:"1px solid #1a1c2e",color:"#e8eaf6",borderRadius:8,padding:"10px 14px",fontSize:13,fontFamily:"'Cairo',sans-serif",outline:"none",boxSizing:"border-box"}}/> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part2.jsx | 469 | <input type="number" placeholder="مبلغ الغرامة (ر)" style={{width:"100%",background:"#10121c",border:"1px solid #1a1c2e",color:"#e8eaf6",borderRadius:8,padding:"10px 14px",fontSize:13,fontFamily:"'Cairo',sans-serif",outline:"none",boxSizing:"border-box",margin |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part2.jsx | 845 | <input type={t} placeholder={p} style={{width:"100%",background:"#10121c",border:"1px solid #1a1c2e",color:"#e8eaf6",borderRadius:8,padding:"10px 14px",fontSize:13,fontFamily:"'Cairo',sans-serif",outline:"none",boxSizing:"border-box"}}/> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part2.jsx | 1020 | <input type={t} placeholder={p} style={{width:"100%",background:"#10121c",border:"1px solid #1a1c2e",color:"#e8eaf6",borderRadius:8,padding:"10px 14px",fontSize:13,fontFamily:"'Cairo',sans-serif",outline:"none",boxSizing:"border-box"}}/> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part3.jsx | 30 | const Inp = ({placeholder,value,onChange,type="text",full})=>( |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part3.jsx | 31 | <input type={type} placeholder={placeholder} value={value\|\|""} onChange={e=>onChange(e.target.value)} style={{background:C.s2,border:\`1px solid ${C.border}\`,color:C.text,borderRadius:8,padding:"10px 14px",fontSize:13,fontFamily:"'Cairo',sans-serif",outline |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part3.jsx | 180 | <FR label="الاسم الكامل" req><Inp placeholder="د. الاسم الكامل" value="" onChange={()=>{}} full/></FR> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part3.jsx | 181 | <FR label="رقم SCFHS" req><Inp placeholder="SCFHS-DR-XXXX" value="" onChange={()=>{}} full/></FR> |
| admin-app | معرف ثابت مرشح للمراجعة | admin-app/source_files/Part3.jsx | 255 | {id:"TX001",user:"أحمد الزهراني",user_type:"patient",type:"payment",amount:320,method:"visa",order:"ORD-8821",date:"2025-05-28 10:24",status:"success"}, |
| admin-app | معرف ثابت مرشح للمراجعة | admin-app/source_files/Part3.jsx | 256 | {id:"TX002",user:"سارة العتيبي",user_type:"patient",type:"refund",amount:180,method:"wallet",order:"ORD-8800",date:"2025-05-28 09:15",status:"success"}, |
| admin-app | معرف ثابت مرشح للمراجعة | admin-app/source_files/Part3.jsx | 259 | {id:"TX005",user:"خالد المطيري",user_type:"patient",type:"payment",amount:95,method:"visa",order:"ORD-8790",date:"2025-05-27 18:45",status:"failed"}, |
| admin-app | معرف ثابت مرشح للمراجعة | admin-app/source_files/Part3.jsx | 260 | {id:"TX006",user:"مختبر الدقة",user_type:"provider",type:"earning",amount:2840,method:"internal",order:"ORD-8821,8810",date:"2025-05-27 23:59",status:"success"}, |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part3.jsx | 344 | <FR label="الكيان (اسم / رقم هاتف / IP)" req><Inp placeholder="الاسم أو الرقم أو العنوان" value="" onChange={()=>{}} full/></FR> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part3.jsx | 347 | <textarea placeholder="اكتب سبب الحظر بوضوح..." rows={3} style={{width:"100%",background:C.s2,border:\`1px solid ${C.border}\`,color:C.text,borderRadius:8,padding:"10px 14px",fontSize:13,fontFamily:"'Cairo',sans-serif",outline:"none",resize:"none",boxSizing:"b |
| admin-app | معرف ثابت مرشح للمراجعة | admin-app/source_files/Part3.jsx | 405 | {id:"ORD-8821",patient:"أحمد الزهراني",provider:"مختبر الدقة",type:"Lab",subtype:"سحب منزلي",status:"in_progress",amount:320,time:"10:24",assigned:"فني سامي",priority:"normal",broadcast_radius:4}, |
| admin-app | معرف ثابت مرشح للمراجعة | admin-app/source_files/Part3.jsx | 406 | {id:"ORD-8820",patient:"سارة العتيبي",provider:null,type:"Doctor",subtype:"كشف منزلي",status:"broadcasting",amount:180,time:"10:18",assigned:null,priority:"urgent",broadcast_radius:4}, |
| admin-app | معرف ثابت مرشح للمراجعة | admin-app/source_files/Part3.jsx | 407 | {id:"ORD-8819",patient:"فاطمة الدوسري",provider:"صيدلية النهدي",type:"Pharmacy",subtype:"توصيل أدوية",status:"pending_payment",amount:95,time:"10:05",assigned:"مندوب خالد",priority:"normal",broadcast_radius:4}, |
| admin-app | معرف ثابت مرشح للمراجعة | admin-app/source_files/Part3.jsx | 408 | {id:"ORD-8818",patient:"خالد المطيري",provider:"مركز النبض",type:"Nursing",subtype:"غيار جرح",status:"completed",amount:450,time:"09:45",assigned:"ممرضة نورا",priority:"normal",broadcast_radius:4}, |
| admin-app | معرف ثابت مرشح للمراجعة | admin-app/source_files/Part3.jsx | 409 | {id:"ORD-8817",patient:"أحمد الزهراني",provider:null,type:"Pharmacy",subtype:"روشتة OCR",status:"pending_approval",amount:0,time:"09:30",assigned:null,priority:"normal",broadcast_radius:6}, |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part3.jsx | 444 | <textarea rows={2} placeholder="سبب التدخل..." style={{width:"100%",background:C.s2,border:\`1px solid ${C.border}\`,color:C.text,borderRadius:8,padding:"10px 14px",fontSize:13,fontFamily:"'Cairo',sans-serif",outline:"none",resize:"none",boxSizing:"border-box" |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part3.jsx | 498 | <FR label="تغيير الطبيب"><Inp placeholder="ابحث عن طبيب..." value="" onChange={()=>{}} full/></FR> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part3.jsx | 500 | <textarea rows={2} placeholder="سبب التعديل..." style={{width:"100%",background:C.s2,border:\`1px solid ${C.border}\`,color:C.text,borderRadius:8,padding:"10px 14px",fontSize:13,fontFamily:"'Cairo',sans-serif",outline:"none",resize:"none",boxSizing:"border-box |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part3.jsx | 565 | <FR label="المريض" req><Inp placeholder="ابحث بالاسم أو ID" value="" onChange={()=>{}} full/></FR> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part3.jsx | 568 | <FR label="سبب التحويل" req><Inp placeholder="مثال: تحاليل متخصصة" value="" onChange={()=>{}} full/></FR> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part3.jsx | 614 | <input value={msg} onChange={e=>setMsg(e.target.value)} placeholder="رسالة من النظام للطرفين..." style={{flex:1,background:C.s2,border:\`1px solid ${C.border}\`,color:C.text,borderRadius:8,padding:"10px 14px",fontSize:13,fontFamily:"'Cairo',sans-serif",outline |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part3.jsx | 769 | <textarea rows={3} placeholder="رسالة للمستخدم..." style={{width:"100%",background:C.s2,border:\`1px solid ${C.border}\`,color:C.text,borderRadius:8,padding:"10px 14px",fontSize:13,fontFamily:"'Cairo',sans-serif",outline:"none",resize:"none",boxSizing:"border- |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part3.jsx | 824 | <FR label="عنوان المهمة" req><Inp placeholder="وصف المهمة" value="" onChange={()=>{}} full/></FR> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part3.jsx | 828 | <FR label="الوسوم (مفصولة بفاصلة)"><Inp placeholder="KYC، مالية، شكوى..." value="" onChange={()=>{}} full/></FR> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part3.jsx | 866 | <FR label="اسم الخدمة" req><Inp placeholder="استشارة طبية أونلاين" value="" onChange={()=>{}} full/></FR> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part3.jsx | 872 | <FR label="الوصف"><textarea rows={3} placeholder="وصف الخدمة..." style={{width:"100%",background:C.s2,border:\`1px solid ${C.border}\`,color:C.text,borderRadius:8,padding:"10px 14px",fontSize:13,fontFamily:"'Cairo',sans-serif",outline:"none",resize:"none",boxS |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part3.jsx | 909 | <FR label="نوع الأشعة" req><Inp placeholder="مثال: PET Scan" value="" onChange={()=>{}} full/></FR> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part3.jsx | 912 | <FR label="وقت إصدار النتيجة" req><Inp placeholder="فوري / ساعة / يوم" value="" onChange={()=>{}} full/></FR> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part3.jsx | 914 | <FR label="متطلبات التحضير"><textarea rows={2} placeholder="تعليمات التحضير للمريض..." style={{width:"100%",background:C.s2,border:\`1px solid ${C.border}\`,color:C.text,borderRadius:8,padding:"10px 14px",fontSize:13,fontFamily:"'Cairo',sans-serif",outline:"no |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part3.jsx | 1040 | <FR label="اسم الشركة" req><Inp placeholder="بوبا العربية" value="" onChange={()=>{}} full/></FR> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part3.jsx | 1041 | <FR label="رقم ترخيص SAMA" req><Inp placeholder="SAMA-INS-XXX" value="" onChange={()=>{}} full/></FR> |
| admin-app | معرف ثابت مرشح للمراجعة | admin-app/source_files/Part3.jsx | 1091 | {id:"RF001",patient:"أحمد الزهراني",order:"ORD-8800",amount:180,reason:"إلغاء قبل الموعد",status:"pending",date:"2025-05-27",method:"wallet"}, |
| admin-app | معرف ثابت مرشح للمراجعة | admin-app/source_files/Part3.jsx | 1092 | {id:"RF002",patient:"سارة العتيبي",order:"ORD-8790",amount:95,reason:"خطأ في الفاتورة",status:"approved",date:"2025-05-26",method:"visa"}, |
| admin-app | معرف ثابت مرشح للمراجعة | admin-app/source_files/Part3.jsx | 1093 | {id:"RF003",patient:"فاطمة الدوسري",order:"ORD-8750",amount:320,reason:"جودة الخدمة",status:"rejected",date:"2025-05-25",method:"mada"}, |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part3.jsx | 1116 | <FR label="المريض / رقم الطلب" req><Inp placeholder="ابحث بالاسم أو رقم الطلب" value="" onChange={()=>{}} full/></FR> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part3.jsx | 1117 | <FR label="المبلغ (ر)" req><Inp type="number" placeholder="0.00" value="" onChange={()=>{}} full/></FR> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part3.jsx | 1120 | <FR label="ملاحظة"><Inp placeholder="ملاحظة اختيارية" value="" onChange={()=>{}} full/></FR> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part3.jsx | 1164 | <FR label="كود الكوبون" req><Inp placeholder="WELCOME20" value="" onChange={()=>{}} full/></FR> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part3.jsx | 1166 | <FR label="قيمة الخصم" req><Inp type="number" placeholder="20" value="" onChange={()=>{}} full/></FR> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part3.jsx | 1168 | <FR label="أدنى قيمة طلب (ر)"><Inp type="number" placeholder="100" value="" onChange={()=>{}} full/></FR> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part3.jsx | 1169 | <FR label="أقصى عدد استخدامات"><Inp type="number" placeholder="500" value="" onChange={()=>{}} full/></FR> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part3.jsx | 1173 | <FR label="شروط الاستخدام"><textarea rows={2} placeholder="شروط وقيود الكوبون..." style={{width:"100%",background:C.s2,border:\`1px solid ${C.border}\`,color:C.text,borderRadius:8,padding:"10px 14px",fontSize:13,fontFamily:"'Cairo',sans-serif",outline:"none",r |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part3.jsx | 1222 | <FR label="شروط خاصة"><textarea rows={3} placeholder="أي شروط إضافية..." style={{width:"100%",background:C.s2,border:\`1px solid ${C.border}\`,color:C.text,borderRadius:8,padding:"10px 14px",fontSize:13,fontFamily:"'Cairo',sans-serif",outline:"none",resize:"no |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part3.jsx | 1359 | <FR label="الطاقة الاستيعابية"><Inp type="number" placeholder="30" value="" onChange={()=>{}} full/></FR> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part3.jsx | 1460 | <FR label="عنوان البانر" req><Inp placeholder="عروض رمضان 30%" value="" onChange={()=>{}} full/></FR> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part3.jsx | 1462 | <FR label="رابط الصورة" req><Inp placeholder="https://..." value="" onChange={()=>{}} full/></FR> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part3.jsx | 1463 | <FR label="الرابط عند الضغط"><Inp placeholder="https://... (اختياري)" value="" onChange={()=>{}} full/></FR> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part3.jsx | 1550 | <FR label="اسم القاعدة" req><Inp placeholder="تنبيه عدم الإسناد" value="" onChange={()=>{}} full/></FR> |
| admin-app | عقد أو قدرة غير منفذة | admin-app/source_files/Part3.jsx | 1553 | <FR label="المشغّل (قيمة)"><Inp type="number" placeholder="10" value="" onChange={()=>{}} full/></FR> |
| admin-app | بيانات أو سلوك محاكى | admin-app/source_files/Part3.jsx | 1585 | {/* Map Simulation */} |
| admin-app | عنوان تطوير محلي | admin-app/web-admin/src/pages/admin/audit-logs.tsx | 25 | const API_BASE = process.env.NEXT_PUBLIC_API_URL \|\| 'http://localhost:8002'; |
| admin-app | عنوان تطوير محلي | admin-app/web-admin/src/pages/admin/config-portal.tsx | 21 | const API_BASE = process.env.NEXT_PUBLIC_API_URL \|\| 'http://localhost:8002'; |
| admin-app | عنوان تطوير محلي | admin-app/web-admin/src/pages/admin/config-portal.tsx | 52 | const API_BASE = process.env.NEXT_PUBLIC_API_URL \|\| 'http://localhost:8002'; |
| admin-app | عنوان تطوير محلي | admin-app/web-admin/src/pages/admin/config-portal.tsx | 74 | const API_BASE = process.env.NEXT_PUBLIC_API_URL \|\| 'http://localhost:8002'; |
| admin-app | عنوان تطوير محلي | admin-app/web-admin/src/pages/admin/dashboard.tsx | 28 | const API_BASE = process.env.NEXT_PUBLIC_API_URL \|\| 'http://localhost:8002'; |
| admin-app | بيانات أو سلوك محاكى | admin-app/web-admin/src/pages/admin/dashboard.tsx | 63 | // Simulate polling every 30 seconds |
| admin-app | عنوان تطوير محلي | admin-app/web-admin/src/pages/admin/disputes.tsx | 28 | const API_BASE = process.env.NEXT_PUBLIC_API_URL \|\| 'http://localhost:8002'; |
| admin-app | عنوان تطوير محلي | admin-app/web-admin/src/pages/admin/disputes.tsx | 46 | const API_BASE = process.env.NEXT_PUBLIC_API_URL \|\| 'http://localhost:8002'; |
| admin-app | عنوان تطوير محلي | admin-app/web-admin/src/pages/admin/financial-ledger.tsx | 40 | const API_BASE = process.env.NEXT_PUBLIC_API_URL \|\| 'http://localhost:8002'; |
| admin-app | عنوان تطوير محلي | admin-app/web-admin/src/pages/admin/financial-ledger.tsx | 88 | const API_BASE = process.env.NEXT_PUBLIC_API_URL \|\| 'http://localhost:8002'; |
| admin-app | عنوان تطوير محلي | admin-app/web-admin/src/pages/admin/financial-ledger.tsx | 111 | const API_BASE = process.env.NEXT_PUBLIC_API_URL \|\| 'http://localhost:8002'; |
| admin-app | عقد أو قدرة غير منفذة | admin-app/web-admin/src/pages/admin/financial-ledger.tsx | 282 | placeholder="0.00" |
| admin-app | عنوان تطوير محلي | admin-app/web-admin/src/pages/admin/fraud-monitoring.tsx | 33 | const API_BASE = process.env.NEXT_PUBLIC_API_URL \|\| 'http://localhost:8002'; |
| admin-app | عنوان تطوير محلي | admin-app/web-admin/src/pages/admin/payouts.tsx | 27 | const API_BASE = process.env.NEXT_PUBLIC_API_URL \|\| 'http://localhost:8002'; |
| admin-app | عنوان تطوير محلي | admin-app/web-admin/src/pages/admin/payouts.tsx | 46 | const API_BASE = process.env.NEXT_PUBLIC_API_URL \|\| 'http://localhost:8002'; |
| admin-app | عنوان تطوير محلي | admin-app/web-admin/src/pages/admin/provider-moderation.tsx | 39 | const API_BASE = process.env.NEXT_PUBLIC_API_URL \|\| 'http://localhost:8002'; |
| admin-app | عنوان تطوير محلي | admin-app/web-admin/src/pages/admin/provider-moderation.tsx | 65 | const API_BASE = process.env.NEXT_PUBLIC_API_URL \|\| 'http://localhost:8002'; |
| admin-app | عنوان تطوير محلي | admin-app/web-admin/src/pages/admin/provider-moderation.tsx | 81 | const API_BASE = process.env.NEXT_PUBLIC_API_URL \|\| 'http://localhost:8002'; |
| admin-app | عنوان تطوير محلي | admin-app/web-admin/src/pages/admin/provider-moderation.tsx | 101 | const API_BASE = process.env.NEXT_PUBLIC_API_URL \|\| 'http://localhost:8002'; |
| admin-app | عقد أو قدرة غير منفذة | admin-app/web-admin/src/pages/admin/provider-moderation.tsx | 296 | placeholder="الرجاء إدخال سبب الإيقاف أو أكواد الرفض (Reason Codes)..." |
| admin-app | عقد أو قدرة غير منفذة | admin-app/web-admin/src/pages/admin/users-management.tsx | 48 | placeholder="بحث بالاسم أو رقم الهاتف..." |
| admin-app | عنوان تطوير محلي | admin-app/web-admin/src/utils/api.ts | 26 | const API_BASE = process.env.NEXT_PUBLIC_API_URL \|\| 'http://localhost:8002'; |
| backend | عنوان تطوير محلي | backend/infra/fastapi/ai_routes.py | 103 | r = await c.get(f"http://localhost:8002/api/medicines/autocomplete", params={"q": q}) |
| backend | عنوان تطوير محلي | backend/infra/fastapi/nestjs_proxy.py | 3 | Forwards any request matching /api/v2/* to the NestJS Core backend at http://localhost:8002/api/*. |
| backend | عنوان تطوير محلي | backend/infra/fastapi/nestjs_proxy.py | 11 | NEST_BASE = "http://localhost:8002/api" |
| backend | زرع أو بيانات تهيئة | backend/infra/fastapi/seed_data.py | 2 | Comprehensive seed data for Nabd Healthcare Platform - Saudi Arabia |
| backend | زرع أو بيانات تهيئة | backend/infra/fastapi/seed_data.py | 245 | # ============== SAMPLE DOCTORS (Realistic Seed) ============== |
| backend | زرع أو بيانات تهيئة | backend/infra/fastapi/seed_data.py | 385 | # ============== SAMPLE PHARMACIES ============== |
| backend | زرع أو بيانات تهيئة | backend/infra/fastapi/seed_data.py | 429 | # ============== SAMPLE PRODUCTS (Medicines, Skin, Hair, Baby) ============== |
| backend | زرع أو بيانات تهيئة | backend/infra/fastapi/server.py | 246 | # ============================ STARTUP / SEED ============================ |
| backend | عنوان تطوير محلي | backend/scripts/seed_test_providers.js | 5 | const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb://localhost:27017/nabdah'; |
| backend | زرع أو بيانات تهيئة | backend/scripts/seed_test_providers.js | 19 | async function seed() { |
| backend | زرع أو بيانات تهيئة | backend/scripts/seed_test_providers.js | 42 | seed().catch(e => { |
| backend | زرع أو بيانات تهيئة | backend/scripts/seed-medicines.js | 3 | async function seed() { |
| backend | عنوان تطوير محلي | backend/scripts/seed-medicines.js | 4 | const uri = 'mongodb://localhost:27017/nabd'; |
| backend | بيانات أو سلوك محاكى | backend/scripts/seed-medicines.js | 26 | image: "https://pub-XXXX.r2.dev/panadol.jpg", // Mock R2 URL |
| backend | بيانات أو سلوك محاكى | backend/scripts/seed-medicines.js | 43 | image: "https://pub-XXXX.r2.dev/vitaminc.jpg", // Mock R2 URL |
| backend | بيانات أو سلوك محاكى | backend/scripts/seed-medicines.js | 60 | image: "https://pub-XXXX.r2.dev/augmentin.jpg", // Mock R2 URL |
| backend | بيانات أو سلوك محاكى | backend/scripts/seed-medicines.js | 77 | image: "https://pub-XXXX.r2.dev/brufen.jpg", // Mock R2 URL |
| backend | زرع أو بيانات تهيئة | backend/scripts/seed-medicines.js | 99 | seed(); |
| backend | زرع أو بيانات تهيئة | backend/scripts/test-extensions.ts | 10 | // Import schemas to seed/clean |
| backend | زرع أو بيانات تهيئة | backend/scripts/test-extensions.ts | 34 | // Retrieve Mongoose models to seed test database |
| backend | زرع أو بيانات تهيئة | backend/scripts/test-extensions.ts | 71 | // Seed Patient User |
| backend | زرع أو بيانات تهيئة | backend/scripts/test-extensions.ts | 81 | // Seed MedicalProfile details |
| backend | زرع أو بيانات تهيئة | backend/scripts/test-extensions.ts | 89 | // Seed Pharmacy Provider |
| backend | زرع أو بيانات تهيئة | backend/scripts/test-extensions.ts | 99 | // Seed Nurse Provider |
| backend | زرع أو بيانات تهيئة | backend/scripts/test-extensions.ts | 109 | // Seed Inventory |
| backend | زرع أو بيانات تهيئة | backend/scripts/test-extensions.ts | 118 | // Seed HomeCare visit |
| backend | زرع أو بيانات تهيئة | backend/scripts/test-extensions.ts | 126 | // Seed Lab Sample |
| backend | زرع أو بيانات تهيئة | backend/scripts/test-extensions.ts | 139 | // Seed Corporate Account |
| backend | بيانات أو سلوك محاكى | backend/scripts/test-extensions.ts | 217 | // Add mock clinical data |
| backend | زرع أو بيانات تهيئة | backend/src/app.module.ts | 32 | import { SeedModule } from './modules/seed/seed.module'; |
| backend | عنوان تطوير محلي | backend/src/app.module.ts | 119 | uri: process.env.MONGO_URL \|\| 'mongodb://localhost:27017', |
| backend | عنوان تطوير محلي | backend/src/app.module.ts | 129 | host: process.env.REDIS_HOST \|\| 'localhost', |
| backend | عنوان تطوير محلي | backend/src/modules/admin-web-core/controllers/admin-governance.controller.ts | 19 | // this.redisClient = new Redis(process.env.REDIS_URL \|\| 'redis://localhost:6379'); |
| backend | بيانات أو سلوك محاكى | backend/src/modules/care/appointments.controller.ts | 77 | // We will simulate the atomic sequence here for the V3.0 integration |
| backend | زرع أو بيانات تهيئة | backend/src/modules/care/slot.service.ts | 20 | // Day-of-week mapping used in seed data |
| backend | زرع أو بيانات تهيئة | backend/src/modules/consistency/consistency.module.ts | 62 | const sample = async (model: Model<any>, label: string, ownerField = 'patient_id') => { |
| backend | زرع أو بيانات تهيئة | backend/src/modules/consistency/consistency.module.ts | 70 | ...await sample(this.orders, 'pharmacy'), |
| backend | زرع أو بيانات تهيئة | backend/src/modules/consistency/consistency.module.ts | 71 | ...await sample(this.labs, 'lab'), |
| backend | زرع أو بيانات تهيئة | backend/src/modules/consistency/consistency.module.ts | 72 | ...await sample(this.rads, 'radiology'), |
| backend | زرع أو بيانات تهيئة | backend/src/modules/consistency/consistency.module.ts | 73 | ...await sample(this.home, 'nursing'), |
| backend | زرع أو بيانات تهيئة | backend/src/modules/consistency/consistency.module.ts | 74 | ...await sample(this.appts, 'consultation'), |
| backend | زرع أو بيانات تهيئة | backend/src/modules/doctors/doctors.module.ts | 75 | const sample: any = await this.doctors.findOne({ specialty: sp }, { specialty_ar: 1 }).lean(); |
| backend | زرع أو بيانات تهيئة | backend/src/modules/doctors/doctors.module.ts | 77 | out.push({ key: sp, label_ar: sample?.specialty_ar \|\| sp, count }); |
| backend | عقد أو قدرة غير منفذة | backend/src/modules/home-care/home-care.controller.ts | 319 | // Dynamically calculate from real bookings (Zero Placeholder validation) |
| backend | زرع أو بيانات تهيئة | backend/src/modules/home-care/home-care.module.ts | 9 | import { HOME_CARE_SEED } from './home-care.seed'; |
| backend | عقد أو قدرة غير منفذة | backend/src/modules/i18n/i18n.service.ts | 78 | 'svc.coming_soon': { ar: 'قريباً', en: 'Coming soon', ur: 'جلد آرہا ہے' }, |
| backend | عقد أو قدرة غير منفذة | backend/src/modules/i18n/i18n.service.ts | 80 | 'coming_soon.body': { ar: 'هذه الخدمة قيد التطوير وستكون متاحة قريباً ضمن منظومة نبض الصحية الموحّدة. سنبلغك فور إطلاقها.', en: 'This service is coming soon as part of the unified Nabd Healthcare ecosystem. We will notify you on launch.', ur: 'یہ سروس جلد دستی |
| backend | زرع أو بيانات تهيئة | backend/src/modules/i18n/i18n.service.ts | 325 | 'notif.lab_sample_collected.title': { ar: 'تم سحب العينة 🧪', en: 'Sample Collected 🧪', ur: 'نمونہ لیا گیا' }, |
| backend | عقد أو قدرة غير منفذة | backend/src/modules/i18n/i18n.service.ts | 328 | 'notif.lab_processing.body': { ar: 'سيتم إصدار النتيجة قريباً', en: 'Results coming soon', ur: 'جلد نتائج' }, |
| backend | عقد أو قدرة غير منفذة | backend/src/modules/i18n/i18n.service.ts | 348 | 'notif.radiology_in_progress.body': { ar: 'سيتم إصدار التقرير قريباً', en: 'Report coming soon', ur: 'جلد' }, |
| backend | زرع أو بيانات تهيئة | backend/src/modules/labs/controllers/labs-engine.controller.ts | 42 | @Post('collect-sample/:id') |
| backend | زرع أو بيانات تهيئة | backend/src/modules/labs/labs.seed.ts | 2 | * Lab catalog seed — populated on backend boot if collection is empty. |
| backend | زرع أو بيانات تهيئة | backend/src/modules/labs/labs.seed.ts | 33 | // NOTE: Imaging/Radiology entries were removed from this seed \u2014 they live in /modules/radiology/radiology.seed.ts now. |
| backend | زرع أو بيانات تهيئة | backend/src/modules/labs/labs.service.ts | 357 | const sample = await this.sampleModel.create({ |
| backend | زرع أو بيانات تهيئة | backend/src/modules/labs/labs.service.ts | 374 | return sample; |
| backend | زرع أو بيانات تهيئة | backend/src/modules/labs/labs.service.ts | 379 | const sample = await this.sampleModel.findOne({ id: sampleId }); |
| backend | زرع أو بيانات تهيئة | backend/src/modules/labs/labs.service.ts | 380 | if (!sample) throw new NotFoundException('sample_not_found'); |
| backend | زرع أو بيانات تهيئة | backend/src/modules/labs/labs.service.ts | 384 | const b = await this.bkgModel.findOne({ id: sample.lab_order_id }); |
| backend | زرع أو بيانات تهيئة | backend/src/modules/nabd-extensions/nabd-extensions.controller.ts | 165 | await this.svc.logActivity('lab.sample.barcode_bound', undefined, staff.id, body); |
| backend | زرع أو بيانات تهيئة | backend/src/modules/nabd-extensions/nabd-extensions.controller.ts | 166 | return { success: true, message: 'Barcode bound successfully to sample ID' }; |
| backend | زرع أو بيانات تهيئة | backend/src/modules/nabd-extensions/nabd-extensions.service.ts | 568 | const sample = await this.userModel.db.model('LabSample').findOne({ sampleId }); |
| backend | زرع أو بيانات تهيئة | backend/src/modules/nabd-extensions/nabd-extensions.service.ts | 569 | if (!sample) throw new NotFoundException('Lab sample not found'); |
| backend | زرع أو بيانات تهيئة | backend/src/modules/nabd-extensions/nabd-extensions.service.ts | 571 | sample.actualValue = actualValue; |
| backend | زرع أو بيانات تهيئة | backend/src/modules/nabd-extensions/nabd-extensions.service.ts | 572 | sample.status = 'completed'; |
| backend | زرع أو بيانات تهيئة | backend/src/modules/nabd-extensions/nabd-extensions.service.ts | 573 | await sample.save(); |
| backend | زرع أو بيانات تهيئة | backend/src/modules/nabd-extensions/nabd-extensions.service.ts | 576 | if (actualValue < sample.criticalMin \|\| actualValue > sample.criticalMax) { |
| backend | زرع أو بيانات تهيئة | backend/src/modules/nabd-extensions/nabd-extensions.service.ts | 580 | user_id: sample.patientId, |
| backend | زرع أو بيانات تهيئة | backend/src/modules/nabd-extensions/nabd-extensions.service.ts | 583 | params: { testName: sample.testName, actualValue }, |
| backend | زرع أو بيانات تهيئة | backend/src/modules/nabd-extensions/nabd-extensions.service.ts | 589 | return { sample, isCritical }; |
| backend | زرع أو بيانات تهيئة | backend/src/modules/pharmacy/pharmacy.controllers.ts | 7 | import { PharmacySeedService } from './services/pharmacy-seed.service'; |
| backend | زرع أو بيانات تهيئة | backend/src/modules/pharmacy/pharmacy.controllers.ts | 131 | @Post('seed') seed(@CurrentUser() u: any) { return this.seedSvc.seed(u); } |
| backend | زرع أو بيانات تهيئة | backend/src/modules/pharmacy/pharmacy.controllers.ts | 132 | @Post('seed/sample-order') sampleOrder(@CurrentUser() u: any, @Body() b: any) { return this.seedSvc.seedSampleOrder(b?.patient_account_id \|\| u.id); } |
| backend | زرع أو بيانات تهيئة | backend/src/modules/pharmacy/pharmacy.module.ts | 24 | import { PharmacySeedService } from './services/pharmacy-seed.service'; |
| backend | زرع أو بيانات تهيئة | backend/src/modules/pharmacy/services/pharmacy-seed.service.ts | 28 | /** Idempotent seed: 2 extra approved pharmacy providers with overlapping inventory so split engine has work to do. */ |
| backend | زرع أو بيانات تهيئة | backend/src/modules/pharmacy/services/pharmacy-seed.service.ts | 29 | async seed(user: any) { |
| backend | زرع أو بيانات تهيئة | backend/src/modules/pharmacy/services/pharmacy-seed.service.ts | 109 | /** Create a realistic sample patient order for split-engine testing. */ |
| backend | زرع أو بيانات تهيئة | backend/src/modules/pharmacy/services/pharmacy-seed.service.ts | 111 | const sample = await this.orders.create({ |
| backend | زرع أو بيانات تهيئة | backend/src/modules/pharmacy/services/pharmacy-seed.service.ts | 123 | return sample.toObject(); |
| backend | زرع أو بيانات تهيئة | backend/src/modules/provider/provider.controllers.ts | 10 | import { ProviderSeedService } from './services/provider-seed.service'; |
| backend | زرع أو بيانات تهيئة | backend/src/modules/provider/provider.controllers.ts | 288 | @Post('seed') seed(@CurrentUser() u: any) { return this.seedSvc.seed(u); } |
| backend | زرع أو بيانات تهيئة | backend/src/modules/provider/provider.controllers.ts | 289 | @Post('seed/reset') seedReset(@CurrentUser() u: any) { return this.seedSvc.resetSeed(u); } |
| backend | زرع أو بيانات تهيئة | backend/src/modules/provider/provider.controllers.ts | 376 | // ADMIN seed: create a new UNASSIGNED request that triggers matching (real DB record). |
| backend | زرع أو بيانات تهيئة | backend/src/modules/provider/provider.controllers.ts | 378 | @Post('seed-unassigned') seedUnassigned(@CurrentUser() u: any, @Body() body: any) { |
| backend | زرع أو بيانات تهيئة | backend/src/modules/provider/provider.module.ts | 28 | import { ProviderSeedService } from './services/provider-seed.service'; |
| backend | بيانات أو سلوك محاكى | backend/src/modules/provider/provider.module.ts | 45 | import { SimulatedFeaturesController } from './simulated-features.controller'; |
| backend | زرع أو بيانات تهيئة | backend/src/modules/provider/services/provider-request-engine.service.ts | 147 | // ---------- INTERNAL CREATE (called by seed or other modules) ---------- |
| backend | زرع أو بيانات تهيئة | backend/src/modules/provider/services/provider-request-engine.service.ts | 173 | timeline: [{ at: now, status: ProviderRequestStatus.PENDING, by_role: 'system', by_user_id: 'seed', note: 'request created' }], |
| backend | زرع أو بيانات تهيئة | backend/src/modules/provider/services/provider-seed.service.ts | 59 | * Seed comprehensive Phase 1B + 1C sample data for the authenticated provider |
| backend | زرع أو بيانات تهيئة | backend/src/modules/provider/services/provider-seed.service.ts | 62 | async seed(user: any) { |
| backend | زرع أو بيانات تهيئة | backend/src/modules/provider/services/provider-seed.service.ts | 193 | // ---------- 6) SAMPLE REQUESTS (Phase 1B) ---------- |
| backend | بيانات أو سلوك محاكى | backend/src/modules/provider/simulated-features.controller.ts | 14 | import { CreateCampaignDto, CreateReferralDto, UpdateCrmTagDto, CreateStaffAccountDto, HomeCareCheckinDto, HomeCareSubmitReportDto, RadiologyUploadReportDto } from './simulated-features.dto'; |
| backend | بيانات أو سلوك محاكى؛ زرع أو بيانات تهيئة | backend/src/modules/providers/providers.controller.ts | 110 | @Post('admin/seed-demo') |
| backend | بيانات أو سلوك محاكى؛ زرع أو بيانات تهيئة | backend/src/modules/providers/providers.controller.ts | 113 | throw new NotImplementedException('Runtime demo-provider seeding is disabled. Use the isolated test seed script in staging only.'); |
| backend | عنوان تطوير محلي | backend/src/modules/push/push.module.ts | 137 | const redisUrl = process.env.REDIS_URL \|\| 'redis://localhost:6379'; |
| backend | زرع أو بيانات تهيئة | backend/src/modules/radiology/radiology.seed.ts | 2 | * Radiology seed — independent of labs seed. |
| backend | عنوان تطوير محلي | backend/src/modules/redis/redis.service.ts | 12 | const redisUrl = process.env.REDIS_URL \|\| 'redis://localhost:6379'; |
| backend | زرع أو بيانات تهيئة | backend/src/modules/seed/seed.data.ts | 2 | * Seed dataset for Nabd Healthcare. |
| backend | زرع أو بيانات تهيئة | backend/src/modules/seed/seed.facilities.ts | 2 | * Seed for healthcare facilities (hospitals, clinics, medical centers). |
| backend | زرع أو بيانات تهيئة | backend/src/modules/seed/seed.facilities.ts | 4 | * (we store facility.id on doctor.facility_id during seed). |
| backend | زرع أو بيانات تهيئة | backend/src/modules/seed/seed.module.ts | 3 | import { SeedService } from './seed.service'; |
| backend | زرع أو بيانات تهيئة | backend/src/modules/seed/seed.service.ts | 13 | import { SEED_USERS, SEED_PHARMACIES, SEED_DOCTORS, SEED_DELIVERY, SEED_MEDICINES } from './seed.data'; |
| backend | زرع أو بيانات تهيئة | backend/src/modules/seed/seed.service.ts | 14 | import { SEED_FACILITIES } from './seed.facilities'; |
| backend | زرع أو بيانات تهيئة | backend/src/modules/seed/seed.service.ts | 15 | import { LAB_SEED } from '../labs/labs.seed'; |
| backend | زرع أو بيانات تهيئة | backend/src/modules/seed/seed.service.ts | 27 | private logger = new Logger('Seed'); |
| backend | زرع أو بيانات تهيئة | backend/src/modules/seed/seed.service.ts | 52 | this.logger.log('Seed complete — idempotent (with facilities + inventory + labs + config)'); |
| backend | زرع أو بيانات تهيئة | backend/src/modules/seed/seed.service.ts | 54 | this.logger.error(\`Seed failed: ${e.message}\`); |
| backend | زرع أو بيانات تهيئة | backend/src/modules/seed/seed.service.ts | 58 | /** Seed facilities (hospitals/clinics) with stable IDs by slug. */ |
| backend | زرع أو بيانات تهيئة | backend/src/modules/seed/seed.service.ts | 269 | * Seed PharmacyInventory: distribute medicines across the 3 pharmacies so |
| backend | عنوان تطوير محلي | backend/src/modules/unified-bookings/unified-bookings.service.ts | 10 | this.redisClient = new Redis(process.env.REDIS_URL \|\| 'redis://localhost:6379'); |
| backend | عنوان تطوير محلي | backend/src/scripts/seed_production.ts | 7 | const MONGO_URL = process.env.MONGO_URL \|\| 'mongodb://localhost:27017/nabd'; |
| backend | زرع أو بيانات تهيئة | backend/src/scripts/seed_production.ts | 230 | async function seed() { |
| backend | زرع أو بيانات تهيئة | backend/src/scripts/seed_production.ts | 276 | seed().catch(err => { |
| backend | زرع أو بيانات تهيئة | backend/src/scripts/seed_production.ts | 277 | console.error('Failed to seed:', err); |
| backend | عنوان تطوير محلي | backend/src/scripts/seed_test_providers.ts | 8 | const MONGO_URL = process.env.MONGO_URL \|\| 'mongodb://localhost:27017/nabd'; |
| backend | زرع أو بيانات تهيئة | backend/src/scripts/seed_test_providers.ts | 91 | async function seed() { |
| backend | زرع أو بيانات تهيئة | backend/src/scripts/seed_test_providers.ts | 164 | seed().catch(err => { |
| backend | زرع أو بيانات تهيئة | backend/src/scripts/seed_test_providers.ts | 165 | console.error('Failed to seed:', err); |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/(auth)/forgot-password.tsx | 106 | placeholder="البريد الإلكتروني" |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/(auth)/login.tsx | 240 | placeholder="example@mail.com" |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/(auth)/login.tsx | 260 | placeholder="••••••••" |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/(auth)/register.tsx | 24 | const AuthField = ({ label, icon, placeholder, value, onChangeText, isPass, isDark, isRTL, focusedInput, setFocusedInput, showPassword, setShowPassword }: any) => ( |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/(auth)/register.tsx | 33 | placeholder={placeholder} |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/(auth)/register.tsx | 219 | placeholder={'أحمد السالم'} |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/(auth)/register.tsx | 228 | placeholder={'0500000000'} |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/(auth)/register.tsx | 237 | placeholder="example@mail.com" |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/(auth)/register.tsx | 246 | placeholder="••••••••" |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/(auth)/register.tsx | 256 | placeholder="••••••••" |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/(auth)/reset-password.tsx | 115 | placeholder="كلمة المرور الجديدة" |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/(auth)/reset-password.tsx | 125 | placeholder="تأكيد كلمة المرور" |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/(onboarding)/index.tsx | 20 | /* TODO: migrate to theme color */ |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/(onboarding)/index.tsx | 227 | container: { flex: 1, backgroundColor: '#23B5CE' }, /* TODO: migrate to theme color */ |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/(onboarding)/index.tsx | 269 | backgroundColor: '#00C9A7', borderRadius: 10, /* TODO: migrate to theme color */ |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/(tabs)/consultations/index.tsx | 174 | placeholder="ابحث عن دكتور أو تخصص..." |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/(tabs)/diagnostics.tsx | 91 | placeholder={mainTab === 'labs' ? "ابحث عن تحليل، باقة، أو مختبر..." : "ابحث عن نوع الأشعة أو المركز..."} |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/(tabs)/nursing.tsx | 103 | placeholder="ابحث عن خدمة أو ممرض..." |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/(tabs)/pharmacy.tsx | 217 | placeholder={lang === 'ar' ? 'ابحث بالاسم أو المادة الفعالة...' : 'Search medicines...'} |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/ai-assistant.tsx | 150 | placeholder="اكتب استفسارك الطبي..." |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/ai/chat-doctor.tsx | 217 | placeholder="اكتب سؤالك الطبي..." |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/ai/triage.tsx | 198 | placeholder="اكتب أعراضك هنا (مثال: أشعر بصداع كلي...)" |
| patient-app | بيانات أو سلوك محاكى | patient-app/app/community/live-session.tsx | 65 | {/* Simulated video */} |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/community/live-session.tsx | 97 | value={input} onChangeText={setInput} placeholder="أضف تعليقاً..." placeholderTextColor={colors.textTertiary} |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/community/post-detail.tsx | 255 | placeholder="أضف تعليقاً..." |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/consultations/chat-with-doctor.tsx | 143 | placeholder="اكتب رسالة..." |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/consultations/doctor-search.tsx | 111 | placeholder="ابحث بالاسم أو التخصص..." |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/consultations/follow-up.tsx | 131 | <Input value={newUpdate} onChangeText={setNewUpdate} placeholder="كيف حالتك اليوم؟ أي تحسن أو أعراض جديدة؟" icon="edit" multiline /> |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/consultations/post-call-rating.tsx | 92 | placeholder="اكتب رأيك في الخدمة..." |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/consultations/specialty-select.tsx | 68 | placeholder="ابحث عن تخصص..." |
| patient-app | زرع أو بيانات تهيئة | patient-app/app/diagnostics/booking-confirm.tsx | 99 | { text: 'موافق', onPress: () => router.push({ pathname: '/diagnostics/sample-tracking', params: { bookingId: booking.id } }) } |
| patient-app | زرع أو بيانات تهيئة | patient-app/app/diagnostics/booking-confirm.tsx | 138 | {/* Sample location */} |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/diagnostics/booking-confirm.tsx | 219 | <Input value={policyNumber} onChangeText={setPolicyNumber} placeholder="رقم بوليصة التأمين" icon="document" /> |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/diagnostics/booking-confirm.tsx | 220 | <Input value={memberId} onChangeText={setMemberId} placeholder="رقم عضوية التأمين" icon="user" /> |
| patient-app | بيانات أو سلوك محاكى | patient-app/app/diagnostics/insurance-upload.tsx | 85 | // Simulate backend AI Processing |
| patient-app | زرع أو بيانات تهيئة | patient-app/app/diagnostics/my-results.tsx | 128 | pathname: "/diagnostics/sample-tracking", |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/diagnostics/order/[id].tsx | 143 | {/* Map Placeholder */} |
| patient-app | بيانات أو سلوك محاكى | patient-app/app/diagnostics/order/[id].tsx | 156 | {/* Dashed line to simulate route */} |
| patient-app | زرع أو بيانات تهيئة | patient-app/app/diagnostics/orders.tsx | 200 | (router.push as any)(\`/diagnostics/sample-tracking?bookingId=${order.id}\`) |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/diagnostics/packages.tsx | 65 | placeholder="ابحث عن باقة..." |
| patient-app | زرع أو بيانات تهيئة | patient-app/app/diagnostics/sample-tracking.tsx | 55 | console.log('Error loading sample tracking info', err); |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/diagnostics/search.tsx | 66 | placeholder="ابحث عن تحليل..." |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/emergency/tracking.tsx | 76 | {/* Map placeholder */} |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/family/chat.tsx | 90 | <TextInput value={msg} onChangeText={setMsg} placeholder="اكتب رسالة..." placeholderTextColor={colors.textTertiary} style={[st.input, { backgroundColor: colors.surfaceSecondary, color: colors.textPrimary }]} onSubmitEditing={send} /> |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/family/invite.tsx | 69 | <Input value={name} onChangeText={setName} placeholder="اسم الفرد" icon="user" /> |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/family/join.tsx | 134 | placeholder="مثال: NABDAH-F7X2K9" |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/health/conditions-allergies.tsx | 155 | placeholder="ابحث عن مرض..." |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/health/conditions-allergies.tsx | 215 | placeholder="ابحث عن حساسية..." |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/health/edit-profile.tsx | 435 | placeholder="أضف حساسية..." |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/health/health-id.tsx | 84 | {/* QR Code placeholder */} |
| patient-app | بيانات أو سلوك محاكى | patient-app/app/health/health-id.tsx | 87 | {/* Simulated QR pattern */} |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/health/medication-reminder-add.tsx | 75 | <Input value={name} onChangeText={setName} placeholder="مثال: بنادول إكسترا 500mg" icon="medication" /> |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/health/medication-reminder-add.tsx | 186 | <Input value={notes} onChangeText={setNotes} placeholder="ملاحظات إضافية (اختياري)" icon="edit" multiline /> |
| patient-app | بيانات أو سلوك محاكى | patient-app/app/health/refills.tsx | 28 | remainingDays: Math.floor(Math.random() * 25) + 1, // Simulated for UI presentation based on real med |
| patient-app | بيانات أو سلوك محاكى | patient-app/app/health/refills.tsx | 56 | // Update remaining pills locally to simulate refill |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/health/vitals-log.tsx | 232 | <Input value={value1} onChangeText={setValue1} placeholder="الانقباضي" keyboardType="numeric" icon="trending_up" style={{ flex: 1 }}/> |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/health/vitals-log.tsx | 234 | <Input value={value2} onChangeText={setValue2} placeholder="الانبساطي" keyboardType="numeric" icon="trendingDown" style={{ flex: 1 }}/> |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/health/vitals-log.tsx | 237 | <Input value={value1} onChangeText={setValue1} placeholder={\`القراءة (${config.unit})\`} keyboardType="numeric" icon={config.icon} style={{ marginTop: 8 }}/> |
| patient-app | معرف ثابت مرشح للمراجعة | patient-app/app/insurance/add-policy.tsx | 35 | body: JSON.stringify({ file: 'base64_simulated_data' }), |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/insurance/add-policy.tsx | 132 | { label: 'رقم البوليصة', val: policyNum, setter: setPolicyNum, placeholder: 'BUP-XXXX-XXXXXX' }, |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/insurance/add-policy.tsx | 133 | { label: 'رقم العضوية / الهوية الوطنية', val: memberId, setter: setMemberId, placeholder: 'M-XXXXXX' }, |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/insurance/add-policy.tsx | 139 | placeholder={f.placeholder} placeholderTextColor={colors.textTertiary} textAlign="right" /> |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/insurance/coverage-check.tsx | 239 | placeholder="اسم الطبيب أو المستشفى أو الصيدلية" |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/insurance/network-providers.tsx | 80 | placeholder="ابحث عن مزود..." |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/map/index.tsx | 412 | placeholder="ابحث عن دكتور، صيدلية، مستشفى..." |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/maternity/baby-growth.tsx | 302 | placeholder="مثال: 6" |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/maternity/baby-growth.tsx | 313 | placeholder="مثال: 7.5" |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/maternity/baby-growth.tsx | 324 | placeholder="مثال: 65" |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/maternity/baby-growth.tsx | 335 | placeholder="مثال: 42" |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/mental-health/mood-journal.tsx | 136 | placeholder="اكتب ما يخطر على بالك..." |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/nursing/live-doctor-tracking.tsx | 51 | {/* Map placeholder */} |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/nutrition/ai-plan-builder.tsx | 114 | <Input value={form.weight} onChangeText={v => set('weight', v)} placeholder="الوزن (كغ)" keyboardType="numeric" icon="weight" style={{ flex: 1 }} /> |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/nutrition/ai-plan-builder.tsx | 115 | <Input value={form.height} onChangeText={v => set('height', v)} placeholder="الطول (سم)" keyboardType="numeric" icon="trending_up" style={{ flex: 1 }} /> |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/nutrition/ai-plan-builder.tsx | 118 | <Input value={form.age} onChangeText={v => set('age', v)} placeholder="العمر" keyboardType="numeric" icon="calendar" style={{ flex: 1 }} /> |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/nutrition/ai-plan-builder.tsx | 119 | <Input value={form.targetWeight} onChangeText={v => set('targetWeight', v)} placeholder="الوزن المستهدف" keyboardType="numeric" icon="success" style={{ flex: 1 }} /> |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/nutrition/ai-plan-builder.tsx | 143 | <Input value={allergies} onChangeText={setAllergies} placeholder="حساسية أو أطعمة ممنوعة (اختياري)" icon="warning" /> |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/nutrition/body-composition.tsx | 100 | {/* Body silhouette placeholder */} |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/nutrition/body-target.tsx | 71 | <Input value={weight} onChangeText={setWeight} placeholder="الوزن (كغ)" keyboardType="numeric" icon="weight" style={{ flex: 1 }}/> |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/nutrition/body-target.tsx | 72 | <Input value={height} onChangeText={setHeight} placeholder="الطول (سم)" keyboardType="numeric" icon="trending_up" style={{ flex: 1 }}/> |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/nutrition/body-target.tsx | 92 | <Input value={targetWeight} onChangeText={setTargetWeight} placeholder="الوزن المستهدف (كغ)" keyboardType="numeric" icon="success" /> |
| patient-app | بيانات أو سلوك محاكى؛ عقد أو قدرة غير منفذة | patient-app/app/nutrition/calorie-analyzer.tsx | 52 | // We can simulate passing base64, but for now we query the backend with placeholder text |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/nutrition/calorie-analyzer.tsx | 110 | placeholder="مثال: كبسة لحم مع سلطة وزبادي..." |
| patient-app | بيانات أو سلوك محاكى | patient-app/app/nutrition/food-scanner.tsx | 40 | // Simulate food scanning request via backend AI analyzer |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/nutrition/log-meal.tsx | 139 | placeholder="ابحث عن طعام..." placeholderTextColor={colors.textTertiary} textAlign="right" /> |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/pharmacy/chat-with-pharmacist.tsx | 302 | placeholder="اكتب رسالتك للصيدلي..." |
| patient-app | بيانات أو سلوك محاكى | patient-app/app/pharmacy/checkout.tsx | 7 | * - Graceful fallback if backend offline (simulated flow for testing). |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/pharmacy/custom-item.tsx | 122 | placeholder: "مثال: ميتفورمين 500mg", |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/pharmacy/custom-item.tsx | 128 | placeholder: "مثال: 500mg", |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/pharmacy/custom-item.tsx | 134 | placeholder: "مثال: 2 علبة", |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/pharmacy/custom-item.tsx | 167 | placeholder={f.placeholder} |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/pharmacy/custom-item.tsx | 204 | placeholder="أي معلومات إضافية..." |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/pharmacy/drug-not-found.tsx | 91 | <Input value={name} onChangeText={setName} placeholder="اسم الدواء *" icon="medication" /> |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/pharmacy/drug-not-found.tsx | 92 | <Input value={dose} onChangeText={setDose} placeholder="التركيز / الجرعة (مثال: 500mg)" icon="edit" /> |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/pharmacy/drug-not-found.tsx | 94 | <Input value={qty} onChangeText={v => setQty(v.replace(/\D/g, ''))} placeholder="الكمية" keyboardType="numeric" icon="shopping_cart" style={{ flex: 1 }} /> |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/pharmacy/drug-not-found.tsx | 97 | <Input value={notes} onChangeText={setNotes} placeholder="ملاحظات إضافية (اختياري)" icon="edit" multiline /> |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/pharmacy/filters.tsx | 248 | placeholder="الحد الأدنى" |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/pharmacy/filters.tsx | 258 | placeholder="الحد الأقصى" |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/pharmacy/filters.tsx | 297 | placeholder="ابحث عن شركة..." |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/pharmacy/manual-order.tsx | 78 | placeholder="مثال: كونجستال أقراص" |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/pharmacy/manual-order.tsx | 87 | placeholder="أضف أي تفاصيل أخرى تساعد الصيدلي..." |
| patient-app | بيانات أو سلوك محاكى | patient-app/app/pharmacy/payment.tsx | 33 | // If it's an insurance order, we simulate a 20% copay amount |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/pharmacy/pharmacist-chat.tsx | 342 | placeholder="اكتب رسالتك للصيدلي..." |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/pharmacy/reorder.tsx | 133 | <Input value={address} onChangeText={setAddress} placeholder="عنوان التوصيل" icon="location" style={{ marginTop: 10 }}/> |
| patient-app | بيانات أو سلوك محاكى | patient-app/app/pharmacy/waiting-for-pharmacy.tsx | 114 | // Removed fallback simulated order |
| patient-app | بيانات أو سلوك محاكى | patient-app/app/programs/active.tsx | 131 | {/* Simulated progress bar */} |
| patient-app | بيانات أو سلوك محاكى | patient-app/app/reports/view-report.tsx | 71 | // Simulate share/download |
| patient-app | معرف ثابت مرشح للمراجعة | patient-app/app/returns/detail.tsx | 65 | order_id: "ORD-984321", |
| patient-app | عقد أو قدرة غير منفذة؛ معرف ثابت مرشح للمراجعة | patient-app/app/returns/new-request.tsx | 181 | placeholder="مثال: ORD-2024-001" placeholderTextColor={colors.textTertiary} textAlign="right" /> |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/returns/new-request.tsx | 204 | placeholder="اشرح مشكلتك بالتفصيل..." placeholderTextColor={colors.textTertiary} |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/reviews/index.tsx | 160 | placeholder="شارك تجربتك مع الآخرين..." |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/search/index.tsx | 74 | style={{ flex: 1, fontSize: 13, color: colors.n, textAlign: isRTL ? 'right' : 'left' }} placeholder={lang === 'ar' ? 'ابحث عن طبيب، دواء، تحليل...' : 'Search doctor, medicine, lab...'} |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/settings/feedback.tsx | 153 | placeholder="اكتب ملاحظتك هنا..." |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/settings/security.tsx | 225 | placeholder="••••••••" |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/shared/location-picker.tsx | 585 | placeholder: "اسم العنوان (مثال: المنزل)", |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/shared/location-picker.tsx | 588 | { key: "street", placeholder: "الشارع والحي", icon: "location" }, |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/shared/location-picker.tsx | 591 | placeholder: "رقم المبنى / اسمه", |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/shared/location-picker.tsx | 596 | placeholder: "الطابق (اختياري)", |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/shared/location-picker.tsx | 601 | placeholder: "ملاحظات للمندوب (اختياري)", |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/shared/location-picker.tsx | 615 | placeholder={field.placeholder} |
| patient-app | عقد أو قدرة غير منفذة | patient-app/app/support/chat.tsx | 238 | placeholder="اكتب رسالتك..." |
| patient-app | بيانات أو سلوك محاكى | patient-app/app/voice/index.tsx | 153 | // Simulate voice recognition after 2.5s |
| patient-app | بيانات أو سلوك محاكى | patient-app/app/wearables/hub.tsx | 114 | // Simulate a small delay for a premium user experience |
| patient-app | عقد أو قدرة غير منفذة | patient-app/src/components/animations.tsx | 69 | // Shimmer Loading Placeholder |
| patient-app | عقد أو قدرة غير منفذة | patient-app/src/components/ui.tsx | 438 | placeholder?: string; |
| patient-app | عقد أو قدرة غير منفذة | patient-app/src/components/ui.tsx | 451 | value, onChangeText, placeholder, icon, iconRight, onIconRightPress, |
| patient-app | عقد أو قدرة غير منفذة | patient-app/src/components/ui.tsx | 455 | const translatedPlaceholder = autoTranslate(placeholder, lang); |
| patient-app | عقد أو قدرة غير منفذة | patient-app/src/components/ui.tsx | 477 | placeholder={translatedPlaceholder} |
| patient-app | عقد أو قدرة غير منفذة | patient-app/src/config/chatSecurity.ts | 139 | // TODO: In production, send to backend |
| patient-app | زرع أو بيانات تهيئة | patient-app/src/config/deepLinks.ts | 84 | 'diagnostics/book-sample': 'labs/book', |
| patient-app | زرع أو بيانات تهيئة | patient-app/src/config/deepLinks.ts | 89 | 'diagnostics/sample-tracking': 'labs/tracking/:id', |
| patient-app | زرع أو بيانات تهيئة | patient-app/src/constants/specialties.ts | 146 | { id: '5', nameAr: 'سحب عينات دم', nameEn: 'Blood Sample Collection', description: 'سحب عينات دم منزلية للتحاليل المخبرية', basePrice: 60, duration: '15 دقيقة', icon: 'bloodtype' }, |
| patient-app | عنوان تطوير محلي | patient-app/src/context/AppContext.tsx | 84 | const res = await fetch(\`${process.env.EXPO_PUBLIC_API_URL \|\| 'http://localhost:8002'}/api/v1/config\`); |
| patient-app | عنوان تطوير محلي | patient-app/src/context/SocketContext.tsx | 11 | const rawSocketUrl = process.env.EXPO_PUBLIC_SOCKET_URL \|\| process.env.EXPO_PUBLIC_API_URL \|\| 'http://localhost:8002'; |
| patient-app | عنوان تطوير محلي | patient-app/src/context/SocketContext.tsx | 13 | if (url.includes('localhost') \|\| url.includes('127.0.0.1')) { |
| patient-app | عنوان تطوير محلي | patient-app/src/context/SocketContext.tsx | 18 | return url.replace('localhost', parts[0]).replace('127.0.0.1', parts[0]); |
| patient-app | عنوان تطوير محلي | patient-app/src/context/SocketContext.tsx | 22 | return url.replace('localhost', '10.0.2.2').replace('127.0.0.1', '10.0.2.2'); |
| patient-app | عنوان تطوير محلي | patient-app/src/core/config/ConfigManager.ts | 49 | apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8002/api/v1', |
| patient-app | عنوان تطوير محلي | patient-app/src/core/config/ConfigManager.ts | 50 | fastapiBaseUrl: process.env.EXPO_PUBLIC_FASTAPI_BASE_URL ?? 'http://localhost:8000/api', |
| patient-app | عنوان تطوير محلي | patient-app/src/core/config/ConfigManager.ts | 51 | socketUrl: process.env.EXPO_PUBLIC_SOCKET_URL ?? 'ws://localhost:8002', |
| patient-app | عنوان تطوير محلي | patient-app/src/core/config/ConfigManager.ts | 52 | cdnUrl: process.env.EXPO_PUBLIC_CDN_URL ?? 'http://localhost:8002/media', |
| patient-app | عنوان تطوير محلي | patient-app/src/core/config/ConfigManager.ts | 81 | // Localhost fix for Android emulator |
| patient-app | عنوان تطوير محلي | patient-app/src/core/config/ConfigManager.ts | 84 | if (!url.includes('localhost') && !url.includes('127.0.0.1')) return url; |
| patient-app | عنوان تطوير محلي | patient-app/src/core/config/ConfigManager.ts | 88 | if (host) return url.replace('localhost', host).replace('127.0.0.1', host); |
| patient-app | عنوان تطوير محلي | patient-app/src/core/config/ConfigManager.ts | 91 | return url.replace('localhost', '10.0.2.2').replace('127.0.0.1', '10.0.2.2'); |
| patient-app | معرف ثابت مرشح للمراجعة | patient-app/src/core/platform/auth/AuthAuditLogger.ts | 15 | ipAddress: 'IP_PLACEHOLDER', // To be populated by backend or networking layer |
| patient-app | معرف ثابت مرشح للمراجعة | patient-app/src/core/platform/auth/AuthAuditLogger.ts | 27 | ipAddress: 'IP_PLACEHOLDER', |
| patient-app | معرف ثابت مرشح للمراجعة | patient-app/src/core/platform/auth/AuthAuditLogger.ts | 38 | ipAddress: 'IP_PLACEHOLDER', |
| patient-app | عقد أو قدرة غير منفذة | patient-app/src/core/platform/auth/SessionManager.ts | 73 | // API Call to rotate tokens (Placeholder for Phase 1C-C/Phase 3) |
| patient-app | عقد أو قدرة غير منفذة | patient-app/src/core/platform/location/LocationService.ts | 33 | // Haversine formula implementation placeholder |
| patient-app | عنوان تطوير محلي | patient-app/src/core/platform/realtime/RealtimeClient.ts | 30 | const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL \|\| 'http://localhost:8002'; |
| patient-app | عقد أو قدرة غير منفذة | patient-app/src/data/database/core/DatabaseProvider.ts | 19 | // Future implementation placeholder |
| patient-app | عقد أو قدرة غير منفذة | patient-app/src/design-system/components/Input.tsx | 23 | placeholder?: string; |
| patient-app | عقد أو قدرة غير منفذة | patient-app/src/design-system/components/Input.tsx | 44 | placeholder, |
| patient-app | عقد أو قدرة غير منفذة | patient-app/src/design-system/components/Input.tsx | 131 | placeholder={placeholder} |
| patient-app | عقد أو قدرة غير منفذة | patient-app/src/design-system/components/Loading.tsx | 76 | // DS Skeleton — Shimmer placeholder for content loading |
| patient-app | عقد أو قدرة غير منفذة | patient-app/src/design-system/components/SearchBar.tsx | 25 | placeholder?: string; |
| patient-app | عقد أو قدرة غير منفذة | patient-app/src/design-system/components/SearchBar.tsx | 46 | placeholder, |
| patient-app | عقد أو قدرة غير منفذة | patient-app/src/design-system/components/SearchBar.tsx | 63 | placeholder ?? |
| patient-app | عقد أو قدرة غير منفذة | patient-app/src/design-system/components/SearchBar.tsx | 150 | placeholder={defaultPlaceholder} |
| patient-app | بيانات أو سلوك محاكى | patient-app/src/guided-tour/engines/AnalyticsCollector.ts | 24 | // Simulate sending to backend |
| patient-app | عقد أو قدرة غير منفذة | patient-app/src/modules/admin/index.ts | 24 | export {}; // Module placeholder — implementation in Phase 3 |
| patient-app | عقد أو قدرة غير منفذة | patient-app/src/modules/chat/index.ts | 24 | export {}; // Module placeholder — implementation in Phase 3 |
| patient-app | عقد أو قدرة غير منفذة | patient-app/src/modules/consultations/index.ts | 24 | export {}; // Module placeholder — implementation in Phase 3 |
| patient-app | عقد أو قدرة غير منفذة | patient-app/src/modules/diagnostics/index.ts | 24 | export {}; // Module placeholder — implementation in Phase 3 |
| patient-app | عقد أو قدرة غير منفذة | patient-app/src/modules/insurance/index.ts | 24 | export {}; // Module placeholder — implementation in Phase 3 |
| patient-app | عقد أو قدرة غير منفذة | patient-app/src/modules/notifications/index.ts | 24 | export {}; // Module placeholder — implementation in Phase 3 |
| patient-app | عقد أو قدرة غير منفذة | patient-app/src/modules/nursing/index.ts | 24 | export {}; // Module placeholder — implementation in Phase 3 |
| patient-app | عقد أو قدرة غير منفذة | patient-app/src/modules/orders/index.ts | 24 | export {}; // Module placeholder — implementation in Phase 3 |
| patient-app | عقد أو قدرة غير منفذة | patient-app/src/modules/payments/index.ts | 24 | export {}; // Module placeholder — implementation in Phase 3 |
| patient-app | عقد أو قدرة غير منفذة | patient-app/src/modules/pharmacy/index.ts | 24 | export {}; // Module placeholder — implementation in Phase 3 |
| patient-app | عقد أو قدرة غير منفذة | patient-app/src/modules/profile/index.ts | 24 | export {}; // Module placeholder — implementation in Phase 3 |
| patient-app | عقد أو قدرة غير منفذة | patient-app/src/services/FeatureFlags.ts | 71 | loyalty_program: false, // coming soon |
| patient-app | زرع أو بيانات تهيئة | patient-app/src/services/FeatureFlags.ts | 102 | // Seed with static defaults |
| patient-app | زرع أو بيانات تهيئة | patient-app/src/store/middleware/observability.ts | 41 | // In production, we'd sample this to avoid spamming analytics |
| patient-app | بيانات أو سلوك محاكى | patient-app/src/store/utils/testUtils.tsx | 21 | // For now, we mock it via the singleton store. |
| patient-app | عنوان تطوير محلي | patient-app/src/utils/api.ts | 9 | const rawBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL \|\| (isDevelopment ? 'http://localhost:8002/api/v1' : ''); |
| patient-app | عنوان تطوير محلي | patient-app/src/utils/api.ts | 10 | const rawFastApiUrl = process.env.EXPO_PUBLIC_FASTAPI_BASE_URL \|\| (isDevelopment ? 'http://localhost:8000/api' : ''); |
| patient-app | عنوان تطوير محلي | patient-app/src/utils/api.ts | 13 | if (url.includes('localhost') \|\| url.includes('127.0.0.1')) { |
| patient-app | عنوان تطوير محلي | patient-app/src/utils/api.ts | 18 | return url.replace('localhost', parts[0]).replace('127.0.0.1', parts[0]); |
| patient-app | عنوان تطوير محلي | patient-app/src/utils/api.ts | 22 | return url.replace('localhost', '10.0.2.2').replace('127.0.0.1', '10.0.2.2'); |
| patient-app | عقد أو قدرة غير منفذة | patient-app/src/utils/security.ts | 161 | // TODO: In production, send to backend audit endpoint |
| provider-app | بيانات أو سلوك محاكى | provider-app/jest.setup.js | 1 | jest.mock('react-native/src/private/animated/NativeAnimatedHelper'); |
| provider-app | بيانات أو سلوك محاكى | provider-app/jest.setup.js | 3 | jest.mock('expo-secure-store', () => ({ |
| provider-app | بيانات أو سلوك محاكى | provider-app/jest.setup.js | 10 | jest.mock('expo-crypto', () => ({ |
| provider-app | بيانات أو سلوك محاكى | provider-app/jest.setup.js | 15 | jest.mock('expo-local-authentication', () => ({ |
| provider-app | بيانات أو سلوك محاكى | provider-app/jest.setup.js | 22 | jest.mock('expo-constants', () => ({ |
| provider-app | بيانات أو سلوك محاكى | provider-app/jest.setup.js | 27 | jest.mock('expo-av', () => ({ |
| provider-app | بيانات أو سلوك محاكى | provider-app/jest.setup.js | 35 | jest.mock('expo-image-picker', () => ({ |
| provider-app | بيانات أو سلوك محاكى | provider-app/jest.setup.js | 43 | jest.mock('expo-document-picker', () => ({ |
| provider-app | بيانات أو سلوك محاكى | provider-app/jest.setup.js | 47 | jest.mock('react-native-webview', () => ({ |
| provider-app | بيانات أو سلوك محاكى | provider-app/jest.setup.js | 51 | jest.mock('expo-font', () => ({ |
| provider-app | بيانات أو سلوك محاكى | provider-app/jest.setup.js | 56 | jest.mock('@expo/vector-icons', () => new Proxy({}, { |
| provider-app | بيانات أو سلوك محاكى | provider-app/jest.setup.js | 60 | jest.mock('react-native-safe-area-context', () => ({ |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/components/ui.tsx | 104 | label, placeholder, value, onChange, secure, kbType, error, hint, |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/components/ui.tsx | 108 | label?:string; placeholder?:string; value:string; onChange:(v:string)=>void; |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/components/ui.tsx | 152 | placeholder={placeholder} placeholderTextColor={theme.textHint} |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/components/ui.tsx | 205 | <TextInput ref={inputRef} value={value} onChangeText={onChange} placeholder="5X XXX XXXX" |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/components/ui.tsx | 642 | export function NSearch({ value, onChange, placeholder, style }: |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/components/ui.tsx | 643 | { value:string; onChange:(v:string)=>void; placeholder?:string; style?:object }) { |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/components/ui.tsx | 652 | placeholder={placeholder??t('search')} placeholderTextColor={theme.textHint} |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/components/ui.tsx | 693 | placeholder="0" placeholderTextColor={theme.textHint} keyboardType="numeric" |
| provider-app | بيانات أو سلوك محاكى | provider-app/src/components/ui.tsx | 768 | // Calculate a mock circle scale/width based on radius (e.g. 1KM to 50KM) |
| provider-app | بيانات أو سلوك محاكى | provider-app/src/components/ui.tsx | 786 | {/* Saudi Neighborhood Mock Tags */} |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/components/ui.tsx | 1069 | label, value, options, onChange, placeholder = 'Select...' |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/components/ui.tsx | 1075 | placeholder?: string; |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/components/ui.tsx | 1105 | {selectedOpt ? selectedOpt.label : placeholder} |
| provider-app | زرع أو بيانات تهيئة | provider-app/src/constants/index.ts | 204 | { id:'blood', ar:'سحب عينات دم', en:'Blood Sample Collection', min:20 }, |
| provider-app | عنوان تطوير محلي | provider-app/src/constants/index.ts | 417 | if (!localIp \|\| localIp === 'localhost') { |
| provider-app | عنوان تطوير محلي | provider-app/src/constants/index.ts | 418 | localIp = Platform.OS === 'android' ? '10.0.2.2' : '127.0.0.1'; |
| provider-app | عنوان تطوير محلي | provider-app/src/constants/index.ts | 419 | } else if (localIp === '127.0.0.1' && Platform.OS === 'android') { |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/auth/AuthScreens.tsx | 459 | placeholder={AR ? 'example@email.com أو 05X...' : 'example@email.com or 05X...'} |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/auth/AuthScreens.tsx | 465 | placeholder="••••••••" |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/auth/AuthScreens.tsx | 566 | placeholder="e.g. 192.168.1.10" |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/auth/AuthScreens.tsx | 702 | placeholder="example@email.com" |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/auth/AuthScreens.tsx | 726 | placeholder="••••••••" |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/auth/AuthScreens.tsx | 734 | placeholder="••••••••" |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/auth/PendingDashboard.tsx | 96 | placeholder="123456" |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/doctor/DoctorDashboard.tsx | 419 | <NInput label={AR ? 'نسبة تحمل المريض (SAR)' : 'Patient Co-Pay (SAR)'} value={patientCopay} onChange={setPatientCopay} kbType="numeric" placeholder="e.g. 50" icon="" /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/doctor/DoctorDashboard.tsx | 420 | <NInput label={AR ? 'تحمل شركة التأمين (SAR)' : 'Insurance Coverage (SAR)'} value={insuranceCoverage} onChange={setInsuranceCoverage} kbType="numeric" placeholder="e.g. 150" icon="" /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/doctor/DoctorDashboard.tsx | 421 | <NInput label={AR ? 'رقم الموافقة المرجعي (Approval Code)' : 'Approval Code'} value={approvalCode} onChange={setApprovalCode} placeholder="e.g. NPH-9213" icon="" /> |
| provider-app | بيانات أو سلوك محاكى | provider-app/src/screens/doctor/DoctorDashboard.tsx | 463 | // Fallback: show demo appointments when API unavailable |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/doctor/DoctorDashboard.tsx | 792 | <TextInput style={{ flex: 1, backgroundColor: theme.surface2, borderRadius: R.full, paddingHorizontal: SP.md, paddingVertical: SP.sm, color: theme.text, textAlign: AR ? 'right' : 'left' }} placeholder={AR ? 'اكتب رسالة...' : 'Type a message...'} placeholderTex |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/doctor/DoctorDashboard.tsx | 990 | <NInput label={AR ? 'الجرعة' : 'Dosage'} placeholder={AR ? 'مثال: قرص واحد' : 'e.g., 1 tablet'} |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/doctor/DoctorDashboard.tsx | 1035 | placeholder={AR ? 'مثال: تناول الدواء بعد الأكل، الإكثار من الماء...' : 'e.g., Take with food, drink plenty of water...'} |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/doctor/DoctorDashboard.tsx | 1070 | <NSearch value={search} onChange={setSearch} placeholder={AR ? 'اسم الدواء...' : 'Medication name...'} /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/doctor/DoctorDashboard.tsx | 1109 | <NInput label={AR ? 'اسم النموذج' : 'Template Title'} value={templateName} onChange={setTemplateName} placeholder={AR ? 'مثال: نموذج علاج الربو' : 'e.g., Asthma Treatment'} /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/doctor/DoctorDashboard.tsx | 1176 | <NInput label={AR ? 'التشخيص' : 'Diagnosis'} placeholder={AR ? 'سبب الإجازة الطبية' : 'Medical reason for leave'} |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/doctor/DoctorDashboard.tsx | 1179 | <NInput label={AR ? 'تاريخ البداية' : 'Start Date'} placeholder="YYYY-MM-DD" |
| provider-app | بيانات أو سلوك محاكى | provider-app/src/screens/doctor/DoctorDashboard.tsx | 1223 | // Graceful fallback for demo/offline |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/doctor/DoctorDashboard.tsx | 1311 | placeholder={AR ? 'اشرح سبب التحويل ومعلومات ذات صلة...' : 'Explain the reason and relevant information...'} |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/doctor/DoctorDashboard.tsx | 1662 | placeholder={AR ? 'أضف وسماً (مثال: متعاون، مدخن)' : 'Add tag (e.g. Cooperative, Smoker)'} |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/doctor/DoctorDashboard.tsx | 1690 | placeholder={AR ? 'اكتب ملاحظة خاصة عن المريض (سرية ولن تظهر له)...' : 'Write a private note (confidential, hidden from patient)...'} |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/doctor/DoctorDashboard.tsx | 1895 | // CHAT TAB (placeholder — full chat in Phase 6) |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/doctor/DoctorDashboard.tsx | 2002 | placeholder={AR ? 'اكتب رسالة...' : 'Type a message...'} |
| provider-app | بيانات أو سلوك محاكى | provider-app/src/screens/doctor/DoctorDashboard.tsx | 2086 | // Mock facility link state |
| provider-app | بيانات أو سلوك محاكى | provider-app/src/screens/doctor/DoctorDashboard.tsx | 2098 | // Mock facility permissions locking |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/doctor/DoctorDashboard.tsx | 2296 | placeholder="J06.9" |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/doctor/DoctorDashboard.tsx | 2406 | placeholder={AR ? 'اذكر الأعراض والفحوصات والنتائج...' : 'State symptoms, examinations and findings...'} |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/doctor/DoctorDashboard.tsx | 2411 | placeholder={AR ? 'التشخيص النهائي...' : 'Final diagnosis...'} |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/doctor/DoctorDashboard.tsx | 2416 | placeholder={AR ? 'العلاج والتوصيات...' : 'Treatment and recommendations...'} |
| provider-app | بيانات أو سلوك محاكى | provider-app/src/screens/doctor/DoctorDashboard.tsx | 3179 | // Mock bar chart data |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/doctor/DoctorDashboard.tsx | 4193 | <View style={{ flex: 1 }}><NInput value={msg} onChange={setMsg} placeholder={AR ? 'اكتب رسالة...' : 'Type a message...'} /></View> |
| provider-app | بيانات أو سلوك محاكى | provider-app/src/screens/doctor/DoctorDashboard.tsx | 4214 | // Simulated fetching of inbound reports for testing |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/doctor/DoctorRegistration.tsx | 349 | placeholder={AR ? 'اختر التخصص...' : 'Select Specialty...'} |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/doctor/DoctorRegistration.tsx | 357 | placeholder={AR ? 'اختر الدرجة...' : 'Select Degree...'} |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/doctor/DoctorRegistration.tsx | 361 | <NInput label={AR ? 'النبذة التعريفية (Bio)' : 'Bio'} value={data.bio} onChange={v=>update({bio:v})} multi lines={4} placeholder={AR ? 'تحدث عن خبرتك...' : 'Talk about your experience...'} /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/doctor/DoctorRegistration.tsx | 661 | <NInput label={AR ? 'إجازة مخطط لها' : 'Planned Vacation'} placeholder={AR ? 'اضغط لاختيار تاريخ إجازتك...' : 'Choose vacation date...'} value={data.vacationDate} onChange={(val) => { update({ vacationDate: val }); setShowVacationCal(false); }} editable={false |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/doctor/DoctorRegistration.tsx | 984 | placeholder={AR ? 'الاسم الثلاثي' : 'Full Name'} |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/doctor/DoctorRegistration.tsx | 990 | placeholder={AR ? 'مثل: مالك، مدير عام' : 'e.g., Owner, General Manager'} |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/doctor/DoctorRegistration.tsx | 1004 | placeholder={AR ? 'اسم مطابق للهوية/السجل التجاري' : 'Name matching ID/CR'} |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/doctor/DoctorRegistration.tsx | 1010 | placeholder="SA0000000000000000000000" |
| provider-app | بيانات أو سلوك محاكى | provider-app/src/screens/doctor/fix_home.js | 12 | // 2. fetchQueue fallback mock |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/doctor/fix_home.js | 70 | <NInput label={AR ? 'نسبة تحمل المريض (SAR)' : 'Patient Co-Pay (SAR)'} value={patientCopay} onChange={setPatientCopay} kbType="numeric" placeholder="e.g. 50" icon="" /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/doctor/fix_home.js | 71 | <NInput label={AR ? 'تحمل شركة التأمين (SAR)' : 'Insurance Coverage (SAR)'} value={insuranceCoverage} onChange={setInsuranceCoverage} kbType="numeric" placeholder="e.g. 150" icon="" /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/doctor/fix_home.js | 72 | <NInput label={AR ? 'رقم الموافقة المرجعي (Approval Code)' : 'Approval Code'} value={approvalCode} onChange={setApprovalCode} placeholder="e.g. NPH-9213" icon="" /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/facility/DischargeSummaryScreen.tsx | 48 | placeholder={AR ? 'اكتب التشخيص...' : 'Enter diagnosis...'} |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/facility/DischargeSummaryScreen.tsx | 64 | placeholder={AR ? 'أدخل الأدوية...' : 'Enter medications...'} |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/facility/DischargeSummaryScreen.tsx | 80 | placeholder={AR ? 'تعليمات الراحة والمراجعة...' : 'Rest and follow-up instructions...'} |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/facility/FacilityAnnouncementsScreen.tsx | 54 | placeholder={AR ? 'اكتب التعميم هنا وسيظهر لجميع المزودين المرتبطين...' : 'Type announcement here to broadcast to all linked providers...'} |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/facility/FacilityDashboard.tsx | 564 | placeholder={AR ? 'ابحث عن طبيب أو موظف...' : 'Search staff...'} style={{ marginBottom: SP.lg }} /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/facility/FacilityDashboard.tsx | 825 | placeholder={AR ? 'محمد أحمد السعودي' : 'Mohamed Ahmed'} |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/facility/FacilityDashboard.tsx | 830 | placeholder="doctor@hospital.com" |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/facility/FacilityDashboard.tsx | 862 | placeholder="123456" value={scfhs} onChange={setScfhs} |
| provider-app | بيانات أو سلوك محاكى | provider-app/src/screens/facility/FacilityDashboard.tsx | 1109 | show(AR ? 'تم إخراج المريض بنجاح (محاكاة)' : 'Patient discharged successfully (simulation fallback)', 'success'); |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/facility/FacilityDashboard.tsx | 1244 | <NInput label={AR ? 'معرف المريض (Patient ID)' : 'Patient ID'} placeholder={AR ? 'أدخل معرف المريض...' : 'Enter patient ID...'} value={patientId} onChange={setPatientId} required /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/facility/FacilityDashboard.tsx | 1252 | <NInput label={AR ? 'اسم الجناح' : 'Ward Name'} placeholder={AR ? 'مثل: العناية المركزة، أجنحة الجراحة...' : 'e.g. ICU, General Surgery...'} value={wardName} onChange={setWardName} required /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/facility/FacilityDashboard.tsx | 1253 | <NInput label={AR ? 'عدد الأسرّة' : 'Total Beds'} placeholder="10" value={wardBedsCount} onChange={setWardBedsCount} kbType="numeric" required /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/facility/FacilityDashboard.tsx | 1395 | {/* QR Scanner placeholder */} |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/facility/FacilityDashboard.tsx | 1423 | placeholder={AR ? 'APT-2025-XXXXX' : 'APT-2025-XXXXX'} |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/facility/FacilityDashboard.tsx | 1900 | <NInput label={AR ? 'معرف المريض (Patient ID)' : 'Patient ID'} placeholder={AR ? 'أدخل معرف المريض...' : 'Enter patient ID...'} value={patientId} onChange={setPatientId} required /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/facility/FacilityDashboard.tsx | 1901 | <NInput label={AR ? 'معرف الجراح الرئيسي' : 'Surgeon ID'} placeholder={AR ? 'أدخل معرف الجراح...' : 'Enter surgeon ID...'} value={surgeonId} onChange={setSurgeonId} required /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/facility/FacilityDashboard.tsx | 1903 | <NInput label={AR ? 'التاريخ والوقت (YYYY-MM-DD HH:MM)' : 'Date & Time (YYYY-MM-DD HH:MM)'} placeholder="2026-06-18 10:00" value={scheduledAt} onChange={setScheduledAt} required /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/facility/FacilityDashboard.tsx | 1904 | <NInput label={AR ? 'المدة بالدقائق' : 'Duration (mins)'} placeholder="90" value={duration} onChange={setDuration} kbType="numeric" required /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/facility/FacilityInternalChatScreen.tsx | 64 | placeholder={AR ? 'اكتب رسالتك...' : 'Type a message...'} |
| provider-app | بيانات أو سلوك محاكى | provider-app/src/screens/facility/FacilityInvitationScreen.tsx | 51 | // Simulate API Call for creating FacilityInvitation |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/facility/FacilityInvitationScreen.tsx | 96 | placeholder={AR ? 'مثال: [REDACTED_PHONE] أو NBD-1234' : 'e.g., [REDACTED_PHONE] or NBD-1234'} |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/facility/FacilityProfileConfigScreen.tsx | 67 | <NInput label={AR ? 'أوقات العمل' : 'Working Hours'} value={hours} onChange={setHours} placeholder="e.g. 24/7 or 9 AM - 10 PM" icon="⏰" /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/facility/FacilityRegistration.tsx | 547 | <TextInput value={tempSub[mode.prc]} onChangeText={v => setTempSub({...tempSub, [mode.prc]: v})} placeholder="0" style={{ backgroundColor: theme.surface, padding: 4, paddingHorizontal: 8, borderRadius: R.xs, width: 60, textAlign: 'center', borderWidth: 1, bord |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/facility/FacilityRegistration.tsx | 603 | <TextInput value={tempSub.testPrices?.[t.id] \|\| ''} onChangeText={v => setTempSub({ ...tempSub, testPrices: { ...(tempSub.testPrices \|\| {}), [t.id]: v } })} placeholder={AR ? 'السعر (رس)' : 'Price'} style={{ backgroundColor: theme.bg, padding: 8, borderRad |
| provider-app | زرع أو بيانات تهيئة | provider-app/src/screens/facility/FacilityRegistration.tsx | 614 | <View style={{ flex: 1 }}><NCheckbox label={AR ? 'توفير سحب العينات من المنزل' : 'Provide Home Sample Collection'} value={!!tempSub.homeEnabled} onChange={v => setTempSub({...tempSub, homeEnabled: v})} /></View> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/facility/FacilityRegistration.tsx | 616 | <TextInput value={tempSub.priceHome} onChangeText={v => setTempSub({...tempSub, priceHome: v})} placeholder={AR ? 'الرسوم (رس)' : 'Fee'} style={{ backgroundColor: theme.bg, padding: 8, borderRadius: 8, width: 100, textAlign: 'center', borderWidth: 1, borderCol |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/facility/FacilityRegistration.tsx | 664 | <TextInput value={tempSub.scanPrices?.[s.id] \|\| ''} onChangeText={v => setTempSub({ ...tempSub, scanPrices: { ...(tempSub.scanPrices \|\| {}), [s.id]: v } })} placeholder={AR ? 'السعر (رس)' : 'Price'} style={{ backgroundColor: theme.bg, padding: 8, borderRad |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/facility/FacilityRegistration.tsx | 677 | <TextInput value={tempSub.priceHome} onChangeText={v => setTempSub({...tempSub, priceHome: v})} placeholder={AR ? 'الرسوم (رس)' : 'Fee'} style={{ backgroundColor: theme.bg, padding: 8, borderRadius: 8, width: 100, textAlign: 'center', borderWidth: 1, borderCol |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/facility/FacilityRegistration.tsx | 725 | <TextInput value={tempSub.nursingPrices?.[s.id] \|\| ''} onChangeText={v => setTempSub({ ...tempSub, nursingPrices: { ...(tempSub.nursingPrices\|\|{}), [s.id]: v } })} placeholder={AR ? 'السعر (رس)' : 'Price'} style={{ backgroundColor: theme.bg, padding: 8, bo |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/facility/FacilityRegistration.tsx | 738 | <TextInput value={tempSub.priceHome} onChangeText={v => setTempSub({...tempSub, priceHome: v})} placeholder={AR ? 'الرسوم (رس)' : 'Fee'} style={{ backgroundColor: theme.bg, padding: 8, borderRadius: 8, width: 100, textAlign: 'center', borderWidth: 1, borderCol |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/facility/FacilityRegistration.tsx | 1080 | <NInput value={data.signerName} onChange={v => update({ signerName: v })} placeholder={AR ? 'الاسم الثلاثي' : 'Full Name'} /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/facility/FacilityRegistration.tsx | 1083 | <NInput value={data.signerRole} onChange={v => update({ signerRole: v })} placeholder={AR ? 'مثال: المالك، المدير العام' : 'e.g. Owner, General Manager'} /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/facility/FacilityRegistration.tsx | 1098 | placeholder={AR ? 'اسم مطابق للهوية/السجل التجاري' : 'Name matching ID/CR'} |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/facility/FacilityRegistration.tsx | 1104 | placeholder="SA0000000000000000000000" |
| provider-app | زرع أو بيانات تهيئة | provider-app/src/screens/lab/LabDashboard.tsx | 34 | { key: 'SAMPLE_COLLECTED', ar: 'تم سحب العينة', en: 'Sample Collected', color: '#2196F3' }, |
| provider-app | زرع أو بيانات تهيئة | provider-app/src/screens/lab/LabDashboard.tsx | 38 | { key: 'SAMPLE_REJECTED', ar: 'عينة مرفوضة', en: 'Sample Rejected', color: '#F44336' }, |
| provider-app | زرع أو بيانات تهيئة | provider-app/src/screens/lab/LabDashboard.tsx | 172 | <Stack.Screen name="result_entry">{({ navigation, route }: any) => <ResultEntry sample={route.params?.param} onBack={() => navigation.goBack()} />}</Stack.Screen> |
| provider-app | زرع أو بيانات تهيئة | provider-app/src/screens/lab/LabDashboard.tsx | 173 | <Stack.Screen name="result_review">{({ navigation, route }: any) => <ResultReview sample={route.params?.param} onBack={() => navigation.goBack()} />}</Stack.Screen> |
| provider-app | زرع أو بيانات تهيئة | provider-app/src/screens/lab/LabDashboard.tsx | 177 | <Stack.Screen name="qr_label">{({ navigation, route }: any) => <QRSampleLabel sample={route.params?.param} onBack={() => navigation.goBack()} />}</Stack.Screen> |
| provider-app | زرع أو بيانات تهيئة | provider-app/src/screens/lab/LabDashboard.tsx | 316 | <NSecHeader title={AR?'خط أنابيب العينات':'Sample Pipeline'} action={AR?'الكل':'All'} onAction={()=>onNav('sample_tracking')} /> |
| provider-app | زرع أو بيانات تهيئة | provider-app/src/screens/lab/LabDashboard.tsx | 423 | show(AR ? 'تم تسجيل العينة بنجاح ' : 'Sample registered successfully ', 'success'); |
| provider-app | زرع أو بيانات تهيئة | provider-app/src/screens/lab/LabDashboard.tsx | 497 | <NBtn label={AR ? 'حضور المريض - تسجيل عينة' : 'Patient Arrived - Register Sample'} onPress={() => setShowRegister(true)} /> |
| provider-app | زرع أو بيانات تهيئة | provider-app/src/screens/lab/LabDashboard.tsx | 511 | <NBtn label={AR ? 'تسجيل العينة وإتمام الزيارة' : 'Register Sample & Complete'} onPress={() => setShowRegister(true)} /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/lab/LabDashboard.tsx | 528 | <NInput label={AR ? 'الموعد الجديد' : 'New Date/Time'} placeholder="YYYY-MM-DD HH:MM" value={rescheduleDate} onChange={setRescheduleDate} icon="event" /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/lab/LabDashboard.tsx | 536 | <NInput label={AR ? 'رقم الموافقة' : 'Approval Code'} placeholder="NPH-12345" value={nphiesCode} onChange={setNphiesCode} icon="verified" /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/lab/LabDashboard.tsx | 537 | <NInput label={AR ? 'نسبة التحمل (Co-Pay)' : 'Co-Pay SAR'} placeholder="0.00" value={copay} onChange={setCopay} icon="payments" kbType="numeric" /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/lab/LabDashboard.tsx | 545 | <NInput label={AR ? 'ابحث عن فني' : 'Search Technician'} placeholder={AR ? 'مثال: أحمد' : 'e.g. Ahmed'} value={techName} onChange={setTechName} icon="search" /> |
| provider-app | زرع أو بيانات تهيئة | provider-app/src/screens/lab/LabDashboard.tsx | 550 | {/* Register Sample Sheet */} |
| provider-app | زرع أو بيانات تهيئة | provider-app/src/screens/lab/LabDashboard.tsx | 551 | <NSheet visible={showRegister} onClose={()=>setShowRegister(false)} title={AR ? 'تسجيل العينة (Accessioning)' : 'Register Sample'} height={400}> |
| provider-app | عقد أو قدرة غير منفذة؛ زرع أو بيانات تهيئة | provider-app/src/screens/lab/LabDashboard.tsx | 553 | <NInput label={AR ? 'باركود العينة' : 'Sample Barcode'} placeholder="SMP-XXXXXXXX" value={barcode} onChange={setBarcode} icon="qr-code-scanner" /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/lab/LabDashboard.tsx | 555 | <NInput label={AR ? 'ملاحظات' : 'Notes'} placeholder={AR ? 'ملاحظات اختيارية...' : 'Optional notes...'} value={notes} onChange={setNotes} icon="edit" /> |
| provider-app | زرع أو بيانات تهيئة | provider-app/src/screens/lab/LabDashboard.tsx | 565 | // SAMPLE TRACKING — 4 Stage Pipeline |
| provider-app | زرع أو بيانات تهيئة | provider-app/src/screens/lab/LabDashboard.tsx | 604 | <Text style={{fontSize:FS.xl,fontWeight:FW.bold,color:theme.text}}>{AR?'تتبع العينات':'Sample Tracking'}</Text> |
| provider-app | زرع أو بيانات تهيئة | provider-app/src/screens/lab/LabDashboard.tsx | 667 | function ResultEntry({ sample, onBack }:{ sample:any; onBack:()=>void }) { |
| provider-app | زرع أو بيانات تهيئة | provider-app/src/screens/lab/LabDashboard.tsx | 707 | <NAvatar name={sample?.patient??'—'} size={44} /> |
| provider-app | زرع أو بيانات تهيئة | provider-app/src/screens/lab/LabDashboard.tsx | 708 | <View><Text style={{fontWeight:FW.bold,color:theme.text}}>{sample?.patient??'—'}</Text><Text style={{fontSize:FS.xs,color:theme.textSub}}>{sample?.barcode??'—'}</Text></View> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/lab/LabDashboard.tsx | 721 | <View style={{flex:2}}><NInput placeholder="0.0" value={vals[p.id]??''} onChange={v=>setVals(pv=>({...pv,[p.id]:v}))} kbType="decimal-pad" style={{marginBottom:0}} /></View> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/lab/LabDashboard.tsx | 765 | <NInput label={AR?'ملاحظات الفني':'Technician Notes'} placeholder={AR?'ملاحظات إضافية...':'Additional notes...'} value={notes} onChange={setNotes} multi lines={3} /> |
| provider-app | زرع أو بيانات تهيئة | provider-app/src/screens/lab/LabDashboard.tsx | 768 | <NBtn label={AR?'رفض العينة (إعادة سحب)':'Reject Sample (Recollect)'} variant="danger" onPress={() => setShowReject(true)} style={{marginBottom:SP.md}} /> |
| provider-app | زرع أو بيانات تهيئة | provider-app/src/screens/lab/LabDashboard.tsx | 778 | await client.patch(\`/labs/samples/${sample.id}/stage\`, { stage: 'result_uploaded', approved_by_supervisor: true }); |
| provider-app | زرع أو بيانات تهيئة | provider-app/src/screens/lab/LabDashboard.tsx | 801 | await client.patch(\`/labs/samples/${sample.id}/stage\`, { stage: 'sample_rejected', reason: rejectReason }); |
| provider-app | زرع أو بيانات تهيئة | provider-app/src/screens/lab/LabDashboard.tsx | 802 | show(AR ? 'تم رفض العينة وإشعار المريض بطلب إعادة السحب مجاناً' : 'Sample rejected. Patient notified for free recollection.', 'success'); |
| provider-app | زرع أو بيانات تهيئة | provider-app/src/screens/lab/LabDashboard.tsx | 821 | function ResultReview({ sample, onBack }:{ sample:any; onBack:()=>void }) { |
| provider-app | زرع أو بيانات تهيئة | provider-app/src/screens/lab/LabDashboard.tsx | 825 | const RESULTS = Array.isArray(sample?.results) ? sample.results : []; |
| provider-app | زرع أو بيانات تهيئة | provider-app/src/screens/lab/LabDashboard.tsx | 828 | if (!sample?.id \|\| RESULTS.length === 0) { |
| provider-app | زرع أو بيانات تهيئة | provider-app/src/screens/lab/LabDashboard.tsx | 829 | show(AR ? 'لا توجد نتائج مخزنة قابلة للنشر لهذه العينة.' : 'There are no persisted results available to publish for this sample.', 'error'); |
| provider-app | زرع أو بيانات تهيئة | provider-app/src/screens/lab/LabDashboard.tsx | 834 | await client.post(\`/labs/bookings/${sample.lab_order_id \|\| sample.id}/upload-report\`, { results: RESULTS, send_to: sendTo }); |
| provider-app | زرع أو بيانات تهيئة | provider-app/src/screens/lab/LabDashboard.tsx | 835 | await client.patch(\`/labs/samples/${sample.id}/stage\`, { stage: 'sent' }); |
| provider-app | زرع أو بيانات تهيئة | provider-app/src/screens/lab/LabDashboard.tsx | 850 | <NAvatar name={sample?.patient_name \|\| '—'} size={48} /> |
| provider-app | زرع أو بيانات تهيئة | provider-app/src/screens/lab/LabDashboard.tsx | 851 | <View><Text style={{fontSize:FS.lg,fontWeight:FW.bold,color:theme.text}}>{sample?.patient_name \|\| '—'}</Text><Text style={{fontSize:FS.xs,color:theme.textSub}}>{sample?.barcode??'—'}</Text></View> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/lab/LabDashboard.tsx | 945 | <NInput label={AR?'اسم الفحص بالعربي':'Name (Arabic)'} placeholder={AR?'فحص الفيريتين المتقدم':'Advanced Ferritin'} value={nameAr} onChange={setNameAr} required /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/lab/LabDashboard.tsx | 946 | <NInput label={AR?'اسم الفحص بالإنجليزي':'Name (English)'} placeholder="Advanced Ferritin" value={nameEn} onChange={setNameEn} required /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/lab/LabDashboard.tsx | 949 | <View style={{flex:1}}><NInput label={AR?'وقت النتيجة (ساعة)':'Turnaround (h)'} placeholder="2" value={hours} onChange={v=>setHours(v.replace(/\D/g,''))} kbType="numeric" maxLen={3} /></View> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/lab/LabDashboard.tsx | 952 | <View style={{flex:1}}><NInput label={AR?'الحد الأدنى':'Ref Low'} placeholder="0" value={refLow} onChange={setRefLow} kbType="decimal-pad" /></View> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/lab/LabDashboard.tsx | 953 | <View style={{flex:1}}><NInput label={AR?'الحد الأعلى':'Ref High'} placeholder="100" value={refHigh} onChange={setRefHigh} kbType="decimal-pad" /></View> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/lab/LabDashboard.tsx | 954 | <View style={{flex:1}}><NInput label={AR?'الوحدة':'Unit'} placeholder="mg/dL" value={unit} onChange={setUnit} /></View> |
| provider-app | بيانات أو سلوك محاكى | provider-app/src/screens/lab/LabDashboard.tsx | 1091 | await client.post(\`/labs/bookings/${order?.id \|\| 'dummy'}/assign-technician\`, { technician_id: col.id }); |
| provider-app | زرع أو بيانات تهيئة | provider-app/src/screens/lab/LabDashboard.tsx | 1108 | // QR SAMPLE LABEL |
| provider-app | زرع أو بيانات تهيئة | provider-app/src/screens/lab/LabDashboard.tsx | 1110 | function QRSampleLabel({ sample, onBack }:{ sample:any; onBack:()=>void }) { |
| provider-app | زرع أو بيانات تهيئة | provider-app/src/screens/lab/LabDashboard.tsx | 1114 | <NHeader title={AR?'ملصق QR للعينة':'QR Sample Label'} onBack={onBack} /> |
| provider-app | زرع أو بيانات تهيئة | provider-app/src/screens/lab/LabDashboard.tsx | 1119 | <Text style={{fontSize:FS.lg,fontWeight:FW.bold,color:theme.text,marginTop:SP.xl}}>{sample?.barcode??'SMP-2025-XXX'}</Text> |
| provider-app | زرع أو بيانات تهيئة | provider-app/src/screens/lab/LabDashboard.tsx | 1120 | <Text style={{fontSize:FS.sm,color:theme.textSub,marginTop:SP.xs}}>{sample?.patient??'—'}</Text> |
| provider-app | زرع أو بيانات تهيئة | provider-app/src/screens/lab/LabDashboard.tsx | 1122 | {(sample?.tests??['cbc']).map((tid:string)=>{const t=LAB_TESTS.find(x=>x.id===tid);return <View key={tid} style={{backgroundColor:'#9C27B010',paddingHorizontal:SP.sm,paddingVertical:2,borderRadius:R.full,borderWidth:1,borderColor:'#9C27B030'}}><Text style={{fo |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/lab/LabRegistration.tsx | 214 | placeholder={AR ? 'معمل نبضة للتحاليل الطبية' : 'Nabdah Medical Lab'} |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/lab/LabRegistration.tsx | 222 | placeholder="Nabdah Medical Lab" |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/lab/LabRegistration.tsx | 233 | placeholder={AR ? 'محمد أحمد' : 'Mohamed Ahmed'} |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/lab/LabRegistration.tsx | 241 | placeholder="lab@email.com" |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/lab/LabRegistration.tsx | 269 | placeholder={AR ? 'خالد المالكي' : 'Khalid Al-Malki'} |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/lab/LabRegistration.tsx | 277 | placeholder="123456" |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/lab/LabRegistration.tsx | 288 | placeholder="••••••••" value={data.password} |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/lab/LabRegistration.tsx | 298 | placeholder="••••••••" value={data.confirmPass} |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/lab/LabRegistration.tsx | 466 | placeholder="1234567890" value={data.crNumber} |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/lab/LabRegistration.tsx | 472 | placeholder="MOH-LAB-XXXXX" value={data.mohLicense} |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/lab/LabRegistration.tsx | 481 | placeholder={AR ? 'فئة أ / فئة ب / فئة ج' : 'Class A / Class B / Class C'} |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/lab/LabRegistration.tsx | 488 | placeholder={AR ? 'CBAHI, CAP, ISO 15189' : 'CBAHI, CAP, ISO 15189'} |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/lab/LabRegistration.tsx | 499 | placeholder="RSO-RAD-XXXXX" |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/lab/LabRegistration.tsx | 506 | placeholder={AR ? 'رنين مغناطيسي MRI، أشعة مقطعية CT، موجات فوق صوتية US' : 'MRI, CT, Ultrasound, X-Ray'} |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/lab/LabRegistration.tsx | 516 | placeholder="SA0000000000000000000000" value={data.iban} |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/lab/LabRegistration.tsx | 522 | placeholder="300XXXXXXXXX003" value={data.taxNumber} |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/lab/LabRegistration.tsx | 624 | placeholder={AR ? 'حي الورود' : 'Al-Wurud'} |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/lab/LabRegistration.tsx | 628 | placeholder={AR ? 'شارع الأمير سلطان، الرياض' : 'Prince Sultan Road, Riyadh'} |
| provider-app | زرع أو بيانات تهيئة | provider-app/src/screens/lab/LabRegistration.tsx | 655 | label={AR ? 'خدمة سحب العينات المنزلية' : 'Home Sample Collection'} |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/lab/LabRegistration.tsx | 713 | placeholder="0" |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/lab/LabRegistration.tsx | 731 | placeholder="2" |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/lab/LabRegistration.tsx | 893 | placeholder={AR ? 'ابحث عن فحص...' : 'Search test/scan...'} |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/lab/LabRegistration.tsx | 970 | placeholder={\`${test.hours}h\`} |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/lab/LabRegistration.tsx | 1200 | placeholder={AR ? 'باقة الفحص الشامل' : 'Full Checkup Package'} |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/lab/LabRegistration.tsx | 1207 | placeholder="Full Checkup Package" |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/lab/LabRegistration.tsx | 1243 | placeholder="20" value={bundle.discount} |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/lab/LabRegistration.tsx | 1370 | <NInput label={AR ? 'وقت البدء (صباحاً)' : 'Morning Open'} placeholder="08:00" |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/lab/LabRegistration.tsx | 1373 | <NInput label={AR ? 'وقت الإغلاق (صباحاً)' : 'Morning Close'} placeholder="14:00" |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/lab/LabRegistration.tsx | 1381 | <NInput label={AR ? 'وقت البدء (مساءً)' : 'Evening Open'} placeholder="16:00" |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/lab/LabRegistration.tsx | 1384 | <NInput label={AR ? 'وقت الإغلاق (مساءً)' : 'Evening Close'} placeholder="22:00" |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/lab/LabRegistration.tsx | 1417 | <NInput label={AR ? 'من' : 'From'} placeholder="07:00" |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/lab/LabRegistration.tsx | 1420 | <NInput label={AR ? 'إلى' : 'To'} placeholder="14:00" |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/lab/LabRegistration.tsx | 1429 | <NInput label={AR ? 'إجازة مخطط لها' : 'Planned Vacation'} placeholder={AR ? 'اختر التاريخ من التقويم...' : 'Select vacation date...'} value={data.vacationDate} editable={false} onChange={() => {}} /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/lab/LabRegistration.tsx | 1694 | <NInput value={data.signerName} onChange={v => update({ signerName: v })} placeholder={AR ? 'الاسم الثلاثي' : 'Full Name'} /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/lab/LabRegistration.tsx | 1697 | <NInput value={data.signerRole} onChange={v => update({ signerRole: v })} placeholder={AR ? 'مثال: المالك، المدير العام' : 'e.g. Owner, General Manager'} /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/lab/LabRegistration.tsx | 1713 | placeholder={AR ? 'اسم مطابق للهوية/السجل التجاري' : 'Name matching ID/CR'} |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/lab/LabRegistration.tsx | 1719 | placeholder="SA0000000000000000000000" |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/nursing/NursingDashboard.tsx | 728 | <NInput label={AR?'الضغط':'BP'} placeholder="120/80" value={vitals.bp} onChange={v=>setVitals(p=>({...p,bp:v}))} style={{flex:1,marginBottom:0,minWidth:80}} /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/nursing/NursingDashboard.tsx | 729 | <NInput label={AR?'النبض':'Pulse'} placeholder="72" value={vitals.pulse} onChange={v=>setVitals(p=>({...p,pulse:v}))} kbType="numeric" style={{flex:1,marginBottom:0,minWidth:60}} /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/nursing/NursingDashboard.tsx | 730 | <NInput label={AR?'الحرارة':'Temp'} placeholder="36.8" value={vitals.temp} onChange={v=>setVitals(p=>({...p,temp:v}))} kbType="decimal-pad" style={{flex:1,marginBottom:0,minWidth:60}} /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/nursing/NursingDashboard.tsx | 733 | <NInput label="SpO2" placeholder="98%" value={vitals.spo2} onChange={v=>setVitals(p=>({...p,spo2:v}))} style={{flex:1,marginBottom:0}} /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/nursing/NursingDashboard.tsx | 734 | <NInput label={AR?'السكر':'Glucose'} placeholder="145" value={vitals.glucose} onChange={v=>setVitals(p=>({...p,glucose:v}))} kbType="numeric" style={{flex:1,marginBottom:0}} /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/nursing/NursingDashboard.tsx | 736 | <NInput label={AR?'الملاحظات السريرية':'Clinical Notes'} placeholder={AR?'اكتب ملاحظاتك عن حالة المريض...':'Write your observations about patient condition...'} value={note} onChange={setNote} multi lines={5} /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/nursing/NursingDashboard.tsx | 820 | <NInput label={AR?'ملخص الزيارة':'Visit Summary'} placeholder={AR?'ملخص ما تم خلال الزيارة...':'Summary of visit activities...'} value={summary} onChange={setSummary} multi lines={6} required /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/nursing/NursingDashboard.tsx | 821 | <NInput label={AR?'التوصيات والمتابعة':'Recommendations & Follow-up'} placeholder={AR?'تعليمات المتابعة والزيارة القادمة...':'Follow-up instructions and next visit...'} value={followUp} onChange={setFollowUp} multi lines={4} /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/nursing/NursingDashboard.tsx | 923 | <NInput label={AR?'اسم المستلزم':'Supply Name'} placeholder={AR?'قفازات طبية L':'Medical Gloves L'} value={newItem} onChange={setNewItem} /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/nursing/NursingDashboard.tsx | 924 | <NInput label={AR?'الكمية':'Quantity'} placeholder="1" value={newQty} onChange={v=>setNewQty(v.replace(/\D/g,''))} kbType="numeric" /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/nursing/NursingDashboard.tsx | 1492 | <TextInput value={msg} onChangeText={setMsg} placeholder={AR ? 'اكتب رسالة...' : 'Type a message...'} style={{ flex: 1, backgroundColor: theme.bg, padding: SP.md, borderRadius: R.md, color: theme.text, textAlign: AR ? 'right' : 'left' }} /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/nursing/NursingFieldOps.tsx | 192 | <TextInput placeholder="Blood Pressure (e.g. 120/80)" value={vitals.bp} onChangeText={t => setVitals({...vitals, bp: t})} style={[styles.input, { borderColor: theme.border, color: theme.text, textAlign: AR ? 'right' : 'left' }]} placeholderTextColor={theme.tex |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/nursing/NursingFieldOps.tsx | 193 | <TextInput placeholder="Heart Rate (bpm)" value={vitals.hr} onChangeText={t => setVitals({...vitals, hr: t})} keyboardType="numeric" style={[styles.input, { borderColor: theme.border, color: theme.text, textAlign: AR ? 'right' : 'left' }]} placeholderTextColor |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/nursing/NursingFieldOps.tsx | 194 | <TextInput placeholder="Temperature (°C)" value={vitals.temp} onChangeText={t => setVitals({...vitals, temp: t})} keyboardType="numeric" style={[styles.input, { borderColor: theme.border, color: theme.text, textAlign: AR ? 'right' : 'left' }]} placeholderTextC |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/nursing/NursingFieldOps.tsx | 195 | <TextInput placeholder="SpO2 (%)" value={vitals.spo2} onChangeText={t => setVitals({...vitals, spo2: t})} keyboardType="numeric" style={[styles.input, { borderColor: theme.border, color: theme.text, textAlign: AR ? 'right' : 'left' }]} placeholderTextColor={th |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/nursing/NursingFieldOps.tsx | 196 | <TextInput placeholder="Pain Scale (0-10)" value={vitals.pain_scale} onChangeText={t => setVitals({...vitals, pain_scale: t})} keyboardType="numeric" style={[styles.input, { borderColor: theme.border, color: theme.text, textAlign: AR ? 'right' : 'left' }]} pla |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/nursing/NursingFieldOps.tsx | 206 | placeholder={AR ? "ملاحظات الإجراء وما تم تنفيذه..." : "Procedure notes..."} |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/nursing/NursingFieldOps.tsx | 212 | placeholder={AR ? "التوصيات وخطة المتابعة..." : "Recommendations and follow-up..."} |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/nursing/NursingFieldOps.tsx | 257 | placeholder={AR ? "سبب الإلغاء الطارئ..." : "Reason for emergency abort..."} |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/nursing/NursingRegistration.tsx | 194 | <NInput innerRef={nameArRef} label={AR ? 'الاسم الكامل بالعربي' : 'Name (Arabic)'} placeholder={AR ? (data.mode === 'company' ? 'شركة نبضة للتمريض' : 'ممرض/ة محمد أحمد') : (data.mode === 'company' ? 'Nabdah Nursing Co.' : 'Nurse Mohamed')} value={data.nameAr}  |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/nursing/NursingRegistration.tsx | 195 | <NInput innerRef={nameEnRef} label={AR ? 'الاسم الكامل بالإنجليزي' : 'Name (English)'} placeholder="Nabdah Nursing" value={data.nameEn} onChange={v => update({ nameEn: v })} caps="words" returnKey="next" onSubmit={() => mgrNameRef.current?.focus()} /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/nursing/NursingRegistration.tsx | 218 | <NInput innerRef={emailRef} label={AR ? 'البريد الإلكتروني' : 'Email'} placeholder="nurse@email.com" value={data.managerEmail} onChange={v => update({ managerEmail: v.toLowerCase() })} required error={errs.email} kbType="email-address" returnKey="next" onSubmi |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/nursing/NursingRegistration.tsx | 220 | <NInput innerRef={passwordRef} label={AR ? 'كلمة المرور' : 'Password'} placeholder="••••••••" value={data.password} onChange={v => update({ password: [REDACTED] })} secure required error={errs.pass} returnKey="next" onSubmit={() => confirmPassRef.current?.focu |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/nursing/NursingRegistration.tsx | 222 | <NInput innerRef={confirmPassRef} label={AR ? 'تأكيد كلمة المرور' : 'Confirm Password'} placeholder="••••••••" value={data.confirmPass} onChange={v => update({ confirmPass: [REDACTED] })} secure required error={errs.conf} returnKey="done" onSubmit={handleNext} |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/nursing/NursingRegistration.tsx | 333 | <NInput label={AR ? 'رقم ترخيص SCFHS' : 'SCFHS License Number'} placeholder="123456" value={data.scfhsNumber} onChange={v => update({ scfhsNumber: v.replace(/\D/g, '') })} required error={errs.scfhs} kbType="numeric" maxLen={8} /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/nursing/NursingRegistration.tsx | 334 | <NInput label={AR ? 'تاريخ انتهاء الترخيص' : 'License Expiry'} placeholder="YYYY-MM-DD" value={data.scfhsExpiry} onChange={v => update({ scfhsExpiry: v })} /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/nursing/NursingRegistration.tsx | 335 | <NInput label={AR ? 'رقم الهوية الوطنية' : 'National ID'} placeholder="1XXXXXXXXX" value={data.nationalId} onChange={v => update({ nationalId: v.replace(/\D/g, '') })} kbType="numeric" maxLen={10} /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/nursing/NursingRegistration.tsx | 339 | <NInput label={AR ? 'رقم السجل التجاري CR' : 'CR Number'} placeholder="1234567890" value={data.crNumber} onChange={v => update({ crNumber: v.replace(/\D/g, '') })} required error={errs.cr} kbType="numeric" maxLen={10} /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/nursing/NursingRegistration.tsx | 340 | <NInput label={AR ? 'ترخيص وزارة الصحة MOH' : 'MOH License'} placeholder="MOH-NRS-XXXXX" value={data.mohLicense} onChange={v => update({ mohLicense: v })} required /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/nursing/NursingRegistration.tsx | 344 | <NInput label={AR ? 'رقم الآيبان IBAN' : 'Bank IBAN'} placeholder="SA0000000000000000000000" value={data.iban} onChange={v => update({ iban: v.toUpperCase().replace(/\s/g, '') })} required error={errs.iban} maxLen={24} /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/nursing/NursingRegistration.tsx | 524 | <NInput label={AR ? 'الحي' : 'District'} placeholder={AR ? 'حي الورود' : 'Al-Wurud'} value={data.district} onChange={v => update({ district: v })} caps="words" /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/nursing/NursingRegistration.tsx | 660 | <View style={{ flex: 1 }}><NInput label={AR?'من':'From'} value={data.openTime} onChange={v=>update({openTime:v})} placeholder="07:00" /></View> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/nursing/NursingRegistration.tsx | 661 | <View style={{ flex: 1 }}><NInput label={AR?'إلى':'To'} value={data.closeTime} onChange={v=>update({closeTime:v})} placeholder="15:00" /></View> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/nursing/NursingRegistration.tsx | 670 | <View style={{ flex: 1 }}><NInput label={AR?'من':'From'} value={data.eveningOpenTime} onChange={v=>update({eveningOpenTime:v})} placeholder="15:00" /></View> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/nursing/NursingRegistration.tsx | 671 | <View style={{ flex: 1 }}><NInput label={AR?'إلى':'To'} value={data.eveningCloseTime} onChange={v=>update({eveningCloseTime:v})} placeholder="23:00" /></View> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/nursing/NursingRegistration.tsx | 681 | <NInput label={AR ? 'إجازة مخططة (إيقاف الحجوزات)' : 'Planned Vacation'} placeholder={AR ? 'اختر التاريخ من التقويم...' : 'Choose vacation date...'} value={data.vacationDate} editable={false} onChange={() => {}} icon="📅" /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/nursing/NursingRegistration.tsx | 920 | <NInput value={data.signerName} onChange={v => update({ signerName: v })} placeholder={AR ? 'الاسم الثلاثي' : 'Full Name'} /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/nursing/NursingRegistration.tsx | 923 | <NInput value={data.signerRole} onChange={v => update({ signerRole: v })} placeholder={AR ? 'مثال: المالك، المدير العام' : 'e.g. Owner, General Manager'} /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/nursing/NursingRegistration.tsx | 938 | placeholder={AR ? 'اسم مطابق للهوية/السجل التجاري' : 'Name matching ID/CR'} |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/nursing/NursingRegistration.tsx | 944 | placeholder="SA0000000000000000000000" |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/pharmacy/PharmacyDashboard.tsx | 427 | <NInput value={rxNumber} onChange={setRxNumber} placeholder={AR ? 'رقم الوصفة (RX-...)' : 'Rx Number (RX-...)'} icon="" /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/pharmacy/PharmacyDashboard.tsx | 553 | <TextInput placeholder={AR ? 'اكتب أسماء الأدوية المطلوبة هنا...' : 'Type medication names here...'} value={b2bText} onChangeText={setB2bText} multiline style={{ height: 120, textAlignVertical: 'top', backgroundColor: theme.surface, padding: 12, borderRadius:  |
| provider-app | زرع أو بيانات تهيئة | provider-app/src/screens/pharmacy/PharmacyDashboard.tsx | 611 | <NEmpty icon="account_balance_wallet" title={AR ? 'المحفظة غير متاحة حالياً' : 'Wallet unavailable'} sub={AR ? 'أُزيلت الأرصدة والأرقام التجريبية. يتطلب العرض والسحب وتصدير التقارير عقد محفظة مالي مخزن ومزوّد دفع مهيأ.' : 'Sample balances were removed. Display |
| provider-app | زرع أو بيانات تهيئة | provider-app/src/screens/pharmacy/PharmacyDashboard.tsx | 937 | <NEmpty icon="inventory" title={AR ? 'كتالوج المخزون غير متاح بعد' : 'Inventory catalog is not available yet'} sub={AR ? 'عقد البحث الحالي لا يوفر قائمة مخزون صيدلية كاملة قابلة للعرض أو التعديل، لذلك أُزيلت الكميات والأسعار التجريبية.' : 'The current search c |
| provider-app | زرع أو بيانات تهيئة | provider-app/src/screens/pharmacy/PharmacyDashboard.tsx | 953 | <NEmpty icon="chat" title={AR ? 'المحادثات غير متاحة حالياً' : 'Messaging is not available yet'} sub={AR ? 'أزيلت الرسائل التجريبية. سيظهر التواصل فقط بعد تهيئة خدمة رسائل مخزنة ومربوطة بطلب فعلي.' : 'Sample messages were removed. Conversation will appear only |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/pharmacy/PharmacyRegistration.tsx | 187 | <NInput innerRef={nameArRef} label={AR?'اسم الصيدلية بالعربي':'Pharmacy Name (Arabic)'} placeholder={AR?'صيدلية نبضة الصحة':'Nabdah Health Pharmacy'} value={data.nameAr} onChange={v=>update({nameAr:v})} required error={errs.nameAr} caps="words" returnKey="next |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/pharmacy/PharmacyRegistration.tsx | 188 | <NInput innerRef={nameEnRef} label={AR?'اسم الصيدلية بالإنجليزي':'Pharmacy Name (English)'} placeholder="Nabdah Health Pharmacy" value={data.nameEn} onChange={v=>update({nameEn:v})} caps="words" returnKey="next" onSubmit={() => pharmaRef.current?.focus()} /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/pharmacy/PharmacyRegistration.tsx | 191 | <NInput innerRef={pharmaRef} label={AR?'اسم الصيدلاني المسؤول':'Head Pharmacist Name'} placeholder={AR?'محمد أحمد السعودي':'Mohamed Ahmed'} value={data.pharmacistName} onChange={v=>update({pharmacistName:v})} required error={errs.pharma} caps="words" hint={AR? |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/pharmacy/PharmacyRegistration.tsx | 194 | <NInput innerRef={mgrNameRef} label={AR?'اسم المدير التنفيذي':'Manager Name'} placeholder={AR?'خالد عمر المالكي':'Khalid Omar'} value={data.managerName} onChange={v=>update({managerName:v})} required error={errs.mgr} caps="words" returnKey="next" onSubmit={()  |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/pharmacy/PharmacyRegistration.tsx | 195 | <NInput innerRef={emailRef} label={AR?'البريد الإلكتروني':'Email'} placeholder="pharmacy@email.com" value={data.managerEmail} onChange={v=>update({managerEmail:v.toLowerCase()})} required error={errs.email} kbType="email-address" returnKey="next" onSubmit={()  |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/pharmacy/PharmacyRegistration.tsx | 197 | <NInput innerRef={passwordRef} label={AR?'كلمة المرور':'Password'} placeholder="••••••••" value={data.password} onChange={v=>update({password:[REDACTED])} secure required error={errs.pass} hint={AR?'8 أحرف — أرقام وحروف كبيرة وصغيرة ورموز':'8+ chars — numbers, |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/pharmacy/PharmacyRegistration.tsx | 199 | <NInput innerRef={confirmPassRef} label={AR?'تأكيد كلمة المرور':'Confirm Password'} placeholder="••••••••" value={data.confirmPass} onChange={v=>update({confirmPass:[REDACTED])} secure required error={errs.conf} returnKey="done" onSubmit={handleNext} /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/pharmacy/PharmacyRegistration.tsx | 303 | <NInput label={AR?'رقم السجل التجاري CR':'CR Number'} placeholder="1234567890" value={data.crNumber} onChange={v=>update({crNumber:v.replace(/\D/g,'')})} required error={errs.cr} kbType="numeric" maxLen={10} /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/pharmacy/PharmacyRegistration.tsx | 304 | <NInput label={AR?'رقم ترخيص وزارة الصحة MOH':'MOH License Number'} placeholder="MOH-PHR-XXXXX" value={data.mohLicense} onChange={v=>update({mohLicense:v})} required error={errs.moh} hint={AR?'ترخيص الصيدلية من وزارة الصحة السعودية':'Saudi Ministry of Health p |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/pharmacy/PharmacyRegistration.tsx | 305 | <NInput label={AR?'رقم ترخيص SFDA (هيئة الغذاء والدواء)':'SFDA License Number'} placeholder="SFDA-XXXXX" value={data.sfdaNumber} onChange={v=>update({sfdaNumber:v})} required error={errs.sfda} hint={AR?'ترخيص صرف الأدوية من هيئة الغذاء والدواء':'Saudi Food and |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/pharmacy/PharmacyRegistration.tsx | 306 | <NInput label={AR?'رقم الآيبان IBAN':'Bank IBAN'} placeholder="SA0000000000000000000000" value={data.iban} onChange={v=>update({iban:v.toUpperCase().replace(/\s/g,'')})} required error={errs.iban} maxLen={24} hint={AR?'SA + 22 رقم — لاستلام المدفوعات':'SA + 22 |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/pharmacy/PharmacyRegistration.tsx | 307 | <NInput label={AR?'الرقم الضريبي VAT (اختياري)':'VAT Number (Optional)'} placeholder="300XXXXXXXXX003" value={data.taxNumber} onChange={v=>update({taxNumber:v})} maxLen={15} /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/pharmacy/PharmacyRegistration.tsx | 351 | <NInput label={AR?'الحي / المنطقة':'District / Area'} placeholder={AR?'حي الورود':'Al-Wurud District'} value={data.district} onChange={v=>update({district:v})} caps="words" /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/pharmacy/PharmacyRegistration.tsx | 352 | <NInput label={AR?'العنوان الكامل':'Full Address'} placeholder={AR?'شارع الأمير سلطان، حي الروضة':'Prince Sultan Road, Al-Rawdah'} value={data.address} onChange={v=>update({address:v})} required error={errs.address} multi lines={2} /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/pharmacy/PharmacyRegistration.tsx | 520 | <NInput label={AR ? 'إجازة مخططة (إيقاف الطلبات مؤقتاً)' : 'Planned Vacation'} placeholder={AR ? 'اختر التاريخ من التقويم...' : 'Choose date...'} value={data.vacationDate} onChange={() => {}} editable={false} icon="📅" /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/pharmacy/PharmacyRegistration.tsx | 619 | <NInput label={AR?'وقت التوصيل السريع (دقيقة)':'Express Delivery Time (min)'} placeholder="30" value={data.expressMinutes} onChange={v=>update({expressMinutes:v.replace(/\D/g,'')})} kbType="numeric" maxLen={3} /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/pharmacy/PharmacyRegistration.tsx | 838 | placeholder={AR ? 'اسم مطابق للهوية/السجل التجاري' : 'Name matching ID/CR'} |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/pharmacy/PharmacyRegistration.tsx | 844 | placeholder="SA0000000000000000000000" |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/pharmacy/PharmacyRegistration.tsx | 862 | <NInput value={data.signerName} onChange={v => update({ signerName: v })} placeholder={AR ? 'الاسم الثلاثي' : 'Full Name'} /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/pharmacy/PharmacyRegistration.tsx | 865 | <NInput value={data.signerRole} onChange={v => update({ signerRole: v })} placeholder={AR ? 'مثال: المالك، المدير التنفيذي' : 'e.g. Owner, CEO'} /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/radiology/RadiologyDashboard.tsx | 269 | <NInput label={AR ? 'رمز الموافقة (NPHIES)' : 'NPHIES Approval Code'} value={nphiesCode} onChange={setNphiesCode} placeholder="NPH-2024-XXXXX" /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/radiology/RadiologyDashboard.tsx | 341 | <NInput label={AR ? 'النتائج السريرية (Findings)' : 'Clinical Findings'} value={findings} onChange={setFindings} multi lines={4} placeholder={AR ? 'اذكر النتائج الإشعاعية...' : 'Describe radiology findings...'} /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/radiology/RadiologyDashboard.tsx | 349 | <NInput label={AR ? 'رابط PACS/DICOM الخارجي' : 'External PACS/DICOM URL'} value={dicomUrl} onChange={setDicomUrl} placeholder="https://pacs.hospital.com/viewer/..." /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/radiology/RadiologyDashboard.tsx | 436 | <NInput label={AR ? 'اسم الفحص (عربي)' : 'Scan Name (Arabic)'} value={nameAr} onChange={setNameAr} placeholder="رنين مغناطيسي الدماغ بصبغة" /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/radiology/RadiologyDashboard.tsx | 437 | <NInput label={AR ? 'اسم الفحص (إنجليزي)' : 'Scan Name (English)'} value={nameEn} onChange={setNameEn} placeholder="MRI Brain with Contrast" /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/radiology/RadiologyDashboard.tsx | 439 | <NInput label={AR ? 'المدة المتوقعة (دقيقة)' : 'Expected Duration (minutes)'} value={duration} onChange={setDuration} placeholder="30" /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/radiology/RadiologyDashboard.tsx | 480 | <NInput label={AR ? 'من' : 'From'} value={morningFrom} onChange={setMorningFrom} placeholder="08:00" style={{ flex: 1 }} /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/radiology/RadiologyDashboard.tsx | 481 | <NInput label={AR ? 'إلى' : 'To'} value={morningTo} onChange={setMorningTo} placeholder="14:00" style={{ flex: 1 }} /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/radiology/RadiologyDashboard.tsx | 485 | <NInput label={AR ? 'من' : 'From'} value={eveningFrom} onChange={setEveningFrom} placeholder="17:00" style={{ flex: 1 }} /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/radiology/RadiologyDashboard.tsx | 486 | <NInput label={AR ? 'إلى' : 'To'} value={eveningTo} onChange={setEveningTo} placeholder="22:00" style={{ flex: 1 }} /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/radiology/RadiologyRegistration.tsx | 214 | placeholder={AR ? 'معمل نبضة للتحاليل الطبية' : 'Nabdah Medical Radiology'} |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/radiology/RadiologyRegistration.tsx | 222 | placeholder="Nabdah Medical Radiology" |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/radiology/RadiologyRegistration.tsx | 233 | placeholder={AR ? 'محمد أحمد' : 'Mohamed Ahmed'} |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/radiology/RadiologyRegistration.tsx | 241 | placeholder="lab@email.com" |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/radiology/RadiologyRegistration.tsx | 269 | placeholder={AR ? 'خالد المالكي' : 'Khalid Al-Malki'} |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/radiology/RadiologyRegistration.tsx | 277 | placeholder="123456" |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/radiology/RadiologyRegistration.tsx | 288 | placeholder="••••••••" value={data.password} |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/radiology/RadiologyRegistration.tsx | 298 | placeholder="••••••••" value={data.confirmPass} |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/radiology/RadiologyRegistration.tsx | 466 | placeholder="1234567890" value={data.crNumber} |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/radiology/RadiologyRegistration.tsx | 472 | placeholder="MOH-LAB-XXXXX" value={data.mohLicense} |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/radiology/RadiologyRegistration.tsx | 481 | placeholder={AR ? 'فئة أ / فئة ب / فئة ج' : 'Class A / Class B / Class C'} |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/radiology/RadiologyRegistration.tsx | 488 | placeholder={AR ? 'CBAHI, CAP, ISO 15189' : 'CBAHI, CAP, ISO 15189'} |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/radiology/RadiologyRegistration.tsx | 499 | placeholder="RSO-RAD-XXXXX" |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/radiology/RadiologyRegistration.tsx | 506 | placeholder={AR ? 'رنين مغناطيسي MRI، أشعة مقطعية CT، موجات فوق صوتية US' : 'MRI, CT, Ultrasound, X-Ray'} |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/radiology/RadiologyRegistration.tsx | 516 | placeholder="SA0000000000000000000000" value={data.iban} |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/radiology/RadiologyRegistration.tsx | 522 | placeholder="300XXXXXXXXX003" value={data.taxNumber} |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/radiology/RadiologyRegistration.tsx | 624 | placeholder={AR ? 'حي الورود' : 'Al-Wurud'} |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/radiology/RadiologyRegistration.tsx | 628 | placeholder={AR ? 'شارع الأمير سلطان، الرياض' : 'Prince Sultan Road, Riyadh'} |
| provider-app | زرع أو بيانات تهيئة | provider-app/src/screens/radiology/RadiologyRegistration.tsx | 655 | label={AR ? 'خدمة سحب العينات المنزلية' : 'Home Sample Collection'} |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/radiology/RadiologyRegistration.tsx | 713 | placeholder="0" |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/radiology/RadiologyRegistration.tsx | 731 | placeholder="2" |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/radiology/RadiologyRegistration.tsx | 893 | placeholder={AR ? 'ابحث عن فحص...' : 'Search test/scan...'} |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/radiology/RadiologyRegistration.tsx | 970 | placeholder={\`${test.hours}h\`} |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/radiology/RadiologyRegistration.tsx | 1200 | placeholder={AR ? 'باقة الفحص الشامل' : 'Full Checkup Package'} |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/radiology/RadiologyRegistration.tsx | 1207 | placeholder="Full Checkup Package" |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/radiology/RadiologyRegistration.tsx | 1243 | placeholder="20" value={bundle.discount} |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/radiology/RadiologyRegistration.tsx | 1370 | <NInput label={AR ? 'وقت البدء (صباحاً)' : 'Morning Open'} placeholder="08:00" |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/radiology/RadiologyRegistration.tsx | 1373 | <NInput label={AR ? 'وقت الإغلاق (صباحاً)' : 'Morning Close'} placeholder="14:00" |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/radiology/RadiologyRegistration.tsx | 1381 | <NInput label={AR ? 'وقت البدء (مساءً)' : 'Evening Open'} placeholder="16:00" |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/radiology/RadiologyRegistration.tsx | 1384 | <NInput label={AR ? 'وقت الإغلاق (مساءً)' : 'Evening Close'} placeholder="22:00" |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/radiology/RadiologyRegistration.tsx | 1417 | <NInput label={AR ? 'من' : 'From'} placeholder="07:00" |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/radiology/RadiologyRegistration.tsx | 1420 | <NInput label={AR ? 'إلى' : 'To'} placeholder="14:00" |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/radiology/RadiologyRegistration.tsx | 1429 | <NInput label={AR ? 'إجازة مخطط لها' : 'Planned Vacation'} placeholder={AR ? 'اختر التاريخ من التقويم...' : 'Select vacation date...'} value={data.vacationDate} editable={false} onChange={() => {}} /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/radiology/RadiologyRegistration.tsx | 1694 | <NInput value={data.signerName} onChange={v => update({ signerName: v })} placeholder={AR ? 'الاسم الثلاثي' : 'Full Name'} /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/radiology/RadiologyRegistration.tsx | 1697 | <NInput value={data.signerRole} onChange={v => update({ signerRole: v })} placeholder={AR ? 'مثال: المالك، المدير العام' : 'e.g. Owner, General Manager'} /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/radiology/RadiologyRegistration.tsx | 1713 | placeholder={AR ? 'اسم مطابق للهوية/السجل التجاري' : 'Name matching ID/CR'} |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/radiology/RadiologyRegistration.tsx | 1719 | placeholder="SA0000000000000000000000" |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/shared/BlueprintScreens.tsx | 155 | <NInput label={AR ? 'عنوان الحملة' : 'Campaign Title'} placeholder={AR ? 'مثال: باقة الفحص السريع' : 'e.g. Rapid Checkup Package'} value={title} onChange={setTitle} required /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/shared/BlueprintScreens.tsx | 158 | <NInput label={AR ? 'تاريخ البدء' : 'Start Date'} placeholder="YYYY-MM-DD" value={startDate} onChange={setStartDate} /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/shared/BlueprintScreens.tsx | 159 | <NInput label={AR ? 'تاريخ الانتهاء' : 'End Date'} placeholder="YYYY-MM-DD" value={endDate} onChange={setEndDate} /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/shared/BlueprintScreens.tsx | 588 | <NInput label={AR ? 'سبب الحظر' : 'Block Reason'} value={blockReason} onChange={setBlockReason} placeholder={AR ? 'مثال: عدم الحضور المتكرر للمواعيد' : 'e.g. Frequent no-show'} /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/shared/BlueprintScreens.tsx | 603 | <NInput label={AR ? 'إضافة ملاحظة جديدة' : 'Add New Note'} value={noteText} onChange={setNoteText} placeholder={AR ? 'اكتب ملاحظتك الطبية الخاصة هنا...' : 'Type note...'} multi lines={3} /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/shared/BlueprintScreens.tsx | 710 | <TextInput style={{ backgroundColor: theme.surface, color: theme.text, padding: SP.md, borderRadius: R.md, height: 80, textAlignVertical: 'top', textAlign: AR ? 'right' : 'left' }} multiline placeholder={AR ? "شكوى المريض..." : "Patient complaint..."} placehol |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/shared/BlueprintScreens.tsx | 715 | <TextInput style={{ backgroundColor: theme.surface, color: theme.text, padding: SP.md, borderRadius: R.md, height: 80, textAlignVertical: 'top', textAlign: AR ? 'right' : 'left' }} multiline placeholder={AR ? "العلامات الحيوية..." : "Vitals, observations..."}  |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/shared/BlueprintScreens.tsx | 720 | <TextInput style={{ backgroundColor: theme.surface, color: theme.text, padding: SP.md, borderRadius: R.md, height: 80, textAlignVertical: 'top', textAlign: AR ? 'right' : 'left' }} multiline placeholder={AR ? "التشخيص المبدئي..." : "Initial diagnosis..."} plac |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/shared/BlueprintScreens.tsx | 725 | <TextInput style={{ backgroundColor: theme.surface, color: theme.text, padding: SP.md, borderRadius: R.md, height: 80, textAlignVertical: 'top', textAlign: AR ? 'right' : 'left' }} multiline placeholder={AR ? "الخطة العلاجية..." : "Treatment plan..."} placehol |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/shared/BlueprintScreens.tsx | 816 | <NInput label={AR ? 'اسم أو رقم المريض' : 'Patient Name / ID'} value={patientId} onChange={setPatientId} placeholder={AR ? 'أدخل اسم المريض أو هويته...' : 'Enter patient name/ID...'} /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/shared/BlueprintScreens.tsx | 818 | <NSearch value={search} onChange={setSearch} placeholder={AR ? 'ابحث عن معمل تحاليل أو مركز أشعة...' : 'Search lab networks / radiologies...'} /> |
| provider-app | بيانات أو سلوك محاكى | provider-app/src/screens/shared/BlueprintScreens.tsx | 980 | [ {AR ? 'محاكاة الخريطة والملاحة الحية' : 'Simulated GPS Navigation Map'} ] |
| provider-app | زرع أو بيانات تهيئة | provider-app/src/screens/shared/BlueprintScreens.tsx | 1055 | <NHeader title="Lab Sample Scanner" onBack={onBack} /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/shared/BlueprintScreens.tsx | 1090 | <NSearch value={search} onChange={setSearch} placeholder={AR ? 'ابحث عن طبيب، تخصص، مستشفى...' : 'Search doctor, specialty, hospital...'} /> |
| provider-app | بيانات أو سلوك محاكى | provider-app/src/screens/shared/LiveKitRoomProvider.tsx | 27 | <Text style={{color: theme.textMuted}}>Video UI requires tracks from hooks. Simplified for demo.</Text> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/shared/PharmacyChatResponder.tsx | 77 | placeholder="اكتب ردك..." |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/shared/RealScreens.tsx | 68 | placeholder={AR ? 'اكتب ردك هنا...' : 'Type your reply...'} |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/shared/RealScreens.tsx | 194 | <NInput placeholder={AR ? 'كلمة المرور الحالية' : 'Current Password'} secure value={oldPassword} onChange={setOldPassword} /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/shared/RealScreens.tsx | 196 | <NInput placeholder={AR ? 'كلمة المرور الجديدة' : 'New Password'} secure value={newPassword} onChange={setNewPassword} /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/shared/RealScreens.tsx | 278 | <NInput placeholder={AR ? 'عنوان المشكلة أو الاستفسار' : 'Subject'} value={subject} onChange={setSubject} /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/shared/RealScreens.tsx | 280 | <NInput placeholder={AR ? 'تفاصيل المشكلة والتوضيح...' : 'Problem details...'} value={message} onChange={setMessage} /> |
| provider-app | معرف ثابت مرشح للمراجعة | provider-app/src/screens/shared/RealScreensExtended.tsx | 92 | {AR ? 'الرقم المرجعي: ORD-9921 \| المسافة المتبقية: 1.4 كم (8 دقائق)' : 'Ref: ORD-9921 \| Distance: 1.4 km (8 min)'} |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/shared/RealScreensExtended.tsx | 164 | <NInput placeholder={AR ? 'اسم الدواء (العلمي والتجاري)' : 'Drug Name'} value={name} onChange={setName} /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/shared/RealScreensExtended.tsx | 166 | <NInput placeholder={AR ? 'السعر المحدد (ر.س)' : 'Price (SAR)'} kbType="numeric" value={price} onChange={setPrice} /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/shared/RealScreensExtended.tsx | 168 | <NInput placeholder={AR ? 'رمز البار كود SFDA' : 'SFDA Barcode'} value={code} onChange={setCode} /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/shared/RealScreensExtended.tsx | 219 | <NInput placeholder={AR ? 'اسم الدواء المفقود بالأسواق' : 'Shortage Drug Name'} value={drug} onChange={setDrug} /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/shared/RegistrationSuccess.tsx | 83 | placeholder={AR ? 'أدخل الرمز المكون من 4 أرقام' : 'Enter 4-digit code'} |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/shared/SharedScreens.tsx | 90 | <NSearch value={search} onChange={setSearch} placeholder={AR ? 'ابحث في المحادثات...' : 'Search conversations...'} /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/shared/SharedScreens.tsx | 230 | placeholder={AR ? 'اكتب رسالة...' : 'Type a message...'} |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/shared/SharedScreens.tsx | 418 | <NInput label={AR ? 'عنوان التذكرة' : 'Ticket Subject'} placeholder={AR ? 'صف مشكلتك باختصار' : 'Brief description'} value={subject} onChange={setSubject} required /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/shared/SharedScreens.tsx | 419 | <NInput label={AR ? 'التفاصيل' : 'Details'} placeholder={AR ? 'اشرح مشكلتك بالتفصيل...' : 'Explain your issue...'} value={body} onChange={setBody} multi lines={6} required /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/shared/SharedScreens.tsx | 637 | <NSearch value={search} onChange={setSearch} placeholder={AR ? 'ابحث...' : 'Search...'} style={{ marginBottom: SP.lg }} /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/shared/SharedScreens.tsx | 1101 | placeholder="1234" |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/shared/SharedScreens.tsx | 1383 | <NInput label={AR ? 'سنوات الخبرة' : 'Years of Experience'} placeholder="5" value={applyExp} onChange={setApplyExp} kbType="numeric" /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/shared/SharedScreens.tsx | 1384 | <NInput label={AR ? 'الجاهزية للعمل (المدة)' : 'Ready to Start (Notice Period)'} placeholder={AR ? 'جاهز فوراً، شهر، إلخ' : 'Immediately, 1 month, etc.'} value={applyReady} onChange={setApplyReady} /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/shared/SharedScreens.tsx | 1476 | <NSearch value={search} onChange={setSearch} placeholder={AR ? 'ابحث بالمهنة، المستشفى، التخصص...' : 'Search profession, hospital...'} /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/shared/SharedScreens.tsx | 1533 | <NInput label={postType === 'offer' ? (AR ? 'المسمى الوظيفي المطلوب' : 'Job Title') : (AR ? 'الوظيفة التي تبحث عنها' : 'Desired Title')} placeholder={AR ? 'مثال: أخصائي باطنة' : 'e.g. Internal Med'} value={postTitle} onChange={setPostTitle} required /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/shared/SharedScreens.tsx | 1535 | <NInput label={postType === 'offer' ? (AR ? 'اسم المنشأة أو المستشفى (اختياري)' : 'Facility Name') : (AR ? 'جهة العمل الحالية (اختياري)' : 'Current Facility')} placeholder={AR ? 'اكتب اسم المنشأة...' : 'Facility Name'} value={postCompany} onChange={setPostComp |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/shared/SharedScreens.tsx | 1557 | <NInput label={AR ? 'الجنسية المطلوبة' : 'Nationality'} placeholder={AR ? 'مثال: مفتوح، سعودي' : 'e.g. Any, Saudi'} value={postNat} onChange={setPostNat} /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/shared/SharedScreens.tsx | 1560 | <NInput label={AR ? 'سنوات الخبرة' : 'Experience'} placeholder="5" value={postExp} onChange={setPostExp} kbType="numeric" /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/shared/SharedScreens.tsx | 1576 | <NInput label={AR ? 'الراتب (اختياري)' : 'Salary (Optional)'} placeholder={AR ? 'يحدد لاحقاً' : 'Negotiable'} value={postSalary} onChange={setPostSalary} /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/shared/SharedScreens.tsx | 1606 | <NInput label={AR ? 'رقم الواتساب للتواصل' : 'WhatsApp Number'} placeholder="05xxxxxxxx" value={postPhone} onChange={setPostPhone} kbType="phone-pad" required /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/shared/SharedScreens.tsx | 1609 | <NInput label={AR ? 'الوصف والتفاصيل' : 'Details'} placeholder={AR ? 'اكتب التفاصيل هنا...' : 'Write details...'} value={postDesc} onChange={setPostDesc} multi lines={4} /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/shared/SharedScreens.tsx | 1765 | <NSearch value={search} onChange={setSearch} placeholder={AR ? 'ابحث باسم الدواء أو المادة الفعالة...' : 'Search drug name or active ingredient...'} /> |
| provider-app | عقد أو قدرة غير منفذة | provider-app/src/screens/shared/SharedScreens.tsx | 2168 | // FEATURE UNDER DEVELOPMENT SCREEN (PREMIUM PLACEHOLDER) |
| provider-app | بيانات أو سلوك محاكى | provider-app/src/utils/notifications.ts | 42 | projectId: process.env.EXPO_PUBLIC_PROJECT_ID \|\| 'dummy-project-id' |
| provider-app | بيانات أو سلوك محاكى | provider-app/src/utils/PushNotifications.ts | 30 | projectId: process.env.EXPO_PUBLIC_PROJECT_ID \|\| 'dummy-project-id' |
| provider-app | عنوان تطوير محلي | provider-app/test_backend.js | 4 | const api = axios.create({ baseURL: 'http://localhost:8002/api/v1' }); |
| provider-app | عقد أو قدرة غير منفذة | provider-app/utils/api.ts | 5 | // For zero-placeholder execution, we actually fetch it from storage. |
| provider-app | عنوان تطوير محلي | provider-app/verify_login.js | 5 | const res = await axios.post('http://localhost:8002/api/v1/auth/login', { |
| provider-app | عنوان تطوير محلي | provider-app/wait_for_backend.js | 3 | const api = axios.create({ baseURL: 'http://localhost:8002/api/v1' }); |

## قواعد القراءة

تعني تطابقات حقول الإدخال مثل `placeholder` أحياناً نصاً إرشادياً فقط، وليست بيانات تشغيلية وهمية. أما تطابقات المحاكاة أو المعرفات أو العناوين أو العقود غير المنفذة فتحتاج حكماً يدوياً في السجل التفصيلي قبل الإغلاق أو الإصلاح.

## المراجع الداخلية

| المرجع | الغرض |
|---|---|
| هذا الملف الموحد | السجل التنفيذي والفهرس الكامل بالمسار والسطر |
| `NABDAH_FINAL_REMEDIATION_REPORT.md` | ملخص المعالجة وحكم الجاهزية |
| `NABDAH_E2E_TRACEABILITY_REPORT.md` | خريطة الواجهات والعقود وحالة E2E |
| `POST_REMEDIATION_E2E_EXECUTION_PLAN.md` | خطة التحقق المنشور اللاحقة |
