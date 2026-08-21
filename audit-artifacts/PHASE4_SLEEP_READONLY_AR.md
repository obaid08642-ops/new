# Phase 4 — Sleep History Read-only

تمت إضافة `/[locale]/health/sleep` من العقد الحقيقي `GET /health/sleep?limit=100`. المصدر يثبت ownership عبر `patient_id: user.id` في `listSleep` ويحدّ النتائج إلى 500.

Web يعرض score/duration/measuredAt/source metadata فقط، ويسقط patient_id/notes/device identifiers. لا توجد إضافة أو تعديل أو حذف أو clinical recommendations.

تم توثيق فجوة Mobile: `health/vitals-log` يستدعي `GET /health/vitals?type=...` بينما Backend controller الحالي يعرّف summary GET فقط ويعرّف vitals list كـPOST/PATCH/DELETE؛ لذلك لم يتم اختلاق Vitals history Web.

التحقق: full Vitest نجح بـ69 test files passed و14 skipped، 128 tests passed و23 skipped، truthful-runtime gate على 207 production files، TypeScript، production build، وdiff check.
