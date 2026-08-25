# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/DEVICE_FARM_BLOCKER_20260817.md`
- **Member SHA-256:** `4404d10dca79859ed96fe51315acc6f664c1b0a6070e2a5dd7526b8978eeb915`
- **Line count:** 17
- **Read range:** `1-17`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `17: حالة المزرعة: **BLOCKED — external credentials/build artifacts unavailable**. لا توجد نتيجة Passed أو Failed يمكن نسبتها إلى Firebase Test Lab، ولا تُغلق المرحلة إلا بعد دليل تشغيل فعلي قابل للمراجعة.`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `17: حالة المزرعة: **BLOCKED — external credentials/build artifacts unavailable**. لا توجد نتيجة Passed أو Failed يمكن نسبتها إلى Firebase Test Lab، ولا تُغلق المرحلة إلا بعد دليل تشغيل فعلي قابل للمراجعة.`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
