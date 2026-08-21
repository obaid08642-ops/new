# Phase 4 — Mental Health Breathing History Read-only

تمت إضافة `/[locale]/mental-health/breathing` من `GET /mental-health/breathing`. Backend يثبت patient-owned history بحد أقصى 30 جلسة، وWeb يعرض technique/rounds/duration/date فقط.

تم إسقاط patient_id والـnotes والحقول الداخلية. لا توجد start/log controls؛ `POST /mental-health/breathing` بقي خارج browser-facing contract.

أُصلح TypeScript parser regression بتثبيت `rows` كـ`unknown[]` بعد اختبار response guard.

التحقق: full Vitest نجح بـ76 test files passed و14 skipped، 135 tests passed و23 skipped، truthful-runtime gate على 228 production files، TypeScript، production build، وdiff check.
