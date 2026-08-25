# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE2_SUPPORT_CHAT_TICKET_CONTRACT_GAPS_20260819.md`
- **Member SHA-256:** `b0f4f6c6890bf301375723bd14ba8a4f5bbaad252cf8bab51619c1d83a7ec4de`
- **Line count:** 19
- **Read range:** `1-19`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `11: | **P0** | Patient chat uses no declared Backend route | The screen calls `GET/POST /support/chat`; the support Controller declares requests, tickets, details, replies, FAQs, feedback, and settings but no chat route. Failures are represente`
- `13: | **P1** | Ticket selection discards the ticket identifier | Each ticket simply opens generic support chat without its `id`, although Backend has an owned request-detail/reply route. | Build a ticket detail route with the owned ticket ID, m`
- `14: | **P1** | Attachment flow can expose an uploaded private URL in a non-existent chat channel | It uploads an image then sends its URL as a plain chat message to the absent route, without linking asset ownership to a support ticket or a medi`
- `19: Support ticket listing is **PASS** as an owned list. The live-chat/ticket-detail workflow is **FIX/BLOCKED** until its declared route, truthful availability, ticket context, attachment ownership, persistence, and localized UI are implemente`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `5: The existing support request/ticket endpoints are JWT-protected and expose owner-scoped request detail/reply operations. Ticket list is also authenticated. These server-side ownership controls are **PASS**.`
- `14: | **P1** | Attachment flow can expose an uploaded private URL in a non-existent chat channel | It uploads an image then sends its URL as a plain chat message to the absent route, without linking asset ownership to a support ticket or a medi`
- `19: Support ticket listing is **PASS** as an owned list. The live-chat/ticket-detail workflow is **FIX/BLOCKED** until its declared route, truthful availability, ticket context, attachment ownership, persistence, and localized UI are implemente`
### state_transitions
- `3: ## Confirmed controls`
- `7: ## Confirmed defects`
- `11: | **P0** | Patient chat uses no declared Backend route | The screen calls `GET/POST /support/chat`; the support Controller declares requests, tickets, details, replies, FAQs, feedback, and settings but no chat route. Failures are represente`
- `12: | **P1** | Support availability and response-time claims are fabricated | Header says “available now / response within a minute”; load failure creates a bot welcome message and send failure creates a bot error bubble. Neither is a verified `
- `13: | **P1** | Ticket selection discards the ticket identifier | Each ticket simply opens generic support chat without its `id`, although Backend has an owned request-detail/reply route. | Build a ticket detail route with the owned ticket ID, m`
- `15: | **P1** | Support chat copy and quick replies are Arabic-only | All availability, ticket, error, attachment, and quick-reply strings lack six-language coverage. | Add reviewed locale keys and safe status/error states for all supported lang`
### payment_insurance_relevance
- `13: | **P1** | Ticket selection discards the ticket identifier | Each ticket simply opens generic support chat without its `id`, although Backend has an owned request-detail/reply route. | Build a ticket detail route with the owned ticket ID, m`
- `15: | **P1** | Support chat copy and quick replies are Arabic-only | All availability, ticket, error, attachment, and quick-reply strings lack six-language coverage. | Add reviewed locale keys and safe status/error states for all supported lang`
### error_empty_loading_retry_cancel
- `12: | **P1** | Support availability and response-time claims are fabricated | Header says “available now / response within a minute”; load failure creates a bot welcome message and send failure creates a bot error bubble. Neither is a verified `
- `15: | **P1** | Support chat copy and quick replies are Arabic-only | All availability, ticket, error, attachment, and quick-reply strings lack six-language coverage. | Add reviewed locale keys and safe status/error states for all supported lang`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
