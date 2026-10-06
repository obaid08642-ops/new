# Batch 1c (web): pharmacy offers, final price, waiting, negotiation. Element audit

Slice 1c of Batch 1, patient-web, rebuilt from `canvas/PharmacyOffers` (neighbours: `States`, `CheckoutV2` for the payment rows, `OrderTracking`). HIGH effort: money, offers and order state. Written from the code on branch `wip-b1c-web`. Paths are relative to `patient-web/` unless they start with `backend/`. Routes are `/{locale}/…` (ar, en, ur, hi, bn, fil).

Routes: `/pharmacy/broadcast-status`, `/pharmacy/final-quote`, `/pharmacy/waiting-for-pharmacy` (all `?orderId=<uuid>`; `broadcast-status` also takes `requestId` / `id`), `/orders/[orderId]/offers`, `/orders/[orderId]/offers/negotiation`, `/orders/[orderId]/offers/negotiation/[threadId]`.

How to read: **Source** is `API <METHOD> <path> field`, `user input`, `static copy (messages key)` or `computed`; **Goes to** is a route, an endpoint or `none (display only)`. `[when …]` is the condition under which the element is drawn: **an element whose data the server did not send is not drawn**. Every string is a key of the `PharmacyOffers` namespace (or `RouteState`) in `messages/{ar,en,ur,hi,bn,fil}.json`.

## The rules this slice is held to (HIGH effort)

- Prices, fees, totals, expiry and the accepted state come **only** from the backend: `totals.subtotal / delivery_fee / total / currency`, `lines[].unit_price`, `expires_at`, `selected_offer_snapshot`, `governed_state`. The client adds nothing up, multiplies nothing and rounds nothing (the only thing it does with two server numbers is order them: sort, and "lowest price", see Computed below).
- Mutations (select an offer, accept the final price, register cash on delivery, accept an insurance decision, start a payment, cancel the order, send a message, accept / reject a substitute, remove an item) all go through one runner (`components-next/pharmacy-offers/use-pharmacy-action.ts`): one request at a time (a second press sends nothing), the button is disabled and shows its spinner while it runs, the idempotency key is **kept** when the outcome is unknown (dropped connection, 5xx) so a retry cannot repeat the action, and a **real** error is shown (translated by kind: offer gone, already selected, prescription needed, quote changed, not available in this state, already recorded, thread closed, blocked text, signed out, not allowed, network, generic). No optimistic totals and no fake success: after a success the page re-reads the server (`router.refresh()`), and the new state is whatever the server says.
- No time, distance or claim the server did not send. The server's constant delivery estimate (`approx_delivery`, always 60 minutes) is **not** drawn (Needs review).
- Pharmacy and chat text is user content: drawn as text with `dir="auto"`, never as markup (test `tests/pharmacy-offers.test.tsx`).

## F1. Shared frame (all six routes): `components-next/core/core-shell.tsx`

| # | Element | Kind | Source | Goes to |
|---|---|---|---|---|
| F1.1 | Back button (phones) | link | route | the order (`/{locale}/orders/{id}`), or the offers / the conversations for the negotiation pages |
| F1.2 | Page title (phones, h1 of the shell) | text | static copy (`offersTitle`, `quoteTitle`, `waitingTitle`, `negotiationTitle`, `threadTitle`) | none |
| F1.3 | h1 of the page (from 768) | text | same keys | none |
| F1.4 | Text back link under the title | link | static copy (`backToOrder`, `backToOffers`, `backToConversations`) | the same targets |
| F1.5 | Top bar (brand, sections, language, theme, notifications, cart, account), tab bar below 1024 | links | static copy (Shared, CoreShell, HomeWeb) | their own pages |

All routes are private: `requirePatientAccess` (signed out goes to the sign-in), a 401 from the backend goes to `/{locale}/login`, a 403 or 404 is the not-found page, a malformed id is the not-found page, any other failure is the board's `ErrorState` with "Try again" (`router.refresh()`).

## R1. `/orders/[orderId]/offers` and `/pharmacy/broadcast-status`

One screen (`components-next/pharmacy-offers/offers-screen.tsx`), two entry routes. Server reads: `GET /patient/pharmacy/orders/:id/offers` (the open, unexpired offers: `backend/src/modules/pharmacy/services/pharmacy-offer.service.ts` `listForPatient`) and `GET /patient/pharmacy/orders/:id` (`governed_state`, `status`, the selected snapshot, the insurance decision, the items). What is drawn follows the order's governed state: no governed state = still choosing; `OFFER_SELECTED` / `FINAL_QUOTE_READY` / `FINAL_QUOTE_ACCEPTED` / `COD_REGISTERED` = the quote section (R2); `INSURANCE_PROCESSING`, `INSURANCE_DECISION_READY`, `CONFIRMED` (covered) = the insurance blocks; `IN_FULFILLMENT` … `CANCELLED` = the status and a link to tracking. The difference between the two routes: choosing an offer on `/pharmacy/broadcast-status` goes on to `/orders/{id}/tracking?selectedOfferId=…` (as before); on `/orders/{id}/offers` it stays and re-reads.

