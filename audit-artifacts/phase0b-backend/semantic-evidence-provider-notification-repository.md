# Phase 0B semantic evidence — providernotification.repository.ts

**Archive member:** `src/modules/provider/services/repositories/providernotification.repository.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–13; full 13-line member covered.

Lines 2–6 import model injection, Mongoose Model, the shared MongoRepository and ProviderNotification. Lines 8–13 define an injectable `ProviderNotificationRepository` extending `MongoRepository<ProviderNotification>` and pass the named ProviderNotification model to the superclass.

**Behavioral scope:** No custom recipient/provider ownership predicate, tenant scope, unread/read transition, retention, deduplication, delivery status, projection, redaction, transaction or audit behavior is implemented. All notification semantics are inherited or delegated to callers.

**Security/integrity:** A generic CRUD repository for notifications can permit cross-recipient reads or writes if caller filters are incomplete. It also does not enforce provider-only visibility, idempotent delivery, monotonic read state or prevention of sensitive payload exposure.

**Test implications:** verify model token resolution, recipient/tenant filters, least-privilege projections, read-state monotonicity, duplicate delivery/replay, retention and notification audit semantics. No tests executed during this semantic read.
