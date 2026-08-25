# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE14_EXIT_CRITERIA_REVIEW_20260819.md`
- **Member SHA-256:** `4ab9fc43540604d1c8d5e8b3073523fe9c603e5b2e3b1952467fd62ac2de9cce`
- **Line count:** 31
- **Read range:** `1-31`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `24: | **FAIL-CLOSED** | SOAP بلا patient+booking owned contract؛ PreVisitChat بلا appointment-to-thread authorization؛ expiry tracking بلا inventory controller/audit. |`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `13: | يبدأ بـProvider clinical consultation/prescription | يحتوي دليل pre-Phase 13 الاستشارة وEHR المحليين والوصفة المحلية، ويثبت ownership للموعد/المريض والدواء المعتمد في Backend. | PASS source-level |`
- `24: | **FAIL-CLOSED** | SOAP بلا patient+booking owned contract؛ PreVisitChat بلا appointment-to-thread authorization؛ expiry tracking بلا inventory controller/audit. |`
### state_transitions
- `14: | لا fake data أو success محلي | كل سطح بلا عقد موثق يعرض fail-closed؛ لا تظهر رسالة أو مرفق أو مخزون أو حالة صلاحية أو حفظ SOAP محلياً. | PASS |`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