| # | Element | Kind | Source | Goes to |
|---|---|---|---|---|
| R1.1 | Hero: pulsing storefront tile (two rings, `prefers-reduced-motion` stops them) | icon | static (FIcon `storefront`, solid; the glyph of the board, now in the web mirror) | none |
| R1.2 | Hero title | text | static copy (`heroTitleWaiting` / `heroTitleOffers`, by whether the server listed any offer) | none |
| R1.3 | Hero line: offers received | number | API offers `length`, plural-aware (`heroCount`) `[when ≥ 1]`, else `heroNone` | none |
| R1.4 | Live check strip: "checking for new offers", countdown, "Refresh now" | status, button | static copy (`liveChecking`, `liveNext`, `refreshNow`); countdown from a local timer | the page re-reads every 15 s and on the button (`router.refresh()`) `[only while there is no offer and the order is not closed]` |
| R1.5 | Sort control (price, fastest, nearest) | segmented | static copy; "fastest" disabled when no offer has `preparation_minutes`, "nearest" when none has `approx_distance_km` `[when ≥ 2 offers]` | reorders the list in the browser (ascending by the server value, a missing value last) |
| R1.6 | Offer card: pharmacy tile | icon | static (FIcon `storefront`) | none |
| R1.7 | Offer card: pharmacy name | text | API offer `pharmacy_name` (else `pharmacyFallback`) | none |
| R1.8 | Offer card: "1.5 km away · ready in about 25 minutes" | text | API `approx_distance_km`, `preparation_minutes` (Intl units) `[each when sent]` | none |
| R1.9 | Chip "Lowest price" | chip | computed: the lowest `totals.total` among offers that fill every line, only when ≥ 2 offers (see Computed) | none |
| R1.10 | Chip "All items available" / "N items not available" | chip | API `lines[].available` | none |
| R1.11 | Chip "Accepts insurance", chip "Cash on delivery" | chip | API `insurance_ready`, `cod_allowed` `[when true]` (Needs review: the server sends constant `true`) | none |
| R1.12 | Total | number | API `totals.total` + `totals.currency`, Intl currency `[when sent; else `priceMissing` and no select]` | none |
| R1.13 | Validity line | text | API `expires_at` (`validUntil`, Intl date/time); in the last hour a live "valid for N minutes" from the viewer's clock; at expiry "This offer has expired", the select button is disabled and the list is re-read once | none |
| R1.14 | "Show items and prices" disclosure | details | native `<details>` | none |
| R1.15 | Item rows: name, "× qty", unit price or "Not available", "Alternative: …" | list | API `lines[].name`, `offered_qty`, `unit_price`, `available`, `alternative` | none |
| R1.16 | Rows items / delivery / offer total | numbers | API `totals.subtotal`, `totals.delivery_fee`, `totals.total` `[each when sent]` | none |
| R1.17 | Pharmacy note | text | API `provider_note` (drawn as text) `[when sent]` | none |
| R1.18 | "How will you pay?": cash or online / insurance | radio group | user input; only the cash choice unless `insurance_ready` | the `coverage_mode` of the select call |
| R1.19 | "Select this offer" (ink button of the board, loading while it runs) | button | user action | `POST /patient/pharmacy/orders/:id/offers/:offerId/select` with `{coverage_mode}` and an idempotency key (BFF allowlist: `…/offers/<id>/select`); success: tracking (broadcast) or re-read (orders); failure: the real error under the button |
| R1.20 | "Nothing is charged when you select an offer." | text | static copy | none |
| R1.21 | Privacy line (board) | text | static copy (`privacyNote`): the backend's provider DTO carries no address or phone (`pharmacy-broadcast.service.ts` `providerBroadcastDto`) | none |
| R1.22 | Empty state (`EmptyState`, board "States") | block | static copy `[order still being asked and no offer]` | the live check keeps asking |
| R1.23 | Error state with retry (`ErrorState`) | block | static copy (`loadErrorTitle`, `loadErrorBody`, RouteState.retry) `[a read failed]` | `router.refresh()` |
| R1.24 | Negotiation block: "A pharmacy is discussing a substitute…" + button | block, link | order `status === negotiating_substitutes` (or governed `NEGOTIATION_REQUIRED`) | `/{locale}/orders/{id}/offers/negotiation` |
| R1.25 | Insurance notices | text | governed `INSURANCE_PROCESSING` (insurer reviewing), `CONFIRMED` + `payment_status covered_by_insurance` (covered in full) | none |
| R1.26 | Insurance decision: decision label, one row per item (item name from the order's `items`, covered, your share, reason), total share | list | API `insurance_decision_summary`, `insurance_item_decisions[]` | none |
| R1.27 | "Accept and pay my share" / "Pay the full price myself" per method | buttons | the server's capabilities `GET /payments/pharmacy/:id/capabilities` (methods); co-pay needs `co_pay_amount > 0`, self-pay needs a partial or rejected decision (the backend's own rule) | `POST /patient/pharmacy/orders/:id/insurance/{co-pay,self-pay}/accept` with `{payment_method}` |
| R1.28 | Past-payment panel: status label + "Track the order" | block, link | order `status` (`status.*`) when governed state is `CONFIRMED` … `CANCELLED` | `/{locale}/orders/{id}/tracking` |

