# Provider AuthScreens: manual semantic review

## scope

تمت قراءة `src/screens/auth/AuthScreens.tsx` كاملًا، 1–907، من baseline `main @ 22526bedb77a3d8148219036367e4714f401aecc`.

## confirmed defects

| ID | evidence | defect | required resolution |
|---|---|---|---|
| P-AUTH-001 | lines 94–116 | biometric login failure can expose `API_BASE`, a port `8002`, and a backend-running debug instruction directly to end users | remove debug diagnostics from release UI; use generic support-safe errors and protected telemetry only |
| P-AUTH-002 | lines 446–448, 532–567 | a long press/logo/version opens an `Override API IP` UI and persists unvalidated custom host in Vault | remove from production binary; if needed for internal builds, compile-time gated, authenticated and allowlisted. Never provide end users a routing override |
| P-AUTH-003 | lines 287–296 | hardcoded trust claims include `MOH Certified` and `100% Saudi` with no verified status source | remove unless legal/compliance owner supplies approved evidence and controlled copy |
| P-AUTH-004 | lines 722–728 | password-reset `onResend` only shows `Code resent` locally; it makes no resend request | false success. Add explicit resend endpoint, rate limit/cooldown, target/session binding, abuse protection and genuine error/expiry states |
| P-AUTH-005 | lines 789–875 | pending approval UI hardcodes submitted/review/status/channel claims and `24 Hours`, not provider-specific status or policy | source approval status and next action from the backend; handle rejected/needs-action/suspended/expired states and approved communications copy |

## conditions that require exact backend reconciliation

| ID | evidence | required proof |
|---|---|---|
| P-AUTH-006 | lines 397–429 and security helpers imported at 19 | password/biometric route behavior, refresh token storage and revocation cannot be judged from this file; prove httpOnly/session model or secure native storage, device binding, logout/revocation, rate limits and owner/role resolution |
| P-AUTH-007 | lines 602–683 | reset endpoints and automatic login exist as client anchors; prove OTP issuance/TTL/single-use/replay lockout, enumeration resistance, password policy at server and code invalidation after reset |
| P-AUTH-008 | lines 321–336 | user chooses provider type before registration; backend must treat it as an application request, not as a trusted role grant, and approval must be enforced at every restricted mutation |

No production readiness claim may rely on animated/Auth visual completeness. Provider account identity, organization affiliation, credential verification, approval state, role elevation, device/session security and recovery must be validated in backend/data review and negative tests.


## PendingDashboard review

تمت قراءة `src/screens/auth/PendingDashboard.tsx` كاملًا، 1–137.

| ID | evidence | defect | required resolution |
|---|---|---|---|
| P-AUTH-009 | lines 24–28 | وجود `user.email` وحده يجعل `emailVerified=true`; لا يتحقق من `email_verified` أو حالة خادمية | derive verification state solely from a server-issued user/session claim refreshed after verification |
| P-AUTH-010 | lines 43–55 | OTP verification treats any successful HTTP response as verified without validating response shape or refreshing global identity state | require an explicit verified status, consume a single-use challenge, refresh signed session/user state and preserve failure/lockout behavior |
| P-AUTH-011 | line 131 | pending/unapproved provider can invoke `onExplore`; static source does not show a safe read-only route allowlist | enforce pending/suspended/rejected server-side on every restricted resource and expose only an audited, intentionally limited read-only surface |
| P-AUTH-012 | lines 119–128 | next steps are generic copy, not real application-document/credential/approval statuses | render a server sourced compliance checklist and action-required/rejection appeal state; do not present generic progress as factual status |
