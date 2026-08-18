# Phase 4 Admin Dashboard — authorization-shell baseline

## Confirmed defects

| Priority | Finding | Evidence | Required remediation |
|---|---|---|---|
| **P0** | Route gate trusts browser-controlled `localStorage` role and token | `AdminGuard` grants all `/admin/*` rendering whenever `admin_token` exists and `admin_role === 'admin'`; both can be manually written by any browser user. | Enforce authentication/role/permission on every server/API operation and use verified session state; replace local role trust with protected token/session validation and permission-aware route guards. |
| **P0** | Admin bearer token is stored in `localStorage` | `admin_token` is directly read/removed from browser storage, exposing privileged credentials to any XSS/browser compromise. | Move to secure HTTP-only, SameSite session cookies or an equivalent protected session mechanism; add CSP/XSS hardening, rotation/revocation and explicit admin session expiry. |
| **P1** | Admin navigation has no per-permission/branch scope | All listed financial, KYC, emergency, user, catalog, security and audit pages render for any token marked `admin`; no least-privilege UI gate or branch/facility scope is represented. | Load server-issued permissions and permitted scopes; hide/deny unavailable navigation and independently enforce every operation server-side. |
| **P1** | Sidebar contains empty icon placeholders and Arabic-only fixed RTL interface | Each navigation icon is an empty string, and shell text/direction is hard-coded Arabic/RTL. | Use accessible vector icons, AR/EN/UR/HI/BN/FIL localization, intentional RTL/LTR switching, keyboard focus and responsive/mobile navigation validation. |

## Decision

Admin Dashboard authorization shell is **P0 FIX/BLOCKED**. Client-side rendering checks cannot be considered an authorization boundary for privileged healthcare, financial, security or emergency controls.
