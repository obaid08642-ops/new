# Phase 3 Provider — laboratory order, sample and insurance operation gaps

## Confirmed Backend controls

The laboratory Controller exposes an authenticated provider inbox plus server methods for valid booking transitions, technician assignment, insurance decision, sample registration/stages, report upload, rescheduling, and tracking. Provider work must use those explicit operations rather than an arbitrary local workflow.

## Confirmed defects

| Priority | Finding | Evidence | Required remediation |
|---|---|---|---|
| **P0** | Provider insurance flow records an unverified decision as a generic note/state change | UI asks a provider to enter an NPHIES code and copay, then PATCHes generic booking state with `note: nphies_code..., copay...`; it does not call `PATCH /labs/bookings/:id/insurance`, persists no verified provider/decision/items, and presents “copay requested” success. | Use the owned insurance-decision DTO/state machine, validate authority/policy/documents/currency/items server-side, create a patient-visible approval/coplay payment handoff, and audit decision evidence. |
| **P1** | Booking rejection is represented as sample rejection | “Decline” sends `SAMPLE_REJECTED`, conflating a provider refusing an incoming booking with a lab-quality sample rejection. | Define distinct authorized transitions/reasons for reject, cancel, collection failure and sample-quality rejection; show state-specific patient/provider outcomes. |
| **P1** | Dashboard manufactures operational patient, test, total and time values | Missing inbox fields become “Nabdah Patient,” `cbc`, cash, `150`, and “soon.” A failed data load becomes zero metrics and an empty dashboard. | Render only patient-safe authoritative data and distinct loading/error/empty states; never treat a network/API failure as no workload or zero revenue. |
| **P1** | Provider result/status fields are inconsistently mapped | Order tab filters `order.status`; home tab maps `x.state`, and local views translate selected state strings only. This can hide valid orders or misstate stages as DTOs evolve. | Establish a versioned provider-inbox DTO with a single canonical state enum and exhaustive mapping/unit tests. |
| **P1** | Radiology quick action points to no registered navigator route | Lab home navigates to `rad_home`, but the Lab navigator does not define that screen. | Remove the action or route to an implemented role-appropriate feature with explicit permissions. |
| **P1** | UI remains limited to Arabic/English and uses non-semantic placeholder glyphs | Sample pipeline/stats use text symbols and non-localized clinical/payment display. | Adopt six-language, accessible vector icon, locale datetime/currency and RTL/LTR requirements. |

## Decision

Laboratory provider operations are **FIX/BLOCKED**. Explicit Backend operations exist, but insurance and intake UX currently bypasses their intended semantics and can conceal data failure or misrepresent clinical/financial state.
