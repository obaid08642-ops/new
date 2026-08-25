# Phase 0B semantic evidence — ChatGateway follow-up spec

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/chat/chat.gateway.followup.spec.ts:1–45`

The spec constructs `ChatGateway` with a mocked `getThread`. It verifies that a foreign thread rejected with `ForbiddenException('not_participant')` is not joined and that the service receives the thread ID and active user ID (`5–17`). It verifies successful joining only after mocked membership confirmation, with room name `thread_<id>` (`19–30`). It also verifies a restricted thread token cannot join a different room; the gateway returns `thread_token_scope_mismatch` without calling `getThread` or `socket.join` (`32–44`).

These are useful negative-path unit assertions for the join gate and token-scope guard. They are fully mock-bound: the file does not establish socket authentication/identity, unauthenticated behavior, token expiry/revocation, reconnect replay, event-level authorization after joining, cross-tenant checks, room leave/revocation, rate limiting, malformed identifiers, concurrent joins, message send/read/ack authorization, or an actual Socket.IO transport. The spec therefore cannot establish complete realtime confidentiality or production wiring. No code was changed and no test/build/application operation was performed during this read.
