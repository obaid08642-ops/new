# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/PROVIDER_READONLY_FINDINGS_20260818.md`
- **Member SHA-256:** `7326bd654b19750e1940f3857972ec031fcd30d3c9c397bc9c94f35a771ca2ac`
- **Line count:** 5
- **Read range:** `1-5`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `3: استخدمت القراءة الآمنة فقط. التطبيق يعرّف فعلياً `POST /provider/auth/login` ويرسل `{ email, password, meta.device_identifier }`، لذلك كان المسار المستخدم مطابقاً لمصدر Provider App. أعاد probe الحالي 404 للدكتور والمختبر والأشعة، و429 للصي`
- `5: لم تُنفذ أي queue/accept/reject/toggle أو mutation. الخطوة التالية بعد انتهاء rate-limit هي إعادة login لحساب واحد في كل مرة، ثم قراءة `provider-onboarding/my-profile` و`progress` وnotifications وwallet، ثم exact queue/inbox route من contro`
### backend_consumers_or_contracts
- `3: استخدمت القراءة الآمنة فقط. التطبيق يعرّف فعلياً `POST /provider/auth/login` ويرسل `{ email, password, meta.device_identifier }`، لذلك كان المسار المستخدم مطابقاً لمصدر Provider App. أعاد probe الحالي 404 للدكتور والمختبر والأشعة، و429 للصي`
### auth_ownership
- `3: استخدمت القراءة الآمنة فقط. التطبيق يعرّف فعلياً `POST /provider/auth/login` ويرسل `{ email, password, meta.device_identifier }`، لذلك كان المسار المستخدم مطابقاً لمصدر Provider App. أعاد probe الحالي 404 للدكتور والمختبر والأشعة، و429 للصي`
- `5: لم تُنفذ أي queue/accept/reject/toggle أو mutation. الخطوة التالية بعد انتهاء rate-limit هي إعادة login لحساب واحد في كل مرة، ثم قراءة `provider-onboarding/my-profile` و`progress` وnotifications وwallet، ثم exact queue/inbox route من contro`
### state_transitions
- `3: استخدمت القراءة الآمنة فقط. التطبيق يعرّف فعلياً `POST /provider/auth/login` ويرسل `{ email, password, meta.device_identifier }`، لذلك كان المسار المستخدم مطابقاً لمصدر Provider App. أعاد probe الحالي 404 للدكتور والمختبر والأشعة، و429 للصي`
### payment_insurance_relevance
- `5: لم تُنفذ أي queue/accept/reject/toggle أو mutation. الخطوة التالية بعد انتهاء rate-limit هي إعادة login لحساب واحد في كل مرة، ثم قراءة `provider-onboarding/my-profile` و`progress` وnotifications وwallet، ثم exact queue/inbox route من contro`
### error_empty_loading_retry_cancel
- `3: استخدمت القراءة الآمنة فقط. التطبيق يعرّف فعلياً `POST /provider/auth/login` ويرسل `{ email, password, meta.device_identifier }`، لذلك كان المسار المستخدم مطابقاً لمصدر Provider App. أعاد probe الحالي 404 للدكتور والمختبر والأشعة، و429 للصي`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
