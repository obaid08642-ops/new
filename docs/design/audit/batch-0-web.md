# Batch 0 — patient-web per-screen element audit

Honest trace of the code at `origin/design/batch-0` (tip `dc467ce1`). Nothing in the source was changed. Every claim below was read in the file named in the last column; where something could not be traced or looks wrong it is **not** guessed at or fixed, it is listed in `docs/design/needs-review/batch-0-web.json` and flagged here as **NR-n** (n = position in that file's "NR index" at the end of this document).

## How to read this

- Paths are relative to `patient-web/` unless they start with `backend/`. Routes are written `/{locale}/…` (locales: ar, en, ur, hi, bn, fil; default ar; prefix always).
- Kind: button / field / icon / link / list / number / text / image.
- Source: `API <METHOD> <path> field <name>` (the path the backend serves under `/api/v1`), `user input`, `static copy (messages key X)` (a key in `messages/<locale>.json`, present in all 6 locales for every key listed), `static copy (component map X)` (copy kept in a component-local object, not in `messages/`), `static copy (hard-coded ar/en)` (a ternary on `locale === "ar"`, so ur/hi/bn/fil get the English text), `derived (from …)`, `config/env`.
- Goes to: a route, an endpoint `POST web→/api/auth/x → POST /auth/y` (browser → BFF route in `app/api` → backend), or `none (display only)`.
- `✓` after a route = a `page.tsx`/`route.ts` for it exists under `app/[locale]/…` (checked by walking the tree, Appendix A). `✓` after an endpoint = a backend controller route with that method and path exists (Appendix B). A missing ✓ means it was not confirmed.
- `[when …]` = the condition under which the element is rendered or hidden. Viewport conditions are from the module CSS (`home.module.css`, `core.module.css`, `auth.module.css`).
- Shared frames (HomeShell, AuthLayout, CoreShell, layout) are listed once (F1–F4); each screen section says which frame it uses and its element count includes the frame rows.

## Backend facts used by several screens (read, not assumed)

- Global prefix `api`, URI version `1`; `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })` — a body field that is not in the DTO is a 400 (`backend/src/main.ts:172-182`).
- The patient web session is three HttpOnly cookies set by the BFF: `nabd_access` (1 h), `nabd_refresh` (14 d) and `nabd_device` (14 d) (`lib/auth/cookies.ts:3-10`); the BFF `/api/patient/*` proxy adds `Authorization: Bearer` and refreshes on 401 (`app/api/patient/[...path]/route.ts:9-45`), only for paths in `lib/api/patient-allowlist.ts`.
- `req.user` is the decoded JWT; the JWT carries `sub,id,role,phone,is_guest,tv,dev` and nothing else (`backend/src/modules/auth/auth.service.ts:52`, `backend/src/common/auth.guard.ts:118`).

## Summary

Elements audited per screen (one table row = one button / field / icon / link / list / list-item field / number / text / image, including conditional and hidden states). A screen's total counts its frame's rows (F1/F2/F3) because those elements are on the screen; F4 rows are layout-level and listed separately.

| Screen | Frame | Own element rows | Frame rows | Total audited (own + frame) | Layout-level rows (F4) |
|---|---|---|---|---|---|
| `/` | F1 HomeShell | 58 | 12 | 70 | 8 |
| `/dashboard` | F1 HomeShell | 42 | 12 | 54 | 8 |
| `/login` | F2 AuthLayout | 24 | 8 | 32 | 8 |
| `/register` | F2 AuthLayout | 16 | 8 | 24 | 8 |
| `/otp` | F2 AuthLayout | 10 | 8 | 18 | 8 |
| `/forgot-password` | F2 AuthLayout | 7 | 8 | 15 | 8 |
| `/password-reset` | F2 AuthLayout | 9 | 8 | 17 | 8 |
| `/welcome` | F2 AuthLayout | 9 | 8 | 17 | 8 |
| `/onboarding` | F2 AuthLayout | 8 | 8 | 16 | 8 |
| `/onboarding/language` | F2 AuthLayout | 5 | 8 | 13 | 8 |
| `/onboarding/permissions` | F2 AuthLayout | 9 | 8 | 17 | 8 |
| `/search` | F3 CoreShell | 38 | 12 | 50 | 8 |
| `/notifications` | F3 CoreShell | 12 | 12 | 24 | 8 |
| `/notifications/settings` | F3 CoreShell | 14 | 12 | 26 | 8 |
| **Sum (frame rows counted once per screen)** | | | | **393** | |

Needs-review items: **42** (`docs/design/needs-review/batch-0-web.json`; index at the end of this file). Screens that could not be fully traced: none; the limits of the trace are listed under "Not traced".

---

## F1. HomeShell (frame of `/` and `/dashboard`) — `components-next/home/home-shell.tsx`

Phone < 1024: top bar + floating tab bar. ≥ 1024: web top bar with nav, tab bar hidden (`home.module.css:6-8`). The layout's own `.topbar` is hidden on these routes and the layout footer is hidden on the dashboard (`app/globals.css:582-586`).

| Element | Kind | Source | Goes to | file:line |
|---|---|---|---|---|
| Brand link (Noon Dot mark + wordmark) `[link ≥540 px, wordmark ≥768 px]` | link | static copy (messages key Shared.brand, aria-label) | `/{locale}` ✓ | components-next/home/home-shell.tsx:58-63; home.module.css:12,38-41 |
| Noon Dot mark | icon | static asset (NabdMark SVG, variant "text") | none (inside the brand link) | home-shell.tsx:59; components-next/nabd-mark.tsx:48-85 |
| Wordmark "نبض+" / "Nabd+" | text | static copy (hard-coded ar/en: `locale === "ar" ? "نبض" : "Nabd"` + "+") | none (aria-hidden, inside the brand link) | home-shell.tsx:60-62 |
| Nav "Home" `[≥1024]`, always `aria-current="page"` | link | static copy (messages key HomeWeb.navHome) | `/{locale}/dashboard` ✓ when signed in, else `/{locale}` ✓ | home-shell.tsx:46,65 |
| Nav Pharmacy / Consultations / Labs & radiology / Nursing (4) `[≥1024]` | link | static copy (messages keys HomeWeb.navPharmacy, navConsult, navLabs, navNursing) | `/{locale}/c` ✓, `/{locale}/consultations/doctors` ✓, `/{locale}/diagnostics` ✓, `/{locale}/nursing/catalog` ✓ | home-shell.tsx:40-45,66-68 |
| Language button (globe + current language name) and its menu of 6 languages | button + list | config (`locales`, `localeLabels` in lib/i18n.ts:1,4); aria-label = static copy (messages key Shared.language) | each of the 6 items → `/{locale}` ✓ (home of that locale, **not** the current page) — NR-1; a11y label NR-24 | home-shell.tsx:71; components-next/locale-selector.tsx:25-60 |
| Theme button (moon icon, 44 px) | button | user input (toggles light/dark; stored in localStorage under THEME_STORAGE_KEY, not a token); label static copy (messages key Shared.theme) | none (sets `data-theme`, `.dark`, `color-scheme` on `<html>`) | home-shell.tsx:72; components-next/home/theme-button.tsx:13-39 |
| Bell link `[only when signed in]` | link | static copy (messages key HomeWeb.notifications, aria-label) | `/{locale}/notifications` ✓ | home-shell.tsx:73-77 |
| Cart link (package icon) `[≥768 px only]` | link | static copy (messages key HomeWeb.cart, aria-label) | `/{locale}/cart` ✓ | home-shell.tsx:78-80; home.module.css:30,40 |
| Account avatar `[only when signed in]` | link + image | derived (initials of the `name` prop; the prop is passed on `/dashboard` only, so on `/` it is the generic user glyph) ; aria-label static copy (messages key HomeWeb.account) | `/{locale}/profile` ✓ | home-shell.tsx:81-84; components-next/ui-generated/components/Surfaces.tsx:235-258 |
| "Sign in" link `[only when NOT signed in]` | link | static copy (messages key HomeWeb.signIn) | `/{locale}/login` ✓ | home-shell.tsx:85-87 |
| Phone tab bar `[<1024]`: Home, Pharmacy, Consultations (raised), Labs, Nursing — 5 buttons, "Home" always the active one | button ×5 | static copy (messages keys HomeWeb.navHome, navPharmacy, navConsult, navLabs, navNursing); icons static (house, pill, stethoscope, test-tube, first-aid-kit) | `router.push` to the same 5 targets as the nav (home → dashboard if signed in else `/{locale}`); pressing the active "Home" does nothing | home-shell.tsx:47-54,96; components-next/home/home-tab-bar.tsx:8-30; ui-generated/components/Surfaces.tsx:421-468 |

No sign-out control is drawn by this frame; the only sign-out in the web app is `SessionActions` in the layout header, which is hidden here — NR-29.

## F2. AuthLayout (frame of /login, /register, /otp, /forgot-password, /password-reset, /welcome, /onboarding, /onboarding/language, /onboarding/permissions) — `components-next/auth/auth-layout.tsx`

| Element | Kind | Source | Goes to | file:line |
|---|---|---|---|---|
| Back button (caret, 44 px) `[only when the page passes backHref; <1024 only]` | link | derived (backHref prop of each page); aria-label static copy (hard-coded ar/en "رجوع"/"Back"); icon flips for RTL (`getDirection`) | per page (see each screen) | components-next/auth/auth-layout.tsx:47-53; auth.module.css:35 |
| Spacer in place of the back button `[no backHref]` | text | none | none | auth-layout.tsx:52 |
| Brand link (mark + wordmark) `[only when showMark; wordmark ≥1024]` | link | static copy (messages key Shared.brand, aria-label); wordmark hard-coded ar/en | `/{locale}` ✓ | auth-layout.tsx:54-59 |
| Language button + 6-item menu | button + list | config (lib/i18n.ts); label messages key Shared.language | each → `/{locale}` ✓ (home, not current page) — NR-1, NR-24 | auth-layout.tsx:61; locale-selector.tsx:25-60 |
| Theme toggle: Light / System / Dark (3 buttons) | button ×3 | user input (localStorage THEME_STORAGE_KEY); button names are the raw English words `light`/`system`/`dark` in an sr-only span — NR-25 | none (sets theme on `<html>`) | auth-layout.tsx:62; components-next/theme-toggle.tsx:88-109 |
| Hero panel `[≥1024 only, aria-hidden]`: 3 service icons (pharmacy, consultations, lab) | icon ×3 | static (SERVICE_ICONS) | none | auth-layout.tsx:68-70; auth.module.css:29,40-52 |
| Hero title (2 lines) | text | static copy (hard-coded ar/en, `HERO`: "All your health / in one place") | none | auth-layout.tsx:22-25,71 |
| Hero bullet list (3 promises, check icon each) | list + text | static copy (hard-coded ar/en, `HERO.points`) — marketing claims ("Medicines from nearby pharmacies at real prices", "Doctors by video, in clinic or at home", "Labs, radiology and home nursing with your insurance") | none | auth-layout.tsx:22-25,72-76 |

All 9 screens above also get the layout's `<script>` theme init, the hidden `.topbar`/`.site-footer` (`app/globals.css:575-577`), and the layout-level non-visual items in F4.

## F3. CoreShell (frame of /search, /notifications, /notifications/settings) — `components-next/core/core-shell.tsx`

Phone < 768: page header row (back + title, or search field + Cancel) and the floating tab bar. 768+: top bar (mark, 5 section links from 1024, search field on /search, language, theme, bell, cart, account). Tab bar hidden from 1024 (`core.module.css:59-72`).

| Element | Kind | Source | Goes to | file:line |
|---|---|---|---|---|
| Back button `[phone only; not on /search]` | link | derived (backHref prop); aria-label static copy (messages key CoreShell.back) | per page (/notifications → `/{locale}` ✓; /notifications/settings → `/{locale}/notifications` ✓) | components-next/core/core-shell.tsx:67-71 |
| Phone title (h1) `[phone only; not on /search]` | text | derived (title prop: messages Notifications.title / NotificationSettings.title) | none | core-shell.tsx:72 |
| Brand link (mark + wordmark) `[≥768]` | link | static copy (messages key Shared.brand); wordmark hard-coded ar/en | `/{locale}` ✓ | core-shell.tsx:74-79 |
| Search field slot `[only when the page passes `search`]` | field | see /search | — | core-shell.tsx:81-85 |
| "Cancel" `[phone, only with search + cancelHref]` | link | static copy (messages key Search.cancel) | `/{locale}` ✓ | core-shell.tsx:84 |
| Section links ×5 `[≥1024, not on /search]`: Home, Pharmacy, Doctors, Labs (diagnostics), Nursing | link ×5 | static copy (messages keys Shared.navHome, navPharmacy, navDoctors, navDiagnostics, navNursing) | `/{locale}` ✓, `/{locale}/pharmacy` ✓ (redirect to `/c`), `/{locale}/consultations/doctors` ✓, `/{locale}/diagnostics/labs` ✓, `/{locale}/home-care` ✓ — different targets and labels from HomeShell (NR-32) | core-shell.tsx:57-63,86-92 |
| Language button + 6-item menu `[≥768]` | button + list | config; label messages key CoreShell.language | each → `/{locale}` ✓ (NR-1) | core-shell.tsx:95; locale-selector.tsx |
| Theme toggle ×3 `[≥768]` | button ×3 | user input (localStorage); raw English sr-only names (NR-25) | none | core-shell.tsx:96 |
| Bell link `[≥768]` | link | static copy (messages key CoreShell.notifications, aria-label) | `/{locale}/notifications` ✓ | core-shell.tsx:97-99 |
| Cart link `[≥768]` | link | static copy (messages key CoreShell.cart) | `/{locale}/cart` ✓ | core-shell.tsx:100-102 |
| Account link `[≥768]` | link | static copy (messages key Shared.account) | `/{locale}/profile` ✓ | core-shell.tsx:103-105 |
| Phone tab bar `[<1024]`, 5 buttons, none active (`value=""`) | button ×5 | static copy (Shared.navHome/navPharmacy/navDoctors/navDiagnostics/navNursing) | `router.push`: `/{locale}`, `/{locale}/pharmacy`, `/{locale}/consultations/doctors`, `/{locale}/diagnostics/labs`, `/{locale}/home-care` (all ✓) | core-shell.tsx:49-55,111-125 |

No sign-out here either (NR-29).

## F4. Layout-level items on every Batch 0 screen — `app/[locale]/layout.tsx`

| Element | Kind | Source | Goes to | file:line |
|---|---|---|---|---|
| Theme init script (inline, nonce) | text (non-visual) | config/env (THEME_INIT_SCRIPT) | none | app/[locale]/layout.tsx:79 |
| Presence heartbeat `[only when the `nabd_access` cookie exists]`: every 60 s while the tab is visible | none (non-visual) | derived (cookie) | `POST web→/api/auth/heartbeat → POST /auth/heartbeat` ✓ body `{client:"patient-web"}` | layout.tsx:95; components-next/presence-beacon.tsx:13-24; app/api/auth/heartbeat/route.ts:7-22 |
| WebMcpProvider (registers in-browser AI tools via `navigator.modelContext`; fetches `/api/v1/public/...`, `/api/v1/doctors`, `/api/v1/labs/services`, `/api/v1/home-care/services` only when an AI agent calls a tool) | none (non-visual) | config/env | none visible | layout.tsx:71; components-next/web-mcp-provider.tsx:55-275 |
| Layout header `.topbar` (brand, language, theme, account/sign-out) | — | hidden by CSS on every Batch 0 screen: `.shell:has(> .nabd-auth) > .topbar`, `.shell:has(> .nabd-home-shell) > .topbar` and `.shell:has(> .nabd-core) > .topbar` are `display:none` | — | app/globals.css:575,582,590 |
| Layout footer `.site-footer` (Terms, Privacy, Support, Articles, Map) | link ×5 | static copy (hard-coded ar/en, other locales get English) | `/{locale}/terms` ✓, `/privacy` ✓, `/support` ✓, `/articles` ✓, `/map` ✓ ; **visible on `/` only** (hidden on auth, core and dashboard screens) | layout.tsx:97-105; globals.css:575-591 |
| Loading state for routes without their own `loading.tsx` (all Batch 0 routes except /dashboard) | text | static copy (messages keys RouteState.loadingCode, loadingTitle, loadingBody) | none | app/[locale]/loading.tsx:5-8 |
| Error boundary for every Batch 0 route | button + link + text | static copy (messages keys RouteState.errorCode, errorTitle, errorBody, retry, returnHome); inline `style` attributes and raw hex colours (#FDFDFC, #FF4D5A, #5FD9B3, #1E332E, #6B7C6E) — NR-28 | retry = `reset()`; "Return home" → `/{locale}` ✓ | app/[locale]/error.tsx:5-24 |
| Not-found page | — | not read in this audit (outside the 13 screens) | — | app/[locale]/not-found.tsx |


---

## 1. `/` — public home (`app/[locale]/page.tsx`)

Frame: F1 HomeShell (`surface="home"`) + F4. Data read on the server in the route: `GET /care/doctors` (no query, `lib/api/doctors-server.ts:4-6` ✓ `backend/src/modules/care/care.controller.ts:28-57`), `GET /config` (`lib/api/public-config-server.ts:26-34` ✓ `backend/src/modules/config/config.controller.ts:10`), `GET /content/home` (`public-config-server.ts:37-45` ✓ `backend/src/modules/admin/enterprise/admin-governance-controls.controller.ts:262-270`, class `PublicContentController`, registered in `admin-enterprise.module.ts:62`). No credential is sent on any of the three. `signedIn` = the `nabd_access` cookie exists (page.tsx:49) — the token is not validated here.

| Element | Kind | Source | Goes to | file:line |
|---|---|---|---|---|
| Document title | text | static copy (messages key Metadata.portalTitle) | none | app/[locale]/page.tsx:22-24 |
| Meta description | text | static copy (messages key Metadata.publicDescription) | none | page.tsx:23,26 |
| Canonical + hreflang ×6 + x-default | text | config/env (`localizedUrl`, NEXT_PUBLIC_SITE_ORIGIN default `https://nabd.plus`) | none | page.tsx:21,27-33; lib/seo.ts:3-10 |
| JSON-LD WebSite + SearchAction (`/{locale}/search?q={search_term_string}`), MedicalOrganization, MedicalWebPage | text (non-visual) | static copy (messages keys Metadata.siteTitle, portalTitle) + config/env (siteOrigin) | SearchAction → `/{locale}/search` ✓ — which ignores `?q` and requires sign-in (NR-23) | page.tsx:78-107 |
| **Maintenance state** `[GET /config → app_versions.apps.web.maintenance === true]` replaces everything below (and drops the JSON-LD) | — | API GET /config field app_versions.apps.web.maintenance | — | page.tsx:61-73; public-config-server.ts:7-15 |
| Maintenance title | text | static copy (hard-coded ar/en: "صيانة مجدولة" / "Scheduled maintenance") | none | page.tsx:67 |
| Maintenance message | text | API GET /config field app_versions.apps.web.message_en, else message_ar (English first whatever the locale), else hard-coded ar/en fallback — NR-33 | none | page.tsx:68; public-config-server.ts:10-14 |
| Hero card `<section>` | list/container | — | — | components-next/home/home-parts.tsx:36-50 |
| Noon Dot mark in hero `[<540 px only]` | icon | static (NabdMark) | none | home-parts.tsx:38; home.module.css:68 |
| Hero eyebrow "Your Integrated Healthcare Hub" | text | static copy (messages key Home.heroBadge) | none | page.tsx:110; home-parts.tsx:40 |
| Hero H1 "Nabd Plus Medical Portal" | text | static copy (messages key Home.heroTitle) | none | page.tsx:110; home-parts.tsx:41 |
| ECG pulse line | image | static (inline SVG path, decorative) | none | home-parts.tsx:18-32 |
| Search icon (magnifying glass) | icon | static | none | home-parts.tsx:45 |
| Search input (`name="q"`, maxLength 100, type=search) | field | user input; placeholder messages key HomeWeb.searchPlaceholder, aria-label HomeWeb.searchLabel | submitted with the form | home-parts.tsx:46 |
| Search submit button | button | static copy (messages key HomeWeb.searchButton) | `GET /{locale}/search?q=<text>` ✓ (plain `<form action method=get>`) — the search page does not read `q` and redirects anonymous users to login (NR-23) | home-parts.tsx:44,47 |
| Services section `<section aria-label>` | list | static copy (messages key HomeWeb.services) | — | home-parts.tsx:102 |
| Service tile ×9 (each = link around a ServiceTile: icon chip + label) — one row per tile below | list item | — | — | home-parts.tsx:88-114 |
| ↳ Consultations tile | link | label: messages key HomeWeb.svcConsult; icon static (stethoscope, blue) | `/{locale}/consultations/doctors` ✓ | home-parts.tsx:91 |
| ↳ Pharmacy tile | link | HomeWeb.svcPharmacy; pill, coral | `/{locale}/c` ✓ | home-parts.tsx:92 |
| ↳ Labs & radiology tile | link | HomeWeb.svcLabs; test-tube, mint | `/{locale}/diagnostics` ✓ | home-parts.tsx:93 |
| ↳ Nursing tile | link | HomeWeb.svcNursing; first-aid-kit, teal | `/{locale}/nursing/catalog` ✓ | home-parts.tsx:94 |
| ↳ Nutrition tile | link | HomeWeb.svcNutrition; bowl-food, lime | `/{locale}/nutrition` ✓ | home-parts.tsx:95 |
| ↳ Maternity tile | link | HomeWeb.svcMaternity; baby, pink | `/{locale}/maternity` ✓ | home-parts.tsx:96 |
| ↳ Map tile | link | HomeWeb.svcMap; map-trifold, amber | `/{locale}/map` ✓ | home-parts.tsx:97 |
| ↳ My health tile | link | HomeWeb.svcHealth; heartbeat, coral | `/{locale}/health` ✓ | home-parts.tsx:98 |
| ↳ Emergency tile | link | HomeWeb.svcEmergency; ambulance, peach | `/{locale}/emergency` ✓ | home-parts.tsx:99 |
| AI assistant card `<section>` | list/container | — | — | home-parts.tsx:127-147 |
| ↳ sparkle icon (solid violet chip, 56) | icon | static | none | home-parts.tsx:129 |
| ↳ Title "Smart medical assistant" | text | static copy (messages key HomeWeb.aiTitle) | none | home-parts.tsx:131 |
| ↳ Subtitle | text | static copy (messages key HomeWeb.aiSub) | none | home-parts.tsx:132 |
| ↳ "Start chat" link | link | static copy (messages key HomeWeb.aiStart) | `/{locale}/ai/triage` ✓ | home-parts.tsx:134 |
| ↳ Tool link: Symptom check | link | HomeWeb.aiSymptoms; heartbeat icon | `/{locale}/ai/symptom-checker` ✓ | home-parts.tsx:120,139-142 |
| ↳ Tool link: Prescription translator | link | HomeWeb.aiTranslator; translate icon | `/{locale}/ai/prescription-translator` ✓ | home-parts.tsx:121 |
| ↳ Tool link: Skin analysis | link | HomeWeb.aiSkin; scan icon | `/{locale}/ai/skin-analysis` ✓ | home-parts.tsx:122 |
| ↳ Tool link: Virtual doctor | link | HomeWeb.aiDoctor; robot icon | `/{locale}/ai/chat-doctor` ✓ | home-parts.tsx:123 |
| ↳ Tool link: Monthly report | link | HomeWeb.aiReport; chart-line-up icon | `/{locale}/ai/monthly-report` ✓ | home-parts.tsx:124 |
| **Curated sections** — list of sections `[rendered only for sections with enabled !== false and ≥1 item; each item needs a title in the active language or the other one]` | list | API GET /content/home field sections[] (sorted by `position`) | — | page.tsx:74,114; public-config-server.ts:18-23; home-parts.tsx:198-232 |
| ↳ section heading (h2) `[only if the section has a title]` | text | API GET /content/home field sections[].title_ar (the admin save never writes `title_en`: `admin-governance-controls.controller.ts:57`, so English locales show the Arabic title); aria-label fallback messages key HomeWeb.offersTitle | none | home-parts.tsx:199-209 |
| ↳ item list (`<ul>`) | list | API GET /content/home field sections[].items[] | — | home-parts.tsx:210 |
| ↳ item card link | link | API GET /content/home field items[].deep_link, else `/{locale}` — the value is an app route typed by the admin and is used as an `href` unchanged (NR-30) | `deep_link` (unprefixed, unvalidated) | home-parts.tsx:215 |
| ↳ item image `[only if image_url]` | image | API GET /content/home field items[].image_url, rendered with `next/image` `fill`, alt="" — only `cdn.nabd.plus` and `res.cloudinary.com` are allowed hosts (NR-31) | none | home-parts.tsx:216-220; next.config.ts:9-12 |
| ↳ item title | text | API GET /content/home field items[].title_ar (items[].title_en is never stored) | none | home-parts.tsx:212,221 |
| **Featured doctors** `[only when ≥1 doctor with a name]` | list | API GET /care/doctors field items[] (first 4 of the 20 returned, sorted by rating desc: `care.service.ts:113,156-165`) | — | page.tsx:52-58,115; home-parts.tsx:235-265 |
| ↳ heading (h2) | text | static copy (messages key HomeWeb.doctorsTitle) | none | home-parts.tsx:242 |
| ↳ "See all" link | link | static copy (messages key HomeWeb.seeAll) | `/{locale}/consultations/doctors` ✓ | home-parts.tsx:243 |
| ↳ doctor card (whole card is the link) | link | API GET /care/doctors field items[].id | `/{locale}/consultations/doctors/{id}` ✓ | home-parts.tsx:248-250 |
| ↳ ↳ photo | image | static user glyph (`photoSrc` is never passed; the API has no photo field) | none | ui-generated/components/Cards.tsx:85-92 |
| ↳ ↳ name | text | API GET /care/doctors field name_ar, else name_en (Arabic first in every locale; the card is dropped when both are null) — NR-27 | none | lib/api/doctors.ts:15; home-parts.tsx:236,249 |
| ↳ ↳ grade | text | API GET /care/doctors field title (`degree` is not sent; `academic_degree` is ignored) | none | doctors.ts:15; home-parts.tsx:251 |
| ↳ ↳ specialty | text | API GET /care/doctors field specialty — the stored value is a slug such as `general_practice` (`backend/src/common/enums.ts:211-215`) and is shown raw — NR-27 | none | home-parts.tsx:252 |
| ↳ ↳ place (map-pin + text) `[never shown today]` | text | API fields facility_name / clinic_name are read, the API sends `hospital` / `facility_id` — NR-26 | none | doctors.ts:11,15; care.service.ts:275-276 |
| ↳ ↳ mode chips (clinic / home / online) `[never passed]` | list | not wired (data exists: API field consultation_modes) | none | home-parts.tsx:248-259 |
| ↳ ↳ rating "★ 4.8 (120)" `[only when rating > 0 and reviews > 0]` | number | API GET /care/doctors fields rating and reviews_count (`rating_avg ?? rating`, `rating_count ?? reviews_count`) | none | home-parts.tsx:254; Surfaces.tsx:281-302; care.service.ts:279-280 |
| ↳ ↳ next slot (clock + text) `[never shown today]` | text | API field next_available_slot is read, the API sends next_available_at — NR-26 | none | doctors.ts:11,15; care.service.ts:289 |
| ↳ ↳ price `[never shown today]` | number | API fields consultation_fee / price are read (`Intl.NumberFormat(locale)`), the API sends price_clinic / price_online / price_home — NR-26 | none | doctors.ts:10,15; home-parts.tsx:238,256; care.service.ts:272-274 |
| ↳ ↳ currency "SAR" `[only with a price]` | text | static copy (messages key HomeWeb.currency) | none | home-parts.tsx:257 |
| ↳ ↳ "Book now" (a span; the card is the link) | button (visual) | static copy (messages key HomeWeb.bookNow) | same link as the card | home-parts.tsx:258; Cards.tsx:139-140 |
| Footer links ×5 (Terms, Privacy, Support, Articles, Map) | link ×5 | see F4 (hard-coded ar/en) | `/terms` ✓ `/privacy` ✓ `/support` ✓ `/articles` ✓ `/map` ✓ | layout.tsx:97-105 |

---

## 2. `/dashboard` (`app/[locale]/dashboard/page.tsx`)

Frame: F1 HomeShell (`surface="dashboard"`, passes `name`) + F4 (layout footer hidden). Guards: no `nabd_access` cookie → `redirect /{locale}/login` ✓ (page.tsx:21-22); a 401 from either call → the same redirect (:30-32); an unknown locale → `/ar/login` (:20). Data (server side, with the cookie token as Bearer): `GET /users/me/profile` (`lib/api/dashboard-server.ts:4-6` ✓ `backend/src/modules/users/users.controller.ts:34-37`) and `GET /home/upcoming-appointment` (`dashboard-server.ts:8-10` ✓ `backend/src/modules/home/home.controller.ts:15-18`). A failed call (non-401) silently becomes "no name" / "no appointment". Loading state: `dashboard/loading.tsx` (HomeShell + hero block + 9 tile skeletons, `role=status`, aria-label messages key Dashboard.loading).

| Element | Kind | Source | Goes to | file:line |
|---|---|---|---|---|
| Greeting eyebrow ("Good morning/afternoon/evening") `[only when the profile has a name]` | text | derived (hour in Asia/Riyadh: <12 morning, <17 afternoon, else evening) → messages keys HomeWeb.greetingMorning / greetingAfternoon / greetingEvening | none | page.tsx:12-16,46 |
| Hero H1 (patient name, else "Your private portal") | text | API GET /users/me/profile field name, else full_name, else fullName (the real field on the patient profile is `full_name`, set only by one of four account-creation paths); fallback static copy (messages key Dashboard.title) — NR-34 | none | page.tsx:33-35,47; lib/api/dashboard.ts:12-16 |
| Hero mark, pulse line, search icon/input/button | icon/field/button | same as `/` (home-parts.tsx:36-50); the search form submits to `/{locale}/search?q=` ✓ which ignores `q` (NR-23) | `GET /{locale}/search?q=` | home-parts.tsx:36-50 |
| Account avatar initials | image | derived (from API GET /users/me/profile field name) | `/{locale}/profile` ✓ | home-shell.tsx:83; page.tsx:40 |
| Next-appointment card `[only when GET /home/upcoming-appointment returns an object with an id; otherwise the hero takes the full width (`data-aside="false"`)]` | list/container | API GET /home/upcoming-appointment (returns `null` → empty body when there is none) | — | page.tsx:36-38,42,50-54; home-parts.tsx:54-85 |
| ↳ date badge: day number + short month `[only when the date parses]` | number | derived (from API field `date`, a `YYYY-MM-DD` string, through `Intl.DateTimeFormat(locale)`; the parser reads `scheduled_at`/`scheduledAt`/`date`) | none | dashboard.ts:24-29; home-parts.tsx:63-67,71-76 |
| ↳ label "Your next appointment" | text | static copy (messages key HomeWeb.nextAppointment) | none | home-parts.tsx:78 |
| ↳ doctor name `[only if present]` | text | API GET /home/upcoming-appointment field doctorName | none | dashboard.ts:27; home-parts.tsx:79; backend home.service.ts:80 |
| ↳ meta line "time · status" `[only if either exists]` | text | derived: time from the date-only value (midnight UTC, formatted in the server time zone) and status from API field `status` which the endpoint never returns — NR-35 | none | home-parts.tsx:67-68,80; home.service.ts:76-83 |
| ↳ "Details" link | link | static copy (messages key HomeWeb.details); id = API field id | `/{locale}/appointments/{id}` ✓ | home-parts.tsx:82 |
| Services section + 9 tiles | list | same 9 tiles and targets as `/` (rows ↳ above) | see `/` | home-parts.tsx:88-114; page.tsx:56 |
| AI assistant card + 5 tool links + "Start chat" | list | same as `/` | see `/` | home-parts.tsx:117-148; page.tsx:57 |
| "All services" section heading | text | static copy (messages key HomeWeb.allServices) | none | home-parts.tsx:182-183 |
| All-services list (26 rows) `<ul>` | list | static (MORE table in code) | — | home-parts.tsx:150-195; page.tsx:58 |
| ↳ each row: coloured icon chip (40), title, chevron | list item | title = static copy (messages keys Dashboard.<key>); icon+tone static; chevron static | the route below | home-parts.tsx:186-190; Surfaces.tsx:142-183 |
| ↳ Appointments | link | Dashboard.appointments | `/{locale}/appointments` ✓ | home-parts.tsx:151 |
| ↳ Medicines | link | Dashboard.medicines | `/{locale}/medicines` ✓ | :152 |
| ↳ Diagnostic bookings | link | Dashboard.diagnostics | `/{locale}/diagnostics` ✓ | :153 |
| ↳ My orders | link | Dashboard.orders | `/{locale}/orders` ✓ | :154 |
| ↳ Health summary | link | Dashboard.health | `/{locale}/health` ✓ | :155 |
| ↳ Home care | link | Dashboard.homeCare | `/{locale}/home-care` ✓ | :156 |
| ↳ Medication reminders | link | Dashboard.reminders | `/{locale}/reminders` ✓ | :157 |
| ↳ Prescriptions | link | Dashboard.prescriptions | `/{locale}/prescriptions` ✓ | :158 |
| ↳ Family | link | Dashboard.family | `/{locale}/family` ✓ | :159 |
| ↳ Chats | link | Dashboard.chat | `/{locale}/chat` ✓ | :160 |
| ↳ Notifications | link | Dashboard.notifications | `/{locale}/notifications` ✓ | :161 |
| ↳ Search | link | Dashboard.search | `/{locale}/search` ✓ | :162 |
| ↳ Offers | link | Dashboard.offers | `/{locale}/offers` ✓ | :163 |
| ↳ Programs | link | Dashboard.programs | `/{locale}/programs` ✓ | :164 |
| ↳ Returns | link | Dashboard.returns | `/{locale}/returns` ✓ | :165 |
| ↳ Community | link | Dashboard.community | `/{locale}/community` ✓ | :166 |
| ↳ Nutrition | link | Dashboard.nutrition | `/{locale}/nutrition` ✓ | :167 |
| ↳ Maternity | link | Dashboard.maternity | `/{locale}/maternity` ✓ | :168 |
| ↳ AI triage | link | Dashboard.aiTriage | `/{locale}/ai` ✓ | :169 |
| ↳ Reports | link | Dashboard.reports | `/{locale}/reports` ✓ | :170 |
| ↳ Loyalty | link | Dashboard.loyalty | `/{locale}/loyalty` ✓ | :171 |
| ↳ Support | link | Dashboard.support | `/{locale}/support` ✓ | :172 |
| ↳ Emergency | link | Dashboard.emergency | `/{locale}/emergency` ✓ | :173 |
| ↳ My health profile | link | Dashboard.profile | `/{locale}/profile` ✓ | :174 |
| ↳ Settings | link | Dashboard.settings | `/{locale}/settings` ✓ | :175 |
| ↳ Health articles | link | Dashboard.articles | `/{locale}/articles` ✓ | :176 |
| Skeleton blocks (loading state) | text | none | none | app/[locale]/dashboard/loading.tsx:7-18 |


---

## 3. `/login` (`app/[locale]/login/page.tsx` → `components-next/login-form.tsx`, `components-next/social-login-buttons.tsx`)

Frame: F2 AuthLayout with `backHref=/{locale}/welcome` ✓ (page.tsx:23) + F4. `noindex`. No data is read on the server; the screen is a form.

| Element | Kind | Source | Goes to | file:line |
|---|---|---|---|---|
| Document title "Patient sign in" | text | static copy (messages key Metadata.loginTitle) | none | app/[locale]/login/page.tsx:13-14 |
| Back button (frame) | link | F2 | `/{locale}/welcome` ✓ | login/page.tsx:23 |
| H1 "Sign in" | text | static copy (messages key Login.title) | none | components-next/login-form.tsx:43 |
| Subtitle | text | static copy (messages key Login.body) | none | login-form.tsx:44 |
| Identifier field (email or mobile) `[disabled in two-factor mode]` | field | user input → body field `identifier`; label static copy (messages key Login.identifier); placeholder "name@example.com" hard-coded; `inputMode="email"` although a mobile number is also accepted (NR-6) | submit | login-form.tsx:47-52 |
| Password label | text | static copy (messages key Login.password) | none | login-form.tsx:54 |
| "Forgot password?" button (beside the label) `[≥1024 only; hidden in two-factor mode]` | button | static copy (hard-coded ar/en: "نسيت كلمة المرور؟" / "Forgot password?") | `router.push /{locale}/forgot-password` ✓ ; disabled while submitting | login-form.tsx:54; auth.module.css:93-94 |
| Password input `[hidden in two-factor mode]` | field | user input → body field `password` (`type` toggles text/password) | submit | login-form.tsx:53-56 |
| Show/hide password button (eye / eye-slash icon) | button | user input (local state); aria-label hard-coded ar/en | none | login-form.tsx:57-59 |
| Two-factor code field `[only after the API answered requires_2fa]` | field | user input → body field `code` (digits only, max 6); label static copy (messages key Login.twoFactorCode) | submit | login-form.tsx:62-65 |
| Two-factor note "Additional verification" `[two-factor mode]` | text | static copy (messages key Login.twoFactorTitle) | none | login-form.tsx:66 |
| "Forgot password?" button (below the form) `[<1024 only; also shown in two-factor mode]` | button | static copy (hard-coded ar/en) | `router.push /{locale}/forgot-password` ✓ | login-form.tsx:67-69; auth.module.css:92-94 |
| Error message `role=alert` `[after a failed call]` | text | static copy (messages keys Login.invalid, Login.unavailable, Login.twoFactorInvalid, Login.twoFactorUnavailable): 503/504 or a network error → "unavailable"; **any other non-2xx (400, 401, 403, 429, 502) → "invalid"** (NR-4) | none | login-form.tsx:29,32,36,70 |
| Submit button (primary, full width, loading state) | button | static copy (messages keys Login.submit / submitting / twoFactorSubmit / twoFactorSubmitting) | password step: `POST web→/api/auth/login → POST /auth/login` ✓ body `{identifier,password}`; two-factor step: `POST web→/api/auth/verify-2fa → POST /auth/login/verify-2fa` ✓ body `{identifier,code}`; success → `router.replace /{locale}/dashboard` ✓ + `router.refresh()` | login-form.tsx:22-34,72 ; app/api/auth/login/route.ts:9-21; app/api/auth/verify-2fa/route.ts:9-20 |
| Divider "Or continue with" `[only when NEXT_PUBLIC_GOOGLE_CLIENT_ID is set at build time]` | text | static copy (hard-coded ar/en) + config/env | none | login-form.tsx:73; social-login-buttons.tsx:37,79-80 |
| Google button `[same condition]` | button | static text "Google"; token from Google's popup (`accounts.google.com/gsi/client`, scope `openid email profile`) | `POST web→/api/auth/social-login → POST /auth/social-login` ✓ body `{provider:"google", token}` with header x-nabd-device-id (fresh UUID), then `router.replace /{locale}/dashboard` — NR-5 | social-login-buttons.tsx:44-62,82; app/api/auth/social-login/route.ts:7-30 |
| "New to Nabd+?" text | text | static copy (hard-coded ar/en) | none | login-form.tsx:73; social-login-buttons.tsx:86 |
| "Create an account" link | link | static copy (hard-coded ar/en) | `/{locale}/register` ✓ | social-login-buttons.tsx:86 |
| "Continue as guest" button (label switches to "Opening guest access…" while busy) | button | static copy (messages keys Login.guestContinue, Login.guestLoading) | `POST web→/api/auth/guest → POST /auth/guest` ✓ with header x-nabd-device-id = **a new UUID on every click** (NR-2); success → `router.replace /{locale}/dashboard` | social-login-buttons.tsx:68-76,87-89; app/api/auth/guest/route.ts:17-31 |
| Social/guest error `role=alert` | text | static copy (messages key Login.unavailable) for every failure | none | social-login-buttons.tsx:91 |
| Legal sentence "By continuing you agree to the Terms and Privacy Policy" | text | static copy (hard-coded ar/en) | none | login-form.tsx:74 |
| ↳ "Terms" link (plain `<a>`) | link | static copy (hard-coded ar/en) | `/{locale}/terms` ✓ | login-form.tsx:74 |
| ↳ "Privacy Policy" link (plain `<a>`) | link | static copy (hard-coded ar/en) | `/{locale}/privacy` ✓ | login-form.tsx:74 |
| Hero panel, language, theme, brand (frame) | — | F2 | — | auth-layout.tsx |

API trace: browser → `POST /api/auth/login` (zod: identifier 3-320, password 1-1024) → `POST /auth/login` (`backend/src/modules/auth/auth.controller.ts:149-173`, DTO `AuthLoginDto` in `auth.dto.ts:101-118` accepts `identifier|email|phone` + `password`) → `AuthService.login` (`auth.service.ts:556-633`): looks the user up by `{email: lower-cased}` or `{phone: raw}`, bcrypt compare, **no role check**, `admin`/`super_admin` get `requires_2fa` (email OTP) or `requires_passkey`, everyone else gets `{user, token:{accessToken,refreshToken}}`. The BFF only understands `requires_2fa` and `token` (`login/route.ts:15-17`), then sets the three cookies (`lib/auth/cookies.ts:6-10`) — NR-3, NR-7.

---

## 4. `/register` (`app/[locale]/register/page.tsx` → `components-next/register-form.tsx`)

Frame: F2, `backHref=/{locale}/login` ✓ (page.tsx:22). All copy is in a component-local map `copy` for the 6 locales (register-form.tsx:9-16), **not** in `messages/*.json` (NR-11).

| Element | Kind | Source | Goes to | file:line |
|---|---|---|---|---|
| Document title "Create account \| Nabd Plus" | text | static copy (hard-coded ar/en; ur/hi/bn/fil get English) | none | app/[locale]/register/page.tsx:13 |
| Back button (frame) | link | F2 | `/{locale}/login` ✓ | register/page.tsx:22 |
| H1 + subtitle | text | static copy (component map `title`, `body`) | none | register-form.tsx:94-95 |
| Full-name field (required, autoComplete=name) | field | user input → body `name`; label map `name`; client rule: ≥2 characters | submit | register-form.tsx:98-101,49 |
| Email-or-mobile field (required, dir=ltr, placeholder "name@example.com" hard-coded) | field | user input → body `identifier` (or `phone` on the guest path); label map `identifier`; client rule: ≥3 characters | submit | register-form.tsx:102-106 |
| Identifier hint "We'll send the confirmation code here" | text | static copy (map `hintIdentifier`) | none | register-form.tsx:105 |
| Password field (required, minLength 8, id `register-password`) | field | user input → body `password`; label map `password` | submit | register-form.tsx:107-116 |
| Show/hide password button | button | user input (local state); aria-label hard-coded ar/en | none | register-form.tsx:111-113 |
| Password hint "At least 8 characters" | text | static copy (map `hintPassword`) | none | register-form.tsx:115 |
| Consent checkbox (must be checked) | field | user input (local state `agreed`; the checkbox itself is never sent) | none | register-form.tsx:117-126 |
| Consent text with links | text + link ×2 | static copy (map `terms`, `privacy`; the ar branch is hard-coded "أوافق على الشروط والأحكام"); links `/{locale}/terms` ✓ and `/{locale}/privacy` ✓ (Next `<Link>`) | `/{locale}/terms`, `/{locale}/privacy` | register-form.tsx:119-125 |
| Message paragraph `role=alert` (red `error` style even for the success/converting texts) | text | static copy (map `invalid`, `unavailable`, `success`, `converting`, `converted`): any 4xx → `invalid`, ≥500 → `unavailable` (so a 409 "already registered" reads as "Review the fields") | none | register-form.tsx:65-67,78-81,127 |
| Guest note `role=note` `[only when GET /api/auth/session says the visitor is a guest]` | text | static copy (map `guestNote`); condition from `GET web→/api/auth/session → GET /auth/me` ✓ field `user.is_guest` (`auth.controller.ts:211-214`, `auth.service.ts:926-939`) | none | register-form.tsx:35-40,128; app/api/auth/session/route.ts:5 |
| Submit button "Create account" (label "Creating account…" while busy) | button | static copy (map `submit`, `busy`) | **guest + phone-like identifier** (`/^[+\d][\d\s-]{6,19}$/`): `POST web→/api/auth/convert-guest → POST /auth/convert-guest` ✓ body `{full_name, phone, password}` then `router.push /{locale}` ✓ (NR-9). **Otherwise:** `POST web→/api/auth/register → POST /auth/register` ✓ body `{name, identifier, password, locale, consents:[{policy_id,version}×2]}`; on 2xx `router.push /{locale}/otp?identifier=<identifier>` ✓ (NR-10, NR-15) | register-form.tsx:42-89,130; app/api/auth/convert-guest/route.ts:22-40; app/api/auth/register/route.ts:23-38 |
| Consent policy ids/versions sent with the registration | text (non-visual) | config/env: NEXT_PUBLIC_TERMS_POLICY_ID / _VERSION and NEXT_PUBLIC_PRIVACY_POLICY_ID / _VERSION, defaults `terms`/`v1`, `privacy`/`v1`; not read from any backend policy list (NR-8) | inside the register body | register-form.tsx:18-23,45-48 |
| "Already have an account? Log in" link | link | static copy (map `login`) | `/{locale}/login` ✓ | register-form.tsx:131 |

API trace: `POST /auth/register` (`auth.controller.ts:131-147`): a body with `name|identifier|locale|consents` goes to `registerPatientContract` (`auth.service.ts:427-485`): requires ≥1 consent, rejects an existing email/phone with 409 `identifier_already_registered`, creates the user (`full_name = name.trim()`, `preferred_lang = locale`, `legal_consents`), creates the patient profile with `full_name`, then **calls `requestPatientOtp` (line 480)** whose failures (429 `otp_rate_limited`, 503 `otp_channel_unavailable`) surface after the account already exists (NR-10). `POST /auth/convert-guest` (`auth.controller.ts:182-185`, class guard) → `convertGuest` (`auth.service.ts:876-918`). Identifier handling: OTP/register paths lower-case and trim only (`auth.service.ts:176-178`), login looks phone up raw (`:560`) — no E.164 normalisation anywhere (NR-7).

---

## 5. `/otp` (`app/[locale]/otp/page.tsx` → `components-next/otp-screen.tsx`)

Frame: F2, `backHref=/{locale}/login` ✓ (page.tsx:18). Copy in the component-local map `copy` (otp-screen.tsx:9-16), not in `messages/`. The identifier is read from the URL query `?identifier=` (`useSearchParams`, otp-screen.tsx:19). Nothing is requested on mount; the screen assumes `/register` already triggered the code.

| Element | Kind | Source | Goes to | file:line |
|---|---|---|---|---|
| Document title "Verification code \| Nabd Plus" | text | static copy (hard-coded ar/en; no isLocale check in `generateMetadata`) | none | app/[locale]/otp/page.tsx:9-12 |
| Back button (frame) | link | F2 | `/{locale}/login` ✓ | otp/page.tsx:18 |
| H1 "Enter the code" | text | static copy (map `title`) | none | components-next/otp-screen.tsx:28 |
| Subtitle "We sent a 6-digit code to <identifier>" `[identifier present]`, else "Start from sign in…" | text | static copy (map `body` / `missing`) + user-supplied URL query `identifier` (shown in `<bdi dir=ltr>`) — NR-15 | none | otp-screen.tsx:29 |
| Code cells ×6 (one digit each, `autoComplete=one-time-code` on the first) `[disabled when no identifier or while busy]` | field ×6 | user input → joined into `code`; aria-label static copy (map `code` + index) | submit | otp-screen.tsx:21-22,32-35 |
| Resend hint + countdown "m:ss" `[while seconds > 0]` | text + number | static copy (map `wait`); the counter is derived (local state starting at 300 s, decremented every second — matches the backend OTP lifetime `PATIENT_OTP_TTL_SECONDS = 300`, `auth.service.ts:31`, but is not read from the API) | none | otp-screen.tsx:19-20,25,37 |
| "Resend code" button `[when the countdown is 0]` | button | static copy (map `resend`) | `POST web→/api/auth/otp/request → POST /auth/otp/request` ✓ body `{identifier}`; on 2xx the countdown restarts at 300 s, otherwise the `failed` message — the BFF rejects the backend's real answer (NR-12) | otp-screen.tsx:23,37; app/api/auth/otp/request/route.ts:5-28 |
| Error `role=alert` `[error set and identifier present]` | text | static copy (map `failed`, `invalid`) | none | otp-screen.tsx:23-24,39 |
| Verify button "Verify code" (label "Verifying…" when busy; disabled without an identifier) | button | static copy (map `verify`, `busy`) | 1) `POST web→/api/auth/otp/verify → POST /auth/otp/verify` ✓ body `{identifier, code}`; 2) `POST web→/api/auth/session/exchange → POST /auth/session/exchange` ✓ (no body, cookie only); 3) `router.replace /{locale}/dashboard` ✓ — steps 2-3 cannot produce a web session (NR-13, NR-14) | otp-screen.tsx:24,41; app/api/auth/otp/verify/route.ts:27-60; app/api/auth/session/exchange/route.ts:7-23 |
| "Back" text button | button | static copy (map `back`) | `router.back()` | otp-screen.tsx:42 |

