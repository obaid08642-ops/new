# Phase 4 — Settings Read-only Contract Pack

تمت إضافة route `/[locale]/settings` اعتمادًا على GET الحقيقي من Backend:

- `/users/me/privacy-settings`
- `/users/me/security-settings`
- `/users/me/storage`

الواجهة تعرض privacy booleans، security booleans، وstorage usage metadata فقط. لا تنفذ PATCH أو password change أو session revoke أو data export/deletion. أضيفت المسارات إلى BFF GET-only allowlist، وجميع session access tokens تبقى server-side.

الـparsers تسقط patient identifiers وsecrets وأي fields غير معتمدة. تمت إضافة ترجمة للغات الست وواجهة responsive متسقة مع design tokens الحالية.

نتائج التحقق: 67 test files passed و14 skipped، 122 tests passed و23 skipped، truthful-runtime gate على 198 production files، TypeScript، production build، وdiff check.
