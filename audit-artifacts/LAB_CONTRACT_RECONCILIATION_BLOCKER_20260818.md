# Laboratory contract reconciliation blocker — 2026-08-18

## Evidence

The Provider App `LabDashboard.tsx` contains approximately 30 calls under `/labs/bookings/*`, including state transitions, technician assignment, reschedule, GPS, emergency, reassign, insurance, upload-report, and related actions.

The backend snapshot has two overlapping controller families:

| Controller family | Examples | QA interpretation |
|---|---|---|
| `LabsController` under `@Controller('labs')` | `/provider/inbox`, `/bookings/:id/state`, `/bookings/:id/upload-report`, `/bookings/:id/assign-technician`, `/bookings/:id/reschedule`, `/bookings/:id/gps`, `/bookings/:id/emergency`, `/bookings/:id/reassign` | Uses `@CurrentUser()` and delegates to `LabsService`; global authentication may apply, but role/ownership must be verified in service and deployed image. |
| `LabsEngineController` under `@Controller('labs/bookings')` | `/queue`, `/:id/respond`, `/collect-sample/:id`, `/finalize-test/:id`, `/catalog`, `/wallet` | Has no visible `CurrentUser`/guard/ownership checks and trusts `lab_id` query/body values; potential legacy auth/BOLA drift. |

## Decision

Do not run LabDashboard accept/collect/report mutations until the exact deployed route-to-controller mapping is confirmed. A successful read from `/labs/provider/inbox` or `/labs/samples` is not evidence that the overlapping legacy mutation routes are safe. This is classified as **CONTRACT_RECONCILIATION_BLOCKED / SOURCE_SECURITY_DRIFT**, not as a confirmed live exploit.
