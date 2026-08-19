# Phase 3 Provider — radiology operations and reporting gaps

## Confirmed Backend scope

Backend declares a provider inbox and explicit check-in, scanning, abort, insurance approval, report upload/review/publish, reschedule, tracking, and catalog-delta routes. The Provider app should use these stateful, owned transitions rather than client-led approximations.

## Confirmed defects

| Priority | Finding | Evidence | Required remediation |
|---|---|---|---|
| **P0** | Report “upload” supplies a fabricated storage URL rather than a selected, stored report | Reporting screen POSTs `https://storage.nabdah.com/reports/{orderId}.pdf` without file selection/upload, then claims PDF draft success. | Remove fake upload/success; use secure authenticated storage upload with owned file reference, content/type/virus validation, report metadata, audit and clinician review before publish. |
| **P0** | Provider accepts cash and rejects bookings through a generic state patch | Initial actions PATCH `state: CONFIRMED/CANCELLED` rather than a specific provider acceptance/rejection/payment decision contract. This bypasses evidence, reason, quote, cash-collection and patient-notification semantics. | Provide provider-scoped accept/reject endpoints with validated reasons and payment-state rules; restrict generic transitions to internally authorized workflows and test foreign/provider-role cases. |
| **P1** | Insurance approval is a free-text NPHIES/coplay assertion | UI accepts any approval code/coplay locally and posts it without a policy/document/item decision or real NPHIES verification. | Bind approvals to an authorized insurer integration or a persisted manual-review workflow; validate copay server-side and create a secure patient payment handoff only after decision. |
| **P1** | Rebooking creates an arbitrary future timestamp rather than selecting an available slot | “Tomorrow/2/3/7 days” becomes `Date.now + days` with no facility availability, modality capacity, timezone, preparation or patient agreement check. | Fetch and reserve a server-authoritative slot; require relevant patient/provider consent and return a validated reschedule state. |
| **P1** | Safety questionnaire is shown but does not govern safe action | Pregnancy, implant, pacemaker and contrast fields are visually highlighted, yet generic confirmation/scanning controls are not blocked by a clinician-reviewed contraindication decision. | Enforce modality-specific safety protocol, escalation and approved override on Backend; fail closed for incomplete/high-risk questionnaires. |
| **P1** | Operational failures look like an empty zero-revenue day | Inboxes failures are converted to empty orders/zero statistics in home and order tabs. | Render loading/error/empty separately, preserve last confirmed data safely, and permit retry. |
| **P1** | Radiology output/UI does not meet locale/PHI display requirements | Dates are always formatted in Arabic locale; patient safety facts and financial values are displayed without six-language/RTL-LTR access review. | Complete locale-aware formatting/copy and minimum-necessary PHI display controls for all roles/screens. |

## Decision

Radiology provider operations are **FIX/BLOCKED**. The current UI can report a nonexistent upload, represent unverified insurance and safety decisions as operational progress, and reschedule without availability validation.
