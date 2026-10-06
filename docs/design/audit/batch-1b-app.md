# Batch 1, slice 1b, patient-app: per-screen element audit

Cart and prescription screens, rebuilt on the 1a kit on branch `wip-b1b-app` (base `design/batch-1` `3fe30bcc`). Screens: `/pharmacy/cart` (board Cart), `/pharmacy/scan-prescription` (board RxUpload), `/pharmacy/rx-order` (RxUpload family, no board of its own), `/pharmacy/barcode-scanner` and `/pharmacy/request` (PharmacyHub family: the 1a hub opens them from its search field and its empty state), `/pharmacy/pharmacist-chat` (no board: owner decision of 2026-10-04, screens without a board keep their layout and only take the tokens, the font and the shared components). The three redirect routes of the slice (`/pharmacy/custom-item`, `/pharmacy/drug-not-found`, `/pharmacy/manual-order`) are unchanged and still redirect to `/pharmacy/request` with their params.

Paths are relative to `patient-app/` unless they start with `backend/`, `packages/` or `docs/`. Shared pieces: `src/components/pharmacy/PharmacyKit.tsx` (added here: `goBack`, `Pill`, `Notice`, `PickButton`; the 1a `Glyph`, `PHARMACY_TONE`, `useAddMedToCart`), `src/components/screen/ScreenKit.tsx` (`useScreenUi`: `k`, `num`, `money`, `flow`), `packages/ui-native` (`Screen`, `AppHeader`, `StickyFooter`, `Button`, `Card`, `Stepper`, `Input`, `EmptyState`, `ErrorState`, `OfflineState`, `FIcon`, `Icon`).

Source values: `API <METHOD> <path> field <name>` · `user input` · `static copy` · `derived` · `route param` · `local cart (CartContext)`. Every visible string is a key of `src/i18n/locales/*.json` (122 new `pharmacy.cart.*`, `pharmacy.scan.*`, `pharmacy.rx.*`, `pharmacy.barcode.*`, `pharmacy.request.*`, `pharmacy.chat.*` keys and `pharmacy.openSettings`, in ar, en, ur, hi, bn, tl), read with `useScreenUi().k(key, vars)`; numbers and prices with `num` / `money` (Intl), dates and times with `toLocale…String(dateLocaleFor(lang), { numberingSystem: 'latn' })` (Latin digits next to the Latin digits of every number, as the rest of the app does).

## 1. Cart: `/pharmacy/cart` (`app/pharmacy/cart.tsx`), board Cart

The cart is the local list of `CartContext` (no API call). It holds no price on purpose (see Needs review): the pharmacies' offers set the price.

| Element | Kind | Source | Goes to | file:line |
|---|---|---|---|---|
| Back (44 round) | button | static | `goBack()`: back, or the hub when there is no history | cart.tsx:77 |
| Title "السلة" | text | static copy `pharmacy.cart` | none | cart.tsx:78 |
| Empty-the-cart (trash, header action) | button | static; only with lines | `showLocalizedAlert` (`pharmacy.cart.clearTitle/clearBody`, Cancel, Empty) then `clearCart()` | cart.tsx:66,81 |
| "N items" line | text | derived: count of cart lines (`num`) | none | cart.tsx:118 |
| Line: picture | image | local cart `image` (first gallery picture stored when added); none = tinted tile with the pill glyph (`ProductImage`) | none | cart.tsx:30 |
| Line: name | text | local cart `name` | none | cart.tsx:33 |
| Line: active ingredient | text | local cart `activeIngredient`; hidden when empty | none | cart.tsx:34 |
| Line: "Needs prescription" | chip | local cart `rx` (copied from `requires_prescription` when added) | none | cart.tsx:35 |
| Line: quantity stepper (− n +) | control | local cart `qty`, 1 to 99 (the minus is off at 1: removing is its own button); each button has an accessible name with the medicine ("Decrease the quantity of X"); number via `num` | `updateQty(id, delta)` | cart.tsx:36 |
| Line: remove (trash 44) | button | static; label names the medicine | `removeItem(id)` | cart.tsx:49 |
| Prescription banner (icon, title, line, "Upload") | notice | shown only when `hasRxItems` (a line has `rx`) | "Upload": `/pharmacy/scan-prescription` | cart.tsx:130 |
| "Can't find your medicine? Add a manual request" | link | static | `/pharmacy/request` | cart.tsx:133 |
| Note "Prices come from the pharmacies' offers…" | text | static copy (the broadcast model of the handoff) | none | cart.tsx:143 |
| Sticky button | button | static: "Request pharmacy offers", or "Choose a prescription to continue" when `hasRxItems` | `/pharmacy/checkout` or `/pharmacy/rx-order` (unchanged behaviour) | cart.tsx:73,108 |
| Empty cart: icon, title, line, "Browse medicines" | EmptyState | static | `router.replace('/(tabs)/pharmacy')` (the hub) | cart.tsx:92 |

