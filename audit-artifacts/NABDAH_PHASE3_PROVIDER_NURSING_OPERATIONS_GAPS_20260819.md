# Phase 3 Provider — nursing and home-care operation gaps

## Confirmed Backend contract

The authenticated compatibility contract exposes `GET /home-care/bookings/nursing/all` and `POST /home-care/bookings/:id/respond`. It permits a nursing provider to claim an unassigned request into `PROVIDER_ASSIGNED`, records state history, and requires the assigned provider for GPS updates. These are the applicable provider workflow routes.

## Confirmed defects

| Priority | Finding | Evidence | Required remediation |
|---|---|---|---|
| **P0** | Provider app uses conflicting/non-canonical nursing queues and response routes | Dashboard uses `/provider/jobs/queue`, orders tab uses `/nursing/jobs/active`, modal uses `/nursing/visits/:id/respond`, while canonical compat routes are `/home-care/bookings/nursing/all` and `/home-care/bookings/:id/respond`. | Consolidate every nursing screen on a typed canonical queue/visit API and add contract tests for incoming, assigned, active, completed, unavailable and unauthorized states. |
| **P0** | One provider rejection cancels the patient’s broadcast request | Backend response with `accept: false` transitions an unassigned booking to `CANCELLED`; the UI labels it “reject” without warning that this prevents other nurses from receiving it. | Separate a provider decline/skip record from patient booking cancellation; advance/rebroadcast eligible requests and reserve cancellation for patient/admin/defined policy. |
| **P1** | Urgent request panel fabricates distance and uses incomplete location semantics | It always displays 3.2 km and can show raw address text; no trusted location/distance/consent source is loaded. | Use only consented server-projected distance/area and a minimized address; show unavailable rather than invented distance. |
| **P1** | Visit cards fabricate patient demographic, care and timing data | Missing age, gender, notes, service and time become `70`, male, generic home care, or local default. Failures silently show no jobs. | Remove all clinical/PHI defaults; use an explicit loading/error/no-data model and minimum-necessary owned visit DTO. |
| **P1** | Online toggle is optimistic and calls an unverified availability route | UI changes global context before `POST /home-care/provider/availability` succeeds, ignores any error, and no matching compat endpoint governs queue eligibility. | Introduce an owned availability endpoint/state with rollback, capacity/service area, audit, and restart persistence; do not claim online status before acknowledgment. |
| **P1** | Quick actions can operate without an active visit and emergency dispatch remains exposed | The dashboard passes `jobs[0]` when no active job exists, and routes alarm acceptance to SOS dispatch despite unapproved emergency contract. | Disable visit-specific actions absent an owned visit; retain SOS/location/QR fail-closed pending legal/product approval. |
| **P1** | Nursing UI is Arabic/English-only with placeholder stats/icons | Clinical operations, revenue and emergency labels lack six-language, accessible and RTL/LTR coverage. | Implement reviewed six-language content and accessible controls before release. |

## Decision

Nursing provider operations are **P0 FIX/BLOCKED**. The current route drift and cancel-on-decline behavior can prevent safe reallocation of a patient visit, while operational location and clinical data are not truthful.
