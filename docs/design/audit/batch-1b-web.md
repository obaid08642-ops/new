# Batch 1b (web) — cart and prescription screens: element audit

Slice 1b of Batch 1, patient-web, rebuilt from `canvas/Cart` (cart), `canvas/RxUpload` (upload, order from a prescription, the cart's prescription), `canvas/HealthHub` (prescription rows) and `canvas/PharmacyHub` (barcode, request). The pharmacist chat has no board: owner decision (PROGRESS.md, 2026-10-04) applied, see C1. Written from the code on branch `wip-b1b-web`, after the rebuild. Paths are relative to `patient-web/` unless they start with `backend/`. Routes are `/{locale}/…` (ar, en, ur, hi, bn, fil).

Routes: `/cart`, `/cart/prescription`, `/pharmacy/scan-prescription`, `/pharmacy/rx-order`, `/pharmacy/request`, `/pharmacy/barcode`, `/pharmacy/chat`, `/prescriptions`, `/prescriptions/[prescriptionId]`. Redirect routes of the slice (`/pharmacy/manual-order`, `/pharmacy/custom-item`, `/pharmacy/drug-not-found`, `/pharmacy` itself) were not touched. `/cart/checkout` is slice 1d and was not touched (this slice only links to it).

How to read: **Source** is `API <METHOD> <path> field`, `user input`, `browser cart` (this browser's localStorage, `lib/context/CartContext.tsx`), `static copy (messages key)` or `computed`; **Goes to** is a route, an endpoint or `none (display only)`. `[when …]` is the condition under which the element is drawn: **an element whose data is missing is not drawn**. All strings are keys of the namespace named in each section, present in the six locale files (ar, en, ur, hi, bn, fil). Every screen sits in `components-next/core/core-shell.tsx` (the shell of 1a: top bar from 768, tab bar below 1024 except where a sticky bottom bar replaces it).

## Which cart the Cart screen shows (decision)

The product pages (1a) add to the **browser cart** (`nabd_patient_cart_v1` in localStorage, no request), and the checkout of this batch (`components-next/checkout-flow.tsx`, slice 1d) reads that same cart to build the broadcast order. The **server cart** (`GET /cart`, collection `unified_carts`) is a different thing: lines of kind pharmacy, lab, radiology, doctor and home care; no web or app screen writes to it today (`POST /cart/items` has a BFF route and tests but no caller), `POST /cart/checkout` is a cash-only direct order that refuses Rx items and does not go through the offers, and a guest has no server cart at all. Handoff §1 asks that a guest can browse and fill a cart and is asked to sign in only at checkout.

So `/cart` is **open to guests** and shows the browser cart as the cart ("saved in this browser, on this device"). For a signed-in patient it adds the server's lines as a separate section "Saved in your account", with the server's own numbers and the sentence that they are not part of the cart on this device. The two are never summed. Unifying them on the server cart needs backend work (price re-validation, Rx handling, the broadcast flow) and is in Needs review (entry 1).

## F1. Shared pieces

| # | Element | Kind | Source | Goes to |
|---|---|---|---|---|
| F1.1 | `AddressCard` ("Deliver to … Change") | card | API `GET /users/me/addresses` through `/api/patient/users/me/addresses`: `label`, `street`/`line1`, `district`, `city`, `lat`, `lng`, `is_default` (the default address with a location, else the first with one) | "Change" / "Manage addresses": `/profile/addresses` |
| F1.2 | Address states | card | loading skeleton; none saved; saved but no location (a broadcast chooses pharmacies by distance, so it needs `lat`/`lng`: never guessed); read failed; signed out (nothing drawn) | `/profile/addresses` |
| F1.3 | `ButtonLink` | link | the design system's `Button` classes on a `Link` | the page named by each use |
| F1.4 | `LinkEmptyState` | block | the board's `EmptyState` with its two actions as page links | the page named by each use |
| F1.5 | `RxMedicineList` | list | a white card of rows, FIcon pill (pharmacy tone) and the lines the record has | none |
| F1.6 | Sending a request (`lib/pharmacy/broadcast.ts`) | action | `POST /patient/pharmacy/orders` (draft with the address, `fulfillment: delivery`, `payment_mode: cash`, and either `manual_request` or `prescription_id` + `items`), then `POST /patient/pharmacy/orders/:id/submit`; idempotency keys `k` and `k-submit` (a retry with the same body keeps its key) | `/pharmacy/broadcast-status?orderId=` |

## R1. `/cart` (guest or patient; `CartScreen`, namespace `CartScreen`)

Fetches on the server: `GET /cart` only when a session cookie exists (a 401 is treated as a guest). The page hands the screen only the lines' name, quantity and price, the group subtotal, the home-visit fee and the total (no patient id, notes or metadata).

| # | Element | Kind | Source | Goes to |
|---|---|---|---|---|
| R1.1 | Phone header: back, title "Cart"; desktop h1 | button / text | static copy (title) | back: `/c` |
| R1.2 | "Saved in this browser, on this device" | text | static copy (deviceNote) | none |
| R1.3 | Empty-cart button (the board's filled trash glyph in the design system's 44 px outlined circle) | button | static copy (emptyCart) `[when items]` | asks first |
| R1.4 | Confirm box "Remove everything from the cart?" with "Empty the cart" / "Keep the items" | block | static copy | clears the browser cart / closes |
| R1.5 | Address card | card | F1.1 `[when signed in and items]` | F1.1 |
| R1.6 | Item image or pill tile | image | browser cart `image`, only if the host is one `next/image` may load (`lib/image-hosts.ts`), else the pill glyph | none |
| R1.7 | Item name | link / text | browser cart `name`; a link to `/p/<slug>` `[when slug]` | product page |
| R1.8 | Pack line | text | browser cart `form`, `strength` `[when present]` | none |
| R1.9 | "Needs a prescription" chip | status | browser cart `rx` | none |
| R1.10 | Line price | number | browser cart `price` × `qty` through the locale currency formatter; "Price not available" when the price is 0 (never "0.00") | none |
| R1.11 | Quantity stepper (44 px hits), minus at 1 removes | control | user input; labels name the item (quantity, decrease, increase, remove) | browser cart; a live region says "removed" |
| R1.12 | Prescription banner "An item needs a prescription · Upload" | block / link | browser cart `rx` `[when any]` | `/pharmacy/scan-prescription` |
| R1.13 | Subtotal | number | computed from the browser cart's prices (Intl) | none |
| R1.14 | Delivery: "Set by the pharmacy's offer" | text | static copy: no fee is invented | none |
| R1.15 | Estimated total | number | the same sum, labelled "Estimated"; a note says the final price comes from the offer, or that some items have no catalogue price | none |
| R1.16 | Flow note "We send your request to nearby pharmacies…" | text | static copy | none |
| R1.17 | "Request pharmacy offers": sticky bar on phones (estimated total + button), in the summary card from 1024 | link | static copy | `/cart/checkout` (slice 1d; a guest is sent to sign in there) |
| R1.18 | "Saved in your account" section: group name, line name (by locale), "qty × price", group subtotal, home-visit fee, total | block | API `GET /cart`: `groups[].kind`, `.subtotal`, `.items[].name_ar/name_en/qty/price`, `home_visit_fee`, `total` `[when the server cart has lines]` | none |
| R1.19 | "Could not be loaded" note | text | static copy `[when GET /cart failed]` | none |
| R1.20 | Empty state, "Browse medicines", "Upload a prescription" | block | static copy `[when the cart was read and is empty]` (not before: no flash of the empty state) | `/c`, `/pharmacy/scan-prescription` |
| R1.21 | Loading skeleton | block | static copy `[until the browser cart is read]` | none |

**Not drawn:** the board's "use your points" toggle (backend gap, Needs review 2) and the "points discount" line; the board's per-item remove is the minus at quantity 1 (no extra trash per row).

## R2. `/cart/prescription` (patient; namespace `RxUpload`)

Fetch: `GET /cart/prescription` (unchanged).

| # | Element | Kind | Source | Goes to |
|---|---|---|---|---|
| R2.1 | Title "Prescription for your order" | text | static copy (cartTitle) | none |
| R2.2 | "Your latest active prescription", count and date | text | API `medications.length`, `date` (Intl; nothing when invalid) `[when a prescription exists]` | none |
| R2.3 | Medicine rows: name, dose, "Quantity: n" | list | API `medications[].name`, `.dose`, `.qty` `[each when present]` | none |
| R2.4 | "Order these medicines" | link | static copy | `/pharmacy/rx-order?prescriptionId=<prescription_id>` |
| R2.5 | "Upload another prescription" | link | static copy | `/pharmacy/scan-prescription` |
| R2.6 | Empty state "No active prescription" + "Upload prescription" | block | static copy `[when prescription_id is null or no medicine has a name]` | `/pharmacy/scan-prescription` |
| R2.7 | Error state with retry | block | static copy `[GET failed]` | `router.refresh()` |

## R3. `/pharmacy/scan-prescription` (patient; `RxUploadScreen`, namespace `RxUpload`)

Fetches (browser, through the patient proxy): `POST /ai/prescription-ocr`, `POST /prescriptions/upload`.

| # | Element | Kind | Source | Goes to |
|---|---|---|---|---|
| R3.1 | Upload zone: prescription FIcon (72), "Photograph the prescription or choose it from your photos", hint | block | static copy | none |
| R3.2 | "Camera" button + hidden file input (`capture="environment"`), accessible name "Take a photo of the prescription" | button / input | user input | opens the camera or picker |
| R3.3 | "Photos" button + hidden file input, accessible name "Choose a prescription photo from this device" | button / input | user input | opens the picker |
| R3.4 | Validation | text | the file's type (an image, not SVG) and size (at most 10 MB, shown with `Intl` unit formatting) | error line |
| R3.5 | Attachment thumbnail with remove (44 px hit) and "One photo per prescription" | image / button | the chosen file (blob preview) `[when a file is chosen]` | clears the choice |
| R3.6 | "Note for the pharmacist (optional)" | field | user input (500 characters) | `notes` of the upload `[when not empty]` |
| R3.7 | "Save prescription and continue" (sticky bar on phones, below the form from 1024), disabled without a photo, loading while busy | button | static copy | the two calls below |
| R3.8 | Stage text + progress | status | stages are the real ones: preparing the photo (scaled to 1600 px, JPEG), reading (the OCR request is open), saving with the **browser's own upload byte count** (XHR `upload.onprogress`, `<progress>` with a name); indeterminate until the first count | none |
| R3.9 | OCR call | API | `POST /ai/prescription-ocr` `{image_base64}`; a non-2xx or no medicine read stops here with its own message | none |
| R3.10 | Save call | API | `POST /prescriptions/upload` `{upload_image, items: [{name, quantity}], notes?}` with an idempotency key kept for an identical retry | `/pharmacy/rx-order?prescriptionId=<id>` |
| R3.11 | Error block (`role="alert"`) | text | one message per failure: type, size, unreadable photo, nothing read (with "Request a medicine by name" → `/pharmacy/request`), OCR unavailable, save failed, session ended (with "Sign in" → `/login`) | as named |

**Fixed client-side defects of the old screen:** it sent the OCR's items as they came, but the OCR answers `raw_name_string` / `requested_quantity` and the upload endpoint reads `name` / `quantity`, so every item was dropped and the prescription was saved empty (the items are now mapped); it redirected to `/pharmacy/checkout` (no such web route; now `/pharmacy/rx-order`); it ignored a failed OCR and a failed save status; it wrote a fixed English note into every prescription (now only the patient's own note); it waited a second with a timer before redirecting; every string and colour was literal; no accessible name on the file input.
**Not drawn:** the board's "add a photo" tile (one photo per prescription: `UploadDto.upload_image` is a single string) and its "use my insurance" toggle (Needs review 6, 7).

## R4. `/pharmacy/rx-order` (patient; `RxOrderScreen` for one prescription, a list without `prescriptionId`; namespaces `RxUpload`, `Prescriptions`)

Fetches on the server: `GET /prescriptions/:id` (with `prescriptionId`), `GET /prescriptions/active` (without). A prescription of someone else answers 404 on the server and is the not-found page.

| # | Element | Kind | Source | Goes to |
|---|---|---|---|---|
| R4.1 | List: "Prescription ABC123" (last 6 characters of the id), medicine count, date, state chip | link ×N | API `/prescriptions/active`: `id`, `items.length`, `createdAt`, `state` (not dispensed, not archived; the state through a translation key, never the raw enum) | `?prescriptionId=` |
| R4.2 | Empty state "No active prescriptions" + "Upload prescription" | block | static copy | `/pharmacy/scan-prescription` |
| R4.3 | State chip, date, "From <doctor>" | status / text | API detail `status`, `issued_at`, `doctor.display_name` `[each when present]` | none |
| R4.4 | Medicine rows with "Dose: …" | list | API detail `items[].name`, `.dose` | none |
| R4.5 | "No medicines are listed on this prescription" + "Upload prescription" / "Request a medicine by name" | block | static copy `[when no item has a name]` | `/pharmacy/scan-prescription`, `/pharmacy/request` |
| R4.6 | "This prescription can no longer be ordered from" | text | static copy `[state DISPENSED or ARCHIVED]` | none |
| R4.7 | Address card | card | F1.1 `[when orderable and has medicines]` | F1.1 |
| R4.8 | "Request pharmacy offers" (sticky bar / desk) | button | static copy; shown **only** when the prescription is orderable, has named medicines and the address has a location | F1.6 with `kind: prescription` (each medicine `qty: 1`: the patient view carries no quantity, the pharmacy confirms it) |
| R4.9 | Note "Your request goes to nearby pharmacies… No price or payment is set at this step." | text | static copy | none |
| R4.10 | Error line | text | send failed / session ended with "Sign in" | `/login` |

**Fixed:** the old screen linked to `/cart/checkout?prescriptionId=…`, which ignores that parameter and builds its order from the browser cart, so ordering from a prescription ended in "cart is empty". The screen now sends the request itself (R4.8). It also read `items[].name` from the list endpoint, whose items carry `medicine_name_ar` (every count was 0).

## R5. `/pharmacy/request` (patient; `RequestScreen`, namespace `PharmacyRequest`)

| # | Element | Kind | Source | Goes to |
|---|---|---|---|---|
| R5.1 | Title, lead | text | static copy | none |
| R5.2 | "Medicine name" field, hint "At least 3 characters" | field | user input (200 characters) | `manual_request.name` |
| R5.3 | "Details for the pharmacy (optional)" | field | user input (500 characters) | `manual_request.details` |
| R5.4 | Address card | card | F1.1 | F1.1 |
| R5.5 | "Send to nearby pharmacies" (sticky bar / below the form), enabled with a name of 3+ characters and an address with a location | button | static copy | F1.6 with `kind: manual` |
| R5.6 | Note and error line | text | static copy; the error appears only for a failed call | `/login` for an ended session |

**Fixed:** the old form created the draft but never submitted it and sent no address, so no pharmacy was ever asked; and it posted through a route that takes the first cookie it finds and cannot refresh a session. It now creates and submits (like the app) through the patient proxy.

## R6. `/pharmacy/barcode` (patient; `BarcodeScreen`, namespace `PharmacyBarcode`)

Fetch (browser): `GET /medicines/by-barcode/:code` through the proxy.

| # | Element | Kind | Source | Goes to |
|---|---|---|---|---|
| R6.1 | Title, intro | text | static copy | none |
| R6.2 | Barcode field + "Look up" | field / button | user input (spaces removed, 64 characters) | the lookup |
| R6.3 | Found card: "Medicine found" or "Closest match", name (by locale), form · strength · maker, price, Rx chip, "Barcode: …" | card | API `medicine.name_ar/name_en/form/strength/manufacturer/price/requires_prescription`; **`source: catalog` is a barcode match, `fuzzy` is a name match on what was typed and is labelled so, never "recognised"**; no price drawn when it is 0 | none |
| R6.4 | "View the product" | link | API `medicine.slug` (else the id) | `/p/<slug>` or `/medicines/<id>` |
| R6.5 | "Look up another barcode" | button | static copy | clears |
| R6.6 | Not-found card "Medicine not found" + "Request it by name" | block / link | static copy `[found: false]` | `/pharmacy/request` |
| R6.7 | Error lines | text | lookup failed / session ended | `/login` |

**Fixed:** the old intro claimed "point the camera at the barcode" (there is no camera scan on the web) and a link "snap the package for AI recognition" went to the prescription OCR; the fuzzy match was shown as recognised; strings and colours were literal.

## R7. `/pharmacy/chat` (patient; `ChatScreen`, namespace `PharmacyChat`) — no board

Owner decision for screens without a board: keep the current layout (a conversation, the pharmacy's substitute offers, a message box), apply tokens, font and the shared components. Needs `?orderId=<uuid>` (else not found). Fetches (browser): `GET /pharmacy/chat/threads?order_id=`, `GET /pharmacy/chat/threads/:id/messages`, `POST …/messages`, `POST …/accept-substitute/:messageId`, `POST …/reject`, `POST …/remove-item`.

| # | Element | Kind | Source | Goes to |
|---|---|---|---|---|
| R7.1 | Conversation chips "Conversation n" | button ×N | API threads `[when more than one]` (the open one is chosen first) | switches |
| R7.2 | Message bubbles with sender ("You" / "Pharmacy") and date-time | list | API messages `sender_role` (patient, pharmacy), `text`, `createdAt` (Intl); system lines are not drawn (the backend writes them in Arabic only) | none |
| R7.3 | Substitute offer: name (or sku), price, "Accepting it takes effect only in the new final quote." | block | API `substitute_offer.name/sku/price` | none |
| R7.4 | "Accept, pending the final quote", "Reject the substitute", "Ask to remove the item" | buttons | **only while the thread is open** (old screen offered them on closed threads and got `thread_closed`) | the three POSTs |
| R7.5 | How a closed thread ended | text | API thread `status`, `resolution` (accepted, rejected, removed) | none |
| R7.6 | Message box + "Send" (only while open; 1000 characters) | field / button | user input | `POST …/messages {text}` |
| R7.7 | Errors | text | send failed, content blocked by the backend (`content_blocked`), decision failed, session ended, load failed with retry | as named |
| R7.8 | Empty state | block | static copy `[no thread for the order]` + "Back to the order" | `/orders/<id>` |

**Not drawn:** image messages (`image_uri`) and substitute images: the API sends them, the old screen did not draw them either, and nothing here is specified for them.

## R8. `/prescriptions` (patient; namespace `Prescriptions`)

Fetch (unchanged): `GET /prescriptions/mine`, reduced on the server to id, state, date, item names (the raw documents also carry the diagnosis, notes and the photo; none reaches the page).

| # | Element | Kind | Source | Goes to |
|---|---|---|---|---|
| R8.1 | Title; "Upload a prescription" | text / link | static copy `[when there are prescriptions]` | `/pharmacy/scan-prescription` |
| R8.2 | Row: FIcon, title ("From <doctor>" when the record has one, else the state), medicine names (2 lines), "n medicines · date", state chip `[when a doctor is shown]`, caret (mirrors in RTL) | link ×N | API `state`, `items[].medicine_name_ar`, `createdAt` | `/prescriptions/<id>` |
| R8.3 | Empty state | block | static copy + "Upload a prescription" | `/pharmacy/scan-prescription` |
| R8.4 | Error state with retry | block | static copy | `router.refresh()` |

## R9. `/prescriptions/[prescriptionId]` (patient; namespace `Prescriptions`)

Fetch (new on this page): `GET /prescriptions/:id`, the patient's own bounded view (backend `toPatientWebDto`). Before this slice the page said "details aren't available yet" for every prescription (a contract that now exists). A foreign or missing id is the not-found page.

| # | Element | Kind | Source | Goes to |
|---|---|---|---|---|
| R9.1 | Header card: state (translated), "Issued <date>", medicine count chip, doctor and specialty | card | API `status`, `issued_at`, `items.length`, `doctor.display_name`, `.specialty` `[each when present]` | none |
| R9.2 | Medicine rows: name, "Dose: …", "Every n hours" / "n times a day", "For n days" | list | API `items[].name/dose/frequency.every_hours|times_per_day/duration` (ICU plural per language, numbers through the locale) | none |
| R9.3 | "Order these medicines" | link | static copy `[orderable and has medicines]` | `/pharmacy/rx-order?prescriptionId=` |
| R9.4 | "No longer be ordered from" / "No medicines are listed" | text | static copy | none |
| R9.5 | "Back to prescriptions" | link | static copy | `/prescriptions` |
| R9.6 | Error state with retry | block | static copy | `router.refresh()` |

**Not drawn (the patient view does not carry them):** diagnosis, instructions text, quantity, the photo, the pharmacy it was sent to.

## Removed from the old screens

Hero cards with eyebrows ("Private cart", "Smart Pharmacy Service", "Nabd Pharmacy — Premium Care"), the vector illustrations in glass tiles, the free-delivery claim ("Free" next to the delivery fee in the old cart summary: the fee comes from the pharmacy's offer), the fixed English prescription note written by the old upload, the Arabic/English hard-coded strings of all nine screens, the unused `cart-view`, `scan-prescription-form`, `pharmacy-request-form`, `pharmacy-barcode-client`, `pharmacy-chat-client` and the stylesheets of the old pages.

## Checks run on this slice

See `audit/runtime-batch-1b-web.md` (production build, normal / empty / error through the fault proxy, DOM check, console), the screenshots in `screenshots/batch1b-web/` and the Needs review file `needs-review/batch-1b-web.json`.
