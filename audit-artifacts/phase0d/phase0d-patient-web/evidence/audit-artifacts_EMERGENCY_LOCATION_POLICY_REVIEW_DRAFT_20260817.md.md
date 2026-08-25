# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/EMERGENCY_LOCATION_POLICY_REVIEW_DRAFT_20260817.md`
- **Member SHA-256:** `762cb469131baf9a3dc179d03cfca4ce4f4cbd6aa35621d5ecdd7bef4f7ad3c1`
- **Line count:** 42
- **Read range:** `1-42`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `18: | رفض permission | استمرار SOS دون موقع إن أمكن | لا fallback مصطنع؛ تعرض حالة unavailable |`
- `32: المريض يرى حالة موقعه. dispatch يرى أقل معلومات لازمة لتعيين الاستجابة. driver لا يرى إلا حالات assigned/claimed التي يملكها. admin access يجب أن يكون مقيداً ومُدققاً. لا يسمح patient A أو provider غير المرتبط بقراءة موقع emergency B.`
- `36: الافتراضي هو الاحتفاظ بأقل مدة تشغيلية تعتمد بعد مراجعة قانونية، ثم حذف أو تقليل الدقة. يجب فصل سجل audit عن location payload؛ audit يثبت من وصل ومتى ولماذا دون نسخ track كاملاً. أي export يحتاج authorization مستقل.`
- `40: لا تُفعل background tracking أو live stream قبل اعتماد interval، precision، retention، roles، consent، ومصفوفة permission. عند غياب authorization أو emergency relationship يعاد `EMERGENCY_LOCATION_UNAVAILABLE` أو 403، ولا يعاد موقع آخر. كل `
### state_transitions
- `22: يُفضّل تخزين `emergency_id`, `captured_at`, `accuracy_m`, `coarse_lat`, `coarse_lng`, `source`، و`consent_state`. الإحداثيات الدقيقة لا تُخزن إلا إذا أثبتت الحاجة التشغيلية واعتمدت قانونياً. لا يتم تخزين altitude أو speed أو raw device iden`
### payment_insurance_relevance
- `36: الافتراضي هو الاحتفاظ بأقل مدة تشغيلية تعتمد بعد مراجعة قانونية، ثم حذف أو تقليل الدقة. يجب فصل سجل audit عن location payload؛ audit يثبت من وصل ومتى ولماذا دون نسخ track كاملاً. أي export يحتاج authorization مستقل.`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
