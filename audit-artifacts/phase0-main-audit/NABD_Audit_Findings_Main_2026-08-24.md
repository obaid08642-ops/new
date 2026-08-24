# Nabd Plus — Main Root Audit Findings Register

**Baseline audited:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Audit branch:** `agent/audit-main-contract-inventory`  
**Audit mode:** source and contract traceability only; no feature remediation, deployment, migration, payment activation, or production mutation.

## Executive verdict

> **NO-GO for a 100% production-readiness claim.**

The baseline contains broad source coverage and many real backend routes, but the evidence does not prove that every Mobile/Web/Provider/Admin action maps to one authoritative route, schema, owner rule, state transition, error state, test and live behavior. Multiple P0/P1 findings remain, including provider route/payload drift, high-risk Admin controls, fabricated operational fallbacks, client-authoritative commerce values, incomplete ownership/idempotency evidence, and silent failure paths.

## Severity summary

| Severity | Count | Meaning |
|---|---:|---|
| P0 | 4 | Release-blocking security, operational or contract risk requiring closure before production claim. |
| P1 | 88 | Material correctness, security, parity, truthfulness or lifecycle gaps. |
| P2 | 6 | Important product/parity or governance gaps; may be scheduled only after launch scope decision. |
| Total | 98 | Confirmed source findings recorded to date. |

## Confirmed findings

The authoritative detailed register is `confirmed-findings-v1.md`; it contains F-001 through F-098 with direct file/line evidence and acceptance conditions. The latest expansion covers remaining Mobile Pharmacy, Community, Wallet, Offers, Map, Support and Settings surfaces. The findings are grouped below for reviewer triage.

### Security, identity and ownership

| IDs | Area | Core risk |
|---|---|---|
| F-001 | Patient Web BFF | Exported HTTP verbs exceed effective GET-only allowlist; mutation reachability is not established. |
| F-003 | Mobile auth | Legacy provider returns access/refresh tokens and fallback identity/role values to caller. |
| F-035 | Mobile profile/guest auth | Guest sign-in CTA dispatches logout instead of proving authentication entry, with partial guest gating and route-policy gaps. |
| F-036 | Mobile addresses | Address creation is not wired, while load/error, owner/idempotency and delivery eligibility are not proven. |
| F-010, F-018 | Chat | Read/send surfaces and PHI handling, participant ownership, moderation, rate limit and idempotency are not fully proven. |
| F-012, F-013, F-019 | Family/Insurance/Home-care | Consent, ownership, guest policy and insurance decision flow remain unresolved. |
| F-022 | Admin Passkey | 2FA enforcement/recovery/replay/audit lifecycle is asserted but not proven by the page evidence. |
| F-023 | Provider Nursing | Patient PHI and operational actions are exposed through drifted routes and fallback values. |
| F-028, F-029, F-030, F-031 | User settings/security/privacy/notifications | Backend mutations exist, but typed DTOs, re-auth/idempotency consistency, optimistic rollback, deletion lifecycle, notification delivery and session identifier reconciliation are not proven. |

### Truthfulness and data integrity

