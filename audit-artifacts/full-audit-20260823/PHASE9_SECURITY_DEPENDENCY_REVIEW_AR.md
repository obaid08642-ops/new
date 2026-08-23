# Phase 9 — Security, privacy, integrity and dependency review

## النتيجة الحالية

فحص production source لم يجد `localStorage` أو `sessionStorage` أو `document.cookie` لحفظ access/refresh/exchange tokens، ولم يجد direct browser calls إلى `api.nabd.plus` في السطوح المراجعة. طبقة BFF هي الحد الفاصل، وallowlist العامة مقيّدة بالقراءة؛ mutations لها routes صريحة مع cookies وIdempotency حيث ثبت العقد.

## Dependency audit

نتيجة `pnpm audit` الكاملة: **57 advisories**، منها 27 high و2 critical حسب سجل الأداة. معظمها في `pnpm`, `vite`, `vitest`, `rollup`, `tar`, `postcss`, `picomatch` ضمن dev/build dependency tree. نتيجة `pnpm audit --prod --audit-level high` لا تحتوي high/critical، لكنها أظهرت **low advisory واحداً**.

| النطاق | الوضع | قرار |
|---|---|---|
| Runtime production dependencies | لا high/critical في audit prod؛ low واحد يحتاج متابعة | لا GO نهائي قبل تحديد advisory low ومعالجته أو قبول موثق |
| Dev/build dependencies | high/critical موجودة في أدوات package/build/test | يجب تحديث/تثبيت الإصدارات الآمنة داخل CI/build image وعدم تشغيل dev servers علناً |
| pnpm supply chain | advisories متعددة | استخدم lockfile immutable، registry موثوق، scripts policy، ونسخة package manager محدثة |
| tar/postcss/vite/rollup/picomatch | advisories transitive/dev | تحديث آمن ثم full test/build، وعدم تعريض Vite/Vitest UI للإنترنت |

## متطلبات الإغلاق

يلزم استخراج advisory production low بالمعرّف، تحديث dev/build dependencies إلى patched versions المتوافقة، إعادة إنشاء lockfile، وتشغيل full tests/build وcontainer smoke test. يجب إبقاء `pnpm audit` مسجلاً مع فصل runtime عن toolchain، وعدم اعتبار نجاح type-check معالجةً لمخاطر dependency.

يلزم أيضاً اختبار CSP/security headers على production response، session fixation/logout/refresh rotation، CSRF posture لكل mutation، rate limits، payload size limits، log redaction، replay/idempotency، owner/stranger/unauth، وعدم تسريب provider/private IDs أو signed URLs.

## القرار

**Source security boundary: PASS مبدئي.**  
**Dependency/security production closure: OPEN** بسبب low runtime advisory وhigh/critical toolchain advisories غير المعالجة بعد، وبسبب الحاجة لاختبارات Sandbox والـcontainer runtime.


## تحديد advisory الإنتاج

بعد إعادة التحليل، advisory الإنتاج الوحيد هو:

| Package | Severity | Advisory | Affected | Patched |
|---|---|---|---|---|
| `@babel/core` | low | Arbitrary File Read via `sourceMappingURL` comment | `<=7.29.0` | `>=7.29.6` |

Reference: [GHSA-4x5r-pxfx-6jf8](https://github.com/advisories/GHSA-4x5r-pxfx-6jf8). يجب تحديد المسار الذي يدخل منه إلى runtime، ثم ترقية dependency إلى نسخة patched متوافقة أو توثيق قبول المخاطر من مالك الإنتاج. لا يكفي اعتبارها dev-only قبل إثبات شجرة production الفعلية.
