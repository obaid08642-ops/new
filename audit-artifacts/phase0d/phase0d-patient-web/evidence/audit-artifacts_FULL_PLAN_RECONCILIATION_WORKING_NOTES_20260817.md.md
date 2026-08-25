# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/FULL_PLAN_RECONCILIATION_WORKING_NOTES_20260817.md`
- **Member SHA-256:** `32e5213860b8eab965d095fd6fb62a5ab4a6d2082fe4b1b069d4dcc4089064a5`
- **Line count:** 57
- **Read range:** `1-57`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `21: نقطة `http://57.131.133.208:8003/api/v1` تستجيب health بحالة ok. تسجيل دخول patient وlab وradiology وnursing وhospital بحالة 201. `GET /orders/mine` للمريض أعاد 200. `GET /radiology/provider/inbox` أعاد 200 وقائمة فارغة. المختبر أعاد 403 في`
- `39: Official Vezeeta web evidence shows a focused acquisition/search funnel: specialty, city, area, insurance, doctor-name search, verified patient reviews, automatic booking confirmation, clinic payment, specialty/city landing pages, and App S`
- `51: - Vezeeta official site: https://www.vezeeta.com/en (redirected during review to https://jordan.vezeeta.com/en); reviewed search funnel, specialties/cities/insurance, booking confirmation, reviews, clinic payment, and app distribution.`
### backend_consumers_or_contracts
- `16: | `src/modules/insurance-engine/insurance-engine.module.ts` | فشل اختبار حدود الاسترداد عند 24 ساعة بسبب انزياح microseconds (`expected 100`, `received 50`) | تقريب الفارق إلى الدقيقة للأعلى مع حدود شاملة |`
- `21: نقطة `http://57.131.133.208:8003/api/v1` تستجيب health بحالة ok. تسجيل دخول patient وlab وradiology وnursing وhospital بحالة 201. `GET /orders/mine` للمريض أعاد 200. `GET /radiology/provider/inbox` أعاد 200 وقائمة فارغة. المختبر أعاد 403 في`
- `35: Chat trace found a real REST persistence path in `ChatService`, but SocketContext emitted `chat:join` and `chat:typing:*` while gateway listened to different names, and gateway send_message emitted unpersisted messages. Gateway now validate`
- `47: Static architecture evidence is mixed. The backend has Redis-backed OTP/rate limiting, BullMQ notification processing, graceful shutdown, compression, helmet, global validation, and approximately 99 schema indexes. However, `src/main.ts` us`
- `51: - Vezeeta official site: https://www.vezeeta.com/en (redirected during review to https://jordan.vezeeta.com/en); reviewed search funnel, specialties/cities/insurance, booking confirmation, reviews, clinic payment, and app distribution.`
### auth_ownership
- `7: مصفوفة `EXECUTION_COMPLETION_MATRIX_20260816.md` تصنف Phase 1.5 كمنفذة جزئياً، Phase 3 و4 كمصدرية مع نقص عقدي/تشغيلي، Phase 5 بنيوية مع نقص قبول اللغات والأجهزة، Phase 6 حمايةً لا كميزات معتمدة، وPhase 7 توثيقياً لا اختبارياً. كما أن كل مجم`
- `15: | `src/modules/provider/simulated-features.controller.ts` | check-in/report يستخدمان `findById` بلا ownership؛ تقرير الأشعة ينشئ `FILE-${Date.now()}`؛ publish بلا report/ownership | استخدام public UUID، تحقق أدوار وملكية، وإجبار `file_id` ح`
- `33: LiveKit was real but had authorization gaps: `reject`, `getSession`, and admin room endpoints were insufficiently protected; `session_id` and `room_name` were mixed. Controller/service now enforce participant ownership, admin roles, consist`
- `39: Official Vezeeta web evidence shows a focused acquisition/search funnel: specialty, city, area, insurance, doctor-name search, verified patient reviews, automatic booking confirmation, clinic payment, specialty/city landing pages, and App S`
- `47: Static architecture evidence is mixed. The backend has Redis-backed OTP/rate limiting, BullMQ notification processing, graceful shutdown, compression, helmet, global validation, and approximately 99 schema indexes. However, `src/main.ts` us`
### state_transitions
- `3: هذه مذكرة عمل مؤقتة لتتبع استئناف الخطة الأساسية، وليست حكماً نهائياً. مصفوفة الإكمال الرسمية تقر صراحة بأن الخطة لم تُغلق بالكامل وأن Phase 3–6 وE2E وعقود consent/QR/location/error-codes بقيت جزئية أو مفتوحة.`
- `33: LiveKit was real but had authorization gaps: `reject`, `getSession`, and admin room endpoints were insufficiently protected; `session_id` and `room_name` were mixed. Controller/service now enforce participant ownership, admin roles, consist`
### payment_insurance_relevance
- `16: | `src/modules/insurance-engine/insurance-engine.module.ts` | فشل اختبار حدود الاسترداد عند 24 ساعة بسبب انزياح microseconds (`expected 100`, `received 50`) | تقريب الفارق إلى الدقيقة للأعلى مع حدود شاملة |`
- `39: Official Vezeeta web evidence shows a focused acquisition/search funnel: specialty, city, area, insurance, doctor-name search, verified patient reviews, automatic booking confirmation, clinic payment, specialty/city landing pages, and App S`
- `43: Google Search Central research confirms structured data helps Google understand content and eligibility for rich results; it does not guarantee ranking or AI citations. Merchant listing structured data and truthful product/price/availabilit`
- `51: - Vezeeta official site: https://www.vezeeta.com/en (redirected during review to https://jordan.vezeeta.com/en); reviewed search funnel, specialties/cities/insurance, booking confirmation, reviews, clinic payment, and app distribution.`
### error_empty_loading_retry_cancel
- `3: هذه مذكرة عمل مؤقتة لتتبع استئناف الخطة الأساسية، وليست حكماً نهائياً. مصفوفة الإكمال الرسمية تقر صراحة بأن الخطة لم تُغلق بالكامل وأن Phase 3–6 وE2E وعقود consent/QR/location/error-codes بقيت جزئية أو مفتوحة.`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
