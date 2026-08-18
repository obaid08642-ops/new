# مصفوفة التحقق من تنفيذ خطة مصالحة منصة نبض

**تاريخ المراجعة:** 16 أغسطس 2026  
**الفرع المفحوص:** `manus/on-live-reconciliation`  
**آخر التزام مصدرّي قبل هذه المراجعة:** `e521b57`  
**الغرض:** الإجابة بدقة عن سؤال: هل نُفذت كل بنود الخطة؟

## الحكم المختصر

الجواب هو **لا، لم تُنفذ كل البنود**. أُغلقت المعالجة المصدرية المحلية للمراحل Phase 0 إلى Phase 7، ثم أُصلحت فجوة إضافية في مسار موظفي المنشأة بعد Phase 7. لكن **لم تُنفذ أي جولة E2E حقيقية على staging في هذه المساحة**، ولم تُعتمد العقود الطبية الحساسة الجديدة، ولم يُدوّر اعتماد R2 خارج المستودع، ولم تُغلق مراجعة lockfiles واللغات والأجهزة الفعلية. لذلك لا يوجد أساس صادق لإعلان الجاهزية للإنتاج أو المتاجر.

> نجاح `build` أو اختبارات Jest/Expo المحلية يثبت سلامة المصدر ضمن حدود الاختبار، لكنه لا يثبت اتصال Mongo/Redis/SMTP/SMS/payment/storage، ولا يثبت الملكية بين حسابين، ولا يثبت الأجهزة أو WebSocket أو GPS أو push.

## تعريف الحالات

| الحالة | معناها |
|---|---|
| **منفذ ومثبت محلياً** | يوجد تعديل مصدرّي، بوابة build/test أو scan مرتبطة به، والتزام مستقل.
| **منفذ جزئياً** | عولج جزء المصدر، لكن جزء العقد أو المستهلك أو الاختبار أو المراجعة لم يُغلق.
| **غير منفذ — staging** | لا يمكن إغلاقه دون بيئة معزولة وخدمات اختبار وبيانات منفصلة.
| **غير منفذ — عقد/تشغيل** | يحتاج تصميم عقد أو إجراء تشغيلي أو اعتماداً خارج الكود.

## مصفوفة المراحل

| المرحلة | الحالة الحالية | الدليل | ما الذي لم يُغلق؟ |
|---|---|---|---|
| Phase 0 — baseline وسلامة الحزم | **منفذ ومثبت محلياً** | الالتزام `ab36937`، build للمكونات، اختبارات baseline، وفحص الأرشيفات | lockfiles لم تُسوَّ تسوية نهائية.
| Phase 1 — SEC-01..05 | **منفذ ومثبت محلياً** | الالتزام `88946e1`، OTP/seed/BOLA، backend 25 suites/207 tests في البوابة المرحلية | تشغيل FastAPI/Redis/SMTP/SMS وتدوير R2 خارج Git لم تُثبت.
| Phase 1.5 — idempotency | **منفذ جزئياً** | الالتزام `d81e6a7`، 26 suites/211 tests، قفل Redis ومفتاح scoped | الحماية ما زالت محدودة بالـroute الذي فُحص؛ refunds/wallet/billing/pharmacy mutations تحتاج مراجعة endpoint-by-endpoint.
| Phase 2 — config/network | **منفذ ومثبت محلياً** | الالتزام `ecb14eb`، CFG-01..07، backend/patient/provider/admin gates | صحة متغيرات staging واتصال REST/WebSocket من origins لم تُختبر.
| Phase 3 — checkout/QR/labs/emergency | **منفذ مصدرّياً، جزئي عقدياً** | الالتزام `9c8c927`، إزالة القيم التركيبية وQR الطبي المباشر | QR verifier/consent، route/location، payment contract وE2E لم تُنفذ.
| Phase 4 — pharmacy | **منفذ مصدرّياً، جزئي تشغيلياً** | الالتزام `96cea2b`، checkout/tracking/OCR/bids/reorder | dispatch، inventory، bid acceptance، payment/webhook، delivery وBOLA بحسابين لم تُختبر.
| Phase 5 — i18n | **منفذ بنيوياً، جزئي قبولياً** | الالتزام `b88c218`، 1,445 مدخلاً بست لغات، LocalizedText/Alert | مراجعة مترجم طبي، RTL/LTR، overflow، accessibility، API/backend errors والأجهزة الفعلية لم تُغلق.
| Phase 6 — sensitive contracts | **منفذ حمايةً، غير منفذ كميزات** | الالتزام `a5594f1`، runtime config وmedical-profile fail-closed وQR provider blocked | consent، QR verifier، emergency route/location، error-code registry وschema versioning غير معتمدة.
| Phase 7 — handoff | **منفذ توثيقياً، غير منفذ اختبارياً** | الالتزام `9ff137f`، تقرير الجاهزية وخطة E2E | لا توجد staging منفصلة ولا evidence E2E/UAT.
| استئناف ما بعد Phase 7 | **منفذ مصدرّياً في النطاق المفحوص** | الالتزامان `052ca60` و`e521b57`، توحيد FacilityDashboard وحجب route الموروث، provider 3/3 وiOS export | بقية إثباتات الملكية والصلاحيات تحتاج staging.

