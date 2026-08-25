# Phase 0B semantic evidence — Driver order repository

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/drivers/repositories/order.repository.ts:1–13`

`OrderRepository` is an injectable typed wrapper around `MongoRepository<OrderDocument>`, binding `Order.name` to `Model<OrderDocument>` (`drivers/repositories/order.repository.ts:2–11`). The member defines no driver/order-specific methods or invariants: no patient/driver/tenant scope, delivery assignment relationship, item/price/tax/currency validation, payment/settlement/refund reconciliation, guarded order lifecycle, optimistic concurrency, idempotency, minimum-necessary projection, PII/address redaction, retention/deletion/anonymization, audit/provenance or transaction/outbox boundary. Generic inherited operations therefore leave order truth, delivery authorization, financial consistency and patient data protection entirely to callers. No product code was changed and no tests/builds were executed during this semantic read.
