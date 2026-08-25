# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/IMPLEMENTATION_PHASE6_REMINDERS_JOURNEY_AR.md`
- **Member SHA-256:** `aaafe3c99445aabaff0c96fd46bf228b5b55d274e3078bbd0deaf468032bc223`
- **Line count:** 27
- **Read range:** `1-27`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- `15: الموبايل يملك mutations لـlog dose وstop reminder وcreate/edit وlocal notifications. لم أضف هذه الأفعال إلى Web لأن ذلك يحتاج request schemas، ownership/authorization tests، CSRF policy، status transition rules، وbrowser interaction semanti`
### auth_ownership
- `15: الموبايل يملك mutations لـlog dose وstop reminder وcreate/edit وlocal notifications. لم أضف هذه الأفعال إلى Web لأن ذلك يحتاج request schemas، ownership/authorization tests، CSRF policy، status transition rules، وbrowser interaction semanti`
### state_transitions
- `7: - حساب next pending dose من `today_doses` أو times الموثقة.`
- `11: - الحفاظ على empty/error/unavailable states.`
- `15: الموبايل يملك mutations لـlog dose وstop reminder وcreate/edit وlocal notifications. لم أضف هذه الأفعال إلى Web لأن ذلك يحتاج request schemas، ownership/authorization tests، CSRF policy، status transition rules، وbrowser interaction semanti`
### payment_insurance_relevance
- `8: - حساب taken/total progress.`
### error_empty_loading_retry_cancel
- `7: - حساب next pending dose من `today_doses` أو times الموثقة.`
- `11: - الحفاظ على empty/error/unavailable states.`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
