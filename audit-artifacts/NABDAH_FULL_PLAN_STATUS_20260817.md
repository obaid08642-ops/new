# الحالة التنفيذية الكاملة لخطة مصالحة منصة نبض

**تاريخ التحديث:** 17 أغسطس 2026

**الفرع الحصري:** `manus/on-live-reconciliation`

**آخر التزام:** `e62d365`

**الحكم التنفيذي:** الخطة الأساسية لم تُغلق بالكامل بعد. أُنجزت دفعات مصدرية مهمة، وعولجت عيوب إضافية بعد Gatekeeper، ونجحت بوابات البناء والاختبار المحلية للحزم الأربع ضمن حدودها. لكن staging الحالية ليست نسخة مثبتة من آخر commit؛ ولذلك بقيت اختبارات الصلاحيات والملكية والتكاملات الخارجية مفتوحة، ولم يصدر حكم جاهزية للإنتاج أو المتاجر.

## لماذا لم تُغلق الخطة سابقاً؟

السبب ليس توقفاً تقنياً واحداً، بل اختلاف بين **إصلاح المصدر** و**إثبات التشغيل الحي**. المصفوفة التنفيذية الأصلية نصت صراحة على أن Phase 3 وPhase 4 عولجتا مصدرّياً مع نقص عقدي وتشغيلي، وأن Phase 5 عولجت بنيوياً دون قبول لغوي وجهازي، وأن Phase 6 حمت الميزات الحساسة دون بناء العقود نفسها، وأن Phase 7 كانت توثيقية لا اختبارية. كما أن خطة E2E كانت مشروطة بتوفير staging معزولة وبيانات وحسابات وخدمات اختبار.

عند توفر staging لاحقاً، أُجريت جولة Gatekeeper محدودة، لكنها كشفت أن النشر الحي لا يطابق كل إصلاحات الفرع: المختبر أعاد `403`، و`GET /hospital/staff` أعاد `500`، ومسار nursing الذي جُرّب أولاً لم يكن مساراً موجوداً في العقد. لذلك لا يمكن اعتبار الجولة إغلاقاً للخطة، ولا يمكن تعويض غياب نشر commit الأخير بادعاء نجاح المصدر المحلي.

## مصفوفة الإنجاز الحقيقية

| النطاق | الحالة | الدليل الحالي | المتبقي |
|---|---|---|---|
| Phase 0 baseline | منفذ ومثبت محلياً | سجل المصالحة ومصفوفة الإكمال | مراجعة lockfiles النظيفة والفحص الأمني المتكرر |
| SEC-01..05 | منفذ مصدرّياً ومختبر | OTP/seed/labs BOLA واختبارات backend | إثبات Redis/FastAPI/SMTP/SMS على staging وتدوير اعتماد R2 خارج Git |
| Phase 1.5 idempotency | جزئي | قفل Redis ومسار مالي مفحوص | مراجعة endpoint-by-endpoint لكل refunds/wallet/billing/pharmacy mutations |
| Phase 2 config/network | منفذ مصدرّياً | production validation وCORS/JWT/WebSocket gates | اختبار origins وREST/Socket من staging فعلياً |
| Phase 3 checkout/QR/labs/emergency | مصدرّي جزئي | إزالة القيم التركيبية وحماية QR/tracking | عقد QR verifier وconsent وlocation/error codes وE2E |
| Phase 4 pharmacy | مصدرّي جزئي | checkout/tracking/OCR/bids/reorder | dispatch/inventory/bid/payment/webhook/delivery وBOLA بحسابين |
| Phase 5 i18n | بنيوي جزئي | قاموس اللغات الست وتغطية النصوص المفحوصة | مراجعة طبية بشرية، RTL/LTR، overflow، accessibility، API errors، أجهزة فعلية |
| Phase 6 sensitive contracts | حماية fail-closed لا ميزة مكتملة | medical-profile وQR provider محجوبان عند غياب العقد | consent grant/revoke/scope، QR verifier، emergency location policy، error registry |
| Phase 7 handoff | توثيقي | التقارير وخطة E2E | evidence حي وUAT ومراقبة وتوقيع قبول |
| Gatekeeper remediation | منفذ مصدرّياً | BOLA orders، provider roles، UUID hospital، Jest، localhost | نشر commit إلى staging وإعادة E2E كاملة |
| استئناف الخطة 17 أغسطس | دفعة مصدرية منفذة | LiveKit، DeviceTrust، provider/features، refund boundary، client typechecks | مراجعة بقية المصدر، ثم staging لكل السيناريوهات |

