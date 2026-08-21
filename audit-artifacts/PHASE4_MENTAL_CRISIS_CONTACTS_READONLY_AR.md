# Phase 4 — Mental Health Crisis Contacts Read-only

تمت إضافة `/[locale]/mental-health/crisis-contacts` من `GET /mental-health/crisis-contacts`. Backend يثبت patient-owned `user_contacts`، وWeb يعرض الاسم والعلاقة ورقمًا مقنعًا بآخر أربعة أرقام فقط.

تم إسقاط patient_id والـphone الخام والحقول غير المصرح بها. لا يوجد call link أو add/delete، لأن POST وDELETE ما زالا خارج browser-facing contract وقراراتهما تحتاج idempotency/confirmation policy.

التحقق: full Vitest نجح بـ75 test files passed و14 skipped، 134 tests passed و23 skipped، truthful-runtime gate على 225 production files، TypeScript، production build، وdiff check.
