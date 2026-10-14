# Batch 1a (web) — pharmacy browse and product screens: element audit

Slice 1a of Batch 1, patient-web, rebuilt from `canvas/PharmacyHub`, `ProductWeb` and `ProductFull` (neighbours: `Cart`, `States`). Written from the code on branch `wip-b1a-web` (after the rebuild). Paths are relative to `patient-web/` unless they start with `backend/`. Routes are `/{locale}/…` (ar, en, ur, hi, bn, fil).

Routes: `/c/[[...category]]`, `/medicines`, `/medicines/compare`, `/medicine/[slug]` (same page as `/p/[slug]`), `/p/[slug]`, `/pharmacy/[slug]`, `/pharmacy/filters`, `/pharmacy/interactions`, `/wishlist`. `/p`, `/medicine` and `/medicines/[medicineId]` are redirects and were not touched.

How to read: **Source** is `API <METHOD> <path> field`, `user input`, `static copy (messages key)` or `computed`; **Goes to** is a route, an endpoint or `none (display only)`. `[when …]` is the condition under which the element is drawn: **an element whose data is missing is not drawn**. All strings are keys of the `PharmacyBrowse` namespace (or the namespace named), present in the six locale files.

## F1. Shared frame: `components-next/core/core-shell.tsx` (all nine routes)

| # | Element | Kind | Source | Goes to |
|---|---|---|---|---|
| F1.1 | Back button (phones) | link | route (prop `backHref`) | the list or category the page belongs to |
| F1.2 | Page title (phones, h1) | text | route (prop `title`) | none |
| F1.3 | Brand mark and word (from 768) | link | static copy (Shared.brand) | `/{locale}` |
| F1.4 | Top bar search (product pages only, from 768) | field | user input | `/{locale}/c?q=…` |
| F1.5 | Five section links (from 1024) | link | static copy (Shared.nav*) | `/{locale}`, `/pharmacy`, `/consultations/doctors`, `/diagnostics/labs`, `/home-care` |
| F1.6 | Language, theme, notifications, cart, account (from 768) | button / link | static copy (CoreShell.*) | their own pages |
| F1.7 | Tab bar (below 1024; hidden on product pages, which have the sticky buy bar) | link ×5 | static copy | same five targets |
| F1.8 | Sticky bottom bar (product pages below 1024) | region | page prop | see P-bar |

## R1. `/c/[[...category]]` (and `/c`), public, SEO, ISR 1 h

Fetches: `GET /public/categories/:locale` (tree) and `GET /public/categories/:locale/items?category&sub&page&q` through `getPublicCategories` / `getPublicCategoryProducts` (unchanged). Metadata, hreflang ×6, canonical, noindex from page 2, JSON-LD `CollectionPage` + `ItemList` are unchanged (title and description now come from messages, no hard-coded Arabic).

| # | Element | Kind | Source | Goes to |
|---|---|---|---|---|
| R1.1 | Heading (h1 from 768; phone header) | text | route param / `q` / static copy (allTitle, resultsFor) | none |
| R1.2 | Product count | number | API items `total` (locale number format) `[when total > 0]` | none |
| R1.3 | Search field | field | user input | `/c?q=` (router push on submit) |
| R1.4 | Clear button inside the field | button | static copy (clear) `[when text]` | clears the field |
| R1.5 | Barcode button inside the field | button | static copy (scan) | `/pharmacy/barcode` |
| R1.6 | Filter square | button | static copy (filter) | `/pharmacy/filters` |
| R1.7 | "All" chip | link | static copy (all) `[when the tree has categories]` | `/c` |
| R1.8 | Category chips (name, count) | link ×N | API tree `categories[].name`, `.count` | `/c/<name>` |
| R1.9 | Subcategory chips (name, count) | link ×N | API tree `categories[].subs{}` `[when a category is open and has subs]` | `/c/<main>/<sub>` |
| R1.10 | Product card: image | image | API item `image` (CDN) `[else the pill glyph]` | lazy; first two eager |
| R1.11 | Product card: discount badge | text | computed from `old_price` > `price` (never invented) | none |
| R1.12 | Product card: name | link | API item `name` | `/p/<slug>` |
| R1.13 | Product card: form · strength · pack | text | API item `form`, `strength`, `package_size` `[each when present]` | none |
| R1.14 | Product card: price, currency | number | API item `price` through the locale currency formatter `[price > 0, else "price not available" and the add button is disabled]` | none |
| R1.15 | Product card: prescription note | text | API item `is_rx` (PublicProduct.rxRequired) | none |
| R1.16 | Product card: add button | button | static copy (addToCart with the name) | browser cart (localStorage), no request |
| R1.17 | Live status "added to cart" | status | static copy | none |
| R1.18 | Pager: previous, "page n of m", next | link / text | `page`, `total / limit` `[when pages > 1]` | `?page=` (keeps `q`) |
| R1.19 | Empty state | block | static copy (emptyTitle, emptyBody) `[items = []]` + "browse all" link `[unless already on /c without q]` | `/c` |
| R1.20 | Error state with retry | block | static copy (errorTitle, errorBody, RouteState.retry) `[catalogue did not answer]` | `router.refresh()` |

