# الخطة الكبرى لإغلاق الفجوات والوصول إلى الإنتاج

## الحكم والقاعدة الحاكمة

الهدف هو منتج Patient Web مكتمل وظيفياً وآمن وقابل للاستخدام، وليس نسخ كل ملف Mobile حرفياً. عند اكتشاف سلوك ناقص أو غير آمن في Mobile، يُسجل كـ`Mobile defect` وتُبنى في Web تجربة صحيحة أفضل، مع توثيق سبب الاختلاف. لا يُعلن أي عنصر `Done` إلا بعد contract حي، تنفيذ، مراجعة، اختبار، commit، push و`git ls-remote` مطابق.

## Phase 0 — مصادر الحقيقة والحوكمة

يُثبت commit Mobile وcommit Web ونسخة OpenAPI وبيئة الإنتاج وSandbox. تُحفظ كل probes والـlogs ولا تُحفظ tokens أو PII. يُمنع إنشاء route غير موجود في backend، وتُحجز الميزات بلا contract في حالة `Blocked`.

**بوابة القبول:** reproducible inventory، working tree نظيف، remote head مطابق، وقرار واضح لكل شاشة أو action: Done، Partial، Missing، Blocked، أو Untestable.

## Phase 1 — Inventory وCapability Mapping

يُحوّل كل ملف Mobile إلى capability حقيقية بعد إزالة alias/stub duplication. لكل capability تُسجل الشاشة، action، target، destination، API refs، owner، state model، validation، loading/error/empty، وبديل offline إن كان مطلوباً. تُربط capabilities بمصفوفة Web page/BFF/contract/test.

**بوابة القبول:** تغطية 100% من 250 ملف Mobile على مستوى mapping، و100% من 1,638 action/navigation markers إما مربوط أو مصنف كـduplicate/alias/non-feature.

## Phase 2 — Auth وOnboarding

يُغلق OTP request/verify/exchange، session rotation، logout، expired OTP، rate-limit، register، reset، guest بدون token وهمي، language/RTL، permissions، return-to-intended-route، وlocked/expired states. لا يُسمح بـ`guest_user` أو `guest_token` محليين في Web.

**القبول:** owner/session flow حي، unauth 401، expired/rate-limit، no token في URL/body/browser storage، cookies httpOnly، SSR boundary، وE2E من login إلى أول خدمة.

## Phase 3 — Consultation Journey

يُنفذ التدفق الكامل: specialty → doctor search → doctor detail → slots → appointment type → slot lock → booking مع Idempotency-Key → payment intent إن لزم → confirmation → call-token → room → cancel/reschedule. تُضاف معالجة race conditions، expired lock، payment failure، retry، duplicate click وback navigation.

**القبول:** Sandbox fixture معلومة وآمنة، owner 200، stranger 404، unauth 401، replay لا ينشئ duplicate، call-token TTL، وإلغاء كل fixture.

## Phase 4 — Diagnostics وHome-care وNursing

يُغلق Labs/Radiology list/detail، patient data، address، home visit، preparation، booking/cart contract، insurance، upload، result/report، tracking، nursing visit، GPS/consent، cancel/reschedule. Radiology يستخدم `_id` الأساسي و`short_code` فقط كمسار مثبت. Home-care يستخدم `unified-bookings/mine` ولا يخلط أنواع unified resources.

**القبول:** كل transition له contract، no fake result/status، 404 للموارد غير المالكة، retry وempty list، وfixture حي قابل للتنظيف.

## Phase 5 — Pharmacy وOrders وReturns

يُغلق catalog/search/filter/detail، wishlist، cart lines، quantity validation، server-authoritative totals، prescription upload/OCR، checkout، payment، order confirmation، pharmacy fulfillment، tracking، reorder، cancel، return وrefund. لا يُستخدم client total أو نجاح متفائل في عملية مالية حرجة.

**القبول:** replay بنفس Idempotency-Key آمن، totals من server، رفض payload غير صالح، owner/stranger/unauth، payment بدون بطاقة حقيقية، وتنظيف Sandbox.

## Phase 6 — Profile وFamily وInsurance

يُنفذ profile read/edit، addresses، sessions/security/privacy، family members/permissions/calendar/chat، insurance companies/policy/benefits/claims/OCR. كل resource مملوك يطبق 404 للغريب بدلاً من كشف وجوده.

**القبول:** schema validation، upload limits، audit trail، consent، 404 isolation، error/retry، و6 locales.

## Phase 7 — Health وReports وMental Health وNutrition

