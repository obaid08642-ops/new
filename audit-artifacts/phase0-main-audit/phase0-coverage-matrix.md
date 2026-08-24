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
| Provider Nursing | dashboard + field ops; `semantic-evidence-provider-nursing-dashboard.md` | queue/respond/check-in/report/GPS; direct compatibility mapping added | silent empty/fallback observed | patient PHI/location/SOS risks | route and payload drift; selected-job context pending | FINDING/PARTIAL |
| Mobile Pharmacy | `semantic-evidence-mobile-pharmacy.md` | `/medicines`, categories; cart/prescription/order route mapping pending | loading/cache/empty; offline cached state | cache/account isolation pending | local cart add/qty; server price/stock/idempotency pending | PARTIAL/FINDING |
| Web↔Mobile Pharmacy parity | `semantic-evidence-web-mobile-pharmacy-parity.md` | Web public catalog + `/cart` read versus Mobile commerce surfaces | Web unavailable/empty/retry; Mobile wider states | Web session on cart; Mobile cache isolation pending | Web page read-only; Mobile local commerce pending | PARTIAL |
| Mobile Nursing | `semantic-evidence-mobile-nursing.md` | `/home-care/services`, packages; booking contract mapping pending | no explicit unavailable state; filters incomplete | JWT/guest policy pending | cash/insurance UI; quote/booking/idempotency pending | FINDING/PARTIAL |
| Backend Home-care compat | `semantic-evidence-backend-homecare-compat.md` | services/providers/bookings/state transitions/chat aliases | controller-level errors/guards | JWT, patient/provider/admin checks | event durability, chat idempotency/moderation pending | FINDING/PARTIAL |
| Admin Master Dashboard | `semantic-evidence-admin-master-dashboard.md` | liveness/readiness/heatmap/command-center | loading/empty; retry/staleness pending | admin guard helper; PHI minimization pending | polling read-only; detail authorization pending | FINDING/PARTIAL |
| Admin Config Portal | `semantic-evidence-admin-config-portal.md` | SLA GET/PUT; emergency maintenance PUT | alerts/console; structured failure pending | backend authorization/audit/re-auth pending | global mutations; replay/rollback pending | FINDING |
| Admin Security/Passkey | `semantic-evidence-admin-security-passkey.md` | passkey devices/enroll/verify/delete | loading/success/error | designated admin/2FA enforcement pending | enroll/delete; idempotency/re-auth/audit pending | FINDING/PARTIAL |
| Patient Web Settings | `semantic-evidence-patient-web-settings.md` | privacy/security/storage/sessions GET helpers | loading/unavailable/401/403/404/empty | patient session; DTO/PHI review pending | explicit read-only; no revoke/password/2FA mutation | READ-ONLY/PARTIAL |
| Mobile Settings index | `semantic-evidence-mobile-settings-index.md` | local routes to profile/security/privacy/notifications/support/terms/about | local loading/navigation; per-screen states pending | Redux logout; remote revocation pending | theme/language/calendar local; logout action | PARTIAL |
| Mobile Security Settings | `semantic-evidence-mobile-security-settings.md` | GET/PATCH `/users/me/security-settings`, POST password, GET/DELETE sessions | optimistic toggles; silent failure/empty session risk | JWT/session; re-auth and identifier reconciliation pending | security mutations/revoke; idempotency/replay pending | FINDING/PARTIAL |
| Mobile Privacy Settings | `semantic-evidence-mobile-privacy-settings.md` | GET/PATCH `/users/me/privacy-settings`, POST `/support/requests` deletion | optimistic toggles; silent failure; deletion status pending | JWT/identity assurance; consent/audit pending | privacy mutation/deletion; idempotency/replay pending | FINDING/PARTIAL |
| Mobile Notification Settings | `semantic-evidence-mobile-notification-settings.md` | GET/PATCH `/users/me/notification-settings` | optimistic toggles; emergency locked; delivery/reduced-motion pending | JWT; emergency policy pending | notification mutation; idempotency/retry pending | FINDING/PARTIAL |
| Mobile Notifications inbox | `semantic-evidence-mobile-notifications-inbox.md` | GET `/notifications`, POST read/read-all, deep-link translation | loading/error/empty/retry/filter/read states | ownership/PHI content pending | read acknowledgements; idempotency pending | FINDING/PARTIAL |
| Mobile Data Management | `semantic-evidence-mobile-data-management.md` | GET `/users/me/storage`; export/portability/delete callbacks empty | loading/empty conflation; no action result state | JWT; identity assurance pending | export/portability/delete unimplemented | FINDING/PARTIAL |
| Mobile Language Settings | `semantic-evidence-mobile-language-settings.md` | local `setLang` only | local selection; persistence/RTL pending | local context; locale sync pending | no backend mutation | FINDING/PARTIAL |
| Mobile Patient Profile | `semantic-evidence-mobile-profile.md` | loyalty GET and local navigation/guest guard | guest/auth branches; destination states pending | guest policy/route ownership pending | logout/local; remote revocation pending | FINDING/PARTIAL |

## Interpretation

`READ-ONLY` means the specific source page has no mutation; it does not mean the wider product contract is complete. `PARTIAL` means source evidence exists but one or more of contract, ownership, state, test, locale, accessibility, live or end-to-end dimensions remains unread. `FINDING` means a source-level issue candidate has direct evidence and must be classified with severity and acceptance criteria. `UNVERIFIED` remains the default for all surfaces not yet read semantically.

This matrix is a Phase 0 checkpoint, not a production readiness claim.
