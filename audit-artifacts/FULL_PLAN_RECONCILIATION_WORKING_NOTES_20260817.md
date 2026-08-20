# ملاحظات جرد الخطة الكاملة — 17 أغسطس 2026

هذه مذكرة عمل مؤقتة لتتبع استئناف الخطة الأساسية، وليست حكماً نهائياً. مصفوفة الإكمال الرسمية تقر صراحة بأن الخطة لم تُغلق بالكامل وأن Phase 3–6 وE2E وعقود consent/QR/location/error-codes بقيت جزئية أو مفتوحة.

## ما ثبت من قراءة السجلات

مصفوفة `EXECUTION_COMPLETION_MATRIX_20260816.md` تصنف Phase 1.5 كمنفذة جزئياً، Phase 3 و4 كمصدرية مع نقص عقدي/تشغيلي، Phase 5 بنيوية مع نقص قبول اللغات والأجهزة، Phase 6 حمايةً لا كميزات معتمدة، وPhase 7 توثيقياً لا اختبارياً. كما أن كل مجموعات `E2E-AUTH`, `E2E-CFG`, `E2E-LAB`, `E2E-PHARM`, `E2E-PROV`, `E2E-ADMIN`, `E2E-WS`, `E2E-I18N`, و`E2E-A11Y` كانت مفتوحة قبل جولة Gatekeeper.

## عيوب مصدرية جديدة ظهرت أثناء الاستئناف

| الموضع | الملاحظة الأولية | الإجراء الجاري |
|---|---|---|
| `src/modules/webhooks/guards/livekit-webhook.guard.ts` | fallback إلى `fake_key` و`fake_secret` عند غياب الأسرار | استبدال verifier الوهمي بـfail-closed صريح |
| `src/modules/device-trust/device-trust.module.ts` | verify كان يتجاوز استهلاك challenge عند غياب Redis، وإشارات `placeholder: true`، وfallback package في production | إلزام Redis، مطابقة مالك challenge، إزالة إشارات placeholder، ومنع fallback الإنتاجي |
| `src/modules/provider/simulated-features.controller.ts` | check-in/report يستخدمان `findById` بلا ownership؛ تقرير الأشعة ينشئ `FILE-${Date.now()}`؛ publish بلا report/ownership | استخدام public UUID، تحقق أدوار وملكية، وإجبار `file_id` حقيقي ووجود تقرير قبل النشر |
| `src/modules/insurance-engine/insurance-engine.module.ts` | فشل اختبار حدود الاسترداد عند 24 ساعة بسبب انزياح microseconds (`expected 100`, `received 50`) | تقريب الفارق إلى الدقيقة للأعلى مع حدود شاملة |
| `patient-app/src/core/platform/id/IdGenerator.ts` و`ScheduleManager.ts` | معرفات قصيرة/محلية عشوائية؛ يلزم تتبع استخدامها للتأكد أنها لا تُرسل كمعرفات business | الجرد مستمر؛ لا حكم placeholder قبل تتبع المستهلك |

## نتائج staging الحالية

نقطة `http://57.131.133.208:8003/api/v1` تستجيب health بحالة ok. تسجيل دخول patient وlab وradiology وnursing وhospital بحالة 201. `GET /orders/mine` للمريض أعاد 200. `GET /radiology/provider/inbox` أعاد 200 وقائمة فارغة. المختبر أعاد 403 في `/labs/provider/inbox` و`/labs/samples`، و`GET /hospital/staff` أعاد 500. مسار `/home-care/provider/bookings` غير موجود؛ العقد المصدر الفعلي هو `/nursing/visits?provider_id=...`. هذه النتائج تثبت أن staging الحالية لم تُنشر عليها كل إصلاحات المصدر أو أن عقود claims فيها مختلفة، ولا تغلق E2E.

## قاعدة المتابعة

لا تُعلّم أي بند من الخطة الأساسية كمكتمل بسبب build محلي فقط. كل بند يحتاج واحداً من: source evidence + test، أو staging evidence منقح، أو قرار عقدي موثق يثبت أن الميزة محجوبة بصدق ولا تعرض نجاحاً أو بيانات تركيبية.

## New product/communications track findings — 2026-08-17

Patient `AppContext` had manual persistence but defaulted to light/Arabic; it now defaults to `system` theme and derives language from `react-native-localize` among ar/en/ur/hi/bn/fil (tl maps to fil), while persisted manual choices remain authoritative. `LanguageManager.initialize()` follows the same device-language rule.

