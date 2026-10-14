# Batch 1, slice 1a, patient-app: per-screen element audit

Pharmacy hub and product screens, rebuilt from the boards on `design/batch-1` (base `5fab5997`). Screens: the hub (`app/(tabs)/pharmacy.tsx`, route `/pharmacy`, PharmacyHub), `/pharmacy/product-detail` (ProductFull), `/pharmacy/wishlist`, `/pharmacy/filters`, `/pharmacy/medicine-compare` (the three follow the PharmacyHub template; there is no board of their own). Findings that could not be settled from the client are in `docs/design/needs-review/batch-1a-app.json` (NR below = the entries of that file, in order of appearance in the file). Runtime results: `docs/design/audit/runtime-batch-1a-app.md` (the endpoint list of all Batch 1 app routes, run with the seeded patient, a guest and no session).

Paths are relative to `patient-app/` unless they start with `backend/` or `packages/`. Shared pieces: `src/components/pharmacy/PharmacyKit.tsx` (Kit), `src/components/pharmacy/ProductSections.tsx` (Sections), `src/utils/pharmacyCatalog.ts` (Catalog: the row type, the name, price, discount and filter helpers).

Source values: `API <METHOD> <path> field <name>` · `user input` · `static copy` · `derived` · `route param` · `local cart (CartContext)`. Every visible string is a key of `src/i18n/locales/*.json` (`pharmacy.*`, 177 keys in ar, en, ur, hi, bn, tl), read with `useScreenUi().k(key, vars)`; numbers and prices with `useScreenUi().num / money` (Intl); dates with `dateLocaleFor(lang)`. See section 10.

Backend: `GET /medicines` (list, public), `GET /medicines/:id/details` (public, `?lang=`), `POST /medicines/compare` (public), `GET /medicines/filters` (public), `POST /medicines/events`, `POST /medicines/:id/suggest-change` (public), `GET|POST /users/me/wishlist[/:id]` (patient), `GET /patient/pharmacy/orders` (patient). Client helper: `src/utils/api.ts` `apiFetch` (fetch; Idempotency-Key on mutations; a 401 deletes the stored token).

## 1. Hub: `/pharmacy` (`app/(tabs)/pharmacy.tsx`), board PharmacyHub

The tabs layout (`app/(tabs)/_layout.tsx:19`) turns the shared header off for this tab (the board draws its own title row).

| Element | Kind | Source | Goes to | file:line |
|---|---|---|---|---|
| Title "الصيدلية" | text | static copy | none | pharmacy.tsx:212 |
| My orders (44 round, receipt glyph) | button | static copy | `/pharmacy/order-history` | pharmacy.tsx:214 |
| Cart (44 round, package glyph) + count bubble | button | count = `itemCount` of the local cart; hidden at 0 | `/pharmacy/cart` | pharmacy.tsx:215 |
| Search field with clear and barcode button | field | user input; sent as `search=` after 350 ms | the barcode button opens `/pharmacy/barcode-scanner` | pharmacy.tsx:223 |
| Ink camera square "تصوير الروشتة" | button | static copy | `/pharmacy/scan-prescription` | pharmacy.tsx:236 |
| "ارفع الروشتة" hero card | link | static copy | `/pharmacy/scan-prescription` | pharmacy.tsx:240 |
| Quick tiles: استشارة صيدلي, المفضلة, التذكيرات | links | static copy (`QUICK`) | `/pharmacy/pharmacist-chat`, `/pharmacy/wishlist`, `/health/medication-reminder-list` | pharmacy.tsx:63,255 |
| "قارن البدائل" tile (board) | not drawn | no way to pick ids on the hub | NR "قارن البدائل" | pharmacy.tsx:63 |
| "أعد طلبك السابق" card | link | `GET /patient/pharmacy/orders`: latest non-draft order with items; count of `items`, `createdAt` (member only; hidden for visitors and guests and when none) | `/pharmacy/reorder?orderId=` | pharmacy.tsx:172,285 |
| Filter chip with count | chip | count of filter params (route params of `/pharmacy/filters`) | `/pharmacy/filters` | pharmacy.tsx:305 |
| Category chips (8) | chips | static list `PHARMACY_CATEGORIES` (NR category chips) | sets the active category; sent as `category=` | pharmacy.tsx:307; Catalog:36 |
| Product card: picture | image | `GET /medicines` rows: `images[]`, `image_1..5`, `image` (first); no picture = tinted tile with the pill glyph (`ProductImage`, expo-image, disk cache, fixed 132 box) | opens the product | Kit / `src/components/ProductImage.tsx` |
| Product card: discount badge | badge | `discount_percent` or `old_price` over `price`; hidden when no real discount | none | Catalog `discountPercent` |
| Product card: name | text | `name` in the app language (`name_*`, `translations`) | product page | Catalog `medName` |
| Product card: "company · pack" | text | `manufacturer`, `package_size`, each only if present | none | Catalog `medMeta` |
| Product card: price + "ر.س" | text | `price`; hidden when missing or 0 | none | Catalog `medPrice`; ui-native `ProductCard` |
| Product card: "يحتاج وصفة" | text | `requires_prescription` | none | pharmacy.tsx:370 |
| Product card: add button | button | static copy (label) | puts the medicine in the local cart (`addToCart`); a prescription medicine shows the notice first | pharmacy.tsx:371; Kit `useAddMedToCart` |
| Card tap | link | route params `id`, `name` | `/pharmacy/product-detail`; fires `POST /medicines/events {product_clicked}` | pharmacy.tsx:201 |
| Loading, empty, error, offline | states | skeleton cards; `EmptyState` ("لا توجد منتجات", or "لم نجد أدوية مطابقة لبحثك" when searching/filtering) with the manual request button to `/pharmacy/request`; `ErrorState`; `OfflineState` | retry reloads | pharmacy.tsx:316-345 |

