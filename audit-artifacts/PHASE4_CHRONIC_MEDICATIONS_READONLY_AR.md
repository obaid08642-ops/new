# Phase 4 — Chronic Medications Read-only

تمت إضافة `/[locale]/health/chronic-medications` من `GET /health/chronic-meds`. Backend يبني القائمة من patient-owned reminder records ويرجع name/dose/frequency/times/time_zone/pills_remaining/refill metadata/active.

Web يعرض جدول الدواء والجرعة والجدولة وrefill metadata فقط. لا توجد أزرار add/edit/stop/refill أو reminder logging، وكلها بقيت Deferred بسبب mutation/idempotency policy.

التحقق: full Vitest نجح بـ72 test files passed و14 skipped، 131 tests passed و23 skipped، truthful-runtime gate على 216 production files، TypeScript، production build، وdiff check.
