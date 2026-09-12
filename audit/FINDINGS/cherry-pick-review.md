# سجل مراجعة فروع الـ Agents (P3-a — قرار D1)
> رُوجعت كل الـ 44 commit غير المندمجة (فحص stat + محتوى + مقارنة مع main الحالي).
> النتيجة: **42 مُستبدَلة كلياً** بتطور main (أو ضارة: lockfile ‏11k، allowlist منقوصة، مسارات `nabd_plus_patient_app/` غير موجودة).
> **مُرحَّل يدوياً (2 دلتا سليمة فقط):** سلسلة EN fallback في `patient-app/src/i18n/index.ts` + 3 عبارات ناقصة في `autoTranslationsPhase5.json`.

## fix/mock-data-sweep (2) — مُستبدَلة/ضارة: تخطي
- الصفحات الـ 6 موجودة في main بنسخ أحدث؛ الـ allowlist في main أوسع (الدمج سيحذف ~20 مساراً = regression)؛ `package-lock.json` ‏(11k سطر) مرفوض (المشروع pnpm).

## review/all-fixes-p0-p10 (6) — مُستبدَلة: تخطي + ترحيل دلتا
- d7cdef07 (checkout/mursing): النسخ في main مطابقة أو أحدث — تخطي.
- e86f33ca/4d19fcf6/75d854d9 (i18n + Intl + terms + broadcast poll): كل المفاتيح (207+72+1) والسلوكيات موجودة في main — تخطي.
- 92c47c1e: ‏913 مفتاحاً — 910 موجودة؛ **رُحّل: منطق fallback (index.ts) + 3 عبارات** (ضغط انقباطي/02:30/شرط 18 سنة).

## agent/mobile-p1-fixes-20260822 (8) — مُستبدَلة: تخطي
- الفرع يعمل على مجلد `nabd_plus_patient_app/` غير الموجود في main — cherry-pick مستحيل هيكلياً.
- الخصائص الأمنية موجودة في main بنسخ مساوية/أفضل: RegistrationTransaction ✅، SecureStorageAdapter fail-closed ✅، SecureStore-only ✅، offline queue معطلة بنفس صنف الخطأ ✅، ضيف حقيقي مربوط بالباكند (أفضل من حذف الفرع) ✅.

## release/patient-production (28) — مُستبدَلة: تخطي
- ملفات docs/*: توثيق فقط — لا سلوك.
- fix الحرجة حُسمت بالتحقق المباشر من main: دفع المالك موجود (`payments.module.ts:148-152`)، ضوابط الإنتاج موجودة (`provider-production`)، NPHIES الصادق (`nphies_live:false` بلا TX ملفقة — أفضل من 503 الفرع)، idempotency interceptor في main يتضمن القفل والسكوب، لا demo routes نشطة.
- الباقي: إزالات mock سبقها تنظيف main ( wave-1: صفر محتوى مزيف نشط).
