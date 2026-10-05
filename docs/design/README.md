# Design rebuild — start here

This folder holds everything a design-rebuild session needs: the design sources, the screen inventory, the API wiring report and the running progress log. It covers the rebuild of patient-app and patient-web described in `DESIGN_HANDOFF_FINAL.md`.

## Every session starts here

1. Read **`PROGRESS.md`**. It says what is done, what is in progress, what comes next and what is blocked.
2. Read **`SCREEN_INVENTORY.md`**: every route in patient-app and patient-web, with its template, closest board, batch, the endpoints it calls and its rebuild status.
3. Read **`WIRING_REPORT.md`**: the design-foundation status, the backend fields the detail specs need, and every endpoint a screen calls that the backend does not serve.
4. Continue from the **Next** section of `PROGRESS.md`. Do not start something else.

## While working

- **After every PR:** update `PROGRESS.md` (Done / In progress / Next / Blockers, with the PR link), update `screen-status.json` for each screen the PR rebuilt, and re-run `node tools/design/screen-inventory.mjs` so the inventory and the wiring report match the code.
- **When context runs low:** commit, push, update `PROGRESS.md` (say exactly where you stopped and what the next step is), push again, and stop.
- **Every batch PR also carries the audit of `QUALITY_STANDARDS.md` §7:** element audit, mock/placeholder section, runtime check, 0 unresolved calls, Needs review entries, strict token-only colours with a lower `client-token-sync` baseline (state the number in the PR). Same PR, not a separate pass.
- Real API data only. If a field does not exist, hide the element (handoff §1, spec rule). Never invent values, ratings, counts or prices.

## Files

| File | What it is | Edited by |
|---|---|---|
| `DESIGN_HANDOFF_FINAL.md` | The design brief. With the boards, it is the only design source. Where it conflicts with `/DESIGN.md`, this file wins. | Owner / design session |
| `SPEC_PRODUCT_DOCTOR_DETAIL.md` | Field → UI mapping for the product and doctor pages | Owner / design session |
| `DEVICE_STANDARD.md` | Device, safe-area, breakpoint and lint rules for every screen | Owner / design session |
| `canvas/*.dc.html` | The boards (see below) | Design session |
| `PROGRESS.md` | Running log: done, in progress, next, blockers, PR links | Every session, after every PR |
| `screen-status.json` | Per-screen rebuild status, keyed `"<app> <route>"` (or `"<app> <file>"` when two files share a route) | Every rebuild PR |
| `SCREEN_INVENTORY.md` | Generated. Do not edit by hand. | `tools/design/screen-inventory.mjs` |
| `WIRING_REPORT.md` | Generated. Do not edit by hand. | `tools/design/screen-inventory.mjs` |
| `inventory/screens.json` | Generated. The same data, machine-readable, with every endpoint per route. | `tools/design/screen-inventory.mjs` |
| `inventory/manual-calls.json` | `{"file:line": {"method", "path", "note"}}`: resolves an API call the tool cannot read from the code (a path built from variables). `--check` fails when an entry no longer sits on an unresolved call site. Empty while the tool resolves every site. | Any session, only when the tool reports an unresolved call |
| `inventory/static-screens.json` | Verdict per web screen that calls no API (static by design, pointer page, suspicious), with the reason; rendered in `WIRING_REPORT.md` section 5b. | Whoever changes such a screen |
| `needs-review/*.json` | Findings an agent cannot settle from client code, one file per session (format in `needs-review/README.md`); rendered in `WIRING_REPORT.md` section 7 and counted in its header. The reviewer session verifies them and fixes backend gaps. | Every session, own file |
| `audit/*.md` | Per-screen element audits (`batch-0-web.md`, `batch-0-app.md`, ...): every element against its board and its data source. | The audit sessions |

## Regenerating the inventory and the wiring report

```bash
node tools/design/screen-inventory.mjs           # rewrites SCREEN_INVENTORY.md, WIRING_REPORT.md, inventory/screens.json
node tools/design/screen-inventory.mjs --check   # exit 1 when the committed files are stale
```

The script needs the `typescript` package: it loads it from `backend/`, `patient-web/` or `patient-app/` `node_modules`, or from `NODE_PATH`. It also runs `tools/audit/routes.py` (python3) for the backend route list.

What it does, briefly:
- It lists the routes from the file system (expo-router files in `patient-app/app`, Next pages in `patient-web/app/[locale]`).
- It follows each route's imports symbol by symbol, and collects the API calls it reaches (`apiFetch`, `callPatientApi`, `fetch`, `http.get`, … with a literal or template URL).
- It checks every call against the backend controllers. On the web it also checks the BFF route handlers in `patient-web/app/api` and the `/api/patient/*` proxy allowlist.

Its limits are written at the top of the script and in the report.

Beyond the endpoint check, the report also holds (see its header): how every call built from variables was resolved (3b), the web screens that call no API with a verdict each (5b), a heuristic scan for mock data and dead controls (6, from `tools/design/mock-scan.mjs`: sample on real hits before adding a pattern, precision over volume) and the merged Needs review list (7). **Every batch must leave sections 6 and 7 clean or explained for the screens it rebuilt**: a dead button, a made-up number or a timer that fakes a success is fixed or hidden, never shipped.

## Boards

The boards from `nabd-design-boards.zip` (2026-10-04) are in `canvas/`. How to read them is in handoff §0.

The zip does not ship the `support.js` runtime the boards load, so `canvas/support.js` implements the parts they use (`x-dc`, `{{…}}`, `sc-for`, `sc-if`, `dc-import`, `helmet`). To open a board, serve the folder over HTTP (`cd docs/design/canvas && python3 -m http.server`), then go to e.g. `HomeApp.dc.html` or `HomeApp.dc.html?theme=dark`. `node packages/ui/build-compare.mjs --boards docs/design/canvas` uses it to cut board elements out and put them next to the real components (`docs/design/compare/`).

| Batch 1 boards | Batch 2 boards (templates) |
|---|---|
| Main, Auth (Welcome, WelcomeDark, Login, LoginDark, Otp, Register), HomeApp, HomeAppDark, Search, SearchWeb, ServiceHub, Consult, ProductFull, ProductWeb, DoctorFull, AuthWeb, IconGallery; components FIcon, PIcon | PharmacyHub, Cart, PharmacyOffers, CheckoutV2, OrderTracking, Orders, RxUpload, Appointments, BookingConfirm, HealthHub, Family, Insurance, Account, Settings, Notifications, CareHub, States, HomeWeb |

The older boards in `canvas/` (Home, HomeDark, Product, Checkout, Booking, Doctor, Success, WebHome, System, Palette, IconSet, Icon, and the logo studies PulsePlus, HeartPlus, NoonPulse) came before the final handoff. Existing code comments and `packages/design-tokens/tokens.json` still point to them, so they stay in the folder, but **the handoff boards above replace them**. `Main.dc.html` (the logo) is the same file in both sets.
