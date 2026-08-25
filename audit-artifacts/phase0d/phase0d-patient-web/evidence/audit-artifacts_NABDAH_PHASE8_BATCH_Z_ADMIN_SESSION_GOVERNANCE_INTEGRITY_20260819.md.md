# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE8_BATCH_Z_ADMIN_SESSION_GOVERNANCE_INTEGRITY_20260819.md`
- **Member SHA-256:** `15e7288fae5f5d27b54f2e5b87ff2607ea68e9ddb18617aecba602a529aa178f`
- **Line count:** 30
- **Read range:** `1-30`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: The Admin dashboard stored access token, refresh token, role and user object in `localStorage`. Several privileged pages then manually rebuilt a Bearer header from that browser storage, and the client-side guard treated the stored role as a`
- `11: | Login | Login, 2FA verification and passkey verification send `credentials: include`, allowing the Backend’s existing `nabd_admin_token` HttpOnly, `SameSite=Strict` cookie issuance to carry the session. No token, refresh token, role or us`
- `12: | Unified API client | Requests use `credentials: include` plus `X-Requested-With: NabdAdmin`; direct Bearer construction is removed. Authorization failures redirect to login without local token cleanup because no client token exists. |`
- `14: | Logout | Logout posts through the cookie session and then redirects, rather than deleting a local token. |`
- `15: | Audit logs and disputes | The remaining localStorage/Bearer consumers use the unified cookie client. The dispute UI no longer claims a completed financial refund from a force-cancel request; it states that a decision was submitted for ser`
- `22: | Admin session contract | **PASS** — Node test verifies cookie credentials, server `/auth/me` role check, logout call, and absence of browser persistence. |`
- `23: | Next.js production build | **PASS** — TypeScript, compilation and static generation completed (34 static pages). |`
- `26: | Branch upload | **PASS** — source commit `05d6b7c` (`fix: use cookie-only admin sessions`) is on `manus/on-live-reconciliation`. |`
- `30: The Backend was already configured with credentialed CORS and an HttpOnly/Strict admin cookie in the observed source; no production login was performed. Phase 11 must verify sandbox admin login/2FA, cookie set/expiry/logout, rejected cross-`
### backend_consumers_or_contracts
- `13: | AdminGuard | The guard resolves `/auth/me` through the cookie-authenticated API and accepts only a server-returned `admin` or `super_admin` role. It does not trust a browser-supplied role. |`
- `22: | Admin session contract | **PASS** — Node test verifies cookie credentials, server `/auth/me` role check, logout call, and absence of browser persistence. |`
### auth_ownership
- `1: # Phase 8 — Batch Z: Admin session and governance integrity`
- `5: The Admin dashboard stored access token, refresh token, role and user object in `localStorage`. Several privileged pages then manually rebuilt a Bearer header from that browser storage, and the client-side guard treated the stored role as a`
- `11: | Login | Login, 2FA verification and passkey verification send `credentials: include`, allowing the Backend’s existing `nabd_admin_token` HttpOnly, `SameSite=Strict` cookie issuance to carry the session. No token, refresh token, role or us`
- `12: | Unified API client | Requests use `credentials: include` plus `X-Requested-With: NabdAdmin`; direct Bearer construction is removed. Authorization failures redirect to login without local token cleanup because no client token exists. |`
- `13: | AdminGuard | The guard resolves `/auth/me` through the cookie-authenticated API and accepts only a server-returned `admin` or `super_admin` role. It does not trust a browser-supplied role. |`
- `14: | Logout | Logout posts through the cookie session and then redirects, rather than deleting a local token. |`
- `15: | Audit logs and disputes | The remaining localStorage/Bearer consumers use the unified cookie client. The dispute UI no longer claims a completed financial refund from a force-cancel request; it states that a decision was submitted for ser`
- `21: | Static storage/Bearer sweep | **PASS** — no `localStorage`, `sessionStorage`, or direct `Authorization: Bearer` in `src/`. |`
- `22: | Admin session contract | **PASS** — Node test verifies cookie credentials, server `/auth/me` role check, logout call, and absence of browser persistence. |`
- `24: | Archive integrity | **PASS** — rebuilt Admin archive validates with `unzip -tq`; `node_modules`, `.next`, output and coverage are excluded. |`
- `25: | Admin archive SHA-256 | `f7db82df6a5044a2109e303a2e3867180a8d1d46a503eb16de68574c5fa57205` |`
- `26: | Branch upload | **PASS** — source commit `05d6b7c` (`fix: use cookie-only admin sessions`) is on `manus/on-live-reconciliation`. |`
### state_transitions
- `15: | Audit logs and disputes | The remaining localStorage/Bearer consumers use the unified cookie client. The dispute UI no longer claims a completed financial refund from a force-cancel request; it states that a decision was submitted for ser`
- `23: | Next.js production build | **PASS** — TypeScript, compilation and static generation completed (34 static pages). |`
- `30: The Backend was already configured with credentialed CORS and an HttpOnly/Strict admin cookie in the observed source; no production login was performed. Phase 11 must verify sandbox admin login/2FA, cookie set/expiry/logout, rejected cross-`
### payment_insurance_relevance
- `15: | Audit logs and disputes | The remaining localStorage/Bearer consumers use the unified cookie client. The dispute UI no longer claims a completed financial refund from a force-cancel request; it states that a decision was submitted for ser`
- `24: | Archive integrity | **PASS** — rebuilt Admin archive validates with `unzip -tq`; `node_modules`, `.next`, output and coverage are excluded. |`
### error_empty_loading_retry_cancel
- `15: | Audit logs and disputes | The remaining localStorage/Bearer consumers use the unified cookie client. The dispute UI no longer claims a completed financial refund from a force-cancel request; it states that a decision was submitted for ser`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
