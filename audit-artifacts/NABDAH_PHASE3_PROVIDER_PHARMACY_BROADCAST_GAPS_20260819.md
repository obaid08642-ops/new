# Phase 3 Provider — pharmacy broadcast and reception workflow gaps

## Confirmed controls

The Backend broadcast controller is JWT-protected and exposes pharmacy-scoped list/detail plus `i-have-all`, `i-have-partial`, and reject operations. Pharmacy chat is also separately protected by an owned thread/message contract. These routes are the authoritative receiving workflow.

## Confirmed defects

| Priority | Finding | Evidence | Required remediation |
|---|---|---|---|
| **P0** | Pharmacy acceptance calls an undeclared route | The Provider dashboard posts to `/provider/pharmacy/orders/:id/accept`; Backend exposes `/provider/pharmacy/broadcasts/:orderId/i-have-all` instead. The main “accept order” action cannot complete the defined broadcast claim. | Replace the client call with the typed authoritative claim endpoint and response; add a contract test for listing → claim → assignment/state refresh and concurrent pharmacy rejection. |
| **P1** | UI promises partial fulfilment/alternatives but offers only accept or reject | Dashboard declaration claims accept/partial/reject, but the rendered broadcast card has no partial-item/alternative path and never calls `i-have-partial`. | Build a patient-visible, server-validated partial/substitution proposal flow with stock quantities, pricing, prescription checks, patient consent and expiry; otherwise remove the claim. |
| **P1** | Provider online/offline switch is local polling only | Toggling “online” only starts/stops client polling; it does not persist provider availability, remove provider from broadcast eligibility, or communicate real delivery hours. | Bind availability to an owned server state machine, capacity, working hours and audit event; restore it on app restart and display acknowledged state only. |
| **P1** | Live-radar delivery context contains fabricated defaults | Cards substitute generic patient name and “one minute ago,” and may display missing distance/total without an authoritative delivery/quote DTO. | Render only patient-safe, server-returned dispatch fields and explicit unavailable states; do not fabricate timing, distance, or identity. |
| **P1** | Pharmacy chat tab displays a hard-coded patient conversation | `CHATS` contains a fixed named patient and message rather than the protected Backend threads endpoint. | Replace it with owner-scoped `/pharmacy/chat/threads`, message lifecycle, unread state and empty/error behavior; never seed patient messages in provider UI. |
| **P1** | Arabic/English-only content and static labels remain in safety-critical reception UI | Order status, reasons, dispatch labels, time and currency formatting do not meet six-language/RTL-LTR requirement. | Use approved locale keys and locale-safe datetime/currency formatting with accessibility tests. |

## Decision

Pharmacy order reception is **FIX/BLOCKED**. Backend broadcast ownership exists, but the primary provider action calls the wrong contract and the displayed availability, partial fulfilment and chat experiences do not represent real operational state.
