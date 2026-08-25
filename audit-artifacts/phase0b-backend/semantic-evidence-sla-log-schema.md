# Phase 0B semantic evidence — SlaLog schema

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/schemas/sla-log.schema.ts:1–28`

The timestamped `sla_logs` schema defines a unique ID, required indexed providerId and orderId, required durationSeconds and slaLimit numeric fields, and required indexed isBreached defaulting false (`7–28`). Provider/order indexes and the breach index provide basic lookup support (`12–25`).

No event start/end timestamps, timezone, clock source, SLA policy/version, service category, state transitions or breach actor/provenance are represented (`18–25`). durationSeconds and slaLimit have no nonnegative/integer/max/unit validation, and no invariant derives isBreached from authoritative times; a caller could persist contradictory values (`18–25`). Provider/order IDs have no visible ownership, tenant, facility or delivery linkage (`12–16`). No idempotency/event key, duplicate prevention, immutable append-only guard, notification/escalation/compensation, audit correlation, PII minimization, retention/TTL, dispute or recalculation policy is represented. No code was changed and no build/test/application operation was performed during this read.