Kept from before: the list request and its offline copy (`@nabdah_offline_cat_<query>`), the client pass over the answer (moved to `filterMeds`, unchanged), the product navigation list for the swipe on the product page (`setVisibleProductIds`), the `product_clicked` event, the filter route params. Changed: the search is sent after a 350 ms pause (it was sent on every key); a category chosen on the filter screen becomes the active chip and a chip tap overrides it (before, `filter_category` always won); the cards no longer rotate through several pictures (the board draws one, and the slide animation ignored reduced motion: `RotatingCardImage` is deleted); the 1/2-column toggle, the floating cart button, the hero banner (its "SFDA licence", "60-minute delivery", "original 100 %" claims have no data) and the quantity stepper on the card are gone (not on the board; the cart count is on the header, quantities are changed in the cart).

## 2. Product page: `/pharmacy/product-detail` (`app/pharmacy/product-detail.tsx`), board ProductFull

Calls: `GET /medicines/:id/details?lang=` (the row: every field, `images` gallery, `discount_percent`, `potentially_unavailable`, `discontinued`, `alternatives`, `stock_status`), `POST /medicines/events {product_viewed}`, `GET /users/me/wishlist` (heart state), `POST /users/me/wishlist/:id` (toggle), `POST /medicines/compare {ids}` (related products, NR), `POST /medicines/:id/suggest-change`. Kept: the edge swipe to the next or previous product of the hub list, tap-to-zoom, the wishlist, the suggest-an-edit sheet, the prefetch of alternatives, the cart notice for prescription medicines.

