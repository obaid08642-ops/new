# Phase 11 — sandbox read-only authorization wave 1

## Scope

This wave used only supplied sandbox accounts against the production API. It sent login and read-only GET requests; it did not create, edit, cancel, dispatch, pay, upload, delete or otherwise mutate a record. Tokens, account identifiers, names, emails, medical content and order identifiers were not retained in this artifact.

## Results

| Check | Result | Evidence |
|---|---|---|
| Patient sandbox authentication | **PASS** | `201`; token is returned in the documented nested token structure. |
| Patient identity read | **PASS** | `GET /auth/me` with extracted bearer credential returned `200`. |
| Patient1/Patient2 separation | **PASS** | Both logins and identity reads returned `201`/`200`; opaque identity comparison was distinct. |
| Patient1 owned order list/details | **PASS** | List returned `200` with seven sandbox records; selected owner detail returned `200`. |
| Patient2 foreign order detail | **PASS** | The same opaque Patient1 order identifier returned `403` for Patient2. |
| Doctor sandbox authentication/profile identity | **PASS** | Provider login returned `201`; `GET /provider/auth/me` with documented `access_token` returned `200`. |
| Doctor owned request queue | **PASS** | `GET /provider/requests?limit=1` returned `200`; empty queue is represented as an empty item list, not fabricated work. |
| Patient credential against provider-identity route | **CONTAINED** | Route returned `404`, which exposes no provider content and is treated as a fail-closed non-disclosure result. |

## Transport note

Shell HTTPS checks timed out on the legacy resolved-IP and DNS paths. Browser transport reached the production API; the attempted source health paths returned `404`, which is a route mismatch rather than evidence of service outage. The API contract used by the currently deployed client is confirmed by the successful `/api/v1/auth/login`, `/api/v1/auth/me`, `/api/v1/orders/*`, `/api/v1/provider/auth/*`, and `/api/v1/provider/requests` checks.

## Limits

This wave proves only the listed authentication, non-disclosure and order-ownership cases. It does not prove payments, clinical workflow transitions, notifications, realtime, storage, insurance, emergency, QR, consent, device behavior, translation/layout or deployment readiness.
