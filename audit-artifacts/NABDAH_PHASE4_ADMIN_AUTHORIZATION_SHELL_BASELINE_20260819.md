# Phase 4 Admin Dashboard — authorization-shell baseline

## Confirmed defects

| Priority | Finding | Evidence | Required remediation |
|---|---|---|---|
| **P0** | Route gate trusts browser-controlled `localStorage` role and token | `AdminGuard` grants all `/admin/*` rendering whenever `admin_token` exists and `admin_role === 'admin'`; both can be manually written by any browser user. | Enforce authentication/role/permission on every server/API operation and use verified session state; replace local role trust with protected token/session validation and permission-aware route guards. |
| **P0** | Admin bearer token is stored in `localStorage` | `admin_token` is directly read/removed from browser storage, exposing privileged credentials to any XSS/browser compromise. | Move to secure HTTP-only, SameSite session cookies or an equivalent protected session mechanism; add CSP/XSS hardening, rotation/revocation and explicit admin session expiry. |
| **P1** | Admin navigation has no per-permission/branch scope | All listed financial, KYC, emergency, user, catalog, security and audit pages render for any token marked `admin`; no least-privilege UI gate or branch/facility scope is represented. | Load server-issued permissions and permitted scopes; hide/deny unavailable navigation and independently enforce every operation server-side. |
| **P1** | Sidebar contains empty icon placeholders and Arabic-only fixed RTL interface | Each navigation icon is an empty string, and shell text/direction is hard-coded Arabic/RTL. | Use accessible vector icons, AR/EN/UR/HI/BN/FIL localization, intentional RTL/LTR switching, keyboard focus and responsive/mobile navigation validation. |
| **P1** | Security-page claim of mandatory 2FA is broader than the enrollment policy | Passkey service correctly checks a fresh database record, designated email and `admin/super_admin` role, and blocks removing the last credential; however it limits enrollment to one configured designated email while the Admin Dashboard language describes mandatory 2FA for the broader control panel. | Define and communicate the intended all-admin or designated-admin policy; enforce equivalent step-up/session policy for every privileged account and role. |
| **P1** | Browser shell does not align with the secure cookie session issued by passkey login | Passkey login sets HTTP-only `nabd_admin_token`/device cookies, while `AdminGuard` bases rendering on a separate `localStorage` token/role. | Unify the web application on verified HTTP-only session/cookie state, including session refresh, sign-out/revocation and UI bootstrap; eliminate parallel token stores. |

## Decision

Admin Dashboard authorization shell is **P0 FIX/BLOCKED**. Client-side rendering checks cannot be considered an authorization boundary for privileged healthcare, financial, security or emergency controls.
