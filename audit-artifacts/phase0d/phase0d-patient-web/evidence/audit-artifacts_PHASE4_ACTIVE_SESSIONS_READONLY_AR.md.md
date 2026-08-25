# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/PHASE4_ACTIVE_SESSIONS_READONLY_AR.md`
- **Member SHA-256:** `a96227ab05bc46555c7fd5daf15ed41bb9e51f7fdb84db8049962d4ecc1bf535`
- **Line count:** 5
- **Read range:** `1-5`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `3: تم توسيع Settings route بعقد GET الحقيقي `/users/me/sessions`. الواجهة تعرض device metadata ومدة الانتهاء بالأيام فقط، ولا تعرض `jti` أو refresh/access token أو زر revoke. مسار `DELETE /users/me/sessions/:jti` بقي خارج allowlist وDeferred.`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `1: # Phase 4 — Active Sessions Read-only`
- `3: تم توسيع Settings route بعقد GET الحقيقي `/users/me/sessions`. الواجهة تعرض device metadata ومدة الانتهاء بالأيام فقط، ولا تعرض `jti` أو refresh/access token أو زر revoke. مسار `DELETE /users/me/sessions/:jti` بقي خارج allowlist وDeferred.`
- `5: تمت إضافة parser/test يثبت إسقاط session IDs وaccess_token، وتحديث allowlist وserver wrapper. نجحت full Vitest: 67 test files passed و14 skipped، 123 tests passed و23 skipped، truthful-runtime gate على 198 production files، TypeScript، prod`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
