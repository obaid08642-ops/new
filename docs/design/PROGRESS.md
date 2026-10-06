# Design rebuild — PROGRESS

> **Session start (owner, 2026-10-06): read only this file's "Next", then grep `SCREEN_INVENTORY.md` and `WIRING_REPORT.md` for the routes of the current batch. Do not read those two files in full.** History: `PROGRESS_ARCHIVE.md` (do not read at session start). Rules: `/AGENTS.md`, `QUALITY_STANDARDS.md`, `README.md`.
> After every PR: update this file (keep it under 8 KB) and `screen-status.json`. Context low: commit, push, update this file, stop.

_Updated 2026-10-06._

## State

| Item | State |
|---|---|
| Foundation (tokens, Readex Pro, shells, 40 components, lint gates, CSP by class) | Merged |
| Batch 0 (29 screens) + fixes | Merged (#285, #291, #292) |
| Batch 2 consultations (46 screens), PR [#313](https://github.com/obaid08642-ops/new/pull/313) | **Merged into main.** Backend Needs-review lines are OpenCode queue items Q-14..Q-20; hub "Nearest"/"Available now" = Q-12/Q-13 (`docs/review/OPENCODE_QUEUE.md`): **keep `EXPO_PUBLIC_CONSULT_NEARBY_FILTERS` off until the owner says Q-12/Q-13 are live**. Batch 2 client-only Needs-review items: branch `design/batch-2-client-fixes` (in progress) |
| **Batch 3 labs, radiology**, `design/batch-3` (main merged in) | 39 screens (17 app + 22 web) rebuilt; web runtime check 63 runs / 0 issues, app endpoints 21 routes / 0 failures; PR to main |
| **Batch 1 pharmacy**, `design/batch-1`, draft PR [#293](https://github.com/obaid08642-ops/new/pull/293) | **Complete and ready for review** (all slices 1a-1e + local-first cart; batch-end build, runtime check 129 runs / 2 known flags, Lighthouse done). Baselines: literals 5234, raw colour 7273, left/right 476, client-token-sync 897, parity 663 |
| F82-3 static/ISR for public pages, [#308](https://github.com/obaid08642-ops/new/pull/308) | Open (PR to main): pages cached, per-user parts on the client; LCP unchanged (JS-bound), `.lighthouserc.json` not ratcheted; finding: nonce server serves uncompressed |
| F82-1 [#297](https://github.com/obaid08642-ops/new/pull/297), F82-2 [#295](https://github.com/obaid08642-ops/new/pull/295), F68 CSP [#301](https://github.com/obaid08642-ops/new/pull/301) | Merged into main (and into `design/batch-1`). Merged into main and into `design/batch-1` |
| Gates (baselines only go down) | `no-literal-ui-string` 3891, `no-raw-color` 5562, `no-left-right` 267, `client-token-sync` 889, `locale-parity` 663 |

Screens per batch (app / web, redirects excluded): 0: 15/14 **done**; 1 pharmacy: 23/34 (done: app 23, web 34 = all); 2 consultations 22/24; 3 labs 17/22; 4 nursing 7/9; 5 records 26/24; 6 family 10/10; 7 insurance 10/13; 8 maternity etc. 11/21; 9 AI 7/10; 10 community 5/5; 11 loyalty 7/7; 12 account 20/20; 13 web-only 3/14.

## Next

1. Batch 1 (#293) is ready for review. When it merges: Batch 2 (consultations and video, high effort for calls) on its own `design/batch-2` from `main`. Open items for the reviewer: nonce-server drops compression (CI Lighthouse sees uncompressed bytes), merge #303 (committed node_modules symlinks).
2. **Owner 2026-10-06, cart is local-first (Batch 1):** add/remove/change without the backend (web localStorage per user or guest; app persisted per owner), only "send the order" calls the backend (failure: clear error, cart unchanged), no prices or stock in the cart, clear on sign-out, merge guest cart into the account on sign-in; tests incl. backend-down (task file for the agent: scratchpad `task-cart-local.md`; branch `wip-b1-cart`).
3. **F82-3 static/ISR** (owner: on top of #301; public routes only, no cookies/headers in them, per-user parts on the client, LCP per route before/after, ratchet `.lighthouserc.json` LCP 2.5 → 1.8 s when met). Decision #302: public pages serve the last good copy during an outage, ErrorState only with no cached copy, no cap.
4. Per-route client messages: Batch 1 adds ~36 KB of pharmacy namespaces to `CLIENT_NAMESPACES` (shipped on every page); move them to a pharmacy route-group provider.

3. **Owner decisions 2026-10-06** (`docs/product/OWNER_DECISIONS_2026-10-06.md`, issues #320-#342): merge map for health/family/settings/AI/mental health is PR [#345](https://github.com/obaid08642-ops/new/pull/345) (`docs/design/MERGE_MAP.md`): **do not merge/delete/redirect those screens and do not start Batch 5/6 slices until the owner approves it**. Removed features (1-4, 8, 14) are never rebuilt. UI parts of 3, 10, 11, 17, 18 go in the batch that owns the screen; the Rx / online-only badges and the "استشر طبيب" cart button go into the pharmacy templates when the reviewer's backend part lands.

## Process (owner, 2026-10-06; quality rules unchanged, recording changed)
- **Lean v2 (Batch 2 on): under 40k tokens per screen.** Design only (wrong logic = one Needs-review line); templates first; no backend reading per screen; one translation pass per slice; read only screen, board, template; slices of 15-25 screens. Rules in `/AGENTS.md`.
- **No screenshots committed or sent.** A temporary screenshot only to compare with the board while building, then delete it. No before/after/compare images.
- **One production build and one runtime check per slice, at the end**; dev server while building. Lighthouse only in F82 PRs and once per batch.
- **Audit is generated, short:** `node tools/design/audit-table.mjs` from a compact `audit/<slice>.json` (route, element, source, status); notes one line each, only for problems. Needs-review: one line each.
- **Fix only what the screen being rebuilt needs.** Other old bugs: one line in Needs review.
- **At most 2 agents at a time**, each given only its screen list and the board (not the full docs). Sonnet 5 medium for normal screens; high only for payment, offers, booking, insurance, calls.
- **Report tokens used and screens finished per slice** (table below).
- Binding rules, unchanged: identity fixed (no new colour/logo/pattern; "Identity check" line in every PR); tokens-only colours (zero raw in touched files); translation rule (no UI text in code, six languages, no fallback, layout survives RTL/LTR); real data only; backend gaps reported not fixed; test seeders on the local test DB only.

## Slice log (tokens are the agents' reported totals, approximate; one agent per app/web)

| Slice | Screens finished | Tokens | Notes |
|---|---|---|---|
| 1a pharmacy browse/product | app 5, web 9 | 700k / 644k | |
| 1b cart, prescription | app 6, web 9 | 439k / 736k | web includes an API cut-off and resume |
| 1c offers (high) | app 2 (+1 redirect), web 6 | 514k / 607k | no live offer seedable locally |
| 1d checkout, payment (high) | app 5, web 5 (+redirects) | 582k / 673k | lean process; no gateway key/replica set locally |
| 2 consultations (lean v2) | app 22, web 24 | 585k / 470k (**26.6k / 19.6k per screen**, target 40k) | templates built once (`consult/` kits), mechanical conversion, one translation pass: 418 app keys, 145 web keys |
| 3 labs, radiology (lean v2 + visual check) | app 17, web 22 | 492k / 565k (**29k / 26k per screen**) | `DiagKit` (app) and `components-next/diagnostics` (web) on the Batch 2 kits |
| 1e orders, tracking | app 5, web 5 | 439k / 473k | first slices under the lean process: fewer tokens per screen than 1a/1b |

## Open blockers (details in `PROGRESS_ARCHIVE.md` and the Needs-review JSON)
- **Public product catalogue is empty** on the seeded backend (v14 import is the reviewer's): product/category screens are checked with injected TEST data only.
- **Backend gaps** found in Batches 1-3 are in `needs-review/*.json` and the OpenCode queue (`docs/review/OPENCODE_QUEUE.md`); the reviewer owns them.
- **Endpoints the reviewer will add:** `GET /payments/status/:ref`, `GET /insurance/claims/my` (batch 7), `GET /nutrition/plan` (batch 8), doctor fields; hide the part, never invent data.
- **Fetal-week images (owner D):** converted to WebP in `cdn-source/`; upload to the CDN and the week endpoint are pending (archive).
- **Import-rule baseline:** `tools/design/import-rule.baseline.json` is on `fix/audit-2026-09` only; drop its AuthKit line when the rule reaches main.
- **Owner questions open:** intro/language/permissions screens before Welcome? Which roles may hold a patient session? Chat entry points with no order; compare picker; camera barcode on web; where the insurance choice belongs; native review of ur/hi/bn/tl wording.