Provider theme previously stored only light/dark and overwrote manual choice whenever OS appearance changed. It now supports system/light/dark, resolves system mode without overwriting it, and uses `Intl.DateTimeFormat().resolvedOptions().locale` for a dependency-free ar/en device default. Patient and provider typecheck/tests remain green: patient 7 suites/23 tests; provider 1 suite/3 tests.

LiveKit was real but had authorization gaps: `reject`, `getSession`, and admin room endpoints were insufficiently protected; `session_id` and `room_name` were mixed. Controller/service now enforce participant ownership, admin roles, consistent room lookup/token issuance, and tests in `livekit.service.spec.ts`. Backend status after this change: TypeScript green; Jest 28 suites/221 tests green.

Chat trace found a real REST persistence path in `ChatService`, but SocketContext emitted `chat:join` and `chat:typing:*` while gateway listened to different names, and gateway send_message emitted unpersisted messages. Gateway now validates thread membership for join/typing/read events, accepts the app event aliases, refuses socket message creation in favor of the persisted REST contract, and fans out persisted `chat.message_sent` as `chat:message`/`new_message`. TypeScript and Jest remain green after this change. Further provider realtime UI, push, audio-channel, background lifecycle, and staging verification remain open.

## Competitive and discovery evidence — 2026-08-17

Official Vezeeta web evidence shows a focused acquisition/search funnel: specialty, city, area, insurance, doctor-name search, verified patient reviews, automatic booking confirmation, clinic payment, specialty/city landing pages, and App Store/Google Play/AppGallery distribution. The current Nabdah public entity system has dynamic entity pages, but its admin shell is Arabic-only and its public pages are largely hard-coded RTL/light UI; category breadth exists in backend/app catalogs but discoverability and proof of service quality still need product work.

Official Teladoc evidence shows a broader care-program architecture: 24/7 care, primary care, mental health, diabetes/weight/hypertension management, specialty care, expert medical opinion, nutrition, sleep, tobacco cessation, sexual health, plus employer/health-plan/hospital channels. This is a benchmark for longitudinal care and program packaging, not evidence that Nabdah should copy claims or content without clinical governance.

Google Search Central research confirms structured data helps Google understand content and eligibility for rich results; it does not guarantee ranking or AI citations. Merchant listing structured data and truthful product/price/availability fields are relevant to medicines and services. MCP/agentic commerce should expose narrow, authenticated, consent-aware discovery/availability/cart tools—not medical diagnosis or unrestricted patient data—and must be treated as a new integration surface, not an SEO shortcut.

## Scale and performance evidence — 2026-08-17

Static architecture evidence is mixed. The backend has Redis-backed OTP/rate limiting, BullMQ notification processing, graceful shutdown, compression, helmet, global validation, and approximately 99 schema indexes. However, `src/main.ts` uses the default Nest `IoAdapter`, `ChatGateway` keeps `activeUsers` in a process-local `Map`, and `@socket.io/redis-adapter` is not present in package dependencies. Therefore horizontal realtime fan-out, presence consistency, and millions of concurrent connections are not proven and would fail across multiple instances without an adapter/session strategy. A real capacity claim requires a load-test plan with Mongo indexes/query profiles, Redis sizing, queue throughput, websocket fan-out, rate-limit behavior, CDN/object storage, autoscaling and failure recovery.

### External sources

- Vezeeta official site: https://www.vezeeta.com/en (redirected during review to https://jordan.vezeeta.com/en); reviewed search funnel, specialties/cities/insurance, booking confirmation, reviews, clinic payment, and app distribution.
- Teladoc Health official site: https://www.teladochealth.com/; reviewed 24/7 care, primary care, mental health, condition management, specialty/wellness, nutrition and enterprise channels.
- Google Search Central structured data guidelines: https://developers.google.com/search/docs/appearance/structured-data/sd-policies
- Google Search Central structured data introduction: https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data
- Google Search Central merchant listings: https://developers.google.com/search/docs/appearance/structured-data/merchant-listing
- Anthropic MCP introduction: https://www.anthropic.com/news/model-context-protocol
- Google Search AI era announcement reviewed as context, not a ranking guarantee: https://blog.google/products-and-platforms/products/search/search-io-2026/
