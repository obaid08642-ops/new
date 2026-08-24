# Phase 0B semantic evidence — pharmacy_ops/repositories/order.repository.ts

**Archive member:** `src/modules/pharmacy_ops/repositories/order.repository.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–13; full 13-line member covered.

Lines 2–6 import InjectModel/Model, MongoRepository and Order schema/document. Lines 8–13 define OrderRepository extending MongoRepository and pass the injected Order model to the generic base.

**Audit judgment:** This repository adds no pharmacy scope, patient/provider ownership, state-transition guard, optimistic version/CAS, idempotency, audit actor or projection policy. The controller/service must enforce safe filters and transitions; generic repository methods cannot be treated as proof of order isolation or exactly-once behavior.

No product code was changed and no tests were executed during this semantic read.
