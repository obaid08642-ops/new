# Phase 0B semantic evidence — moyasar.service.ts

**Archive member:** `src/modules/moyasar/moyasar.service.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–3; full 3-line member covered.

Line 2 is a compatibility comment explaining that direct imports of this path should continue to work. Line 3 re-exports `MoyasarService` from `./moyasar.module`.

**Audit judgment:** This file contains no gateway implementation, validation, webhook verification, payment lookup, refund, amount, ownership or idempotency behavior. The effective service contract is located in `src/modules/moyasar/moyasar.module.ts` and must be audited there; this wrapper must not be counted as evidence that Moyasar security/payment semantics are implemented.

No product code was changed and no tests were executed during this semantic read.
