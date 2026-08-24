# Semantic evidence — Provider Doctor Dashboard and ContractModal

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

## ContractModal

Source: `NabdProvider-provider/src/components/ContractModal.tsx`.

- Lines 23–30 fetch `/legal/policy/provider_agreement?lang=ar|en` and silently catch errors.
- Lines 60–88 render a hard-coded Arabic/English legal agreement when the policy is absent.
- Lines 116–122 POST `/legal/accept/provider_agreement`, swallow any error, then close the modal regardless of acceptance response.
- The source therefore contains a confirmed fail-open legal acceptance path and local legal fallback. This must be reconciled against the authoritative versioned legal policy contract before any release claim.
- The component only branches Arabic versus English; six-language coverage is not established here.

## DoctorDashboard

Source: `NabdProvider-provider/src/screens/doctor/DoctorDashboard.tsx`.

- Lines 174–180 create a Socket.IO client from `API_BASE` and authenticate with `(user as any)?.token`, then emit `joinProviderRoom` using `user.id`; server room membership and token contract require independent verification.
- Lines 192–210 read provider queue/stats routes and map responses with local defaults such as `Nabdah Patient`, `video`, `confirmed`, `Cash`, zero/empty values, and `Unscheduled` when fields are absent.
- Lines 223–240 call `/provider/jobs/{kind}/{id}/accept|reject` and immediately remove the item/show success after a response; idempotency, state transition, ownership, and retry/reconciliation require route-level proof.
- Lines 242–256 submit insurance status, copay, coverage and approval code from free-form client fields to `/provider/jobs/consultation/{id}/insurance`; server-owned quote/approval/state and audit requirements remain unverified.
- Lines 274–276 pass an empty icon value to statistic cards.
- Lines 294–310 construct visual type/payment badges with literal emoji/technical symbols and derived payment labels.
- Lines 383–400 expose patient name, national ID, date of birth, insurance policy/class and complaint in the insurance gatekeeper UI; minimum-PHI, purpose, role and masking requirements require explicit contract evidence.
- Lines 408–418 use Arabic-only status choices and placeholder examples (`e.g. 50`, `e.g. 150`, `e.g. NPH-9213`) in the insurance flow.

## Classification

These are confirmed source observations, not automatic release blockers. Each must be classified PASS/FIX/BLOCKED/INCONCLUSIVE only after matching the current Backend controller/DTO/role/ownership/state/audit contract and the corresponding tests or authorized Sandbox evidence. No source remediation is performed in Phase 0.