API trace: backend `POST /auth/otp/request` returns `{otp_sent:true, channel:'email', expires_in:300}` (`auth.service.ts:255-261`) but the BFF's `successSchema` requires `{ok:true, expires_in}` (`otp/request/route.ts:6-9`) → every successful request becomes a 502 (NR-12). Backend `POST /auth/otp/verify` returns `{exchange_token, expires_in:60}` (`auth.service.ts:346`); the BFF turns it into the cookie `nabd_otp_exchange` (`verify/route.ts:50-58`). Backend `POST /auth/session/exchange` needs `exchange_token` **in the body** (`PatientSessionExchangeDto`, `auth.controller.ts:68-70,110-116`) but the BFF sends only a `cookie` header (`exchange/route.ts:11-12`), and on success the backend sets `nabd_patient_access`/`nabd_patient_refresh` (`auth.controller.ts:7-9,113-114`) while the web reads `nabd_access` (`lib/auth/cookies.ts:3`) — NR-13, NR-14. The BFF unit test mocks the shape `{ok:true,…}` (`otp-routes.test.ts:15-23`), not the backend's.

---

## 6. `/forgot-password` (`app/[locale]/forgot-password/page.tsx` → `components-next/forgot-password-form.tsx`)

Frame: F2, `backHref=/{locale}/login` ✓. Copy in the component-local map (forgot-password-form.tsx:9-16).

