# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_HARDENING_BASELINE_AND_SAFE_CHANGE_POLICY_20260820.md`
- **Member SHA-256:** `18b36e1ea2302041743148d468458eaf32532b3973cdc6a38755ccbe41c1f9cc`
- **Line count:** 44
- **Read range:** `1-44`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `30: المسح المصدرّي، لا قاعدة البيانات، كشف مرشحين اثنين للمراجعة: `LabResult.booking_id` يحمل property index مع `Schema.index` مفرد، و`mental-health.schema.ts` يعلن compound index مكرر لـ`patient_id, logged_at`. لا يحذف هذا baseline أي index. ق`
### backend_consumers_or_contracts
- `22: يوجد Swagger bootstrap خلف `SWAGGER_ENABLED` وبـBearer auth أساسي فقط، عند `/api/docs` في بيئات غير production أو عند التفعيل الصريح. لا يوجد حتى الآن catalog contract مكتمل موثق يعلن server URL، scopes، أخطاء response schemas، وcompatibili`
- `43: [6]: `../../nabdah_execution/backend/src/modules/insurance/insurance.controller.ts` "عقد التأمين الحديث"`
### auth_ownership
- `22: يوجد Swagger bootstrap خلف `SWAGGER_ENABLED` وبـBearer auth أساسي فقط، عند `/api/docs` في بيئات غير production أو عند التفعيل الصريح. لا يوجد حتى الآن catalog contract مكتمل موثق يعلن server URL، scopes، أخطاء response schemas، وcompatibili`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- `22: يوجد Swagger bootstrap خلف `SWAGGER_ENABLED` وبـBearer auth أساسي فقط، عند `/api/docs` في بيئات غير production أو عند التفعيل الصريح. لا يوجد حتى الآن catalog contract مكتمل موثق يعلن server URL، scopes، أخطاء response schemas، وcompatibili`
- `43: [6]: `../../nabdah_execution/backend/src/modules/insurance/insurance.controller.ts` "عقد التأمين الحديث"`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
