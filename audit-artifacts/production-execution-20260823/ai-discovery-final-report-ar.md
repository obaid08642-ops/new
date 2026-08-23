# تقرير التسليم النهائي — جاهزية Nabd Plus لوكلاء الذكاء الاصطناعي

**التاريخ:** 23 أغسطس 2026  
**الفرع:** `agent/web-complete-v2-20260822`  
**الحالة:** منفّذ ومختبر محليًا، مع **GO مشروط** لطبقة discovery العامة و**NO-GO** لأي OAuth/MCP server أو DNS-AID غير منشور فعليًا.

## الملخص التنفيذي

تم تنفيذ الطبقة الآمنة العامة المطلوبة لاكتشاف Nabd Plus، دون اختراع عقود خاصة أو نشر بيانات اعتماد. يشمل ذلك API Catalog متوافقًا مع RFC 9727، وOpenAPI subset عام، وARD عام، وفهرس Agent Skills، وصفحتي `auth.md` و`public-content`، إضافة إلى Markdown negotiation للصفحات العامة. كما أضيف WebMCP read-only اختياري، لا يعمل إلا إذا وفّر المتصفح `navigator.modelContext`، ولا يعرّض بيانات المرضى ولا ينفذ mutations.

أثبت build الإنتاج وTypeScript والاختبارات الحالية سلامة التغيير. كما أُعيد تشغيل production server محليًا والتحقق من جميع well-known routes وHEAD وMarkdown negotiation. لم يتم نشر OAuth discovery أو MCP Server Card أو DNS-AID لأن Nabd Plus لا يملك في هذا المشروع موفر OAuth/IdP أو MCP server أو وصول DNS موثقًا، ونشر metadata وهمية لهذه الخدمات سيكون مخالفًا لمبدأ الصدق والأمان.

## ما تم تنفيذه

| المجال | التنفيذ | الدليل |
|---|---|---|
| API Catalog | `/.well-known/api-catalog` مع `application/linkset+json` وملحق `rel="api-catalog"` | `200` محليًا، وHEAD يعيد Link header |
| OpenAPI public subset | `/.well-known/openapi.json` بعقود عامة محدودة، دون توسيع إلى private patient API | `200` و`application/vnd.oai.openapi+json` |
| ARD | `/.well-known/ai-catalog.json` مع CORS للقراءة العامة | `200` و`application/json` |
| Agent Skills | `/.well-known/agent-skills/index.json` و`/agent-skills/public-content/skill.md` | `200` دون أسرار |
| Authentication guidance | `/auth.md` يشرح BFF وhttpOnly cookie ويمنع ادعاء OAuth غير الموجود | `200 text/markdown` |
| Markdown negotiation | `Accept: text/markdown` على الصفحات العامة يعيد Markdown، مع `Vary: Accept` و`X-Markdown-Tokens` | تحقق محلي على `/en` |
| WebMCP | أدوات عامة للانتقال وقراءة discovery metadata فقط، مع feature detection وcleanup | build وtests خضراء |
| Security headers | `X-Content-Type-Options: nosniff` موجودة على well-known responses | تحقق HTTP محلي |

## WebMCP وحدوده

الإضافة الجديدة تسجل أداتين عامتين فقط عند توفر WebMCP في المتصفح: `nabd_public_navigation` لمسارات عامة محددة، و`nabd_public_discovery` لقراءة `ai-catalog.json`. لا توجد أدوات تسجيل دخول أو حجز أو دفع أو قراءة profile أو orders أو prescriptions. لذلك لا يوجد تجاوز للجلسة ولا تسريب token ولا mutation من خلال WebMCP.

التسجيل يدعم `registerTool` عند توفره، مع fallback متوافق مع `provideContext` الموجود في مسار التجربة السابق. كل تسجيل يُنظف عند unmount، وطلبات القراءة تستخدم `AbortSignal` عند توفره.

## ما لم يُنفذ ولماذا

