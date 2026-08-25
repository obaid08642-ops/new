# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_OWNER_REVIEWER_NEXT_ACTIONS_20260820.md`
- **Member SHA-256:** `5b516813e2b44406e4f928e06174635f51f086dde5f89e5fb249ee9b72a9aad6`
- **Line count:** 66
- **Read range:** `1-66`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `37: | Apple signing وTestFlight | build number وسجل upload ناجح |`
- `38: | Device farm وAndroid+iOS حقيقيان | screenshots/videos/logs/crashes للحالات الحرجة |`
- `40: تختبر الأجهزة permissions وpush/deep links وweak network وbackground/lifecycle/orientation وcamera/GPS/audio وLiveKit/CallKeep أو full-screen intent، بالإضافة إلى crash reporting.`
- `44: التغطية التقنية للغات الست والـRTL اجتازت الاختبارات، لكن يلزم sign-off بشري. يراجع مختصون AR/EN/UR/HI/BN/FIL النص الطبي والمالي والقانوني، مع RTL للعربية فقط وLTR لبقية اللغات. توثق كل شاشة حرجة، truncation، font/rendering، screen reader، `
- `50: | Moyasar | Owner/Finance/DevOps | test-safe activation ثم intent/webhook/idempotency/refund Sandbox |`
- `62: [1]: `NABDAH_PHASE16_SANDBOX_EXECUTION_REGISTER_20260819.md` "سجل Phase 16"`
### backend_consumers_or_contracts
- `25: | foreign patient/doctor/pharmacy على الوصفة | 403 أو404 بحسب العقد | read-only negative |`
- `54: | Pharmacy/Lab/Radiology/Nursing/Hospital lifecycle | Owner/QA | fixtures مملوكة قابلة للتنظيف لكل actor/state |`
### auth_ownership
- `26: | Lab embedded report | owner 200؛ foreign 404 | read-only |`
- `40: تختبر الأجهزة permissions وpush/deep links وweak network وbackground/lifecycle/orientation وcamera/GPS/audio وLiveKit/CallKeep أو full-screen intent، بالإضافة إلى crash reporting.`
- `50: | Moyasar | Owner/Finance/DevOps | test-safe activation ثم intent/webhook/idempotency/refund Sandbox |`
- `51: | SOS/consent/location/AI/PHI | Owner/Legal/Product | اعتماد مكتوب للعقد والمحتوى والاحتفاظ والتدقيق |`
- `52: | Admin RBAC | Owner/Admin reviewer | 2FA/step-up مفوض وfixtures معزولة وسجل تدقيق |`
- `53: | Provider intake | Owner/QA | عناوين/هوية Sandbox معزولة ومسار cleanup pending/approved |`
- `54: | Pharmacy/Lab/Radiology/Nursing/Hospital lifecycle | Owner/QA | fixtures مملوكة قابلة للتنظيف لكل actor/state |`
### state_transitions
- `22: | clinic/cash → check-in → start → manual prescription | 201 ثم 200/200 ثم 201 وبند `PENDING_REVIEW` | تستكمل إلى terminal |`
- `50: | Moyasar | Owner/Finance/DevOps | test-safe activation ثم intent/webhook/idempotency/refund Sandbox |`
- `53: | Provider intake | Owner/QA | عناوين/هوية Sandbox معزولة ومسار cleanup pending/approved |`
- `54: | Pharmacy/Lab/Radiology/Nursing/Hospital lifecycle | Owner/QA | fixtures مملوكة قابلة للتنظيف لكل actor/state |`
### payment_insurance_relevance
- `22: | clinic/cash → check-in → start → manual prescription | 201 ثم 200/200 ثم 201 وبند `PENDING_REVIEW` | تستكمل إلى terminal |`
- `50: | Moyasar | Owner/Finance/DevOps | test-safe activation ثم intent/webhook/idempotency/refund Sandbox |`
### error_empty_loading_retry_cancel
- `22: | clinic/cash → check-in → start → manual prescription | 201 ثم 200/200 ثم 201 وبند `PENDING_REVIEW` | تستكمل إلى terminal |`
- `53: | Provider intake | Owner/QA | عناوين/هوية Sandbox معزولة ومسار cleanup pending/approved |`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
