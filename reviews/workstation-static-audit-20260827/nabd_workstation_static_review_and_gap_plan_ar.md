# مراجعة `workstation.zip` وخطة فجوات Nabd

**تاريخ المراجعة:** 2026-08-27

> هذه مراجعة **ساكنة** للملفات وسجل Git والوثائق فقط. لم يُشغّل أي كود من `workstation.zip`، ولم تُثبت تبعياته، ولم تُنفذ tests أو migrations أو أوامر نشر. لذلك، لا تُعد أي نتيجة هنا دليلاً على نجاح runtime أو E2E أو production.

## 1. حكم مختصر

النسخة ليست جاهزة للدمج أو النشر كما هي. تحتوي على قدر كبير من العمل المصدرّي المتتبع، لكن توجد عوائق قاطعة: مصدر Provider المرتبط غير موجود في الأرشيف، وملفات عقود مشتركة مهمة غير ملتزمة، وملف compose الإنتاجي لا يطابق متطلبات بيئته ومصادقة Mongo/Redis، إضافة إلى نقص تحقق مستقل من ادعاءات الاختبارات والبوابات الحية. لذلك الحكم هو **NO-GO للدمج/النشر، مع قابلية للمراجعة الجزئية والتقسيم إلى حزم إصلاح**.

| المحور | النتيجة | السبب |
|---|---|---|
| سلامة الأرشيف | صالح بنيوياً | GZIP/ZIP سليم؛ SHA-256: `11750afbaf2c59b7be88ec48547c6cfd47bd9d1cb63a33691fa7eea6f2a40560`. |
| سجل Git | قابل للقراءة لكن provenance غير مكتمل | الرأس `51a84c76a690f30baac8b4bb3df6ab575aad4520` على `release/patient-production`؛ التزام main المزعوم `22526be...` غير موجود ككائن Git في workstation. |
| كود Provider | غير قابل للمراجعة | `provider` رابط رمزي إلى `../extracted/provider`، والهدف غير موجود في الأرشيف. |
| تغييرات غير ملتزمة | حجب دمج | إضافة `patient-contracts.ts` وتصديره وتعديل package manifest موجودة خارج أي commit. |
| Compose الإنتاجي | حجب نشر | يفتقد `ALLOWED_ORIGINS`، ويهيّئ Mongo/Redis بمصادقة بينما اتصال التطبيق لا يحمل الاعتمادات اللازمة. |
| ادعاءات الاختبارات | غير مثبتة | الوثائق تذكر نتائج خضراء، لكنها لم تُشغّل في هذه المراجعة. CI الحالي لا يغطي جميع المكونات بصورة موثوقة. |
| التغطية مقابل الخطتين | جزئية وغير كافية | خطتا Nabd تتطلبان 242 سطح Web وعمليات Provider/Admin كاملة؛ الحزمة لا تثبت إغلاقها. |

## 2. الأدلة الثابتة

| بند | دليل مرصود |
|---|---|
| حجم الأرشيف | 518,529,938 بايت؛ 116,450 إدخال؛ 6,087 إدخالات بعد استبعاد التبعيات وbuild artifacts. |
| مسار Git | `release/patient-production` عند `51a84c7`. |
| البذرة المعلنة | `4194495` يقول إنه بُني من `main@22526be`، وهو ancestor للرأس؛ توجد 77 commit بعده و250 ملفاً متغيراً (+15,879 / -283). |
| الالتزامات المعلنة | السرد يذكر 55 معرفاً مميزاً: حُلّ 53 إلى commits فعلية داخل workstation، بينما `22526be` هو main الخارجي غير الموجود ككائن في الأرشيف و`2c6ccca` غير موجود. سجل Git يحوي 78 commit إجمالاً، و77 بعد البذرة، لا 63 فقط. |
| التغيير حسب المكوّن | backend: 85 ملفاً، patient-web: 136، patient-mobile: 15، packages: 5، CI: ملف واحد، root/docs: 8. |
| مصدر Provider | لا يوجد داخل الأرشيف؛ لا يمكن تأكيد P1–P9 أو الـE2E الخاصة به. |
| main المستقل | مرجع GitHub `main@22526bedb77a3d8148219036367e4714f401aecc` جُرد بصورة منفصلة؛ الاختلاف التاريخي يمنع `git diff` موثوقاً مباشراً مع workstation. |

### 2.1 جرد كامل للمصدر ودفتر commits

