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

Merged on main (batch 1010b, #1287): claims removal, owner UI items, Urdu Nastaliq font (ur only), legal texts from the backend, admin module switches (`modules.manage`, super admin only), single emergency screen (`UrgentHelpView`, number from `GET /mental-health/urgent-help`), `HospitalDispatchScreen` gone from provider-app, nearby filters, Rx rules C10-C11.

1. **On hold:** D-12 price notice and C12 (price ceiling in the offer composer) wait for OpenCode D-12. Design work is otherwise done; admin community moderation is replaced by `/admin/article-review` (doctor articles: list, open, approve, reject; old path redirects).
2. **Reviewer:** close the 50 stale Needs-review lines (files deleted by the SOS removal, cart/orders merges, admin directory removal), then regenerate the needs-review and provider/admin audit files once (regenerating shifts `nr-key`). Real-device checks: Urdu font, voice notes, first launch.
3. **Open for the design session:** `pharmacy_name_ar/en` fields and the 13 "Refs" screens of #1255/#1256 once the backend fields merge; web `/onboarding/permissions` (#436) after the owner decision.
4. Final pass done on e768aa5c: `FINAL_PASS_2026-10-10.md` (one table per app, baselines unchanged).

## Process
- Lean v2 (rules in `/AGENTS.md`): design only, templates first, audit via `audit-table.mjs`, Needs-review with file:line (never delete lines by hand: it shifts the `nr-key` the issues reference), no committed screenshots. Binding: identity, tokens-only colours, six languages (provider-app and admin: ar/en and ar), real data only.

## Open blockers
- **Owner decisions:** none open (all answered 2026-10-10). Legal texts in `docs/legal` are approved as they are; the owner may revise them later.
- **Backend (OC-A/B/C):** see the "waits for OC" lists in the PRs #1244-#1253 and `needs-review/*.json`; the reviewer owns them.
- **Public product catalogue is empty** on the seeded backend (v14 import): product screens are checked with injected TEST data only.
- **Provider/admin generated audits** are stale on main in places (regenerating shifts `nr-key`): regenerate once, by the reviewer.
- **Fetal-week images:** converted to WebP in `cdn-source/`; CDN upload and the week endpoint pending.
