# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/PHASE7_HEALTH_SCORE_CONTRACT_DECISION_AR.md`
- **Member SHA-256:** `87953aaad399d2323712ca323f8850242b30cfffab2abac773f2872a5e344135`
- **Line count:** 5
- **Read range:** `1-5`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `5: المسار يحتاج BFF GET allowlist وserver-only session وSSR privacy test. لا تفتح أي POST/PATCH/DELETE في هذه المرحلة.`
### state_transitions
- `3: يثبت Backend `GET /health/score` ويحسب score من vitals/profile/sleep الأسبوعي. الـservice يصرح أن score يصبح `null` مع `insufficient_data` إذا لم توجد مكونات كافية، ولا يستخدم بيانات guessed. لأن response يحتوي recommendations نصية سريرية، `
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