## R2. `/medicines`, public SSR (`GET /medicines?limit=24&page&q[&category&sort]`)

| # | Element | Kind | Source | Goes to |
|---|---|---|---|---|
| R2.1 | Heading | text | static copy (Medicines.title) | none |
| R2.2 | Search field, barcode, filter | field / buttons | user input; static copy | `/medicines?q=`, `/pharmacy/barcode`, `/pharmacy/filters` |
| R2.3 | Row: pill glyph | icon | static (service map: pharmacy) | none |
| R2.4 | Row: name | text | API `name_ar` / `name_en` by locale | the row links to `/medicines/<id>` (redirects to `/p/<slug>`) |
| R2.5 | Row: active ingredient, form · strength | text | API `active_ingredient`, `form`, `strength` `[each when present]` | none |
| R2.6 | Row: prescription chip | status | API `requires_prescription === true` | none |
| R2.7 | Row caret (mirrors in RTL) | icon | static | none |
| R2.8 | Pager | link | `page`; "next" when the page is full (24) | `?page=` keeps `q`, `category`, `sort` |
| R2.9 | Empty / error states | block | static copy (emptyTitle, Medicines.empty, Medicines.unavailable*) | retry refreshes |

## R3. `/medicines/compare?ids=a,b`

| # | Element | Kind | Source | Goes to |
|---|---|---|---|---|
| R3.1 | Back link | link | static copy (MedicineCompare.back) | `/medicines` |
| R3.2 | Heading | text | static copy | none |
| R3.3 | Table header cells | text | API `name` or `title` per medicine | none |
| R3.4 | Table rows: active ingredient, price, dosage form, manufacturer | text | API fields `active_ingredient`, `price` (locale currency format), `dosage_form`, `manufacturer`; a row is not drawn when no medicine has it; a missing cell is a dash | none |
| R3.5 | Empty state + "browse medicines" | block / link | static copy `[fewer than 2 medicines resolved]` | `/medicines` |

## R4. `/p/[slug]` and `/medicine/[slug]`, public, SEO

Fetches: `GET /public/product/:locale/:slug` (unchanged) and, new, `GET /public/products/search?q=<active ingredient>&locale&limit=12` for the alternatives (exact ingredient match, without the product itself). Metadata, hreflang ×6 (per-locale slugs), canonical, robots, Open Graph, JSON-LD (Product, MedicalDrug, BreadcrumbList, FAQPage, HowTo) are unchanged except that no stock photo is listed when the product has no picture.

