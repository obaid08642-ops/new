# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/WEB_V2_SPECIALTIES_GATE_RESULT_AR.md`
- **Member SHA-256:** `c9dbd7cd2896c456916332e2b43ff1522ea8c0851921f589f0728609214b5e1c`
- **Line count:** 8
- **Read range:** `1-8`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `6: - `pnpm build`: PASS، وظهر route `/[locale]/consultations/specialties`.`
- `8: - التنفيذ public GET فقط؛ لا booking mutation.`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `7: - `pnpm test:sandbox`: BLOCKED بيئيًا؛ الاختبار توقف عند غياب `NABD_SANDBOX_BASE_URL`, `NABD_SANDBOX_OWNER_EMAIL`, و`NABD_SANDBOX_OWNER_PASSWORD`. لم يتم تخطيه ولم تُستخدم بيانات بديلة.`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
