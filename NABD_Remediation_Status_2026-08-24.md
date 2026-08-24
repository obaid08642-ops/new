# حالة إصلاح NABD — 24 أغسطس 2026

## القرار التنفيذي

تم تنفيذ **دفعة إصلاحات موثقة** على فرع `remediation/phase0-backend-baseline` فقط. اجتازت بوابات الاختبار والبناء المحلية للتطبيقات الثلاثة، لكن ذلك **لا يساوي جاهزية إنتاجية أو إذن نشر**. لا يزال الدمج إلى `main` والنشر محجوبين لأن عوائق أمنية وتشغيلية حرجة من الفحص الشامل لم تُغلق، ولأن وجهة النشر والنسخ الاحتياطي والتراجع وتحقق البيئة الحقيقية غير مهيأة أو معتمدة.

> نطاق الإنجاز الحالي هو تصحيح عقود ومسارات بعينها واختبارها محليًا. لا ينبغي تفسيره على أنه إغلاق لجميع عيوب المنتج أو إتاحة دفع/تأمين/زيارات منزلية كاملة.

| المجال | الحالة | النتيجة الدقيقة |
|---|---|---|
| Backend migration/error baseline | **COMPLETE محليًا** | migration runner محافظ، اختبارات Mongo Memory، تعقيم 5xx، ومعالجة index المكرر موجودة في الفرع السابق. |
| Web patient cash flows | **PARTIAL** | سلة وcheckout نقدي، عناوين، حجز مختبر facility cash، أشعة in-center، ورعاية منزلية cash؛ لا PSP ولا تأمين ولا Rx Web مكتمل. |
| رفع Rx في المحمول | **PARTIAL** | لا يحفظ URI محلي؛ يرفع صورة مقيدة إلى الباكند ويحتفظ بمعرّف خادمي فقط. لا يوجد E2E مع منتقي صورة/طلب صيدلية حقيقي بعد. |
| QR الهوية الصحية | **PARTIAL** | لم يعد QR أو البطاقة يعرضان أو يرمّزان `national_id` أو `user_id`؛ يستخدمان `qr_payload` موقعًا قصير العمر من `/users/me/health-id`. لا يوجد تحقق مستقل end-to-end أو دورة تجديد/انتهاء مستخدم مثبتة. |
| مواعيد الاستشارة/مركز الطلبات | **PARTIAL** | شاشة النجاح تجلب موعدًا حقيقيًا ولا تعرض طبيبًا/تاريخًا ثابتًا؛ مركز الطلبات يستخدم `GET /care/appointments` الموجود فعليًا. لم تُنفذ رحلة واجهة E2E. |
| تشخيصات المحمول | **PARTIAL** | checkout تشخيصي فعلي بديل للـredirect، مع قيود السلة والخدمة؛ لم يثبت ضد بيئة متعددة الأدوار. |
| idempotency المحمول | **COMPLETE على طبقة العميل** | `POST/PATCH/DELETE` يضيف مفتاحًا تلقائيًا ولا يعيد محاولة mutation تلقائيًا؛ الباكند يطلب idempotency لرفع Rx. |
| FormData | **COMPLETE على طبقة العميل** | اختبار يثبت أن FormData لا يُرسل مع `Content-Type: application/json` قسريًا. |
| Jest teardown المحمول | **COMPLETE محليًا** | أصلح عدم توافق `jest-circus` ومحاكاة Expo Notifications/Fetch؛ suite يغلق دون `--forceExit` أو رسالة late logging. |
| خطوط Cairo المحمولة | **COMPLETE محليًا** | استُبدلت ستة ملفات HTML مموهة بملفات TrueType سليمة للأوزان 400–900، مع نسخة ترخيص OFL. المصدر الرسمي لـCairo هو Google Fonts [1]. |
| دمج `main` | **BLOCKED** | لم يُدمج أي commit، ولا تزال مراجعة source-layout وP0/P1 المتبقية مطلوبة. |
| نشر خادم | **BLOCKED** | لا target/server connector أو sandbox/prod separation أو backup/rollback أو موافقة نشر منفصلة. |

