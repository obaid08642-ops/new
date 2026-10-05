# Design rebuild — PROGRESS

> **Session protocol (owner instruction, 2026-10-04)**
> - **Start of every session:** read this file, then `SCREEN_INVENTORY.md` and `WIRING_REPORT.md`, and continue from **Next**.
> - **After every PR:** update this file (Done / In progress / Next / Blockers, with the PR link) and `screen-status.json`, then re-run `node tools/design/screen-inventory.mjs`.
> - **When context runs low:** commit, push, update this file with the exact stopping point, push again, and stop.
>
> Sources: `DESIGN_HANDOFF_FINAL.md`, `SPEC_PRODUCT_DOCTOR_DETAIL.md`, `DEVICE_STANDARD.md`, `canvas/`. How the folder works: `README.md`.

_Last updated: 2026-10-04 (#259–#261 approved from the design side; #264 review fixes pushed with board side-by-side images; board side-by-side images posted on #261, #263 and #264; next step: components part 2)._

## Snapshot

| Area | State | Notes |
|---|---|---|
| Workflow, inventory, wiring report | **Done** ([#256](https://github.com/obaid08642-ops/new/pull/256)) | `PROGRESS.md`, `SCREEN_INVENTORY.md`, `WIRING_REPORT.md`, `screen-status.json`, `tools/design/screen-inventory.mjs` |
| Design sources in the repo | **Done** ([#256](https://github.com/obaid08642-ops/new/pull/256)) | Handoff, spec, device standard and 40 boards in `canvas/` |
| Foundation: tokens | **In review** ([#259](https://github.com/obaid08642-ops/new/pull/259)) | Service tones and service map; 97 contrast checks pass |
| Foundation: Readex Pro on the web | **In review** ([#260](https://github.com/obaid08642-ops/new/pull/260)) | Self-hosted with `next/font/local`; on main the web had no font at all (CSP blocked Google) |
| Foundation: native shells | **In review** ([#261](https://github.com/obaid08642-ops/new/pull/261), stacked on #259) | `Screen`, `AppHeader`, `StickyFooter`, `TabBar` in `packages/ui-native` |
| Foundation: web shells | **In review** ([#263](https://github.com/obaid08642-ops/new/pull/263), stacked on #259) | `AppShell`, `StickyFooter` in `packages/ui`, mirrored into patient-web |
| Foundation: shared components | **1 of 4 in review** ([#264](https://github.com/obaid08642-ops/new/pull/264)) | FIcon, SectionHeader, ServiceTile, ListItem, Avatar, Rating; design review fixes pushed (`b0e4c17`) |
| Foundation: lint gates | Not started | See `WIRING_REPORT.md` §1 for the measured gaps |
| Screen batches 0–13 | Not started | 410 screens to design (104 more routes only redirect) |

### Screens per batch (from `SCREEN_INVENTORY.md`; redirect-only routes excluded)

| Batch | Scope | app | web | Done |
|---|---|---|---|---|
| 0 | Core (auth, onboarding, home, search, services, notifications) | 15 | 14 | 0 |
| 1 | Pharmacy flows | 23 | 34 | 0 |
| 2 | Consultations and video | 22 | 24 | 0 |
| 3 | Labs and radiology | 17 | 22 | 0 |
| 4 | Nursing / home care | 7 | 9 | 0 |
| 5 | Health records and reports | 26 | 24 | 0 |
| 6 | Family | 10 | 10 | 0 |
| 7 | Insurance | 10 | 13 | 0 |
| 8 | Maternity, nutrition, mental health, chronic care | 11 | 21 | 0 |
| 9 | AI tools | 7 | 10 | 0 |
| 10 | Community and articles | 5 | 5 | 0 |
| 11 | Loyalty and offers | 7 | 7 | 0 |
| 12 | Account, settings, support, returns | 20 | 20 | 0 |
| 13 | Web-only / public pages | 3 | 14 | 0 |

## Done

- **Workflow and inventory** — PR [#256](https://github.com/obaid08642-ops/new/pull/256) (branch `claude/progress-md-workflow-vqhj8x`)
  - Added the design sources to `docs/design/`: `DESIGN_HANDOFF_FINAL.md`, `SPEC_PRODUCT_DOCTOR_DETAIL.md`, `DEVICE_STANDARD.md`, and the 40 boards from `nabd-design-boards.zip` in `canvas/`.
  - Added `tools/design/screen-inventory.mjs`, which generates three files:
    - `SCREEN_INVENTORY.md`: 514 routes (244 app, 270 web), each with a template, closest board, batch and endpoints.
    - `WIRING_REPORT.md`: the foundation status, the spec field gaps, and 760 (route, endpoint) pairs checked against the backend, the BFF handlers and the proxy allowlist.
    - `inventory/screens.json`: the same data, machine-readable.
  - Added this file, `README.md` and `screen-status.json`, and a pointer in `/AGENTS.md`.

## In progress

- **Tokens, PR [#259](https://github.com/obaid08642-ops/new/pull/259)** (branch `design/tokens`), waiting for review.
  - Adds `color.service.<tone>` for the 10 tones from `FIcon.dc.html`, stored as `fg`/`bg` `{light, dark}` plus `solid {from, to}`.
  - Points `color.service.<service>` at the handoff service map, and adds 6 services.
  - Owner decision: the light glyph of coral, mint, amber, peach and teal is darkened slightly to reach 4.5:1.
  - Before/after swatch screenshots are in `docs/design/screenshots/tokens/` on that branch.
  - Also fixes the check that was red on main: the `OtpModal.test.tsx` `#000000` stub now uses `#0B1B2B` (separate commit).
  - Design-session correction (commit `c399fe7`): the solid chip gradients (white glyph) now reach 3:1 at both ends.
    - Changed: coral.from `#FF6B73→#FF5C65`, mint.from `#2DBF92→#27A67F`, amber.from `#FFB547→#D68000`, amber.to `#E08A00→#D38200`, pink.from `#F573A6→#F4609A`, lime.from `#8CC63F→#71A230`, peach.from `#FF8A5C→#FF6021`, teal.from `#23B5CE→#1FA2B8`.
    - New token `color.icon.onSolid`, with contrast pairs for every tone. 145 checks pass.
  - Approved from the design side; waiting for the reviewer to merge.
  - Not covered by screenshots: screen-level shots, because this environment has no installed apps and no backend.
- **Readex Pro on the web, PR [#260](https://github.com/obaid08642-ops/new/pull/260)** (branch `design/font-web`), waiting for review.
  - What was wrong on main: Tajawal was loaded but unused, and the Google Fonts `@import` was blocked by the CSP, so the site rendered in a system font.
  - `app/fonts.ts` loads Readex Pro and the 4 Noto faces with `next/font/local`, using variable woff2 files with their OFL licences. Each Noto face is limited to its script with `unicode-range`.
  - `globals.css` applies the per-locale order from `tokens.json`. Urdu headings and paragraphs get a taller line height for Nastaliq.
  - The web copy of `fonts.css` drops the Google import.
  - Screenshots: `docs/design/screenshots/font-web/` on that branch.
  - Approved from the design side.
- **Native shells, PR [#261](https://github.com/obaid08642-ops/new/pull/261)** (branch `design/shells-native`), waiting for review.
  - Stacked on #259: it needs the `action.fab` and `shadow.*` tokens, which were added to #259 in commit `87cc899`.
  - `packages/ui-native/src/shells` adds `Screen`, `AppHeader`, `StickyFooter` and `TabBar` (with `useTabBarHeight`), all built on `react-native-safe-area-context` and the tokens.
  - 6 jest tests in `patient-app/__tests__/design-system-shells.test.tsx`.
  - Screenshots are react-native-web renders with iPhone 15 Pro insets.
  - No screen uses the shells yet. Screens are migrated batch by batch.
  - Approved from the design side. Merge #259 first.
- **Web shells, PR [#263](https://github.com/obaid08642-ops/new/pull/263)** (branch `design/shells-web`, stacked on #259), waiting for review.
  - `packages/ui/shells`: `AppShell` (top bar, side rail at 768–1023, side nav from 1024, tab bar under 768, a `footer` slot that keeps the CTA above the tab bar) and `StickyFooter`.
  - `shells.css` uses `100dvh`, safe-area insets, logical properties and tokens only.
  - Mirrored into patient-web, and `app/layout.tsx` imports the CSS once. No page uses the shell yet.
  - `layout.maxContent` changes from 1180 to 1200 (DEVICE_STANDARD §1), and `maxContentAdmin` (1600) is new.
  - 8 vitest tests. 12 screenshots, all with 0 px horizontal overflow.
- **Components 1/4, PR [#264](https://github.com/obaid08642-ops/new/pull/264)** (branch `design/components-icons`, stacked on #259), waiting for review.
  - `packages/ui/icons/fill.ts` is ported from `canvas/FIcon.dc.html` by `tools/design/extract-ficon.mjs` (78 glyphs, with the service map and tones).
  - New contract components `FIcon` and `SectionHeader`. `ServiceTile` (now takes a service name) and `ListItem` (now takes a `leading` FIcon) are restyled from the boards. The roster grows from 28 to 30.
  - The 12.A7 tile tests now follow the handoff (filled FIcon instead of the illustrated art); this is flagged in the PR.
  - **Design review fixes** (commit `b0e4c17`, [comment](https://github.com/obaid08642-ops/new/pull/264#issuecomment-5984595476)):
    - ServiceTile: the second card came from the gallery frame. Specimens now sit on the canvas, so the tile is one white card (radius 22, hairline, shadow).
    - Avatar: there is no illustrated or cartoon variant. It shows a real photo (`src`), otherwise initials, otherwise the neutral user icon. The ring follows HomeApp, using the new `color.avatar.{bg,ring}` tokens.
    - Rating: one filled star, the value and `(count)`, per the DoctorCard board. It renders nothing when there is no rating or the count is 0. Star tokens are `color.icon.ratingStar` and `ratingStarOnBrand`; 151 contrast checks pass.
    - New `packages/ui/build-compare.mjs` writes board crop (left) vs real component (right) images to `docs/design/compare/`. **Every component PR from now on includes these images.**
- **Board side-by-side for the shells (design review item 5):**
  - #263 (`1962644`): `build-compare.mjs` puts the board's own content inside the shell, so only the chrome differs: StickyFooter vs Cart, and the AppShell top bar vs HomeWeb at 1440. Fixed what it showed:
    - the CTA glass is now canvas-tinted (canvas at 86%, as on Cart, CheckoutV2, RxUpload and BookingConfirm);
    - the desktop top bar is inset 64px, as on HomeWeb.
    - The 12 screenshots were re-shot.
  - #261 (`e5f9f7a`): `tools/design/compare-native.mjs` renders the native shells through react-native-web next to board strips: TabBar vs HomeApp (light and dark), StickyFooter vs Cart, AppHeader vs Settings. Fixed:
    - the raised Consultations button sat 7px high;
    - the StickyFooter now uses canvas glass (`shellTokens.glassCanvas`).
  - #264 (`7c4428c`): board crops re-cut after the `support.js` fix below.
  - `canvas/support.js` (#256) built HTML elements from the upper-case `tagName`, so board `<a>` and `<button>` lost their native layout. It now uses `localName`.
- **Fix pushed to #259 (`e33d728`), and merged into #261 and #263:** `packages/ui/dist/preview.html` embeds the token sheet and had gone stale. CI missed it because that job fails earlier on a missing module.

## Next (in this order)

The foundation comes before any screen (DEVICE_STANDARD §4, handoff §3). Each step is its own PR on its own `design/<step>` branch from `main`, with screenshots before and after.

1. ~~**Tokens**~~: PR #259 is in review.
   - Canvas, card, text, secondary text, action and coral already match handoff §1.
   - The primary-button gradient (`#E8384A → #D42A38`) and the segmented track (`#EAEAEF`) are added with their components (step 5), where the dark boards define them.
2. ~~**Font on patient-web**~~: PR #260 is in review. patient-app already loads Readex Pro from `assets/fonts`.
3. ~~**Native shells**~~: PR #261 is in review.
4. ~~**Web shells**~~: PR #263 is in review.
   - `globals.css` still has its own `--nabd-layout-max: 1180px` and an old `.shell` layout. Pages switch to `AppShell` batch by batch, and the old `.shell` rules are removed when the last page moves.
4b. ~~**Board side-by-side images for the shells**~~: done on #263 ([comment](https://github.com/obaid08642-ops/new/pull/263#issuecomment-5984644359)) and #261 ([comment](https://github.com/obaid08642-ops/new/pull/261#issuecomment-5984692867)).
5. **Shared components** (handoff §3), in both packages, through the existing contract (`packages/ui/components/contract.ts`):
   - ~~1/4: FIcon, SectionHeader, ServiceTile, ListItem/ListRow~~ (#264).
   - 2/4 (next, branch `design/components-controls`): Button (gradient primary and outline), IconButton, Segmented (track `#EAEAEF`), Toggle, Radio, Chip/StatusChip, SearchField (`Search`), Stepper.
   - 3/4: Card, DoctorCard, ProductCard, OfferCard, Timeline, ProgressRing.
   - 4/4: EmptyState, ErrorState, OfflineState, and the web TabBar (`BottomTabBar`).
   - **TabBar (web and native), design review:** exactly as HomeApp. It is a floating glass bar; the active item is an ink pill with icon and label; the centre is a raised coral Consultations button. The grey dots in the #261/#263 screenshots are placeholders, so the shells get the real fill icons.
   - Each component PR includes board-vs-component images from `node packages/ui/build-compare.mjs --boards docs/design/canvas` (it needs `canvas/support.js`, added in #256).
   - Whenever tokens change, re-run `node packages/ui/build-preview.mjs`.
6. **Lint gates** still missing from `tools/design` (handoff §6, DEVICE_STANDARD §5): `no-left-right`, `no-100vh`, `no-rn-safeareaview`. They currently fail on:
   - `patient-app/app/room/[id].tsx` (`SafeAreaView` imported from `react-native`);
   - 4 web files that use `100vh` (listed in `WIRING_REPORT.md` §1).
7. **Batch 0**, then batches 1–13 in the order of `SCREEN_INVENTORY.md`. For each batch:
   - fix the `WIRING_REPORT.md` §4 rows that belong to it;
   - send the owner screenshots at 390, 768 and 1440, in light and dark;
   - wait for approval before starting the next batch (handoff §4).

## Owner decisions (2026-10-05)

- **A. Identity is fixed.** Canvas `#F5F5F7` (plain), action `#D42A38`, coral `#FF4B55`, ink `#0B1B2B`, the Noon Dot logo (`canvas/Main.dc.html`), Readex Pro, the boards' icons, buttons and cards. Never add a colour, logo variant, background pattern or shape that is not on a board; ask the owner first. Every PR description carries "Identity check: no new colours/logo/patterns" and the token diff.
- **B. Login first.** The login screens (web and app: Welcome, Login, Register, email code, AuthWeb) are the first screens of Batch 0, rebuilt from the boards, with the ten listed defects gone (before/after at 390/768/1440, light and dark). Built; see the Batch 0 PR.
- **C. Quality standards** are in `QUALITY_STANDARDS.md` and enforced in CI where a tool exists: `no-large-raster` (200 KB), Lighthouse performance ≥ 90 / accessibility ≥ 95 / LCP < 2.5 s / CLS < 0.1 / TBT ≤ 200 ms / JS ≤ 170 KB. Every screen PR pastes the measured checklist.
- **D. Fetal-week images:** keep the current artwork, move it out of the app, serve it from the CDN; week content comes from the backend. See "Fetal-week images" under Blockers for what is done and what waits.
- **E. Model.** From the next session: Claude Sonnet 5, high effort for components 2-4, medium for regular screens, high for payment, booking, pharmacy offers, insurance and calls.

## Owner decisions (2026-10-04)

- **Branches:** every step or batch gets its own `design/<batch>` branch from `main`, and one PR to `main` per batch. Each PR includes screenshots before and after and is reviewed before merge. Design work never goes on `fix/audit-2026-09`. This is recorded in `/AGENTS.md`.
- **Order:** tokens → Readex Pro on the web → shared layouts (shells) → shared components → lint → Batch 0. Each step is its own PR.
- **Calls:** there is one call product, not a separate voice consultation.
  - The doctor and the patient can each turn their camera on or off.
  - It has one price, the same as the backend fee map: `video_consultation_fee || consultation_fee`.
  - `voice_consultation_fee` is removed from the design. `canvas/DoctorFull.dc.html` was updated (consult types: clinic, call, home visit).
  - When the call screens are restyled (batch 2), add a camera on/off button.
- **Doctor fields:** the reviewer session will add `scfhs_license_no`, `years_experience` and `qualifications[]` to the backend. The doctor enters them at registration and the admin approves them. Until they exist and are filled, those rows stay hidden, with no default or invented value.
- **Screens without a board** (chat, call, emergency, map): keep their current layout. Only apply the tokens, the font and the shared components until they get a design.

## Batch 0 web: Home and Dashboard (in progress, branch `wip-web-home`, not pushed)

- Built on the HomeWeb board (desktop) and HomeApp (phone): `AppShell` with the board's top bar and the phone tab bar, hero with search, nine service tiles, AI assistant card, curated sections and real doctors (public home), appointment card and every other page as ListItem rows (dashboard). Files: `components-next/home/*`, `app/[locale]/page.tsx`, `app/[locale]/dashboard/{page,loading}.tsx`, `HomeWeb` messages in all 6 locales.
- Hidden because there is no data or endpoint: the health-reminder banner (no endpoint on the dashboard), the cart count badge, doctor photo and verified seal, the offer price (curated items carry none).
- Screenshots: `docs/design/screenshots/batch0-web/home-before-after-board.png`, `dashboard-before-after-board.png`.

## Batch 0 app: Home, tab bar and Services (in progress, branch `wip-app-home`, not pushed)

- Built on HomeApp / HomeAppDark (Home, `app/index.tsx` splash, the main tab bar) and ServiceHub (`(tabs)/services.tsx`, `services/index.tsx`). The tab bar is the shared `BottomTabBar` / `TabBar` (floating glass pill, ink active pill, raised coral Consultations button); `(tabs)/_layout.tsx` uses it and turns the layout header off for Home and Services only.
- Hidden because there is no data or endpoint: the points balance (no endpoint on Home), the notification dot unless the store has unread items, the avatar photo (`/users/me/profile` has none), price and provider on the curated offer cards (`/content/home` carries neither), the appointment section without an appointment, the reminder card without active reminders.
- Screenshots: `docs/design/screenshots/batch0-app/{before,after,compare}/` (`home-*`, `services-*`, `tabbar-*`; `home-data-*` use marked test values, `home-768-*`, `home-en-*` (left to right), `all-services-*`, `splash-*`).

## Found while working (fix in the batch named)

- **Batch 0, web `/login` in dark mode:** the card stays light while its text turns light, and the "continue as guest" button label is invisible. It is the same on main (see `docs/design/screenshots/font-web/before-ar-390-dark.png` on #260).
- **Dev only:** `next dev` rejects the inline theme script (`app/theme.ts`) under the CSP nonce, so the page ignores the stored or system theme. Screenshot scripts set `data-theme` themselves. Check whether production has the same problem when doing the web shell (step 4).

## Blockers

- **CRITICAL, for the reviewer session (found 2026-10-05 while wiring social sign-in): `POST /auth/social-login` does not verify Apple, X or Snapchat tokens.** `backend/src/modules/auth/auth.service.ts`: `verifyAppleToken` base64-decodes the JWT payload without checking its signature, issuer or audience; `verifyXToken` and `verifySnapchatToken` do the same and, when the token is not a JWT, invent an email. The handler then runs `userModel.findOne({ email })` and signs a session for that user, so a forged token with `{"email":"victim@example.com"}` logs in as that user (any role). Only Google is verified (a call to Google's userinfo). Needed: Apple (verify against Apple's JWKS, `iss`, `aud`, `exp`), X and Snapchat (call the provider's "me" endpoint with the access token; neither returns an email by default, so account linking needs a decision), and never mint an account from a made-up address. Until then the app buttons call a flow that is unsafe on the server.
- **Web social sign-in (Batch 0 login review item 1):** the row is hidden except Google, and Google only when `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is set. Apple, X and Snapchat have no web sign-in flow yet and the backend does not verify their tokens (above), so no dead or unsafe buttons are drawn. Add them to `social-login-buttons.tsx` when both exist.

- **Fetal-week images (owner D).** Done: the 41 week images in `patient-app/assets/images/maternity/fetus/` (29 MB, 1080×1920 PNG/JPG; no code referenced them: `baby-development.tsx` only redirects) were converted to WebP at 390/780/1080 px wide (1x/2x/3x, q80, 2.8 MB for all three sizes, largest file 75 KB) in `cdn-source/maternity/fetus/` and deleted from the app. Not done, and why: (1) **upload to Cloudflare R2**: this session has no R2 credentials (the Cloudflare connector is not authorised); upload `cdn-source/maternity/fetus/*` to the bucket behind the CDN and give me the base URL. (2) **Backend week content** (`GET` of week → image URL, size/length/weight, text): `backend/src/modules/maternity` has no such endpoint (`GET /maternity/content` exists; check it covers this), so the **reviewer session** adds it; no mock data is used meanwhile. (3) The app screen that shows the images (with an `expo-image` disk cache and a placeholder) is built when the endpoint and URLs exist. App download size: no build was run here; the images were never referenced from code but `assetBundlePatterns` is `**/*`, so they were shipped, about 29 MB of the repo's 30 MB under `assets/images/maternity`.
- **Fonts:** `MaterialSymbolsRounded.ttf` (1.7 MB) is still used by 28 patient-app files; it goes when the last of them moves to the shared icons.

- **CI is red on the base branch, in 5 jobs. This is for the reviewer.** Every PR shows these, including the docs-only #256:
  - The design-tokens job runs `tools/design/sync-ui-components.mjs` from `packages/design-tokens`, so the script is not found.
  - The PAY-001 grep matches `backend/src/modules/orders/orders.service.ts:79`.
  - The conformance job does not install `packages/ui-native` before `packages/ui` tsc.
  - The brand assets job has no `sharp`.
  - `packages/ui/build-preview.mjs:81` cannot resolve a module.

  Because each job stops at its first failure, CI skips the later contrast and ratchet steps. Design PRs run them locally and paste the output.

- **Fixed by the reviewer in PR #257:** pharmacy submit (web `/cart/checkout`) and lab opt-in-cash (web `/diagnostics/insurance-approval`). Pull `main` after #257 merges and re-run `node tools/design/screen-inventory.mjs`.
- **Endpoints the reviewer session will add.** Do not add backend endpoints or mock data for these. Until the endpoints exist, the screen hides that part or shows a "غير متاح حالياً" (not available right now) state:
  - Batch 1, web `/payments/result`: `GET /payments/status/:ref`.
  - Batch 7, web `/insurance/claims`: `GET /insurance/claims/my`. The backend serves `GET /insurance/claims`.
  - Batch 8, web `/nutrition/plan`: `GET /nutrition/plan`.
- **Doctor fields pending in the backend:** `scfhs_license_no`, `years_experience`, `qualifications[]` (see Owner decisions).

## Session log

| Date | Branch | What happened | Tip |
|---|---|---|---|
| 2026-10-04 | `design/shells-native`, `design/shells-web` | Board side-by-side images for the shells, with fixes for the raised tab offset, the CTA canvas glass and the desktop top-bar inset. | PR [#261](https://github.com/obaid08642-ops/new/pull/261) `e5f9f7a`, PR [#263](https://github.com/obaid08642-ops/new/pull/263) `1962644` |
| 2026-10-04 | `design/components-icons` | #264 design review fixes: one-card ServiceTile, Avatar without illustrated art, single-star Rating hidden without ratings, `build-compare.mjs` board side-by-side images. | PR [#264](https://github.com/obaid08642-ops/new/pull/264), tip `b0e4c17` |
| 2026-10-04 | `claude/progress-md-workflow-vqhj8x` | Added `canvas/support.js` (board runtime) so boards open in a browser and can be compared with components. | PR [#256](https://github.com/obaid08642-ops/new/pull/256) |
| 2026-10-04 | `claude/progress-md-workflow-vqhj8x` | Set up the workflow, imported the design sources, and generated the inventory and the wiring report. | PR [#256](https://github.com/obaid08642-ops/new/pull/256) |
| 2026-10-04 | `design/components-icons` | Components 1/4 (FIcon, SectionHeader, ServiceTile, ListItem); preview regeneration fixed on #259, #261 and #263. | PR [#264](https://github.com/obaid08642-ops/new/pull/264), tip `59a960f` |
| 2026-10-04 | `design/shells-web` | Web shells (`AppShell`, `StickyFooter`), `layout.maxContent` 1200, mirror and tests, 12 screenshots. | PR [#263](https://github.com/obaid08642-ops/new/pull/263), tip `c0b0090` |
| 2026-10-04 | `design/tokens` | Solid chip correction from the design session (8 values, `icon.onSolid`, 20 contrast pairs). Merged into `design/shells-native`. | PR [#259](https://github.com/obaid08642-ops/new/pull/259), tip `c399fe7` |
| 2026-10-04 | `design/shells-native` | Native shells (`Screen`, `AppHeader`, `StickyFooter`, `TabBar`), with tests and react-native-web screenshots; added the fab, gradient and shadow tokens to #259. | PR [#261](https://github.com/obaid08642-ops/new/pull/261), tip `55a5e23` |
| 2026-10-04 | `design/font-web` | Self-hosted Readex Pro and Noto on patient-web; found that the web had no font loading at all on main. | PR [#260](https://github.com/obaid08642-ops/new/pull/260), tip `f0a82b8` |
| 2026-10-04 | `design/tokens` | Tokens step: service tones and service map, contrast pairs, regenerated outputs, before/after swatches. | PR [#259](https://github.com/obaid08642-ops/new/pull/259), tip `1a5a783` |
| 2026-10-04 | `claude/progress-md-workflow-vqhj8x` | Recorded the owner decisions (branches, one call product, doctor fields, screens without a board, endpoints to hide). Imported the updated `DoctorFull` board. | PR [#256](https://github.com/obaid08642-ops/new/pull/256) |