| Element | Kind | Source | Goes to | file:line |
|---|---|---|---|---|
| Document title "Nabd Plus" | text | static copy (hard-coded, not localised, not screen-specific) | none | app/[locale]/forgot-password/page.tsx:9 |
| Back button (frame) | link | F2 | `/{locale}/login` ✓ | forgot-password/page.tsx:15 |
| H1 "Reset your password" + subtitle | text | static copy (map `title`, `body`) | none | components-next/forgot-password-form.tsx:17 |
| Identifier field (required, dir=ltr, placeholder "name@example.com" hard-coded; client rule ≥3 characters) | field | user input → body `identifier`; label map `identifier` | submit | forgot-password-form.tsx:17 |
| Status message `role=status` `[after submit]` | text | static copy (map `success` when the response is 2xx, else `failed`) | none | forgot-password-form.tsx:17 |
| Submit button "Send instructions" ("Sending…" when busy) | button | static copy (map `submit`, `busy`) | `POST web→/api/auth/password/forgot → POST /auth/password/forgot` ✓ body `{identifier}` | forgot-password-form.tsx:17; app/api/auth/password/forgot/route.ts:8-25 |
| "Back to sign in" button | button | static copy (map `back`) | `router.push /{locale}/login` ✓ | forgot-password-form.tsx:17 |

