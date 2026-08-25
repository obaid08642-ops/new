# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/IMPLEMENTATION_PHASE3_TRUTHFUL_RUNTIME_AR.md`
- **Member SHA-256:** `a5cb6e3ef0a047a8afa2159552cafddef067caddc499815df37ec28a1229cef1`
- **Line count:** 25
- **Read range:** `1-25`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `7: - local guest tokens/users.`
### state_transitions
- `8: - protocol success fallback بصيغة `ok: true` عند غياب استجابة حقيقية.`
### payment_insurance_relevance
- `25: Pass للمرحلة على مستوى Web App الحالي. هذا لا يثبت أن Mobile Application خالٍ من البيانات الوهمية؛ فذلك تدقيق مستقل موثق في تقرير إعادة التدقيق، ويشمل guest fallback المحلي ومسارات wallet/failure التي تحتاج إصلاحًا على مصدر الموبايل قبل نسخ`
### error_empty_loading_retry_cancel
- `11: لا يعتبر `placeholder` الخاص بعنصر إدخال، أو random skeleton width، أو random backoff للـLLM بيانات نطاق وهمية؛ هذه تصنيفات مختلفة ويجب ألا ينتج عنها false positive.`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
