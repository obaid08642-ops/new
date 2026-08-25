# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE4_ADMIN_AUTHORIZATION_SHELL_BASELINE_20260819.md`
- **Member SHA-256:** `65c006a5795941dfa5bb89ba0af7e6aa497e9dffcfd1f69f3532252d9882b0b7`
- **Line count:** 16
- **Read range:** `1-16`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `7: | **P0** | Route gate trusts browser-controlled `localStorage` role and token | `AdminGuard` grants all `/admin/*` rendering whenever `admin_token` exists and `admin_role === 'admin'`; both can be manually written by any browser user. | Enf`
- `9: | **P1** | Admin navigation has no per-permission/branch scope | All listed financial, KYC, emergency, user, catalog, security and audit pages render for any token marked `admin`; no least-privilege UI gate or branch/facility scope is repre`
- `11: | **P1** | Security-page claim of mandatory 2FA is broader than the enrollment policy | Passkey service correctly checks a fresh database record, designated email and `admin/super_admin` role, and blocks removing the last credential; howeve`
- `12: | **P1** | Browser shell does not align with the secure cookie session issued by passkey login | Passkey login sets HTTP-only `nabd_admin_token`/device cookies, while `AdminGuard` bases rendering on a separate `localStorage` token/role. | U`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `1: # Phase 4 Admin Dashboard — authorization-shell baseline`
- `7: | **P0** | Route gate trusts browser-controlled `localStorage` role and token | `AdminGuard` grants all `/admin/*` rendering whenever `admin_token` exists and `admin_role === 'admin'`; both can be manually written by any browser user. | Enf`
- `8: | **P0** | Admin bearer token is stored in `localStorage` | `admin_token` is directly read/removed from browser storage, exposing privileged credentials to any XSS/browser compromise. | Move to secure HTTP-only, SameSite session cookies or `
- `9: | **P1** | Admin navigation has no per-permission/branch scope | All listed financial, KYC, emergency, user, catalog, security and audit pages render for any token marked `admin`; no least-privilege UI gate or branch/facility scope is repre`
- `11: | **P1** | Security-page claim of mandatory 2FA is broader than the enrollment policy | Passkey service correctly checks a fresh database record, designated email and `admin/super_admin` role, and blocks removing the last credential; howeve`
- `12: | **P1** | Browser shell does not align with the secure cookie session issued by passkey login | Passkey login sets HTTP-only `nabd_admin_token`/device cookies, while `AdminGuard` bases rendering on a separate `localStorage` token/role. | U`
- `16: Admin Dashboard authorization shell is **P0 FIX/BLOCKED**. Client-side rendering checks cannot be considered an authorization boundary for privileged healthcare, financial, security or emergency controls.`
### state_transitions
- `3: ## Confirmed defects`
- `7: | **P0** | Route gate trusts browser-controlled `localStorage` role and token | `AdminGuard` grants all `/admin/*` rendering whenever `admin_token` exists and `admin_role === 'admin'`; both can be manually written by any browser user. | Enf`
- `10: | **P1** | Sidebar contains empty icon placeholders and Arabic-only fixed RTL interface | Each navigation icon is an empty string, and shell text/direction is hard-coded Arabic/RTL. | Use accessible vector icons, AR/EN/UR/HI/BN/FIL localiza`
- `12: | **P1** | Browser shell does not align with the secure cookie session issued by passkey login | Passkey login sets HTTP-only `nabd_admin_token`/device cookies, while `AdminGuard` bases rendering on a separate `localStorage` token/role. | U`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `10: | **P1** | Sidebar contains empty icon placeholders and Arabic-only fixed RTL interface | Each navigation icon is an empty string, and shell text/direction is hard-coded Arabic/RTL. | Use accessible vector icons, AR/EN/UR/HI/BN/FIL localiza`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
