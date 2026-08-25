# Phase 0B semantic evidence — Home-care compatibility controller spec

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/home-care-compat/home-care-compat.controller.spec.ts:1–34`

The spec constructs `HomeCareCompatController` with mocked booking, service, profile and care-plan models (`4–11`). It asserts that a patient cannot access a nursing provider queue and that no booking query occurs, a patient cannot mutate provider availability and no profile write occurs, and a nursing provider cannot check in a `NEW_REQUEST` booking when the state machine transition is invalid (`14–33`).

These cases provide focused negative evidence for role separation, no-write denial and one invalid nursing state transition. They are unit-level mocks and use a cast-to-`any` controller, so they do not prove Nest guards, route parameter binding, DTO validation, session authenticity, provider license/facility membership or real database behavior (`5–11,14–33`).

No unauthenticated/stranger/foreign-booking matrix, ownership 404 policy, service eligibility, price/server-authoritative amount, payment/insurance/cash flow, idempotency, concurrent state transition, transaction, audit/event, address/PII projection, provider queue consistency, notification, cancellation/reschedule/no-show or live home-care contract is tested. No code was changed and no test/build/application operation was performed during this read.
