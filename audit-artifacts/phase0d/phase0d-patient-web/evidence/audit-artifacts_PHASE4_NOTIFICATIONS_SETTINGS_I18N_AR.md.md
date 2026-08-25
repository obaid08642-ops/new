# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/PHASE4_NOTIFICATIONS_SETTINGS_I18N_AR.md`
- **Member SHA-256:** `46964985552cafc030c8fdbafa17a55fa8efe6262e46d35f5632392ad2d42f5c`
- **Line count:** 7
- **Read range:** `1-7`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- `3: تمت إزالة النصوص العربية hardcoded من `/notifications/settings`. أصبحت العناوين والـlabels والوصف وحالات enabled/disabled/not-available وrequired مترجمة عبر `NotificationSettings` في اللغات الست.`
### auth_ownership
- `5: لم تتغير طبيعة العقد: الصفحة تقرأ GET notification settings فقط، وتبقي PATCH خارج الواجهة حتى إغلاق ownership/CSRF/transition/idempotency contract.`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
