# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE3_PROVIDER_SHARED_COMMUNICATION_SUPPORT_GAPS_20260819.md`
- **Member SHA-256:** `dbd452caf6346f24c4e236d5d64ae32d26170118f7e88d586e05061b48f89470`
- **Line count:** 19
- **Read range:** `1-19`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `7: | **P0** | Chat failure renders fabricated patient/provider clinical conversation | When message fetch fails, provider chat displays two hard-coded messages as if they were real communication. | Replace with a truthful unavailable/retry sta`
- `8: | **P0** | Sent message may appear delivered after API failure | Screen appends a message optimistically and silently retains it when POST fails, with no delivered/error/retry state. | Use immutable client message IDs/idempotency, delivery `
- `9: | **P1** | Voice/video and attachments are UI-only claims | Call icons and all attachment choices only show informational toasts; no secure call, upload, scanning, message binding or access contract executes. | Implement approved call and o`
- `11: | **P1** | Facility internal chat uses a second, inconsistent chat route and drops unread state | It calls singular `/chat/threads` while shared Provider chat calls `/chats/threads`; it assigns every channel `unread: 0` and does not reconci`
- `12: | **P1** | Notification reads are local-only | `markRead` and `markAllRead` update React state without any API call, so unread status diverges across devices/sessions. | Use owner-scoped mark-read/read-all APIs with rollback/retry and deep-`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `8: | **P0** | Sent message may appear delivered after API failure | Screen appends a message optimistically and silently retains it when POST fails, with no delivered/error/retry state. | Use immutable client message IDs/idempotency, delivery `
- `11: | **P1** | Facility internal chat uses a second, inconsistent chat route and drops unread state | It calls singular `/chat/threads` while shared Provider chat calls `/chats/threads`; it assigns every channel `unread: 0` and does not reconci`
- `12: | **P1** | Notification reads are local-only | `markRead` and `markAllRead` update React state without any API call, so unread status diverges across devices/sessions. | Use owner-scoped mark-read/read-all APIs with rollback/retry and deep-`
- `13: | **P1** | Provider support center contains hard-coded tickets and FAQ/claims | Tickets/FAQ are static data, without owner-scoped ticket listing, creation status, replies, or policy-backed answers. | Replace mock support data with protected`
- `15: | **P1** | Shared communications are AR/EN only and lack minimum-PHI/privacy controls | Chat, calls, attachments, notification and support content do not implement six locales, attachment consent/classification, retention or role-based mini`
### state_transitions
- `3: ## Confirmed defects`
- `7: | **P0** | Chat failure renders fabricated patient/provider clinical conversation | When message fetch fails, provider chat displays two hard-coded messages as if they were real communication. | Replace with a truthful unavailable/retry sta`
- `8: | **P0** | Sent message may appear delivered after API failure | Screen appends a message optimistically and silently retains it when POST fails, with no delivered/error/retry state. | Use immutable client message IDs/idempotency, delivery `
- `9: | **P1** | Voice/video and attachments are UI-only claims | Call icons and all attachment choices only show informational toasts; no secure call, upload, scanning, message binding or access contract executes. | Implement approved call and o`
- `10: | **P1** | Conversation list mis-maps server fields | It stores `lastAt` but renders `conv.time`; unread/online fields are not retained from the DTO. List status/time can therefore be blank or false. | Define a typed thread DTO and map/rend`
- `11: | **P1** | Facility internal chat uses a second, inconsistent chat route and drops unread state | It calls singular `/chat/threads` while shared Provider chat calls `/chats/threads`; it assigns every channel `unread: 0` and does not reconci`
- `12: | **P1** | Notification reads are local-only | `markRead` and `markAllRead` update React state without any API call, so unread status diverges across devices/sessions. | Use owner-scoped mark-read/read-all APIs with rollback/retry and deep-`
- `13: | **P1** | Provider support center contains hard-coded tickets and FAQ/claims | Tickets/FAQ are static data, without owner-scoped ticket listing, creation status, replies, or policy-backed answers. | Replace mock support data with protected`
- `14: | **P1** | Automatic review reply is a local-only setting | Review replies are posted per review, but the automatic-reply toggle/template only change client state and announce success; no server policy is persisted or applied. | Persist a r`
- `15: | **P1** | Shared communications are AR/EN only and lack minimum-PHI/privacy controls | Chat, calls, attachments, notification and support content do not implement six locales, attachment consent/classification, retention or role-based mini`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `7: | **P0** | Chat failure renders fabricated patient/provider clinical conversation | When message fetch fails, provider chat displays two hard-coded messages as if they were real communication. | Replace with a truthful unavailable/retry sta`
- `8: | **P0** | Sent message may appear delivered after API failure | Screen appends a message optimistically and silently retains it when POST fails, with no delivered/error/retry state. | Use immutable client message IDs/idempotency, delivery `
- `10: | **P1** | Conversation list mis-maps server fields | It stores `lastAt` but renders `conv.time`; unread/online fields are not retained from the DTO. List status/time can therefore be blank or false. | Define a typed thread DTO and map/rend`
- `12: | **P1** | Notification reads are local-only | `markRead` and `markAllRead` update React state without any API call, so unread status diverges across devices/sessions. | Use owner-scoped mark-read/read-all APIs with rollback/retry and deep-`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
