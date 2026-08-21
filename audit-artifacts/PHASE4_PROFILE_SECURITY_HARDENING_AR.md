# Phase 4 — Profile Security Hardening

تمت إزالة `policyNumber` و`memberId` من Profile web display allowlist. صفحة Profile تعرض من Insurance domain فقط `providerName`, `companyName`, و`status`، مع استمرار server-side session وعدم كشف token.

تم تحديث Sandbox profile contract المتوقع، وإضافة اختبار محلي يثبت إسقاط identifiers الحساسة حتى عندما يعيدها Backend. نجحت full Vitest: 66 test files passed و14 skipped، 120 tests passed و23 skipped، truthful-runtime gate على 195 production files، TypeScript، production build، وdiff check.

القرار لا يمنع Backend من إعادة الحقول إلى server؛ لكنه يمنع Web من عرضها. لا توجد mutation أو upload في هذه الحزمة.
