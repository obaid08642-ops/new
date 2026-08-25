# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/full-audit-20260823/PHASE9_SECURITY_DEPENDENCY_REVIEW_AR.md`
- **Member SHA-256:** `59a0939ff09d6ff6f35bb55b54c0f31826581a5bb766db3fea57eaa42067eba6`
- **Line count:** 45
- **Read range:** `1-45`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: فحص production source لم يجد `localStorage` أو `sessionStorage` أو `document.cookie` لحفظ access/refresh/exchange tokens، ولم يجد direct browser calls إلى `api.nabd.plus` في السطوح المراجعة. طبقة BFF هي الحد الفاصل، وallowlist العامة مقيّدة`
- `22: يلزم أيضاً اختبار CSP/security headers على production response، session fixation/logout/refresh rotation، CSRF posture لكل mutation، rate limits، payload size limits، log redaction، replay/idempotency، owner/stranger/unauth، وعدم تسريب prov`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `5: فحص production source لم يجد `localStorage` أو `sessionStorage` أو `document.cookie` لحفظ access/refresh/exchange tokens، ولم يجد direct browser calls إلى `api.nabd.plus` في السطوح المراجعة. طبقة BFF هي الحد الفاصل، وallowlist العامة مقيّدة`
- `22: يلزم أيضاً اختبار CSP/security headers على production response، session fixation/logout/refresh rotation، CSRF posture لكل mutation، rate limits، payload size limits، log redaction، replay/idempotency، owner/stranger/unauth، وعدم تسريب prov`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- `22: يلزم أيضاً اختبار CSP/security headers على production response، session fixation/logout/refresh rotation، CSRF posture لكل mutation، rate limits، payload size limits، log redaction، replay/idempotency، owner/stranger/unauth، وعدم تسريب prov`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
