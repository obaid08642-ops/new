# Phase 4 — Chronic Diseases Read-only

تمت إضافة `/[locale]/health/chronic-diseases` من `GET /health/chronic-diseases`. Backend يقرأ `patient_profiles.chronic_diseases` عبر `user.id` ويعيد name/source مع `controlled: null` صراحةً لعدم وجود clinical assessment.

Web يعرض اسم الحالة ومصدرها كـpatient-recorded profile entry فقط، ويسقط controlled/severity/patient fields. لا يوجد تعديل أو حذف أو diagnosis أو treatment recommendation.

Mobile conditions/allergies يفتح POST/DELETE في نفس الرحلة؛ هذه mutations بقيت Deferred.

التحقق: full Vitest نجح بـ71 test files passed و14 skipped، 130 tests passed و23 skipped، truthful-runtime gate على 213 production files، TypeScript، production build، وdiff check.
