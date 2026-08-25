# Phase 0B semantic evidence — Realtime gateway authorization spec

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/realtime/realtime.gateway.authorization.spec.ts:1–72`

The spec constructs a `RealtimeGateway` with mocked appointments and presence dependencies and a mocked Socket.IO server (`3–33`). It asserts that unsupported caller-controlled channels are rejected without joining a room (`35–39`), foreign waiting-room joins are rejected before room/queue mutation (`41–48`), an appointment participant can join an open waiting room and is placed in the doctor queue (`50–58`), and terminal/foreign leave attempts do not mutate the queue (`60–71`).

These tests provide focused source-level evidence for room admission and queue mutation boundaries. They do not exercise the Socket.IO connection handshake, JWT/session extraction, origin/CORS policy, token expiry/revocation, socket disconnect cleanup, multi-socket identity, doctor participant path, family-booker authorization, appointment state windows beyond one terminal case, queue duplicates/order/races, event-level authorization, typing/read/message/call events, replay, rate limiting or live network behavior. The socket is a minimal object with only `data.user`, `join` and `leave`, so protocol invariants are not represented (`3–7`).

The test uses a mocked `findOne().lean()` result and directly inspects private `doctorQueues`, so it cannot establish database ownership, stale appointment handling, durable queue semantics or cross-process consistency (`41–71`). It also does not assert that error responses avoid sensitive resource existence or that unauthorized sockets are disconnected. No test was run and no product code was changed during this semantic read.