API trace: backend `POST /auth/password/forgot` (`auth.controller.ts:118-123`, throttle 3/10 min) → `forgotPatientPassword` (`auth.service.ts:376-398`): always answers `{requested:true}` (matches the BFF schema), and e-mails the **raw reset token** ("Your Nabdah Plus password-reset token is …, expires in 60 seconds"); a phone-only account with no e-mail gets nothing. The success message does not lead anywhere: no link or redirect to `/password-reset` exists in the web (NR-16).

---

## 7. `/password-reset` (`app/[locale]/password-reset/page.tsx` → `components-next/password-reset-form.tsx`)

Frame: F2, `backHref=/{locale}/login` ✓. Copy in the component-local map (password-reset-form.tsx:7). No inbound link exists from any screen or from the e-mail (NR-16).

| Element | Kind | Source | Goes to | file:line |
|---|---|---|---|---|
| Document title "Nabd Plus" | text | static copy (hard-coded) | none | app/[locale]/password-reset/page.tsx:9 |
| Back button (frame) | link | F2 | `/{locale}/login` ✓ | password-reset/page.tsx:15 |
| H1 "Set a new password" + subtitle | text | static copy (map `title`, `body`) | none | components-next/password-reset-form.tsx:8 |
| Code field (required, dir=ltr, `inputMode="numeric"`, autoComplete=one-time-code) | field | user input → body `reset_token`; label map `token` ("Code"); the backend token is a 43-character base64url string, not digits (NR-17) | submit | password-reset-form.tsx:8 |
| New-password field (required, minLength 8, type password) | field | user input → body `new_password`; label map `password` | submit | password-reset-form.tsx:8 |
| Confirm-password field (required, minLength 8) | field | user input (compared client-side with the new password; not sent); label map `confirm` | none | password-reset-form.tsx:8 |
| Status message `role=status` (note style on success, error style otherwise) | text | static copy (map `success`, `failed`); any non-2xx → `failed` | none | password-reset-form.tsx:8 |
| Submit button "Set password" ("Setting password…") | button | static copy (map `submit`, `busy`) | `POST web→/api/auth/password/reset → POST /auth/password/reset` ✓ body `{reset_token, new_password}`; success clears the fields and stays on the page | password-reset-form.tsx:8; app/api/auth/password/reset/route.ts:8-17 |
| "Back to sign in" button | button | static copy (map `back`) | `router.push /{locale}/login` ✓ | password-reset-form.tsx:8 |

