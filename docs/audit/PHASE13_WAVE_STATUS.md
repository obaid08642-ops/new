# PHASE 13 — Wave Status (14-agent wave: 11 task + 3 verify)

Branch: `fix/audit-2026-09` · Role: AGENT (read-only + this ONE doc).
This file is the ONLY new file this agent creates: `docs/audit/PHASE13_WAVE_STATUS.md`.
No code, no other docs, no builds/tests, no push.

Spec sources (read-only):
- `docs/audit/05_OWNER_ADDITIONS_DESIGN_AND_GAPS.md` Part B (R1–R20 table + Do/Verify) — Phase 13 contract.
- `docs/audit/02_AGENT_EXECUTION_PLAN.md` PHASE 13 table (§13.R3…13.R20) + Gate P13.
- `docs/audit/01_FINAL_AUDIT_REPORT.md` — findings reference (F-series).

## 1. Wave roster (14 agents) + allowed-paths

| # | Agent | Requirement | Mode | Allowed-paths | Status |
|---|---|---|---|---|---|
| 1 | R3 | 13.R3 price-override audit (`price_overrides` + admin history/CSV) | implement | per orchestrator brief | BLANK — verification pending |
| 2 | R7 | 13.R7 search pipeline | implement | per orchestrator brief | BLANK — verification pending |
| 3 | R8 | 13.R8 entity graph + internal links from real edges | implement | per orchestrator brief | BLANK — verification pending |
| 4 | R9 | 13.R9 dynamic product ranking service | implement | per orchestrator brief | BLANK — verification pending |
| 5 | R10 | 13.R10 ranking + search analytics in admin | implement | per orchestrator brief | BLANK — verification pending |
| 6 | R13 | 13.R13 observability + failed-propagation list + reconciliation | implement | per orchestrator brief | BLANK — verification pending |
| 7 | R14 | 13.R14 consultation outputs → booking/ordering | implement | per orchestrator brief | BLANK — verification pending |
| 8 | R15 | 13.R15 medical content trust | implement | per orchestrator brief | BLANK — verification pending |
| 9 | R16 | 13.R16 "Cite this" + JSON-LD by page type | implement | per orchestrator brief | BLANK — verification pending |
| 10 | R17-map | 13.R17 badge map (THIS report §2) | map only — no implementation | `docs/audit/PHASE13_WAVE_STATUS.md` (this file, shared wave doc) | MAP DONE — §2 below |
| 11 | R20-map | 13.R20 report skeleton (THIS report §3) | map only — no implementation | `docs/audit/PHASE13_WAVE_STATUS.md` (this file, shared wave doc) | MAP DONE — §3 below |
| 12 | V1 | verify agent | verify only | read-only | BLANK — verification pending |
| 13 | V2 | verify agent | verify only | read-only | BLANK — verification pending |
| 14 | V3 | verify agent | verify only | read-only | BLANK — verification pending |

This agent's own allowed-path: EXACTLY ONE new file — `docs/audit/PHASE13_WAVE_STATUS.md`. Nothing else touched.

## 2. R17 finding — provider "Verified on Nabd+" badge (MAP ONLY, not implemented)

Requirement (05 Part B R17): provider dashboard tab "Website badge": copy-paste snippet
showing "Verified provider on Nabd+" linking to the provider's canonical page
(plain dofollow link, no hidden links). Verify: snippet renders; link resolves to the canonical page.

Map result (read-only grep, no code written):

1. **No existing badge snippet found.** Grep for `Verified on Nabd|verified.*badge`
   returned no badge/widget code — only `isVerified` entity fields
   (`patient-app/src/core/domain/entities/Users.ts:40`, `patient-app/src/types/index.ts`),
   the plan row (`02_AGENT_EXECUTION_PLAN.md:570`), and the R17 row in 05 Part B.
   A badge snippet still needs to be built (by the R17 implementer, not here).
2. **Verified-flag source (what the snippet must gate on):**
   - Lifecycle (05 Part B R6): `draft → pending_verification → approved → active/public → suspended/inactive → archived`; only `active/public` visible anywhere public.
   - Live code gates on `provider_accounts.status ∈ {'approved','active'}` (e.g. `backend/src/modules/provider-ops/provider-ops.module.ts:392,423`, `backend/src/modules/provider-production/provider-production.module.ts:81,385,419`).
   - Public-eligibility pipeline: `backend/src/modules/events/auto-entity-seo-pipeline.service.ts:247-248` (`isOperational` = status `active` / `is_active` / `verified`; suspended/rejected excluded) and `public_eligibility` checks in `seo.service.ts` / `catalog-publication.service.ts`.
   - Names: `display_name_ar/en` (+ `legal_name` per R6) on provider profiles.
