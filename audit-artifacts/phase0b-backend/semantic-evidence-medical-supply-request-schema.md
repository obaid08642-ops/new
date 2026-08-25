# Phase 0B semantic evidence — Medical supply request schema

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/home-care/schemas/medical-supply-request.schema.ts:1–30`

`MedicalSupplyRequest` stores a required `booking_id` reference to `HomeCareBooking` and `nurse_id` reference to `User`, both indexed (`6–12`). The schema does not itself assert that the nurse belongs to the booking, that the booking belongs to the current patient/tenant, that the nurse is authorized for the requested supply or that the booking is in a state allowing a supply request. There is no explicit requester/actor, facility/vendor or patient reference.

`requested_items` is an `any[]` property backed by an inline nested object definition with free-form `item_name`, unconstrained positive/maximum quantity, free-form unit and four item statuses (`14–24`). There is no canonical supply/product ID, inventory reservation, availability/source, substitution rule, prescription/order requirement, price/currency/tax, batch/expiry, delivery address or atomic item-level transition. The item status enum omits rejection, cancellation, backorder, failed delivery and returned/expired states. `priority` has a three-value enum but no escalation/SLA/clinical criteria or actor authorization (`26–27`). No request-level status, request ID, idempotency/replay key, uniqueness, optimistic version, retention/deletion/anonymization, minimum-necessary projection, PII boundary, audit/provenance or payment/reconciliation contract is visible. No product code was changed and no tests/builds were executed during this semantic read.