API trace: backend `POST /auth/password/reset` (`auth.controller.ts:125-129`, DTO `PatientResetPasswordDto` `reset_token`, `new_password` min 8) → `resetPatientPassword` (`auth.service.ts:400-421`): the token lives `PATIENT_EXCHANGE_TTL_SECONDS = 60` s (`:32,386`), single use, ends every session. The BFF also forwards the visitor's `nabd_access` cookie as Bearer (route.ts:12-13), which the endpoint ignores.

---

## 8. `/welcome` (`app/[locale]/welcome/page.tsx` → `components-next/auth-welcome.tsx`)

Frame: F2 with `showMark={false}` and no back button (page.tsx:15). Copy in the component-local map `copy` (auth-welcome.tsx:10-17); the map keys `brand`, `body`, `social`, `blocked`, `language` are never rendered.

| Element | Kind | Source | Goes to | file:line |
|---|---|---|---|---|
| Document title "Nabd Plus" | text | static copy (hard-coded) | none | app/[locale]/welcome/page.tsx:9 |
| Stage (aria-hidden): 4 service icons in orbit (pharmacy, consult, lab, nursing) | icon ×4 | static (SERVICE_ICONS) | none | components-next/auth-welcome.tsx:45-50 |
| Large pulsing Noon Dot (150 px) | icon | static (NabdMark `pulse`) | none | auth-welcome.tsx:50 |
| Wordmark H1 "نبض+" / "Nabd+" | text | static copy (hard-coded ar/en) | none | auth-welcome.tsx:53 |
| ECG line | image | static (inline SVG) | none | auth-welcome.tsx:54 |
| Tagline "Your complete healthcare" | text | static copy (map `tagline`) | none | auth-welcome.tsx:55 |
| "Create account" button (primary) | button | static copy (map `register`) | `router.push /{locale}/register` ✓ | auth-welcome.tsx:59 |
| "Log in" button (outline) | button | static copy (map `login`) | `router.push /{locale}/login` ✓ | auth-welcome.tsx:60 |
| "Continue as guest" text button + caret (disabled while busy) | button | static copy (map `guest`) | `POST web→/api/auth/guest → POST /auth/guest` ✓ with header x-nabd-device-id = a UUID kept in `localStorage["nabd_device_id"]` (stable per browser, unlike /login); success → `router.push /{locale}` ✓ (public home, not the dashboard); failure → `router.push /{locale}/login?guest=blocked` ✓ — the login form never reads that parameter (NR-18) | auth-welcome.tsx:24-42,62-64; app/api/auth/guest/route.ts:17-31 |

