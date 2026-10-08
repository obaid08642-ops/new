# Design rebuild — PROGRESS

> **Session start (owner, 2026-10-06): read only this file's "Next", then grep `SCREEN_INVENTORY.md` and `WIRING_REPORT.md` for the routes of the current batch. Do not read those two files in full.** History: `PROGRESS_ARCHIVE.md` (do not read at session start). Rules: `/AGENTS.md`, `QUALITY_STANDARDS.md`, `README.md`.
> After every PR: update this file (keep it under 8 KB) and `screen-status.json`. Context low: commit, push, update this file, stop.

_Updated 2026-10-06._

## State

| Item | State |
|---|---|
| Foundation, Batch 0 (+ fixes), Batches 1-3 (#293, #313, #318), Needs-review file:line rule (#502), F82-1/2, F68, #303 | Merged |
| Batch 3 labs/radiology [#318](https://github.com/obaid08642-ops/new/pull/318) (+ client fixes [#347](https://github.com/obaid08642-ops/new/pull/347)), Batch 4 nursing [#350](https://github.com/obaid08642-ops/new/pull/350) (stacked on #318), Batch 2 client fixes [#319](https://github.com/obaid08642-ops/new/pull/319) | Open; reviewer's runtime-contrast and preview fixes pushed |
| F82-3 static/ISR [#308](https://github.com/obaid08642-ops/new/pull/308) | Open; main merged in (one `session-identity`), `runtime-contrast` job starts the nonce server |
| Merge map 1 (health, family, settings, AI, mental health) | **Approved and merged** (#345); answers in `MERGE_MAP.md` §7 |
| Merge map 2, all sections (decision 27) [#359](https://github.com/obaid08642-ops/new/pull/359) | Proposed; merges of Batches 1-4 screens go in one "Batch 14" PR after they merge |
| **Batch 5 health + records**, `design/batch-5` (from main) | 8 app + 9 web screens rebuilt on the merge map (7 merged screens + passport + report); app endpoints 30 routes / 0 failures; web 48 runs, health screens 0 issues; PR open |
| Gates (baselines only go down) | `no-literal-ui-string` 3957, `no-raw-color` 5619, `no-left-right` 331, `client-token-sync` 897, `locale-parity` 663 |

Screens per batch (app / web, redirects excluded; Batches 5/6/8/9/12 are reshaped by the merge maps): 0: 15/14 done; 1: 23/34 done; 2: 22/24 done; 3: 17/22; 4: 7/9; 5 health+records: done (see above); 6 family: 10/10 -> 5/5; 7 insurance 10/13 -> 5/5; 8 maternity, nutrition, mental health, chronic care; 9 AI 7/10 -> 2/2; 10 articles (community removed); 11 loyalty 7/7 -> 1/1; 12 account, settings 20/20 -> 7/7; 13 web-only static pages.

## Next

1. **Batch 6 family** (merge map 1 section 2: hub with requests, member, calendar, chat without call, add/join; `/family/emergency-contacts` already redirects to the profile). Then 7 insurance (hub + request page, map 2 §6), 8, 9, 10-13 in order, each in the batch that owns the screens.
2. **Owner decisions 24-27** (`OWNER_DECISIONS_2026-10-06.md`): UI parts in the owning batch (map 2 §9): doctor thread only inside a booking (`/chat` list removed), no cash option for online services, cash on delivery only when the server allows it, cancel/refund text from the server. Pharmacy badges and "استشر طبيب" wait for the reviewer's backend part.
3. Keep `EXPO_PUBLIC_CONSULT_NEARBY_FILTERS` off until the owner says Q-12/Q-13 are live.
4. After #308 merges: move the pharmacy namespaces out of `CLIENT_NAMESPACES` into a route-group provider. After #318/#350 merge: client-fixes PR for Batch 4 Needs-review items.
5. **Batch 5 leftovers:** emergency routes (decision 14, ambulance removal O-2) not rebuilt: the old pages still carry inline `style=` (CSP console errors in the runtime check), to be replaced by the one Emergency screen after O-2; `/ai/report` (Batch 9) has the same; four app screens (profile, map, AI monthly report, prescription translator) still push old health routes (redirects cover them).

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
| 1a-1e pharmacy (before lean v2) | app 23, web 34 | 2.7M / 3.1M | 1a/1b/1c/1d ~100k per screen, 1e fewer |
| 2 consultations (lean v2) | app 22, web 24 | 585k / 470k (**27k / 20k per screen**) | templates once (`consult/` kits) |
| 3 labs, radiology | app 17, web 22 | 492k / 565k (**29k / 26k**) | `DiagKit`, `components-next/diagnostics` |
| 4 nursing | app 7, web 9 | 500k total (**31k**) | `NursingKit`, `components-next/nursing` |
| 5 health + records (merge map) | app 8, web 9 (absorbing ~26 / ~24 old routes) | 473k / 435k (**~50k / ~45k per new screen**, over 40k: each absorbs 3-6 old screens and the app migrated 104 medication words) | `HealthKit`, `components-next/health`, 330 + 134 keys |

## Open blockers (details in `PROGRESS_ARCHIVE.md` and the Needs-review JSON)
- **Public product catalogue is empty** on the seeded backend (v14 import is the reviewer's): product/category screens are checked with injected TEST data only.
- **Backend gaps found in Batch 1** (reviewer; in `needs-review/batch-1*.json`): patient chat actions answer 403 (`@Roles(PHARMACY, ADMIN)`); governed states `OFFERS_READY`/`ORDER_BROADCASTING` never produced; offer ETA/`insurance_ready`/`cod_allowed` constants; expiry command has no scheduler; OCR field names not read by the upload endpoint; barcode `$regex` unescaped; prescription lists return base64 photos; no replica set locally so submit/select answer 500.
- **Endpoints the reviewer will add:** `GET /payments/status/:ref` (web `/payments/result`), `GET /insurance/claims/my` (batch 7), `GET /nutrition/plan` (batch 8); doctor fields `scfhs_license_no`, `years_experience`, `qualifications[]`. Hide the part, never invent data.
- **Fetal-week images (owner D):** converted to WebP in `cdn-source/`; upload to the CDN and the week endpoint are pending (archive).
- **Import-rule baseline:** `tools/design/import-rule.baseline.json` is on `fix/audit-2026-09` only; drop its AuthKit line when the rule reaches main.
- **Owner questions open:** intro/language/permissions screens before Welcome? Which roles may hold a patient session? Chat entry points with no order; compare picker; camera barcode on web; where the insurance choice belongs; native review of ur/hi/bn/tl wording.
