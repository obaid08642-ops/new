# Design rebuild — PROGRESS

> **Session start (owner, 2026-10-06): read only this file's "Next", then grep `SCREEN_INVENTORY.md` and `WIRING_REPORT.md` for the routes of the current batch. Do not read those two files in full.** History: `PROGRESS_ARCHIVE.md` (do not read at session start). Rules: `/AGENTS.md`, `QUALITY_STANDARDS.md`, `README.md`.
> After every PR: update this file (keep it under 8 KB) and `screen-status.json`. Context low: commit, push, update this file, stop.

_Updated 2026-10-06._

## State

| Item | State |
|---|---|
| Foundation (tokens, Readex Pro, shells, 40 components, lint gates, CSP by class) | Merged |
| Batch 0 (29 screens) + fixes | Merged (#285, #291, #292) |
| **Batch 1 pharmacy**, `design/batch-1`, draft PR [#293](https://github.com/obaid08642-ops/new/pull/293) | 1a, 1b, 1c merged into the branch (app + web); **1d (checkout, payment) in progress**, 1e (orders, tracking) next |
| F82-1 web rendering, [#297](https://github.com/obaid08642-ops/new/pull/297) | Open. Static/ISR waits for the reviewer's hash-based CSP (owner: option B) |
| F82-2 navigation, [#295](https://github.com/obaid08642-ops/new/pull/295) | Open |
| Gates (baselines only go down) | `no-literal-ui-string` 5740, `no-raw-color` 7792, `no-left-right` 485, `client-token-sync` 916, `locale-parity` 667 |

Screens per batch (app / web, redirects excluded): 0: 15/14 **done**; 1 pharmacy: 23/34 (done so far: app 13, web 24); 2 consultations 22/24; 3 labs 17/22; 4 nursing 7/9; 5 records 26/24; 6 family 10/10; 7 insurance 10/13; 8 maternity etc. 11/21; 9 AI 7/10; 10 community 5/5; 11 loyalty 7/7; 12 account 20/20; 13 web-only 3/14.

## Next

1. Finish Batch 1: slice 1d (high effort), then 1e; merge into `design/batch-1`; ONE production build + runtime check + Lighthouse (once per batch) at the end; update #293 (draft → ready), checklist with numbers. Then Batch 2 on its own `design/batch-2` from `main`.
2. F82: when the reviewer lands the hash CSP, make public pages static/ISR (public data only in cached HTML, per-user bits to the client). Owner to confirm: with the 60 s data cache `/` keeps the last good page during an outage (ErrorState only with no cached copy), or cap it (#297).
3. After #297 merges: add each new web client namespace to `lib/i18n/client-messages.ts` (a test fails until you do).

## Process (owner, 2026-10-06; quality rules unchanged, recording changed)
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
| Batch 0 fixes (client-side Needs review) | app 20 + web 28 entries | 468k / 599k | before the owner's lean process |
| F82-1 / F82-2 | PR #297 / #295 | 356k / 369k | measured Lighthouse, nav timing |
| 1a pharmacy browse/product | app 5, web 9 | 700k / 644k | |
| 1b cart, prescription | app 6, web 9 | 439k / 736k | web includes an API cut-off and resume |
| 1c offers (high) | app 2 (+1 redirect), web 6 | 514k / 607k | no live offer seedable locally |
| 1d checkout, payment (high) | in progress | | lean process applies |
| 1e orders, tracking | not started | | |

## Open blockers (details in `PROGRESS_ARCHIVE.md` and the Needs-review JSON)
- **CRITICAL, reviewer:** `POST /auth/social-login` does not verify Apple/X/Snapchat tokens (archive, "Blockers"). X/Snapchat are hidden behind `EXPO_PUBLIC_SOCIAL_X_SNAPCHAT`; web shows Google only.
- **Public product catalogue is empty** on the seeded backend (v14 import is the reviewer's): product/category screens are checked with injected TEST data only.
- **Backend gaps found in Batch 1** (reviewer; in `needs-review/batch-1*.json`): patient chat actions answer 403 (`@Roles(PHARMACY, ADMIN)`); governed states `OFFERS_READY`/`ORDER_BROADCASTING` never produced; offer ETA/`insurance_ready`/`cod_allowed` constants; expiry command has no scheduler; OCR field names not read by the upload endpoint; barcode `$regex` unescaped; prescription lists return base64 photos; no replica set locally so submit/select answer 500.
- **Endpoints the reviewer will add:** `GET /payments/status/:ref` (web `/payments/result`), `GET /insurance/claims/my` (batch 7), `GET /nutrition/plan` (batch 8); doctor fields `scfhs_license_no`, `years_experience`, `qualifications[]`. Hide the part, never invent data.
- **Fetal-week images (owner D):** converted to WebP in `cdn-source/`; upload to the CDN and the week endpoint are pending (archive).
- **Import-rule baseline:** `tools/design/import-rule.baseline.json` is on `fix/audit-2026-09` only; drop its AuthKit line when the rule reaches main.
- **Owner questions open:** intro/language/permissions screens before Welcome? Which roles may hold a patient session? Chat entry points with no order; compare picker; camera barcode on web; where the insurance choice belongs; native review of ur/hi/bn/tl wording.