---

## 9. `/onboarding` (`app/[locale]/onboarding/page.tsx` → `components-next/onboarding-carousel.tsx`)

Frame: F2 with `showMark={false}`, no back button. No API. Nothing in the web links to this page (`grep` of `app`, `components-next`, `lib`: only the three onboarding files and the login back button refer to `/onboarding*`/`/welcome`) and finishing it records nothing (NR-19). All copy hard-coded ar/en (NR-20).

| Element | Kind | Source | Goes to | file:line |
|---|---|---|---|---|
| Carousel `<section aria-label>` ("App intro") | list | static copy (hard-coded ar/en) | — | components-next/onboarding-carousel.tsx:18 |
| Slide art tile (72 px glyph) | icon | static (slide 1 consult/stethoscope, slide 2 lab/test-tube, slide 3 pharmacy/pill — the icon of slides 2-3 does not match their text) | none | app/[locale]/onboarding/page.tsx:19-21,24-26; onboarding-carousel.tsx:19-21 |
| Slide title H1 (`aria-live=polite`) | text | static copy (hard-coded ar/en): "Your care, in one place" / "Book in minutes" / "Track your health" | none | onboarding/page.tsx:17-27; onboarding-carousel.tsx:23 |
| Slide body | text | static copy (hard-coded ar/en) | none | onboarding-carousel.tsx:24 |
| Dots ×3 (`role=tab`, aria-label "1".."3") | button ×3 | derived (slide count) | none (sets the current slide, local state) | onboarding-carousel.tsx:26-30 |
| "Next" button `[slides 1-2]` | button | static copy (hard-coded ar/en) | none (next slide) | onboarding-carousel.tsx:35 |
| "Continue" button `[last slide]` (a `<button>` inside a `<Link>`) | button | static copy (hard-coded ar/en) | `/{locale}/onboarding/language` ✓ | onboarding-carousel.tsx:33 |
| "Skip" link | link | static copy (hard-coded ar/en) | `/{locale}/welcome` ✓ | onboarding-carousel.tsx:37 |

---

## 10. `/onboarding/language` (`app/[locale]/onboarding/language/page.tsx`)

Frame: F2, `backHref=/{locale}/onboarding` ✓. No API; the choice is not saved anywhere (the language is the URL). All copy hard-coded ar/en (NR-20).

| Element | Kind | Source | Goes to | file:line |
|---|---|---|---|---|
| H1 "Choose your language" | text | static copy (hard-coded ar/en) | none | app/[locale]/onboarding/language/page.tsx:20 |
| Subtitle "You can change it later in settings." | text | static copy (hard-coded ar/en) | none | language/page.tsx:21 |
| Language list `<nav aria-label>` of 6 rows | list | config (`locales`, `localeLabels` in lib/i18n.ts:1,4) | — | language/page.tsx:24-30 |
| ↳ row: language name + radio ring (current one marked, `aria-current`) | link | config (localeLabels) | `/{l}/onboarding/language` ✓ (same step in the chosen language) | language/page.tsx:26-27 |
| "Continue" button (a `<button>` inside a `<Link>`; two tab stops) | button | static copy (hard-coded ar/en) | `/{locale}/onboarding/permissions` ✓ — NR-21 | language/page.tsx:32 |

---

## 11. `/onboarding/permissions` (`app/[locale]/onboarding/permissions/page.tsx` → `components-next/onboarding-permissions-client.tsx`)

Frame: F2, `backHref=/{locale}/onboarding/language` ✓. No API. All copy hard-coded ar/en (NR-20).

| Element | Kind | Source | Goes to | file:line |
|---|---|---|---|---|
| H1 "Permissions" + subtitle | text | static copy (hard-coded ar/en) | none | app/[locale]/onboarding/permissions/page.tsx:19-20 |
| Location card: map icon (44 px chip) | icon | static (SERVICE_ICONS.map) | none | components-next/onboarding-permissions-client.tsx:38 |
| Location title + explanation | text | static copy (hard-coded ar/en) | none | onboarding-permissions-client.tsx:40-41 |
| Location button — label cycles Allow / Allowed / Not allowed / Not available in this browser (disabled after the first press) | button | derived (browser permission result, local state) | `navigator.geolocation.getCurrentPosition` (8 s timeout); the coordinates are discarded, nothing is stored or sent (NR-22) | onboarding-permissions-client.tsx:15-22,32-33,43 |
| Notifications card: points icon (44 px chip) | icon | static (SERVICE_ICONS.points) | none | onboarding-permissions-client.tsx:46 |
| Notifications title + explanation | text | static copy (hard-coded ar/en) | none | onboarding-permissions-client.tsx:48-49 |
| Notifications button — same four labels | button | derived (browser permission result) | `Notification.requestPermission()`; no push subscription is created: `ServiceWorkerRegister` is imported in the layout but never rendered and there is no `/api/push/web/subscribe` BFF route (NR-22) | onboarding-permissions-client.tsx:24-30,51; app/[locale]/layout.tsx:17 |
| "Get started" button (inside a `<Link>`) | button | static copy (hard-coded ar/en) | `/{locale}/welcome` ✓ | onboarding-permissions-client.tsx:54 |
| "Skip" link | link | static copy (hard-coded ar/en) | `/{locale}/welcome` ✓ | onboarding-permissions-client.tsx:55 |


---

## 12. `/search` (`app/[locale]/search/page.tsx` → `app/[locale]/search/search-client.tsx`)

Frame: F3 CoreShell with the search field in the top bar and `cancelHref=/{locale}` (search-client.tsx:200-207). The route requires a session: no `nabd_access` cookie → `redirect /{locale}/login` ✓ (page.tsx:13; `lib/auth/session.ts:5-9`). The page never reads `searchParams`, so `?q=` from the home hero is ignored (NR-23). No `generateMetadata`: the title is the layout default (messages key Metadata.siteTitle).

State machine (search-client.tsx:86-127): the trimmed text must be ≥2 characters to search; after 350 ms it first calls the intent endpoint, then the results endpoint.

