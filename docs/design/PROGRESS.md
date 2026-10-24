# Design rebuild — PROGRESS

> **Session start (owner, 2026-10-06): read only this file's "Next", then grep `SCREEN_INVENTORY.md` and `WIRING_REPORT.md` for the routes of the current batch. Do not read those two files in full.** History: `PROGRESS_ARCHIVE.md` (do not read at session start). Rules: `/AGENTS.md`, `QUALITY_STANDARDS.md`, `README.md`.
> After every PR: update this file (keep it under 8 KB). Context low: commit, push, update this file, stop.

_Updated 2026-10-10._

## State

| Area | State |
|---|---|
| Patient app + web, Batches 0-14 (incl. merge maps 1-2, insurance relay-only D35, AI, loyalty, settings, public pages) | **Merged** on main (reviewer batches #1254 and earlier) |
| Provider app (layout, pharmacy, merges, M9 wizard, ambulance removed, D1, My offers, returns, N1) | **Merged** (#1205, #1242, #1249, #1228) |
| Admin (mobile layout, DataTable, today/approvals/catalogue essentials, provider approval screen) | **Merged** (#732, #1204, #1248) |
| Audits (patient journeys, provider, admin wiring + journeys) | Merged; open lines live in `needs-review/*.json` |
| UI issues list (OpenCode plan 2026-10-09 s.10, 169 issues) | Walked; the client fixes are merged; the rest wait on owner decisions or OC-A/B/C |
| F82-3 static/ISR [#308](https://github.com/obaid08642-ops/new/pull/308) | Open; batch-13 static opt-ins wait on it (`design/batch-13-f82-optins`) |
| Gates (baselines only go down) | `tools/design/*.baseline.json`; `client-token-sync` 708, `no-raw-color` 1418, `no-literal-ui-string` 365 |

## Next

1. **Ordering M6 (M1 and M2 backend on main, #1759):**
   - This batch (one PR): "My medical orders" Ord20 and Ord21, web and app. Order button per group (prefill request, then the group's flow), "later" per item, expired orders disabled. Six languages (`MedicalOrders`, `medorders.*`).
   - **Built in #1775 (`design/m6-ord22-ord30`):** Ord22 doctor's composer (`POST /doctors/appointments/:id/medical-order`) and Ord30–33 provider declaration (`/provider/ordering/*`), provider-app ar/en. Open rows: `needs-review/m6-ord22.json` (5), `m6-ord30.json` (13).
   - **BLOCKED: waits for M3** (ordering engine, #1750 spec): Ord02, Ord04, Ord05, Ord07, app Ord01.
   - **BLOCKED: waits for M4**: Ord06 ASAP timer, Ord08. **M5**: Ord03 coverage, Ord09. **M7**: Ord10 (arrival code, staff profile). **M8**: Ord11 "discuss with a doctor".
   - Every open row: `docs/design/needs-review/m6-blocked.json`; this batch's gaps (no item names, prefill not read by the flows, no renew action) are in the same file.
2. **Refs (#1255/#1256):** triaged in `docs/design/NR_REPORTS_TRIAGE.md`: 10 fixed on main, 1 owner decision (#953), the rest backend or reviewer.
3. **Reviewer:** close the 50 stale Needs-review lines, regenerate the audit files once. Real-device checks: Urdu font, voice notes, first launch.
5. **Web = app parity: no web-only rows left.** Round 1 (#1806–#1811), round 2 (#1814 pharmacy, #1815 account+settings, #1817 services, #1818 records), stacked on round 1 and to be retargeted to main as each merges. Status per service: `docs/design/parity/*.md`. What is left is only the rows in issue [#1819](https://github.com/obaid08642-ops/new/issues/1819) "Design parity: backend fields needed" (37 backend rows, 35 owner decisions). M6 visual check: #1804 app, #1805 web. Offers ETA/rating: #1800. Facility accounts on hold.
6. **On hold:** D-12 price notice and C12 (waits for OpenCode D-12); web `/onboarding/permissions` (#436) after the owner decision.

## Process
- Lean v2 (rules in `/AGENTS.md`): design only, templates first, audit via `audit-table.mjs`, Needs-review with file:line (never delete lines by hand: it shifts the `nr-key` the issues reference), no committed screenshots. Binding: identity, tokens-only colours, six languages (provider-app and admin: ar/en and ar), real data only.

## Open blockers
- **Owner decisions:** none open (all answered 2026-10-10). Legal texts in `docs/legal` are approved as they are; the owner may revise them later.
- **Backend (OC-A/B/C):** see the "waits for OC" lists in the PRs #1244-#1253 and `needs-review/*.json`; the reviewer owns them.
- **Public product catalogue is empty** on the seeded backend (v14 import): product screens are checked with injected TEST data only.
- **Provider/admin generated audits** are stale on main in places (regenerating shifts `nr-key`): regenerate once, by the reviewer.
- **Fetal-week images:** converted to WebP in `cdn-source/`; CDN upload and the week endpoint pending.
