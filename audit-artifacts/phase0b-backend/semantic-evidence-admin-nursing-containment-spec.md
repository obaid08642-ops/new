# Phase 0B semantic evidence — Admin nursing containment spec

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/compat/admin-nursing-containment.spec.ts:1–11`

The Jest spec reads `admin-spa.module.ts` from disk as UTF-8 and asserts that the source contains two `ServiceUnavailableException` strings for nursing operations and nursing assignment (`4–10`). This is a source-text containment test intended to prevent admin nursing flows from reading address-bearing requests or assigning an arbitrary provider when the surface is unavailable.

The fail-closed intent is useful, but the test does not instantiate the module, invoke a route, validate an authenticated admin actor, inspect response shape/status, or prove that the guarded code is reachable in the deployed build (`5–10`). It is brittle to message/source formatting and can pass while dead code, alternate routes, other controllers or a different compiled artifact remain exposed. No patient/provider ownership, facility scope, address redaction, assignment integrity, audit, feature-flag or live backend behavior is tested. No code was changed and no test/build/application operation was performed during this read.
