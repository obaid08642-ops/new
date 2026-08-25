# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_FINAL_REMEDIATION_AND_RELEASE_READINESS_20260815.md`
- **Member SHA-256:** `c049d97492ca4962dc4de8593a73e7fd9b73308bce8b1c8c35fee41681c736aa`
- **Line count:** 109
- **Read range:** `1-109`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `8: > هذا التقرير هو ملخص قرار التسليم للمبرمج أو فريق الجودة. السجل التفصيلي الحاكم هو [سجل المصالحة الحي](./NABDAH_LIVE_RECONCILIATION_REGISTER_20260815.md). لا يعني نجاح البناء والاختبار المحلي أن النظام جاهز للإنتاج أو للمتاجر.`
- `30: | `NABDAH_LIVE_RECONCILIATION_REGISTER_20260815.md` | دليل الأدلة، النطاق، البوابات، والقيود لكل مرحلة | المرجع التفصيلي الحاكم |`
- `56: كما استُبدل QR الذي كان يتضمن معلومات صحية مباشرة برمز JWT قصير العمر لا يحمل بيانات طبية. وعندما تبين غياب verifier وعقد موافقة للمسح، لم تُنشأ واجهة وهمية بديلة؛ حُجبت الواجهة بوضوح إلى حين تصميم العقد. تتبع الطوارئ يعرض البيانات التي يعي`
- `60: فُحصت 493 ملفاً في تطبيق المريض، وحدد الجرد 1,478 نصاً عربياً ساكناً مرشحاً. أضيف قاموس يتضمن 1,445 عبارة غير مغطاة للغات **العربية والإنجليزية والأردية والهندية والبنغالية والفلبينية**؛ وتحوّلت نصوص `Text` المباشرة وتنبيهات `Alert` في rout`
- `72: | مسار طوارئ مرسوم | لا route أو ETA مصطنع | consent location، retention، schema نقاط، directions service |`
- `109: [1]: ./NABDAH_LIVE_RECONCILIATION_REGISTER_20260815.md "سجل المصالحة مع المصدر الحي — منصة نبض الصحية"`
### backend_consumers_or_contracts
- `43: أضيف تحقق إنتاجي مركزي لـMongo وRedis وJWT وCORS، وأزيلت الأسرار التطويرية وفوالب localhost و`dummy-project-id` من المواضع المثبتة. توحدت الإدارة حول API base مركزي، كما صارت بوابات WebSocket تستخدم allow-list للأصول وتفشل بأمان عند غياب إع`
### auth_ownership
- `19: | أمن المصدر | تحسن جوهرياً | OTP وseed وBOLA وCORS/JWT والإديمبوتنسي وملف المريض عولجت في النطاق المثبت |`
- `29: | `Napd-admin-dashboard.zip` | لوحة الإدارة بعد حوكمة API والتشغيل | مراجعة الإدارة وCORS والـAPI base |`
- `37: عولجت حواجز البناء الأولية في لوحة الإدارة وتخزين Redux المشفر واختبار Animated للمزوّد. ثم أُغلقت مشاكل OTP والـseed والوصول إلى عينات المختبر. صار OTP مجزأً ومحدوداً زمنياً ومفصولاً بمفاتيح مستقلة، كما حُصرت عمليات seed في بيئات الاختبار `
- `50: | Push project ID افتراضي | لا يصدر token وهمي عندما لا تتوفر تهيئة Expo الفعلية |`
- `71: | QR صحي | حالة عدم إتاحة صادقة | verifier، role checks، consent، expiry/revocation، audit، E2E |`
- `73: | أخطاء API مترجمة | حواجز محلية فقط | error code registry وHTTP transitions وowner للعقود |`
- `82: | web admin | `NODE_ENV=production npm run build` ناجح في Phase 2 | لا توجد مجموعة E2E موثقة | يلزم browser E2E على staging |`
### state_transitions
- `20: | الإنتاج والمتاجر | **غير جاهز** | يلزم staging وE2E ودوران اعتماد R2 ومراجعة lockfiles وعقود consent/QR/location/error codes ومراجعة لغوية بشرية |`
- `73: | أخطاء API مترجمة | حواجز محلية فقط | error code registry وHTTP transitions وowner للعقود |`
- `100: | عالية | error codes وruntime config | قائمة error codes وschema منشوران، وحالات الغياب لا تظهر نجاحاً أو قيمة بديلة |`
### payment_insurance_relevance
- `79: | backend | `npm run build` ناجح | 26 suites / 211 tests ناجحة | لا يثبت Mongo/Redis/SMTP/Payment في بيئة متصلة |`
### error_empty_loading_retry_cancel
- `20: | الإنتاج والمتاجر | **غير جاهز** | يلزم staging وE2E ودوران اعتماد R2 ومراجعة lockfiles وعقود consent/QR/location/error codes ومراجعة لغوية بشرية |`
- `73: | أخطاء API مترجمة | حواجز محلية فقط | error code registry وHTTP transitions وowner للعقود |`
- `100: | عالية | error codes وruntime config | قائمة error codes وschema منشوران، وحالات الغياب لا تظهر نجاحاً أو قيمة بديلة |`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
