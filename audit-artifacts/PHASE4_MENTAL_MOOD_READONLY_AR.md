# Phase 4 — Mental Health Mood History Read-only

تمت إضافة `/[locale]/mental-health/mood` من `GET /mental-health/mood?days=30`. Backend يثبت patient-owned self-reported history لمدة 30 يومًا، وWeb يعرض mood/energy/stress/sleep/date فقط.

تم إسقاط notes وtags وpatient IDs وأي interpretation. لا توجد journal form أو POST mutation، ولا يتم توليد diagnosis أو clinical recommendation.

التحقق: full Vitest نجح بـ77 test files passed و14 skipped، 136 tests passed و23 skipped، truthful-runtime gate على 231 production files، TypeScript، production build، وdiff check.