## ما تم إصلاحه في الدفعة الأخيرة

أُزيلت مفاتيح `fake_key` و`fake_secret` من LiveKit webhook وأصبح غياب الإعداد رفضاً آمناً. أُلزم Device Trust بوجود Redis، وأضيفت مطابقة مالك challenge، وأزيلت إشارات placeholder وfallback الإنتاجي. أضيفت ownership وrole checks إلى عمليات provider features الخاصة بالتمريض والأشعة، واستُبدلت عمليات lookup بمعرف business UUID، ومُنع إنشاء معرف تقرير صناعي من `Date.now()`، وأصبح النشر مشروطاً بوجود تقرير مرفوع فعلياً.

كُشف فشل حدود RefundService عند 24 ساعة وأُصلح بإدارة انزياح ساعة الطلب مع إبقاء الحدود شاملة. وفي تطبيق المريض استُبدل استدعاء API غير موجود (`getCalendars`) بالـAPI المثبت (`getCalendar`). وفي تطبيق المزوّد صُحح cast قائمة التأمين readonly دون تغيير محتوى الكتالوج.

## نتائج البناء والاختبار الحالية

| المكوّن | النتيجة |
|---|---:|
| Backend TypeScript | ناجح |
| Backend Jest | **27 suites / 218 tests ناجحة** |
| Patient typecheck | ناجح |
| Patient Jest | **7 suites / 23 tests ناجحة** |
| Patient Expo iOS export | ناجح |
| Provider typecheck | ناجح |
| Provider Jest | **1 suite / 3 tests ناجحة** |
| Provider Expo iOS export | ناجح |
| Admin Next production build | ناجح بعد حذف `.next` وتشغيل `NODE_ENV=production`، مع توليد 34 صفحة |
| ZIP archives | أعيد بناؤها واختبارها، دون `node_modules` أو `dist` أو `__pycache__` |

هذه النتائج تثبت صحة المصدر ضمن البوابات المذكورة فقط. لا تثبت push/GPS/WebSocket/LiveKit/Redis/SMTP/SMS/payment/storage أو سلوك الأجهزة.

## نتائج staging الحالية

تم التحقق من health في staging. نجحت تسجيلات الدخول للحسابات المعزولة، ونجح `GET /orders/mine` للمريض بحالة `200`، ونجح `GET /radiology/provider/inbox` بحالة `200` وقائمة فارغة. بقي `GET /labs/provider/inbox` و`GET /labs/samples` بحالة `403`، وبقي `GET /hospital/staff` بحالة `500`. أعاد المسار `/home-care/provider/bookings` حالة `404` لأنه ليس مساراً موجوداً في المصدر؛ المسار المصدر الفعلي هو `/nursing/visits?provider_id=...`.

| شرط الإغلاق | الحالة |
|---|---|
| نشر آخر commit على staging | غير مثبت؛ النتائج تدل على نشر أقدم أو عقد claims مختلف |
| BOLA mutation حقيقي بين مريضين في cancel/order | مفتوح؛ يحتاج order sandbox قابل للإلغاء وتحقق قبل/بعد من الحالة والـledger |
| مختبر provider_type | مفتوح بسبب `403` الحي |
| Hospital staff UUID | مفتوح بسبب `500` الحي |
| OTP/2FA وrate limit | لم تُغلق بمصفوفة E2E كاملة |
| payment sandbox/webhook/idempotency | لم تُغلق بمسار مالي مصرح |
| WebSocket/origin/impersonation | لم تُغلق باتصال حي |
| i18n/RTL/accessibility على الأجهزة | لم تُغلق بقبول أجهزة ومراجعة بشرية |

