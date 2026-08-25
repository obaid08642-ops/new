# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PROVIDER_CHAT_TRUTHFULNESS_20260819.md`
- **Member SHA-256:** `7d521b216083f6b594ed7907ebbbf7ca159548b9ba2885c613604fc2c6b94ae5`
- **Line count:** 51
- **Read range:** `1-51`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `9: The provider `ChatSystem` requested the REST paths `/chats/threads` and `/chats/:id/messages`. In the authoritative backend archive examined for this batch, the chat module exposed Socket.IO gateway events but the source search found no mat`
- `21: | Voice/video controls | Displayed “Starting” feedback without starting a verified session. | Reports that calling is unavailable from this screen. |`
- `22: | Voice recording | Displayed a recording action without an evidenced recording/upload workflow. | Reports that recording is unavailable from this screen. |`
- `23: | Attachments | Displayed attachment progress language without a verified secure-upload/authorization contract. | Reports that attachment is unavailable pending a secure upload contract. |`
### backend_consumers_or_contracts
- `9: The provider `ChatSystem` requested the REST paths `/chats/threads` and `/chats/:id/messages`. In the authoritative backend archive examined for this batch, the chat module exposed Socket.IO gateway events but the source search found no mat`
- `23: | Attachments | Displayed attachment progress language without a verified secure-upload/authorization contract. | Reports that attachment is unavailable pending a secure upload contract. |`
- `48: 1. `PharmacyChatResponder` opens Socket.IO without the required authenticated handshake and appends fabricated local chat/invoice entries. It requires independent remediation.`
### auth_ownership
- `21: | Voice/video controls | Displayed “Starting” feedback without starting a verified session. | Reports that calling is unavailable from this screen. |`
- `23: | Attachments | Displayed attachment progress language without a verified secure-upload/authorization contract. | Reports that attachment is unavailable pending a secure upload contract. |`
- `44: The remediation is deliberately not a replacement for a usable chat product. Re-enable individual actions only after the backend and both clients share an evidenced contract that covers participant authorization, persistence, read/delivery `
### state_transitions
- `5: **Result:** **PASS — the shared ChatSystem no longer fabricates a clinical conversation or represents unavailable actions as completed.**`
- `7: ## Confirmed Defect`
- `11: When message history loading failed, the prior mobile source injected two hard-coded patient/doctor messages. It also appended a local message before a send request was confirmed and silently retained it if the request failed. Voice, video,`
- `19: | Conversation loading | Error path replaced server history with two fabricated messages. | Clears the conversation and presents a truthful load error. |`
- `20: | Message sending | Local entry was appended and kept after request failure. | Does not create a local delivered message; clearly reports that sending is unavailable until a verified chat contract is bound. |`
- `23: | Attachments | Displayed attachment progress language without a verified secure-upload/authorization contract. | Reports that attachment is unavailable pending a secure upload contract. |`
- `24: | Regression coverage | No targeted guard. | Added a provider contract test that rejects the fabricated messages, optimistic-send comment, and unverified success paths. |`
- `44: The remediation is deliberately not a replacement for a usable chat product. Re-enable individual actions only after the backend and both clients share an evidenced contract that covers participant authorization, persistence, read/delivery `
- `49: 2. `NotificationsCenter` changes read state locally without a verified server mutation, while `SupportCenter` contains hard-coded ticket records. Both require source-contract review before being treated as live operational features.`
### payment_insurance_relevance
- `24: | Regression coverage | No targeted guard. | Added a provider contract test that rejects the fabricated messages, optimistic-send comment, and unverified success paths. |`
- `48: 1. `PharmacyChatResponder` opens Socket.IO without the required authenticated handshake and appends fabricated local chat/invoice entries. It requires independent remediation.`
- `51: No production deployment, live account, sandbox mutation, payment action, or signed device build occurred in this batch.`
### error_empty_loading_retry_cancel
- `11: When message history loading failed, the prior mobile source injected two hard-coded patient/doctor messages. It also appended a local message before a send request was confirmed and silently retained it if the request failed. Voice, video,`
- `19: | Conversation loading | Error path replaced server history with two fabricated messages. | Clears the conversation and presents a truthful load error. |`
- `23: | Attachments | Displayed attachment progress language without a verified secure-upload/authorization contract. | Reports that attachment is unavailable pending a secure upload contract. |`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
