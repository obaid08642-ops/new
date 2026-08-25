# Phase 0B semantic evidence — AI admin containment spec

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/ai/ai.admin-containment.spec.ts:1–13`

The spec constructs `AiController` directly with `any`-cast dependencies and asserts that `gatewayStatus`, `updateProvider`, `setMode` and `usage` each throw `ServiceUnavailableException` (`4–12`). This is a focused fail-closed containment check intended to prevent administrative AI routing/provider state and usage endpoints from being exposed while unavailable.

The test does not use Nest routing/guards, authenticated admin identity, permissions, DTO validation or a deployed/compiled artifact. It does not prove that all administrative AI routes are contained, that provider credentials/fallbacks cannot be reached through alternate paths, or that usage data/AI provider metadata is privacy-safe (`5–12`). No provider listing, update audit, mode transition, rate limit, replay, error serialization, observability, feature-flag or live behavior is exercised. No code was changed and no build/test/application operation was performed during this read.
