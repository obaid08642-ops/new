# Phase 0B semantic evidence — Chat contract spec

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/chat/chat.contract.spec.ts:1–102`

The spec builds a prototype `ChatService` with mocked Mongoose collections, bus/events and communication policy (`11–29`). It verifies non-participant thread access rejects with `NotFoundException` (`31–37`); an owned media asset whose owner, purpose and thread match is accepted and message creation receives the media ID (`39–49`); foreign/cross-thread media is rejected before create (`51–59`); legacy public attachment URLs are rejected (`61–68`); realtime token issuance is asserted with `expires_in=600`, `thread_id`, audience `chat-rt` and an `exp-iat` interval of 600 (`70–85`); mark-read is limited to the requested message marker (`87–97`); and the controller method carries the idempotency metadata (`99–101`).

The spec establishes useful intended contract assertions. Its service and database dependencies are mocked, and `Object.create(ChatService.prototype)` bypasses constructor/module wiring. It does not prove controller authentication/authorization, unauthenticated response semantics, stranger 404 through HTTP, JWT signature verification/issuer/subject/nonce/revocation, replay handling, token refresh, message body validation/PII controls, rate limits, event/realtime delivery, actual media ACLs/storage scanning, transactionality, duplicate idempotency replay behavior, message sequence/concurrency, tenant separation, or live MongoDB persistence. No code was changed and no test/build/application operation was performed during this read.
