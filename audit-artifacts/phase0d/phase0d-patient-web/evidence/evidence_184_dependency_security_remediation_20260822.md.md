# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `evidence/184_dependency_security_remediation_20260822.md`
- **Member SHA-256:** `3cf9dc2b5b6b58de487b4a274843aa2ecb0781a1dd6739c424ba1457a7f96170`
- **Line count:** 29
- **Read range:** `1-29`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- `13: | تحديث `@trpc/*` من 11.6.0 إلى 11.18.0 | إزالة مسار تلوث النموذج في النطاق المتأثر | اجتازت الشفرة والفحوص والبناء. |`
- `14: | تحديث `axios` من 1.12.2 إلى 1.19.0 | إزالة المسار المباشر القديم الذي أظهره التدقيق | اجتازت الشفرة والفحوص والبناء. |`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