| المكوّن | نتيجة التحقق | الحكم |
|---|---|---|
| `/.well-known/oauth-authorization-server` | `404` على `https://nabd.plus` | محجوب حتى اعتماد OAuth Authorization Server حقيقي |
| `/.well-known/openid-configuration` | `404` على `https://nabd.plus` | محجوب حتى اختيار IdP/OIDC issuer حقيقي |
| `/.well-known/mcp/server-card.json` | `404` على `https://nabd.plus` | محجوب؛ لا يوجد MCP server منشور بعقد وأدوات حقيقية |
| DNS-AID تحت `_agents.nabd.plus` | لم يظهر record موثق في الفحص | محجوب حتى يضيف مالك DNS سجلات SVCB/HTTPS وDNSSEC |
| OAuth agent login | غير مفعّل | لا يجوز بناء authorization/token endpoints وهمية |
| MCP mutations | غير مفعّلة | لا يجوز تعريض cart/checkout/booking عبر agent قبل عقد وصلاحيات واختبارات ownership وidempotency |

هذه الحدود متسقة مع متطلبات OAuth discovery وMCP Server Card وDNS-AID: يلزم وجود issuer/endpoints حقيقية، أو serverInfo/endpoint/capabilities حقيقية، أو سجلات DNS موقعة وموجهة إلى endpoint فعلي. [1] [2] [3]

## الاختبارات والبوابات

| البوابة | النتيجة |
|---|---:|
| TypeScript/check | ناجحة |
| Vitest | `142 passed`, `14 skipped`; `290 passed`, `23 skipped` |
| Production build | ناجح على Next.js 16.3.1 |
| Local `next start -p 3100` | ناجح |
| Well-known routes | ناجحة محليًا |
| API Catalog HEAD Link | ناجح |
| Markdown negotiation | ناجح: `text/markdown`, `Vary: Accept`, `X-Markdown-Tokens` |
| Static token/storage scan | لا توجد كتابة token إلى localStorage/sessionStorage؛ النتائج المتبقية ضمن validators/tests الخاصة بالـBFF وليست browser storage |
| Git cleanliness | نظيف |
| Remote head verification | مطابق حرفيًا |

ملاحظة تشغيلية: المحاولة الأولى لـsmoke استخدمت `pnpm start -- -p 3100`، ففسّر Next `-p` كمسار مشروع وفشل قبل التشغيل. صُححت إلى `pnpm exec next start -p 3100` ونجحت كل الفحوصات. هذا فشل أمر تشغيل، وليس فشلًا في التطبيق.

## Commits المدفوعة

| Commit | الوصف | remote verification |
|---|---|---|
| `0b20fee` | نشر public agent metadata وMarkdown discovery | سابقًا على نفس الفرع |
| `73581a6` | توثيق local production-build smoke | `ls-remote` مطابق |
| `3678566` | إضافة WebMCP public read-only tools | `ls-remote` مطابق |

آخر تحقق:

```text
LOCAL_HEAD=36785666da4417ac598a641606808d2c7fc66b9a
REMOTE_HEAD=36785666da4417ac598a641606808d2c7fc66b9a
```

الفرع المدفوع: [agent/web-complete-v2-20260822](https://github.com/obaid08642-ops/new/tree/agent/web-complete-v2-20260822)

## القرار النهائي

طبقة **public AI discovery** جاهزة من جهة الكود والاختبار المحلي، ويمكن مراجعتها ونشرها ضمن الإصدار الحالي. أما إعلان **Agent-ready كامل** فيبقى مشروطًا بما يلي: اعتماد OAuth/IdP حقيقي إن كان تسجيل دخول الوكيل مطلوبًا، نشر MCP server فعلي بعقد وأدوات read-only مع اختبارات ownership وrate limits، وإضافة DNS-AID من مالك DNS مع DNSSEC. حتى حدوث ذلك، الحالة الصحيحة هي **GO مشروط للـpublic discovery / NO-GO لـOAuth وMCP server وDNS-AID**.

لا توجد في هذه الدفعة بيانات mock أو نجاحات مصطنعة أو أسرار إنتاجية. لم يتم توسيع allowlist إلى patient data، ولم يتم فتح guest/social login أو mutation agent tools بلا عقد حي.

## المراجع

[1]: https://isitagentready.com/.well-known/agent-skills/oauth-discovery/SKILL.md "OAuth/OIDC Discovery skill"

[2]: https://isitagentready.com/.well-known/agent-skills/mcp-server-card/SKILL.md "MCP Server Card skill"

[3]: https://isitagentready.com/.well-known/agent-skills/dns-aid/SKILL.md "DNS-AID skill"

[4]: https://isitagentready.com/.well-known/agent-skills/webmcp/SKILL.md "WebMCP skill"
