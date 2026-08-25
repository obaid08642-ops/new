# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/IMPLEMENTATION_BASELINE_PHASE0_AR.md`
- **Member SHA-256:** `23f0a4a9fdd4c54a3a671ae80db4728b6aa539888ac214fb02f3214e9db4d647`
- **Line count:** 36
- **Read range:** `1-36`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `27: | `web_admin_dashboard.zip` | `6f501ebd543a7c97dc2c2b3125fa563fd7e6e68fd087dc9d20bc4d5234c2a671` |`
- `32: لا تُنسخ أي secrets أو tokens أو ملفات `.env` إلى التقرير أو commit. لا يُستخدم `main` للتطوير المباشر. لا يُرفع branch قبل إغلاق اختبارات المرحلة وتوثيق diff.`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
