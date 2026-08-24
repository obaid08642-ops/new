# Phase 0B semantic evidence — radiology-provider.controller.spec.ts

**Archive member:** `src/modules/radiology/controllers/radiology-provider.controller.spec.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–84; full 84-line member covered.

Lines 4–9 define a chain mock for sort/lean. Lines 11–32 construct center/other-center fixtures, mocked booking/user models, and the controller. Lines 34–51 test provider queue behavior: for a non-admin center, pending bookings and that center's accepted/check-in/scanning bookings are returned, and the query is asserted to include the pending branch plus the center-owned branch.

Lines 53–67 test that finalize is rejected for a booking assigned to another center and that no update occurs. Lines 69–83 test that a patient-shaped caller cannot allocate a machine even when the booking exists and no update occurs.

**Security/ownership:** positive unit-level evidence exists for center queue scoping (with intentionally broad pending visibility), foreign-center finalize rejection, and patient-role allocation rejection. The spec does not test unauthenticated execution, class guard/roles decorator integration, admin behavior, pending-claim policy, provider identity spoofing, public UUID versus `_id`, machine conflict races, report secure-storage handoff, or idempotency/replay.

**State/transitions:** queue is read-only; finalize and allocation are only checked for access in these tests, not for valid prior states or atomic transitions.

**Truthfulness/financial source:** no price/payment/insurance/wallet behavior tested.

**Test implications:** add HTTP integration for JWT/roles, 401/403/404 contracts, pending queue abuse, admin matrix, UUID/_id consistency, allocation concurrency/time overlap, secure report storage, event/callback claims, idempotency, and wallet reconciliation. No tests executed during this semantic read.
