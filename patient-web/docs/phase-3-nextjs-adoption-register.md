# سجل اعتماد دليل Next.js — Web App المريض

هذا السجل يحول متطلبات الدليل إلى قرارات قابلة للتنفيذ، ويبين التعارض مع القالب الحالي وما يلزم قبل اعتباره منفذاً. لا تعني «معتمد» أنه مكتوب في المشروع؛ بل إنه قرار معماري ملزم للمرحلة 4 وما بعدها.

| بند الدليل | وضع المشروع الحالي | القرار المعتمد | متطلبات التنفيذ/الاختبار | الحالة |
|---|---|---|---|---|
| Next.js App Router + strict TS | القالب الحالي React/Vite/Express/tRPC SPA، ولا يحقق App Router أو HTML عام SSR/ISR. | استبدال طبقة واجهة العميل بـNext.js App Router، لا محاولة تسمية SPA على أنها Next. | `tsconfig` strict، build/start Next، فحص typecheck وroutes. | مخطط للمرحلة 4 |
| طبقات services/hooks/features | استدعاءات نموذج القالب عبر tRPC، والخلفية المطلوبة REST خارج القالب. | API service adapter موحد مبني على `fetch` خادمي ومجموعة feature modules؛ لا fetch داخل view. | lint/architecture tests ومنع imports عكسية. | مخطط |
| JWT/refresh دون localStorage | دليل المصدر ينص Bearer + refresh، والقالب auth مختلف. | BFF عبر Route Handlers وcookies `httpOnly; Secure; SameSite` قصيرة الأجل؛ لا token في localStorage أو props أو URL. | 401 refresh مرة واحدة، logout failure، CSRF/rate limits، اختبارات session expiry. | مخطط؛ يعتمد G-OAPI-001/002 |
| React Query | غير موجود كعقد REST للمريض. | React Query للـclient state/query cache الخاص بالمريض مع invalidation بعد mutations؛ لا cache مشترك لبيانات PII. | query keys typed، retry policy، error boundary، tests. | مخطط |
| Zod | لا يوجد boundary validation لردود API الخارجية. | schemas لطلبات النماذج والاستجابات الحرجة، مع telemetry عند drift. | contract fixtures من Sandbox/OpenAPI. | مخطط؛ يعتمد G-OAPI-002 |
| i18n وRTL/LTR | تطبيق المريض يفرض RTL في موضع واحد؛ القالب لا يحمل i18n routing. | `next-intl` ومسارات `/ar` و`/en` و`lang/dir` على `<html>`؛ العربية default. | visual/a11y tests في الاتجاهين، مفاتيح ترجمة فقط. | مخطط؛ يعالج G-I18N-001 |
| SSR/SSG/ISR للمحتوى العام | لا يوجد SSR في القالب؛ تحتوي البيانات الطبية/الحسابية على PII. | Server Components/ISR فقط للكيانات المنشورة viewer-independent؛ private routes client/BFF و`noindex,no-store`. | raw HTML/crawler tests وغياب PII من HTML/metadata/cache. | مخطط؛ يعالج G-SEO-001 |
| metadata/JSON-LD/sitemap/robots | يوجد controller SEO في المصدر لكن لا طبقة Next. | metadata API، canonical/hreflang، JSON-LD صادق لمرئي منشور فقط، sitemap/robots مستمدان من eligibility. | schema tests وsitemap privacy tests وcrawler checks. | مخطط |
| CSP/headers | الدليل يذكر Helmet؛ Next لا يحتاج Helmet داخل التطبيق. | headers/CSP/permissions/referrer في `next.config` أو middleware، مع nonce عند الحاجة. | security header tests وCSP report-only قبل enforcement. | مخطط |
| ملفات S3 | الدليل يثبت presigned/direct upload. | route/service يطلب presign ثم يرفع للـURL ويخزن key ضمن API وظيفي؛ لا base64 fallback ولا bytes في DB. | MIME/size/ownership/error/retry tests. | مخطط |
| SSE وLiveKit | endpoints موجودة في OpenAPI بعد مطابقة البادئة. | feature gate حتى تثبت tokens/room state/authorization في Sandbox؛ لا زر مكالمة شكلي. | reconnect/denied/end/unsupported channel E2E. | مخطط |
| feature flags | OpenAPI يضم feature flags. | القراءة من backend مع safe default **off** للميزات الحساسة؛ لا flag محلي يفتح مساراً بلا backend. | test public/private flag scope. | مخطط |
| ASO/روابط عميقة | لا ملفات app association في القالب. | `apple-app-site-association` و`assetlinks.json` وmapping page→deep link بعد تأكيد package IDs/domains. | platform association validation، لا redirect loops. | مخطط؛ يحتاج package IDs |
| الاختبارات | Vitest موجود في القالب؛ لا Playwright حالياً. | Vitest للوحدات/contracts + Playwright لمسارات auth/booking/payment/ownership + axe/perf. | CI gates وشهادات Sandbox. | مخطط |
| صفحات 404 واللغات الديناميكية | مسار اللغة الأعلى ديناميكي؛ حدود `not-found` العادية لم تعرض محتوى مرئياً لمسار غير مطابق في التحقق. | اعتماد `global-not-found` الرسمي في Next.js مع `experimental.globalNotFound` وHTML/CSS مستقلين. | تحقق HTTP 404 ولقطات `/ar/*` و`/en/*` ومسح عدم وجود PII. | منفذ في النواة |

## قرار أمن API

يستخدم المتصفح مسارات داخل نطاق Web App مثل `/api/patient/*`، ويتحدث Next Route Handler من الخادم إلى `https://api.nabd.plus/api/v1`. يمنع ذلك كشف bearer/refresh token في JavaScript ويبقي base URL وheaders وتبديل refresh داخل boundary خادمي. يظل التحقق النهائي من CORS وCSRF وسلوك refresh مع backend مطلوباً، ولا تنتقل أي جلسة هاتف إلى الويب أو العكس بلا عقد صريح.

## عناصر لا تحلها الواجهة وحدها

إكمال metadata الأمني وDTO schemas في OpenAPI، بيئة Sandbox وعقود حسابات الاختبار، بيانات مزودين منشورة ذات counts صحيحة، وpackage IDs/دومين الروابط العميقة هي مدخلات خلفية/تشغيلية. تسجل هذه البنود كفجوات ولا تستبدل بحلول واجهة أو بيانات ثابتة.
