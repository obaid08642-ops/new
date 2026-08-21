# Phase 4 — Active Sessions Read-only

تم توسيع Settings route بعقد GET الحقيقي `/users/me/sessions`. الواجهة تعرض device metadata ومدة الانتهاء بالأيام فقط، ولا تعرض `jti` أو refresh/access token أو زر revoke. مسار `DELETE /users/me/sessions/:jti` بقي خارج allowlist وDeferred.

تمت إضافة parser/test يثبت إسقاط session IDs وaccess_token، وتحديث allowlist وserver wrapper. نجحت full Vitest: 67 test files passed و14 skipped، 123 tests passed و23 skipped، truthful-runtime gate على 198 production files، TypeScript، production build، وdiff check.
