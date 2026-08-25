# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE6_SECURITY_OWNERSHIP_PRIVACY_MATRIX_20260819.md`
- **Member SHA-256:** `1e41e69e0e214c820fcc85a6a77ba34ba854aa26272b3d963d261867f35da9bb`
- **Line count:** 31
- **Read range:** `1-31`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `9: | Patient → own medical report and AI report analysis | Patient only; no cross-patient report access | Server checks report patient ownership before report AI analysis | **PASS (narrow)** | Preserve ownership while repairing client route/pa`
- `10: | Patient → foreign report, booking, payment, notification | Deny foreign data/action | Multiple prior BOLA hardenings exist, but radiology detail/payment retry/list and client workflows have exceptions | **FIX/BLOCKED** | Enforce exact pat`
- `12: | Provider → patient work queue, PHI and payment | Assigned provider/facility/role only | Several queues use route drift/generic state; payment verify/list allow broad provider roles | **FIX/BLOCKED** | Bind assignment, facility/branch scop`
- `17: | Admin → PHI, KYC, bank, insurance, support | Minimum necessary, masked, view audited | Admin pages reveal broad raw profiles/JSON/IBAN/thread content | **FIX/BLOCKED** | Field-level DTO/masking, purpose/branch controls, step-up reveal and`
- `19: | Public → health/medical image, prescription, policy data | No sensitive upload/read without consent | Guest suggestion has generic owner; image/AI flows lack approved purpose-specific consent | **BLOCKED / FAIL-CLOSED** | Consent, anonymo`
- `21: | Payment / refund / payout | Owner/scoped staff, signed gateway, atomic ledger | Some amount calculation/server verification exists; retry pre-authorizes writes, broad staff list/verify, unsigned webhook and non-atomic state exist | **FIX/`
- `27: The later production sandbox matrix must cover: patient1/patient2 foreign IDs; unrelated/removed family member; unassigned versus assigned provider; cross-facility provider/hospital staff; patient/provider/finance/support/admin/super-admin `
### backend_consumers_or_contracts
- `10: | Patient → foreign report, booking, payment, notification | Deny foreign data/action | Multiple prior BOLA hardenings exist, but radiology detail/payment retry/list and client workflows have exceptions | **FIX/BLOCKED** | Enforce exact pat`
- `20: | WebSocket user → rooms/presence/waiting room | Relationship/appointment-bound subscriptions only | JWT at connection, thread/call checks; generic room join and waiting-room join lack membership control | **FIX/BLOCKED** | Strict server ro`
- `27: The later production sandbox matrix must cover: patient1/patient2 foreign IDs; unrelated/removed family member; unassigned versus assigned provider; cross-facility provider/hospital staff; patient/provider/finance/support/admin/super-admin `
### auth_ownership
- `1: # Phase 6 — consolidated security, ownership and privacy matrix`
- `9: | Patient → own medical report and AI report analysis | Patient only; no cross-patient report access | Server checks report patient ownership before report AI analysis | **PASS (narrow)** | Preserve ownership while repairing client route/pa`
- `11: | Patient → family chat/calendar/permissions | Active authorized family membership only | Family contract mismatch was confirmed; legacy membership use risks unauthorized personal namespace | **FIX/BLOCKED** | Canonical active-group members`
- `12: | Provider → patient work queue, PHI and payment | Assigned provider/facility/role only | Several queues use route drift/generic state; payment verify/list allow broad provider roles | **FIX/BLOCKED** | Bind assignment, facility/branch scop`
- `13: | Provider → KYC, profile images and documents | Private, purpose-bound processing | Storage has private owner check but generic public visibility and private Cloudinary raw-url fallback are possible | **FIX/BLOCKED** | Server-derived purpo`
- `15: | Admin → privileged controls | Verified session, permission and least privilege | JWT guard supports roles, but browser token/local role trust remains in Admin UI and several finance/governance controllers lack explicit role declaration | `
- `16: | Admin → impersonation | Case/purpose-limited and immutably audited | Guard writes audit but continues when audit write fails; header impersonation lacks scope/TTL/purpose | **FIX/BLOCKED** | Fail closed if audit fails; server-issued scope`
- `17: | Admin → PHI, KYC, bank, insurance, support | Minimum necessary, masked, view audited | Admin pages reveal broad raw profiles/JSON/IBAN/thread content | **FIX/BLOCKED** | Field-level DTO/masking, purpose/branch controls, step-up reveal and`
- `19: | Public → health/medical image, prescription, policy data | No sensitive upload/read without consent | Guest suggestion has generic owner; image/AI flows lack approved purpose-specific consent | **BLOCKED / FAIL-CLOSED** | Consent, anonymo`
- `21: | Payment / refund / payout | Owner/scoped staff, signed gateway, atomic ledger | Some amount calculation/server verification exists; retry pre-authorizes writes, broad staff list/verify, unsigned webhook and non-atomic state exist | **FIX/`
- `23: | Event/audit trail | Durable, ordered, scoped immutable evidence | Event bus can fan out after persistence failure; admin audit UI masks outage and claims unsupported integrity | **FIX/BLOCKED** | Transactional outbox, idempotent event ver`
- `27: The later production sandbox matrix must cover: patient1/patient2 foreign IDs; unrelated/removed family member; unassigned versus assigned provider; cross-facility provider/hospital staff; patient/provider/finance/support/admin/super-admin `
### state_transitions
- `5: This matrix consolidates only findings already confirmed in Phases 2–5. A **PASS** means a specific observed control exists; it does not override the broader release verdict. **FIX/BLOCKED** means no production readiness claim is permitted `
- `7: | Surface / actor | Required boundary | Confirmed current control | Verdict | Evidence / required remediation |`
- `10: | Patient → foreign report, booking, payment, notification | Deny foreign data/action | Multiple prior BOLA hardenings exist, but radiology detail/payment retry/list and client workflows have exceptions | **FIX/BLOCKED** | Enforce exact pat`
- `11: | Patient → family chat/calendar/permissions | Active authorized family membership only | Family contract mismatch was confirmed; legacy membership use risks unauthorized personal namespace | **FIX/BLOCKED** | Canonical active-group members`
- `12: | Provider → patient work queue, PHI and payment | Assigned provider/facility/role only | Several queues use route drift/generic state; payment verify/list allow broad provider roles | **FIX/BLOCKED** | Bind assignment, facility/branch scop`
- `14: | Provider → emergency/SOS/location/QR | Explicit legal/product approval and consent | Existing dashboards expose actions, but governance is unapproved | **BLOCKED / FAIL-CLOSED** | Disable all live emergency/QR/location operations pending `
- `19: | Public → health/medical image, prescription, policy data | No sensitive upload/read without consent | Guest suggestion has generic owner; image/AI flows lack approved purpose-specific consent | **BLOCKED / FAIL-CLOSED** | Consent, anonymo`
- `21: | Payment / refund / payout | Owner/scoped staff, signed gateway, atomic ledger | Some amount calculation/server verification exists; retry pre-authorizes writes, broad staff list/verify, unsigned webhook and non-atomic state exist | **FIX/`
- `22: | Privacy, consent, export and deletion | Versioned enforceable consent and legally approved rights workflow | UI consent keys do not match/enforce Backend; export/delete cards are no-op/support promise | **BLOCKED / FAIL-CLOSED** | Legal/p`
### payment_insurance_relevance
- `10: | Patient → foreign report, booking, payment, notification | Deny foreign data/action | Multiple prior BOLA hardenings exist, but radiology detail/payment retry/list and client workflows have exceptions | **FIX/BLOCKED** | Enforce exact pat`
- `12: | Provider → patient work queue, PHI and payment | Assigned provider/facility/role only | Several queues use route drift/generic state; payment verify/list allow broad provider roles | **FIX/BLOCKED** | Bind assignment, facility/branch scop`
- `17: | Admin → PHI, KYC, bank, insurance, support | Minimum necessary, masked, view audited | Admin pages reveal broad raw profiles/JSON/IBAN/thread content | **FIX/BLOCKED** | Field-level DTO/masking, purpose/branch controls, step-up reveal and`
- `21: | Payment / refund / payout | Owner/scoped staff, signed gateway, atomic ledger | Some amount calculation/server verification exists; retry pre-authorizes writes, broad staff list/verify, unsigned webhook and non-atomic state exist | **FIX/`
- `22: | Privacy, consent, export and deletion | Versioned enforceable consent and legally approved rights workflow | UI consent keys do not match/enforce Backend; export/delete cards are no-op/support promise | **BLOCKED / FAIL-CLOSED** | Legal/p`
- `27: The later production sandbox matrix must cover: patient1/patient2 foreign IDs; unrelated/removed family member; unassigned versus assigned provider; cross-facility provider/hospital staff; patient/provider/finance/support/admin/super-admin `
- `31: **NOT READY FOR RELEASE.** The matrix identifies no basis for enabling deferred emergency, QR, consent, health-image, privacy-rights, live payment or broad admin operations. Phase 8 remediation and later negative-case testing are mandatory.`
### error_empty_loading_retry_cancel
- `10: | Patient → foreign report, booking, payment, notification | Deny foreign data/action | Multiple prior BOLA hardenings exist, but radiology detail/payment retry/list and client workflows have exceptions | **FIX/BLOCKED** | Enforce exact pat`
- `14: | Provider → emergency/SOS/location/QR | Explicit legal/product approval and consent | Existing dashboards expose actions, but governance is unapproved | **BLOCKED / FAIL-CLOSED** | Disable all live emergency/QR/location operations pending `
- `21: | Payment / refund / payout | Owner/scoped staff, signed gateway, atomic ledger | Some amount calculation/server verification exists; retry pre-authorizes writes, broad staff list/verify, unsigned webhook and non-atomic state exist | **FIX/`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