| # | Element | Kind | Source | Goes to |
|---|---|---|---|---|
| P1 | Breadcrumb (from 768) | links | static copy (Shared.navPharmacy) + API `category`, `sub_category`, name | `/c`, `/c/<cat>`, `/c/<cat>/<sub>` |
| P2 | Gallery stage | image / button | API `images[]` (CDN, optimizer, first eager) `[else the pill glyph tile]`; opens the zoom dialog | none |
| P3 | Zoom dialog and close | dialog / button | same image; static copy (zoomImage, closeImage) | none |
| P4 | Thumbnails (76 px from 768) / dots (phones) | button ×N | API `images[]` `[when more than one]`; static copy (showImage) | switches the stage |
| P5 | Discount badge | text | computed from `old_price` > `price` `[when true]` | none |
| P6 | Prescription chip | status | API `is_rx` (rxRequired / otc) | none |
| P7 | Availability chip | status | API `available`, `availability_status` (available / limited / unavailable) | none |
| P8 | Category chip (phones) | link | API `category › sub_category` `[when present]` | `/c/<cat>/<sub>` |
| P9 | h1 | text | API `name` (official name wins, as before) | none |
| P10 | Second name | text | API `official_name` `[when different]` | none |
| P11 | Active ingredient line | text | API `active_ingredient` `[when present]` | none |
| P12 | Maker · country line | text | API `manufacturer`, `country_of_origin` `[each when present]` | none |
| P13 | Price, currency, old price (struck) | number | API `price`, `old_price` (locale currency format) `[price > 0, else "price not available"]` | none |
| P14 | "VAT included · pack" | text | static copy + API `package_size` | none |
| P15 | Shortage / discontinued banner | block | API `available`, `availability_status` `[when not available]` | none |
| P16 | Prescription card + upload link | block / link | API `is_rx` `[when true]` | `/pharmacy/scan-prescription` |
| P17 | Quantity stepper | button ×2 | user input (1–10) | none |
| P18 | Add to cart (from 1024 inline, below it in the sticky bar) | button | product fields for the cart | browser cart, no request; status shows "added" and a "view cart" link to `/cart` |
| P19 | Buy now | button | same | adds, then `/cart` |
| P-bar | Sticky bar: total, add, buy now (below 1024) | region | price × quantity (locale currency) `[when buyable]` | as P18, P19 |
| P20 | Key facts: form, strength, pack, manufacturer, origin, prescription yes/no | text | API fields (`[each when present]`) | none |
| P21 | Ask a pharmacist card | link | static copy (askTitle, askBody) | `/pharmacy/chat` |
| P22 | Alternatives (rail on phones, 5 columns from 1024) | cards | API search items (name, form, strength, pack, price, image, `is_rx`); "lower price" badge computed from the two prices `[when any]` | `/p/<slug>`; add button as R1.16 |
| P23 | Alternatives "see all" | link | static copy + API `active_ingredient` | `/c?q=<ingredient>` |
| P24 | Details tabs (from 768) / accordion (phones): usage (description, indications, dosage, how to use), warnings, side effects, storage and more (storage, package contents, brand benefits) | tabs / buttons | API `description`, `indications[]`, `dosage_instructions`, `how_to_use[]`, `warnings[]`, `side_effects[]`, `storage_conditions`, `package_content_details`, `brand_benefits` (a group or section with no text is not drawn; first section open on phones) | none |
| P25 | Disclaimer, SKU, barcode | text | static copy + API `sku`, `barcode` `[when present]` | none |
| P26 | Cite block: text and copy button | text / button | page title, canonical URL, static copy | clipboard |

**Not drawn (the API has no field; see Needs review):** heart / wishlist, share, cold-chain chip, controlled-drug row, interactions, contraindications, precautions, pregnancy and breastfeeding, medical review date, "available in N pharmacies / nearest distance", delivery and pickup segmented control, insurance row, loyalty points line, online-exclusive badge, related products.

## R5. `/pharmacy/[slug]`, public, SEO

Fetch (unchanged): `GET {NEXT_PUBLIC_API_URL}/api/v1/entity-graph/related/pharmacy/:slug`, fallback `GET /seo/resolve/doctor/:slug`. JSON-LD (Pharmacy, BreadcrumbList) unchanged except that the invented fallback city "Riyadh" is gone. Metadata strings come from messages.

| # | Element | Kind | Source | Goes to |
|---|---|---|---|---|
| R5.1 | Pill glyph, name (h1) | icon / text | API entity `name_ar` / `name_en` / `name` | none |
| R5.2 | Location row | text | API `city`, `district` `[when present]` | none |
| R5.3 | Delivery time row | text | API `estimated_delivery_time` `[when present]` (was a made-up "within 60 minutes") | none |
| R5.4 | License row | text | API `sfda_license_number` / `license_number` `[when present]` (was a made-up "SFDA-VERIFIED") | none |
| R5.5 | Upload prescription button | link | static copy; API `id` | `/pharmacy/scan-prescription?pharmacyId=` |
| R5.6 | "24/7 open" tile and "SFDA licensed" badges | removed | were static claims with no data | none |

## R6. `/pharmacy/filters` (patient session)

Fetch (unchanged): `GET /medicines/filters`.

| # | Element | Kind | Source | Goes to |
|---|---|---|---|---|
| R6.1 | Sort: most relevant / most popular | segmented | static copy; sent as `sort=smart_ranking|trending` | `/medicines?sort=` |
| R6.2 | Category chips | button ×N | API `categories[]`; "All" static | `/medicines?category=` |
| R6.3 | Show results | button | static copy | `/medicines?category&sort` |
| R6.4 | Reset | button | static copy | clears the choice |
| R6.5 | Dosage form, manufacturer search, prescription-only, price range, price/newest sorting | removed | `GET /medicines` cannot apply them (Needs review) | none |

## R7. `/pharmacy/interactions` (patient session)

