# Semantic evidence — Mobile Support Chat (actual target)

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/support/chat.tsx:49–65` reads `GET /support/chat`; if the response is empty it creates a local bot greeting with ID `"1"` and current local time (`:55–61`), and if the request fails it silently does nothing (`:63–65`). Thus empty, offline, unauthorized and server-error states are not distinguished, and the UI can present a synthetic “نبض” assistant as an established support agent. The header separately claims availability “now” and reply within one minute (`:118–133`) without live presence/SLA evidence.

`sendMessage` immediately appends a local user message with `Date.now()` ID and local time before server confirmation (`:67–82`). It posts `POST /support/chat` with `{ message }` (`:83–101`) without visible thread ID, auth/participant binding, Idempotency-Key, correlation ID, length/content/PHI moderation, rate limit, retry or delivery status. The reply is also synthesized into local state from `res.reply`; any failure appends a local bot-style error message (`:102–115`) rather than exposing failed/pending state, so the conversation can falsely look like an agent response.

Attachment handling requests library permission and uploads a file to `/media/upload` with `folder: support` (`:247–270`), then sends the returned URL as ordinary message text (`:270–271`). There is no file type/size/content/malware/PHI classification, access-control/expiry policy, attachment ID binding to a thread, upload idempotency, progress/cancel, or secure preview. A URL in a chat message may become broadly accessible depending on media contract and is not validated here.

Quick replies are hard-coded and call the same mutation (`:190–210`), allowing repeated sends without deduplication. There is no realtime transport, message pagination, read receipts, reconnect/offline queue, agent handoff/escalation, ticket creation, report/delete, conversation history identity, or service/order/claim context propagation. No Phase 0 remediation was made.