| IDs | Area | Core risk |
|---|---|---|
| F-004, F-005, F-006 | Provider Doctor/Nursing | Hard-coded legal/operational fallbacks, silent failures and unverified SOS/refund claims. |
| F-017 | Mobile Diagnostics | API failure and empty state conflation; client-derived cart price/name fields. |
| F-020 | Admin telemetry | Invalid coordinates become synthetic map positions; failed fetches lack visible retry; localhost fallback exists. |
| F-024, F-025 | Pharmacy parity | Web commerce is read-only/noindex while Mobile uses local cart/cache without complete server reconciliation proof. |
| F-027 | Provider Radiology | Failed inbox becomes empty/zero dashboard; safety data and mutation lifecycle require clinical integrity proof. |
| F-037 | Mobile medical profile | Medical profile and avatar updates span multiple requests with incomplete PHI/media integrity evidence. |
| F-038 | Mobile health home | Health/appointment summary state and waiting-room navigation need truthfulness and ownership proof. |
| F-039 | Mobile vitals | Manual vital mutation lacks complete clinical validation, idempotency, replay and ownership evidence. |
| F-030 | Mobile privacy | Privacy toggles and data deletion use optimistic/silent paths with unverified legal/security claims and incomplete request lifecycle. |
| F-036 | Mobile address data | Address add/edit/delete and delivery eligibility are incomplete; default selection needs contract/ownership/idempotency proof. |
| F-037 | Mobile medical profile | Sensitive medical and avatar mutations lack complete atomicity, upload policy, ownership and replay evidence. |
| F-038 | Mobile health home | Health reads and appointment navigation contain silent failures, fabricated identifier fallback and unverified modality. |
| F-040 | Mobile medication reminders | Local dose aggregation and “sync alerts” navigation do not prove notification/dose state reconciliation. |
| F-039 | Mobile vitals log | Vital submissions need finite/range/unit validation and duplicate/replay/audit proof. |
| F-041 | Mobile prescription data | Prescription CTA and sharing expose contract/PHI/OCR provenance gaps. |
| F-043 | Mobile family sharing | Group creation and member-health actions lack complete consent/ownership/revocation evidence. |
| F-045 | Mobile family health | Member record display, proxy booking and family chat require explicit permission and consent trace. |
| F-046 | Mobile family invite | Bearer invite creation and sharing require expiry, audience, revoke, abuse and audit controls. |
| F-047 | Mobile permission request | Permission response needs exact request identity, explicit scope selection and real dependency/error/idempotency proof. |
| F-048 | Mobile pharmacy checkout | Checkout must be server-authoritative and idempotent across cash/card/wallet/insurance branches. |
| F-049 | Mobile insurance | Policy load/save must distinguish failure from empty and prove validation, eligibility and persisted truth. |
| F-050 | Mobile family join | Join preview/accept/reject are conflated and local group/permission data is fabricated. |
| F-051 | Mobile family QR | QR parsing lacks issuer/origin/audience/lifecycle validation and recovery semantics. |
| F-052 | Mobile family chat | Membership, idempotent send, delivery/moderation/PHI semantics and realtime contract are unproven. |
| F-053 | Mobile pharmacy payment | Payment/order transitions and insurance/cash reconciliation require server-state and replay proof. |
| F-054 | Mobile nursing details | Provider error/claims/prescription/slot/quote/payment semantics are incomplete. |
| F-055 | Web cart | Web cart remains read-only without commerce continuation. |
| F-056 | Mobile orders center | Unified order routes/status/error handling are not resource-specific or fully reconciled. |
| F-057 | Mobile reorder | Reorder needs server revalidation, context consent and idempotent error/replay semantics. |
| F-058 | Mobile order confirmation | Basket approve/reject and partial availability need state, ownership, idempotency and consent proof. |
| F-059 | Mobile insurance add policy | OCR/manual policy save needs validation, privacy, ownership, idempotency and eligibility lifecycle proof. |
| F-060 | Mobile coverage check | Coverage/preauthorization result needs typed policy/provider context and a real authorization lifecycle. |
| F-061 | Mobile medical reports | Report read/share flows need owner, mark-read, validation and PHI export controls. |
| F-062 | Mobile report AI | AI report analysis is blocked but its CTA drops context and lacks governed UX/contract. |
| F-063 | Mobile return detail | Return failure path renders synthetic financial data and lacks settlement/ownership semantics. |
| F-064 | Mobile return request | Return policy/amounts/attachments/success ID are locally fabricated or unverified. |
| F-065 | Mobile active programs | Empty/error programs fall back to a synthetic clinical program and attendance is false-success. |
| F-066 | Mobile reviews | Review write lacks eligibility, ownership, idempotency and moderation status proof. |
| F-067 | Mobile video room | Video join route/token/end-call lifecycle is not reconciled or fully guarded. |
| F-068 | Mobile services hub | Static service catalogue advertises unverified routes and capabilities without blocked states. |
| F-069 | Mobile search | Search state, local query retention, sponsored provenance and result routes are unverified. |
| F-070 | Mobile support chat | Support destination is an unproven redirect and can lose preauthorization context. |
| F-071 | Mobile help center | FAQ/config/contact failure and availability semantics are incomplete or unverified. |
| F-072 | Mobile health passport | PHI sharing and QR/profile failure/lifecycle controls are not proven; emergency call is false-success. |
| F-073 | Mobile medical timeline | Timeline failure and document download states are untruthful or lack typed PHI/ownership controls. |
| F-074 | Mobile insurance network | Provider failures/queries/filters and coverage/booking handoffs are not fully typed or verified. |
| F-075 | Mobile insurance policy detail | Policy display/verification/PHI and coverage context are not fully owner-scoped or lifecycle-backed. |
| F-076 | Mobile insurance refund status | Refund failure/status/settlement/linkage semantics are incomplete or unverified. |
| F-077 | Mobile insurance claims | Claim creation lacks policy/evidence/ownership/idempotency and truthful server lifecycle. |
| F-078 | Mobile insurance payment split | Zero-copay and payment settlement/reconciliation controls are incomplete or unverified. |
| F-079 | Mobile insurance hub | Policy/coverage/CHI-scraped data and linked claim/benefit routes are not fully server-authoritative. |
| F-080 | Mobile insurance benefits | Limits/renewal/coverage values include stale or hard-coded semantics. |
| F-081 | Mobile nursing tracking | Tracking failures/statuses/completion/location/PHI and contact semantics are incomplete or unverified. |
| F-082 | Mobile nursing booking profile | Provider/slot/quote/insurance booking controls and success lifecycle are incomplete or unverified. |
| F-083 | Mobile nursing service info | Service detail/price/insurance/availability and booking handoff semantics are incomplete or unverified. |
| F-084 | Mobile pharmacy barcode scanner | Camera/barcode/AI identification and product handoff controls are incomplete or unverified. |
| F-085 | Mobile pharmacy product detail | Local cart/Rx/price controls and catalog suggestion lifecycle are incomplete or unverified. |
| F-086 | Mobile drug-not-found flow | Manual shortage request/image upload and false-success lifecycle are incomplete or unverified. |
| F-087 | Mobile pharmacy checkout/payment | Client prescription/price/local-total trust and incomplete quote/ownership/replay/reconciliation semantics remain. |
| F-088 | Mobile pharmacy chat | Competing chat implementations and divergent thread/socket/false-action semantics remain. |
| F-089 | Mobile pharmacy order lifecycle | Tracking/confirmation/waiting states simplify server truth and lack complete mutation/reconciliation semantics. |
| F-090 | Mobile pharmacy catalog actions | Search/filter/compare/wishlist contain fallback/local behavior and an unimplemented cart action. |
| F-091 | Mobile prescription evidence | Manual/RX/scan flows use unvalidated local/base64 evidence and zero-priced/client-copied lines. |
| F-092 | Mobile wallet cards/transfer | Hard-coded test-card submission, local default selection and unguarded free-text transfer actions remain. |
| F-093 | Mobile wallet topup/ledger | Amount, idempotency, ledger reconciliation, hosted return and duplicate-credit states remain unproven. |
| F-094 | Mobile offers | Untyped pricing/expiry/provider handoff and absent purchase/redeem lifecycle remain. |
| F-095 | Mobile map | Location fallback, derived ETA, client insurance comparison and provider-only booking handoff remain. |
| F-096 | Mobile support/community | Synthetic/false conversational states, lost ticket context and missing moderation/PHI controls remain. |
| F-097 | Mobile settings security/privacy/notifications | Optimistic defaults and silent failures can misstate consent/security/notification state. |
| F-098 | Mobile settings data/support/legal/language | Nonfunctional data actions, feedback false-success, hard-coded claims and incomplete locale assurance remain. |
| F-044 | Mobile family permissions | Sensitive delegation can fall back across authorization paths and report false success without step-up/audit proof. |
| F-046 | Mobile family invite | Invite lifecycle and optional metadata are not proven to be bound to an owner-scoped contract. |
| F-045 | Mobile family member health | PHI access failure is rendered as normal empty data; proxy booking/chat lack member consent context. |
| F-042 | Mobile medication reminders | Add/edit reminder, notification preference and local scheduling are non-atomic and incompletely reconciled. |
| F-043 | Mobile family hub | Family creation and member health-sharing surfaces require explicit consent, ownership, and replay/audit controls. |
| F-044 | Mobile family permissions | Proxy booking/payment/pharmacy/location/emergency grants require strict consent, step-up and auditable revoke controls. |
| F-040 | Mobile medications | Reminder progress, device-alert synchronization and dose lifecycle require server/timezone/delivery proof. |
| F-042 | Mobile reminder mutation | Reminder save and notification scheduling span separate steps without replay/partial-failure proof. |
| F-041 | Mobile prescriptions | Prescription loading, ordering linkage, sharing and OCR claims require explicit error, ownership and PHI controls. |
| F-034 | Mobile language/RTL | Locale persistence, RTL reinitialization and six-language completeness are unproven; flags render empty. |
| F-031, F-032 | Mobile notifications | Preference and read acknowledgements have optimistic/fire-and-forget semantics, while delivery, route translation and PHI content policy are not fully proven. |
| F-034 | Localization | The Mobile locale selector does not prove persistence/synchronization/RTL behavior and renders empty flag slots. |
| F-028, F-029, F-030, F-031, F-032, F-035, F-036, F-037, F-038, F-039, F-041, F-043, F-044, F-045, F-046, F-047, F-048, F-049, F-050, F-051, F-052, F-053, F-054, F-055, F-056, F-057, F-058, F-059, F-060, F-061, F-062, F-063, F-064, F-065, F-066, F-067, F-068, F-069, F-070, F-071 | Patient parity | Web is read-only while Mobile exposes security/privacy/notification/profile/address/health/prescription/family actions with incomplete contract, guest policy, consent and failure semantics. |

