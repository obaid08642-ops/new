# Phase 0B semantic evidence — Workflow engine module spec

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/workflow-engine/workflow-engine.module.spec.ts:1–13`

The spec imports the pure `toUniversal` mapping function and covers two behaviors: an unknown pharmacy state throws `BadRequestException` instead of being silently mapped to `REQUESTED`, and two declared states—pharmacy `accepted` and consultation `scheduled`—map deterministically to `CONFIRMED` (`4–12`).

This provides narrow pure-function evidence against one fail-open state fallback and confirms two mappings. It does not prove that all domain states are declared, that mappings are semantically correct across pharmacy/consultation/nursing/diagnostics/emergency/insurance, or that state names are normalized safely (`5–11`).

No controller/service/database/event transition is exercised; authorization, ownership, actor permissions, optimistic concurrency, idempotency, timers, terminal-state rules, cancellation/refund consistency, notification behavior, audit history, migration compatibility or deployed configuration are absent. The mapping tests also do not establish that downstream consumers agree on the universal state contract. No code was changed and no build/test/application operation was performed during this read.
