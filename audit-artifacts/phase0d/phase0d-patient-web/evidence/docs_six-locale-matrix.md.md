# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `docs/six-locale-matrix.md`
- **Member SHA-256:** `25e2b77037a5298d2ccd79ca17c7900cd667484b937e8fe02c197f62f8f93b98`
- **Line count:** 29
- **Read range:** `1-29`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `29: لذلك لا يفتح هذا الملف وحده عقوداً جديدة لOTP أو تفاصيل الرعاية المنزلية أو DTO الملف/العائلة أو تصنيف الكتالوج العام. تظل هذه البنود مسجلة ومقفلة حتى يصل نشر خلفي ومواصفة مختلفة فعلاً.`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