| Element | Kind | Source | Goes to | file:line |
|---|---|---|---|---|
| Back (glass 44) | button | static | `router.back()` (hub if there is no history) | product-detail.tsx:716 |
| Share | button | link `https://app.nabdahplus.com/s/medicine/<slug or id>` (NR share link) | system share sheet | :720 |
| Favourite heart | button | `GET /users/me/wishlist` contains the id | `POST /users/me/wishlist/:id`; icon unchanged when it fails | :725 |
| Cart + count | button | local cart `itemCount` | `/pharmacy/cart` | :729 |
| Gallery (paging, dots) | image list | `images`, `image_1..5`, `image` de-duplicated; no image = pill glyph, no fake photo | tap opens the zoom view | :479-520 |
| Badge "خصم X%" | badge | `discount_percent` or computed from `old_price` over `price` | none | :501 |
| Badge "حصري أونلاين" | badge | `online_exclusive` | none | :507 |
| Rx chip | chip | `requires_prescription` ("يحتاج وصفة" / "بدون وصفة") | none | :525 |
| Category chip | chip | `category` (and `sub_category`) | `/(tabs)/pharmacy?filter_category=<category>` | :527 |
| Cold-chain chip | chip | `cold_chain` | none | :533 |
| Name | text | `name` in the app language | none | :538 |
| English name | text | `name_en` when the app is not English and it differs | none | :539 |
| Active ingredient · scientific name | text | `active_ingredient`, `generic_name`, each only if present | none | :540 |
| Maker · made in | text | `manufacturer`, `country_of_origin` | none | :546 |
| Price, old price struck, "شامل الضريبة · pack" | text | `price`, `old_price` (only with a real discount), `package_size`; hidden when no price (NR tax words) | none | :562-568 |
| Quantity stepper | control | local quantity 1-10; bound to the cart line once the product is in the cart | `updateQty` on the cart | :572 |
| Availability row | text | `pharmacies_count` (> 0 only) (NR availability) | none | :583 |
| Points line | not drawn | no preview endpoint (NR points) | none | |
| Shortage banner | banner | `potentially_unavailable` (`availability_status`), `shortage_notes`; `discontinued` shows "تم إيقاف هذا المنتج" and hides the quantity and the buy bar, alternatives first | none | :596 |
| Rx upload card | link | shown when the medicine needs a prescription | `/pharmacy/scan-prescription` | :612 |
| Delivery / pickup control | not drawn | no field, no cart mode (NR delivery) | none | |
| Insurance row | not drawn | NR insurance | none | |
| Key facts (3 columns) | grid | `form`, `strength`, `package_size`, `storage_conditions_*` (when 28 characters or less), `country_of_origin`, Rx; only those present | none | :630 |
| Alternatives row | cards | `alternatives[]` of the details call; chip "أوفر" / "نفس السعر" only by comparing the two real prices | card: product page; "عرض الكل": `/pharmacy/medicine-compare?ids=<this>,<alternatives>` (up to 4) | :395 |
| Safety card | rows | `pregnancy_info_*`, `breastfeeding_info_*`, `cold_chain`, `controlled`; rows only for what exists | none | :640 |
| Details accordion | list | description (NR kept), indications, dosage, usage instructions, warnings, precautions, side effects, contraindications, `interactions[]`, pregnancy and breastfeeding, storage, more info; empty ones removed, the first open, the count when more than one item | none | :647 |
| Medical review line | text | `medical_review_status = approved`, `last_reviewed` | none | :650 |
| Related products | cards | `related_product_ids[]` read with `POST /medicines/compare` (NR related) | card: product page; add: local cart | :662 |
| "اسأل صيدليًا" | link | static | `/pharmacy/pharmacist-chat` | :681 |
| "اقتراح تعديل على هذا الصنف" | button | static | opens the sheet; "إرسال الاقتراح" posts `POST /medicines/:id/suggest-change {type, changes, note}` (fields and types as before) | :698, :269 |
| SKU · barcode | text | `sku`, `barcode` when present | none | :704 |
| Footer: total | text | `price` times the shown quantity; hidden without a price | none | :437 |
| Footer: cart square | button | in the cart: "عرض السلة" (opens it); else adds the chosen quantity | `/pharmacy/cart` or local cart | :449 |
| Footer: "اشترِ الآن" | button | adds the chosen quantity unless it is already in the cart | `/pharmacy/cart` (login is asked at checkout, as before) | :426,455 |
| Loading, not found, error, offline | states | skeleton; `EmptyState` ("المنتج غير موجود"); `ErrorState`; `OfflineState` (before: a spinner and a bare line) | retry reloads | :353-380 |

Removed because the API never sends it: the "Similar items" row (`med.similar`).

## 3. Wishlist: `/pharmacy/wishlist` (`app/pharmacy/wishlist.tsx`)

| Element | Kind | Source | Goes to | file:line |
|---|---|---|---|---|
| Header "المفضلة", back | AppHeader | static | `router.back()` | wishlist.tsx:139 |
| Row: picture, name, price, chip "متوفر / غير متوفر", "يحتاج وصفة" | row | `GET /users/me/wishlist`: `image`, `name_ar`/`name_en`, `price` (hidden when 0), `available` (NR availability chip), `requires_prescription` | the row opens `/pharmacy/product-detail` | wishlist.tsx:21-45 |
| Remove (heart) | button | static | `POST /users/me/wishlist/:id`; the row returns when the server refuses | wishlist.tsx:93 |
| Add (plus) | button | disabled when `available` is false | puts the medicine in the local cart | wishlist.tsx:62 |
| Empty / error / offline / loading | states | `EmptyState` with "ابدأ التسوق" to the hub; `ErrorState`; `OfflineState`; skeleton rows; pull to refresh | retry reloads | wishlist.tsx:108-127 |

