# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/IMPLEMENTATION_PHASE2_SECURITY_GATE_AR.md`
- **Member SHA-256:** `0f7e8d3fadfe8151c6d437e4b2882c0079f3e4b8c28c1605db921e202f0392ca`
- **Line count:** 35
- **Read range:** `1-35`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `9: الـBFF الحالي fail-closed في النطاق المعتمد: يسمح فقط بقراءات `GET` لمساري الطلبات الموثقين، ويرفض المسارات الإدارية والمزودين والكتابات. يتم استخراج المسار من route segments مع encoding، ويُمرر access token داخليًا فقط إلى upstream. refres`
- `26: | BFF route tests | 4/4 Pass |`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `9: الـBFF الحالي fail-closed في النطاق المعتمد: يسمح فقط بقراءات `GET` لمساري الطلبات الموثقين، ويرفض المسارات الإدارية والمزودين والكتابات. يتم استخراج المسار من route segments مع encoding، ويُمرر access token داخليًا فقط إلى upstream. refres`
- `11: لم أوسّع allowlist إلى domains إضافية لأن ذلك يتطلب عقدًا موثقًا واختبارات ownership/field-level قبل تعريض بيانات صحية أو مالية للمتصفح.`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