## البنود التي لا يمكن إغلاقها من المصدر وحده

يبقى تدوير اعتماد R2 التاريخي إجراءً تشغيلياً خارج Git. كما يلزم إعادة بناء صورة FastAPI المنشورة إذا كانت تحمل seed قديماً، واعتماد عقود consent وQR verifier وlocation/route وerror-code registry قبل تمكين واجهاتها. يلزم كذلك manifest staging يثبت استقلال Mongo وRedis وobject storage وpayment sandbox وtest sink، ثم تنفيذ كل IDs الواردة في `POST_REMEDIATION_E2E_EXECUTION_PLAN.md`.

> **قرار الجاهزية:** الفرع صالح الآن لمراجعة المبرمج والتحضير لنشر staging، لكنه **ليس جاهزاً للإنتاج أو المتاجر**. لا يتغير هذا الحكم إلا بعد نشر commit محدد على staging، نجاح السيناريوهات الحرجة والسلبية، إغلاق موانع R2 والعقود الحساسة، وإرفاق evidence منقح قابل للتتبع.

## المراجع الداخلية

[1]: ./EXECUTION_COMPLETION_MATRIX_20260816.md "مصفوفة الإكمال التنفيذية"

[2]: ./POST_REMEDIATION_E2E_EXECUTION_PLAN.md "خطة staging وE2E"

[3]: ./NABDAH_LIVE_RECONCILIATION_REGISTER_20260815.md "سجل المصالحة الحاكم"

[4]: ./NABDAH_GATEKEEPER_REMEDIATION_REPORT_20260817.md "تقرير Gatekeeper والدفعات اللاحقة"


## Product, communications, UX and discovery track — status update

هذه المرحلة لم تكن مغلقة عند بدء الجولة. تم تنفيذ إصلاحات مصدرية مثبتة: حماية LiveKit بملكية المشارك وأدوار الإدارة وتوحيد session/room، تقوية ChatGateway بملكية thread وبث الرسائل المحفوظة، تفعيل default system theme وdevice-language مع override محفوظ في patient/provider، تصحيح asset الصوت المفقود في Provider، وتحسين JSON-LD من بيانات حقيقية للدواء والمنشأة والخدمات. بعد هذه الدفعة نجح backend typecheck و28 suite/221 test، كما نجحت بوابات typecheck/الاختبارات للمريض والمزوّد ضمن سجلاتهما السابقة.

لم تُغلق لوحة الإدارة بعد كواجهة متعددة اللغة وثيم يدوي كامل؛ فهي ما زالت RTL/عربية ثابتة مع CSS system-dark جزئي وclasses hard-coded. كما أن provider chat في بعض الشاشات REST-only ولا يملك shared SocketContext، وpush/audio يحتاجان اختباراً على أجهزة فعلية لأن قنوات الصوت الحالية لا تربط كل assets المعلنة.

SEO/GEO الحالي أقوى من مجرد كلمات مفتاحية: توجد صفحات كيان SSR، canonical، Open Graph، JSON-LD، sitemap، robots وllms.txt. أضيفت عروض/توافر للدواء والخدمات عند وجود السعر الحقيقي فقط، وschema للمنشأة. لم تُثبت rankings أو AI citations، ولا توجد hreflang كاملة للغات الست لأن backend لا يقدم عقد ترجمة متوازية لكل كيان. يجب اعتبار SEO/AEO مسار جودة بيانات وسرعة وثقة ومحتوى، وليس وعداً بالظهور الأول.

الحكم التنافسي: Nabdah يملك فرصة تميز في تجميع الطبيب والدواء والتحاليل والأشعة والرعاية المنزلية ضمن مسار عربي سعودي واحد، لكن Vezeeta متقدم في funnel البحث والحجز والانتشار والتقييمات الموثوقة وتوزيع المتاجر، وTeladoc متقدم في برامج الرعاية المزمنة والصحة النفسية والقنوات المؤسسية وقياس النتائج. لم تُبنَ بعد كل ميزات المنافسين أو برامج الحمل/الدورة/التغذية/التذكير/AI السريري كمنتجات مكتملة ومثبتة.