## إصلاحات هذه الدفعة

### 1. سلسلة الوصفة الطبية في التطبيق والباكند

تم تعديل `patient-mobile/app/pharmacy/cart.tsx` ليستخدم عميل API الفعلي ويرفع صورة الوصفة إلى `POST /prescriptions/upload`، ثم يخزن `saved.id` فقط. يعيد checkout التحقق من أن القيمة UUID خادمي بدل قبول `file://` أو URL. كما تم تصحيح اشتقاق MIME لصيغ JPEG وPNG وWebP، ما يجعل الحمولة موافقة للتحقق الخادمي.

في الباكند، يفرض `PrescriptionsService.uploadByPatient` Data URL مدعومًا، Base64 صحيحًا، حدًا قدره 5 MiB، ومطابقة magic signature للـMIME. يقيد العناصر إلى 100 والملاحظات إلى 2,000 محرف، ويرفض المدخلات قبل الحفظ. يحمل `POST /prescriptions/upload` الآن `@RequireIdempotency()`، وحدث إنشاء الوصفة يأخذ patient id من المستخدم المصادق بدل شكل كائن المستودع.

| دليل | النتيجة |
|---|---|
| `58_backend_prescription_upload_test.log` | كشف خللًا في حمولة الحدث أثناء الاختبار؛ لم يُخفَ الخطأ. |
| `59_backend_prescription_upload_test_fixed.log` | **20/20** اختبارًا مر؛ تغطية قبول PNG صحيح ورفض بيانات لا تطابق توقيع JPEG. |
| `57_mobile_formdata_contract_test.log` | **4/4** اختبارات؛ FormData بلا Content-Type JSON ومفتاح idempotency حاضر. |

### 2. الخصوصية والبيانات الثابتة في المحمول

تستدعي `app/health/health-id.tsx` الآن `/users/me/health-id`، وتعرض QR من `qr_payload` الموقع بدل تحويل الهوية الوطنية أو معرف المستخدم إلى نص QR. أزيلت أيضًا طباعة الهوية الوطنية من البطاقة. لا يصح اعتبار مسار التحقق الخارجي من QR مكتملًا حتى يثبت endpoint أو جهاز تحقق محدود الصلاحية وUX انتهاء الرمز.

تستدعي `app/consultations/booking-success.tsx` السجل الحقيقي عبر `/care/appointments/:id`، وتعرض حالة صريحة عند عدم القدرة على التحميل بدل doctor/date افتراضيين. أزيل `@ts-nocheck` من هذه الشاشة ومن `app/pharmacy/cart.tsx` واجتاز التطبيق فحص TypeScript بعدها.

تم إصلاح `app/orders/index.tsx` من `/care/appointments/mine` غير الموجود إلى `GET /care/appointments`، وهو route محمي ومثبت في `backend/src/modules/care/appointments.controller.ts`.

### 3. جودة الاختبار وأصول الواجهة

كان `npm test` يعرض كل الاختبارات ناجحة لكنه يخرج برمز 1 بسبب تسجيل Expo الأصلي بعد انتهاء Jest. تم توحيد `jest-circus` مع Jest 29، وإضافة محاكاة `expo-notifications` وتهيئة fetch معزولة للاختبارات. النتيجة الحالية تمر بلا `forceExit` وبـ`--detectOpenHandles`.

اكتشف التدقيق أن ملفات `Cairo-*.ttf` الستة كانت صفحات HTML من GitHub وليست خطوطًا، وهو عيب تشغيل واجهة مستقل عن TypeScript. استُبدلت بملفات TTF سليمة للأوزان المطلوبة، وتحققت أداة `file` من أنها TrueType. بقي `MaterialSymbolsRounded.ttf` أصلًا صالحًا.

## بوابات التحقق الأخيرة

