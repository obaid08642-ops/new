# نتائج التحقق P1-wave-2c (بنود معلقة — محسومة بالأدلة)
## 1. FASTAPI_BASE_URL = كود ميت ✅
- صفر مستهلكين وقت التشغيل (تعريفات في `ConfigManager.ts` + re-exports + mock اختباري فقط).
- لكن يوجد **باكند ثانٍ حقيقي مهجور على القرص**: `backend/infra/fastapi/` (FastAPI+Mongo+JWT+OCR وصفات + proxy نحو NestJS) — غير موصول بعميل الموبايل، وOCR الفعلي يُقدَّم عبر NestJS (`ai.controller.ts:84-88`). **قرار P3 (R1): حذف `infra/fastapi` أو توثيق سبب بقائه — لا باكند ثانٍ.**
## 2. موديولات spec-only = لا يوجد ✅
- الستة (booking-flow/booking-ops/facility-ops/medical-programs/patient-ux/provider-ops) تحوي تنفيذاً حقيقياً مضمّناً في ملف `.module.ts` (205–773 سطراً) + spec. الشبهة مُبرَّأة (ملاحظة نمط غير تقليدي للتوثيق).
## 3. موديولات stub = لا يوجد stub صرف ✅
- الـ 13 كلها منطق حي (aggregations/Redis/DB). الوحيد بشرط: `device-trust` بفرع `not_configured` الصادق عند غياب المفاتيح (BLOCKED إنتاجي مشروع).
## 4. Seed = تشغيل تلقائي مشروط ⚠️ (يُحسم P2)
- `SeedModule` مسجل دائماً + `onModuleInit` يعمل كل إقلاع: بيانات مرجعية (أدوية/مختبرات/مرافق/config) **upsert في كل إقلاع إنتاجي بلا قاطع** + demo (مرضى/صيدليات/أطباء/مخزون) محجوب بـ `NODE_ENV=test && ALLOW_TEST_SEED=true`.
- **بندا P2:** (أ) هل upsert المرجع قد يطغى على تعديلات الأدمن (slug/name)؟ (ب) توصية: قاطع إنتاج صريح + فصل التهيئة عن الإقلاع.
## 5. فروع الـ agents: 4 عينات كلها NOT-MERGED ⚠️ (حرج إجرائياً)
- `fix/mock-data-sweep` (2 commits: صفحات ويب + روابط) · `review/all-fixes-p0-p10` (6: i18n/broadcast) · `agent/mobile-p1-fixes-20260822` (8: **تقوية أمنية للموبايل fail-closed**) · `release/patient-production` (28: **حظر workflows اصطناعية** + حزمة تدقيق).
- **إصلاحات أمنية وحظر سلوك اصطناعي موجودة على فروع ولم تُدمج في main.** القرار P2: cherry-pick ما يصح منها إلى فرعنا أثناء البناء (بعد مراجعة كل commit) أو توثيق سبب الترك — لا تُترك صامتة.
## 6. `video/[id].tsx` = shim ميت ✅ (صفر روابط داخلية — redirect فقط؛ قرار P3: حذف مع حفظ توافق الروابط الخارجية إن لزم)