الحكم التشغيلي: لا يوجد دليل كافٍ لتحمل آلاف أو ملايين المستخدمين معاً. Redis/BullMQ وindexes وgraceful shutdown موجودة، لكن Socket.IO ما زال على IoAdapter افتراضي وactiveUsers محلي وبدون Redis adapter؛ يلزم load test وبنية multi-instance وقياس Mongo/Redis/queue/CDN/storage قبل أي claim للتوسع.


## Final Validation and Build Repair — 2026-08-17

### نتيجة فحص Admin
تم فحص جميع ملفات TypeScript/TSX في لوحة الإدارة بحثاً عن `next/document` و`<Html>` و`<Main>` و`<NextScript>`. الاستيراد الوحيد بقي محصوراً في `src/pages/_document.tsx`، ولم توجد imports مباشرة من `next/document` داخل `/admin/ai-control` أو `/admin/payouts` أو أي صفحة أخرى. سبب الفشل الظاهر في الجولة الأولى كان تشغيل Next.js مع قيمة `NODE_ENV` غير قياسية؛ عند تشغيل `NODE_ENV=production npm run build` نجح Next.js 16.2.10، واكتملت TypeScript compilation وstatic generation لجميع **34 صفحة**، بما فيها `admin/ai-control` و`admin/payouts` و`admin/order-detail` و`admin/config-portal`.

### نتيجة فحص Patient Expo web
تم استبدال الاستيرادات المباشرة لـ`react-native-maps` في `clinic-location` و`sos-active` و`map` و`location-picker` و`nursing/live-tracking` بطبقة `src/components/MapPrimitives`. ملف `.native.tsx` يعيد MapView/Marker/PROVIDER_DEFAULT الحقيقي من `react-native-maps`، بينما ملف `.web.tsx` يعرض web fallback واضحاً للإحداثيات والعلامة ولا يختلق موقعاً أو نتيجة backend. بذلك زال خطأ `MapMarkerNativeComponent` من مسار Expo web bundling.

ظهر بعد ذلك مانع مستقل في `expo-sqlite` بسبب استيراد `wa-sqlite.wasm` من startup المشترك. عولج مصدرّياً بنقل provider الأصلي إلى `DatabaseProvider.native.ts` وإضافة `DatabaseProvider.web.ts` صريح لا يستورد `expo-sqlite` ولا يزرع بيانات؛ تبقى SQLite الحقيقية على Android/iOS، وتستمر شاشات web في الاعتماد على API. بعد الإصلاح نجح `NODE_ENV=production npm run export:web` وولّد web وiOS وAndroid bundles وملفات `dist` بنجاح.

### حدود الدليل
تمت هذه النتائج محلياً على المصدر والأرشيفات. تعذر استخدام resolved npm mirror الداخلي أثناء التحقق، لذلك استُخدمت نسخة مؤقتة من `package-lock.json` مع registry عام ثم أُعيد lock الأصلي دون تعديل. لم تُعد هذه الجولة نشر commit إلى staging ولم تغلق E2E، تدوير R2، إعادة بناء FastAPI، أو UAT الأجهزة/RTL/accessibility. لذلك يبقى حكم الجاهزية السابق كما هو: **المصدر أصلح للبناء والمراجعة، لكنه ليس إعلان جاهزية إنتاج أو متاجر**.

### الملفات والآثار
توجد التغييرات في أرشيف `nabd_plus_patient_app.zip`، وسجل العمل في `todo.md`. أعيد بناء الأرشيفين دون `node_modules` أو `dist` أو `.next` أو logs أو `tsbuildinfo`، واجتازا `unzip -t`. يلزم بعد ذلك تنفيذ typecheck/tests النهائي للحزمة patient، ثم commit وpush على `manus/on-live-reconciliation` فقط.


