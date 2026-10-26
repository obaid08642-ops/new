# Design rebuild — PROGRESS

> **Session start (owner, 2026-10-06): read only this file's "Next", then grep `SCREEN_INVENTORY.md` and `WIRING_REPORT.md` for the routes of the current batch. Do not read those two files in full.** History: `PROGRESS_ARCHIVE.md` (do not read at session start). Rules: `/AGENTS.md`, `QUALITY_STANDARDS.md`, `README.md`.
> After every PR: update this file (keep it under 8 KB). Context low: commit, push, update this file, stop.

_Updated 2026-10-26._

## State

| Area | State |
|---|---|
| Patient app + web, Batches 0-14 (incl. merge maps 1-2, insurance relay-only D35, AI, loyalty, settings, public pages) | **Merged** on main (reviewer batches #1254 and earlier) |
| Provider app (layout, pharmacy, merges, M9 wizard, ambulance removed, D1, My offers, returns, N1) | **Merged** (#1205, #1242, #1249, #1228) |
| Admin (mobile layout, DataTable, today/approvals/catalogue essentials, provider approval screen) | **Merged** (#732, #1204, #1248) |
| Owner colour + layout decisions 2026-10-25/26 (social brand buttons, logo never black, no ink on interactive elements, header favourites, pharmacy/labs/consultations layout) | **Open PRs**, see Next 0 |
| Audits (patient journeys, provider, admin wiring + journeys) | Merged; open lines live in `needs-review/*.json` |
| UI issues list (OpenCode plan 2026-10-09 s.10, 169 issues) | Walked; the client fixes are merged; the rest wait on owner decisions or OC-A/B/C |
| F82-3 static/ISR [#308](https://github.com/obaid08642-ops/new/pull/308) | Open; batch-13 static opt-ins wait on it (`design/batch-13-f82-optins`) |
| Gates (baselines only go down) | `tools/design/*.baseline.json`; `client-token-sync` 708, `no-raw-color` 1418, `no-literal-ui-string` 365 |

## Next

0. **Owner colour + layout stack (2026-10-25/26), all open, none merged by the design session.** Colour: social buttons #1961; logo never black #1968 (+ `docs/design/LOGO_RULE.md`); public web ink sweep #1971; no ink on interactive elements #1974 (web, shared `packages/ui`; the app part #1975 is merged); follow-up (coral dark splash, Sign-in clip at 390, no ink tiles) #1980, stacked on #1974. Layout (each PR stacked on the one before, review/merge in order): header #1981 web, #1982 app; pharmacy #1984 web, #1985 app; labs/radiology #1986 web, #1988 app; consultations #1989 web, #1990 app. Most of it is **not seen at runtime** (no backend or no render tool in the sandbox): PR bodies say what was and was not seen.
   - **Open owner/reviewer questions:** pharmacy category art is picked by keywords in the localized name, needs a backend `categoryKey`; the app has no hamburger menu (what would it open?) and no favourites count badge; consultations app: price-band filter removed, "Shortest wait" not offered (no backend value), `DoctorSearchView` still has its own chips; web grade filter shows six degrees (brief said three); labs still say "Self-pay" (`needs-review/layout-consult-web.json`); next-slot only on `/care/doctors` rows (`needs-review/layout-consult-app.json`).
   - Colour audit tables: `docs/design/COLOUR_AUDIT.md` (index), `COLOUR_AUDIT_web-slice1.md`, `_web-public.md`, `_app.md` (these land with #1965/#1971/#1975/#1974). Signed-in screens were never seen at runtime (no backend in the sandbox).
1. **Ordering M6 (M1 and M2 backend on main, #1759):**
   - This batch (one PR): "My medical orders" Ord20 and Ord21, web and app. Order button per group (prefill request, then the group's flow), "later" per item, expired orders disabled. Six languages (`MedicalOrders`, `medorders.*`).
   - **Built in #1775 (`design/m6-ord22-ord30`):** Ord22 doctor's composer (`POST /doctors/appointments/:id/medical-order`) and Ord30–33 provider declaration (`/provider/ordering/*`), provider-app ar/en. Open rows: `needs-review/m6-ord22.json` (5), `m6-ord30.json` (13).
   - **BLOCKED: waits for M3** (ordering engine, #1750 spec): Ord02, Ord04, Ord05, Ord07, app Ord01.
   - **BLOCKED: waits for M4**: Ord06 ASAP timer, Ord08. **M5**: Ord03 coverage, Ord09. **M7**: Ord10 (arrival code, staff profile). **M8**: Ord11 "discuss with a doctor".
   - Every open row: `docs/design/needs-review/m6-blocked.json`; this batch's gaps (no item names, prefill not read by the flows, no renew action) are in the same file.
2. **Refs (#1255/#1256):** triaged in `docs/design/NR_REPORTS_TRIAGE.md`: 10 fixed on main, 1 owner decision (#953), the rest backend or reviewer.
3. **Reviewer:** close the 50 stale Needs-review lines, regenerate the audit files once. Real-device checks: Urdu font, voice notes, first launch.
4. **Web = app parity: done.** Every screen row that the web can fix without a backend change is built (#1806–#1811 round 1, #1814/#1815/#1817/#1818 round 2, owner decisions #1854, richer doctor card/page #1866/#1867, differentiators #1877 web and #1878 app). What is left is only owner or backend items, all listed with client file:line in issue [#1819](https://github.com/obaid08642-ops/new/issues/1819) "Design parity: backend fields needed" (backend fields: doctor `education`/`wait_time`, late-guarantee setting and `late_compensation` codes, lab results, radiology report, notification flags, register/OTP flow and others; owner: map picker, QR, provider-app links, wearables F20 and others). Per-service status: `docs/design/parity/*.md`; open rows: `needs-review/parity-*.json`, `doctor-card-*.json`, `differentiators-*.json`. Facility accounts stay on hold.
5. **On hold:** D-12 price notice and C12 (waits for OpenCode D-12); web `/onboarding/permissions` (#436) after the owner decision.

## Process
- Lean v2 (rules in `/AGENTS.md`): design only, templates first, audit via `audit-table.mjs`, Needs-review with file:line (never delete lines by hand: it shifts the `nr-key` the issues reference), no committed screenshots. Binding: identity, tokens-only colours, six languages (provider-app and admin: ar/en and ar), real data only.

## Open blockers
- **Owner decisions:** none open (all answered 2026-10-10). Legal texts in `docs/legal` are approved as they are; the owner may revise them later.
- **Backend (OC-A/B/C):** see the "waits for OC" lists in the PRs #1244-#1253 and `needs-review/*.json`; the reviewer owns them.
- **Public product catalogue is empty** on the seeded backend (v14 import): product screens are checked with injected TEST data only.
- **Provider/admin generated audits** are stale on main in places (regenerating shifts `nr-key`): regenerate once, by the reviewer.
- **Fetal-week images:** converted to WebP in `cdn-source/`; CDN upload and the week endpoint pending.