## 4. Filters: `/pharmacy/filters` (`app/pharmacy/filters.tsx`)

| Element | Kind | Source | Goes to | file:line |
|---|---|---|---|---|
| Header "تصفية النتائج", back, "إعادة تعيين" | AppHeader | static; reset shown when a filter is on | back / clears the choices | filters.tsx:113 |
| Sort chips (4) | chips | static ids `relevant`, `price_asc`, `price_desc`, `newest` (NR sort options) | `filter_sort` | filters.tsx:20,139 |
| Category chips | chips | `GET /medicines/filters` `categories` (a known id shows its plain name, others as the catalogue wrote them); the section is not drawn when there are none | `filter_category` | filters.tsx:149 |
| Prescription-only switch | toggle | user input | `filter_rx` | filters.tsx:164 |
| Price range (min, max) | fields | user input | `filter_min_price`, `filter_max_price` | filters.tsx:180 |
| Form chips | chips | `filters` `forms` (NR forms) | `filter_forms` | filters.tsx:195 |
| Maker search + chips | field, chips | `filters` `brands`; the search filters the chips | `filter_brands` | filters.tsx:208 |
| "تطبيق الفلاتر (n)" | button | n = number of active choices | `router.replace('/(tabs)/pharmacy', params)` | filters.tsx:93 |
| Error / offline | states | `ErrorState` / `OfflineState` with retry | reload | filters.tsx:131 |

Removed: the per-category icons and colours (`iconMap` with raw colours) and the blur header.

## 5. Comparison: `/pharmacy/medicine-compare` (`app/pharmacy/medicine-compare.tsx`)

`POST /medicines/compare {ids}` with the ids of the route (nothing is called without ids: the empty state shows). Rows: ingredient (`active_ingredient`), strength, form, pack (`package_size`), price (`price`, the lowest real price gets "الأقل سعرًا" only when prices differ), prescription (`requires_prescription`), side effects (`side_effects_*`); a row nobody has a value for is not drawn, a missing cell shows "—". The "rating" and "quantity" rows are gone (no such fields; NR). Each medicine: picture, name, maker, opens the product page; "أضف للسلة" now really adds to the local cart (it was `onPress={() => {}}`: WIRING_REPORT §6 hit removed). States: skeleton, empty ("لا توجد أدوية للمقارنة"), error, offline.

## 6. Tokens, colours and rules

- Zero raw colours in every touched file (hex, rgb(a), named): `no-raw-color` baseline 8739 -> **8538** (the five touched screens, `ProductImage` left it: 82+78+26+9+4+... colours; `RotatingCardImage` deleted); `client-token-sync` 918 -> **916** (`ProductImage`); `no-left-right` 526 -> **500** (the hub, filters, product page left it); `Dimensions.get` 39 -> **38** (product page). `no-px-font-size` 256 (unchanged, none added), `no-emoji-in-ui` 47 (none added), `no-large-raster` 0.
- No token change, no new colour, logo or pattern. The legacy colours (cyan `#23B5CE`, mint `#00E599`, orange `#F0695C`, the dark-green hero gradient, red `#EF4444`) are replaced by the nearest tokens (action, selected, status, service tones, `bg.media`). The board draws status and tone colours as hex; each maps to the token of the same role (`status.success/warning/info`, `service.*`, `text.link`).
- Component changes in `packages/ui-native`: `ProductCard` takes an optional `image` node (the app draws the picture with expo-image) and draws the price only when it is given; no visual change otherwise.
- Icons: the hub's header buttons use the board's fill glyphs (receipt, package); the product header uses the line icons (the fill set has no cart) and the board's own share path.

## 7. Mock and placeholder scan

`node tools/design/screen-inventory.mjs` then `--check` (exit 0). `mock-scan` over the touched files: 0 hits (before: the dead add-to-cart of the comparison, `WIRING_REPORT` §6, now gone; the hits list went from 16 to 15 and that row is the only one in these screens). Hard-coded data left: the category list and the sort options (static copy, NR), the four quick links (static navigation).

## 8. Runtime check and states

