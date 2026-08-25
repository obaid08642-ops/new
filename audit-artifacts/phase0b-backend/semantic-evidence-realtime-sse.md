# Phase 0B semantic evidence — Realtime SSE bridge

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/realtime/realtime.sse.ts:1–41`

`RealtimeSseController` exposes an authenticated generic user stream at `realtime/stream`; it filters `realtime.user` events by `e.user_id === user.id`, maps raw event payload/type and merges a 25-second heartbeat (`realtime.sse.ts:15–24`). The current user is typed as `any`, the event emitter and event objects are cast as `any`, and no runtime event schema, payload allowlist, tenant/role scope, sequence/replay cursor, backpressure, connection limit, expiry or disconnect audit is present.

It also exposes `realtime/booking/:type/:id` as `@Public()` and explicitly permits anonymous access for SEO tracking pages (`27–36`). It filters only by caller-supplied `type` and `id`, then emits raw `payload` and event name. There is no authentication, signed capability, ownership/consent check, booking visibility policy, identifier validation, type allowlist, rate limit, TTL, replay prevention or payload redaction. This is a direct candidate for cross-user booking event disclosure/IDOR and PII/clinical/operational payload exposure if event producers include such data. The heartbeat intervals and event streams are returned without explicit teardown/resource accounting; behavior under client disconnect, many subscribers, emitter errors and unbounded payloads is not established. `RealtimeSseModule` only registers the controller (`38–41`). No product code was changed and no tests/builds were executed during this semantic read.
