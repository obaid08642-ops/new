# Phase 0B semantic evidence — Drivers

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Members read in full:**
- `src/modules/drivers/drivers.service.ts:2–159`
- `src/modules/drivers/drivers.controller.ts:2–89`
- `src/modules/drivers/drivers.module.ts:2–29`

`DriversController` is JWT guarded. Most routes use `@Roles(UserRole.DELIVERY)`, with admin online and pharmacy/admin available-driver views; however `GET /drivers/:driverId/location` has no role decorator and directly returns a driver's current location (`drivers.controller.ts:35–38`). Service shift management closes existing shifts then creates a new online shift, and location updates a current shift then broadcasts location to admin and active order channels (`drivers.service.ts:27–82`). Coordinates, heading and speed are accepted with no visible range/freshness validation.

Available orders are limited to 20, but `acceptOrder` reads order state, creates/loads delivery, assigns driver, saves delivery and order separately, and emits two events; competing drivers can race before the order state/ID is durably protected (`84–120`). Pickup and delivery similarly update delivery and order independently. Delivery accepts raw signature/photo strings, marks order delivered, increments fixed earnings `15`, and emits event (`123–152`). No visible idempotency, proof ownership/size/type validation, transaction/outbox, payment/commission source or duplicate delivery guard exists. `myActive`/history return broad order documents for the driver; admin allOnline returns broad shifts (`93–103,155–159`).

The module registers User/DriverShift/Order/Delivery schemas, realtime dependency, repositories and service (`drivers.module.ts:15–29`).

No product code was changed and no tests/builds were executed during this semantic read.

## Findings candidates

The read supports: unauthenticated/overbroad live location access, weak GPS validation, order acceptance race, non-atomic delivery state, proof PII/storage risks, fixed earnings truthfulness defect and broad operational payloads.