3. **Canonical-link resolution (what the snippet's href must use):**
   - Slug lookup: `seo.service.ts:86-104 resolve(type, slug)` with `slug_history` 301 fallback (`:95-100`); slug utils in `backend/src/common/slug.util.ts` (`buildSlug/parseSlugSuffix/escapeRegex`).
   - Canonical URL builders: `backend/src/modules/events/auto-entity-seo-pipeline.service.ts:516-538` (`computeCanonicalPath` + `PUBLIC_BASE/ar` + `canonical_url`); `backend/src/modules/events/catalog-publication.service.ts:52-101`; MCP discovery URLs `https://nabd.plus/ar/...` in `backend/src/modules/mcp/mcp.service.ts:338,365,417,451`.
   - Snippet contract: `<a href="<canonical_url>" rel="dofollow">Verified provider on Nabd+</a>` — plain link, no hidden links; href must be the resolved canonical URL for the provider's `slug || id`, rendered only when the verified flag above is true.

## 3. R20 report skeleton — per-requirement report (MAP ONLY, not implemented)

Requirement (05 Part B R20 + 02 plan 13.R20): Phase 11-style report listing every
requirement of `طلب.md` with `PASS / PARTIAL / FAIL / MISSING / MOCK / BLOCKED` + evidence,
plus the §80 50-section list. Verify: reviewer checks the report against the R-table.

Map result:
- **`طلب.md` (owner's 9,580-line original, cited in 05 header §3) is NOT in the repo**
  (glob `**/طلب*.md` → no files found). The implementer must obtain it from the owner/reviewer.
- Proxy requirement list until `طلب.md` is available: 05 Part B R1–R20 table (rows R1–R20)
  + 02 plan PHASE 13 table. Statuses below are BLANK by rule — never invented.

| Requirement (proxy: 05 Part B) | Status | Evidence-path |
|---|---|---|
| R1 pharmacy geo-broadcast (§8) | BLANK | — |
| R2 substitution (§7) | BLANK | — |
| R3 price-override audit (§7) | BLANK | — |
| R4 location privacy (§9) | BLANK | — |
| R5 structured error codes (§30, §65) | BLANK | — |
| R6 provider onboarding lifecycle (§12, §19) | BLANK | — |
| R7 search engine (§13, §14, §59) | BLANK | — |
| R8 entity graph (§15, §55) | BLANK | — |
| R9 dynamic ranking (§32–47, §62) | BLANK | — |
| R10 ranking/search analytics (§52, §75) | BLANK | — |
| R11 Saudi location architecture (§20) | BLANK | — |
| R12 slug system + 301 (§69) | BLANK | — |
| R13 observability + reconciliation (§70–72) | BLANK | — |
| R14 consultation outputs (§11) | BLANK | — |
| R15 medical content trust (§53) | BLANK | — |
| R16 citation + schema extras (addendum) | BLANK | — |
| R17 provider badge (addendum) | BLANK | — |
| R18 `nabd://` fallback + deferred links (§26) | BLANK | — |
| R19 catalog 6-lang one entity (§5) | BLANK | — |
| R20 final per-requirement report (§79–81) | BLANK | — |

Allowed status values: `PASS / PARTIAL / FAIL / MISSING / MOCK / BLOCKED` + evidence
(file:line, test id, or live-harness output). The §80 50-section list can only be
expanded once `طلب.md` is in hand — also BLANK.

## 4. Env-deferred list pointer

Do NOT re-list env secrets here. The live/staging-gated items live in:
- `AGENT_PROGRESS.md` → "Phase 10 status (honest)" / "Still open" / "Known environment blockers"
  (MOYASAR keys, LiveKit two-device media, mongod/memory-server, docker/mongosh, TURN rotation, staging deploy, LCP measurement host, payment sandbox, gitleaks history rewrite).
- `docs/audit/02_AGENT_EXECUTION_PLAN.md` §0 rules (real Mongo 7 replica set + Redis 7; missing secret → BLOCKED).
- Gate P13 (02 plan §13.R table end): every Verify green; R9 not-frozen proof; R6 propagation live on staging; R13 reconciliation 0 drift.

## 5. This agent's verification

- Re-read this file for accuracy + markdown sanity: done.
- `git status` shows ONLY `docs/audit/PHASE13_WAVE_STATUS.md` as new; no other file touched.
- No builds/servers/jest/tsc run. No push.
