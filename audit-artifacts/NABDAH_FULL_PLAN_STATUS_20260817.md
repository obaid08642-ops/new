# الحالة التنفيذية الكاملة لخطة مصالحة منصة نبض

**تاريخ التحديث:** 17 أغسطس 2026

**الفرع الحصري:** `manus/on-live-reconciliation`

**آخر التزام:** `c541658`

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
