# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE11_SANDBOX_READONLY_AUTHORIZATION_WAVE1_20260819.md`
- **Member SHA-256:** `8d095bf4285ac2ba92ef3417a06d2433fb66d66bae506dcdc03a3aa2e7f4905b`
- **Line count:** 26
- **Read range:** `1-26`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: This wave used only supplied sandbox accounts against the production API. It sent login and read-only GET requests; it did not create, edit, cancel, dispatch, pay, upload, delete or otherwise mutate a record. Tokens, account identifiers, na`
- `13: | Patient1/Patient2 separation | **PASS** | Both logins and identity reads returned `201`/`200`; opaque identity comparison was distinct. |`
- `16: | Doctor sandbox authentication/profile identity | **PASS** | Provider login returned `201`; `GET /provider/auth/me` with documented `access_token` returned `200`. |`
- `18: | Patient credential against provider-identity route | **CONTAINED** | Route returned `404`, which exposes no provider content and is treated as a fail-closed non-disclosure result. |`
- `22: Shell HTTPS checks timed out on the legacy resolved-IP and DNS paths. Browser transport reached the production API; the attempted source health paths returned `404`, which is a route mismatch rather than evidence of service outage. The API `
### backend_consumers_or_contracts
- `12: | Patient identity read | **PASS** | `GET /auth/me` with extracted bearer credential returned `200`. |`
- `16: | Doctor sandbox authentication/profile identity | **PASS** | Provider login returned `201`; `GET /provider/auth/me` with documented `access_token` returned `200`. |`
- `22: Shell HTTPS checks timed out on the legacy resolved-IP and DNS paths. Browser transport reached the production API; the attempted source health paths returned `404`, which is a route mismatch rather than evidence of service outage. The API `
### auth_ownership
- `1: # Phase 11 — sandbox read-only authorization wave 1`
- `5: This wave used only supplied sandbox accounts against the production API. It sent login and read-only GET requests; it did not create, edit, cancel, dispatch, pay, upload, delete or otherwise mutate a record. Tokens, account identifiers, na`
- `11: | Patient sandbox authentication | **PASS** | `201`; token is returned in the documented nested token structure. |`
- `12: | Patient identity read | **PASS** | `GET /auth/me` with extracted bearer credential returned `200`. |`
- `13: | Patient1/Patient2 separation | **PASS** | Both logins and identity reads returned `201`/`200`; opaque identity comparison was distinct. |`
- `14: | Patient1 owned order list/details | **PASS** | List returned `200` with seven sandbox records; selected owner detail returned `200`. |`
- `16: | Doctor sandbox authentication/profile identity | **PASS** | Provider login returned `201`; `GET /provider/auth/me` with documented `access_token` returned `200`. |`
- `22: Shell HTTPS checks timed out on the legacy resolved-IP and DNS paths. Browser transport reached the production API; the attempted source health paths returned `404`, which is a route mismatch rather than evidence of service outage. The API `
- `26: This wave proves only the listed authentication, non-disclosure and order-ownership cases. It does not prove payments, clinical workflow transitions, notifications, realtime, storage, insurance, emergency, QR, consent, device behavior, tran`
### state_transitions
- `5: This wave used only supplied sandbox accounts against the production API. It sent login and read-only GET requests; it did not create, edit, cancel, dispatch, pay, upload, delete or otherwise mutate a record. Tokens, account identifiers, na`
- `17: | Doctor owned request queue | **PASS** | `GET /provider/requests?limit=1` returned `200`; empty queue is represented as an empty item list, not fabricated work. |`
- `22: Shell HTTPS checks timed out on the legacy resolved-IP and DNS paths. Browser transport reached the production API; the attempted source health paths returned `404`, which is a route mismatch rather than evidence of service outage. The API `
### payment_insurance_relevance
- `5: This wave used only supplied sandbox accounts against the production API. It sent login and read-only GET requests; it did not create, edit, cancel, dispatch, pay, upload, delete or otherwise mutate a record. Tokens, account identifiers, na`
- `26: This wave proves only the listed authentication, non-disclosure and order-ownership cases. It does not prove payments, clinical workflow transitions, notifications, realtime, storage, insurance, emergency, QR, consent, device behavior, tran`
### error_empty_loading_retry_cancel
- `5: This wave used only supplied sandbox accounts against the production API. It sent login and read-only GET requests; it did not create, edit, cancel, dispatch, pay, upload, delete or otherwise mutate a record. Tokens, account identifiers, na`
- `17: | Doctor owned request queue | **PASS** | `GET /provider/requests?limit=1` returned `200`; empty queue is represented as an empty item list, not fabricated work. |`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