### Contract, state and end-to-end parity

| IDs | Area | Core risk |
|---|---|---|
| F-007, F-008, F-009, F-014, F-015 | Patient Web | Service detail, prescription, diagnostics booking and medicine route continuity are incomplete or inconsistent. |
| F-016 | Unified booking | Lock TTL is 5 minutes in one service definition versus required 10 minutes; release ownership is not validated. |
| F-018, F-023, F-026, F-027, F-048, F-053, F-054, F-055, F-056 | Provider/patient operations | Consumer routes/payloads, commerce/payment transitions and unified order detail routes are not fully reconciled; operational lifecycle tests are missing. |

## P0 release blockers

| ID | Blocker | Minimum closure evidence |
|---|---|---|
| F-021 | Admin SLA and emergency kill-switch control plane | Backend role/audit/rollback proof; no hard-coded identity; re-auth/approval/replay protection; failure and rollback tests. |
| F-023 | Provider Nursing route/payload drift and fabricated operational values | Exact method/path/body reconciliation; live 401/404/2xx checks; visible failure states; real selected booking context; provider/stranger/unauth/state tests. |
| F-021 plus F-023 | Operational governance and PHI | Least privilege, audit events, PHI minimization, incident/rollback evidence and no silent fallback of safety-critical data. |
| F-087, F-092, F-093 | Commerce and financial truthfulness | Client-authoritative or un-reconciled financial state, hard-coded payment data and missing replay/settlement evidence. |
| F-096, F-097 | PHI and consent integrity | False support/social state, unsafe sharing and silently changed consent/security/notification preferences. |

## Verification gaps still open

These are not downgraded to PASS merely because source/index artifacts exist: all six-locale completeness; accessibility labels and keyboard navigation; every imported Provider/Admin screen; cache-control and PHI exposure; exact owner/stranger responses; DTO/schema/repository/migration trace; outbox/event durability; payment settlement/refund; Sandbox replay and cleanup; Docker/CI; visual parity; performance; SEO/indexing policy; and complete end-to-end journeys for cash, insurance and card across every service.

## Required closure rule

A finding can be closed only with: (1) first-party code evidence at a fixed commit, (2) exact contract and schema evidence, (3) authentication/role/ownership tests, (4) state/error/loading/empty/retry tests, (5) localization/accessibility review, (6) live or approved Sandbox evidence for transactional behavior, and (7) a pushed commit whose remote head is verified by `git ls-remote`. A passing build alone is insufficient.

## Current disposition

`OPEN/PARTIAL — NO-GO`. This report is a traceability and risk register, not authorization to build or deploy. Remediation must begin only after Phase 0 review approval and after all `DECISION_REQUIRED` items in `NABD_DECISION_REQUIRED_2026-08-24.md` have owners and explicit decisions. The additional findings F-087–F-098 are source-confirmed and do not represent completed fixes.