| # | Element | Kind | Source | Goes to |
|---|---|---|---|---|
| R7.1 | Medicine name field + Add | field / button | user input (2–200 characters, up to 20) | adds to the list |
| R7.2 | Added medicine chips + remove (44 px) | list / button | user input | removes |
| R7.3 | Check interactions | button | static copy | `POST /api/ai/drug-interactions` (BFF) with `{drugs}` |
| R7.4 | Verdict, severity chips, notes | text | API `safe`, `interactions[].severity` (high / moderate / low only), `.note_ar` / `.note` | none |
| R7.5 | Error line, advisory note | text | static copy | none |

## R8. `/wishlist` (patient session)

Fetch (unchanged): `GET /users/me/wishlist`.

| # | Element | Kind | Source | Goes to |
|---|---|---|---|---|
| R8.1 | Heading and note | text | static copy (Wishlist.title, notice) | none |
| R8.2 | Row: name, brand | text | API `name_ar` / `name_en`, `brand` | row links to `/medicines/<id>` |
| R8.3 | Row: price | number | API `price` (locale currency format) `[when present]` (was "price unavailable") | none |
| R8.4 | Row: stock chip | status | API `inStock` / `in_stock` `[when known]` | none |
| R8.5 | Empty state + "start shopping" | block / link | static copy | `/medicine-catalog` |
| R8.6 | Error state with retry | block | static copy | `router.refresh()` |

## Removed from the old screens (no board place, or not real)

Hero banners with claims ("Nabd verified pharmacy", "100 % genuine and licensed", "cold-chain fast delivery", "flexible returns"), the fixed Arabic/English category list with vector illustrations, the "available" and "free delivery" labels on every product card, the "private catalogue" eyebrows, the lightbox's Arabic-only labels, the stock photo for products without pictures, the BibTeX block.

## Checks run on this slice

**Runtime check** (`audit/runtime-batch-1a-web.md`, production build, locale ar, 390 px, seeded backend, normal / empty / error through the fault proxy): `/medicines`, `/medicines/compare`, `/pharmacy/filters`, `/pharmacy/interactions`, `/wishlist`, `/c`, `/c/medications`, `/p/<missing>`, `/pharmacy/<missing>`: 27 runs, 0 with issues, 0 console errors. `tools/design/runtime-check.mjs` got `--only` and `--extra` (a slice of a batch, and concrete values for dynamic routes); nothing else in it changed. A dev server built with webpack (the worktree's `node_modules` is a symlink, which Turbopack refuses) logs four `style-src-elem webpack-internal` CSP lines per page; they are dev-only and are absent in the production run.

**Server-rendered states.** Those pages cache their fetches, so the tool's empty/error runs after a normal run see the cached answer. The two states were therefore forced on URLs that were never fetched (`/c?q=<new>`, `/medicines?q=<new>`) and on the uncached screens, with the fault proxy in `error` and `empty` mode: `/c` and `/medicines` show the error card with retry ("المنتجات غير متاحة الآن", "تعذر تحميل الدواء") or the empty card; `/wishlist` shows "تعذر تحميل قائمة الأمنيات" or "قائمة الأمنيات فارغة"; `/pharmacy/filters` shows the error card (it was a not-found page before); `/medicines/compare` with ids and failing reads shows its empty card. Screenshots: `screenshots/batch1a-web/after/states-*`.

**DOM check** (Playwright, 390 / 768 / 1440, light and dark, Arabic; product, category, medicines, wishlist, pharmacy, filters, interactions pages with injected TEST payloads and with the real empty state): `style=` attributes in the server HTML 0; in the live DOM only the framework's own (`<html color-scheme>`, the dev overlay); console errors 0; horizontal overflow 0; controls without an accessible name 0; targets under 44 px: only the product card's add button (drawn 40, with the design system's 44 px hit extender inside it) and, before the fix, the gallery dots (now 44 wide).

**Test data.** The public product catalogue is empty on the seeded backend, so product cards, gallery, details and alternatives were looked at with TEST payloads (a mock of the public endpoints at the network edge of the dev server, images answered by the browser). Those images stay outside the repo. Committed screenshots show only the real empty, error and not-found states; none carries seeded data.

**Shared JS** (production webpack builds of `design/batch-1` and this branch, `node tools/design/js-size.mjs`, gzip over the network): `/ar` 235.3 → 236.7 KB; `/ar/c` 238.2 → 246.0; `/ar/medicines` 236.4 → 245.6; `/ar/p/<slug>` 240.6 → 249.8; `/ar/pharmacy/<slug>` 236.2 → 240.8. Both builds are over the 170 KB budget (webpack bundles larger than Turbopack, whose numbers `PROGRESS.md` quotes). The growth is the shell, search and cards the pages now draw (the same core shell as search and notifications, `Search`, `FIcon` with the full fill table, `ProductCard`); the cart provider in the layout adds about 1.4 KB to every route.
