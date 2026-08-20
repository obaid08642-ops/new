# منصة نبض — مراجعة اكتمال Phase 13 ومعيار الخروج

**الفرع:** `manus/on-live-reconciliation`  
**رأس المراجعة:** `9fdd99921023547080358858223f577c663a1b66`  
**قرار المرحلة:** **PASS — inventory and classification only**. لا يعني هذا قبولاً وظيفياً أو تصريح إطلاق.

## مطابقة تنفيذ المرحلة مع الخطة الحاكمة

تطلب Phase 13 جرد جميع المسارات والأزرار وعقود API، ثم تصنيف كل عنصر بمصدره وحالته وعدم ترك عيب بلا سجل. أعيدت مراجعة هذه المتطلبات بعد اكتمال الجرد وليس قبلها.

| معيار الخروج الحاكم | الدليل الناتج | الحالة |
|---|---|---|
| جرد Backend وPatient وProvider وAdmin | `NABDAH_PHASE13_CONTRACT_INVENTORY_V4_20260819.json` يرصد 1,342 route و333 consumer call و238 عقداً فريداً. | PASS |
| دعم مسارات مركبة وaliases حتى لا تصنع أداة الجرد عيباً زائفاً | الإصدار V4 يربط كل decorator بأقرب Controller ويدعم aliases المصفوفية، ومنها `chat` و`chats`. | PASS |
| تصنيف كل API consumer بمصدر واضح | ملخص V4 يسجل المصدر والسطر وحالة أولية لكل consumer: `WIRED_CANDIDATE` أو `STALE/MISSING` أو `INCONCLUSIVE`. | PASS |
| جرد الأزرار والأفعال في التطبيقات | `NABDAH_PHASE13_UI_ACTION_INVENTORY_V2_20260819.json` يسجل 1,097 UI action مع التطبيق والملف والسطر ونوع handler. | PASS |
| عدم ترك action بلا حالة | كل action مرصود يحمل أحد: `SERVER_CALL_CANDIDATE` أو `FAIL_CLOSED_CANDIDATE` أو `LOCAL_OR_NAVIGATION_CANDIDATE` أو `LOCAL_FEEDBACK_CANDIDATE` أو `HANDLER_REQUIRES_MANUAL_REVIEW`. الأخيرة حالة **INCONCLUSIVE** مسجلة وليست قبولاً. | PASS |
| توثيق العيوب المؤكدة وحالتها في todo/audit | `NABDAH_PHASE13_CONTRACT_CLASSIFICATION_20260819.md` و`todo.md` يسجلان مسارات Provider القانونية والتمريضية والدردشة وسطح انتهاء الصلاحية بوصفها FIX/FAIL-CLOSED candidates. | PASS |
| تمييز ما لا يثبته المصدر الثابت | ملخصات inventory وUI تصرح بعدم إثبات role/BOLA/schema/transition/persistence/audit/runtime وتبقيها INCONCLUSIVE حتى Sandbox. | PASS |

## العناصر المرحّلة بصورة مضبوطة

> لا يجوز اعتبار `WIRED_CANDIDATE` صالحاً للمرضى أو للمزودين. تنتقل عناصره إلى Phase 14 لمراجعة العقود عالية الخطورة، ثم إلى Phase 16 لإثبات Runtime وBOLA في Sandbox. هذه الحدود جزء من اكتمال Phase 13 وليست تأجيلاً غير موثق.

| الفئة | الوجهة | السبب |
|---|---|---|
| المسارات الراكدة والمفقودة المؤكدة | Phase 14 | يلزم تصحيح API path أو احتواء fail-closed، مع اختبارات انحدار. |
| أزرار server-call المرشحة | Phase 14 ثم Phase 16 | يلزم schema/role/ownership/transition قبل ثم runtime evidence بعد النشر المصرح. |
| handlers العامة أو base URL الديناميكي | Phase 16 | لا يكفي التحليل الثابت؛ تحتاج trace خالياً من بيانات المرضى وحسابات Sandbox. |
| اعتماد المالك، المدفوعات، SOS/location، مفاتيح متاجر، الأجهزة الحقيقية | Phases 16–19 | محجوب حوكميًا، ولا يصح استبداله بمحاكاة محلية. |

## التحقق قبل الانتقال

تؤكد المراجعة أن نطاق Phase 13 تم تنفيذه كما هو: جرد ثم تصنيف ثم تسجيل فجوات؛ لم تُخترع عقود ولم تُفعّل مسارات حساسة، ولم ينفذ نشر. يبدأ Phase 14 الآن بالبنود المثبتة فقط، وكل تعديل سيُسجل في `todo.md` قبل التنفيذ ويُعاد اختباره ويُراجع مقابل معيار خروجه.