### تصحيح تحقق Patient النهائي
ظهرت أثناء أول typecheck ملاحظة TypeScript لأن resolver خارج Expo لا يرى أسماء الملفات platform-suffixed بعد نقل provider. أضيف `DatabaseProvider.ts` محايد للـtypecheck يعيد native provider، بينما يبقى Metro صاحب القرار ويختار `.web.ts` أو `.native.ts` عند bundling. بعد ذلك نجح `tsc --noEmit`، ونجحت **7 suites / 23 tests**، ونجح `NODE_ENV=production npm run export:web` مع web/iOS/Android bundles. لا توجد بيانات seed أو mock في هذا الإصلاح؛ web driver فارغ ومقصود فقط لمنع native SQLite من دخول bundle، والبيانات التشغيلية تبقى من API.


## Gatekeeper FIX2 — provider-role normalization — 2026-08-17

### Finding

The staging failure was caused by a split provider identity contract. Laboratory accounts could carry `role=provider` with `provider_type=laboratory`, while LabsService accepted only `lab`. Radiology provider routes used `@Roles(UserRole.RADIOLOGY, UserRole.HOSPITAL, UserRole.ADMIN)`, while the guard compared only `payload.role`, so valid provider accounts were rejected with 403.

### Source remediation

`src/common/auth.guard.ts` now provides `normalizeEffectiveRole()` and `getEffectiveRoles()`. Authorization evaluates the normalized union of `role`, `provider_type`, and `providerType`. The normalizer maps `laboratory` and `lab` to `UserRole.LAB`, and also maps radiology, nursing, hospital, pharmacy, home-care, pharmacist, nurse, and hospital-admin aliases to canonical role values. `@Roles` checks and fine-grained permission checks now use the effective roles. Impersonated user payloads preserve provider type fields.

`src/modules/labs/labs.service.ts` now uses the effective role set for all provider-facing lab operations, including inbox, samples, transitions, reports, insurance, assignments, and reassignment. This accepts both `lab` and `laboratory` without a one-off bypass. Radiology and other provider modules using `@Roles` inherit the central guard correction; patient and administrative boundaries remain enforced.

### Gate results

| Gate | Result |
|---|---|
| Backend build | PASS |
| Backend Jest | **26 suites / 218 tests passed** |
| FIX2 tests added | 7 cases for laboratory/lab, provider + laboratory, radiology, nursing, hospital, pharmacy, and deduplication |
| Main branch | Unchanged |
| Target branch | `manus/on-live-reconciliation` |

### Remaining acceptance boundary

The source-level FIX2 gate is complete. Gatekeeper must redeploy the resulting commit to staging and repeat live requests for `/labs/samples`, `/labs/provider/inbox`, radiology provider inbox, and the corresponding nursing, hospital, and pharmacy provider routes. Local build/test success does not replace a live JWT and database-backed E2E result.


## Gatekeeper follow-up — secondary ownership fixes — 2026-08-17

### Implemented source fixes

أصبح `ChatGateway.join_thread` يستخرج هوية socket الموثقة ثم يستدعي `ChatService.getThread(threadId, userId)` قبل تنفيذ `socket.join`. وبذلك يُرفض المستخدم المصادق غير العضو ولا يستطيع استقبال أحداث `typing` أو `new_message` من thread أجنبي. أضيفت اختبارات رفض وسماح تثبت أن `socket.join` لا يُستدعى قبل نجاح فحص العضوية.

صُحح `LiveKitService.markNoShow` ليستخدم حقل appointment business `id`، مع fallback محدود إلى `_id` فقط عندما يكون المعرّف ObjectId صالحاً، وبنفس نمط `initiateCall`. أضيف اختبار يثبت استعلام UUID واختبار رفض appointment غير الموجود.

صُحح `pingPatient` ليبحث عن appointment نشط يربط provider بالمريض عبر حقول provider/patient المعتمدة، ويرفض العملية بـ403 عند غياب العلاقة أو إذا كان appointment منتهياً أو ملغى. لا يصدر push قبل نجاح هذا الفحص، وأصبح `session_id` مبنياً على appointment حقيقي بدلاً من `providerId`.

