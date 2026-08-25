# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE3_PROVIDER_PHARMACY_BROADCAST_GAPS_20260819.md`
- **Member SHA-256:** `a8019dab93da1c1cbfa0303052c5fe37d645e379cbaab83a6ca4e493a441b124`
- **Line count:** 20
- **Read range:** `1-20`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: The Backend broadcast controller is JWT-protected and exposes pharmacy-scoped list/detail plus `i-have-all`, `i-have-partial`, and reject operations. Pharmacy chat is also separately protected by an owned thread/message contract. These rout`
- `11: | **P0** | Pharmacy acceptance calls an undeclared route | The Provider dashboard posts to `/provider/pharmacy/orders/:id/accept`; Backend exposes `/provider/pharmacy/broadcasts/:orderId/i-have-all` instead. The main “accept order” action c`
### backend_consumers_or_contracts
- `11: | **P0** | Pharmacy acceptance calls an undeclared route | The Provider dashboard posts to `/provider/pharmacy/orders/:id/accept`; Backend exposes `/provider/pharmacy/broadcasts/:orderId/i-have-all` instead. The main “accept order” action c`
- `15: | **P1** | Pharmacy chat tab displays a hard-coded patient conversation | `CHATS` contains a fixed named patient and message rather than the protected Backend threads endpoint. | Replace it with owner-scoped `/pharmacy/chat/threads`, messag`
### auth_ownership
- `11: | **P0** | Pharmacy acceptance calls an undeclared route | The Provider dashboard posts to `/provider/pharmacy/orders/:id/accept`; Backend exposes `/provider/pharmacy/broadcasts/:orderId/i-have-all` instead. The main “accept order” action c`
- `15: | **P1** | Pharmacy chat tab displays a hard-coded patient conversation | `CHATS` contains a fixed named patient and message rather than the protected Backend threads endpoint. | Replace it with owner-scoped `/pharmacy/chat/threads`, messag`
- `20: Pharmacy order reception is **FIX/BLOCKED**. Backend broadcast ownership exists, but the primary provider action calls the wrong contract and the displayed availability, partial fulfilment and chat experiences do not represent real operatio`
### state_transitions
- `3: ## Confirmed controls`
- `7: ## Confirmed defects`
- `11: | **P0** | Pharmacy acceptance calls an undeclared route | The Provider dashboard posts to `/provider/pharmacy/orders/:id/accept`; Backend exposes `/provider/pharmacy/broadcasts/:orderId/i-have-all` instead. The main “accept order” action c`
- `13: | **P1** | Provider online/offline switch is local polling only | Toggling “online” only starts/stops client polling; it does not persist provider availability, remove provider from broadcast eligibility, or communicate real delivery hours.`
- `14: | **P1** | Live-radar delivery context contains fabricated defaults | Cards substitute generic patient name and “one minute ago,” and may display missing distance/total without an authoritative delivery/quote DTO. | Render only patient-safe`
- `15: | **P1** | Pharmacy chat tab displays a hard-coded patient conversation | `CHATS` contains a fixed named patient and message rather than the protected Backend threads endpoint. | Replace it with owner-scoped `/pharmacy/chat/threads`, messag`
- `16: | **P1** | Arabic/English-only content and static labels remain in safety-critical reception UI | Order status, reasons, dispatch labels, time and currency formatting do not meet six-language/RTL-LTR requirement. | Use approved locale keys `
- `20: Pharmacy order reception is **FIX/BLOCKED**. Backend broadcast ownership exists, but the primary provider action calls the wrong contract and the displayed availability, partial fulfilment and chat experiences do not represent real operatio`
### payment_insurance_relevance
- `12: | **P1** | UI promises partial fulfilment/alternatives but offers only accept or reject | Dashboard declaration claims accept/partial/reject, but the rendered broadcast card has no partial-item/alternative path and never calls `i-have-parti`
- `14: | **P1** | Live-radar delivery context contains fabricated defaults | Cards substitute generic patient name and “one minute ago,” and may display missing distance/total without an authoritative delivery/quote DTO. | Render only patient-safe`
### error_empty_loading_retry_cancel
- `13: | **P1** | Provider online/offline switch is local polling only | Toggling “online” only starts/stops client polling; it does not persist provider availability, remove provider from broadcast eligibility, or communicate real delivery hours.`
- `15: | **P1** | Pharmacy chat tab displays a hard-coded patient conversation | `CHATS` contains a fixed named patient and message rather than the protected Backend threads endpoint. | Replace it with owner-scoped `/pharmacy/chat/threads`, messag`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
