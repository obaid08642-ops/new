# Design rebuild — PROGRESS

> **Session protocol (owner instruction, 2026-10-04)**
> - **Start of every session:** read this file, then `SCREEN_INVENTORY.md` and `WIRING_REPORT.md`, and continue from **Next**.
> - **After every PR:** update this file (Done / In progress / Next / Blockers, with the PR link) and `screen-status.json`, then re-run `node tools/design/screen-inventory.mjs`.
> - **When context runs low:** commit, push, update this file with the exact stopping point, push again, and stop.
>
> Sources: `DESIGN_HANDOFF_FINAL.md`, `SPEC_PRODUCT_DOCTOR_DETAIL.md`, `DEVICE_STANDARD.md`, `canvas/`. How the folder works: `README.md`.

_Last updated: 2026-10-05 (components 2/4–4/4 in review as #265, #267, #268; lint gates in review as #269; next: Batch 0)._

## Snapshot

| Area | State | Notes |
|---|---|---|
| Workflow, inventory, wiring report | **Merged** ([#256](https://github.com/obaid08642-ops/new/pull/256)) | `PROGRESS.md`, `SCREEN_INVENTORY.md`, `WIRING_REPORT.md`, `screen-status.json`, `tools/design/screen-inventory.mjs`, `canvas/support.js` |
| Design sources in the repo | **Merged** ([#256](https://github.com/obaid08642-ops/new/pull/256)) | Handoff, spec, device standard and 40 boards in `canvas/` |
| Foundation: tokens | **Merged** ([#259](https://github.com/obaid08642-ops/new/pull/259)) | Service tones and service map, solid chip correction |
| Foundation: Readex Pro on the web | **Merged** ([#260](https://github.com/obaid08642-ops/new/pull/260)) | Self-hosted with `next/font/local` |
| Foundation: native shells | **Merged** ([#261](https://github.com/obaid08642-ops/new/pull/261)) | `Screen`, `AppHeader`, `StickyFooter`, `TabBar` in `packages/ui-native` |
| Foundation: web shells | **Merged** ([#263](https://github.com/obaid08642-ops/new/pull/263)) | `AppShell`, `StickyFooter` in `packages/ui`, mirrored into patient-web |
| Foundation: shared components | **1/4 merged ([#264](https://github.com/obaid08642-ops/new/pull/264)); 2/4–4/4 in review ([#265](https://github.com/obaid08642-ops/new/pull/265), [#267](https://github.com/obaid08642-ops/new/pull/267), [#268](https://github.com/obaid08642-ops/new/pull/268))** | 40 contract components on web and native, each with board side-by-side images |
| Foundation: lint gates | **In review** ([#269](https://github.com/obaid08642-ops/new/pull/269)) | `no-100vh` (strict), `no-rn-safeareaview` (strict, plus a `Dimensions.get` ratchet), `no-left-right` (ratchet, 548 recorded) |
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

## In progress

- **Components 2/4, PR [#265](https://github.com/obaid08642-ops/new/pull/265)** (branch `design/components-controls`, stacked on #264), waiting for review.
  - **Tokens:**
    - colours `color.control.{segmentedTrack, switchOn, switchKnob, radioOff}`;
    - `shadow.button` themed;
    - new `shadow.segmented` and `shadow.knob`.
    - 161 contrast checks pass.
  - **Button:** the gradient primary, the new `outline` variant, sizes 56/44/40 with a 44 hit area, and fill-set icons.
  - **IconButton:** outlined (the board header button), filled ink, glass, and the 52 square filter.
  - **New components:** Segmented, Toggle, Radio and StatusChip. The roster goes from 30 to 34.
  - **Restyled:** Chip as the Search filter chip, Search as the `inline` and `page` field, Stepper as the Cart pill.
  - **Side-by-side images:** 19 web and 10 native, the native ones from `compare-native.mjs`, which now renders contract components too.
  - **Test change:** the native touch-target test measures drawn height plus hitSlop. The PR flags this change.
  - **Open questions for the design session (listed in #265):**
    - the off switch track and the empty radio ring are below 3:1 (board values);
    - the Toggle "on" side in LTR;
    - the StatusChip ink compared with the Orders board.
- **Components 3/4, PR [#267](https://github.com/obaid08642-ops/new/pull/267)** (branch `design/components-cards`, stacked on #265), waiting for review.
  - **Tokens:** `color.bg.media`, `color.text.price`, `color.presence.online`, `shadow.feature`. `icon.ratingStarOnBrand` is ink in dark, because the yellow star was 1.6:1 on the dark coral. 171 contrast checks pass.
  - **Card** holds children and has `tint` (the hero wash).
  - **DoctorCard** (Consult): the real photo or the neutral mark; every optional field is hidden when absent.
  - **ProductCard** (PharmacyHub), **OfferCard** (HomeApp), **Timeline** (OrderTracking), **ProgressRing** (CareHub).
  - Roster 34 → 39. 7 web and 4 native board images.
  - **Flagged in the PR:**
    - the ProgressRing track is the tone's soft colour, not the board's `#FBD9E8`;
    - native can't draw the elliptical photo shape exactly.
  - The pharmacy broadcast-offer card (PharmacyOffers) is built with Batch 1.
- **Components 4/4, PR [#268](https://github.com/obaid08642-ops/new/pull/268)** (branch `design/components-states`, stacked on #267), waiting for review.
  - **States** (States board): EmptyState, ErrorState and the new OfflineState. They share one layout: a 112 FIcon, the title, the body and a full-width CTA. 404 is an EmptyState.
    - The handoff FIcon replaces the 12.A6 illustration; the PR flags this.
  - **BottomTabBar** exactly as HomeApp (glass pill, ink active pill, raised coral centre):
    - items carry fill glyphs;
    - native renders the shell TabBar from #261.
  - Roster 39 → 40.
- **Lint gates, PR [#269](https://github.com/obaid08642-ops/new/pull/269)** (branch `design/lint-gates`, from main), waiting for review.
  - `tools/design/no-100vh.ts`, strict: patient-web, admin, packages/ui.
  - `tools/design/no-rn-safeareaview.ts`, strict for `SafeAreaView` from `react-native`. `Dimensions.get` is a ratchet with 41 recorded.
  - `tools/design/no-left-right.ts`, a ratchet: 548 physical left/right recorded in 121 files, across all clients and both packages.
  - All three ignore comments and test files, are wired into `npm test` and CI, and each was proven to catch a probe.
  - **Fixes:**
    - SafeAreaView now comes from safe-area-context in patient-app `room/[id]` and in provider-app `SuccessScreen` and `SignatureCanvasModal`.
    - `100dvh` replaces `100vh` in the 4 patient-web files and admin's `AdminGuard`.
  - `screen-inventory.mjs` matches code only for the 100vh and SafeAreaView rows.
  - On a scratch merge with the component stack, the gates found one symmetric `hitSlop` in the native ProductCard. It is fixed on #267.

## Next (in this order)

The foundation comes before any screen (DEVICE_STANDARD §4, handoff §3). Each step is its own PR on its own `design/<step>` branch, with board side-by-side images (web: `node packages/ui/build-compare.mjs`; native: `node tools/design/compare-native.mjs`), gallery screenshots before and after, and a review.

1. **Shared components** (handoff §3), in both packages, through the contract (`packages/ui/components/contract.ts`):
   - ~~1/4~~ (#264, merged), ~~2/4~~ (#265), ~~3/4~~ (#267), ~~4/4~~ (#268). All are built; three are in review.
   - Whenever tokens change, re-run `node packages/ui/build-preview.mjs`.
2. ~~**Lint gates**~~: #269 is in review.
3. **Batch 0 (next, branch `design/batch-0`, stacked on #268 and #269)**, then batches 1–13 in the order of `SCREEN_INVENTORY.md`. For each batch:
   - fix the `WIRING_REPORT.md` §4 rows that belong to it;
   - send the owner screenshots at 390, 768 and 1440, in light and dark;
   - wait for approval before starting the next batch (handoff §4).
   - `globals.css` still has its own `--nabd-layout-max: 1180px` and an old `.shell` layout. Pages switch to `AppShell` batch by batch, and the old `.shell` rules are removed when the last page moves.

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
