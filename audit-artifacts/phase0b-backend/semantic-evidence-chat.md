# Phase 0B semantic evidence — Chat

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Members read in full:**
- `src/modules/chat/chat.service.ts:2–420`
- `src/modules/chat/chat.gateway.ts:2–165`
- `src/modules/chat/chat.module.ts:2–244`
- `src/modules/chat/chat.schemas.ts:2–58`
- `src/modules/chat/guards/chat-gateway.guard.ts:1–48`
- `src/modules/chat/schedulers/chat-lifecycle.scheduler.ts:1–28`

`chat.service.ts:25–91` creates direct/group/booking threads, resolves booking parties from model IDs, and lazily adds participants; direct/group creation has no visible relationship/authorization restriction. `:93–121` scopes thread reads by participant and issues a 10-minute JWT chat token. `:123–143` validates media IDs against sender ownership/purpose/thread. `:145–199` allows family communication and gates consultation status, but catches appointment lookup failures and returns allowed. `:204–287` validates participant/status/media IDs and client message IDs, creates messages, updates unread/thread metadata separately, emits EventBus/EventEmitter payloads and returns the message. `:289–420` provides message pagination/search/read/delivery/edit/delete/reaction/pin/participant management; several operations are read-then-save and `addParticipant`/`removeParticipant` allow any existing participant to manage group/direct membership.

`chat.module.ts:19–228` exposes both `chat` and `chats` REST controllers. It has a permissions endpoint that reads a thread without first asserting the requester is a participant, returns family/non-consultation active permissions broadly, and resolves appointment follow-up state. It exposes direct/group/booking thread creation, read, message send (idempotency decorator), read/delivered, realtime token, edit/delete/reactions/pin/participant operations, with many inline/raw bodies and no visible idempotency on most mutations. `:232–244` wires EventsModule, schemas, ChatService and ChatGateway.

`chat.gateway.ts:19–69` verifies JWT from auth/header, supports `chat_rt` scope, tracks sockets process-locally and joins user room. `:71–165` validates join thread through service but typing, send_message, initiate_call and mark_seen handlers emit directly without calling ChatService participant/status checks; caller-provided `state` controls closed/follow-up decisions. `chat-gateway.guard.ts:15–47` reads body `chatSessionId/senderId/actionType`, lets FAMILY sessions bypass all constraints, trusts body senderId for doctor transition, and handles statuses independently of gateway handlers. Scheduler `:11–27` closes clinical sessions hourly based on updatedAt.

`chat.schemas.ts:7–58` stores participant IDs, unread counts, message bodies, attachment metadata, media IDs, reactions, read/delivered arrays and edit/delete/pin flags; only message client_message_id is unique sparse and thread/date indexes exist. No visible encryption, retention/legal hold, audit history or participant compound invariants are present.

## Findings candidates

The read supports: permissions endpoint BOLA, direct/group membership abuse, WebSocket handler bypass of service authorization, client-controlled clinical state/sender identity, raw PHI/attachment/reaction payloads, non-atomic unread/events, process-local socket state, shared-family bypass and missing encryption/retention/audit.

No product code was changed and no tests/builds were executed during this semantic read.
