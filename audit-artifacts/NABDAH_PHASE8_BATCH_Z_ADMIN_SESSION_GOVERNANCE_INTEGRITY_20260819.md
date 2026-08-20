# Phase 8 — Batch Z: Admin session and governance integrity

## Purpose

The Admin dashboard stored access token, refresh token, role and user object in `localStorage`. Several privileged pages then manually rebuilt a Bearer header from that browser storage, and the client-side guard treated the stored role as authority. A script-injection event could therefore exfiltrate privileged credentials or alter the browser role signal.

## Source change

| Surface | Implemented control |
|---|---|
| Login | Login, 2FA verification and passkey verification send `credentials: include`, allowing the Backend’s existing `nabd_admin_token` HttpOnly, `SameSite=Strict` cookie issuance to carry the session. No token, refresh token, role or user object is saved in browser storage. |
| Unified API client | Requests use `credentials: include` plus `X-Requested-With: NabdAdmin`; direct Bearer construction is removed. Authorization failures redirect to login without local token cleanup because no client token exists. |
| AdminGuard | The guard resolves `/auth/me` through the cookie-authenticated API and accepts only a server-returned `admin` or `super_admin` role. It does not trust a browser-supplied role. |
| Logout | Logout posts through the cookie session and then redirects, rather than deleting a local token. |
| Audit logs and disputes | The remaining localStorage/Bearer consumers use the unified cookie client. The dispute UI no longer claims a completed financial refund from a force-cancel request; it states that a decision was submitted for server-side review/execution. |

## Verification

| Gate | Result |
|---|---|
| Static storage/Bearer sweep | **PASS** — no `localStorage`, `sessionStorage`, or direct `Authorization: Bearer` in `src/`. |
| Admin session contract | **PASS** — Node test verifies cookie credentials, server `/auth/me` role check, logout call, and absence of browser persistence. |
| Next.js production build | **PASS** — TypeScript, compilation and static generation completed (34 static pages). |
| Archive integrity | **PASS** — rebuilt Admin archive validates with `unzip -tq`; `node_modules`, `.next`, output and coverage are excluded. |
| Admin archive SHA-256 | `f7db82df6a5044a2109e303a2e3867180a8d1d46a503eb16de68574c5fa57205` |
| Branch upload | **PASS** — source commit `05d6b7c` (`fix: use cookie-only admin sessions`) is on `manus/on-live-reconciliation`. |

## Acceptance limits

The Backend was already configured with credentialed CORS and an HttpOnly/Strict admin cookie in the observed source; no production login was performed. Phase 11 must verify sandbox admin login/2FA, cookie set/expiry/logout, rejected cross-origin and CSRF requests, access after role change, browser refresh, and all governed admin actions after reviewer-authorized deployment. The admin account’s 2FA remains a user-controlled production action and was not bypassed.