يُغلق vitals/history/trends/sleep/chronic meds/emergency contacts، reports/passport/timeline/download، mood/breathing/crisis، meals/plans، وwearable sync. لا تُعرض scores أو clinical summaries مصطنعة، ولا يُستبدل backend history بحساب محلي غير موثق.

**القبول:** clinical disclaimer حيث يلزم، authoritative timestamps، privacy re-auth للمعلومات الحساسة، offline conflict policy، وowner isolation.

## Phase 8 — Chat وNotifications وSupport وAdvanced

يُغلق threads/messages/read state/reconnect، notifications/read-all/preferences، support chat/tickets، ثم Community/Loyalty/Wallet/AI/Voice/Emergency/Maternity/Offers/Reviews. الميزات AI/medical/financial تحتاج safety review وسياسات retention وrate limits قبل أي feature flag.

**القبول:** realtime contract أو حالة blocked صريحة، no PII analytics بلا consent، moderation، abuse controls، audit logs، وfeature flag server-side.

## Phase 9 — Design System وUX وMotion

يُوحّد نظام الألوان والـtypography والمسافات والـradii والظلال، SVG icons وvector buttons، focus/keyboard، RTL/LTR، form validation، empty/error/loading/skeleton، responsive layout، وnotice/feedback states. الحركة تكون قصيرة وذات معنى، transform/opacity فقط حيث أمكن، `prefers-reduced-motion`، ولا Emoji أو زخارف placeholder.

**القبول:** visual regression لكل route، contrast AA، keyboard traversal، screen reader labels، touch target، reduced-motion snapshots، وقياسات mobile/desktop.

## Phase 10 — Security وPerformance وDiscovery

يُحسم CSP على staging، HSTS، COOP/CORP، secure cookies، CSRF strategy، BFF allowlist، SSR token boundary، dependency advisories، Docker non-root، secrets injection، rate limits، logging redaction، backup/rollback. تُقاس LCP/INP/CLS/TTFB، API latency، JS/CSS budget، images، caching وslow 3G.

يُستكمل SEO/GEO/AEO/ASO: metadata محلية، canonical/hreflang، robots private routes، sitemap public content فقط، JSON-LD، OpenGraph، `llms.txt`، نصوص semantic قابلة للاكتشاف، وstructured answers دون كشف patient data.

**القبول:** Lighthouse/RUM على staging، security scan، Docker build/run، CSP report-only ثم enforce، dependency policy، no private index، وrollback smoke.

## Phase 11 — Full Journey Verification وRelease

تُشغّل اختبارات E2E لكل رحلة: authentication، consultations، diagnostics، home-care، nursing، pharmacy، orders، payments، profile، family، insurance، health، reports، chat، notifications. تُكرر كل رحلة في success، empty، validation error، network timeout، retry، unauthorized، stranger، duplicate click، back/refresh، locale وreduced-motion.

**القبول النهائي:** كل capability إما Done بالدليل أو Blocked بمالك وسبب وعقد مطلوب؛ لا high/critical runtime vulnerabilities؛ Docker image صحي؛ Sandbox mutations تنظف مواردها؛ staging metrics ضمن budget؛ browser/mobile responsive؛ وrollback موثق.

## تعريف Done الموحد

لا يكفي أن يمر test محلي. يجب أن تتوفر: شاشة ومسار صحيحان، contract حي method/path، parser/DTO محدود، server-only auth، ownership، idempotency عند الحاجة، حالات UI كاملة، i18n، accessibility، performance evidence، security evidence، targeted tests، full gate، commit pushed، و`git ls-remote` مطابق.

## ترتيب التنفيذ والاعتماديات

الأولوية P0 هي Auth، Consultation booking/payment، Pharmacy/Orders، Diagnostics booking، Home-care/Nursing، Wallet/Payments وEmergency. الأولوية P1 هي Profile/Family/Insurance/Health/Reports/Chat/Notifications. الأولوية P2 هي AI/Community/Loyalty/Voice/Wearables/Maternity واللمسات المتقدمة. لا يبدأ أي slice قبل إغلاق العقد، ولا تُستخدم fixtures الحقيقية خارج الحسابات المعتمدة.

## Release decision

يبقى الحكم `NO-GO` ما لم تُغلق P0، وتُثبت Sandbox mutations، ويُبنى Docker image فعلياً، وتُقاس الأداء والأمان على staging، وتُراجع المصفوفة كاملة. يمكن إصدار GO مشروط لنطاق محدود فقط إذا كان public/read-only ومفصولاً بوضوح عن المسارات غير المكتملة.
