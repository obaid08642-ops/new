# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/WEB_V2_HOMECARE_SERVICES_GATE_RESULT_AR.md`
- **Member SHA-256:** `f54c7011bad334acacfc8d4620a4a12149cdf656e70dfba8ac6bd13d194587f9`
- **Line count:** 8
- **Read range:** `1-8`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `8: - لا يتم تنفيذ booking mutation من هذا slice؛ العقد المنفذ GET public فقط.`
### backend_consumers_or_contracts
- `5: - `pnpm build`: PASS، وظهرت `/[locale]/home-care/services` و`/[locale]/home-care/services/[serviceId]`.`
### auth_ownership
- `7: - `pnpm test:sandbox`: BLOCKED بيئيًا عند غياب `NABD_SANDBOX_BASE_URL`, `NABD_SANDBOX_OWNER_EMAIL`, و`NABD_SANDBOX_OWNER_PASSWORD`. لم تُستخدم بيانات بديلة ولم يُتجاوز الاختبار.`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
