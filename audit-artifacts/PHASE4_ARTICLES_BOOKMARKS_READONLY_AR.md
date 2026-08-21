# Phase 4 — Articles and Bookmarks Read-only

تمت إضافة:

- `/[locale]/articles` من public GET `/articles`.
- `/[locale]/articles/[slug]` من public GET `/articles/:slug`.
- `/[locale]/articles/bookmarks` من authenticated GET `/articles/bookmarks/mine`.

الـparser يسمح فقط بـ id/slug/title/excerpt/category/cover metadata/author metadata/published_at، ويسقط body HTML وuser IDs وviews وtracking fields. صفحة detail تعرض metadata/excerpt فقط وتوضح أن body مخفي حتى تثبيت sanitized content/media contract. bookmark toggle POST بقي خارج التنفيذ وDeferred.

تمت إضافة strict slug validation، server wrappers public/patient، GET-only allowlist، وترجمة اللغات الست. نجحت full Vitest: 68 test files passed و14 skipped، 125 tests passed و23 skipped، truthful-runtime gate على 203 production files، TypeScript، production build، وdiff check.

ملاحظة صادقة: public list/details حقيقية من Backend، لكن لا يوجد بعد browse/article link في Mobile/Web يثبت كل content scenarios أو bookmark mutation؛ لذلك تم تنفيذ read-only metadata فقط.
