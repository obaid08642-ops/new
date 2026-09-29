# 05 — Owner additions: brand, design system, UI rebuild, and requirements missing from the plan

Date: 2026-09-29 · Author: reviewer (Claude), from the owner's decisions and a line-by-line re-read of the owner's original request file (`طلب.md`, 9,580 lines) against `02_AGENT_EXECUTION_PLAN.md`.

How to use this file:
- **Part A** becomes **PHASE 12 — Brand, design system and UI rebuild** in the plan.
- **Part B** becomes **PHASE 13 — Requirements from the owner's request that no phase covers yet**.
- Items already covered by another phase are NOT repeated here; where a task extends an existing one, it names that task.
- Every task follows the plan's rules (AGENTS.md): one task = one commit, real Verify output, no deferral.

---

## PART A — PHASE 12: Brand, design system and UI rebuild

### A0. Principle (owner decision)
The whole UI is rebuilt on **one central design system**. Nothing in any screen may hardcode a color, font size, radius, spacing, shadow, icon or animation. Changing a token must change every screen of **patient-app, patient-web, provider-app and admin** at once. Patient web and patient app must look and behave as one product.

### A1. Logo (owner approved: Direction A, "Noon Dot")
- The mark: the open bowl of the Arabic letter ن (a holding hand) with the dot above it (the pulse). The dot pulses in motion contexts (splash, loading, success).
- Master SVG (viewBox 0 0 240 240):
  ```svg
  <path d="M40 104 C40 196 200 196 200 104" fill="none" stroke="#FF4B55" stroke-width="36" stroke-linecap="round"/>
  <circle cx="120" cy="58" r="24" fill="#FF4B55"/>
  ```
- Lockups: mark + "نبض" (Arabic) and mark + "Nabd+" (Latin), the "+" in coral. App icon: white mark on a coral tile. Dark lockup: off-white bowl + coral dot on ink.
- Deliver as `packages/brand/` (SVG master, PNG 1024/512/192/180/32/16, favicon.ico, maskable icon, iOS/Android adaptive icons, splash). Replace every old logo in all 4 clients, app stores metadata, emails, PDFs and OG images.
- Keep the wordmark next to the mark in all first-exposure placements (store listing, website header, splash) so the mark is read as "Nabd", not as the letter alone.
- NOTE (owner action, not agent): the name "Nabd/نبض" is already used by other health apps (e.g., "Nabd" patient + doctor apps by Sawa Labs on Google Play, nabdhealth.app). The owner will run an official SAIP trademark search with a lawyer before final registration.

### A2. Color tokens (contrast-checked, WCAG AA)
Single source: `packages/design-tokens/tokens.json` → generated CSS variables (web/admin), a TS module (React Native apps), and a Tailwind/theme preset. Semantic names only in code (`color.bg.canvas`, `color.action.primary.bg`…), never raw hex.

**Brand**
| Token | Light | Dark | Rule |
|---|---|---|---|
| brand.coral | #FF4B55 | #FF6B73 | Logo, large display, icons, highlights. **Never white text on #FF4B55 (3.29:1).** |
| action.primary.bg | #D42A38 | #FF6B73 | Primary buttons. Light: white text (5.01:1). Dark: ink text. |
| brand.ink | #0B1B2B | — | Primary text (light), dark canvas. |
| brand.canvas | #F5F5F7 | — | Light canvas: neutral Apple-like off-white (owner: no beige/yellow tint, never pure #FFFFFF as the page background). |
| accent.lime | — | #D7FF00 | **Dark surfaces only.** Text on lime is always ink #0B1B2B (15.1:1). Never white on lime (1.15:1). Never on light backgrounds. Never adjacent to coral fills. |

**Surfaces**
| Token | Light | Dark |
|---|---|---|
| bg.canvas | #F5F5F7 | #0B1B2B |
| bg.surface (cards) | #FFFFFF | #12263A |
| bg.elevated (sheets, menus) | #FFFFFF | #1A3148 |
| border.subtle | #E5E5EA | rgba(255,255,255,0.10) |
| text.primary | #0B1B2B (16:1) | #F5F5F7 |
| text.secondary | #6E6E73 (4.66:1 on canvas, 5.07:1 on white) | #9AA4B2 (6.1:1 on #12263A) |

