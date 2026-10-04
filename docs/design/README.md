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

## Boards

The boards from `nabd-design-boards.zip` (2026-10-04) are in `canvas/`. How to read them is in handoff §0.

| Batch 1 boards | Batch 2 boards (templates) |
|---|---|
| Main, Auth (Welcome, WelcomeDark, Login, LoginDark, Otp, Register), HomeApp, HomeAppDark, Search, SearchWeb, ServiceHub, Consult, ProductFull, ProductWeb, DoctorFull, AuthWeb, IconGallery; components FIcon, PIcon | PharmacyHub, Cart, PharmacyOffers, CheckoutV2, OrderTracking, Orders, RxUpload, Appointments, BookingConfirm, HealthHub, Family, Insurance, Account, Settings, Notifications, CareHub, States, HomeWeb |

The older boards in `canvas/` (Home, HomeDark, Product, Checkout, Booking, Doctor, Success, WebHome, System, Palette, IconSet, Icon, and the logo studies PulsePlus, HeartPlus, NoonPulse) came before the final handoff. Existing code comments and `packages/design-tokens/tokens.json` still point to them, so they stay in the folder, but **the handoff boards above replace them**. `Main.dc.html` (the logo) is the same file in both sets.
