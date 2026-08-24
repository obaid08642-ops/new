# Phase 0B semantic evidence — orders.ownership.contract.spec.ts

**Archive member:** `src/modules/orders/orders.ownership.contract.spec.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–15; full 15-line member covered.

Line 2 imports OrdersService. Lines 4–8 instantiate OrdersService directly with twelve `as any` empty dependencies. Lines 10–14 bind the private/internal `assertOrderAccess` method and test two cases: a patient whose `id` equals the order’s `patient_id` is permitted; an unrelated patient receives NotFoundException.

**What this proves:** the service-level access helper distinguishes the matching patient owner from an unrelated patient and uses 404 for the stranger case, reducing order existence disclosure at that helper boundary.

**What this does not prove:** no HTTP controller/request is exercised; no unauthenticated principal is tested; no provider/admin/pharmacy/delivery role matrix is tested; no tenant/family/delegation rules are tested; no order-not-found path is compared with stranger; no mutation-specific access path is tested; no ID format/prototype edge case is tested; and no response-body/data-minimization assertion is made. Dependencies are empty `as any`, so only the isolated helper is under test.

**Audit judgment:** This is a narrow positive ownership unit contract, not complete BOLA/IDOR coverage. It should be paired with real authenticated integration tests for every read and mutation route, including owner 200, stranger 404, unauth 401, role boundaries, and resource absence equivalence.

No product code was changed and no tests were executed during this semantic read.