قُرئت bytes وmetadata لكل ملف مصدر/تكوين/توثيق متاح بعد استبعاد dependencies وbuild artifacts، من دون تشغيل أي ملف. النتيجة **1,842 ملفاً** مفهرساً و**77 commit** بعد البذرة. الملفات التالية هي سجل الأدلة القابل للتدقيق:

| الملف | الغرض | حد الإثبات |
|---|---|---|
| `nabd_workstation_source_file_inventory.csv` | hash وحجم ومسار كل واحد من 1,842 ملفاً | يثبت وجود البايتات فقط. |
| `nabd_workstation_commit_inventory.csv` | كل commit وتاريخه ومساراته المتغيرة وعلاقته بالسرد | يثبت تغيّر Git فقط. |
| `nabd_workstation_narrative_commit_resolution.csv` | حسم 55 معرفاً مذكوراً في النصوص | لا يجعل ادعاء العنوان صحيحاً وظيفياً. |
| `nabd_workstation_per_commit_static_evidence_ar.md` | 77 صفاً تفصيلياً: عنوان الادعاء، الملفات، وnumstat | لا يثبت integration أو authz أو runtime أو production. |

تُظهر آثار المصدر وجود عمل متتبع في عقود مشتركة، backend، صفحات/BFF الويب، تدفقات mobile، اختبارات، وCI/configuration. أمّا Provider فلا يظهر في الجرد لأنه غير موجود فعلياً. لا يجوز اعتبار ظهور صفحة أو route أو test artefact إغلاقاً لمتطلب Nabd؛ لذلك تبقى الأحكام الوظيفية وقرارات الدمج محكومة بالبوابات في هذا التقرير.

## 3. عوائق حرجة قابلة لإعادة التحقق

### 3.1 Compose الإنتاجي لا يحقق شروط الإقلاع

في `backend/docker-compose.prod.yml`:

1. التطبيق يعمل في `NODE_ENV=production`، و`src/config/env.validation.ts` يفرض `MONGO_URL` و`REDIS_URL` و`JWT_SECRET` و`ALLOWED_ORIGINS`. ملف compose لا يمرر `ALLOWED_ORIGINS`، ونقطة الإقلاع ترفض الإنتاج عند غيابه.
2. خدمة Mongo تنشئ root user/password، لكن `MONGO_URL` للتطبيق هو `mongodb://mongo:27017/nabdah` بلا user/password أو `authSource=admin`. هذا لا يطابق Mongo authentication المعلن.
3. خدمة Redis تبدأ بـ`--requirepass`، بينما `REDIS_URL` للتطبيق بلا كلمة مرور ولا يمرر compose متغير `REDIS_PASSWORD` إلى خدمة التطبيق. إعداد التطبيق يدعم كلمة مرور في URL أو متغير منفصل، لكن compose لا يزوده بأي منهما.
4. Dockerfile يعلن `EXPOSE 3000` بينما compose والتطبيق يهدفان إلى `8002`. ليس سبب فشل وحده، لكنه تناقض نشر يجب تصحيحه واختباره.

**قرار:** لا يعتبر commit `5412d5c` دليلاً على compose صالح. يلزم تصحيح الملفات وإجراء smoke test حقيقي بخدمات مصادق عليها قبل فتح بوابة J.

### 3.2 مصدر Provider مفقود من الحزمة

يوجد `provider` كرابط رمزي فقط. مستندات workstation تزعم P1–P9 وE2E Provider، لكن الملفات المقصودة ليست قابلة للقراءة. لا يمكن اعتماد أي ادعاء Provider أو Admin متعلق به من هذه الحزمة.

**قرار:** يجب إرفاق مصدر Provider الكامل (أو تحويل الرابط إلى محتوى tracked مستقل) قبل المقارنة أو الدمج.

### 3.3 تعديلات عقود غير ملتزمة

الحالة المحلية تتضمن:

| النوع | المسار | ملاحظة |
|---|---|---|
| تعديل | `packages/shared-contracts/src/index.ts` | تصدير `patient-contracts`. |
| ملف جديد | `packages/shared-contracts/src/patient-contracts.ts` | DTOs وحالات انتقال للطلبات والحجز والدفع والتأمين والرعاية المنزلية والمختبر والأشعة. |
| تعديل | `packages/shared-contracts/package.json` | إضافة `typescript` كـdev dependency. |
| غير متتبع | `packages/shared-contracts/package-lock.json` | يولد ضجيجاً ويحتاج قرار إدارة حزم واضح. |

هذه ملفات حساسة لعقود المنتجات والرعاية. لا يجوز إضافتها تلقائياً إلى أي commit أو دمجها قبل: DTO ownership review، توافق server schemas، اختبار transitions، وتحديد package manager واحد.

