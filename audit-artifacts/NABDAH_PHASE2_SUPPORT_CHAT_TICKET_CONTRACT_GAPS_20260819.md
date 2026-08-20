# Phase 2 Patient — support chat and ticket workflow gaps

## Confirmed controls

The existing support request/ticket endpoints are JWT-protected and expose owner-scoped request detail/reply operations. Ticket list is also authenticated. These server-side ownership controls are **PASS**.

## Confirmed defects

| Priority | Finding | Evidence | Required remediation |
|---|---|---|
| **P0** | Patient chat uses no declared Backend route | The screen calls `GET/POST /support/chat`; the support Controller declares requests, tickets, details, replies, FAQs, feedback, and settings but no chat route. Failures are represented as an in-screen automated response. | Remove the live-chat representation or implement an authenticated, owned, persisted conversation/ticket contract with server-side status and transcript rules. |
| **P1** | Support availability and response-time claims are fabricated | Header says “available now / response within a minute”; load failure creates a bot welcome message and send failure creates a bot error bubble. Neither is a verified support-agent state. | Render service availability/status from Backend or use truthful offline/ticket-submission language; never simulate an agent or response SLA. |
| **P1** | Ticket selection discards the ticket identifier | Each ticket simply opens generic support chat without its `id`, although Backend has an owned request-detail/reply route. | Build a ticket detail route with the owned ticket ID, message history/status, and safe reply action; otherwise disable the selection. |
| **P1** | Attachment flow can expose an uploaded private URL in a non-existent chat channel | It uploads an image then sends its URL as a plain chat message to the absent route, without linking asset ownership to a support ticket or a media consent/purpose contract. | Restrict attachments to an owned ticket/message server contract; store secure attachment references only, scan/validate files, and require purpose-specific consent. |
| **P1** | Support chat copy and quick replies are Arabic-only | All availability, ticket, error, attachment, and quick-reply strings lack six-language coverage. | Add reviewed locale keys and safe status/error states for all supported languages. |

## Decision

Support ticket listing is **PASS** as an owned list. The live-chat/ticket-detail workflow is **FIX/BLOCKED** until its declared route, truthful availability, ticket context, attachment ownership, persistence, and localized UI are implemented.