| Element | Kind | Source | Goes to | file:line |
|---|---|---|---|---|
| Search field (type=search, page variant) | field | user input → `query`; placeholder static copy (messages key Search.placeholder); aria-label (messages key Search.title) | debounced 350 ms → the two calls below | search-client.tsx:203; ui-generated/components/Inputs.tsx:294-352 |
| Clear (×) button `[only when the field has text]` | button | static copy (messages key Search.clear, aria-label) | none (empties the field) | search-client.tsx:203; Inputs.tsx:345-352 |
| Hidden H1 (sr-only) `[unless results are shown]` | text | static copy (messages key Search.title) | none | search-client.tsx:205 |
| Intent call (invisible) | none | user input `q` and the URL locale | `POST web→/api/search/intent → POST /search/intent` ✓ (public) body `{query, locale, client_type:"web"}`; if the answer's `canonical_path` is not `/{locale}/search` the page does `window.location.assign(path)` and **no result list is shown** — there is no confidence check (NR-36) | search-client.tsx:103-116; app/api/search/intent/route.ts:5-22; backend search-intent.controller.ts:11-15 |
| Results call (invisible) | none | user input `q` | `GET web→/api/patient/home/search?q=<q> → GET /home/search?q=` ✓ (JWT); the proxy's allow-list caps the **encoded** query at 120 characters (NR-37) | search-client.tsx:117-119; lib/api/patient-allowlist.ts:76; backend home.controller.ts:20-23 |
| **Idle state** `[query shorter than 2 characters]`: "Browse by section" heading | text | static copy (messages key Search.browseTitle) | none | search-client.tsx:157-158 |
| ↳ browse tiles ×8 (ServiceTile: icon chip + label) | list | static (BROWSE table) | — | search-client.tsx:34-43,159-163 |
| ↳ Pharmacy | link | Search.catPharmacy; pharmacy icon | `/{locale}/pharmacy` ✓ (redirects to `/c`) | search-client.tsx:35 |
| ↳ Consultation | link | Search.catConsult; consult icon | `/{locale}/consultations/doctors` ✓ | :36 |
| ↳ Lab tests | link | Search.catLab; lab icon | `/{locale}/diagnostics/labs` ✓ | :37 |
| ↳ Radiology | link | Search.catRadiology; radiology icon | `/{locale}/diagnostics/radiology` ✓ | :38 |
| ↳ Nursing | link | Search.catNursing; nursing icon | `/{locale}/home-care` ✓ | :39 |
| ↳ Mental health | link | Search.catMind; mind icon | `/{locale}/mental-health` ✓ | :40 |
| ↳ Nutrition | link | Search.catNutrition; nutrition icon | `/{locale}/nutrition` ✓ | :41 |
| ↳ Family | link | Search.catFamily; family icon | `/{locale}/family` ✓ | :42 |
| **Loading state** "Searching…" `role=status` | text | static copy (messages key Search.searching) | none | search-client.tsx:165-166 |
| **Error state** `[any failure of the results call, including a proxy 404/401]` | text + button | static copy (messages keys Search.error, RouteState.retry); the retry button re-runs the search (`attempt + 1`) | re-runs both calls | search-client.tsx:167-168 |
| **Empty state** `[2xx with zero parsed rows]` icon + title + hint | text | static copy (messages keys Search.empty, Search.emptyHint); icon static | none | search-client.tsx:169-170 |
| **Results state** — heading (H1) "Results for “<query>”" | text | static copy (messages key Search.resultsFor) with the user's query | none | search-client.tsx:173-175 |
| ↳ count "N results" | number | derived (length of the parsed array) → messages key Search.resultsCount (plural) | none | search-client.tsx:176 |
| ↳ filter chips (All + the groups that have results) with counts | button + number | derived (group counts) → messages keys Search.tabAll / tabMedicines / tabDoctors / tabLabs / tabRadiology / tabOther | none (local filter) | search-client.tsx:129-141,177-181 |
| ↳ result sections ×4 (Medicines and products, Doctors, Lab tests and radiology, Other results) `[each only if it has rows under the current chip]` | list | static copy (messages keys Search.sectionMedicines / sectionDoctors / sectionTests / sectionOther); heading hidden ≥1024 when a single chip is selected | — | search-client.tsx:143-148,182-191; search.module.css:67 |
| ↳ result row (`<a>` if the kind has a detail page, else a `<div>`) | list item | API GET /home/search array element (parsed by zod; rows missing `id`, `type` or `name` are dropped) | by kind, below | search-client.tsx:56-80,188; lib/api/search.ts:7-35 |
| ↳ ↳ kind icon (40 px) | icon | derived (from API field typeEn → KINDS table; unknown → magnifying-glass) | none | search-client.tsx:20-32,58,66 |
| ↳ ↳ name (the typed text highlighted with `<mark>` when it occurs) | text | API field name (ar) / nameEn (other locales, falling back to name) | none | search.ts:30; search-client.tsx:49-54,68 |
| ↳ ↳ sub-line `[hidden when empty or when it is a snake_case code such as whole_body]` | text | API field sub (ar) / subEn — doctors: the specialty **slug** (always hidden by the code filter, NR-38), medicines: active_ingredient or manufacturer, articles: category, community: "N likes · M comments" | none | search-client.tsx:62,69; backend home.service.ts:169-250 |
| ↳ ↳ price "N SAR" `[only when > 0]` | number | API field price (string; doctors: price_clinic, medicines/labs/radiology: price, packages: discounted_price) → messages key Search.price | none | search-client.tsx:63,71 |
| ↳ ↳ rating "Rating N" `[only when > 0; only doctors send it]` | number | API field rate → messages key Search.rating | none | search-client.tsx:64,72 |
| ↳ ↳ type chip | text | API field type (ar) / typeEn; tone derived from the kind | none | search-client.tsx:73 |
| ↳ ↳ link target — Medicine | link | API field id | `/{locale}/medicines/{id}` ✓ (redirect page → `/p/{slug}` through `GET /public/product-by-id/{locale}/{id}`, `app/[locale]/medicines/[medicineId]/page.tsx:11-24`) | search-client.tsx:21 |
| ↳ ↳ link target — Doctor | link | API field id | `/{locale}/consultations/doctors/{id}` ✓ | search-client.tsx:22 |
| ↳ ↳ link target — Radiology | link | API field id | `/{locale}/diagnostics/radiology/{id}` ✓ | search-client.tsx:24 |
| ↳ ↳ link target — Article / Disease | link | API field id (= article slug) | `/{locale}/articles/{id}` ✓ | search-client.tsx:26-27 |
| ↳ ↳ link target — Community | link | API field id | `/{locale}/community/{id}` ✓ | search-client.tsx:29 |
| ↳ ↳ Lab, Package, Insurance, Family rows | list item | API rows | none (display only: no `href` for these kinds) | search-client.tsx:23,25,28,30,59-60 |
| ↳ prescription banner text "Can’t find it? Upload your prescription…" | text | static copy (messages key Search.rxHelp) | none | search-client.tsx:192-193 |
| ↳ "Upload prescription" link | link | static copy (messages key Search.rxAction) | `/{locale}/pharmacy/scan-prescription` ✓ | search-client.tsx:194 |
| Frame rows (cancel, brand, sections, tools, tab bar) | — | F3 | — | core-shell.tsx |

---

## 13. `/notifications` (`app/[locale]/notifications/page.tsx`)

Frame: F3, `title=Notifications.title`, `backHref=/{locale}` ✓, narrow column. Server side: no `nabd_access` → `redirect /{locale}/login` (via `requirePatientAccess`), a 401 → the same, 403/404 → not-found, any other failure → the error state. Data: `GET /notifications` (`lib/api/notifications-server.ts:4-6` ✓ `backend/src/modules/notifications/notifications.controller.ts:13-16`; a second controller also registers `GET /notifications`, see NR-41).

