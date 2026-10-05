# Design rebuild — PROGRESS

> **Session protocol (owner instruction, 2026-10-04)**
> - **Start of every session:** read this file, then `SCREEN_INVENTORY.md` and `WIRING_REPORT.md`, and continue from **Next**.
> - **After every PR:** update this file (Done / In progress / Next / Blockers, with the PR link) and `screen-status.json`, then re-run `node tools/design/screen-inventory.mjs`.
> - **When context runs low:** commit, push, update this file with the exact stopping point, push again, and stop.
>
> Sources: `DESIGN_HANDOFF_FINAL.md`, `SPEC_PRODUCT_DOCTOR_DETAIL.md`, `DEVICE_STANDARD.md`, `canvas/`. How the folder works: `README.md`.

_Last updated: 2026-10-05 (components 1/4–4/4, lint gates and the PROGRESS update merged; Batch 0 merged as #285 with the CSP step's commits stacked in it; `design/batch-0-fixes` in review)._

## Snapshot

| Area | State | Notes |
|---|---|---|
| Workflow, inventory, wiring report | **Merged** ([#256](https://github.com/obaid08642-ops/new/pull/256)) | `PROGRESS.md`, `SCREEN_INVENTORY.md`, `WIRING_REPORT.md`, `screen-status.json`, `tools/design/screen-inventory.mjs`, `canvas/support.js` |
| Design sources in the repo | **Merged** ([#256](https://github.com/obaid08642-ops/new/pull/256)) | Handoff, spec, device standard and 40 boards in `canvas/` |
| Foundation: tokens | **Merged** ([#259](https://github.com/obaid08642-ops/new/pull/259)) | Service tones and service map, solid chip correction |
| Foundation: Readex Pro on the web | **Merged** ([#260](https://github.com/obaid08642-ops/new/pull/260)) | Self-hosted with `next/font/local` |
| Foundation: native shells | **Merged** ([#261](https://github.com/obaid08642-ops/new/pull/261)) | `Screen`, `AppHeader`, `StickyFooter`, `TabBar` in `packages/ui-native` |
| Foundation: web shells | **Merged** ([#263](https://github.com/obaid08642-ops/new/pull/263)) | `AppShell`, `StickyFooter` in `packages/ui`, mirrored into patient-web |
| Foundation: shared components | **Merged** ([#264](https://github.com/obaid08642-ops/new/pull/264), [#265](https://github.com/obaid08642-ops/new/pull/265), [#267](https://github.com/obaid08642-ops/new/pull/267), [#268](https://github.com/obaid08642-ops/new/pull/268)) | 40 contract components on web and native, each with board side-by-side images |
| Foundation: components by class (CSP, F68) | **Merged** (its commits came in with [#285](https://github.com/obaid08642-ops/new/pull/285)) | Web components set no `style` attribute; `components.css` |
| Foundation: lint gates | **Merged** ([#269](https://github.com/obaid08642-ops/new/pull/269)) | `no-100vh`, `no-rn-safeareaview`, `no-left-right`; plus `no-large-raster` in Batch 0 |
| Screen batch 0 | **Merged** ([#285](https://github.com/obaid08642-ops/new/pull/285), `78af922f`) | 29 screens (web and app): sign-in, onboarding, Home, Search, Services, Notifications |
| Screen batches 1–13 | Not started | 381 screens to design |

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

- **Workflow and inventory**: PR [#256](https://github.com/obaid08642-ops/new/pull/256), merged 2026-10-05.
  - Added the design sources, `tools/design/screen-inventory.mjs` (which generates `SCREEN_INVENTORY.md`, `WIRING_REPORT.md` and `inventory/screens.json`), this file, `README.md` and `screen-status.json`.
  - Added `canvas/support.js`, the board runtime, so boards open in a browser and can be compared with components.
- **Tokens**: PR [#259](https://github.com/obaid08642-ops/new/pull/259), merged.
  - The 10 service tones and the service map.
  - The solid chip correction to reach 3:1 (owner, 2026-10-04).
  - `icon.onSolid`, plus the fab, gradient and shadow tokens.
- **Readex Pro on the web**: PR [#260](https://github.com/obaid08642-ops/new/pull/260), merged.
  - Before this, main had no web font at all: the CSP blocked Google Fonts. Now Readex Pro and the Noto faces are self-hosted.
- **Native shells**: PR [#261](https://github.com/obaid08642-ops/new/pull/261), merged.
  - `Screen`, `AppHeader`, `StickyFooter` and `TabBar`.
  - `tools/design/compare-native.mjs`. The reviewer fixed a CodeQL path-injection finding in it (`27d1685`).
- **Web shells**: PR [#263](https://github.com/obaid08642-ops/new/pull/263), merged 2026-10-05. `AppShell` and `StickyFooter`, mirrored into patient-web; no page uses them yet.
- **Components 1/4**: PR [#264](https://github.com/obaid08642-ops/new/pull/264), merged 2026-10-05. FIcon (`icons/fill.ts`), SectionHeader, ServiceTile, ListItem `leading`, Avatar (photo, initials or neutral), Rating (one star or nothing), and `build-compare.mjs`.
- **Side-by-side method approved** (owner, 2026-10-05). The images match the boards for ServiceTile, TabBar, the web top bar, StickyFooter, ListItem, Rating and Avatar. Every component step includes the same images.
- **Components 2/4, 3/4, 4/4 and lint gates**: PRs [#265](https://github.com/obaid08642-ops/new/pull/265), [#267](https://github.com/obaid08642-ops/new/pull/267), [#268](https://github.com/obaid08642-ops/new/pull/268), [#269](https://github.com/obaid08642-ops/new/pull/269), merged 2026-10-05.

## In progress
- **Batch 0 fixes 2, branch `design/batch-0-fixes-2`, PR #292** (owner decisions 2026-10-06): client-side Needs-review defects fixed (app 33 → 13 entries left, web 42 → 19), `ErrorState` with retry on `/` and `/dashboard`, translation-rule gates `no-literal-ui-string` (6752 → 6465) and `locale-parity` (681 → 678), `client-token-sync` 918 (unchanged), `no-raw-color` 8739 → 8738. Runtime check 45 runs, 0 issues. Waiting for review.

- **F82-1, web rendering path, branch `design/f82-1-web`** ([PR #297](https://github.com/obaid08642-ops/new/pull/297), opened after #292 merged; rebased and re-measured): client gets only the message namespaces it reads (home HTML 32 to 17 KB gz), precompiled next-intl messages (ICU parser out of the browser), WebMCP out of the first load, Readex Pro subset (78.6 to 51.3 KB), public credential-free reads in the Next data cache (60 s), `content-visibility` below the Home fold, one product-image preload. Lighthouse mobile, median of 3, production build: LCP `/ar` 3206 to 3045 ms, `/ar/pharmacy` 4286 to 3853 ms, `/ar/consultations/doctors` 3197 to 2911 ms; script -13 KB gz on each route; CLS, TBT, a11y unchanged (pharmacy CLS 0.083, a Batch 1 streaming issue). **Not done: static/ISR**, because the per-request CSP nonce (F68) rules it out (Next's own guide); needs an owner decision on a hash-based CSP for public pages. CI Lighthouse gate not ratcheted (LCP still above 2.5 s). Audit: `audit/f82-1-web.md`, `audit/runtime-f82-1-web.md` (0 issues); screenshots `screenshots/f82-1/`.
- **Batch 0 fixes, branch `design/batch-0-fixes`** (owner request 2026-10-05, first PR before Batch 1): (1) B2 silent guest session on first launch (`src/utils/guestSession.ts`, splash); (2) B5 web `/register` session probe quiet (200 `{authenticated:false}`), `/services` goes to Home; (3) `BrandMark` in `packages/ui-native`, `AuthKit` no longer imports `@expo/vector-icons`; (4) issue #286, shared JS: line icons drawn from their own regular outline (no icon library at runtime), illustrated artwork loaded on demand, direct module imports instead of the barrel, per-glyph fill exports for the route error boundary (now independent of the component set), web fill mirror limited to the glyphs named, `zod` out of the Search client chunk. Measured (Lighthouse, median of 3, production build): script transfer `/ar` 224 → 196 KB, `/ar/pharmacy` 225 → 178 KB, `/ar/consultations/doctors` 223 → 176 KB; median route first-load JS 688 → 517 KB raw, `/search` 941 → 588 KB. Still over the 170 KB budget on every route: what is left is the React/Next runtime (about 113 KB gz), the next-intl ICU parser (12 KB) and `web-mcp-provider` (3.4 KB), see Needs review. Runtime check (production build, normal/empty/error, all 15 Batch 0 web routes): 0 issues, 0 console errors; app endpoints with patient / guest / no session: 0 failures. `client-token-sync` 927 → 918, `no-raw-color` 8748 → 8739. Audit: `audit/batch-0-fixes.md`, `audit/runtime-batch-0-fixes-{web,app}.md`.
- **Batch 0, PR [#285](https://github.com/obaid08642-ops/new/pull/285)**: merged 2026-10-05 (`78af922f`) after the reviewer's `[REVIEW-FIX]` commits (X and Snapchat hidden until the backend verifies them; the date-dependent `slot-leave` spec). Detail kept here for the record.
  - **Per-batch audit (owner, 2026-10-05), inside #285:** element audits `audit/batch-0-web.md` (393 elements, 14 screens) and `audit/batch-0-app.md` (16 screens); runtime check `audit/runtime-batch-0-web.md` (15 routes x normal/empty/error, backend and web through `tools/design/fault-proxy.mjs`; 13 of 15 clean; `/register` logs the 401 of its own session probe and `/services` lands on `/consultations/doctors`, whose inline styles the CSP refuses; both are in Needs review) and `audit/runtime-batch-0-app.md` (every GET the app screens call, with patient / guest / no session; 0 failures); `WIRING_REPORT.md` now has 0 unresolved calls (was 160 web + 10 app), the 18 static web screens classified, a mock scan (0 hits in Batch 0) and **98 Needs review items** (`needs-review/*.json`, backend gaps reported and not fixed). Colours: route error/not-found rebuilt from the board state components (zero raw colours), `theme-color` generated from the tokens, no Batch 0 file left in the raw-colour baseline (8772 -> 8748), `client-token-sync` 928 -> 927.
  - **Sign-in family** (web and app): Welcome, Login, Register, email code, forgot and reset password, AuthWeb. The ten login-review defects are gone; the one-time-code login link is removed; tablet centred at 440. Social sign-in: app shows Apple (iOS only, official button), Google, X, Snapchat; web shows Google only (see Blockers).
  - **Onboarding** (web and app), **Home and Dashboard** (web), **Home, tab bar and Services** (app), **Search, Notifications, Notification settings** (web and app).
  - Plain-language sweep: 130 strings in each of 6 locales, plus hard-coded web and app strings.
  - Tokens: dark `text.link` `#D7FF00` → `#FF8A91` (a board colour; owner to confirm) and 12 new font sizes. Nothing else.
  - Quality gates added: `no-large-raster` (200 KB), Lighthouse tightened (see `QUALITY_STANDARDS.md`); the fetal-week images left the app.
  - Screenshots: `docs/design/screenshots/batch0-web/` and `batch0-app/{before,after,compare}/`.
  - Dropped from app Home because the HomeApp board has no place for them: "Core Health Services" cards, "Specialized Care Hub" pills, nutrition/vitals/mood metric cards (reachable through all services).

## Next (in this order)

1. F82: owner decision (2026-10-06) **option B**: hash-based CSP for public pages only (home, categories, product, doctor, articles) so they can be static/ISR and edge-cached; signed-in, checkout, payment and account pages keep the nonce CSP. The reviewer session implements the CSP change; the static/ISR rendering of the public pages (only public data in the cached HTML, nothing user-specific) is done on top of it, after the F82-1 PR (this one: Readex subset, narrowed and precompiled messages, WebMCP after idle, public data cache, below-the-fold deferral). Then F82-2 (navigation and prefetch, `design/f82-2-nav`), F82-3 (edge and repeat visit, ops), F82-4 (web-vitals beacon, p75), F82-5 (app).
2. Resolve the blockers below (backend social-login verification, fetal-week CDN and endpoint).
3. **Batch 1 (pharmacy flows)** on `design/batch-1` (started right after the fixes PR was opened; its own PR, screenshots and approval before Batch 2), then batches 2–13 in the order of `SCREEN_INVENTORY.md`. For each batch:
   - fix the `WIRING_REPORT.md` §4 rows that belong to it;
   - paste the `QUALITY_STANDARDS.md` checklist with measured numbers, and "Identity check: no new colours/logo/patterns" with the token diff;
   - send the owner screenshots at 390, 768 and 1440, in light and dark, and wait for approval before the next batch.
   - `globals.css` still has an old `.shell` layout. Pages switch to `AppShell` batch by batch (sign-in, Home, Dashboard, Search, Notifications already have); the old rules go when the last page moves.

## Owner decisions (2026-10-06, translation rule)
Same strictness as colours; full text in `QUALITY_STANDARDS.md` §8 and `AGENTS.md`. (1) No user-visible text in code: everything from `patient-web/messages/*.json` and `patient-app/src/i18n/locales/*.json`. (2) CI gates `no-literal-ui-string` (baseline **6752** literals in 486 files, only down) and `locale-parity` (baseline **681** problems: web English left in ur 101 / hi 116 / bn 106 / fil 210, app 36 keys missing in each of ur/hi/bn/tl + 4 English in tl; only down; `--base origin/main` requires every new key complete in six languages). (3) New keys in all six languages in the same PR, no Arabic/English fallback in the UI. (4) Layout survives every language (RTL ar/ur, LTR others, buttons grow with the text, locale-formatted numbers/dates/currency, mirrored directional icons). (5) Screenshots add en and ur (or hi) at 390. (6) Every PR states the literal baseline (old → new). Open work this creates: the app's `t()` still falls back to the Arabic source text (`src/i18n/index.ts`, phrase catalogue) and must become key-based with no fallback; 6752 existing literals are cleared batch by batch as screens are rebuilt.

## Owner decisions (2026-10-06, after Batch 0 merged)

1. **Test-mode seeders:** use them on the LOCAL test database only, never on staging or production; every screenshot that shows seeded data is labelled "test data" (file name suffix `-testdata`, and the PR text). Done once: `PharmacySeedService` (2 test pharmacies, 7 inventory items) and one draft pharmacy order for the seeded patient; the product catalog stays empty (the v14 catalog file is not available offline: reviewer item).
2. **Dark link `#FF8A91` approved** (token change of Batch 0).
3. **`/` and `/dashboard` show the `ErrorState` with retry when the backend fails** (not a silent hide). In the Batch 0 fixes work.
4. **Client-side defects from Needs review are fixed in the batch that owns the screen; backend items stay for the reviewer.** Batch 0's client-side items are being fixed in `design/batch-0-fixes` (#291).

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

## Found while working (fix in the batch named)

- **Batch 0, web `/login` in dark mode:** the card stays light while its text turns light, and the "continue as guest" button label is invisible. It is the same on main (see `docs/design/screenshots/font-web/before-ar-390-dark.png` on #260).
- **Dev only:** `next dev` rejects the inline theme script (`app/theme.ts`) under the CSP nonce, so the page ignores the stored or system theme. Screenshot scripts set `data-theme` themselves. Check whether production has the same problem when doing the web shell (step 4).

## Blockers

- **Web shared JS and LCP (issue #286, updated by `design/batch-0-fixes`):** Batch 0 had added a 47 KB gz shared chunk (the whole component library, 78 fill glyphs, six-weight Phosphor icons, illustration data) to every route, because the route error boundary imported the component barrel. Now trimmed (see In progress): `/ar` 224 → 196 KB, `/ar/pharmacy` 225 → 178 KB, `/ar/consultations/doctors` 223 → 176 KB (Lighthouse transfer, median of 3). Remaining over the 170 KB budget: React/Next runtime (~113 KB gz), next-intl ICU parser (12 KB), `web-mcp-provider` (3.4 KB, six languages of tool descriptions on every page). LCP (3.0-3.2 s on `/ar`, 4.3 s on `/ar/pharmacy`) did not move with bundle size; Lighthouse points at render-blocking CSS (three sheets, about 28 KB gz); F82 needs its own change. `node tools/design/js-size.mjs` reproduces the per-route numbers.
- **Import rule baseline (batch-0-fixes item 3):** `tools/design/import-rule.baseline.json` exists on `fix/audit-2026-09` only, not on main. AuthKit is clean now; when the rule reaches main run `node tools/design/import-rule.mjs --update` to drop its baseline line and its `exceptions` entry (listed in Needs review).
- **Token correction (owner to confirm in the Batch 0 PR token diff):** `color.text.link` dark was lime (`#D7FF00`), which no board uses; the boards draw links `#FF8A91` (Auth board dark; already the `text.price` dark value). Changed to `#FF8A91`; contrast check (4.5:1 on canvas and surface) passes.
- **CRITICAL, for the reviewer session (found 2026-10-05 while wiring social sign-in): `POST /auth/social-login` does not verify Apple, X or Snapchat tokens.** `backend/src/modules/auth/auth.service.ts`: `verifyAppleToken` base64-decodes the JWT payload without checking its signature, issuer or audience; `verifyXToken` and `verifySnapchatToken` do the same and, when the token is not a JWT, invent an email. The handler then runs `userModel.findOne({ email })` and signs a session for that user, so a forged token with `{"email":"victim@example.com"}` logs in as that user (any role). Only Google is verified (a call to Google's userinfo). Needed: Apple (verify against Apple's JWKS, `iss`, `aud`, `exp`), X and Snapchat (call the provider's "me" endpoint with the access token; neither returns an email by default, so account linking needs a decision), and never mint an account from a made-up address. Until then the app buttons call a flow that is unsafe on the server.
- **Web social sign-in (Batch 0 login review item 1):** the row is hidden except Google, and Google only when `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is set. Apple, X and Snapchat have no web sign-in flow yet and the backend does not verify their tokens (above), so no dead or unsafe buttons are drawn. Add them to `social-login-buttons.tsx` when both exist.
- **Fetal-week images (owner D).** Done: the 41 week images in `patient-app/assets/images/maternity/fetus/` (29 MB, 1080×1920 PNG/JPG; no code referenced them: `baby-development.tsx` only redirects) were converted to WebP at 390/780/1080 px wide (1x/2x/3x, q80, 2.8 MB for all three sizes, largest file 75 KB) in `cdn-source/maternity/fetus/` and deleted from the app. Not done, and why: (1) **upload to Cloudflare R2**: this session has no R2 credentials (the Cloudflare connector is not authorised); upload `cdn-source/maternity/fetus/*` to the bucket behind the CDN and give me the base URL. (2) **Backend week content** (`GET` of week → image URL, size/length/weight, text): `backend/src/modules/maternity` has no such endpoint (`GET /maternity/content` exists; check it covers this), so the **reviewer session** adds it; no mock data is used meanwhile. (3) The app screen that shows the images (with an `expo-image` disk cache and a placeholder) is built when the endpoint and URLs exist. App download size: no build was run here; the images were never referenced from code but `assetBundlePatterns` is `**/*`, so they were shipped, about 29 MB of the repo's 30 MB under `assets/images/maternity`.
- **Fonts:** `MaterialSymbolsRounded.ttf` (1.7 MB) is still used by 28 patient-app files; it goes when the last of them moves to the shared icons.

- **CI: the `lighthouse` job fails on every PR. This is for the reviewer.** It fails on Largest Contentful Paint for `/ar` (about 3.3 s) and `/ar/c` (about 4.9 s), against a 3000 ms limit. It fails the same way on #255, #257 and #259 to #265, including PRs that change no page. The five CI jobs that used to fail were fixed by the reviewer in #262.

- **Fixed by the reviewer in PR #257 (merged):** pharmacy submit (web `/cart/checkout`) and lab opt-in-cash (web `/diagnostics/insurance-approval`). Re-run `node tools/design/screen-inventory.mjs` at the start of Batch 0.
- **Endpoints the reviewer session will add.** Do not add backend endpoints or mock data for these. Until the endpoints exist, the screen hides that part or shows a "غير متاح حالياً" (not available right now) state:
  - Batch 1, web `/payments/result`: `GET /payments/status/:ref`.
  - Batch 7, web `/insurance/claims`: `GET /insurance/claims/my`. The backend serves `GET /insurance/claims`.
  - Batch 8, web `/nutrition/plan`: `GET /nutrition/plan`.
- **Doctor fields pending in the backend:** `scfhs_license_no`, `years_experience`, `qualifications[]` (see Owner decisions).

## Session log

| Date | Branch | What happened | Tip |
|---|---|---|---|
| 2026-10-05 | `design/f82-1-web` | F82-1 web rendering path: messages narrowed, precompiled messages, WebMCP lazy, font subset, public data cache, content-visibility. Static/ISR blocked by the CSP nonce. | [PR #297](https://github.com/obaid08642-ops/new/pull/297) |
| 2026-10-05 | `design/batch-0` | Batch 0: sign-in family, onboarding, Home, Dashboard, Search, Services, Notifications (web and app); quality standards and gates; fetal images off the app; links token. | PR [#285](https://github.com/obaid08642-ops/new/pull/285) |
| 2026-10-05 | `design/components-csp` | Components styled by class (CSP, F68). | PR [#271](https://github.com/obaid08642-ops/new/pull/271) |
| 2026-10-05 | `design/lint-gates` | Lint gates no-100vh, no-rn-safeareaview, no-left-right, with the SafeAreaView and 100dvh fixes. | PR [#269](https://github.com/obaid08642-ops/new/pull/269), tip `c2f4d95` |
| 2026-10-05 | `design/components-cards`, `design/components-states` | Components 3/4 (cards) and 4/4 (states, main tab bar), with board images; main (#263, #264) merged into the 2/4–4/4 stack. | PR [#267](https://github.com/obaid08642-ops/new/pull/267) `664e27b`, PR [#268](https://github.com/obaid08642-ops/new/pull/268) `8a4c313` |
| 2026-10-05 | `design/components-controls` | Components 2/4 (the controls) on web and native, with 19 web and 10 native board side-by-side images. CodeQL path fix on #263 and #264. | PR [#265](https://github.com/obaid08642-ops/new/pull/265), tip `27d336d` |
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
