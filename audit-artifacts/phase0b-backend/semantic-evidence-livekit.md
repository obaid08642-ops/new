# Phase 0B semantic evidence — LiveKit

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Members read in full:**
- `src/modules/livekit/livekit.service.ts:2–341`
- `src/modules/livekit/livekit.controller.ts:2–113`
- `src/modules/livekit/livekit.module.ts:2–17`

`livekit.service.ts:21–45` has a legacy `createToken` with a two-hour TTL and a narrower ten-minute `createBookingToken`; both use caller-supplied room and participant names. `:52–67` checks appointment patient/doctor identity, video type, terminal status and a ±15-minute window for booking tokens, then uses `user.name/full_name/id` as LiveKit identity. `:69–137` exposes provider waiting-room/ping/no-show operations; ping verifies a broad active appointment relationship but emits a best-effort event, while no-show saves status directly. `:140–157` scopes call sessions by patient/provider, but `:159–207` initiates/join/ends/rejects sessions with mixed appointment ID resolution, callerName/callType inputs and separate insert/update transitions.

`:219–257` saves arbitrary metrics for an owned session and returns history/session data. `:259–298` exposes active rooms and global analytics without user scope. `:300–341` returns empty/unavailable semantics when LiveKit is not configured, catches participant API errors, and returns success for remove/mute paths even when remote operations fail.

`livekit.controller.ts:7–68` protects most routes with JWT but has no visible role/relationship decorators for provider waiting-room/ping/no-show or mutation idempotency. `:31–35` accepts a webhook body and always returns `{received:true}` with verification explicitly unimplemented. `:70–112` exposes history/session and admin room/analytics/participant/mute/remove operations; admin role decorators are present for the latter group. Module wires only Appointment model and service/controller.

## Findings candidates

The read supports: unverified webhook acceptance, legacy broad token policy, session/caller identity drift, provider route role gaps, non-atomic call lifecycle, arbitrary metrics/PII exposure, global admin room semantics and false success on LiveKit errors.

No product code was changed and no tests/builds were executed during this semantic read.