| Element | Kind | Source | Goes to | file:line |
|---|---|---|---|---|
| Desktop H1 "Notifications" `[≥768]` | text | static copy (messages key Notifications.title) | none | app/[locale]/notifications/page.tsx:79 |
| "Notification settings" link | link | static copy (messages key Notifications.settings) | `/{locale}/notifications/settings` ✓ | page.tsx:80 |
| **Error state** `[GET /notifications not 2xx]` title + body + "Try again" | text + button | static copy (messages keys Notifications.unavailableTitle, Notifications.unavailable, RouteState.retry) | retry → `router.refresh()` | page.tsx:61-65; components-next/core/core-states.tsx:7-10 |
| **Empty state** `[0 parsed notifications]` bell icon + title + body | text | static copy (messages keys Notifications.emptyTitle, Notifications.empty) | none | page.tsx:82-83 |
| Group sections "Today" / "Earlier" `[each only if it has rows]` | list | static copy (messages keys Notifications.today, Notifications.earlier); membership derived from API field createdAt (< 24 h = today) | — | page.tsx:67-75,84-88 |
| Notification list (`<ul>` in a Card) | list | API GET /notifications array (200 newest, `listForUser`: rows addressed to the user, to the user's role or to `all`: `notifications.service.ts:401-417`); rows without a UUID `id` are dropped | — | page.tsx:66,88-104; lib/api/notifications.ts:11-48 |
| ↳ kind icon (42 px chip) | icon | derived (API field type: order, appointment, medication, prescription, emergency, promo, alert, info → KIND table; unknown type: alert icon when priority is high/critical/urgent, else info) | none | page.tsx:16-35,94 |
| ↳ title (bold when unread) | text | API field title (resolved from `title_key` by the backend; values that look like an i18n key `notif.x.y` are dropped); fallback static copy (messages key Notifications.untitled) — always Arabic (NR-40) | none | page.tsx:96; notifications.ts:23-26,34 |
| ↳ body `[only if present]` | text | API field body (same resolution as title) | none | page.tsx:97; notifications.ts:35 |
| ↳ time `[only if createdAt parses]` | text | derived (from API field createdAt: relative "5 minutes ago" within the last day, else date + time, through `Intl` in the page locale) | none | page.tsx:38-48,98 |
| ↳ unread dot `[only when read === false]` | icon | API field read (boolean computed by the backend from `read_by`); aria-label static copy (messages key Notifications.unread) | none — rows are not links and nothing marks them read (NR-39) | page.tsx:91,100; notifications.service.ts:414 |
| Frame rows | — | F3 | — | core-shell.tsx |

Unused copy: `Notifications.notice` ("This list is view-only…") and `Notifications.eyebrow` exist in all 6 locales and are not rendered.

---

## 14. `/notifications/settings` (`app/[locale]/notifications/settings/page.tsx` → `notification-settings-client.tsx`)

Frame: F3, `title=NotificationSettings.title`, `backHref=/{locale}/notifications` ✓. Server side: same guards as `/notifications`; data `GET /users/me/notification-settings` (`lib/api/notification-settings-server.ts:4-6` ✓ `backend/src/modules/users/users.controller.ts:55-58`) which always returns both groups with defaults filled in (`users.service.ts:216-239,265-268`: channels push/email/sms, categories appointments/orders/health/chat/account/marketing).

| Element | Kind | Source | Goes to | file:line |
|---|---|---|---|---|
| Desktop H1 `[≥768]` | text | static copy (messages key NotificationSettings.title) | none | app/[locale]/notifications/settings/page.tsx:49 |
| **Error state** `[call fails]` | text + button | static copy (messages keys Notifications.unavailableTitle, Notifications.unavailable, RouteState.retry) | retry → `router.refresh()` | page.tsx:30-39 |
| "Appearance" heading | text | static copy (messages key NotificationSettings.appearance) | none | notification-settings-client.tsx:104 |
| Appearance selector: Automatic / Light / Dark (3 segments) | button ×3 | user input (initial value from `localStorage[THEME_STORAGE_KEY]`, default system); labels static copy (messages keys NotificationSettings.appearanceAuto / appearanceLight / appearanceDark) | none (sets `data-theme`/`.dark`/color-scheme; stored only in this browser, not on the account) | notification-settings-client.tsx:44-58,105-114 |
| Appearance hint | text | static copy (messages key NotificationSettings.appearanceHint) | none | notification-settings-client.tsx:115 |
| "Language" heading | text | static copy (messages key NotificationSettings.language) | none | notification-settings-client.tsx:119 |
| Language radio rows ×6 (native name + English name, current selected) | list ×6 | config (`locales`, `localeLabels`; English names hard-coded in `ENGLISH_NAME`) | `router.push /{code}/notifications/settings` ✓ (keeps the page; not saved to the account) | notification-settings-client.tsx:20,121-133 |
| "Notifications" heading `[only if ≥1 category row]` | text | static copy (messages key NotificationSettings.notifications) | none | page.tsx:43,54; client:83-87,137 |
| Category switch rows `[each only when the API sent a boolean for that key]` — Appointments, Orders, Health and medication, Messages, Account and security, Offers and health news | button ×6 (Toggle, with loading state while saving) | label static copy (messages keys NotificationSettings.catAppointments / catOrders / catHealth / catChat / catAccount / catMarketing); value API GET /users/me/notification-settings field categories.appointments / orders / health / chat / account / marketing | `PATCH web→/api/patient/users/me/notification-settings → PATCH /users/me/notification-settings` ✓ body `{categories:{<key>:<bool>}}`, header `idempotency-key` (new UUID); on failure the switch is put back and "Couldn’t save the change" shows (`role=alert`); only one save at a time | page.tsx:15-18,43; client:60-80,90-96; backend users.controller.ts:60-64, users.service.ts:241-278 — saved but not honoured (NR-42) |
| "Alert channels" heading `[only if ≥1 channel row]` | text | static copy (messages key NotificationSettings.channels) | none | client:138 |
| Channel switch rows `[each only when the API sent a boolean]` — Phone notifications, Email, Text messages | button ×3 (Toggle) | label static copy (messages keys NotificationSettings.chPush / chEmail / chSms); value API field channels.push / email / sms | same PATCH with `{channels:{<key>:<bool>}}` — NR-42 (SMS is described as retired in `notifications.service.ts:162,361`) | page.tsx:19,44; client:83-100 |
| "Not available right now" `[no switch rows at all]` | text | static copy (messages key NotificationSettings.unavailable) | none | client:136 |
| Save-failed message `role=alert` | text | static copy (messages key NotificationSettings.saveFailed) | none | client:139 |
| Frame rows | — | F3 | — | core-shell.tsx |

API trace: the browser calls the generic proxy `app/api/patient/[...path]/route.ts` (PATCH requires an `idempotency-key` header and a JSON body, lines 15-28; the path is allow-listed at `lib/api/patient-allowlist.ts:41,103`), which forwards with the cookie token; backend `PATCH /users/me/notification-settings` is `@RequireIdempotency()` and accepts only `channels`/`categories` booleans (`users.service.ts:241-263`, DTO `users.settings.dto.ts:131-170`), stores them on the **patient profile** document (`notification_settings`) and returns the merged object.

---

## Appendix A — route existence (`app/[locale]/…`, walked from the file tree)

Every route target used by the 13 screens has a `page.tsx` (checked with a tree walk, dynamic segments matched): `/`, `/c` (`c/[[...category]]`), `/consultations/doctors`, `/consultations/doctors/[doctorId]`, `/diagnostics`, `/diagnostics/labs`, `/diagnostics/radiology`, `/diagnostics/radiology/[serviceId]`, `/nursing/catalog`, `/home-care`, `/dashboard`, `/notifications`, `/notifications/settings`, `/cart`, `/profile`, `/login`, `/register`, `/otp`, `/forgot-password`, `/password-reset`, `/welcome`, `/onboarding`, `/onboarding/language`, `/onboarding/permissions`, `/search`, `/terms`, `/privacy`, `/support`, `/articles`, `/articles/[slug]`, `/map`, `/nutrition`, `/maternity`, `/health`, `/emergency`, `/ai`, `/ai/triage`, `/ai/symptom-checker`, `/ai/prescription-translator`, `/ai/skin-analysis`, `/ai/chat-doctor`, `/ai/monthly-report`, `/appointments`, `/appointments/[appointmentId]`, `/medicines`, `/medicines/[medicineId]` (redirect to `/p/{slug}`), `/orders`, `/reminders`, `/prescriptions`, `/family`, `/chat`, `/offers`, `/programs`, `/returns`, `/community`, `/community/[postId]`, `/reports`, `/loyalty`, `/settings`, `/pharmacy` (redirects to `/c`), `/pharmacy/scan-prescription`, `/mental-health`. Intent-endpoint targets also exist: `/doctors/[specialty]/[city]`, `/doctors/[specialty]/[city]/[neighborhood]`, `/medicine-catalog`, `/home-nursing/[citySlug]`. Not re-verified beyond existence of the page file: the content of those pages (they belong to later batches).

## Appendix B — endpoint existence (backend controllers read)

| Method path | Controller file:line | Auth |
|---|---|---|
| GET /care/doctors | backend/src/modules/care/care.controller.ts:28-57 | public |
| GET /config | backend/src/modules/config/config.controller.ts:10-13 | public |
| GET /content/home | backend/src/modules/admin/enterprise/admin-governance-controls.controller.ts:262-270 | public |
| GET /users/me/profile | backend/src/modules/users/users.controller.ts:34-37 | JWT |
| GET, PATCH /users/me/notification-settings | users.controller.ts:55-64 | JWT (PATCH idempotent) |
| GET /home/upcoming-appointment, GET /home/search | backend/src/modules/home/home.controller.ts:15-23 | JWT |
| POST /search/intent | backend/src/modules/search-intent/search-intent.controller.ts:11-15 | public |
| GET /notifications | backend/src/modules/notifications/notifications.controller.ts:13-16 (and backend/src/modules/doctors/doctors.module.ts:293) | JWT |
| POST /auth/login, /auth/login/verify-2fa, /auth/guest, /auth/social-login, /auth/register, /auth/convert-guest, GET /auth/me, POST /auth/otp/request, /auth/otp/verify, /auth/session/exchange, /auth/password/forgot, /auth/password/reset, /auth/heartbeat | backend/src/modules/auth/auth.controller.ts:149-173, 187-209, 175-180, 321-326, 131-147, 182-185, 211-214, 93-98, 101-106, 109-116, 118-123, 125-129, 231-245 | login/register/otp/guest/social public; me, convert-guest, heartbeat JWT |
| BFF routes (browser → Next) | patient-web/app/api/auth/{login,verify-2fa,guest,social-login,register,convert-guest,session,otp/request,otp/verify,session/exchange,password/forgot,password/reset,heartbeat,logout}/route.ts, app/api/search/intent/route.ts, app/api/patient/[...path]/route.ts — all present | — |

Not found anywhere: a BFF route `/api/push/web/subscribe` (referenced only by the unmounted `ServiceWorkerRegister`, components-next/service-worker-register.tsx:30).


---

## Not traced (honest limits)

- **Not-found page** (`app/[locale]/not-found.tsx`) and the content of every page reached by a link (later batches) were not read; only their existence was checked (Appendix A).
- **Google sign-in** was read but cannot be exercised without `NEXT_PUBLIC_GOOGLE_CLIENT_ID`; NR-5 is therefore a suspicion, not an observed failure.
- **Which handler answers `GET /notifications`** (NR-41) depends on Nest's registration order; both controllers were read, the live behaviour was not observed.
- **Live behaviour** of every call in this document was inferred from code; nothing was run (no backend, no browser, no network). Findings that rest on a mismatch between two files (NR-12, NR-13, NR-14, NR-26, NR-35, NR-42) cite both files.
- `components-next/ui-generated/*` is a generated mirror of `packages/ui`; only the props that carry data (DoctorCard, ServiceTile, ListItem, Search, Chip, StatusChip, Toggle/Radio/Segmented usage, Avatar, Rating, BottomTabBar, AppShell, ErrorState/EmptyState) were read.
- CSS files were read only for visibility rules (`display:none`, breakpoints), not for colours or sizes.

## NR index (position = `NR-n`; full text in `docs/design/needs-review/batch-0-web.json`)

| NR | Screen | Element | file:line |
|---|---|---|---|
| NR-1 | `/login` | Language menu items (LocaleSelector); same component on every Batch 0 screen | components-next/locale-selector.tsx:48 |
| NR-2 | `/login` | Continue as guest button (and the Google callback) | components-next/social-login-buttons.tsx:72 |
| NR-3 | `/login` | Two-factor code step and which accounts can sign in | components-next/login-form.tsx:30 |
| NR-4 | `/login` | Error message under the form | components-next/login-form.tsx:36 |
| NR-5 | `/login` | Google button (rendered only when NEXT_PUBLIC_GOOGLE_CLIENT_ID is set) | components-next/social-login-buttons.tsx:82 |
| NR-6 | `/login` | Hard-coded copy and the identifier input | components-next/login-form.tsx:54 |
| NR-7 | `/login` | Identifier matching for phone numbers (backend) | backend/src/modules/auth/auth.service.ts:560 |
| NR-8 | `/register` | Consent policy ids and versions sent on registration | components-next/register-form.tsx:18 |
| NR-9 | `/register` | Guest → account conversion (submit with a phone number) | backend/src/modules/auth/auth.service.ts:876 |
| NR-10 | `/register` | Submit error messages (account may already exist) | components-next/register-form.tsx:78 |
| NR-11 | `/register` | Copy kept outside messages/*.json (register, otp, forgot-password, password-reset, welcome) | components-next/register-form.tsx:9 |
| NR-12 | `/otp` | Resend code button | app/api/auth/otp/request/route.ts:6 |
| NR-13 | `/otp` | Verify code button (second step: session exchange) | app/api/auth/session/exchange/route.ts:12 |
| NR-14 | `/otp` | Verify code button (session cookies after a successful exchange) | app/api/auth/session/exchange/route.ts:18 |
| NR-15 | `/otp` | Identifier shown in the subtitle (URL query) | components-next/register-form.tsx:83 |
| NR-16 | `/forgot-password` | Submit → success message | components-next/forgot-password-form.tsx:17 |
| NR-17 | `/password-reset` | Code field (reset token) | components-next/password-reset-form.tsx:8 |
| NR-18 | `/welcome` | Continue as guest button | components-next/auth-welcome.tsx:38 |
| NR-19 | `/onboarding` | Whole screen (entry and outcome) | app/[locale]/onboarding/page.tsx:11 |
| NR-20 | `/onboarding` | Slides, buttons and labels | app/[locale]/onboarding/page.tsx:17 |
| NR-21 | `/onboarding/language` | Continue button (also onboarding-carousel.tsx:33 and onboarding-permissions-client.tsx:54) | app/[locale]/onboarding/language/page.tsx:32 |
| NR-22 | `/onboarding/permissions` | Allow buttons (Location, Notifications) | components-next/onboarding-permissions-client.tsx:15 |
| NR-23 | `/` | Hero search form (also on /dashboard) and the JSON-LD SearchAction | components-next/home/home-parts.tsx:44 |
| NR-24 | `/` | Language button label (aria-label of the LocaleSelector) | components-next/home/home-shell.tsx:71 |
| NR-25 | `/login` | Theme toggle buttons (all auth screens and CoreShell screens) | components-next/theme-toggle.tsx:106 |
| NR-26 | `/` | Featured-doctor cards: price, currency, place, next slot | lib/api/doctors.ts:10 |
| NR-27 | `/` | Featured-doctor cards: name and specialty | components-next/home/home-parts.tsx:249 |
| NR-28 | `/` | Error state of every Batch 0 route (error.tsx) | app/[locale]/error.tsx:9 |
| NR-29 | `/dashboard` | Sign-out (missing on all home-shell and core-shell screens) | app/[locale]/layout.tsx:90 |
| NR-30 | `/` | Curated home items: link target | components-next/home/home-parts.tsx:215 |
| NR-31 | `/` | Curated home items: image | components-next/home/home-parts.tsx:218 |
| NR-32 | `/search` | Section links of the frame (CoreShell) vs HomeShell | components-next/core/core-shell.tsx:49 |
| NR-33 | `/` | Maintenance state and footer copy | app/[locale]/page.tsx:67 |
| NR-34 | `/dashboard` | Hero title (patient name) | lib/api/dashboard-server.ts:5 |
| NR-35 | `/dashboard` | Next-appointment card: time and status | backend/src/modules/home/home.service.ts:76 |
| NR-36 | `/search` | Intent call before the results list | app/[locale]/search/search-client.tsx:103 |
| NR-37 | `/search` | Results call: query length cap | lib/api/patient-allowlist.ts:76 |
| NR-38 | `/search` | Doctor result sub-line (specialty) | app/[locale]/search/search-client.tsx:62 |
| NR-39 | `/notifications` | Notification rows and unread dot | app/[locale]/notifications/page.tsx:93 |
| NR-40 | `/notifications` | Notification title and body language (backend) | backend/src/modules/notifications/notifications.service.ts:407 |
| NR-41 | `/notifications` | GET /notifications is registered twice (backend) | backend/src/modules/doctors/doctors.module.ts:288 |
| NR-42 | `/notifications/settings` | The 9 switches (6 categories, 3 channels) | backend/src/modules/users/users.service.ts:269 |
