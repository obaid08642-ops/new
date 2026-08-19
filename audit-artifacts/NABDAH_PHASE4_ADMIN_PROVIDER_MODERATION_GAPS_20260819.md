# Phase 4 Admin Dashboard — provider moderation and KYC review gaps

## Confirmed positive alignment

The moderation page uses the protected provider detail and onboarding/delta endpoints rather than presenting seeded providers. It also loads a detailed provider file before exposing approval controls. This is a useful basis, but the decision workflow remains incomplete.

## Confirmed defects

| Priority | Finding | Evidence | Required remediation |
|---|---|---|---|
| **P0** | Provider approval is an immediate one-click activation action without a decision record/UI confirmation | `handleApprove` posts an empty body and immediately announces the provider is active/visible; UI captures no verifier attestation, checklist, document outcome, expiry, decision reason, maker-checker confirmation or returned status/reference. | Require an approved KYC/credential decision DTO with checklist evidence, reason codes, reviewer identity, timestamps, optional second approver for high-risk changes, idempotency and returned audited status before public visibility/operational activation. |
| **P1** | Delta approval/rejection has no reason, field risk classification, diff validation or re-authentication | Admin can apply/reject arbitrary `requested_changes` in one click; UI serializes raw object values without field-level classification or explicit high-risk review. | Enforce typed/allowlisted delta fields, display old/new values and risk/approval requirements, require rejection/approval reason and step-up confirmation for identity, price, bank, insurance, service or location changes. |
| **P1** | Moderation errors are displayed as empty queues | Fetch errors are console-only; empty pending lists can mean no work or failed data access. Provider detail failure gives generic text without retry/status. | Add per-query error, stale, retry and pagination state; never treat an outage as zero pending KYC/deltas. |
| **P1** | Provider delta inspector reveals arbitrary raw data to every rendered admin | `JSON.stringify` renders all requested values, potentially including bank, identity, location, contract or document data without masking or role-specific minimization. | Apply field-level masking/redaction and server-side permission filtering; use secure document viewers with view/access audit and minimum-necessary roles. |
| **P1** | Suspend workflow lacks structured policy/case linkage in the UI | It accepts free text reason and asserts socket/search consequences, but does not select policy code, case, effective time, appeal/review route or returned enforcement evidence. | Use a controlled, audited suspension decision with policy/incident link, severity, effective scope, notification/appeal and server acknowledgment. |
| **P1** | Administration workflow is Arabic/raw and not six-language accessible | Labels, alerts, reason fields, document/decision content and layout are Arabic-first with no tested LTR/locale support. | Complete role-appropriate AR/EN/UR/HI/BN/FIL accessible decision UI and locale-safe dates/status. |

## Decision

Provider moderation is **FIX/BLOCKED** for high-impact operational governance. Real endpoint use does not make one-click activation, raw data display, or unstructured decision workflows suitable for release.