Not drawn (board rows with no data; Needs review): the delivery-address row (chosen at checkout), the unit price and the footer total, the totals card, the points switch.

## 2. Prescription upload: `/pharmacy/scan-prescription` (`app/pharmacy/scan-prescription.tsx`), board RxUpload

| Element | Kind | Source | Goes to | file:line |
|---|---|---|---|---|
| Back, title "ارفع الروشتة" | AppHeader | static | `goBack()` | scan-prescription.tsx:87 |
| Dashed zone: Rx tile (72), title, hint | static | static copy | none | scan-prescription.tsx:102 |
| Camera (ink) and Photos (outline) buttons | buttons | static | `ImagePicker.requestCameraPermissionsAsync` / `requestMediaLibraryPermissionsAsync`, then `launchCameraAsync` / `launchImageLibraryAsync` (images, quality 0.8, base64) | scan-prescription.tsx:108 |
| Permission notice (camera / photos) + "Open settings" | notice | shown when the permission result is `granted: false`; texts translated | `Linking.openSettings()` | scan-prescription.tsx:114 |
| Read / pick / save error notices | notice | the failing step; texts translated, no server text | none | scan-prescription.tsx:124 |
| "Attachment": the chosen photo (92×112) with remove | image + button | the picker's `uri`; remove clears it | none | scan-prescription.tsx:134 |
| Note for the pharmacist (optional) | field | user input; sent in `notes` after the staff tag | none | scan-prescription.tsx:150 |
| Privacy line | text | static copy | none | scan-prescription.tsx:152 |
| Sticky "Save the prescription and continue" | button | off until a photo is chosen; loading while saving; a live line says "Saving…" | `POST /ai/prescription-ocr {image_base64}` then `POST /prescriptions/upload {upload_image, items, notes}` (items = the OCR's `items`), then `router.replace('/pharmacy/rx-order', {prescriptionId})` | scan-prescription.tsx:60,91 |

Behaviour change (board): before, picking a photo uploaded it at once; now the photo is shown as an attachment and nothing is sent until the sticky button (the patient can remove a wrong photo). Not drawn: the board's insurance switch (checkout) and the add-another tile (the endpoint takes one photo). Fixed: the Arabic-only alerts and the generic `ScreenState` wrapper; the screen is typed without `any`.

## 3. Prescription order: `/pharmacy/rx-order` (`app/pharmacy/rx-order.tsx`), RxUpload family

| Element | Kind | Source | Goes to | file:line |
|---|---|---|---|---|
| Back, title "طلب أدوية الوصفة" | AppHeader | static | `goBack()` | rx-order.tsx:90 |
| List mode (no `prescriptionId`): intro line | text | static copy | none | rx-order.tsx:171 |
| Row: Rx tile, "Prescription #XXXXXX", count and date, state chip | row | `GET /prescriptions/active`: `id` (last 6), `items.length`, `createdAt`, `state` (label from `pharmacy.rx.state.<STATE>`; an unknown state draws no chip) | `router.replace('/pharmacy/rx-order', {prescriptionId})` | rx-order.tsx:179 |
| "Upload a new prescription" | button | static | `/pharmacy/scan-prescription` | rx-order.tsx:198 |
| Detail mode: intro, header card (Rx tile, number, date, state chip) | text, card | `GET /prescriptions/:id`: `id`, `issued_at`, `status` | none | rx-order.tsx:129 |
| Medicines card: name, dose, quantity | list | `items[]`: `name` (or `medicine_name_ar/en`), `dose`; quantity only when the line carries `quantity`/`qty` (this endpoint does not send it: NR) | none | rx-order.tsx:142 |
| No orderable line: empty state + "Upload a new prescription" | EmptyState | derived: no line with a name | `/pharmacy/scan-prescription` | rx-order.tsx:160 |
| Sticky "Review the address and request offers" | button | shown only when a named line exists | `router.replace('/pharmacy/checkout', {prescriptionId})` (slice 1d) | rx-order.tsx:98 |
| Loading, empty, error, offline | states | skeleton; `EmptyState` ("No active prescriptions", action upload); `ErrorState` with retry; `OfflineState` | retry reloads | rx-order.tsx:112-124 |

Fixed: every line showed "Quantity: 1" (a default the API never sent); the intro and states were Arabic-only.

## 4. Barcode scanner: `/pharmacy/barcode-scanner` (`app/pharmacy/barcode-scanner.tsx`), PharmacyHub family

| Element | Kind | Source | Goes to | file:line |
|---|---|---|---|---|
| Back (44 round), title "مسح الباركود" | header | static (`pharmacy.hub.scanBarcode`) | `goBack()` | barcode-scanner.tsx:119 |
| Camera permission: asking / refused (ask again) / blocked (settings) | states | `useCameraPermissions()` (`granted`, `canAskAgain`) | `requestPermission()` / `Linking.openSettings()` | barcode-scanner.tsx:224 |
| Scan frame with four corners | camera | `CameraView` (back camera, 11 barcode types); label "Barcode scanning area" | `onBarcodeScanned` → `GET /medicines/by-barcode/:code` | barcode-scanner.tsx:238 |
| "Looking the medicine up…" | spinner | derived | none | barcode-scanner.tsx:244 |
| "Photograph the pack to identify it" | button | static | `takePictureAsync` → `POST /ai/medicine-image-search {image_base64}` → `GET /medicines?search=&limit=5` → product page, or `/search?q=` | barcode-scanner.tsx:79,246 |
| Photo problem line | text | unknown pack / request failed (two translated texts) | none | barcode-scanner.tsx:249 |
| "Can't find the medicine? Add it manually" | link | static | `/pharmacy/request` | barcode-scanner.tsx:137 |
| Found card: name, maker and pack, "Needs prescription", price, code | card | `GET /medicines/by-barcode`: `medicine` fields `name_*`, `manufacturer`, `package_size`, `requires_prescription`, `price` (hidden when 0 or missing); `code` = the scanned code | none | barcode-scanner.tsx:144 |
| Found: "Add to cart" | button | static | `useAddMedToCart` (local cart; the Rx notice for a prescription medicine) then `/pharmacy/cart` | barcode-scanner.tsx:169 |
| Found: "View details", "Scan another medicine" | buttons | static | `/pharmacy/product-detail` / back to the camera | barcode-scanner.tsx:174 |
| Not found card | card | `found: false` | "Photograph the pack" (back to the camera), manual request (`/pharmacy/request`), scan another | barcode-scanner.tsx:184 |
| Lookup failed card + Retry | card | the request failed (offline, server) | retries the same code | barcode-scanner.tsx:199 |

Fixed: a constant "Available" badge (the endpoint says nothing about stock), a failed request reported as "not in the directory", the raw colours (`#000`, `#fff`, `#10B981`, `#FCA5A5`), the left/right corners, the Arabic-only texts. The camera backdrop is the token `bg.inverse` (ink) with `text.onInverse`.

## 5. Manual request: `/pharmacy/request` (`app/pharmacy/request.tsx`), PharmacyHub family

| Element | Kind | Source | Goes to | file:line |
|---|---|---|---|---|
| Back, title "طلب دواء" | AppHeader | static | `goBack()` | request.tsx:90 |
| Intro line | text | static copy | none | request.tsx:105 |
| Medicine name | field | user input, at least 3 characters (a hint appears under 3) | none | request.tsx:115 |
| Details (optional) | field | user input (multiline) | none | request.tsx:126 |
| Delivery location card: label, street and city | card | `resolveEffectiveAddress()` (last picked address, else `GET /users/me/addresses` default or first), read again on focus; fields `label`, `street`/`address`, `city`; "no valid address" when none; a warning line when it has no map point | none | request.tsx:130 |
| "Change the location" | link | static | `/shared/location-picker` | request.tsx:142 |
| No-location notice, send-failed notice | notice | translated texts in the screen (they were system alerts, with server text) | none | request.tsx:147 |
| Sticky "Send the request and get offers" | button | off until 3 characters and the address is loaded; loading while sending | `POST /patient/pharmacy/orders` (the draft: `raw_name` "name — details", `qty` 1, `intake_source: manual`, the address with `lat`/`lng`) then `POST /patient/pharmacy/orders/:id/submit`, both with one idempotency key per visit (`<key>`, `<key>-submit`); then `router.replace('/pharmacy/broadcast-status', {orderId})` | request.tsx:62,97 |

Fixed (see Needs review): the changed location was ignored; Arabic-only copy; alerts; `Math.random` key (now `newIdempotencyKey()`).

## 6. Pharmacist chat: `/pharmacy/pharmacist-chat` (`app/pharmacy/pharmacist-chat.tsx`), no board

| Element | Kind | Source | Goes to | file:line |
|---|---|---|---|---|
| Back, title "تفاوض بدائل الصيدلية" | AppHeader | static | `goBack()` | pharmacist-chat.tsx:126 |
| No order id: empty state + "My orders" | EmptyState | route param `orderId` absent: nothing is called | `router.replace('/pharmacy/order-history')` | pharmacist-chat.tsx:134 |
| Thread chips "Item n" (more than one thread) | buttons | `GET /pharmacy/chat/threads?order_id=`: one per thread, numbered by position (the old label was the last 5 characters of an internal id) | `GET /pharmacy/chat/threads/:id/messages` | pharmacist-chat.tsx:245 |
| Subtitle "The decision waits for a new final price" | text | static copy | none | pharmacist-chat.tsx:258 |
| Message bubbles (pharmacy: card; you: action colour; system: centred note) | list | `messages[]`: `text`, `sender_role`, `createdAt` (time, Latin digits), `substitute_offer` | none | pharmacist-chat.tsx:159 |
| Substitute: name, price line | text | `substitute_offer.name`/`sku`, `price` through `money` + currency (hidden when missing) | none | pharmacist-chat.tsx:189 |
| Accept / Reject / Ask to remove | buttons | shown on a pharmacy message with an offer while `thread.status === 'open'` | `POST …/accept-substitute/:msgId`, `/reject`, `/remove-item` (idempotency key each) — **403 for the patient today (NR)** | pharmacist-chat.tsx:193 |
| Composer (field + "Send") | field, button | user input, 1 to 1000 characters; shown only while the thread is open | `POST …/messages {text}`; `content_blocked` is explained | pharmacist-chat.tsx:224 |
| Closed thread line | text | `thread.status` closed, `thread.resolution` accepted / rejected / removed | none | pharmacist-chat.tsx:228 |
| Loading, empty, error, offline | states | skeleton bubbles; `EmptyState`; `ErrorState` retry; `OfflineState`; pull to refresh | retry reloads | pharmacist-chat.tsx:153 |

Fixed: raw colours, the hard-coded currency text with `toFixed(2)` (now `money` plus the currency key), the internal id fragment on the chips, errors that showed server text, no closed-thread state.

## 7. Tokens, colours and rules

- Zero raw colours in every touched file (hex, rgb(a), named). `no-raw-color` baseline 8139 -> **8111** (the six screens and `PharmacyKit` are clean; 5 files left it). `client-token-sync` **916 -> 916** (none of these files was in its baseline; it did not go up). `no-left-right` 497 -> **485** (barcode corners, cart, request, chat, rx-order). `no-literal-ui-string` 6148 -> **6068**; `--changed origin/design/batch-1`: 16 files, 0 literals. `locale-parity` totals unchanged (678 known, none new; the 122 new keys have 0 missing, 0 empty, 0 English in all six languages).
- No token change, no new colour, logo or pattern. Legacy colours (cyan `#23B5CE`, orange `#F0695C`, the barcode green and rose, white-on-anything) are replaced by tokens: action, selected (ink), status warning / danger / success, service tones, `bg.media`, `bg.inverse`. The board's Rx banner colours (`#FFF6E3`, `#6B4600`) map to `status.warning`.
- Component changes: `PharmacyKit` only (`goBack`, `Pill`, `Notice`, `PickButton`); no change in `packages/ui-native`.
- Quantity stepper: accessible name per medicine, 44 px targets (`hitSlop`), the live region of the value, number through `num`.

## 8. Mock and placeholder scan

`node tools/design/screen-inventory.mjs` then `--check`: 0 unresolved calls. `mock-scan` (WIRING_REPORT §6): 0 hits in these screens and in `PharmacyKit` (before: none either for these files; the old code had a `Math.random` key and constant "Available", now gone). Hard-coded data left: none (the staff tag `OCR extraction; requires pharmacy review` is stored with the prescription, marked `i18n-ok`, never shown to the patient).

## 9. Runtime check and states

`node tools/design/runtime-check-api.mjs --batch 1 --out docs/design/audit/runtime-batch-1b-app.md`: 33 routes, 0 failures; plus the by-hand probes of this slice at the end of that file (the patient chat actions answer 403). Screenshots: `docs/design/screenshots/batch1b-app/{before,after,compare}`. Files with `-testdata` show marked TEST values (the render tool's fixtures: test cart lines, a test prescription, a test address, a test chat) and are labelled so; files without it are the empty state of the real (empty) local backend answers. Arabic and light/dark at 390, 768 in `-768-testdata`, English and Urdu at 390 in `-en-testdata` and `-ur-testdata`, offline in `-offline`.

## 10. Deviations from the boards

1. Cart: no price, total, points or address rows (NR); the board's Rx banner button is "Upload" and leads to the upload screen; the manual-request link and the note replace the totals card.
2. RxUpload: one attachment (the endpoint takes one photo), no insurance switch (checkout); the note goes into the prescription's `notes`.
3. rx-order, barcode, request and chat have no board: they follow RxUpload / PharmacyHub (cards, chips, sticky bar) or, for the chat, keep their layout with the tokens.
4. Tablet (768): the column is capped at 440 and centred (`COLUMN`), as the other rebuilt screens.
5. The scanner is on the ink surface of the tokens (the board family has no camera screen).

## 11. Translation rule (owner, 2026-10-06; QUALITY_STANDARDS §8)

- Literals cleared: the six screens held Arabic text in code (labels, alerts, errors, placeholders); `no-literal-ui-string` went 6148 -> 6068 (80 fewer) and `--changed origin/design/batch-1` reports 0 literals in the 16 files of this slice.
- No Arabic or English fallback: a missing key shows the key and `__tests__/batch1b-cart-prescription.test.tsx` fails (all six files checked for the same keys and `{slots}`, no Arabic script in hi, bn, en, tl; every `k('…')` of the six screens exists).
- Layout: buttons are `minHeight`/`minWidth` with wrapping labels (the long Hindi, Bengali and Filipino labels were checked in `-en`/`-ur` shots and by reading; the sticky button wraps to two lines in English at 390); no `numberOfLines={1}` on a label here; chevrons (back, forward) follow the reading direction; prices, counts, dates and times through Intl.
- Terms follow the 1a files (ar الروشتة/وصفة, ur نسخہ, hi नुस्खा, bn প্রেসক্রিপশন, tl reseta).
