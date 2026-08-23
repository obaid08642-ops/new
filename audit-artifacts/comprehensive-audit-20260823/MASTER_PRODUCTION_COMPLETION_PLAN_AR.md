# خطة الإكمال الكبرى للإطلاق — Nabd Plus Patient Web وMobile

## الهدف النهائي

تحويل Web وMobile إلى تجربة مريض كاملة وآمنة وقابلة للإطلاق، مع عدم نسخ عيوب Mobile. كل capability تُقيّم من منظور العقد الحي، سلامة المريض، الخصوصية، رحلة الاستخدام، والأداء. إذا كان Mobile ناقصاً أو يملك fallback غير آمن، يُصلح في Web ويُسجل الفرق كـ`Web completion beyond Mobile`، وتُفتح إصلاحات Mobile عندما تكون ضمن نطاق المشروع.

## قاعدة إغلاق كل Phase

لا تنتقل المرحلة إلى `Done` إلا بعد مراجعة مستقلة مقابل المصفوفة، إثبات method/path الحي، تنفيذ أو إصلاح، اختبارات targeted وfull، owner/stranger/unauth، replay للعمليات القابلة للتكرار، فحص لا mock ولا placeholder في runtime، مراجعة i18n/RTL/accessibility، ثم commit pushed و`git ls-remote` مطابق. أي عائق خارجي يُسجل بمالك وسبب ودليل ولا يُستبدل ببيانات مصطنعة.

## Phase 1 — Governance وSingle Source of Truth

تثبيت commits Mobile/Web، نسخة OpenAPI الحية، domains، 72 journey، و1,638 action/navigation markers. إزالة التكرار بين alias وscreen، وإنشاء capability IDs ثابتة. ربط كل شاشة بالمسؤول: Web، Mobile، Backend، Infrastructure، Medical/Product.

**معيار القبول:** لا عنصر بلا حالة، ولا `Done` بلا evidence، ومصفوفة قابلة لإعادة التوليد.

## Phase 2 — إصلاح عيوب Mobile والبنية المشتركة

إزالة أو عزل guest fallback الذي ينشئ `guest_user/guest_token` محليين. منع أي Web session مزيف أو قراءة خاصة offline. استكمال HttpClient/retry/timeout، WebSocket readiness، analytics consent، remote feature flags، offline cache/conflict policy، crash recovery، والتنقل من alias routes إلى الوجهة الحقيقية. معالجة stubs الخاصة بالـanalytics والـIP placeholder، وتحديد ما هو planned في Mobile وليس feature جاهزاً.

**معيار القبول:** unauthenticated offline shell بلا token أو صلاحية، session states واضحة، لا false success، واختبارات recovery والـexpiry.

## Phase 3 — Auth والهوية والخصوصية

إغلاق OTP request/verify/exchange، TTL وsingle-use وrate-limit، login/logout، refresh/rotation، expired/locked، return-to-route، account deletion، reset، permissions، locale، وdevice/session management. Web يستخدم httpOnly Secure SameSite cookies فقط، وBFF server boundary؛ Mobile يستخدم Secure Storage ولا يضع tokens في AsyncStorage. تُضاف re-authentication للبيانات الطبية الحساسة، consent، audit redaction، وCSRF strategy.

**معيار القبول:** لا token في URL/body/browser storage/logs، 401 لغير المصادق، cookies صحيحة، وعدم وجود guest token اصطناعي.

## Phase 4 — Consultation journey

رحلة كاملة: specialty → search → doctor detail → availability → نوع الموعد online/clinic/hospital/home → patient/family member → insurance/cash/payment method → slot lock → booking → confirmation → reminder → call-token/room أو location → reschedule/cancel/refund. معالجة duplicate click، expired slot، back/refresh، payment failure، unavailable doctor، timezone، Arabic/RTL، وإشعارات التأكيد.

**معيار القبول:** Sandbox owner 200، stranger 404، unauth 401، idempotent replay بلا duplicate، call-token TTL، cleanup بإلغاء أي fixture.

