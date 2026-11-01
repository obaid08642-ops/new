# Web changes of the design session and the app (owner scope, 2026-11-01)

Only changes made on the **patient web** that the **app** may lack. Nothing is redesigned here: a missing change is ported as it is (same layout, tokens, behaviour, keys). Read from git (`origin/main`, merged design PRs since 2026-10-28) and the code of both apps; no renders. Window: 2026-10-28 to 2026-11-01; earlier web work is compared only for the filters, below.

## Merged web design PRs

| PR | Change (branch) | Web files | App files | App status |
|---|---|---|---|---|
| #2349 | specialties-board-tiles | 17 | 13 | done: the same PR changed the app too |
| #2338 | receipt-web-qr | 2 | 0 | n/a: the app already draws the QR dark on a light panel |
| #2294 | receipt-web | 19 | 0 | done: app twin #2332 (the receipt card); web QR fix #2338 needed no app change |
| #2165 | web-header-requests | 4 | 0 | n/a: the app wishlist button only opens the list, it makes no signed-out request |
| #2164 | web-insurance-add-policy | 9 | 0 | done: the app sends the insurance class (`add-policy.tsx:153`) and shows and saves the insurer name in the app language (`add-policy.tsx:145`, `:181`) |
| #2163 | web-legal-cache | 2 | 0 | n/a: web cache behaviour for the legal pages |
| #2162 | web-support-chat-history | 3 | 0 | done: the app loads the support chat history on open (`SupportViews.tsx:39`) |
| #2161 | web-signup-login | 6 | 0 | done: same 8-character password rule in the app (`register.tsx:45`); the field-description links are web accessibility markup |
| #2153 | no-review-text | 1 | 1 | done: the same PR changed the app too |
| #2151 | empty-provider-notify-me | 24 | 14 | done: the same PR changed the app too |
| #2146 | home-top-bar-order | 4 | 5 | done: the same PR changed the app too |
| #2145 | consult-my-appointments | 32 | 21 | done: the same PR changed the app too |
| #2144 | labs-radiology-cart-sheet | 12 | 11 | done: the same PR changed the app too |
| #2143 | fix-fab-cutout-anchor | 4 | 1 | done: the same PR changed the app too |
| #2132 | catalogue-ranking-search-web | 9 | 0 | done: app twin #2133 (catalogue ranking and search) |
| #2130 | i03-delete-insurance-card | 9 | 8 | done: the same PR changed the app too |
| #2126 | language-fallback-web | 48 | 0 | done: app twin #2127 (language fallback, 40 files) |
| #2125 | fix-ar-font-ur-leak | 3 | 0 | done: app twin #2131 (sheet fonts); Urdu font loader exists in `app/_layout.tsx` |
| #2115 | nursing-teal-only | 4 | 2 | done: the same PR changed the app too |
| #2114 | orders-results-web | 35 | 0 | done: app twin #2111 (orders and results) |
| #2110 | web-hover-coral-soft | 9 | 0 | n/a: hover tint: a pointer effect, the app has no hover |
| #2108 | labs-hub-sheet-web | 19 | 0 | done: app twin #2102 (labs hub filter sheet) |
| #2107 | mint-only-greens | 19 | 15 | done: the same PR changed the app too |
| #2100 | consult-fab-cutout | 4 | 1 | done: the same PR changed the app too |
| #2090 | ps-p0-2-booking-duration | 2 | 0 | n/a: web proxy validation of the booking `duration_minutes`; the app posts straight to the backend |
| #2089 | cat1-diagnostics-full-list | 2 | 0 | done: the app labs hub lists the whole catalogue, page by page (#2102) |
| #2075 | catalogue-lists | 45 | 18 | done: the same PR changed the app too |
| #2072 | r7-map | 15 | 9 | done: the same PR changed the app too |
| #2068 | r2-nav-icons | 7 | 1 | done: the same PR changed the app too |

## Filters (the areas the owner named)

| Area | Web | App | Status |
|---|---|---|---|
| Labs and radiology | filter sheet: payment, place, sort, no-fasting, same-day (#2108) | the same sheet (#2102) | done |
| Consultations | gender, degree, payment, sort: rating, price, **shortest wait**, nearest, available now (`doctor-filters-panel.tsx:11`) | gender, degree, sort: rating, price, **available today**, nearest, available now (`consultations/index.tsx:107`) | **ported: the "Shortest wait" sort** (this PR; the app keeps "Available today" too, it is the board's "book now" entry). Same fields as the web (`avg_wait_minutes`, `average_wait`, `wait_time`); a doctor with no figure sorts last |
| Pharmacy | brand, form, price min and max, prescription: any / none / only (`catalogue-filters.tsx`) | brand, form, price, category, sort, prescription: only | **ported: any / only / none** (this PR; chips like the web's select, `pharmacy.filters.rx*`). The backend has no "no prescription" parameter (`/medicines` takes only `rx_only`), so "none" filters the rows already loaded, as the app's other plain filters do: backend gap for S |
| Nursing | gender, nationality (Saudi / Filipino / Egyptian), available now, sort: any or highest rated (`home-care/services/[serviceId]/book/page.tsx`, `lib/nursing/nurse.ts`) | the same three filters (`(tabs)/nursing.tsx:199`) and sort: nearest, highest rated, any (`nursing/service-details.tsx:19`) | same (the app's sort is a superset: it adds "nearest") |

## Counts

- Web design PRs listed: 29. App done: 25 (the add-policy row is now checked). n/a (web-only by nature): 5.
- Filters: 4 areas compared; labs/radiology and nursing were the same; consultations (sort) and pharmacy (prescription) differed and are ported in this PR. Nothing else differed.
- Not covered yet: web changes before 2026-10-28 (next, list first).
