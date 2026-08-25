# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_FULL_PLAN_STATUS_20260817.md`
- **Member SHA-256:** `7dcba00d10f83929f58eed1984615c680da2a2fca2bdc171a890ad24f9a66d36`
- **Line count:** 226
- **Read range:** `1-226`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `23: | Phase 1.5 idempotency | جزئي | قفل Redis ومسار مالي مفحوص | مراجعة endpoint-by-endpoint لكل refunds/wallet/billing/pharmacy mutations |`
- `25: | Phase 3 checkout/QR/labs/emergency | مصدرّي جزئي | إزالة القيم التركيبية وحماية QR/tracking | عقد QR verifier وconsent وlocation/error codes وE2E |`
- `26: | Phase 4 pharmacy | مصدرّي جزئي | checkout/tracking/OCR/bids/reorder | dispatch/inventory/bid/payment/webhook/delivery وBOLA بحسابين |`
- `31: | استئناف الخطة 17 أغسطس | دفعة مصدرية منفذة | LiveKit، DeviceTrust، provider/features، refund boundary، client typechecks | مراجعة بقية المصدر، ثم staging لكل السيناريوهات |`
- `37: كُشف فشل حدود RefundService عند 24 ساعة وأُصلح بإدارة انزياح ساعة الطلب مع إبقاء الحدود شاملة. وفي تطبيق المريض استُبدل استدعاء API غير موجود (`getCalendars`) بالـAPI المثبت (`getCalendar`). وفي تطبيق المزوّد صُحح cast قائمة التأمين readonl`
- `58: تم التحقق من health في staging. نجحت تسجيلات الدخول للحسابات المعزولة، ونجح `GET /orders/mine` للمريض بحالة `200`، ونجح `GET /radiology/provider/inbox` بحالة `200` وقائمة فارغة. بقي `GET /labs/provider/inbox` و`GET /labs/samples` بحالة `403`
- `63: | BOLA mutation حقيقي بين مريضين في cancel/order | مفتوح؛ يحتاج order sandbox قابل للإلغاء وتحقق قبل/بعد من الحالة والـledger |`
- `73: يبقى تدوير اعتماد R2 التاريخي إجراءً تشغيلياً خارج Git. كما يلزم إعادة بناء صورة FastAPI المنشورة إذا كانت تحمل seed قديماً، واعتماد عقود consent وQR verifier وlocation/route وerror-code registry قبل تمكين واجهاتها. يلزم كذلك manifest stagi`
- `83: [3]: ./NABDAH_LIVE_RECONCILIATION_REGISTER_20260815.md "سجل المصالحة الحاكم"`
- `104: تم فحص جميع ملفات TypeScript/TSX في لوحة الإدارة بحثاً عن `next/document` و`<Html>` و`<Main>` و`<NextScript>`. الاستيراد الوحيد بقي محصوراً في `src/pages/_document.tsx`، ولم توجد imports مباشرة من `next/document` داخل `/admin/ai-control` أو`
- `126: The staging failure was caused by a split provider identity contract. Laboratory accounts could carry `role=provider` with `provider_type=laboratory`, while LabsService accepted only `lab`. Radiology provider routes used `@Roles(UserRole.RA`
- `146: The source-level FIX2 gate is complete. Gatekeeper must redeploy the resulting commit to staging and repeat live requests for `/labs/samples`, `/labs/provider/inbox`, radiology provider inbox, and the corresponding nursing, hospital, and ph`
### backend_consumers_or_contracts
- `22: | SEC-01..05 | منفذ مصدرّياً ومختبر | OTP/seed/labs BOLA واختبارات backend | إثبات Redis/FastAPI/SMTP/SMS على staging وتدوير اعتماد R2 خارج Git |`
- `23: | Phase 1.5 idempotency | جزئي | قفل Redis ومسار مالي مفحوص | مراجعة endpoint-by-endpoint لكل refunds/wallet/billing/pharmacy mutations |`
- `24: | Phase 2 config/network | منفذ مصدرّياً | production validation وCORS/JWT/WebSocket gates | اختبار origins وREST/Socket من staging فعلياً |`
- `25: | Phase 3 checkout/QR/labs/emergency | مصدرّي جزئي | إزالة القيم التركيبية وحماية QR/tracking | عقد QR verifier وconsent وlocation/error codes وE2E |`
- `54: هذه النتائج تثبت صحة المصدر ضمن البوابات المذكورة فقط. لا تثبت push/GPS/WebSocket/LiveKit/Redis/SMTP/SMS/payment/storage أو سلوك الأجهزة.`
- `58: تم التحقق من health في staging. نجحت تسجيلات الدخول للحسابات المعزولة، ونجح `GET /orders/mine` للمريض بحالة `200`، ونجح `GET /radiology/provider/inbox` بحالة `200` وقائمة فارغة. بقي `GET /labs/provider/inbox` و`GET /labs/samples` بحالة `403`
- `68: | WebSocket/origin/impersonation | لم تُغلق باتصال حي |`
- `92: لم تُغلق لوحة الإدارة بعد كواجهة متعددة اللغة وثيم يدوي كامل؛ فهي ما زالت RTL/عربية ثابتة مع CSS system-dark جزئي وclasses hard-coded. كما أن provider chat في بعض الشاشات REST-only ولا يملك shared SocketContext، وpush/audio يحتاجان اختباراً`
- `98: الحكم التشغيلي: لا يوجد دليل كافٍ لتحمل آلاف أو ملايين المستخدمين معاً. Redis/BullMQ وindexes وgraceful shutdown موجودة، لكن Socket.IO ما زال على IoAdapter افتراضي وactiveUsers محلي وبدون Redis adapter؛ يلزم load test وبنية multi-instance و`
- `130: `src/common/auth.guard.ts` now provides `normalizeEffectiveRole()` and `getEffectiveRoles()`. Authorization evaluates the normalized union of `role`, `provider_type`, and `providerType`. The normalizer maps `laboratory` and `lab` to `UserRo`
- `132: `src/modules/labs/labs.service.ts` now uses the effective role set for all provider-facing lab operations, including inbox, samples, transitions, reports, insurance, assignments, and reassignment. This accepts both `lab` and `laboratory` wi`
- `146: The source-level FIX2 gate is complete. Gatekeeper must redeploy the resulting commit to staging and repeat live requests for `/labs/samples`, `/labs/provider/inbox`, radiology provider inbox, and the corresponding nursing, hospital, and ph`
### auth_ownership
- `22: | SEC-01..05 | منفذ مصدرّياً ومختبر | OTP/seed/labs BOLA واختبارات backend | إثبات Redis/FastAPI/SMTP/SMS على staging وتدوير اعتماد R2 خارج Git |`
- `30: | Gatekeeper remediation | منفذ مصدرّياً | BOLA orders، provider roles، UUID hospital، Jest، localhost | نشر commit إلى staging وإعادة E2E كاملة |`
- `35: أُزيلت مفاتيح `fake_key` و`fake_secret` من LiveKit webhook وأصبح غياب الإعداد رفضاً آمناً. أُلزم Device Trust بوجود Redis، وأضيفت مطابقة مالك challenge، وأزيلت إشارات placeholder وfallback الإنتاجي. أضيفت ownership وrole checks إلى عمليات p`
- `51: | Admin Next production build | ناجح بعد حذف `.next` وتشغيل `NODE_ENV=production`، مع توليد 34 صفحة |`
- `66: | OTP/2FA وrate limit | لم تُغلق بمصفوفة E2E كاملة |`
- `90: هذه المرحلة لم تكن مغلقة عند بدء الجولة. تم تنفيذ إصلاحات مصدرية مثبتة: حماية LiveKit بملكية المشارك وأدوار الإدارة وتوحيد session/room، تقوية ChatGateway بملكية thread وبث الرسائل المحفوظة، تفعيل default system theme وdevice-language مع ov`
- `103: ### نتيجة فحص Admin`
- `104: تم فحص جميع ملفات TypeScript/TSX في لوحة الإدارة بحثاً عن `next/document` و`<Html>` و`<Main>` و`<NextScript>`. الاستيراد الوحيد بقي محصوراً في `src/pages/_document.tsx`، ولم توجد imports مباشرة من `next/document` داخل `/admin/ai-control` أو`
- `122: ## Gatekeeper FIX2 — provider-role normalization — 2026-08-17`
- `126: The staging failure was caused by a split provider identity contract. Laboratory accounts could carry `role=provider` with `provider_type=laboratory`, while LabsService accepted only `lab`. Radiology provider routes used `@Roles(UserRole.RA`
- `130: `src/common/auth.guard.ts` now provides `normalizeEffectiveRole()` and `getEffectiveRoles()`. Authorization evaluates the normalized union of `role`, `provider_type`, and `providerType`. The normalizer maps `laboratory` and `lab` to `UserRo`
- `132: `src/modules/labs/labs.service.ts` now uses the effective role set for all provider-facing lab operations, including inbox, samples, transitions, reports, insurance, assignments, and reassignment. This accepts both `lab` and `laboratory` wi`
### state_transitions
- `23: | Phase 1.5 idempotency | جزئي | قفل Redis ومسار مالي مفحوص | مراجعة endpoint-by-endpoint لكل refunds/wallet/billing/pharmacy mutations |`
- `25: | Phase 3 checkout/QR/labs/emergency | مصدرّي جزئي | إزالة القيم التركيبية وحماية QR/tracking | عقد QR verifier وconsent وlocation/error codes وE2E |`
- `27: | Phase 5 i18n | بنيوي جزئي | قاموس اللغات الست وتغطية النصوص المفحوصة | مراجعة طبية بشرية، RTL/LTR، overflow، accessibility، API errors، أجهزة فعلية |`
- `28: | Phase 6 sensitive contracts | حماية fail-closed لا ميزة مكتملة | medical-profile وQR provider محجوبان عند غياب العقد | consent grant/revoke/scope، QR verifier، emergency location policy، error registry |`
- `31: | استئناف الخطة 17 أغسطس | دفعة مصدرية منفذة | LiveKit، DeviceTrust، provider/features، refund boundary، client typechecks | مراجعة بقية المصدر، ثم staging لكل السيناريوهات |`
- `37: كُشف فشل حدود RefundService عند 24 ساعة وأُصلح بإدارة انزياح ساعة الطلب مع إبقاء الحدود شاملة. وفي تطبيق المريض استُبدل استدعاء API غير موجود (`getCalendars`) بالـAPI المثبت (`getCalendar`). وفي تطبيق المزوّد صُحح cast قائمة التأمين readonl`
- `63: | BOLA mutation حقيقي بين مريضين في cancel/order | مفتوح؛ يحتاج order sandbox قابل للإلغاء وتحقق قبل/بعد من الحالة والـledger |`
- `73: يبقى تدوير اعتماد R2 التاريخي إجراءً تشغيلياً خارج Git. كما يلزم إعادة بناء صورة FastAPI المنشورة إذا كانت تحمل seed قديماً، واعتماد عقود consent وQR verifier وlocation/route وerror-code registry قبل تمكين واجهاتها. يلزم كذلك manifest stagi`
- `88: ## Product, communications, UX and discovery track — status update`
- `126: The staging failure was caused by a split provider identity contract. Laboratory accounts could carry `role=provider` with `provider_type=laboratory`, while LabsService accepted only `lab`. Radiology provider routes used `@Roles(UserRole.RA`
- `146: The source-level FIX2 gate is complete. Gatekeeper must redeploy the resulting commit to staging and repeat live requests for `/labs/samples`, `/labs/provider/inbox`, radiology provider inbox, and the corresponding nursing, hospital, and ph`
- `155: صُحح `LiveKitService.markNoShow` ليستخدم حقل appointment business `id`، مع fallback محدود إلى `_id` فقط عندما يكون المعرّف ObjectId صالحاً، وبنفس نمط `initiateCall`. أضيف اختبار يثبت استعلام UUID واختبار رفض appointment غير الموجود.`
### payment_insurance_relevance
- `23: | Phase 1.5 idempotency | جزئي | قفل Redis ومسار مالي مفحوص | مراجعة endpoint-by-endpoint لكل refunds/wallet/billing/pharmacy mutations |`
- `26: | Phase 4 pharmacy | مصدرّي جزئي | checkout/tracking/OCR/bids/reorder | dispatch/inventory/bid/payment/webhook/delivery وBOLA بحسابين |`
- `31: | استئناف الخطة 17 أغسطس | دفعة مصدرية منفذة | LiveKit، DeviceTrust، provider/features، refund boundary، client typechecks | مراجعة بقية المصدر، ثم staging لكل السيناريوهات |`
- `37: كُشف فشل حدود RefundService عند 24 ساعة وأُصلح بإدارة انزياح ساعة الطلب مع إبقاء الحدود شاملة. وفي تطبيق المريض استُبدل استدعاء API غير موجود (`getCalendars`) بالـAPI المثبت (`getCalendar`). وفي تطبيق المزوّد صُحح cast قائمة التأمين readonl`
- `54: هذه النتائج تثبت صحة المصدر ضمن البوابات المذكورة فقط. لا تثبت push/GPS/WebSocket/LiveKit/Redis/SMTP/SMS/payment/storage أو سلوك الأجهزة.`
- `67: | payment sandbox/webhook/idempotency | لم تُغلق بمسار مالي مصرح |`
- `73: يبقى تدوير اعتماد R2 التاريخي إجراءً تشغيلياً خارج Git. كما يلزم إعادة بناء صورة FastAPI المنشورة إذا كانت تحمل seed قديماً، واعتماد عقود consent وQR verifier وlocation/route وerror-code registry قبل تمكين واجهاتها. يلزم كذلك manifest stagi`
- `104: تم فحص جميع ملفات TypeScript/TSX في لوحة الإدارة بحثاً عن `next/document` و`<Html>` و`<Main>` و`<NextScript>`. الاستيراد الوحيد بقي محصوراً في `src/pages/_document.tsx`، ولم توجد imports مباشرة من `next/document` داخل `/admin/ai-control` أو`
- `126: The staging failure was caused by a split provider identity contract. Laboratory accounts could carry `role=provider` with `provider_type=laboratory`, while LabsService accepted only `lab`. Radiology provider routes used `@Roles(UserRole.RA`
- `130: `src/common/auth.guard.ts` now provides `normalizeEffectiveRole()` and `getEffectiveRoles()`. Authorization evaluates the normalized union of `role`, `provider_type`, and `providerType`. The normalizer maps `laboratory` and `lab` to `UserRo`
- `132: `src/modules/labs/labs.service.ts` now uses the effective role set for all provider-facing lab operations, including inbox, samples, transitions, reports, insurance, assignments, and reassignment. This accepts both `lab` and `laboratory` wi`
- `173: اختبارات BOLA الحية بين مريضين، payment sandbox/webhook/idempotency، WebSocket origin وانتحال الهوية، وOTP/2FA/rate-limit تحتاج staging وRedis وMongo وcredentials الفعلية. كلمات مرور sandbox المذكورة في طلب Gatekeeper لا تُحفظ في المصدر أو `
### error_empty_loading_retry_cancel
- `25: | Phase 3 checkout/QR/labs/emergency | مصدرّي جزئي | إزالة القيم التركيبية وحماية QR/tracking | عقد QR verifier وconsent وlocation/error codes وE2E |`
- `27: | Phase 5 i18n | بنيوي جزئي | قاموس اللغات الست وتغطية النصوص المفحوصة | مراجعة طبية بشرية، RTL/LTR، overflow، accessibility، API errors، أجهزة فعلية |`
- `28: | Phase 6 sensitive contracts | حماية fail-closed لا ميزة مكتملة | medical-profile وQR provider محجوبان عند غياب العقد | consent grant/revoke/scope، QR verifier، emergency location policy، error registry |`
- `63: | BOLA mutation حقيقي بين مريضين في cancel/order | مفتوح؛ يحتاج order sandbox قابل للإلغاء وتحقق قبل/بعد من الحالة والـledger |`
- `73: يبقى تدوير اعتماد R2 التاريخي إجراءً تشغيلياً خارج Git. كما يلزم إعادة بناء صورة FastAPI المنشورة إذا كانت تحمل seed قديماً، واعتماد عقود consent وQR verifier وlocation/route وerror-code registry قبل تمكين واجهاتها. يلزم كذلك manifest stagi`
- `171: لم تُفعّل واجهات جديدة لعقود consent أو QR verifier أو emergency location policy أو error-code registry؛ بقيت الواجهات غير المعتمدة fail-closed أو ضمن العقود الحالية، وتم توثيق الحاجة إلى اعتماد scope/grant/revoke وسجل تدقيق، verifier QR، س`
- `190: عند رفض `join_thread` لا يُرمى exception إلى Socket.IO؛ يعيد handler ACK صريحاً `{ error: 'not_participant' }`، بينما يعيد `{ error: 'socket_not_authenticated' }` للاتصال غير الموثق. لا ينفذ `socket.join` إلا بعد نجاح `ChatService.getThread`
- `208: بناءً على اعتماد الخيار (ب)، أُنشئت أربع وثائق مراجعة مستقلة للعقود الأولية: `CONSENT_CONTRACT_REVIEW_DRAFT_20260817.md`، `QR_VERIFIER_CONTRACT_REVIEW_DRAFT_20260817.md`، `EMERGENCY_LOCATION_POLICY_REVIEW_DRAFT_20260817.md`، و`ERROR_CODE_RE`
- `210: التحقق الحي الأولي أثبت login للمريض والمختبر عبر المسارات الصحيحة. BOLA بين مريضين لم يُغلق لغياب credential ثانٍ مؤكد في probe. payment intent أعاد `500 Internal server error` مرتين على order pending، لذلك لم يُثبت idempotency؛ unmatched `
- `224: بعد تجاوز Cloudflare عبر `--resolve api.nabd.plus:443:57.131.133.208`، أُنشئ order sandbox واحد من `patient.sandbox@nabd.plus` بالمعرف `91047ef2-ad36-422a-a184-629693e7c729`. قبل اختبار patient2 كانت الحالة `ESCALATED_TO_ADMIN` و`payment_st`
- `226: تم إصلاح السبب المصدرّي: `OrdersService.cancel` يفرض ownership قبل CancellationPolicy أو أي side effect مالي، و`GET /orders/:id` أصبح يمرر CurrentUser ويطبق access guard للمالك أو pharmacy assignment أو admin. أُضيفت اختبارات foreign patien`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
