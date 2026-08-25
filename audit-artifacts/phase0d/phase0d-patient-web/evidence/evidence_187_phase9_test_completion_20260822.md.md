# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `evidence/187_phase9_test_completion_20260822.md`
- **Member SHA-256:** `f80132f2abb8b0321666d27f214d9ddeebe3951273ffd50688f99dcb691956dc`
- **Line count:** 24
- **Read range:** `1-24`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- `22: تشغيل `RUN_SANDBOX_TESTS=true pnpm vitest run lib/api/sandbox-order-ownership.test.ts` في هذه الجلسة **لم ينفذ أي طلب شبكة**، لأنه توقف قبل تسجيل الدخول عند غياب `NABD_API_BASE_URL` من بيئة التنفيذ. لم تُخترع متغيرات أو حسابات بديلة ولم تُع`
### auth_ownership
- `8: أضيف اختبار `tests/translation-key-parity.test.ts` الذي يفرد شجرة مفاتيح الرسائل لكل من العربية والإنجليزية والأردية والهندية والبنغالية والفلبينية، ويمنع اختلاف مفاتيح الترجمات أو نسيان رسالة `Settings.sessionsSummary` في أي لغة. يبقى اختب`
- `22: تشغيل `RUN_SANDBOX_TESTS=true pnpm vitest run lib/api/sandbox-order-ownership.test.ts` في هذه الجلسة **لم ينفذ أي طلب شبكة**، لأنه توقف قبل تسجيل الدخول عند غياب `NABD_API_BASE_URL` من بيئة التنفيذ. لم تُخترع متغيرات أو حسابات بديلة ولم تُع`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
