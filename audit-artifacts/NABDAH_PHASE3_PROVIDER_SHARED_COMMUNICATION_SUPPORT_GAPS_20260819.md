# Phase 3 Provider — shared chat, notifications and support gaps

## Confirmed defects

| Priority | Finding | Evidence | Required remediation |
|---|---|---|---|
| **P0** | Chat failure renders fabricated patient/provider clinical conversation | When message fetch fails, provider chat displays two hard-coded messages as if they were real communication. | Replace with a truthful unavailable/retry state; never seed or simulate patient communications in a provider context. |
| **P0** | Sent message may appear delivered after API failure | Screen appends a message optimistically and silently retains it when POST fails, with no delivered/error/retry state. | Use immutable client message IDs/idempotency, delivery acknowledgments, failure status and retry/rollback; maintain participant and time-window authorization server-side. |
| **P1** | Voice/video and attachments are UI-only claims | Call icons and all attachment choices only show informational toasts; no secure call, upload, scanning, message binding or access contract executes. | Implement approved call and owned attachment workflows, or remove/disable controls with truthful status; do not represent an attempted clinical contact/upload as started. |
| **P1** | Conversation list mis-maps server fields | It stores `lastAt` but renders `conv.time`; unread/online fields are not retained from the DTO. List status/time can therefore be blank or false. | Define a typed thread DTO and map/render all authoritative properties with locale formatting and empty/error states. |
| **P1** | Facility internal chat uses a second, inconsistent chat route and drops unread state | It calls singular `/chat/threads` while shared Provider chat calls `/chats/threads`; it assigns every channel `unread: 0` and does not reconcile the locally appended post-send message against the returned record. | Consolidate all provider/facility messaging on one owner-scoped thread API; preserve unread/message IDs and refresh/reconcile after acknowledged delivery. |
| **P1** | Notification reads are local-only | `markRead` and `markAllRead` update React state without any API call, so unread status diverges across devices/sessions. | Use owner-scoped mark-read/read-all APIs with rollback/retry and deep-link actions; never present local-only acknowledgement as persisted. |
| **P1** | Provider support center contains hard-coded tickets and FAQ/claims | Tickets/FAQ are static data, without owner-scoped ticket listing, creation status, replies, or policy-backed answers. | Replace mock support data with protected ticket/request endpoints and server-owned FAQ; remove unsupported service/commission claims until sourced. |
| **P1** | Automatic review reply is a local-only setting | Review replies are posted per review, but the automatic-reply toggle/template only change client state and announce success; no server policy is persisted or applied. | Persist a reviewed, provider-owned auto-reply policy only if the review system supports it; otherwise remove the automated-service claim and retain explicit per-review replies. |
| **P1** | Shared communications are AR/EN only and lack minimum-PHI/privacy controls | Chat, calls, attachments, notification and support content do not implement six locales, attachment consent/classification, retention or role-based minimum data display. | Complete approved six-language accessibility and privacy/retention controls before release. |

## Decision

Shared Provider communication and support is **FIX/BLOCKED**. It must not be relied upon for patient communication, clinical continuity, or support resolution while it fabricates conversations and silently loses persistence failures.
