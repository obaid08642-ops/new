# Phase 0B semantic evidence — Realtime

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Members read in full:**
- `src/modules/realtime/realtime.service.ts:2–71`
- `src/modules/realtime/realtime.gateway.ts:2–507`
- `src/modules/realtime/realtime.module.ts:2–22`

`realtime.gateway.ts:17–72` accepts Socket.IO connections with a JWT in handshake auth or query string, verifies it using `JWT_SECRET`, joins user/role rooms, tracks sockets in process memory, broadcasts raw online events and starts offline replay. `:74–91` reads the whole Redis offline list, emits parsed events, then deletes the list, so concurrent reconnects/crashes can lose or duplicate events. `:126–208` exposes presence and validates thread membership through ChatService for joins/typing/read/delivery, but payload lengths/rates and event semantics are not visibly bounded. `:210–301` authorizes calls through LiveKit but forwards raw caller name, ICE and SDP payloads.

`:303–316` explicitly rejects arbitrary channels. `:318–421` validates waiting-room appointment participation and status but stores doctor queues only in process memory and broadcasts synthetic position/ETA (`position * 15`) to appointment rooms. `:423–498` fans out raw internal order/chat/appointment/payment/notification/call payloads to user, role or thread rooms; several role/event handlers have no field-level projection or schema validation. `:500–506` reports process-local socket/user counts.

`realtime.service.ts:20–48` emits to user/role/channel/booking rooms, queues offline events in Redis, and emits internal event payloads; no payload schema, size cap, TTL, dedup or durable delivery status is visible. Presence methods delegate to PresenceService. `realtime.module.ts:11–22` wires Auth, Presence, Chat, LiveKit and Appointment model.

## Findings candidates

The read supports: JWT in query-string exposure, raw event/SDP/ICE/PII payload handling, offline queue loss/duplication, process-local presence/queues, synthetic waiting-time truthfulness, role-room overbroadcast and missing message/payload rate/size/audit controls.

No product code was changed and no tests/builds were executed during this semantic read.
