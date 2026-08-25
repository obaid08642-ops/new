# Phase 0B semantic evidence — Presence module wiring

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/presence/presence.module.ts:1–10`

`PresenceModule` imports `RedisModule`, registers `PresenceService` as a provider and exports that service (`1–10`). The module contains no controller, schema/repository, gateway, guard, interceptor or configuration provider in its own metadata (`5–9`).

This wiring establishes Redis availability and service reuse but does not prove that presence keys have TTL/cleanup, actor/tenant isolation, authentication, anti-spoofing, disconnect handling, heartbeat semantics, privacy retention, event publication, metrics or degraded Redis behavior. Those properties must be established by `PresenceService` and consumers; they are not evidenced by this member. No code was changed and no build/test/application operation was performed during this read.
