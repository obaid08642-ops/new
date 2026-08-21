# Phase 4 — Health Trends Read-only

تمت إضافة `/[locale]/health/trends` من `GET /health/trends`. Backend يحسب series من patient-owned real vitals ويعيد current/trendDir/labels/data مع normal range.

Web يسمح metric/unit/current/direction/series labels فقط، ويسقط normal ranges وpatient/private fields حتى لا تتحول الصفحة إلى clinical assessment أو recommendation. لا توجد mutations.

التحقق: full Vitest نجح بـ73 test files passed و14 skipped، 132 tests passed و23 skipped، truthful-runtime gate على 219 production files، TypeScript، production build، وdiff check.
