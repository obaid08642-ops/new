# Design rebuild — PROGRESS

> **Session protocol (owner instruction, 2026-10-04)**
> - **Start of every session:** read this file, then `SCREEN_INVENTORY.md` and `WIRING_REPORT.md`, and continue from **Next**.
> - **After every PR:** update this file (Done / In progress / Next / Blockers, with the PR link) and `screen-status.json`, then re-run `node tools/design/screen-inventory.mjs`.
> - **When context runs low:** commit, push, update this file with the exact stopping point, push again, and stop.
>
> Sources: `DESIGN_HANDOFF_FINAL.md`, `SPEC_PRODUCT_DOCTOR_DETAIL.md`, `DEVICE_STANDARD.md`, `canvas/`. How the folder works: `README.md`.

_Last updated: 2026-10-04 (owner decisions recorded; next step: tokens on `design/tokens`)._

## Snapshot

| Area | State | Notes |
|---|---|---|
| Workflow, inventory, wiring report | **Done** ([#256](https://github.com/obaid08642-ops/new/pull/256)) | `PROGRESS.md`, `SCREEN_INVENTORY.md`, `WIRING_REPORT.md`, `screen-status.json`, `tools/design/screen-inventory.mjs` |
| Design sources in the repo | **Done** ([#256](https://github.com/obaid08642-ops/new/pull/256)) | Handoff, spec, device standard and 40 boards in `canvas/` |
| Foundation: tokens, font, shells, shared components, lint gates | Not started | See `WIRING_REPORT.md` §1 for the measured gaps |
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

Nothing.

## Next (in this order)

The foundation comes before any screen (DEVICE_STANDARD §4, handoff §3). Each step is its own PR on its own `design/<step>` branch from `main`, with screenshots before and after.

1. **Tokens** (`packages/design-tokens`):
   - Add `color.service.<tone>.{fg,bg,fgDark,bgDark}` for the 10 tones, copied exactly from `canvas/FIcon.dc.html`.
   - Check the canvas, card, text, action and coral values against handoff §1.
   - Regenerate the token outputs with the repo's existing sync scripts (`tools/design/sync-token-css.mjs`, `sync-client-tokens.mjs`).
2. **Font on patient-web:** replace Tajawal (`app/[locale]/layout.tsx`, `globals.css`) with Readex Pro, self-hosted through `next/font/local`, with Noto fallbacks for ur/hi/bn. patient-app already loads Readex Pro.
3. **Native shells** (`packages/ui-native`): `Screen`, `AppHeader`, `StickyFooter`, `TabBar`, built on `react-native-safe-area-context`, as in DEVICE_STANDARD §1.
4. **Web shells** (`packages/ui`): `AppShell` (using `100dvh`) and `StickyFooter`, as in DEVICE_STANDARD §1.
5. **Shared components** (handoff §3), in both packages. Still missing: FIcon, ListRow, SectionHeader, Segmented, StatusChip, Toggle, Radio, PrimaryButton, OutlineButton, SearchField, StickyFooter, TabBar, DoctorCard, ProductCard, OfferCard, Timeline, ProgressRing, OfflineState.
6. **Lint gates** still missing from `tools/design` (handoff §6, DEVICE_STANDARD §5): `no-left-right`, `no-100vh`, `no-rn-safeareaview`. They currently fail on:
   - `patient-app/app/room/[id].tsx` (`SafeAreaView` imported from `react-native`);
   - 4 web files that use `100vh` (listed in `WIRING_REPORT.md` §1).
7. **Batch 0**, then batches 1–13 in the order of `SCREEN_INVENTORY.md`. For each batch:
   - fix the `WIRING_REPORT.md` §4 rows that belong to it;
   - send the owner screenshots at 390, 768 and 1440, in light and dark;
   - wait for approval before starting the next batch (handoff §4).

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

## Blockers

- **Fixed by the reviewer in PR #257:** pharmacy submit (web `/cart/checkout`) and lab opt-in-cash (web `/diagnostics/insurance-approval`). Pull `main` after #257 merges and re-run `node tools/design/screen-inventory.mjs`.
- **Endpoints the reviewer session will add.** Do not add backend endpoints or mock data for these. Until the endpoints exist, the screen hides that part or shows a "غير متاح حالياً" (not available right now) state:
  - Batch 1, web `/payments/result`: `GET /payments/status/:ref`.
  - Batch 7, web `/insurance/claims`: `GET /insurance/claims/my`. The backend serves `GET /insurance/claims`.
  - Batch 8, web `/nutrition/plan`: `GET /nutrition/plan`.
- **Doctor fields pending in the backend:** `scfhs_license_no`, `years_experience`, `qualifications[]` (see Owner decisions).

## Session log

| Date | Branch | What happened | Tip |
|---|---|---|---|
| 2026-10-04 | `claude/progress-md-workflow-vqhj8x` | Set up the workflow, imported the design sources, and generated the inventory and the wiring report. | PR [#256](https://github.com/obaid08642-ops/new/pull/256) |
| 2026-10-04 | `claude/progress-md-workflow-vqhj8x` | Recorded the owner decisions (branches, one call product, doctor fields, screens without a board, endpoints to hide). Imported the updated `DoctorFull` board. | PR [#256](https://github.com/obaid08642-ops/new/pull/256) |