### Local gate results

| Gate | Result |
|---|---|
| Backend build | PASS |
| Backend Jest | **28 suites / 223 tests passed** |
| New follow-up tests | 5 ownership and contract tests passed |
| Main branch | Unchanged |
| Target branch | `manus/on-live-reconciliation` |

### Sensitive contracts and operational E2E boundary

لم تُفعّل واجهات جديدة لعقود consent أو QR verifier أو emergency location policy أو error-code registry؛ بقيت الواجهات غير المعتمدة fail-closed أو ضمن العقود الحالية، وتم توثيق الحاجة إلى اعتماد scope/grant/revoke وسجل تدقيق، verifier QR، سياسة الموقع، وسجل أخطاء موحد قبل التفعيل.

اختبارات BOLA الحية بين مريضين، payment sandbox/webhook/idempotency، WebSocket origin وانتحال الهوية، وOTP/2FA/rate-limit تحتاج staging وRedis وMongo وcredentials الفعلية. كلمات مرور sandbox المذكورة في طلب Gatekeeper لا تُحفظ في المصدر أو التقرير.

### Acceptance boundary

الإصلاحات المصدرية والبوابات المحلية مكتملة، لكن الإغلاق التشغيلي لهذه الجولة يتطلب نشر commit الناتج على staging ثم إعادة التحقق الحي لـjoin_thread، markNoShow، ping-patient، والمسارات السلبية المقابلة. لا يُستنتج من نجاح build/tests وحده جاهزية إنتاجية أو توسع multi-instance؛ Socket.IO Redis adapter وRTL/admin localization ما زالا بنوداً لاحقة موثقة.


## P0 ChatGateway boot regression remediation — 2026-08-17

### Finding

كشف التحقق الحي أن commit `713bbea` كان يحتوي استيراداً دائرياً: `chat.gateway.ts` كان يستورد `ChatService` من `chat.module.ts`، بينما module نفسه يسجل `ChatGateway`. هذا النوع من الخطأ قد لا يظهر في unit tests التي تنشئ gateway مباشرة، لكنه يمنع Nest من إقلاع الحاوية.

### Root fix

نُقل `ChatThread` و`ChatMessage` schemas إلى `src/modules/chat/chat.schemas.ts`، ونُقل `ChatService` كاملاً إلى `src/modules/chat/chat.service.ts`. أصبح `chat.module.ts` composition root فقط، ويستورد `ChatService` وschemas وgateway من ملفات مستقلة. كما تم تحديث `home-care-compat` و`realtime.gateway` ليستوردا الخدمة من الملف المستقل، وأصبح `chat.gateway.ts` يستورد `ChatService` من `chat.service.ts` مباشرة.

عند رفض `join_thread` لا يُرمى exception إلى Socket.IO؛ يعيد handler ACK صريحاً `{ error: 'not_participant' }`، بينما يعيد `{ error: 'socket_not_authenticated' }` للاتصال غير الموثق. لا ينفذ `socket.join` إلا بعد نجاح `ChatService.getThread(threadId, userId)`.

### Validation gates

| Gate | Result |
|---|---|
| Backend build | PASS |
| Backend Jest | **28 suites / 223 tests passed** |
| ChatGateway membership tests | PASS؛ ACK مرفوض وjoin مسموح للعضو فقط |
| Boot test | PASS؛ `app.init()` لـChatModule مع ChatGateway وChatService: **1 suite / 1 test** |
| Main branch | Unchanged |
| Staging | أثبتت سابقاً عمل الإصلاحات الثلاثة؛ يلزم نشر commit الجديد لإعادة تحقق boot وACK |

اختبار boot أصبح أمراً مستقلاً `npm run test:boot` باستخدام `test/app.boot.e2e-spec.ts`، حتى لا تعتمد سلامة الإقلاع على اختبارات الوحدة فقط.
