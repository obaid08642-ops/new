# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/LAB_CONTRACT_RECONCILIATION_BLOCKER_20260818.md`
- **Member SHA-256:** `97f4408dcca4df2c9c3082bc5bb6aeb069f7fe6f5f61747006d61156bdfab45b`
- **Line count:** 16
- **Read range:** `1-16`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: The Provider App `LabDashboard.tsx` contains approximately 30 calls under `/labs/bookings/*`, including state transitions, technician assignment, reschedule, GPS, emergency, reassign, insurance, upload-report, and related actions.`
- `11: | `LabsController` under `@Controller('labs')` | `/provider/inbox`, `/bookings/:id/state`, `/bookings/:id/upload-report`, `/bookings/:id/assign-technician`, `/bookings/:id/reschedule`, `/bookings/:id/gps`, `/bookings/:id/emergency`, `/booki`
- `12: | `LabsEngineController` under `@Controller('labs/bookings')` | `/queue`, `/:id/respond`, `/collect-sample/:id`, `/finalize-test/:id`, `/catalog`, `/wallet` | Has no visible `CurrentUser`/guard/ownership checks and trusts `lab_id` query/bod`
- `16: Do not run LabDashboard accept/collect/report mutations until the exact deployed route-to-controller mapping is confirmed. A successful read from `/labs/provider/inbox` or `/labs/samples` is not evidence that the overlapping legacy mutation`
### backend_consumers_or_contracts
- `5: The Provider App `LabDashboard.tsx` contains approximately 30 calls under `/labs/bookings/*`, including state transitions, technician assignment, reschedule, GPS, emergency, reassign, insurance, upload-report, and related actions.`
- `11: | `LabsController` under `@Controller('labs')` | `/provider/inbox`, `/bookings/:id/state`, `/bookings/:id/upload-report`, `/bookings/:id/assign-technician`, `/bookings/:id/reschedule`, `/bookings/:id/gps`, `/bookings/:id/emergency`, `/booki`
- `12: | `LabsEngineController` under `@Controller('labs/bookings')` | `/queue`, `/:id/respond`, `/collect-sample/:id`, `/finalize-test/:id`, `/catalog`, `/wallet` | Has no visible `CurrentUser`/guard/ownership checks and trusts `lab_id` query/bod`
- `16: Do not run LabDashboard accept/collect/report mutations until the exact deployed route-to-controller mapping is confirmed. A successful read from `/labs/provider/inbox` or `/labs/samples` is not evidence that the overlapping legacy mutation`
### auth_ownership
- `11: | `LabsController` under `@Controller('labs')` | `/provider/inbox`, `/bookings/:id/state`, `/bookings/:id/upload-report`, `/bookings/:id/assign-technician`, `/bookings/:id/reschedule`, `/bookings/:id/gps`, `/bookings/:id/emergency`, `/booki`
- `12: | `LabsEngineController` under `@Controller('labs/bookings')` | `/queue`, `/:id/respond`, `/collect-sample/:id`, `/finalize-test/:id`, `/catalog`, `/wallet` | Has no visible `CurrentUser`/guard/ownership checks and trusts `lab_id` query/bod`
### state_transitions
- `5: The Provider App `LabDashboard.tsx` contains approximately 30 calls under `/labs/bookings/*`, including state transitions, technician assignment, reschedule, GPS, emergency, reassign, insurance, upload-report, and related actions.`
- `11: | `LabsController` under `@Controller('labs')` | `/provider/inbox`, `/bookings/:id/state`, `/bookings/:id/upload-report`, `/bookings/:id/assign-technician`, `/bookings/:id/reschedule`, `/bookings/:id/gps`, `/bookings/:id/emergency`, `/booki`
- `16: Do not run LabDashboard accept/collect/report mutations until the exact deployed route-to-controller mapping is confirmed. A successful read from `/labs/provider/inbox` or `/labs/samples` is not evidence that the overlapping legacy mutation`
### payment_insurance_relevance
- `5: The Provider App `LabDashboard.tsx` contains approximately 30 calls under `/labs/bookings/*`, including state transitions, technician assignment, reschedule, GPS, emergency, reassign, insurance, upload-report, and related actions.`
- `12: | `LabsEngineController` under `@Controller('labs/bookings')` | `/queue`, `/:id/respond`, `/collect-sample/:id`, `/finalize-test/:id`, `/catalog`, `/wallet` | Has no visible `CurrentUser`/guard/ownership checks and trusts `lab_id` query/bod`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
