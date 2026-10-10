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

1. **Nearest / Available now** (backend Q-12/Q-13): app flag `EXPO_PUBLIC_CONSULT_NEARBY_FILTERS` on in the build config; web doctors page gets both filters (branch `design/nearby-filters`).
2. **Prescription rules C10-C11** on app + web (badges, no promo on Rx, cart asks for a prescription or "consult a doctor" on the suggested specialty) (`design/rx-rules`). C12 (price ceiling in the offer composer) waits for backend D-12.
3. **New backend fields (#1255, #1256):** `pharmacy_name_ar/en` on order detail + allocations (tracking, final-quote; #366 #375 #514); the 13 "Refs" screens of #1255; remove `HospitalDispatchScreen` from the provider facility navigator (#1127). Admin community-moderation (#918) waits for OpenCode D-1.
4. Final pass on main with the existing tools (screen-inventory, provider-inventory, audit-table, runtime check): one short table per app.
5. Emergency single screen (urgent-help `tel:` from admin config) after the patient SOS removal (decision 14; #852 #1088-#1090 #1094).

## Process
- Lean v2 (rules in `/AGENTS.md`): design only, templates first, audit via `audit-table.mjs`, Needs-review with file:line (never delete lines by hand: it shifts the `nr-key` the issues reference), no committed screenshots. Binding: identity, tokens-only colours, six languages (provider-app and admin: ar/en and ar), real data only.

## Open blockers
- **Owner decisions:** flows 10/18/24/30, decision 35 wording, Urdu riyal symbol (#1093), `expo-clipboard` dependency (#686 #747), onboarding before Welcome (#408), "all services" destination (#409).
- **Backend (OC-A/B/C):** see the "waits for OC" lists in the PRs #1244-#1253 and `needs-review/*.json`; the reviewer owns them.
- **Public product catalogue is empty** on the seeded backend (v14 import): product screens are checked with injected TEST data only.
- **Provider/admin generated audits** are stale on main in places (regenerating shifts `nr-key`): regenerate once, by the reviewer.
- **Fetal-week images:** converted to WebP in `cdn-source/`; CDN upload and the week endpoint pending.
