# Semantic evidence — Mobile pharmacist-chat

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/pharmacy/pharmacist-chat.tsx:38–51` reads `/pharmacy/chat/threads`, selects the first returned thread, stores its order ID, and reads `/pharmacy/chat/threads/{threadId}/messages`. This is a second chat implementation beside `chat-with-pharmacist.tsx`, which uses `/chat/threads/booking`; route/schema ownership, participant membership, and canonical UI entry point are not reconciled. Empty threads produce no explicit empty state. Errors are only logged (`:49`), with no unauthorized/not-found/expired/retry behavior.

`useSocket` is used for `pharmacy:message` and `pharmacy:typing` events (`:53–73`), but the listeners append any incoming message without visible thread/order correlation, deduplication, sender validation, authorization, sequence/reconnect handling or PHI minimization. Offline messages are queued in component state and flushed by socket emit (`:61–65,75–87`); the queue is lost on unmount/restart, has no persistence, idempotency key, ACK/failure/retry/dead-letter state, and can duplicate on reconnect. The typed event contract and server acknowledgement are not demonstrated.

The header hard-codes `صيدلية الدواء - فرع الملقا` and `متصل الآن` (`:157–161`) rather than using the order/thread pharmacy identity or presence contract. A pharmacy invoice message routes to payment when `activeOrderId` exists (`:212–255`), but invoice data is not validated or rendered here, and there is no invoice amount/order-state binding, payment replay or expiration handling. The send action creates a local `Date.now()` ID and emits the whole local message (`:75–86`) without visible server message schema, idempotency, rate limit, content/PHI moderation or owner check. No attachment support exists in this duplicate surface.

This duplicate implementation creates a product and contract decision: consolidate onto one canonical pharmacy chat surface and one backend contract, or explicitly scope each route. No Phase 0 remediation was made.
