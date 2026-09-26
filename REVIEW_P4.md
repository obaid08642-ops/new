# REVIEW: Phase 4 (Remove fake/static data: F16–F23, F45)

Reviewer: Claude (independent review, 2026-09-26)
Review branch: `review/phase-4` = main (d89ae3d, Phase 3 merged) + the 11 Phase 4 commits cherry-picked from `fix/audit-2026-09`:
`e7a44b4` F21 · `ff853c0` F16 · `3ca55c0` F18 · `1a84649` F45 · `0b74d80` F20 · `7fe157e` F22 · `d050e86` F23 · `8ed5843` P4-gate · `2a8dbf2` P4.21 · `5b292e1` P4.22 · `8358162` P4.23.
No P5 commits are included.
**Verdict: APPROVED with 3 fixes applied in review.** Merge via PR once CI is green.

## Verification run (reviewer)
| Check | Result |
|---|---|
| backend `tsc` / `nest build` | exit 0 / exit 0 |
| backend unit | 7/7 chunks, **2679/2679** |
| security + journeys | 15 suites, **65/65** |
| provider-app `tsc --noEmit` | exit 0 (it was **exit 2** before review fix 2) |
| `dtolint.py` / `dtocheck.js` | 0/0/0/0 · **0** mismatches (it was 1 before review fix 1) |
| REVIEW_P1_P2 fixes + Phase 3 | intact (branch is based on main) |

## Tasks vs plan
| Task | Result |
|---|---|
| F16 | Seeded facilities are `status:'reference'`, `public_eligibility:false` with no rating. Migration `2026-09-strip-facility-ratings.ts` is dry-run by default and targets the 6 seed slugs plus the exact fabricated rating pairs. **OK** |
| F18 | `aggregateRating` only when count > 0, no specialty/city fallbacks; spec added. **OK** |
| F20 | Wearables hidden behind `wearables_enabled=false` (patient-app flag + patient-web env gate). **OK** |
| F21 | `ai_provider_unavailable` 503 / `ai_upstream_error` 502; no empty 201. It had no test; the reviewer added `ai-provider.fail-closed.spec.ts`, which fails on the pre-F21 code. **OK** |
| F22 | provider-app constants replaced by catalog hooks, and the patient-app constants deleted. The grep shows 0 code usages (the remaining hits are comments). Typing bug fixed in review (fix 2). **OK** |
| F23 | Public `/system-config/public` returns only `cancellation_policy` and `returns_policy` (allowlist, no secrets); llms count is live in `seo-search`; returns timeline uses real timestamps; loyalty tiers come from backend config. **OK** |
| F45 | SLA GET/PUT persisted in `system_configs` key `sla` with an audit log. The DTO dropped `reason`, which broke the admin save; fixed in review (fix 1). **OK** |
| Gate P4 | `grep mock|dummy|lorem|fake` gives 38 hits. All of them are comments saying "no mock/fake", the API honeypot (an intended security feature) and one test utility, so there is no fabricated data. `coturn` now returns 503 instead of a placeholder TURN host; no app calls it (video uses LiveKit). **Accepted** |

## Fixes applied in this review
| # | Sev | Where | Problem | Fix / test |
|---|---|---|---|---|
| 1 | HIGH | `admin-config.dto.ts` `SlaDto` | F45 rewrote the DTO without `reason`; admin `config-portal.tsx` always sends it, so every SLA save got a 400 | `reason?: string` (`@IsString @MaxLength(500)`), stored in the audit log. Test in `review-p3-dto-types.spec.ts` (fails before) |
| 2 | HIGH | provider-app `api/catalogs.ts` `SpecialtyEntry` | Doctor/Facility screens render `specialty.icon`, but the new type and mapping dropped it, so provider-app did not compile (4× TS2339) and CI "Provider App typecheck" would be red | `icon?: string`, passed through when the backend has it (renders nothing otherwise) |
| 3 | LOW | F21 | Plan Verify ("call without key → 503") had no test | `ai-provider.fail-closed.spec.ts` |

## Follow-ups (not blocking)
- F16 migration matches by slug. If a real facility later registers with one of those 6 slugs before the migration runs, it would be hidden. Run the migration soon, dry-run first.
- The Gate P4 grep should exclude comments or accept a documented allowlist, so that "0" is achievable literally.
- Process: P4.21–P4.23 and all of P5 were pushed before this approval (AGENTS.md "one phase at a time").

---

## Addendum (post-merge re-check, 2026-09-26)
Re-verified the items the first pass had only checked by grep or commit message:
- **F18:** `aggregateRating` only when `rating_avg` and a real count exist; `medicalSpecialty`/`addressLocality` are `undefined` when unknown. OK.
- **F20:** patient-app screens return early unless `wearables_enabled`; the patient-web page `notFound()`s and the health hub filters the tile unless `NEXT_PUBLIC_WEARABLES_ENABLED=true`. OK.
- **Gate P4 fabrication test, run for real:** backend from `main` (10d15e7) on an **empty** MongoDB 7 replica set with Redis, using `fabsweep.py` over 727 GET routes.
  - patient token: **0** endpoints with non-zero numbers.
  - admin token: 12 hits, all legitimate: page/limit, `window_days`, a configured threshold, counts of seeded reference data (6 facilities, 2156 locations), real request counters, AI gateway config. No fabricated business metrics.
- **Found and fixed (follow-up PR):** `llms.txt` printed "صيدلية إلكترونية (آلاف المنتجات)" ("thousands of products") when the catalog was empty, which is an invented claim. It now omits the count when it is 0. Test: `seo-search/llms-count.spec.ts` (fails before). Unit: 2682/2682.
- **Follow-up for the owner (copy decision, not fixed):** the patient-web category hero says "تسوق آلاف الأدوية…" as static marketing text. It is true for the production catalog (≈21k), but not data-driven.
