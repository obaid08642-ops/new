# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PATIENT_EXPO_SDK57_MIGRATION_20260819.md`
- **Member SHA-256:** `7d67776316ce921459239d27ca985e023226fc1063e2a7668a1b44e5a869bffa`
- **Line count:** 47
- **Read range:** `1-47`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `13: | إعداد التطبيق | إزالة `newArchEnabled` غير المقبول في schema ونقل إعداد splash إلى `expo-splash-screen` plugin مع الصورة واللون ونمط العرض الأصليين. |`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- `30: | الأرشيف | **PASS**؛ لا يتضمن `node_modules` أو `dist` أو `coverage` أو `.expo` |`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
