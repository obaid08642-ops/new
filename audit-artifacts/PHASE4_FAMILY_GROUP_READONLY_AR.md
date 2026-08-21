# Phase 4 — Family Group Metadata Read-only

تم توسيع `/[locale]/family` بعقد `GET /family/my-group` الحقيقي إلى جانب `GET /family/members`.

Web يعرض اسم المجموعة وعدد الأعضاء فقط. parser يسقط group id وowner_id وmember user IDs وpermissions وinvite_code وinvite expiry. لا توجد دعوات أو join/leave/remove أو permission mutations.

لم يتم فتح `GET /family/member-records/:userId` أو member-health؛ هذه مسارات cross-patient حساسة تعتمد granular consent/permission وBOLA isolation، وتحتاج اختبارات owner/stranger وحسابات Sandbox حية قبل العرض.

التحقق: full Vitest نجح بـ74 test files passed و14 skipped، 133 tests passed و23 skipped، truthful-runtime gate على 222 production files، TypeScript، production build، وdiff check.