| التطبيق أو المجال | الأمر | النتيجة |
|---|---|---|
| Backend | `npm test -- --runInBand` | **93 suites / 494 tests PASS** — `63_backend_full_tests_after_prescription_upload.log` |
| Backend | `npm run build` | **PASS** — `63_backend_build_after_prescription_upload.log` |
| Patient Mobile | `npm run typecheck` | **PASS** — `72_mobile_typecheck_after_font_fix.log` |
| Patient Mobile | `npm test -- --detectOpenHandles --runInBand` | **33 suites / 73 tests PASS** — `72_mobile_tests_after_font_fix.log` |
| Patient Mobile | `npm run export:web` | **PASS**؛ ظهر تحذير إعداد Sentry مفقود وليس فشلًا — `72_mobile_web_export_after_font_fix.log` |
| Patient Web | `pnpm test -- --runInBand` | **140 files passed، 14 skipped؛ 274 tests passed، 23 skipped** — `65_patient_web_final_tests.log` |
| Patient Web | `pnpm run build` | **PASS** — `65_patient_web_final_build.log` |
| Git staged diff | `git diff --cached --check` | **PASS** بعد تنظيف المصدر وإزالة ملفات `.bak` غير التشغيلية |
| Secrets scan | ماسح فرق مرحلي محافظ | **PASS**؛ لا يعني ذلك تحليل أسرار تاريخ Git أو إعدادات production غير الموجودة |

## عوائق الدمج والنشر التي لا تزال مفتوحة

النجاح المحلي لا يغلق الملاحظات الآتية. تبقى هذه العناصر **MISSING** أو **UNVERIFIED** أو **BROKEN/PARTIAL** بحسب الفحص السابق، ولا ينبغي تجاوزها بإصدار إنتاجي:

| المعرّف | الحالة | سبب الحجب |
|---|---|---|
| F-001 / F-002 / F-003 / F-005 / F-006 | **UNRESOLVED** | عيوب أمن/تفويض/عقود أو تشغيل حرجة من المراجعة الشاملة لم تُعالج ضمن هذه الدفعة. |
| F-012 / F-013 | **UNRESOLVED** | نواقص تشغيلية أو مسارات لم تثبت ضد البيئة والأدوار الحقيقية. |
| PSP/card/insurance | **MISSING أو PARTIAL** | لا يوجد إثبات sandbox PSP أو إتمام مالي أو تسوية/إلغاء/استرداد. الواجهات الويب المنفذة تلتزم نقدًا فقط حيث يدعم الباكند ذلك. |
| E2E متعدد الأدوار | **UNVERIFIED** | لا توجد بيئة Mongo/Redis مؤقتة مكتملة مع مريض ومقدم خدمة/صيدلية ومسارات قبول/رفض/إلغاء/إعادة محاولة. |
| migrations على target حقيقي | **UNVERIFIED** | لا MONGO target معتمد، ولا backup أو dry run أو rollback مُثبت في بيئة deployment. |
| Sentry production config | **MISSING** | تصدير Expo نجح لكن أظهر تحذير عدم وجود organization/project؛ لا يجوز إهماله في خطة التشغيل. |
| مصدر/حزمة النشر الرسمية | **UNVERIFIED** | المستودع الأصلي أرشيفي وجرى إدخال `backend/` و`patient-web/` و`patient-mobile/` كمصادر متتبعة. يلزم اعتماد layout قبل دمج `main`. |
| target وrollback وموافقة | **MISSING** | لا connector خادم أو خطة backup/rollback أو موافقة منفصلة على deploy محدد. |

## قرار المراجعة المقترح

يمكن إنشاء commit ودفعه إلى فرع الإصلاح للمراجعة لأنه يجمع مصدر المحمول القابل للمراجعة وإصلاحات الباكند والاختبارات المارة. لا يوصى بدمجه إلى `main` ولا بإنشاء نشر إنتاجي الآن. يلزم أولًا تنفيذ/إغلاق عوائق P0/P1، مراجعة حجم وبنية المصدر المستورد، ثم إثبات E2E على بيئة مؤقتة منفصلة، ثم مراجعة خطة backup/rollback ووجهة النشر، وأخيرًا أخذ موافقة صريحة مستقلة على النشر.

## المراجع

[1]: https://fonts.google.com/specimen/Cairo "Cairo — Google Fonts"
