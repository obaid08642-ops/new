# Design rebuild — PROGRESS

> **Session protocol (owner instruction, 2026-10-04)**
> - **Start of every session:** read this file, then `SCREEN_INVENTORY.md` and `WIRING_REPORT.md`, and continue from **Next**.
> - **After every PR:** update this file (Done / In progress / Next / Blockers, with the PR link) and `screen-status.json`, then re-run `node tools/design/screen-inventory.mjs`.
> - **When context runs low:** commit, push, update this file with the exact stopping point, push again, and stop.
>
> Sources: `DESIGN_HANDOFF_FINAL.md`, `SPEC_PRODUCT_DOCTOR_DETAIL.md`, `DEVICE_STANDARD.md`, `canvas/`. How the folder works: `README.md`.

_Last updated: 2026-10-04, by the session that set up this workflow (branch `claude/progress-md-workflow-vqhj8x`)._

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

The foundation comes before any screen (DEVICE_STANDARD §4, handoff §3). Plan one PR per package.

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

## Blockers and owner decisions

- **Backend fields missing for the doctor page** (`WIRING_REPORT.md` §2): `years_experience`, `scfhs_license_no`, `qualifications[]`, `voice_consultation_fee`. These UI rows stay hidden until the owner decides. Never invent values.
- **Endpoints that are not wired.** These were found by the script and each one was checked by hand in the code. Fix each in its batch:
  - Batch 1, web `/cart/checkout`: the broadcast submit posts to `/api/patient/pharmacy/orders/:id/submit`. The proxy allowlist and the backend only serve `/patient/pharmacy/orders/:id/submit`, so the second step of web checkout gets a 404.
  - Batch 1, web `/payments/result`: `GET /payments/status/:ref` has no backend route.
  - Batch 3, web `/diagnostics/insurance-approval`: `PATCH /labs/bookings/:id/items/:itemId/opt-in-cash`. The backend route exists (`labs.controller.ts:74`), but the proxy allowlist only has the `/orders/...` form, so the call gets a 404.
  - Batch 7, web `/insurance/claims`: `GET /insurance/claims/my` has no backend route. The backend serves `GET /insurance/claims`.
  - Batch 8, web `/nutrition/plan`: `GET /nutrition/plan` has no backend route.
- **No board exists for these screen kinds.** The owner or a design session needs to supply a board, or approve a template:
  - chat (11 routes);
  - video and voice call (7);
  - emergency (7);
  - map and location picker (3).

  The routes are listed in `SCREEN_INVENTORY.md` with board `none: <kind>`.
- **Branch for design PRs:** `/AGENTS.md` sends implementation work to `fix/audit-2026-09`, which is the audit stream. This workflow PR went to the branch assigned to its session. The owner needs to confirm which branch future design PRs should target.

## Session log

| Date | Branch | What happened | Tip |
|---|---|---|---|
| 2026-10-04 | `claude/progress-md-workflow-vqhj8x` | Set up the workflow, imported the design sources, and generated the inventory and the wiring report. | PR [#256](https://github.com/obaid08642-ops/new/pull/256) |