### 3.4 CI لا يكفي كدليل بوابة إنتاج

ملف `.github/workflows/ci.yml` يبني backend وpatient-web، لكنه لا يشغّل test suite المعلن كاملاً؛ boot test يعلن Redis/Mongo محليين من دون service مهيأ، وpatient-mobile يستخدم `npm install` ثم يتجاهل فشل `expo-doctor` ولا يشغّل typecheck أو tests. كما أن `pnpm i --frozen-lockfile || pnpm i` يسمح بتجاوز القفل عند الفشل.

**قرار:** لا يمكن قبول عبارة “green” من CI الحالي. يجب أن تكون أوامر CI fail-closed ومقسمة لكل مكوّن مع خدمات test حقيقية أو memory adapters مصرح بها.

## 4. مقارنة مع الخطتين

| متطلب الخطة | ما وجد في workstation | الحكم |
|---|---|---|
| 242 route/CTA، منها 189 `BUILD` و53 `COMPLETE_OR_REPLACE` | توجد صفحات وBFF وتوثيق parity لجزء من المريض؛ لا توجد مصفوفة evidence كاملة لكل بند. | **جزئي** |
| Provider audit-first ومراحل P1–P9 | ادعاءات ووثائق، لكن المصدر المرتبط غير موجود. | **غير قابل للتحقق** |
| Admin audit-first: IAM، disputes، finance، privacy، operations | توجد ملفات backend/admin-enterprise واختبارات معلنة؛ لا توجد واجهة Admin مستقلة كاملة في workstation ولا إثبات تشغيل. | **جزئي/غير قابل للتحقق** |
| كل CTA: عقد + authz + source-of-truth + states + tests + runtime evidence | بعض BFF وDTOs واختبارات موجودة، لكن لا يوجد mapping مكتمل أو أدلة runtime/staging. | **جزئي** |
| P0 المال، التأمين، الدفتر، المصالحة | مكونات مصدرية مذكورة، لكن compose لا يقلع بثقة وstaging/PSP/payer evidence غير متاح. | **محجوب** |
| P0 السلامة والخصوصية | بعض guards وCSRF وRBAC موثقة؛ ما زالت بوابات consent/QR/emergency/runtime والتدقيق الحي مطلوبة. | **جزئي** |
| no-go قبل إطلاق عام | وثائق workstation نفسها تبقي staging، e2e، migration، mail proof وقرار redeem. | **متفق مع NO-GO** |

أُنشئ جرد مستقل من **242 صفاً** في `docs/nabd_workstation_screen_evidence_inventory.csv`. وجد الجرد تطابقاً نصياً لمسار أو اسم route في 235 صفاً، لكن كل الصفوف وُسمت `NOT_VERIFIABLE_STATIC`: ظهور token في ملف client أو config لا يثبت CTA أو عقد الخادم أو authorization أو بيانات حقيقة أو loading/error/offline أو اختبار أو دليل تشغيل. لذلك لا يجوز تحويل هذه النسبة إلى نسبة “مكتمل”.

### 4.1 خريطة الأدلة بحسب بوابات Nabd

| بوابة Nabd | آثار مصدر مرصودة في commits | ما لا يثبته ذلك | الحكم |
|---|---|---|---|
| P0 foundation: contracts/IAM/audit/finance | commits مثل `bcbfcbf` للعقود وCI، و`3e9f8e9` لـRBAC/audit/disputes، و`20c6f2b` لخدمات command-center. | صحة الملكية، فصل الصلاحيات، ledger/PSP/payer، تكامل الأدوار، وتشغيل الاختبارات. | **جزئي؛ محجوب عن GO** |
| P0 pharmacy/booking/insurance | آثار backend/mobile/web في `2610216` و`151dbef` و`b0bd5ef` و`0535f68` و`db2eb00`. | التسعير الخادمي، idempotency، payer/PSP، reconciliation، والـE2E. | **جزئي؛ لا قبول وظيفي** |
| P0 privacy/security | تغييرات guards/CSRF/BFF وأدوات privacy مذكورة في `612c84a` و`5ab5bee` و`91cf09a`. | threat model، اختبارات negative/replay/BOLA، consent/data-rights runtime، وتدقيق مستقل. | **جزئي؛ لا قبول أمني** |
| P0-SAFETY: AI/emergency/medication scanning | صفحات/مسارات مرتبطة بأدوات AI وSOS والمسح الدوائي في `3dde1e7` و`17e22bc` و`a57a1f0`. | safety pack، clinical owner، human escalation، drill، ودقة ادعاءات طبية. | **محجوب حتى دليل سلامة مستقل** |
| P1 patient experience | أدلة ساكنة لصفحات/BFF family، vitals، maternity، nutrition، community، wearables، loyalty، chat، settings في دفعات parity متعددة. | جودة التجربة، حالات الفشل/offline، data source، الموافقة، وaccessibility. | **مصدر جزئي متتبع فقط** |
| Provider P1–P9 | وثائق وعناوين commits وملفات backend مشتركة تدّعي endpoints/gates. | لا يمكن قراءة تطبيق Provider أو شاشاته أو اختباراته بسبب الرابط الرمزي المكسور. | **غير قابل للتحقق** |
| Admin audit-first | توجد آثار backend enterprise/RBAC/segments/command center؛ لا يوجد مصدر Admin UI مستقل كامل. | شاشات الإدارة، MFA، tenant isolation، approvals، privacy/finance operations. | **جزئي/غير قابل للتحقق** |
| operations & production | `.github/workflows/ci.yml` وcompose وأداة mail smoke موجودة كملفات. | نجاح CI، صحة compose، staging، مراقبة، rollback وsoak. | **محجوب؛ compose متناقض** |

