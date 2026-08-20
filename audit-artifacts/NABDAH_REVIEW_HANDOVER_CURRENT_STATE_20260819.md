# حزمة مراجعة الحالة الحالية — منصة نبض

**التاريخ:** 19 أغسطس 2026  
**المستودع الوحيد المعتمد:** [`obaid08642-ops/new`](https://github.com/obaid08642-ops/new)  
**الفرع الحاكم للمراجعة:** [`manus/on-live-reconciliation`](https://github.com/obaid08642-ops/new/tree/manus/on-live-reconciliation)  
**رأس المراجعة قبل إضافة هذا التقرير:** `2bfd8182b157a7c660e592c9477c36edadbf3e3a`  
**حالة النشر:** لم يُنفّذ أي نشر للإنتاج أو تعديل مباشر للخادم ضمن هذه الحزمة.  
**قرار المراجعة الحالي:** **NO-GO للإطلاق أو النشر الشامل حتى تُغلق الموانع أدناه بأدلة.**

> هذا المستند هو حزمة مراجعة، لا أمر نشر. يصف ما تغير في المصدر والأرشيفات، وما اجتاز بوابات محلية محددة، وما لم يُثبت تشغيله الحي بعد. لا يحوّل اختبار بناء أو اختبار عقد إلى اعتماد طبي أو قانوني أو تشغيلي.

## 1. الملخص التنفيذي

اكتملت المراحل الأساسية 1–12 من الخطة على فرع المصالحة، وانتهت بتقرير جاهزية صريح يحظر الإطلاق الكامل إلى أن تغلق موانع الأمن التشغيلي، الدفع، الأجهزة، الاعتمادات القانونية، التوطين البشري وE2E. بعد Phase 12، استمر العمل المصدرى المنضبط في ثلاث مسارات: ترقية التبعيات، احتواء واجهات مزود الخدمة التي كانت تعرض بيانات أو نجاحات محلية غير موثقة، وبناء أساس توطين ستّي قابل للاختبار. لا يوجد دمج إلى `main` ولا نشر للخادم في هذه الدورة. [1] [2]

| المحور | الحالة الحالية | ما يثبتها | ما لا تثبته |
|---|---|---|---|
| Backend | **بوابات مصدر PASS**؛ Nest 11 واختبارات backend ناجحة | 67 suite / 373 test، 0 high / 0 critical في تدقيق التبعيات الحالي [2] | نشر المرشح، أداء الإنتاج، أو E2E كامل لكل خدمة |
| تطبيق المريض | **بوابات مصدر PASS** بعد Expo SDK 57 | TypeScript، 22 suite / 56 test، Expo export [2] | مراجعة الجهاز، المتجر، أو إغلاق 10 high upstream |
| تطبيق المزوّد | **بوابات مصدر PASS** للأرشيف الحالي | TypeScript، 27 contract test، Expo web export؛ Expo Doctor 21/21 في ترقية SDK [2] | كل سيناريو مزود حي، المراجعة البشرية، أو الترجمة السريرية المعتمدة |
| لوحة الإدارة | **تدقيق تبعيات نظيف** | 0 vulnerabilities موثق [2] | صلاحية عمليات الإدارة الحية كاملة أو مراجعة RBAC بشرية |
| الإطلاق/المتاجر | **NO-GO** | الموانع متعددة ومستقلة [1] | لا يوجد تصريح ضمن هذه الحزمة |

## 2. تنفيذ الخطة من البداية إلى Phase 12

| المرحلة | ما نُفّذ | النتيجة الموثقة |
|---:|---|---|
| 1 | تثبيت baseline والفرع الحاكم ومنع البناء على الفروع المتأخرة. | الاعتماد على `manus/on-live-reconciliation` فقط. |
| 2 | تدقيق تطبيق المريض: العقود، البيانات غير الصادقة، التوطين، RTL والوظائف الصحية. | مدخل لدفعات المعالجة؛ لا يغني عن مراجعة أجهزة بشرية. |
| 3 | تدقيق تطبيق مزودي الخدمات: الطبيب والصيدلية والمختبر والأشعة والتمريض والمنشآت وKYC والسحب والاستلام. | كشف فجوات العقود والواجهات ومهّد للاحتواء اللاحق. |
| 4 | تدقيق لوحة الإدارة: RBAC والمالية والحوكمة وحماية البيانات وأدوات التشغيل. | بقيت العمليات الحساسة fail-closed حيث لا يوجد عقد حوكمة موثق. |
| 5 | تدقيق Backend/Database: الحراسة، الدفع، التخزين، realtime، event bus، workflows والتأمين. | دعم علاج الملكية وإغلاق المسارات غير الموثوقة. |
| 6 | مصفوفة الأمن والملكية والخصوصية. | بقيت SOS وQR وconsent وlocation غير متاحة بلا اعتماد مالك. |
| 7 | مقارنة المنافسين وتجربة المستخدم ومسارات الطلب والاستلام. | حُددت محاور UX؛ لا تزال المراجعة البشرية screen-by-screen مطلوبة. |
| 8 | دفعات معالجة مصدرية واحتواء للعقود المؤكدة. | PASS مصدرّياً فقط، وليس اعتماد إطلاق. |
| 9 | بوابات البناء وlock integrity للحزم الأربع. | PASS في النطاق الموثق، مع بقاء موانع التشغيل والأجهزة. |
| 10 | تدقيق التبعيات. | Admin نظيف؛ كانت Backend/Patient/Provider تحتاج migrations محكومة ثم نُفذت الدفعات الموضحة أدناه. |
| 11 | قبول sandbox محدود: مصادقة وفصل هوية وملكية وBOLA لمسارات محددة. | PASS محدود؛ لا يمثل دورة خدمة كاملة. |
| 12 | تقرير الجاهزية النهائي. | **NO-GO** حتى إغلاق قائمة الشروط. |

تفاصيل كل مرحلة وحدود استنتاجها موجودة في تقرير Phase 12 والمراجع التي يحيل إليها. [1]

## 3. ما تم بعد Phase 12

### 3.1 ترقية التبعيات وبوابات الحزم

| المكوّن | التعديل | التحقق | وضع التدقيق |
|---|---|---|---|
| Backend | Nest 10→11، SheetJS→ExcelJS، ترقية Google Vision، إصلاح lockfile glob. | 67 suite / 373 test، Nest build، clean install. | **0 high / 0 critical**؛ 28 moderate. |
| Patient | Expo SDK 54→57. | TypeScript، 22 suite / 56 test، Expo export. | 10 moderate، 10 high upstream، 0 critical. |
| Provider | Expo SDK 54→57، Camera بدل barcode scanner، Audio بدل `expo-av`، إصلاح native/router/config/dedupe. | `npm ci`، TypeScript، Android/iOS/Web export، Expo Doctor 21/21. | 8 moderate، 16 high upstream، 0 critical. |
| Admin | تدقيق التبعيات. | بناء/تدقيق موثق. | 0 vulnerabilities. |

لا يعني وصف `upstream` أن التحذيرات قابلة للإهمال؛ بل يعني أنه لا توجد معالجة محلية آمنة موثقة في هذه الحزمة. [2]

### 3.2 التغييرات الجديدة في تطبيق المزوّد

| الالتزام | التغيير | الدليل | البوابات المسجلة |
|---|---|---|---|
| `1505d88` | أساس لغات `ar/en/ur/hi/bn/fil`: لغة الجهاز والتخزين ودورة اللغة وRTL للعربية فقط، مع 99 مفتاحاً مشتركاً. | [3] | TypeScript، 20 contract test، Expo export. |
| `2224397` | إزالة fallback رسائل الدردشة والـoptimistic-send وأزرار المكالمة/المرفقات غير الموثقة من ChatSystem. | [4] | TypeScript، 21 test، Expo export. |
| `2158813` | احتواء PharmacyChatResponder والإشعارات والدعم وإدارة الأجهزة التي كانت تعرض حالة محلية أو ثابتة. | [5] | TypeScript، 23 test، Expo export. |
| `a9f7597` | إزالة مواعيد وتحويلات وإجازات ومؤهلات ووسائط ولوائح مرضى/تأمين ثابتة من لوحة الطبيب. | [6] | TypeScript، 24 test، Expo export. |
| `ab266a6` | إزالة fallback هوية المريض والتحليل والتأمين والسعر والموعد من طابور المختبر. | [7] | TypeScript، 24 test، Expo export. |
| `6bb050e` | جرد توطين المزوّد: 49 ملفاً و5,299 فرع AR/EN، منها 2,810 زوج نص فريد. | [8] | جرد ثابت موثق. |
| `41abd6b` | نقل 3,755 فرع نص ثابت في 49 ملفاً إلى resolver للغات الست. | [9] | TypeScript، 25 test، Expo web export. |
| `9219b49` | نقل 85 قالباً ديناميكياً متكافئ التعبيرات إلى resolver يحافظ على placeholders. | [10] | TypeScript، 26 test، Expo web export. |
| `1e2fae2` | إزالة اتفاقية مقدم خدمة قانونية محلية وحجب القبول حتى تحميل سياسة versioned من الخادم؛ لا يغلق modal عند خطأ القبول. | [11] | TypeScript، 27 test، Expo web export. |
| `2bfd818` | مزامنة سجل العمل وإدراج حزمة تسليم المراجعة هذه. | [`todo.md`](https://github.com/obaid08642-ops/new/blob/manus/on-live-reconciliation/todo.md) | GitHub local/remote HEAD متطابقان. |

### 3.3 ما يعنيه الاحتواء fail-closed

الاحتواء لا يدعي أن الميزة أصبحت كاملة. في كل حالة ظهر فيها تاريخ محلي أو نجاح محلي أو سجل مهني/سريري لا يملك عقد خادم متحققاً، تم منع عرضه كحقيقة تشغيلية أو استبداله بحالة واضحة غير متاحة. المسارات التي تحتاج تفعيلًا وظيفياً لاحقاً تشمل chat، pharmacy chat، attachments، calls، support tickets، notification read state، device/session management، سجلات المواعيد، الإحالات، الإجازات المرضية، الوثائق المهنية والوسائط. [4] [5] [6] [11]

## 4. الأرشيفات الحالية المرشحة للمراجعة

| المكوّن | الملف | SHA-256 الحالي | ملاحظة مراجعة |
|---|---|---|---|
| Backend | `nabdah-backend.zip` | `82b8d667a147d8fe1b771e2c837940738d5e92e7906daf23ecad25cb1d96837e` | Nest 11؛ المرشح يحتاج إجراء reviewer/rollback مستقل قبل أي نشر. |
| Patient | `nabd_plus_patient_app.zip` | `c58ecfd1140c304b9ffe392b0fd72f638a21ce3993252e40283041f68e80c643` | Expo 57؛ لا يزال تدقيق upstream والأجهزة البشرية مفتوحاً. |
| Provider | `NabdProvider-provider.zip` | `514a651b2163f9de9c2ba3255f1f2a1908795c63a630f33bf805ba4679af188d` | يحتوي توطيناً ستياً واحتواءات truthfulness وagreement fail-closed. |
| Admin | `web_admin_dashboard.zip` | `fafc08e48f9063dcb45775e86b3828e333d32cc46fbefaaae7472f8813f4cad2` | تدقيق تبعيات نظيف؛ لا يغني عن اعتماد عمليات الإدارة. |

## 5. ما يحتاج مراجعة واعتماد قبل أي نشر للخادم

### أ. مراجعة كود وأرشيفات

يُراجع الفريق أولاً الالتزامات أعلاه مقابل أدلة `audit-artifacts`، ويعيد تشغيل بوابات كل مرشح من clean install. للتطبيقات، يجب التعامل مع الأرشيفات كمصادر بناء مرشحة، لا كدليل على تشغيل متجر أو جهاز.

### ب. مرشح Backend فقط إذا قرر المراجع النشر

لا يوجد طلب نشر تلقائي. إذا اختار المراجع تجهيز نشر backend، فلا بد من فصل الحزمة إلى مرشح محدد، أخذ backup وrollback قابل للاختبار، تنفيذ نشر معتمد، ثم اختبار BOLA حي بحسابي sandbox فقط. إصلاح تفاصيل الوصفات يحتاج دليلاً حياً بعد النشر حتى يصبح مثبتاً تشغيلياً. [1]

### ج. اعتماد المالك/القانون والمنتج

يحتاج owner/legal/product إلى اعتماد صريح لمحتوى وسياسات SOS وQR وconsent وlocation واتفاقيات مقدم الخدمة. ستبقى المسارات fail-closed حتى ذلك الاعتماد؛ لا يجوز تحويل نجاح build أو ترجمة آلية إلى اعتماد قانوني. [1] [11]

### د. التحقق التشغيلي والأجهزة

يجب تنفيذ سيناريوهات sandbox end-to-end لكل خدمة (الطلب، استقبال المزود، القبول/الرفض، الحالة، الإلغاء، التقرير، الملكية)، ثم Android/iOS signed builds وفحص هاتفين حقيقيين لـ push وdeep links وCallKeep/full-screen intent وLiveKit وGPS والخلفية/التطبيق المغلق. [1]

### هـ. التوطين وإمكانية الوصول

نُقلت النصوص المصدرية الثابتة والقوالب المتكافئة إلى طبقة اللغات الست. إلا أن الترجمة الآلية لا تساوي مراجعة طبية/لغوية بشرية، كما تبقى النصوص الديناميكية من API، أخطاء الخادم، notifications، الأرقام/التواريخ، القوالب غير المتكافئة، واختبار التفاف النص والخطوط والتركيز وscreen reader وRTL/LTR على الأجهزة. [8] [9] [10]

## 6. البنود المفتوحة في المصدر قبل متابعة الإصلاح

تم وقف تعديل المصدر بناءً على طلب المراجعة. آخر جرد كشف مساراً تالياً مفتوحاً في `DoctorDashboard`: دردشة استشارة محلية، سجلات EHR ثابتة، وfallbacks للوصفة/قوالبها قد تنتج أو تعرض بيانات سريرية غير موثقة. أُضيف هذا البند إلى `todo.md` ولم يُعدّل مصدره بعد، حتى تكتمل مراجعتكم لهذه الحزمة. هذا ليس نقصاً مخفياً ولا ادعاءً بإغلاقه.

## 7. قرار المراجعة المقترح

**قرار مراجعة الكود/GitHub:** يمكن البدء في مراجعة الالتزامات والأرشيفات الحالية على فرع `manus/on-live-reconciliation`.

**قرار نشر الخادم:** **لا تعتمدوا نشرًا شاملاً الآن.** إن رغب المراجع في نشر Backend محدد، فليطلب مرشحاً مستقلاً مع rollback ونافذة اختبار sandbox حي؛ لا ينبغي نشر تطبيق المزوّد أو الحزم كاملة لمجرد أن بوابات المصدر نجحت.

**قرار المتاجر:** **لا تقدموا للمتاجر بعد.** يلزم إغلاق التبعيات المتبقية، الاعتمادات القانونية، Moyasar، E2E، البنى الموقعة، واختبارات الأجهزة واللغات البشرية.

## 8. خطوات المراجع العملية

1. افتحوا الفرع الحاكم وقارنوا الالتزامات `1505d88` إلى `1e2fae2`، مع الرجوع إلى الأدلة المرتبطة بكل دفعة.
2. تحققوا من SHA-256 للأرشيف الذي تنوون مراجعته قبل فكّه أو بنائه.
3. أعيدوا تشغيل clean install وTypeScript والاختبارات والتصدير لكل مرشح ذي صلة.
4. قرروا كتابةً: إبقاء العقود الحساسة fail-closed أو اعتماد محتوى وعقد backend واضح لها.
5. إذا اعتمدتم مرشح backend، جهزوا rollback ثم نفذوا post-deployment BOLA/smoke بسجلات sandbox فقط.
6. بعد ذلك فقط، استأنفوا بناء signed mobile artifacts ومصفوفة الأجهزة واللغات، ثم راجعوا قرار GO/NO-GO من جديد.

## المراجع

[1]: https://github.com/obaid08642-ops/new/blob/manus/on-live-reconciliation/audit-artifacts/NABDAH_PHASE12_FINAL_PRODUCTION_READINESS_REPORT_20260819.md "Phase 12 final production readiness report"  
[2]: https://github.com/obaid08642-ops/new/blob/manus/on-live-reconciliation/audit-artifacts/NABDAH_DEPENDENCY_REMEDIATION_FINAL_DOUBLE_CHECK_20260819.md "Dependency remediation final double check"  
[3]: https://github.com/obaid08642-ops/new/blob/manus/on-live-reconciliation/audit-artifacts/NABDAH_PROVIDER_SIX_LOCALE_FOUNDATION_20260819.md "Provider six-locale foundation"  
[4]: https://github.com/obaid08642-ops/new/blob/manus/on-live-reconciliation/audit-artifacts/NABDAH_PROVIDER_CHAT_TRUTHFULNESS_20260819.md "Provider chat truthfulness remediation"  
[5]: https://github.com/obaid08642-ops/new/blob/manus/on-live-reconciliation/audit-artifacts/NABDAH_PROVIDER_SHARED_OPERATION_TRUTHFULNESS_20260819.md "Provider shared-operation truthfulness remediation"  
[6]: https://github.com/obaid08642-ops/new/blob/manus/on-live-reconciliation/audit-artifacts/NABDAH_PROVIDER_DOCTOR_TRUTHFULNESS_20260819.md "Provider doctor dashboard truthfulness remediation"  
[7]: https://github.com/obaid08642-ops/new/blob/manus/on-live-reconciliation/audit-artifacts/NABDAH_PROVIDER_LAB_TRUTHFULNESS_20260819.md "Provider laboratory truthfulness remediation"  
[8]: https://github.com/obaid08642-ops/new/blob/manus/on-live-reconciliation/audit-artifacts/NABDAH_PROVIDER_LOCALIZATION_INVENTORY_20260819.md "Provider source localization inventory"  
[9]: https://github.com/obaid08642-ops/new/blob/manus/on-live-reconciliation/audit-artifacts/NABDAH_PROVIDER_FULL_LOCALE_STATIC_TEXT_MIGRATION_20260819.md "Provider static text migration"  
[10]: https://github.com/obaid08642-ops/new/blob/manus/on-live-reconciliation/audit-artifacts/NABDAH_PROVIDER_TEMPLATE_LOCALE_MIGRATION_20260819.md "Provider dynamic template migration"  
[11]: https://github.com/obaid08642-ops/new/blob/manus/on-live-reconciliation/audit-artifacts/NABDAH_PROVIDER_AGREEMENT_FAIL_CLOSED_20260819.md "Provider agreement fail-closed remediation"
