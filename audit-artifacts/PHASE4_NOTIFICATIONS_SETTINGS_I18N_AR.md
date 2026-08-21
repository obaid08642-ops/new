# Phase 4 — Notifications Settings i18n

تمت إزالة النصوص العربية hardcoded من `/notifications/settings`. أصبحت العناوين والـlabels والوصف وحالات enabled/disabled/not-available وrequired مترجمة عبر `NotificationSettings` في اللغات الست.

لم تتغير طبيعة العقد: الصفحة تقرأ GET notification settings فقط، وتبقي PATCH خارج الواجهة حتى إغلاق ownership/CSRF/transition/idempotency contract.

التحقق: full Vitest نجح بـ67 test files passed و14 skipped، 122 tests passed و23 skipped، truthful-runtime gate على 198 production files، TypeScript، production build، وdiff check.
