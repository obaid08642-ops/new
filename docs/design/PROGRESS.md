# Design rebuild — PROGRESS

> **Session start (owner, 2026-10-06): read only this file's "Next", then grep `SCREEN_INVENTORY.md` and `WIRING_REPORT.md` for the routes of the current batch. Do not read those two files in full.** History: `PROGRESS_ARCHIVE.md` (do not read at session start). Rules: `/AGENTS.md`, `QUALITY_STANDARDS.md`, `README.md`.
> After every PR: update this file (keep it under 8 KB) and `screen-status.json`. Context low: commit, push, update this file, stop.

_Updated 2026-10-06._

## State

| Item | State |
|---|---|
| Foundation, Batch 0 (+ fixes), Batches 1-3 (#293, #313, #318), Needs-review file:line rule (#502), F82-1/2, F68, #303 | Merged |
| F82-3 static/ISR [#308](https://github.com/obaid08642-ops/new/pull/308) | Open; main merged in (one `session-identity`), `runtime-contrast` job starts the nonce server |
| Merge map 1 (health, family, settings, AI, mental health) | **Approved and merged** (#345); answers in `MERGE_MAP.md` §7 |
| Merge map 2, all sections (decision 27) [#359](https://github.com/obaid08642-ops/new/pull/359) | Proposed; merges of Batches 1-4 screens go in one "Batch 14" PR after they merge |
| Needs-review `file:line` rule (owner) [#502](https://github.com/obaid08642-ops/new/pull/502) | Tool enforces it from Batch 2; Batch 2 backfilled in #502, 3/4/5/6 on their own branches |
| **Batch 9 AI assistant**, `design/batch-9` (from main) | one `/ai` (modes symptoms/prescription/report) + monthly report on both clients; skin analysis and `/voice` removed; app 11 routes / 0 failures, web 33 runs / 0 issues; PR open |
| **Batch 10 articles + community removal**, `design/batch-10` (from main) | articles list (All/Saved) + detail on both clients; community removed (decision 1); app 5 routes / 0 failures, web 9 runs / 0 issues; PR open |
| **Batch 11 loyalty hub + offers**, `design/batch-11` (from main) | hub with tabs Rewards/Challenges/Invite + offers list/detail on both clients; leaderboard removed (decision 2); app 7 routes / 0 failures, web 18 runs / 0 issues; PR open |
| **Batch 12 settings, account, support, returns**, `design/batch-12` (from main) | app 21 routes + web 20 routes (7 settings screens, address book with pick mode, support, returns, reviews, map); app 22 routes / 0 failures, web 81 runs (2 env cert errors on addresses); PR open |
| **Batch 13 public pages + legal**, `design/batch-13` (from main) | 14 web public pages on one landing frame + app terms/privacy/provider-info; the F82-3 static opt-ins are a separate commit/branch (`design/batch-13-f82-optins`) for after #308; PR open |
| Gates (baselines only go down) | see `tools/design/*.baseline.json` |
| **Provider app central layout** (no redesign), `design/provider-layout` | NHeader/NBottomNav/NScroll/NSheet/NConfirm safe areas, keyboard, RTL, minHeight; 2 non-ui screens; 34 layout tests; ~137k tokens of the 1.5M provider budget; PR open |
| Batches 5-12 (health, family, insurance, care, AI, articles, loyalty, settings) | Rebuilt on merge maps 1-2; PRs #360, #572, #580, #708, #711, #721, #722, #723 (details in each PR) |
| Gates (baselines only go down) | see `tools/design/*.baseline.json` (regenerated after merging Batches 7, 10, 11 and 12) |

Screens per batch: Batches 0-12 done (merge maps reshape 5-9 and 11-12); 13 = web-only static pages; 14 = second-pass merges of Batches 1-4 + Emergency.

## Next

1. **Batch 7 insurance** (hub + request page, map 2 §6), then 8, 9, 10-13 in order, each in the batch that owns the screens.
3. Keep `EXPO_PUBLIC_CONSULT_NEARBY_FILTERS` off until Q-12/Q-13 are live.

## Process
- Lean v2 (rules in `/AGENTS.md`): design only, templates first, under 40k tokens per screen, audit via `audit-table.mjs`, Needs-review with file:line, no committed screenshots. Binding: identity, tokens-only colours, six languages, real data only.

## Slice log (tokens are the agents' reported totals, approximate; one agent per app/web)

| Slice | Screens finished | Tokens | Notes |
|---|---|---|---|
| 1-4 pharmacy, consultations, labs, nursing | see `PROGRESS_ARCHIVE.md` | | |
| 9 AI assistant | app 2, web 2 (absorbing ~8 / ~9 old routes) | 231k / 241k | `ai/AssistantKit`, `components-next/assistant` |
| 8 care (maternity, nutrition, mental health, programs) | app 9, web 9 | 250k / 356k (**~28k / ~40k per screen**; web agent ~500k reported) | `care/` kits (app and web) |
| 5 health + records (merge map) | app 8, web 9 (absorbing ~26 / ~24 old routes) | 473k / 435k (**~50k / ~45k per new screen**, over 40k: each absorbs 3-6 old screens and the app migrated 104 medication words) | `HealthKit`, `components-next/health`, 330 + 134 keys |

## Open blockers (details in `PROGRESS_ARCHIVE.md` and the Needs-review JSON)
- **Backend gaps** found in Batches 1-6 are in `needs-review/*.json` (with file:line from Batch 2) and the OpenCode queue; the reviewer owns them.
- **Public product catalogue is empty** on the seeded backend (v14 import is the reviewer's): product/category screens are checked with injected TEST data only.
- **Endpoints the reviewer will add:** `GET /payments/status/:ref` (web `/payments/result`), `GET /insurance/claims/my` (batch 7), `GET /nutrition/plan` (batch 8); doctor fields `scfhs_license_no`, `years_experience`, `qualifications[]`. Hide the part, never invent data.
- **Fetal-week images (owner D):** converted to WebP in `cdn-source/`; upload to the CDN and the week endpoint are pending (archive).
- **Public product catalogue is empty** on the seeded backend (v14 import is the reviewer's): product/category screens are checked with injected TEST data only.
- **Endpoints the reviewer will add:** `GET /payments/status/:ref` (web `/payments/result`), `GET /insurance/claims/my` (batch 7), `GET /nutrition/plan` (batch 8); doctor fields `scfhs_license_no`, `years_experience`, `qualifications[]`. Hide the part, never invent data.
- **Owner questions open:** see `PROGRESS_ARCHIVE.md` (2026-10-08 list).
- **Provider wiring audit (design/provider-audit, read-only):** 151 screens, 489 endpoint pairs all match backend routes, 2006 elements (1987 ok), 55 Needs-review lines in `needs-review/provider-*.json`; summary `PROVIDER_AUDIT_SUMMARY.md`. Tokens ~330k.
- **Provider journey audit (same PR #734):** `docs/journeys/provider.md`, `needs-review/provider-journeys.json` (54 lines), `PROVIDER_PROPOSALS.md` (10 merge items, missing screens) sent to owner; build nothing until approved. ~290k tokens.
- **Fetal-week images (owner D):** converted to WebP in `cdn-source/`; upload to the CDN and the week endpoint are pending (archive).
- **Owner questions open:** intro/language/permissions screens before Welcome? Which roles may hold a patient session? Chat entry points with no order; compare picker; camera barcode on web; where the insurance choice belongs; native review of ur/hi/bn/tl wording.
- **Admin audit (design/admin-audit, read-only):** 65 pages, 338 calls (3 NO_ROUTE, 9 WRONG_METHOD), 102+20 Needs-review lines, `ADMIN_MOBILE_ESSENTIALS.md`. ~250k tokens.
- **Admin build (#1204) / provider build (#1205), 2026-10-08:** 44 tables on DataTable + /admin/today, /admin/approvals, catalogue quick edit/scan/confirm (~400k); pharmacy, merges, missing screens, ambulance removal, M9 wizard (~1.05M). Gaps in needs-review. Owner plan and decisions 24-27: `PROGRESS_ARCHIVE.md`.
- **N1 nurse result upload (design/n1-nurse-upload):** files picked at visit end -> POST /storage/upload -> visit-report {complete, attachments}; without files the old complete route is kept. Backend gap: visit-report ignores the signature. ~60k tokens.
- **N1 patient side (design/n1-patient-files):** nurse result files shown on the visit screen (app: live-tracking done state; web: /nursing/visits/[id]); open via signed URL (web BFF 302). 3 new keys x 6 locales. ~70k tokens.
- **UI needs-review (plan 2026-10-09 s.10):** patient-core 29 issues walked: 1 partial fix (#433 client), 6 already fixed on main (#421 #422 #560 #566 #568 #569), rest owner decisions / waits for OC-C / not UI. Details in PR. ~170k tokens.