## 5. تناقضات ووثائق تحتاج تسوية

1. الوثائق تقول “كل المراحل A–J مكتملة”، لكن `REVIEW_VERDICT.md` يذكر بوابات إلزامية واختبارات staging وsoak وrollback قبل GO.
2. `HANDOFF.md` يسجل عناصر متبقية في قسم parity، ثم يسجل لاحقاً إتمام بعضها. يجب تحويل هذه السردية إلى سجل متطلبات ذي حالة وتاريخ ودليل لا إلى عبارات تراكمية.
3. قائمة الالتزامات المعروضة تقول 63 unique commits، بينما الفرع يحوي 77 بعد البذرة؛ معظم المعرفات موجودة لكن معرف واحد مفقود. يلزم توليد changelog مباشرة من Git بدلاً من نص منقول.
4. خطة Provider في الوثائق لا يمكن إثباتها من هذه الحزمة بسبب الرابط الرمزي المكسور.

## 6. خطة إغلاق الفجوات

### P0 — إيقاف الدمج وحفظ الأدلة

1. لا تدمج أو تنشر workstation الحالي.
2. أنشئ branch مراجعة مستقل؛ لا تستخدم `git add .` ولا session مشتركة. استعمل worktree منفصل لكل مسار (backend، patient-web، provider، admin).
3. أرفق مصدر Provider الحقيقي وملف manifest لبصمات كل مكوّن.
4. إمّا التزم تغييرات `shared-contracts` مع tests أو تخلص منها صراحةً؛ لا تتركها في ZIP فقط.

### P1 — إصلاح قابلية الإقلاع وCI

1. أصلح compose: مرر `ALLOWED_ORIGINS`، واتصال Mongo موثق بمستخدم/كلمة مرور و`authSource`، وRedis URL بكلمة المرور أو متغيراً للتطبيق.
2. طابق Dockerfile مع منفذ 8002 وأثبت healthcheck فعلياً داخل container.
3. اجعل CI fail-closed: `npm ci`/`pnpm --frozen-lockfile` فقط، typecheck + unit tests لكل مكوّن، boot test بخدمات حقيقية أو adapter اختبار معلن، وبدون `|| true` في بوابات الجودة.
4. أضف فحصاً يمنع `.DS_Store` وpackage-lock غير المقصود والتبعيات/الأسرار من الالتزام.

### P2 — عقود وسلامة المريض

1. راجع `patient-contracts.ts` مقابل schemas/controllers الحقيقية؛ لا تقبل DTO client-side يتضمن `patientId` أو سعر أو قرار تأمين من دون server derivation وownership tests.
2. اربط كل state transition بحارس خادمي، idempotency، audit event، وtests negative/race/replay.
3. اربط كل parity item بصف واحد في evidence matrix: route، CTA، endpoint، authz، source of truth، loading/error/offline، test، runtime evidence.

### P3 — Provider وAdmin

1. لا تقبل P1–P9 قبل وصول source Provider وإعادة تشغيل/توثيق الاختبارات في بيئة مصرح بها.
2. افصل Admin web عن backend enterprise modules في المراجعة؛ أضف source UI واختبارات role/tenant/financial approval إن كانت خارج الحزمة.
3. أغلق بوابات support/SLA، privacy/data requests، finance reconciliation، provider governance، والـaudit وفق المصفوفة لا وفق عداد commits.

