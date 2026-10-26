# Colour audit: public web, "everything is black" sweep (2026-10-26)

Scope: home, /services, /pharmacy, /consultations (+ doctors), /labs, /radiology, /nursing, /home-care, /insurance, /login, /register; light mode, 390 and 1280, locale en. Base: origin/main (b600f427e). Boards read as source: HomeWeb, WebHome, AuthWeb, Auth, Consult, PharmacyHub, ServiceHub, Main (`docs/design/canvas/*.dc.html`) and `DESIGN_HANDOFF_FINAL.md` section 1.

Method. Runtime: dev server with a stand-in API (empty data), Playwright, every visible element whose computed colour, border, background or svg fill/stroke is ink (about #0B1B2B or darker). Static: the CSS modules and components of each page. Body text in ink is the locked text colour and is not listed row by row ("body text" below).

Result in one line: almost every ink element is on the board (the boards draw ink for titles, labels, selected chips, outline buttons, header icons and the active tab). Two were not and are fixed.

| Page | Element | File:line | Colour now | Board colour | Action |
|---|---|---|---|---|---|
| home | hero search magnifier | components-next/home/hero-search.tsx:20 | ink (FIcon tone ink) | #6E6E73 secondary (HomeWeb) | changed: Icon tone secondary |
| home | header map icon | components-next/home/home-shell.tsx:97 | ink | Map = amber (handoff section 1 service map) | changed: FIcon tone amber |
| home | header mark | components-next/home/home-shell.tsx:78 | ink bowl, coral dot | HomeWeb ink bowl + coral dot; WebHome coral bowl | board agrees with HomeWeb; boards conflict, needs-review |
| home | active nav pill, Sign in button | components-next/home/home.module.css:22, :39 | brand-ink fill | HomeWeb ink pill; WebHome ink Sign in | board agrees (dark contrast in needs-review) |
| home | nav items, h1/h2, tile labels, chips | home.module.css:19, :136 | ink text | ink | board agrees |
| home | theme moon, cart, bell icons | home/theme-button.tsx:30, core/cart-link.tsx:25 | ink | ink icons in white circles (HomeWeb) | board agrees |
| home | bottom tab bar active pill | ui-generated bottom tab bar | ink fill | HomeApp tabActive #0B1B2B | board agrees |
| /services | same page as home (redirects to /en) | see home | | | counted with home |
| pharmacy (/c) | h1, Upload row title, hub labels, filter summary | pharmacy/pharmacy.module.css:50, :161, :170 | ink text | ink | board agrees |
| pharmacy | "Map" outline button | ui-generated/components/css/Button.css:48 | ink 1.5px border and text | outline button ink border (Ord01, Ord02, Family boards) | board agrees |
| pharmacy | header bell, cart, user, sign-out icons | core/core-shell.tsx:156,160, core/cart-link.tsx:25 | ink | ink header icons (HomeWeb, Consult) | board agrees |
| pharmacy | brand mark | core/core-shell.tsx:112 | ink bowl, coral dot | HomeWeb | board agrees |
| consultations/doctors | h1, mode/gender/grade/payment segments, sort labels | consult/consult.module.css:89, :109, :112 | ink text | ink (Consult) | board agrees |
| consultations/doctors | selected chip (aria-pressed) | consult/consult.module.css:101, :141 | action.selected (ink fill) | Consult mode chip selected = #0B1B2B fill, white text | board agrees |
| consultations/doctors | Map outline button | same as pharmacy | ink | outline ink | board agrees |
| labs, radiology | h1, option labels, selected kind card | diagnostics/diag.module.css:25, :28, :68 | ink text, ink 2px selected border, ink "Details" fill | ServiceHub: ink Details button, ink text | board agrees |
| nursing | h1, empty-state title | rx.module.css:15 | ink | ink | board agrees |
| home-care | h1, h2 section titles | care/care.module.css, diag.module.css | ink | ink (CareHub) | board agrees |
| insurance | h1, h2, selected chip border | insurance/insurance.module.css:86 | ink text, ink selected border | ink (Insurance) | board agrees |
| login, register | back arrow, brand mark, wordmark, h1, labels, guest link | auth/auth.module.css:23, :117 | ink | AuthWeb/Auth ink (bowl ink, dot coral) | board agrees |
| login | Apple button | ui-generated/icons/social-brands.css:18 | black fill, white text | AuthWeb Apple #0B1B2B fill | board agrees |
| login | X, Snapchat buttons | social-brands.css:19-20 | black / yellow with black border | AuthWeb: white with hairline | owner exception 2026-10-25 (brand marks), needs-review |
| register | consent checkbox accent | auth/auth.module.css:124 | ink | Auth board checked box = text colour | board agrees |

Counts (elements checked = distinct ink rows found at runtime plus static rows above; "changed" = code changed by this PR). Row groups are counted per page; the home header is shared by pages that use it.

| Page | Checked | Changed |
|---|---|---|
| home (and /services, which serves the same page) | 12 | 2 |
| /pharmacy (/c) | 8 | 0 |
| /consultations (doctors) | 7 | 0 |
| /labs | 5 | 0 |
| /radiology | 5 | 0 |
| /nursing | 3 | 0 |
| /home-care | 4 | 0 |
| /insurance | 4 | 0 |
| /login | 9 | 0 |
| /register | 7 | 0 |

Not seen at runtime: elements that only appear with data (doctor, product, lab, radiology and insurer cards), because the stand-in API returned empty lists. Those were checked in the source only and are listed in `needs-review/web-public-ink.json`. Dark mode: one screenshot of home, header and search readable. Locales: en only; ar not run. No strings added.
