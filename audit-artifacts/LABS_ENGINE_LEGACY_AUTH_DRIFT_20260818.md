# Legacy LabsEngine auth/ownership drift — 2026-08-18

## Finding

The inspected backend snapshot declares `LabsEngineController` at `src/modules/labs/controllers/labs-engine.controller.ts` with routes under `labs/bookings`:

- `GET /queue?lab_id=...`
- `POST /:id/respond` with `{ accept, lab_id }`
- `POST /collect-sample/:id` with `{ barcodeToken }`
- `POST /finalize-test/:id` with `{ metricResults, pdfUrl }`

The controller source does not show `JwtAuthGuard`, `CurrentUser`, provider-role validation, or ownership checks on these methods. `respond` trusts `lab_id` from the request body, and collection/finalization update by booking ID alone. This is a potential legacy BOLA/authentication risk if the controller is mounted in the deployed application.

## QA decision

Do not execute these legacy lifecycle mutations. The live provider read contract used `/labs/provider/inbox` and `/labs/samples`, which returned 200 for the sandbox laboratory account. The legacy controller must first be reconciled against the deployed route map and authoritative backend commit. If mounted, it requires centralized authentication, provider-type authorization, and booking ownership checks before any activation.

Classification: **SOURCE_SECURITY_DRIFT / LIFECYCLE_BLOCKED**. This is not asserted as a live production exploit until route exposure is independently confirmed.