### P4 — Staging قبل أي ادعاء GO

1. migration hospital-staff مع backup، dry-run، قياس قبل/بعد وrollback.
2. E2E لمالك/غريب/غير مصادق، BOLA، payments/webhook idempotency، provider type، chat membership، consent/data export/delete، Redis/Mongo failover.
3. اختبر mail/CSV بوصول حقيقي في sandbox، ثم أثبت deployment logs وobservability وrollback drill و48h soak وفق الخطة.

## 7. توصية الدمج

**لا cherry-pick آلياً**: تاريخ workstation لا يحتوي كائن commit لمرجع main الحالي، لذلك لا يوجد ancestry مشترك مثبت. بعد P0/P1، تنقل تغييرات صغيرة ومراجعة يدوياً إلى branch جديد مبني من `main`، وفق ترتيب: إصلاحات بنية ونشر → عقود واختبارات → backend policies → patient BFF/screens → Provider/Admin بعد وصول المصدر → staging evidence. كل حزمة تحتاج review مستقل وCI صالح.

### قرار الفروع

لا يُرفع **كامل** مصدر workstation إلى فرع جديد في هذه المرحلة. فرفع النسخة الخام كما هي سيحوّل رابط Provider المفقود والتعديلات غير الملتزمة والتناقضات التشغيلية إلى تاريخ remote يبدو قابلاً للدمج وهو ليس كذلك. الفرع البعيد الوحيد الحالي للمادة الناتجة من المراجعة هو `review/workstation-static-audit-20260827`، ويحتوي وثائق وأدلة مراجعة فقط ولا يحتوي كود workstation.

بعد إغلاق P0 وP1، يُنشأ كل فرع كـ**فرع جديد من `main`**، لا من workstation، ويحتوي حزمة واحدة قابلة للمراجعة. الترتيب المقترح هو:

| ترتيب | اسم فرع مقترح | محتوى مسموح | شرط فتحه |
|---:|---|---|---|
| 1 | `integration/nabd-compose-ci-hardening` | تصحيح compose/CI وhealth checks فقط | إثبات env/auth محلي موثق وCI fail-closed. |
| 2 | `integration/nabd-shared-contracts-review` | عقود مشتركة محددة واختباراتها فقط | قرار package manager، مراجعة DTO ownership وtransition tests. |
| 3 | `integration/nabd-backend-security-policy` | guards/RBAC/CSRF/audit policy مع negative tests | threat review وBOLA/replay/idempotency tests. |
| 4 | `integration/nabd-patient-web-<domain>` | مجال مريض واحد في كل مرة: pharmacy أو booking أو chat… | evidence matrix مكتمل لكل CTA في المجال. |
| 5 | `integration/nabd-provider-<domain>` | لا يبدأ قبل وصول مصدر Provider الكامل | حزمة Provider قابلة للتدقيق واختبارات tenant/role. |
| 6 | `integration/nabd-admin-<domain>` | Admin UI/operations/finance مقسمة بحسب النطاق | مصدر UI، الفصل المالي، واختبارات الصلاحيات. |

أي حزمة لا تستوفي شرطها تبقى في مساحة مراجعة محلية ساكنة؛ لا ترفع كفرع كود ولا تدمج في `main`.

## 8. حالة الرفع إلى GitHub

| الفرع | HEAD المتحقق | المحتوى | الحالة |
|---|---|---|---|
| `main` | `22526bedb77a3d8148219036367e4714f401aecc` | خط الأساس للمشروع | لم يُعدّل في هذه المراجعة. |
| `review/workstation-static-audit-20260827` | `f3e5bdf5956914ad00bee114efa6d2a89db3ce38` عند وقت التحقق | تقارير وجداول أدلة المراجعة فقط | لا يحتوي مصدر workstation أو أرشيفه. |
| `catalog-v14-translation-data` | `45be87eac01c93a5da71061b392855f5ec24152a` | `SOURCE_AR_EN.jsonl` و`TRANSLATED_4_LANGUAGES.jsonl` كما طُلِب | موجودان كمؤشري Git LFS، ولم يُعدّل محتواهما. |

لم تُرفع بعد النسخة الموحدة غير المدمرة `cleaned_catalog_v14_six_locales_slug_normalized.jsonl.gz`؛ فهي تتطلب اختيار فرع بيانات مستقل من المالك قبل رفعها عبر Git LFS. لا علاقة لفرع الكتالوج بفرع مراجعة workstation ولا يجوز خلط بيانات الكتالوج بتقارير الكود.