## Phase 5 — Pharmacy وOrders

catalog/search/filter/detail، wishlist، cart lines، quantity/stock، prescription upload/OCR، substitutions، address، delivery slot، cash/insurance/online payment، server-authoritative totals، checkout، confirmation، fulfillment، tracking، reorder، cancellation، return، refund، invoice. لا client totals أو optimistic financial success.

**معيار القبول:** schema وfile limits، payment failure/retry، idempotency، owner isolation، refund state، وسلامة بيانات الوصفة.

## Phase 6 — Diagnostics/Home-care/Nursing

Labs وRadiology list/detail/filters، `_id` و`short_code` المثبتان، service preparation، patient/address/consent، insurance/cash، booking، home visit، nursing provider/visit، tracking، report/result، upload، reschedule/cancel. Home-care list تستخدم `GET /unified-bookings/mine`، ولا تُستخدم `/home-care/bookings/my`.

**معيار القبول:** لا خلط بين أنواع unified bookings، حالات empty/404 صادقة، owner isolation، ونهاية رحلة واضحة.

## Phase 7 — Health/Profile/Family/Insurance/Reports/Chat/Notifications

Profile edit، addresses، sessions/privacy/security، family permissions/member/calendar/chat، insurance policy/benefits/claims/approvals/copay، vitals/sleep/trends/chronic meds/emergency contacts، reports/download، notifications/read/preferences، chat/reconnect/ack، support ticket lifecycle. يُمنع عرض score أو clinical summary بلا مصدر authoritative.

**معيار القبول:** 6 locales، consent، re-auth، 404 للغريب، retry/conflict، وتنقيح PII من analytics/logs.

## Phase 8 — Advanced features

Community، Loyalty، Wallet، AI triage، Voice، Emergency/SOS، Maternity، Nutrition، Wearables، Offers، Reviews. تُفتح فقط إذا كان endpoint منشوراً، DTO موثقاً، safety/privacy policy معتمدة، rate limits وmoderation وaudit logs موجودة. 404 أو غياب العقد يعني Blocked، وليس route تخمينياً.

**معيار القبول:** feature flags server-side، kill switch، consent، abuse protection، وmedical/financial review.

## Phase 9 — Design System وUX وMotion

توحيد tokens للألوان والخط والمسافات والـradii والظلال، SVG/vector icons، buttons states، form validation، focus/keyboard، touch targets، RTL/LTR، responsive، skeleton/empty/error/retry، notice/feedback داخل الصفحة. حركة هادئة ذات معنى باستخدام opacity/transform، مع `prefers-reduced-motion`، دون Emoji أو صور placeholder أو نصوص hardcoded.

**معيار القبول:** visual regression، contrast AA، keyboard/screen reader، reduced-motion، وكل زر يؤدي فعلاً إلى destination أو يعرض سبب عدم الإتاحة.

## Phase 10 — Security وData Hardening

تدقيق BFF allowlist، cookies، CSRF، CORS، CSP على staging ثم enforce، HSTS، COOP/CORP، permissions/referrer policies، SSR boundaries، input/schema validation، rate limits، upload scanning، secret management، redacted logs، dependency advisories، ownership و404، retention/deletion، backup وaudit. حذف mock/fixture من runtime، وفصل test mocks صراحةً.

**معيار القبول:** no token leak، no PII leak، security scan، dependency policy، owner/stranger/unauth لكل resource، وincident/rollback runbook.

## Phase 11 — Performance وDocker وCI/CD

تشغيل Docker build/run الفعلي، التحقق من `COPY patches ./patches` وstandalone `@swc/helpers`، non-root، healthcheck، graceful shutdown، secrets خارج image، reproducible lockfile. قياس LCP/INP/CLS/TTFB، API latency، JS/CSS/image budgets، caching، prefetch، lazy loading، slow 3G، retries وoffline. CI يشمل lint/type/test/build/security/container scan.

**معيار القبول:** staging Lighthouse/RUM ضمن budgets، container smoke ناجح، health/readiness صحيحان، rollback مجرّب، وadmin-web healthcheck غير مضلل.

