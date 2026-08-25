# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/PHASE9_PRODUCTION_READINESS_AUDIT_AR.md`
- **Member SHA-256:** `dc5a0c3edfb64e7cd1541fc9502fa9b515894f383399b662ab795fa7715c1da5`
- **Line count:** 7
- **Read range:** `1-7`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: فحص browser leakage المخصص نظيف بعد استثناء `lib/api/upstream.ts` وملفات `*-server.ts` المعروفة بأنها server-only؛ وجود `Authorization: Bearer` داخل upstream wrapper مقصود لأنه لا يدخل browser bundle، بينما لا يوجد token في localStorage/ses`
### backend_consumers_or_contracts
- `5: فحص browser leakage المخصص نظيف بعد استثناء `lib/api/upstream.ts` وملفات `*-server.ts` المعروفة بأنها server-only؛ وجود `Authorization: Bearer` داخل upstream wrapper مقصود لأنه لا يدخل browser bundle، بينما لا يوجد token في localStorage/ses`
### auth_ownership
- `3: نجحت اختبارات security/ownership وBFF allowlist: 14 test files و18 tests. كما نجح truthful-runtime gate على 195 ملف production، وTypeScript، وproduction build.`
- `5: فحص browser leakage المخصص نظيف بعد استثناء `lib/api/upstream.ts` وملفات `*-server.ts` المعروفة بأنها server-only؛ وجود `Authorization: Bearer` داخل upstream wrapper مقصود لأنه لا يدخل browser bundle، بينما لا يوجد token في localStorage/ses`
- `7: الفرع نظيف ومتزامن مع GitHub بعد آخر commit. لم يتم ادعاء staging/E2E حي؛ ذلك يتطلب بيئة Sandbox/Server وحسابي patient/stranger حقيقيين. اختبارات runtime الحالية تثبت owner-scoped server wrappers ورفض المسارات غير المسموحة، لكنها لا تعادل ا`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