## R2. The quote section (`/pharmacy/final-quote` and the offers page after a selection): `components-next/pharmacy-offers/quote-section.tsx`

Server read: `GET /patient/pharmacy/orders/:id`. The price is the selected offer's snapshot (`selected_offer_snapshot.totals`, or the revised `pending_final_quote_snapshot` while the order is `FINAL_QUOTE_READY`); the handle that is accepted is `selected_offer_hash` + `selected_offer_revision` (or the `pending_final_quote_*` pair), exactly as patient-app does.

| # | Element | Kind | Source | Goes to |
|---|---|---|---|---|
| R2.1 | "Final price" panel: lead, price, items / delivery / total rows | block | API snapshot `totals.*` `[each when sent]` | none |
| R2.2 | "Accept the final price" | button | governed state `OFFER_SELECTED` / `FINAL_QUOTE_READY` and a valid 64-hex hash and an integer revision from the server `[else "No final price is ready yet" and a link to the order]` | `POST /patient/pharmacy/orders/:id/final-quote/accept` with `{quote_hash, quote_revision}`; success re-reads |
| R2.3 | "You accepted this price" | notice | governed `FINAL_QUOTE_ACCEPTED` | none |
| R2.4 | Cash on delivery panel + "Pay on delivery" | block, button | `FINAL_QUOTE_ACCEPTED` and `coverage_mode = cash` and `accepted_quote_snapshot.cod_allowed` | `POST …/cod/register` `{}`; success: tracking (final-quote route) or re-read (offers route) |
| R2.5 | "Cash on delivery is registered. A commitment, not a payment." | notice | governed `COD_REGISTERED` | none |
| R2.6 | Online payment: "Choose a payment method" then one button per method with the server's amount | buttons | `GET /payments/pharmacy/:id/capabilities` (`methods`, `amount`, `currency`) `[offers route, after acceptance, not cash on delivery]` | `POST /payments/intent/pharmacy/:id` `{method}`; the browser goes only to an `https` checkout URL the server returned, otherwise "not available on the web yet" and nothing is recorded |
| R2.7 | "Continue to payment" | link | `[final-quote route, after acceptance, not cash on delivery]` | `/{locale}/pharmacy/payment?orderId=…` (it pointed at `tracking?pay=1`, a parameter nothing reads) |
| R2.8 | "Track the order" | link | `COD_REGISTERED` | `/{locale}/orders/{id}/tracking` |

## R3. `/pharmacy/waiting-for-pharmacy`

Server reads: the order and `GET …/offers`. When offers exist and nothing is selected the page sends the patient on to `/pharmacy/broadcast-status` (what the old "OFFERS_READY" routing meant; the backend never sends that state).

| # | Element | Kind | Source | Goes to |
|---|---|---|---|---|
| R3.1 | Hero: storefront tile, title, one line | block | static copy; rings only while the order is `broadcasting` / `awaiting_full_acceptance`; line `waitingDraft` when the order is still a draft | none |
| R3.2 | Status chip | chip | order `status` mapped to `status.*` (unknown reads "In progress") | none |
| R3.3 | "The status does not refresh by itself…" | text | static copy | none |
| R3.4 | "Refresh the status" | button | user action | `router.refresh()` (no automatic polling, as before) |
| R3.5 | "Cancel the order" then an inline confirmation (title, body, "Yes, cancel", "Keep") | button, group | `[order status not cancelled, delivered or completed]` | `POST /patient/pharmacy/orders/:id/cancel` `{reason: patient_requested}` with an idempotency key; success goes to `/{locale}/pharmacy`; failure shows the real error. It was a browser `confirm()` with text in the code |

## R4. `/orders/[orderId]/offers/negotiation`

Server reads: `GET /pharmacy/chat/threads?order_id=` and the order (item names).