## Phase 12 — SEO/GEO/AEO/ASO والفهرسة

كل صفحة عامة قابلة للفهرسة يجب أن تملك 200، canonical صحيح، لا `noindex` غير مقصود، عنواناً ووصفاً محليين، نصاً مرئياً حقيقياً، روابط داخلية للفئة والمدينة، hreflang/RTL، OpenGraph، وstructured data مطابقاً للواجهة فقط. صفحات المريض والـprivate resources تبقى noindex وblocked من robots ولا تدخل sitemap.

قالب الإعلان العام يتطلب صورة وسعراً وموقعاً وتاريخ تحديث وحقائق ظاهرة، مع `Product/Offer` حيث ينطبق، و`ItemList` للقوائم و`BreadcrumbList` للتنقل. يُفحص sitemap index وlastmod والـ404/410 والـredirects وcanonical conflicts.

**معيار القبول:** crawl staging/production، Search Console validation، sitemap لا يحتوي private/404، ولا structured data يدعي حقائق غير ظاهرة.

## Phase 13 — Local guides وAI discovery

بناء أدلة محلية أصلية من بيانات منشورة فعلية: اتجاهات أسعار مع منهج وتاريخ، أدوية حسب الأنواع، استشارات online/home/clinic/hospital، كل التخصصات، تمريض منزلي، Labs/Radiology، متابعة الحمل، وتذكير الأدوية. لا تُستخدم أرقام أو عروض غير موثقة. تضاف citations للمصادر وتحديثات وlastmod وcontent ownership.

تُراقب Google Search/AI reports وBing AI Performance عندما تتوفر الحسابات، مع grounding queries وcitation accuracy وقياس ظهور الصفحات واستبعاداتها. تُحسن الصفحات التي تفشل دون حشو أو تلاعب.

**معيار القبول:** data provenance، freshness SLA، citation audit، ومراجعة بشرية للمحتوى الطبي.

## Phase 14 — IndexNow وcontent lifecycle

تفعيل IndexNow للإعلانات العامة الجديدة والمعدلة والمحذوفة، مع deduplication وretry وlogging. عند الحذف: 410 إذا كان نهائياً، 404 إذا لم يوجد، redirect فقط عند البديل الحقيقي. تحديث sitemap lifecycle وlastmod، purge/cache invalidation، وربط الإعلان بالفئة والمدينة.

**معيار القبول:** اختبار publish/update/delete كامل، عدم تسريب private URLs، وsitemap/IndexNow يتطابقان مع الحالة الحالية.

## Phase 15 — Full journey verification وRelease

اختبار كل رحلة من 72 في Web وMobile: success، empty، validation، timeout، retry، duplicate، unauthorized، stranger، cancel، reschedule، refund، cash، insurance، online payment، locale، RTL، refresh/back، low bandwidth، reduced motion. تشغيل Sandbox الرسمي فقط، ثم staging ببيانات اختبار معتمدة، وفحص Docker والصلاحيات والـmonitoring.

**GO النهائي لا يصدر إلا إذا:** أُغلقت P0، أثبتت mutations حياً، لا high/critical runtime issues، Docker image ناجح، Core Web Vitals ضمن الميزانية، sitemap/structured data سليمان، جميع private pages غير مفهرسة، وكل gap متبقٍ موثق بمالك وسبب وقرار. وإلا يبقى الحكم NO-GO أو GO محدوداً لنطاق read-only معلن.

## ترتيب التنفيذ

يبدأ التنفيذ بـP0: Auth، consultation، pharmacy/orders، diagnostics، home-care/nursing، ثم P1: profile/family/insurance/health/reports/chat/notifications، ثم P2: advanced. تُنفذ تحسينات UX الآمنة بالتوازي فقط بعد تثبيت العقد، بينما تُؤجل features بلا contract أو fixture إلى نهاية الخطة مع حالة Blocked واضحة.


## ملحق مراجعة الاكتمال — بنود لا يجوز إسقاطها

