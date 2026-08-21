# Phase 4 — Emergency Contacts Read-only

تمت إضافة `/[locale]/health/emergency-contacts` من `GET /health/emergency-contacts`. Backend يقرأ embedded `patient_profiles.emergency_contacts` عبر `user.id` ويعيد name/relation/phone/isPrimary.

Web يعرض الاسم والعلاقة وحالة الأساسي، لكنه يخفي الهاتف ويعرض آخر أربعة أرقام فقط. تُسقط الحقول الإضافية. Add وDELETE بقيتا خارج browser-facing contract بسبب mutation/idempotency policy.

التحقق: full Vitest نجح بـ70 test files passed و14 skipped، 129 tests passed و23 skipped، truthful-runtime gate على 210 production files، TypeScript، production build، وdiff check.
