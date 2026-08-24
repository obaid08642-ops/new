# Nabd Plus Phase 0 coverage matrix — semantic checkpoint

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`  
Branch: `agent/audit-main-contract-inventory`  
Scope: audit only; no behavior remediation.

| Surface / journey | Evidence read | Backend/API contract | UI states | Ownership/security | Mutation/transaction | Status |
|---|---|---|---|---|---|---|
| Web auth/login | login page, BFF auth routes pending | partial | partial | partial | unverified | PARTIAL |
| Mobile auth/session | `api.ts`, `EmailAuthProvider` | partial | unverified | token model mismatch candidate | login/logout | PARTIAL |
| Web BFF patient catch-all | route + allowlist | GET allowlist confirmed | n/a | httpOnly refresh observed | all non-GET rejected | PARTIAL |
| Consultations list/detail/slots | doctors pages | public read helpers | unavailable/empty/slots | booking auth pending | booking form pending | PARTIAL |
| Appointment booking | form + BFF | POST `/unified-bookings` forwarded | submitting/401/409/failure | cookie + idempotency | POST + replay pending | PARTIAL |
| Appointment payment | payment intent BFF/helpers | POST `/payments/intent/:kind/:id` | response parser | cookie/idempotency | settlement/expiry/refund pending | PARTIAL |
| Appointment cancel/reschedule | BFF routes | POST cancel; PATCH reschedule | response only | cookie/idempotency | owner/state/replay pending | PARTIAL |
| Appointment call-token | BFF route | GET `/unified-bookings/:id/call-token` | no UI read here | cookie/response strip | TTL/window pending | PARTIAL |
| Diagnostics Labs | labs page | public services helper | unavailable/empty/no-match | public read | no CTA | READ-ONLY |
| Diagnostics Radiology | radiology page | services + modalities helpers | unavailable/empty/no-match/detailBlocked | public read | detail/booking blocked | READ-ONLY/BLOCKED |
| Home-care catalog/detail | services pages | service helpers | unavailable/empty/detail notice | public/access contract pending | no booking CTA | READ-ONLY |
| Pharmacy cart/checkout | cart + checkout pages | `/cart`, `/cart/checkout` GET | unavailable/empty/retry | patient session | no mutation in page | READ-ONLY/PARTIAL |
| Pharmacy orders | list/detail/tracking | list/detail/tracking helpers | unavailable/empty/retry | owner isolation pending | no cancel/reorder/refund | READ-ONLY/PARTIAL |
| Medicines | list/detail | patient/public helpers | unavailable/empty/retry | identifier validation | no cart/purchase CTA | READ-ONLY |
| Health/vitals | health page | vital summary helper | unavailable/empty | PHI/session pending | no mutation | READ-ONLY/PARTIAL |
| Prescriptions | prescriptions page | patient prescriptions helper | unavailable/empty/retry | PHI/session pending | no detail/upload/renew | READ-ONLY/PARTIAL |
| Profile | profile page | profile/medical/insurance reads | domain states | field allowlist observed | no edit | READ-ONLY/PARTIAL |
| Family | family page | members/group reads | unavailable/empty | ownership pending | no add/invite/remove | READ-ONLY/PARTIAL |
| Insurance | policy/benefits/claims reads | summary + claims | unavailable/empty | ownership pending | no submit/preauth/checkout | READ-ONLY/PARTIAL |
| Notifications | notifications page | patient notifications read | unavailable/empty | session pending | no mark-read/delete | READ-ONLY |
| Notification settings | settings page | settings read | unavailable/retry | emergency locked UI | no update | READ-ONLY |
| Chat | thread read | thread/messages helpers | unavailable/empty | PHI hidden in UI; API/log pending | no send/upload/realtime | READ-ONLY/PARTIAL |
| Provider Doctor | dashboard + ContractModal | queue/stats/accept/reject/insurance | fallback/silent fail observed | patient PHI + socket token risks | legal accept failure swallowed | FINDING |
| Provider Nursing | dashboard + field ops | queue/respond/check-in/report/GPS | silent empty/fallback observed | location/SOS risks | route drift/fallbacks | FINDING |

## Interpretation

`READ-ONLY` means the specific source page has no mutation; it does not mean the wider product contract is complete. `PARTIAL` means source evidence exists but one or more of contract, ownership, state, test, locale, accessibility, live or end-to-end dimensions remains unread. `FINDING` means a source-level issue candidate has direct evidence and must be classified with severity and acceptance criteria. `UNVERIFIED` remains the default for all surfaces not yet read semantically.

This matrix is a Phase 0 checkpoint, not a production readiness claim.