### أولاً: تدقيق منطق المنتج وسلامة Mobile

يجب مراجعة كل Mobile screen على مستويين: هل تنفذ المطلوب فعلاً، وهل المطلوب نفسه منطقي وآمن؟ تُسجل الشاشات alias أو redirect ولا تُحسب مرتين. يُمنع نسخ `guest_token`، optimistic success، clinical score غير موثق، أو fallback يخلق هوية محلية. يجب فحص حالات أول فتح، guest، authenticated، locked، expired، offline، permission denied، account deletion، device change، deep link، refresh، back، duplicate tap، timeout، retry، وcrash recovery في التطبيقين.

### ثانياً: سجل كامل لكل عنصر تفاعلي

لكل button، icon، card، tab، swipe، form، modal، bottom sheet، link، notification، upload، map action، phone/video action، وexternal URL يجب تسجيل: label المترجم، target، preconditions، API method/path، payload schema، success state، validation، error state، retry، loading، disabled state، accessibility label/hint، analytics event بعد consent، وحالة الميزة. أي عنصر بلا target حقيقي أو بلا عقد يُوسم `Missing/Blocked` ولا يظهر كزر نجاح وهمي.

### ثالثاً: رحلة المريض لكل خدمة ولكل وسيلة دفع

يجب اختبار كل domain من discovery إلى detail، اختيار patient أو family member، العنوان والموقع، consent، الموعد أو المنتج، availability/stock، السعر والضريبة/الخصم، cash أو insurance أو online payment أو wallet، التأكيد، الإشعار، التتبع، delivery/visit/room، result/report، ثم cancel/reschedule/return/refund. تُعاد الرحلة مع invalid data، resource unavailable، payment failure، insurance rejection، expired slot، duplicate click، refresh/back، timeout، reconnect، locale، RTL، keyboard، reduced motion، وslow network.

### رابعاً: Healthcare وclinical safety

أي AI triage أو symptom guidance أو mood/crisis أو pregnancy/nutrition أو medication reminder يجب أن يملك حدوداً واضحة بين education وclinical advice، escalation للطوارئ، disclaimer مناسب، human/provider handoff، سجل مصدر وتاريخ، consent، retention/deletion، وعدم تقديم تشخيص أو جرعة أو نتيجة غير واردة من backend. يجب مراجعة النصوص طبياً قبل النشر.

### خامساً: الدفع والبيانات المالية

لا تُخزن بيانات البطاقة أو CVV، ولا تُطبع في logs، ولا يُوثق نجاح الدفع من client. تُختبر currency، rounding، tax، discount، insurance copay، cash-on-delivery، wallet، payment intent، webhook reconciliation، timeout، retry، duplicate charge، refund/partial refund، invoice، وorder state machine. أي test يستخدم Sandbox فقط ويُلغي أو يعكس موارده.

### سادساً: الخصوصية والامتثال التشغيلي

يجب تحديد data inventory وPII/PHI classification، الغرض والاحتفاظ والحذف والتصدير، consent history، access logs، session/device revocation، support access، backup encryption، key rotation، breach response، DPIA أو مراجعة قانونية عند اللزوم، وحدود الأطراف الخارجية. لا تُفهرس أو تُرسل للـanalytics أي صفحة أو query أو معرف مريض خاص.

### سابعاً: API contract وBFF governance

قبل كل slice يجب تنفيذ probe بالـmethod/path مع body آمن؛ `401` route محمي، `400` route وصل لكن body غير صالح، و`404` path/resource غير مثبت. يجب تحديث OpenAPI/DTO/errors، parser allowlist، timeout/retry/circuit breaker، idempotency key، correlation ID، CSRF/CORS، owner/stranger/unauth، pagination/filter/sort، schema drift detection، contract tests، وcompatibility مع Mobile. لا يعتمد التنفيذ على OpenAPI قديم إذا خالفه الإنتاج الحي.

### ثامناً: Web security وMobile security

