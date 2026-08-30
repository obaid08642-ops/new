# سجل تغييرات فرع chore/prod-hardening — Nabd Plus

تاريخ بدء الفرع: 2026-08-30
قاعدة الفرع: main @ 75e0a34d
رابط الفرع: https://github.com/obaid08642-ops/new/tree/chore/prod-hardening
رابط الـPR: https://github.com/obaid08642-ops/new/pull/new/chore/prod-hardening

## الـcommits

### a42519ba — ci: cover provider and admin applications
- إضافة job مستقل لـ Provider App في CI (npm ci --legacy-peer-deps + typecheck + tests).
- إضافة job مستقل لـ Admin Dashboard في CI (npm ci + typecheck + production build).
- إصلاح نص رسالة الحوكمة في شاشة المحادثات الصيدلانية (Provider) لتطابق عقد الاختبار.
- التحقق: Provider typecheck PASS، 12 اختباراً ناجحاً، Admin build PASS (48 صفحة).

### db826159 — docs: define verifiable implementation plan
- إضافة IMPLEMENTATION_PLAN.md: خطة تنفيذ مرحلية من 10 بنود مع معايير قبول لكل بند.

### 396ceca5 — test(pharmacy): align legacy dispatch and quote audit rules
- توحيد DispatchService القديم إلى ladder القياسي 3→5→8 كم بدلاً من 3→7→10→15.
- إضافة dispatch.service.spec.ts للاختبار على ladder.
- إضافة اختبار partial availability (عنصر متاح + عنصر غير متاح في عرض واحد).
- إضافة اختبار price override audit (سجل تدقيق لتعديل السعر على مستوى العرض).
- التحقق: 3 suites / 12 اختباراً ناجحة، typecheck PASS، nest build PASS.

### c1547384 — feat(patient): allow public-first app launch
- فتح Patient Mobile على التصفح العام بدل إجبار المستخدم على شاشة Welcome/Login عند الإقلاع.
- الحفاظ على جلسات المستخدم المسجل والضيف؛ حدود الجلسة تُفرض عند العمليات الحساسة.
- التحقق: typecheck PASS، 37 suites / 84 اختباراً ناجحاً.


### (جديد) — test(backend): chunked jest runner to fix full-suite OOM
- إضافة scripts/run-tests-chunked.mjs: تشغيل 106 suites في 5 دفعات منفصلة بذاكرة نظيفة لكل دفعة.
- تغيير npm test ليستخدم المشغّل المجزّأ بدل تشغيل Jest مباشرة (كان يفشل بـ JavaScript heap OOM).
- الحفاظ على test:boot وtest:enterprise كما هما.
- التحقق: 106/106 suites — 561/561 tests — PASS على 5/5 chunks (113 ثانية).


### (جديد) — docs: patient mobile screen/API matrix (243 routes)
- إضافة docs/patient-mobile-screen-matrix.md مولّداً آلياً من الكود.
- 243 ملف route: 200 شاشة حقيقية + 43 redirect alias تراثي.
- 214 مسار API فريد في Mobile؛ 204 منها لها controller مطابق في Backend؛ 10 بلا مطابق (تحتاج تحقق).
- مؤشر خطر: 181 شاشة بـ @ts-nocheck (خارج typecheck) و97 شاشة بلا API call — تُراجع في مرحلة parity.

## نتائج التحقق التراكمية
| المكوّن | النتيجة |
|---|---|
| Patient Mobile typecheck | PASS |
| Patient Mobile tests | 37/37 suites — 84/84 tests |
| Backend typecheck (tsc --noEmit) | PASS |
| Backend FULL test suite | PASS — 106 suites / 561 tests / 5 chunks |
| Backend build (nest build) | PASS |
| Backend focused pharmacy tests | 3/3 suites — 12/12 tests |
| Provider App typecheck + tests | PASS — 12/12 tests |
| Admin typecheck + production build | PASS — 48 صفحة |

## ملاحظات مفتوحة (لم تُغلق)
- ~~Full Backend Jest suite يفشل بـ heap OOM~~ — تم الإصلاح: chunked runner، 561/561 PASS.
- فروع قديمة (106) غير مدمجة في main — تحتاج integration review.
- Patient Web parity و Provider onboarding — مراحل قادمة في الخطة.