`node tools/design/runtime-check-api.mjs --batch 1 --out docs/design/audit/runtime-batch-1a-app.md`: 33 routes, 0 failures. The hub and filter GETs answer 200 for patient, guest and no session (`/medicines` `[]`, `/medicines/filters` with the six fallback forms and no categories or brands: NR); `GET /patient/pharmacy/orders` 200 (patient: 1 draft order, guest: `[]`) and 401 with no session (the hub asks only members); `GET /users/me/wishlist` 200 `[]` for patient and guest, 401 with no session; `GET /medicines/hot` `[]`. Mutations and calls that need an id are listed, not run. The local catalogue is empty, so the product, wishlist and comparison screens were rendered with `--api empty` (real empty states, committed), `--api offline` (the error state, inspected) and `--api fixture` (marked test products; images kept outside the repo). Unit tests: `__tests__/batch1a-pharmacy.test.tsx` (helpers, hub, product page) and `__tests__/medicine-compare.test.tsx` (the two original assertions unchanged; the mocks gained `BASE_URL`, `isRTL` and the cart provider because the screen now draws pictures and uses the cart; two assertions added).

## 9. Deviations from the boards

1. Hub: a "تصفية" chip leads the category chips (the board has no entry to the filter screen; the Consult board's filter square is not on PharmacyHub). The "قارن البدائل" tile is not drawn (NR). The reorder card only for members with a real order.
2. Product page: no delivery/pickup control, no insurance row, no points line, no "unavailable" lock (NR); "متوفر في N صيدليات" without "قريبة" or a distance; the description section stays (NR); header cart and back use line icons.
3. Product page tablet: the column is capped at 440 and centred; the white gallery band spans the width.
4. Wishlist, filters, comparison: no board of their own; built from the PharmacyHub template (AppHeader, chips, cards, StickyFooter).
5. The board's `[N]` cart bubble sits at the end corner (the board puts it at the left edge in Arabic).

## 10. Translation rule (owner, 2026-10-06; QUALITY_STANDARDS §8)

- **Literals cleared.** `tools/design/no-literal-ui-string.mjs` (copied from `design/batch-0-fixes-2` commit `7217032d`, not committed here: it arrives with that branch): the six files of this slice had **157** literals in that tool's baseline (hub 36, product page 70, filters 27, comparison 13, wishlist 11) and now have **0**; total 6752 -> **6595**. `--list` on `ProductImage`, `PharmacyKit`, `ProductSections`, `pharmacyCatalog` and `ScreenKit`: 0.
- **Keys.** 177 `pharmacy.*` keys added to the six locale files (`tl` is the Filipino file), the same keys and `{slots}` in all six (checked by `__tests__/batch1a-pharmacy.test.tsx`, which also fails on Arabic script in a non-Arabic, non-Urdu file). `tools/design/locale-parity.mjs`: 0 problems in `pharmacy.*` in any language; the totals it still reports (app: ar 29 english, ur/hi/bn/tl 66 missing, tl 4 english) are the 30 junk keys of the base branch (JSX source pasted as keys, removed on `design/batch-0-fixes-2`) and the 36 older gaps, none of them new. Where the phrase catalogue had a broken or wrong translation for a string reused here (Form, Sent, Strength, "Filters app", Hindi text with Urdu endings, "Agree" for OK) it was corrected in the new key, not copied.
- **No Arabic or English fallback.** A missing key shows the key (the gate fails), never another language; the screens no longer call `autoTranslate`.
- **Layout.** The shared `Button` (ui-native) is now `minHeight` with a wrapping label (it was a fixed height with `numberOfLines={1}`), so Hindi, Bengali and Filipino labels grow the button; the only test line that pinned the height (`design-system-components.test.tsx`, "a primary Button paints the gradient tokens") now asserts `minHeight`. Prices, quantities, discounts, counts, the date of the last order and the review date go through `Intl` (`money`, `num`, `dateLocaleFor`). Chevrons and the back arrow follow `dir` (ar and ur mirror). Compare columns and chips scroll or wrap; no fixed widths on labels.
- **Screenshots.** en and ur at 390 next to Arabic, light and dark: `after/<screen>-en-*.png`, `after/<screen>-ur-*.png` (empty states: no catalogue locally). Layouts with marked test values (en, ur, hi) were checked in `/tmp`, not committed.