| # | Element | Kind | Source | Goes to |
|---|---|---|---|---|
| R4.1 | Lead "When you decide, the pharmacy sends a revised final price…" | text | static copy | none |
| R4.2 | Conversation rows: tile, "Item: {name}", status chip, resolution chip, caret (mirrors in RTL) | links | API thread `order_item_id` (name from the order's `items`), `status`, `resolution` | `/{locale}/orders/{id}/offers/negotiation/{threadId}` |
| R4.3 | Empty state | block | static copy `[no threads]` | none |
| R4.4 | Error state with retry | block | `[threads read failed]` | `router.refresh()` |

## R5. `/orders/[orderId]/offers/negotiation/[threadId]`

Server reads: `GET /pharmacy/chat/threads/:id/messages` (`{thread, messages}`) and the order. A thread whose `order_id` is not the order in the address is a 404.

| # | Element | Kind | Source | Goes to |
|---|---|---|---|---|
| R5.1 | Item line, lead, resolution chip | text | thread `order_item_id`, `resolution` | none |
| R5.2 | Message bubbles: sender (You / Pharmacy / Nabd+), text, time | list | API `messages[].sender_role`, `text`, `createdAt` (Intl date and time; text drawn as text with `dir="auto"`, mine and theirs on opposite sides of the writing direction, system centred) | none |
| R5.3 | Suggested substitute box: name, price, notes | block | API `substitute_offer` `{name|sku, price (Intl money), notes}` | none |
| R5.4 | Reply form: label, hint, textarea (max 1000), "Send" | form | user input; `buildNegotiationMessage` (trim, 1 to 1000) | `POST /pharmacy/chat/threads/:id/messages` `{text}` `[only when the thread's own `status` is open]` |
| R5.5 | "Accept this substitute" (one per substitute message) | button | thread open and the message carries a substitute | `POST …/accept-substitute/:messageId` |
| R5.6 | "Reject the substitute", "Remove the item from my order" | buttons | thread open and a substitute exists | `POST …/reject`, `POST …/remove-item` |
| R5.7 | "This conversation is closed." | notice | thread `status` not open | none |
| R5.8 | Decision and message results | status | the real answer of the call | the page re-reads; **no price or payment is touched** |

## Computed on the client (and nothing else)

- Sort order of the offer cards (server value, ascending, missing last).
- "Lowest price" chip: the lowest `totals.total` among offers that can fill **every** line, only when there are two or more offers. It compares server numbers; it states no saving and no amount.
- "All items available" / "N items not available": a count of `lines[].available`.
- The countdown / "expired" state: the viewer's clock against the server's `expires_at`; it can only disable the button and trigger a re-read, the server decides.
- Intl formatting of every number, currency, unit and date.

## Mock / placeholder found

`node tools/design/mock-scan.mjs` over the six routes and `components-next/pharmacy-offers/`: 0 hits. The old files had: a fixed "Nabd Pharmacy, Premium Care" strapline in code, raw hex colours and inline `style=` on all three pharmacy pages, an Arabic/English-only copy table, and a browser `confirm()`.

## Defects found in the old screens and fixed here (client side)

1. The offer lines were read from `items`, which carry no product name (`{order_item_id, action, qty, unit_price}`): every line was dropped and the card showed no items. They are read from `lines` now.
2. The final price could never be accepted on the web: the revision was read from `snapshot.revision`, which the server does not send. The hash and revision are the order's top-level `selected_offer_hash` / `selected_offer_revision` (or `pending_final_quote_*`).
3. After a selection the offers page showed nothing to do: the server lists only the open offers, and the "accept the quote" buttons hung off a selected offer that is never listed. They now come from the order's own snapshot.
4. "Pay the full price myself" was never offered (it needed `covered_amount`, which the server names `insurer_share`, and a total that is absent before acceptance). It now follows the backend's rule (a partial or a rejected decision).
5. The waiting screen's "offers ready" and its cancel gate: it waited for a governed state the server never sends, and compared an upper-case set with the lower-case order status (so "cancel" was offered on a delivered order). Offers now send the patient on, and the gate uses the real statuses.
6. A decision on a closed conversation was offered (the thread status was not read), and the insurance rows showed raw item ids.
7. `?pay=1` on a tracking link that nothing reads; replaced by the payment route.
8. Copy in Arabic and English only, `window.confirm`, inline styles (CSP), raw colours, `toFixed(2)` money, a `0` total for a missing one.

## Deviations from the board and data not drawn

- Hero "range [3 / 5 / 8] km" and the three-step radius bar: the patient API does not send the broadcast radius or round (Needs review).
- "Arrives within [time]": the server sends a constant (60 minutes, `approx_delivery`); not drawn (Needs review).
- Pharmacy logo (`[شعار]`): the offer carries none; the storefront tile of the board's icon set is drawn instead.
- The select button is the board's ink button, drawn with the token pair `action.selected` (it flips in dark).
- The board selects a card, then the button turns green; here selection is a real, irreversible server call, so the coverage choice is explicit and the button goes straight to the server.
- Offers are two columns from 768 (the board is a phone layout).
