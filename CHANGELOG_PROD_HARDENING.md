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

## نتائج التحقق التراكمية
| المكوّن | النتيجة |
|---|---|
| Patient Mobile typecheck | PASS |
| Patient Mobile tests | 37/37 suites — 84/84 tests |
| Backend typecheck (tsc --noEmit) | PASS |
| Backend build (nest build) | PASS |
| Backend focused pharmacy tests | 3/3 suites — 12/12 tests |
| Provider App typecheck + tests | PASS — 12/12 tests |
| Admin typecheck + production build | PASS — 48 صفحة |

## ملاحظات مفتوحة (لم تُغلق)
- Full Backend Jest suite يفشل بـ heap OOM — بند مستقل في الخطة.
- فروع قديمة (106) غير مدمجة في main — تحتاج integration review.
- Patient Web parity و Provider onboarding — مراحل قادمة في الخطة.
