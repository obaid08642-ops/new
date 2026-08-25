# Phase 0B semantic evidence — Admin authority and manual control plane

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/admin-authority/admin-authority.module.ts:2–291`

`AdminAuthorityService` spans appointments, orders, labs, radiology, users and an admin action log (`admin-authority.module.ts:18–43`). `logAction` writes before/after snapshots and emits an event, but both paths swallow failures (`45–48`). Force cancel/complete/reassign operations load records by raw ID, mutate state and append history, then save without visible transition legality, current-state/version predicate, idempotency, payment/refund/notification orchestration or target relationship validation (`50–147`). Appointment reschedule writes raw `new_time` as a Date and marks `RESCHEDULED` without visible slot lock/capacity or timezone validation (`150–184`).

Provider suspension toggles a user `active` flag without visible provider-profile, booking, credential or notification reconciliation (`187–203`). Impersonation signs a JWT containing target identity, email, phone, role, permissions and nested admin identity, returning the token and user data directly; no visible short TTL, audience/purpose, session revocation, consent banner, target restriction or cookie-only delivery is present (`206–239`). Action listing returns up to 500 broad log documents using raw filters and no visible projection/tenant/time pagination (`241–247`).

The controller is JWT+ADMIN metadata and exposes force cancel/confirm/reschedule/complete/reassign, insurance overrides, provider suspend/unsuspend, impersonation and action logs. Bodies are raw and mutations have no visible idempotency, dual approval, state allowlist or amount/payment policy (`251–276`). Module registers several domain models and the action log (`278–291`).

No product code was changed and no tests/builds were executed during this semantic read.

## Findings candidates

The read supports: arbitrary admin state/payment/insurance control, non-atomic side effects, raw snapshot PII, unsafe impersonation token issuance, weak provider suspension reconciliation, appointment reschedule integrity gaps and audit/event best-effort behavior.