تُفحص XSS/CSRF/SSRF/open redirect/clickjacking/CORS/CSP، cookies وSameSite/Secure/httpOnly، token leakage، URL/referrer/history، upload MIME/size/virus scan، SQL/NoSQL injection عبر backend، rate limiting، brute force، replay، session fixation، OAuth/deep-link hijacking، certificate/network assumptions في Mobile، secure storage، jailbreak/root limits، screenshots/clipboard للبيانات الحساسة، وredacted crash logs.

### تاسعاً: التصميم والإتاحة

يجب أن تكون كل الأيقونات SVG/vector من icon set موحد، بلا Emoji أو نصوص hardcoded أو placeholders. تُراجع design tokens، الألوان، typography، spacing، states، contrast AA، focus ring، keyboard، screen reader، touch target، RTL/LTR، responsive breakpoints، safe areas، print/share، skeleton، empty/error/success/notice، animation timing، reduced motion، وloading داخل الصفحة. لا يُستخدم glass أو motion لإخفاء نقص وظيفي أو بطء حقيقي.

### عاشراً: الأداء والموثوقية

تُحدد budgets لكل route وdevice، LCP/INP/CLS/TTFB، JS/CSS/images/fonts، API p50/p95/p99، cache hit، memory، battery، startup، bundle size، request waterfalls، retries، offline queue، concurrency، rate limits، WebSocket reconnect، graceful degradation، health/readiness، autoscaling، alerting، tracing، synthetic checks، وerror budgets. يجب تشغيل Docker build/run الحقيقي، container scan، non-root، patches، standalone helpers، healthcheck، graceful shutdown، rollback، وdisaster recovery drill.

### حادي عشر: الفهرسة والاكتشاف

كل public page جديدة يجب أن تحصل تلقائياً على metadata/canonical/hreflang، status 200 عند النشر، نص ظاهر حقيقي، internal links للفئة والمدينة، sitemap inclusion، structured data مطابق للواجهة، OpenGraph، وصورة قابلة للمشاركة. صفحات patient/private/account/checkout لا تُفهرس ولا تدخل sitemap. يجب تدقيق robots وsitemap وlastmod و404/410 وredirects وcanonical conflicts، وتفعيل IndexNow للـcreate/update/delete مع deduplication وretry.

قالب الإعلان العام يجب أن يثبت الصورة والسعر والموقع وتاريخ التحديث والحقائق النصية، ويستخدم `Product/Offer` فقط حين ينطبق، و`ItemList` و`BreadcrumbList` للقوائم. الأدلة المحلية يجب أن تكون أصلية ومسنودة ببيانات فعلية ومنهج وتاريخ ومصدر. تُراجع Google Search Console وتقارير AI وBing AI Performance وgrounding/citation accuracy فقط إن كانت الحسابات متاحة، بلا ادعاء قياسات غير موجودة.

### ثاني عشر: الاختبار النهائي الكامل

تُنفذ مصفوفة اختبارات Web وMobile على الأجهزة والمتصفحات المدعومة، 6 locales، RTL/LTR، anonymous/authenticated/family، cash/insurance/online/wallet، public/private، 2G/3G/4G، offline/online، fresh/cache، reduced motion، keyboard/screen reader، viewport/rotation، accessibility، visual regression، security، contract، unit/integration/E2E، Sandbox mutation، staging Docker، smoke، load، resilience، rollback، وmonitoring.

### بوابة الإصدار غير القابلة للتفاوض

لا يوجد `100% ready` إذا بقيت شاشة أو زر أو رحلة بلا حالة قرار، أو بقيت mutation بلا owner/stranger/replay proof، أو بقيت بيانات وهمية/placeholder في runtime، أو بقي Docker/staging/CWV غير مختبر، أو بقيت private URLs قابلة للفهرسة، أو بقيت ثغرة runtime high/critical، أو لم تُراجع النصوص الطبية، أو لم تُختبر cash/insurance/online/wallet. عندها يكون الحكم NO-GO مع قائمة blockers ومالك وشرط إغلاق محدد.