**Status**: success #1F7A5C text / #3FBF9A fill (ink text), warning #8A5A00 on #FFF4D6, danger = action.primary, info #3A56D4 / #6E8BFF on dark.

**Service tints (owner request: extra secondary colors for icons)** — used ONLY as soft tile backgrounds behind service icons (the glyph stays ink or the tint's dark shade), never for text or buttons: pharmacy coral-50, consultations blue-50, lab mint-50, radiology violet-50, nursing amber-50 (yellow family), mental health lavender-50, nutrition lime-50 (light) / lime on dark. Each tint pair must pass 4.5:1 for its glyph.

**Automated guard (required):** `tools/design/contrast-check.ts` reads every token pair used by components (text/bg, icon/bg, button label/fill, in both themes) and fails CI below 4.5:1 (3:1 for ≥24px text and icons). This is the permanent fix for "text/icon the same color as the background".

### A3. Theme: light and dark
- Default = the device setting (`prefers-color-scheme` on web, `Appearance` on React Native), live-updating if the device changes.
- User override in Settings: System / Light / Dark, persisted per device and synced to the user profile (`preferences.theme`) so web and app match after login.
- Web: no flash of the wrong theme (inline theme script before paint; SSR reads the cookie).
- Dark is not pure black: ink canvas #0B1B2B with the surface ramp above.

### A4. Language: automatic from the device, 6 locales
- Supported: ar, en, ur, hi, fil (Tagalog), bn. RTL for ar/ur; LTR for others.
- First visit/launch: pick the device/browser language (`Accept-Language` / `navigator.languages` on web, `expo-localization` in apps) if supported; otherwise **en**, and ar when the device region is Saudi Arabia and the language is unsupported.
- Web: the root `/` redirects to `/{detected}` with a 302 (not 301), and never overrides a locale already in the URL (SEO: canonical per locale stays intact; crawlers without Accept-Language get `x-default`).
- User override in Settings (and the header on web), persisted and synced to `preferences.locale`.
- Verify: tests for each of the 6 device languages + an unsupported one.

### A5. Typography
- One family covering Arabic + Latin + Urdu (Nastaliq-compatible fallback) + Devanagari + Bengali: primary **Readex Pro** (ar/en), with `Noto Nastaliq Urdu`, `Noto Sans Devanagari`, `Noto Sans Bengali` as locale fallbacks, loaded per locale only.
- Type scale tokens (display, h1–h4, body-lg, body, caption, label) with line heights tuned for Arabic. No font size in pixels inside components.

### A6. Icons and illustrations
**Owner direction (reference images: Almatar tiles, pastel wellness app, glossy app icons, STC Bank cards):** premium *illustrated* icons, not line icons and never emoji.
- **Illustrated icon set (services, categories, empty states):** one style only — flat brand colors from the palette, a 2.2px ink (#0B1B2B) outline, rounded joins, one soft highlight, drawn on a 48×48 grid. The approved set (pharmacy, consultation, doctor, lab, radiology, home nursing, mental health, nutrition, family) is in the canvas ("Illustrated icon set" + the `Icon` component). New icons must be drawn in the same style by the design session.
- **Service tiles:** white rounded tiles (radius 24) with a soft shadow `0 8px 24px rgba(11,27,43,0.07)` on the off-white canvas; on dark, #12263A tiles with a hairline border. The illustrated icon sits inside; the label below.
- **Small UI icons** (inside buttons, lists, tab bar): one simple line set only (Phosphor regular), same stroke everywhere. Illustrated icons are not used at tiny sizes.
- **Hero moments** (success, onboarding, empty states, app icon, promo cards): richer illustrations with depth (layered shapes, subtle gradient light on the object only, soft shadow) — like the reference cards — still inside the brand palette.

- **Zero emoji anywhere in the UI** (buttons, tabs, lists, toasts, empty states, notifications). Add a lint rule `no-emoji-in-ui` (regex on JSX text and i18n values) that fails CI.
- One vector icon set for all 4 clients: Phosphor (duotone + regular) via `@phosphor-icons/react` and `phosphor-react-native`, wrapped in one `<Icon name>` component that reads size/color tokens. Stroke weight consistent (regular for UI, duotone for service tiles).
- Custom vector illustrations (one consistent style, brand colors, light + dark variants) for: onboarding (3), empty states (orders, bookings, cart, notifications, search no-results, family, reminders, prescriptions), errors (offline, 404, server error), success (order placed, booking confirmed, payment done). Delivered as SVG/Lottie in `packages/brand/illustrations/`.

### A7. Components (build once in `packages/ui` for web/admin and `packages/ui-native` for the apps, same API)
Button (primary, secondary, ghost, danger, lime-on-dark; sizes; loading; disabled), IconButton (with aria-label), Input/TextArea/Select/OTP/Search, Chip/Tag/Badge, Card, ListItem, ServiceTile, Tabs/SegmentedControl, BottomSheet/Modal/Dialog, Toast, Skeleton, EmptyState, ErrorState, Stepper, DatePicker/SlotPicker, Map pin card, PriceTag, Rating (real data only), Avatar, Header/NavBar, Bottom tab bar, Sidebar (web/admin), DataTable + Chart wrappers (admin).
- Touch targets ≥ 44px; spacing scale 4/8/12/16/20/24/32/40/56; radius scale 8/12/16/20/28/pill.
- Every component: light + dark, RTL + LTR, loading/disabled/error states, keyboard and screen-reader support.

### A8. Liquid glass (restrained)
Use a translucent blurred material (web: `backdrop-filter: blur(20px) saturate(160%)` with a solid fallback; iOS: `expo-blur`/native material; Android: tinted solid fallback) ONLY on: bottom tab bar, top app bar when scrolled, bottom sheets and modals, floating action surfaces. Never behind body text or on list cards. Text on glass must still pass 4.5:1 (add a scrim).

### A9. Motion
- Page load: content enters in a short **stagger** (header → primary card → list items), 40–60 ms apart, each 180–240 ms, ease-out, translateY 8px + fade. Total ≤ 500 ms. Never block interaction.
- Press feedback on every button/tile (scale 0.97, 120 ms). Skeletons instead of spinners for content.
- Order/booking/payment success: a short celebration (brand-color confetti burst or the pulsing Noon Dot expanding into a check), ≤ 1.5 s, with haptic on mobile.
- Loading indicator: the logo dot pulsing at 60 bpm.
- Respect "reduce motion" (web `prefers-reduced-motion`, RN `AccessibilityInfo`): replace motion with fades.
- Performance: transforms/opacity only (no layout animation); React Native via Reanimated; web via CSS/Framer Motion with LazyMotion.

### A10. Responsive web (currently broken — owner report)
- Breakpoints: 320, 375, 414, 768, 1024, 1280, 1440, 1920, 2560+. Mobile-first layouts; tablet two-column; desktop with side navigation and max content width; 4K not stretched.
- No horizontal scroll at any width; safe areas on iOS Safari; forms usable with the on-screen keyboard.
- Verify: Playwright screenshot suite of every patient-web route at 375 / 768 / 1280 / 1920 in ar (RTL) and en (LTR), light and dark, plus an automatic check for horizontal overflow and for elements overlapping.

### A11. Rebuild scope
Apply the system to **every** screen of patient-app, patient-web, provider-app and admin (admin must also be fully usable on iPhone width — see Phase 7B). While rebuilding, merge duplicate screens and shorten journeys (extends Phase 8 "Merge screens"): no journey step that only shows information the next step repeats.

### A12. Brand controls in admin
- Brand colors are NOT editable from admin (contrast safety).
- Admin may enable/disable pre-designed seasonal themes (Ramadan, Eid, National Day) that ship as token overrides already contrast-checked; schedule start/end dates.

### Gate P12
- `contrast-check` green for both themes; `no-emoji-in-ui` green; a lint rule `no-raw-color` (no hex/rgb in component files outside tokens) green in all 4 clients.
- Screenshot suite green (no overflow/overlap) across the breakpoints × ar/en × light/dark.
- Theme and language auto-detection tests green (A3, A4).
- The reviewer does a visual pass on the 20 main screens of each client.

---

## PART B — PHASE 13: Owner requirements not covered by any phase yet

Source: the owner's original request (`طلب.md`), sections noted as §n. Each item was checked against Phases 0–11 and 7A–7F; only gaps are listed.

| Task | Requirement (source) | Do | Verify |
|---|---|---|---|
| R1 | Pharmacy geo-broadcast (§8) | Staged broadcast 3 km → 5 km → 8 km; interval from config (default 60 s). Expanding the radius ADDS newly eligible pharmacies; existing offers stay valid; no duplicate offers (unique index order_id+pharmacy_id). Delivery modes are distinct: platform delivery (staged broadcast), pharmacy-owned courier (pharmacy sets its own coverage radius in onboarding/settings, e.g. 1–50 km), self-pickup and patient's own courier (up to 15 km radius = 30 km diameter). Pharmacies without a courier do not set a radius. | Tests: stage timing; offers retained after expansion; no duplicates; each delivery mode picks the right pharmacies (extends Phase 8 F73) |
| R2 | Substitution (§7) | Pharmacy proposes a substitute for an unavailable item (item-level: original, substitute, reason, price); patient accepts/rejects per item; never automatic. | e2e: propose → accept → order total updated; reject → item removed |
| R3 | Price override audit (§7) | Pharmacy can override a catalog price on an offer; every override writes `price_overrides` (pharmacy, order, customer ref, original, new, reason, timestamp, actor). Admin page: filterable history + CSV. | Test: override creates a record; admin list shows it |
| R4 | Location privacy (§9) | Before acceptance, pharmacies/providers see only approximate distance and neighborhood, not the exact address or phone. Reveal only what fulfillment needs after acceptance. | API tests on offer/broadcast payloads for every provider type |
| R5 | Structured error codes (§30, §65) | One error catalog used by backend, apps, web and MCP: AUTHENTICATION_REQUIRED, INSUFFICIENT_PERMISSION, PRESCRIPTION_REQUIRED, NO_AVAILABILITY, SERVICE_UNAVAILABLE, PROVIDER_NOT_AVAILABLE, PRODUCT_OUT_OF_STOCK, PAYMENT_REQUIRED, INSURANCE_NOT_SUPPORTED, LOCATION_NOT_SUPPORTED, DUPLICATE_TRANSACTION, INVALID_INPUT, RATE_LIMITED. Every client shows a localized message per code (6 locales). | Contract test: each code maps to a message in all clients |
| R6 | Provider onboarding identity and lifecycle (§12, §19) | Separate `legal_name` (matches license) and `display_name`. Lifecycle: draft → pending_verification → approved → active/public → suspended/inactive → archived. Only active/public is visible anywhere public. Status changes propagate automatically to search, sitemap, SEO pages, cache and MCP (removal on suspend/archive, restoration on reactivate). Extends S15 (which covers publish on approval). | Test: suspend → gone from search, sitemap and MCP within minutes; reactivate → restored |
| R7 | Search engine (§13, §14, §59) | Pipeline: language detection → Arabic normalization (alef/ya/ta-marbuta/diacritics/tatweel) → typo and alias handling (search_aliases, transliteration for all 6 languages) → intent + entity extraction (entity × specialty × service × city/neighborhood × insurance × mode) → availability/coverage → relevance → ranking → canonical destination. Popularity is a signal, never a substitute for relevance; a selected category keeps results inside that category. Extends F71 and V3. | V3 real-query suite + tests for "cosmetics query shows no unrelated medicine" and category scope |
| R8 | Entity graph + internal linking (§15, §55) | Build relationships (medicine→ingredient→category→condition→specialty→doctor; medicine→alternatives→pharmacies; lab test→lab→location; etc.) in one graph store; internal links on public pages come only from real edges. | Test: no link to a missing entity; page shows its real related entities |
| R9 | Dynamic product ranking (§32–47, §62) | Backend ranking service from validated events (viewed, searched, clicked, added/removed from cart, purchased, wishlist), deduplicated, rate-limited, anti-abuse. Modes: trending, most viewed, most searched, most added to cart, best selling, highest conversion, popular recently, smart (configurable weights). Windows: 1 h, 24 h, 7 d, 30 d, 90 d, all time, updated continuously (rolling counters in Redis + background aggregation). Pharmacy storefront default = ALL categories ranked together (no forced alternation); selecting a category ranks within that category only (not a filter of the global list). Pharmacy-specific vs global metrics kept separate. Availability and business rules override popularity. Cold start without fake counts. One ranking API used by app, web, provider app, admin and MCP. Admin merchandising (featured/pinned) stays separate from automatic ranking (§77). | The §62 test list, including "A is #1 → B overtakes → B becomes #1 automatically", category scope, pharmacy vs global, anti-abuse |
| R10 | Ranking and search analytics in admin (§52, §75) | Admin pages: most viewed/searched/added/best sellers/trending/conversion by period and by pharmacy; abnormal activity; search analytics (top queries, no-result, poor-result, misspellings, emerging terms). Extends Phase 7B reports. | Admin click test + numbers match the DB |
| R11 | Saudi location architecture (§20) | Region → city → district/neighborhood → sub-area with Arabic/English names, aliases, transliterations, coordinates and parent/child links; an import pipeline for verified official data (no invented neighborhoods); used by provider coverage, search, SEO and delivery. | Import test on a real sample; lookup by alias works |
| R12 | Slug system (§69) | Stable, unique, collision-safe, localized slugs; a rename keeps the old slug as a 301 redirect (slug history), never breaks the canonical URL. | Test: rename → old URL 301 → new |
| R13 | Observability and recovery (§70–72) | Request IDs through all services; structured logs; monitoring of queues, event processing, search indexing, SEO/sitemap propagation and MCP calls; failed events retried and visible in admin ("failed propagation" list); a reconciliation job that compares DB with search index, sitemap, cache and MCP discovery and repairs drift. | Kill the indexer mid-event → retry succeeds; reconciliation report shows 0 drift |
| R14 | Consultation outputs (§11) | Doctor can issue, per role permissions: prescription, medical recommendation, lab recommendation, radiology recommendation, referral (to a specialty or a doctor). Each creates a patient-facing item that links straight to booking/ordering. Labs/radiology/providers upload results that reach the patient per privacy rules. Consultation modes: video, voice, chat, clinic, home visit. | Journey e2e for each output type |
| R15 | Medical content trust (§53) | Health content shows author, medical reviewer with credentials, updated date, references, editorial policy and disclaimer. AI-generated content cannot publish without human review (queue from Phase 6). | Test on article/condition pages |
| R16 | Citation and schema extras (owner addendum) | "Cite this" block on medical/drug pages (plain text + BibTeX with URL, author, timestamp). JSON-LD by page type: Drug (medicines), Physician/MedicalBusiness (providers), MedicalProcedure (services), FAQPage (content with FAQs). Extends S8. | Schema validator passes on samples |
| R17 | Provider badge / backlink widget (owner addendum) | Provider dashboard tab "Website badge": copy-paste snippet showing "Verified provider on Nabd+" that links to the provider's canonical page (plain dofollow link, no hidden links). | Snippet renders; link resolves to the canonical page |
| R18 | App URL scheme fallback and deferred deep links (§26, addendum) | `nabd://` scheme as secondary fallback; deferred deep link (install → open the originally requested entity) where the platform allows. Extends D1–D6. | Simulator test |
| R19 | Catalog in 6 languages, one entity (§5) | One canonical product ID with localized fields for ar/en/ur/hi/fil/bn; no per-language duplicates; scales beyond 21k. Extends S13/S16. | Count test: one doc per product; 6 locales present |
| R20 | Final report per requirement (§79–81) | Phase 11 report lists every requirement of `طلب.md` with PASS / PARTIAL / FAIL / MISSING / MOCK / BLOCKED and evidence, plus the 50-section report list of §80. | Reviewer checks the report against this table |

### Gate P13
All task Verify steps green; R9 ranking test proves the order is not frozen; R6 status propagation proven live on staging; R13 reconciliation shows 0 drift.

---

---

## PART C — Additions from the owner's message of 2026-09-29 (second file)

### C1. Approved visual reference
The owner-approved screens live in the Design canvas "Nabd+ Logo Directions", page "التصميم النهائي" (final design): design system sheet, illustrated icon set + `Icon` component, web home (desktop), mobile home (light + dark), product page with "Buy now", one-page checkout, one-screen doctor booking, the redesigned doctor profile, and the success celebration. The design session exports this canvas into `docs/design/` (HTML sources + PNG snapshots) when it commits this file, so the implementer can open it from the repo. They are the visual contract for Phase 12: match their tokens, spacing, hierarchy and components; the placeholders in brackets ([السعر], [اسم الطبيب]…) are always filled with real API data.

### C2. Who builds what (quality of premium assets)
- **Reviewer/design session (Claude)** produces the design assets once, before the implementer touches screens: `packages/design-tokens`, `packages/ui` + `packages/ui-native` core components (Button, Input, Card, ServiceTile, Tabs, BottomSheet, Skeleton, EmptyState, Toast, NavBar/TabBar), the icon wrapper with the chosen set, the illustration set (SVG/Lottie) and the motion helpers — each with a Storybook/preview page. These are the "stamps".
- **Implementer (agent)** only composes screens from these stamps. It must not draw its own icons, invent colors, or restyle components locally. Any missing component → request it in AGENT_PROGRESS.md as `NEEDS_COMPONENT: <name>`; the design session adds it.
- The reviewer rejects any screen that bypasses the stamps (lint: `no-raw-color`, `no-emoji-in-ui`, and an import rule that UI screens may only import visual primitives from `packages/ui*`).

### C3. Every screen rebuilt = every field and button verified
While rebuilding a screen, the implementer fills a row per interactive element in `docs/audit/screens/<app>/<screen>.md`: element → API endpoint → DB collection → test id. No element without a real endpoint, no mock/placeholder data, loading/empty/error/success states present. The reviewer spot-checks with the live harness.

### C4. User-journey simplification (step budget)
Rule: from an entity page (medicine, doctor, test, service) to confirmation in **at most 3 screens** for returning users (entity → one-page checkout/booking → success), **4** for first-time users (+ one-time profile/insurance capture). Techniques:
- "Buy now" / "Book now" on entity pages goes straight to a one-page checkout with smart defaults (last address, last payment method, saved insurance card, points pre-applied up to the cap).
- One page holds fulfillment (delivery/pickup), place, payment mode (direct/insurance), loyalty and the total; sections collapse when defaults are already valid.
- Prescription upload is inline on the checkout page only when a cart item requires it (per `requires_prescription`).
- Insurance: the patient never waits on a blocking screen; the order is submitted, the provider's decision arrives as a notification with a single "Pay copay" action.
- Booking: mode, day, slot and payment on one screen (see the canvas).
- Deliverable: `docs/ux/journeys.md` mapping every service × scenario (cash/insurance × delivery/pickup × Rx/no-Rx; consultation online/clinic/home; lab home/center; radiology; nursing) with the current screen count, the target count, screens merged/removed, and screens that are missing in a scenario (e.g., copay payment, substitution approval, result viewer). Extends Phase 8 "Merge screens" and journey e2e.

### C5. Performance and capacity (owner asked: instant pages, and how many simultaneous users/transactions)

**Current setup (from `deploy/`):** one server running everything in Docker: NestJS (Node cluster, one worker per CPU), MongoDB as a single-node replica set (WiredTiger cache 0.5 GB), Redis (512 MB), nginx with a 5–15 min API cache, LiveKit + coturn for calls, Next.js web — all on the same machine, behind Cloudflare.

**Reviewer assessment (to be confirmed by load tests, not guessed):**
- **Read traffic (browsing, entity pages, search results)** can scale to very large audiences if pages are served from the Cloudflare edge (HTML cached with ISR/stale-while-revalidate, static assets immutable). Edge-cached pages barely touch the server, so hundreds of thousands of concurrent visitors are realistic for cached pages.
- **Transactions (orders, bookings, payments, calls)** cannot be cached and all land on the one server and the one MongoDB node. On a single machine this is typically in the range of hundreds to low thousands of write requests per second, and tens to low hundreds of simultaneous video calls (CPU and bandwidth bound). **"Millions of simultaneous transactions" is not achievable on one server** — it needs horizontal scaling (below). The exact numbers must come from the load tests in P14.2.

| Task | Do | Verify |
|---|---|---|
| P14.1 | **Edge caching everywhere it is safe.** Public entity pages SSR + ISR with `Cache-Control: public, s-maxage, stale-while-revalidate`; Cloudflare cache rules for HTML of public pages (bypass on auth cookie), Tiered Cache, Brotli, HTTP/3, early hints; image resizing/next-image with AVIF/WebP; purge-by-URL from the propagation pipeline (S15/R6) on every entity change. Private/API responses never edge-cached. | Cache-hit ratio ≥ 90% on public pages; TTFB from edge < 150 ms; LCP ≤ 2.0 s mobile (extends F82) |
| P14.2 | **Load tests (k6) on staging** with a copy of production data: browse/search mix, add-to-cart, checkout, booking, payment webhook, chat, call join. Ramp until p95 > 500 ms or errors > 0.5%. Report the real ceiling per scenario and the first bottleneck. | `docs/perf/load-test-<date>.md` with numbers and graphs |
| P14.3 | **Backend hot paths.** Redis caching for catalog/ranking/search reads with event-driven invalidation; MongoDB indexes for every hot query (explain plans, no COLLSCAN); connection pool sizing; pagination limits; N+1 removal; response compression; rate limits per user and per IP. | explain() report; p95 targets met in P14.2 |
| P14.4 | **Write path resilience.** Order/booking creation behind an idempotent API + BullMQ queue for side effects (notifications, broadcast, emails, indexing) so the request returns fast; outbox pattern so no event is lost; graceful degradation (queue backlog does not fail checkout). | Kill Redis/worker mid-test → no lost order, retries succeed |
| P14.5 | **Horizontal scaling plan (ready to switch on).** Separate the tiers: (1) stateless backend on 2+ app servers behind a load balancer (sticky WebSockets via Redis adapter); (2) MongoDB 3-node replica set (or managed Atlas) with read preference for analytics; (3) managed/clustered Redis; (4) LiveKit on its own servers (or LiveKit Cloud) + TURN; (5) web on its own nodes or edge. Document the trigger metrics (CPU > 70%, p95 > 400 ms, Mongo cache miss) and the runbook. | Runbook in `deploy/SCALING.md`; staging proves 2 backend nodes work behind the LB |
| P14.6 | **Protection.** Cloudflare WAF + bot management + rate limiting rules on auth, OTP, search and checkout; DDoS "under attack" playbook; health checks and autoscaling hooks; uptime monitoring and alerting. | Rules exported to repo; alert fires on a test |

### C6. Search engines and AI assistants (owner asked for everything possible)
Phase 7F (S1–S16, A1–A6, V1–V5) and Phase 13 (R7–R9, R16–R19) already cover SEO, GEO, AEO, AI commerce, feeds and deep links. Extra items to add to 7F:
- **ASO:** localized store listings in 6 languages, keyword research per locale, screenshots from the new design, app preview video, in-app review prompt at success moments, store ratings response workflow in admin.
- **Answer-ready content:** each public entity page has a short factual summary block (what it is, price range, availability, who provides it, how to order) at the top, plus FAQs with FAQPage schema — the format assistants quote.
- **Brand entity:** Google Business Profile, Wikidata item, consistent NAP (name, address, phone) and sameAs links, so assistants recognize "Nabd+" as one entity.
- **Measurement:** track AI referrals (utm/referrer for chat.openai.com, perplexity.ai, gemini, copilot, claude.ai) and a monthly check of how assistants answer 50 target questions (which pages they cite).

### Gate additions
- P14: load-test report committed with the measured ceilings; edge cache-hit ≥ 90%; Core Web Vitals pass on the 20 main pages.
- C4: `docs/ux/journeys.md` complete; every journey within the step budget; journey e2e tests updated.

## Order of work
Phases 3 → 4 → 5 → 6 → 7 → 7A–7F → **12 (the design session delivers the stamps first — tokens, components, icons, illustrations, motion; then the implementer rebuilds screens together with Phase 8/9 and C3/C4 so each screen is touched once)** → 8 → 9 → **13** → **14 (performance and capacity)** → 10 → 11.