## مصفوفة السيناريوهات الإلزامية في خطة E2E

| المجموعة | IDs | الحالة | سبب عدم الإغلاق |
|---|---|---|---|
| الهوية و2FA | `E2E-AUTH-01..03` | **غير منفذة على staging** | لا حسابات staging/OTP test sink وأدلة HAR/Redis منقحة.
| التهيئة والشبكة | `E2E-CFG-01..03` | **غير منفذة على staging** | لا manifest بيئي مستقل ولا اختبار origins/Socket متصل.
| المختبر والحجز | `E2E-LAB-01..04` | **غير منفذة على staging** | لا provider account/booking/sample بيانات اختبار وحساب مريض B لإثبات BOLA.
| الصيدلية والتوصيل | `E2E-PHARM-01..07` | **غير منفذة على staging** | لا مخزون/صيدلي/dispatch/payment sandbox/webhook sequence معزول.
| المزوّد والإدارة | `E2E-PROV-01..04`, `E2E-ADMIN-01` | **غير منفذة على staging** | الاختبارات المحلية لا تثبت provider onboarding أو browser flow أو device push.
| WebSocket | `E2E-WS-01..02` | **غير منفذة على staging** | لم يُثبت handshake من origin مصرح أو رفض impersonation باتصال حي.
| التوطين وإمكانية الوصول | `E2E-I18N-01..03`, `E2E-A11Y-01` | **غير منفذة قبولياً** | لا screenshots لكل لغة ولا iOS/Android UAT أو screen-reader checklist.

## بنود مصدرية/تشغيلية ما زالت مفتوحة

| البند | الحالة | القرار الصحيح الآن |
|---|---|---|
| `R2` credentials التي ظهرت تاريخياً | **غير منفذ تشغيلياً** | تدوير وإلغاء القديم خارج Git، مع تأكيد مسؤول التشغيل؛ لا تُحفظ القيم في التقرير.
| lockfiles وdependency audit | **غير منفذ** | مراجعة manifests وlockfiles، بناء نظيف متكرر، وفحص أمني قبل تغيير الإصدارات.
| consent للملف الطبي | **غير منفذ كعقد** | إبقاء provider medical-profile محجوباً حتى grant/revoke/scope/relationship/audit.
| QR verifier | **غير منفذ كعقد** | إبقاء QR provider غير متاح؛ لا إنشاء scanner أو نجاح مشاركة شكلي.
| emergency route/location | **غير منفذ كعقد** | عدم رسم polyline/ETA؛ اعتماد location consent/retention/schema/service أولاً.
| error-code registry | **غير منفذ** | عدم ادعاء اكتمال التوطين الديناميكي؛ اعتماد codes ثابتة وHTTP transitions وi18n keys.
| storage/OCR/payment/webhook | **جزئي** | المصدر يرسل للمسارات الموجودة، لكن الحجم/النوع/الموافقة والتسوية والويبهوك تحتاج staging.
| facility staff | **منفذ مصدرّياً في النطاق المفحوص** | تم إصلاح route/list/create/delete وحجب QR/الحفظ/المشاركة الشكلية؛ يلزم E2E ملكية مالك المنشأة.

## ما لم يحدث إطلاقاً في هذه المراجعة

لم يتم الاتصال بالإنتاج، ولم تُزرع حسابات أو OTP أو payment sandbox، ولم تُنفذ عملية شراء أو استرداد أو webhook أو push أو GPS أو QR scan أو WebSocket حي. كما لم يُدمج الفرع في `main` ولم تُرفع نسخة إلى متجر.

## القرار

الفرع **مناسب لمراجعة الكود والتحضير لـstaging فقط**. لا يصح وصفه بأنه «نفذ كل الخطة» أو «جاهز للإنتاج». الإغلاق الحقيقي يتطلب أولاً توفير staging منفصلة، ثم تنفيذ كل IDs في خطة E2E، ومعالجة الموانع التشغيلية والعقود المفتوحة، وحفظ evidence منقحاً في التزام مستقل.

## المراجع

[1]: ./NABDAH_LIVE_RECONCILIATION_REGISTER_20260815.md "سجل المصالحة الحاكم"
[2]: ./POST_REMEDIATION_E2E_EXECUTION_PLAN.md "خطة staging وE2E"
[3]: ./NABDAH_FINAL_REMEDIATION_AND_RELEASE_READINESS_20260815.md "تقرير المعالجة وحكم الجاهزية"

