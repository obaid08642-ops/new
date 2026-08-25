# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/PHASE4_PROFILE_SECURITY_HARDENING_AR.md`
- **Member SHA-256:** `cdea3231a6acad3548eb99b05531a68f45f4e9bdda1c36cd5ccfc6e8dac9acd9`
- **Line count:** 7
- **Read range:** `1-7`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `7: القرار لا يمنع Backend من إعادة الحقول إلى server؛ لكنه يمنع Web من عرضها. لا توجد mutation أو upload في هذه الحزمة.`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `3: تمت إزالة `policyNumber` و`memberId` من Profile web display allowlist. صفحة Profile تعرض من Insurance domain فقط `providerName`, `companyName`, و`status`، مع استمرار server-side session وعدم كشف token.`
### state_transitions
- `3: تمت إزالة `policyNumber` و`memberId` من Profile web display allowlist. صفحة Profile تعرض من Insurance domain فقط `providerName`, `companyName`, و`status`، مع استمرار server-side session وعدم كشف token.`
### payment_insurance_relevance
- `3: تمت إزالة `policyNumber` و`memberId` من Profile web display allowlist. صفحة Profile تعرض من Insurance domain فقط `providerName`, `companyName`, و`status`، مع استمرار server-side session وعدم كشف token.`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
