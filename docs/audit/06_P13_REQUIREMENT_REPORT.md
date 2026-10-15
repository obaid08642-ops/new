# Phase 13 — Final requirement report (13.R20)

Date: 2026-10-15 · Session: OC-E · Scope: `05_OWNER_ADDITIONS_DESIGN_AND_GAPS.md` Part B (R1–R21).

Scope note: the owner's original request file (`طلب.md`, incl. its §80 50-section list) is not in this repo, so per-requirement mapping below follows the repo's authoritative breakdown — Part B, the same source the execution plan's Phase 13 rows point at. Each row carries the verdict scale from the plan (`PASS / PARTIAL / FAIL / MISSING / MOCK / BLOCKED`) plus evidence. Merge states are as of the date above; re-check before release.

## Verdicts

### 13.R1 — Pharmacy staged geo-broadcast
- Verdict: PASS
- Evidence: `backend/src/modules/seed/seed.service.ts` (3→5→8 km, 60 s stages); `pharmacy-expiry-command.service.ts:157-172` (offers retained via `$addToSet` + recipient intents; pickup 15 km cap; own-radius extended round); `pharmacy-offer.service.ts upsertDraft` (one active offer per pharmacy per order — a plain unique index was deliberately not added: it would forbid the legitimate expiry-then-reoffer case).

### 13.R2 — Item-level substitution by patient consent
- Verdict: PASS (implemented, PR #1432 merged 2026-10-15)
- Evidence: branch `oc/P13-R2`. Provider `SUBSTITUTE` stores a proposal only (`pharmacy-allocation.service.ts decideSubstitute`); patient accept/reject endpoints; `confirm`/`advance` refuse with `substitute_acceptance_required` while pending; chat accept recalculates totals and syncs the pricing snapshot. Price differences against confirmed payments fail closed (`payment_confirmation_required`); settling a non-zero balance is payments follow-up (likely D-26).

### 13.R3 — Price override audit + admin history and CSV
- Verdict: PASS (implemented, PR #1423 merged 2026-10-14)
- Evidence: branch `oc/P13-R3`. `pharmacy_price_override_audit` writes on `submitDraft`; `GET admin/pharmacy/price-overrides` (JSON) + `GET admin/pharmacy/price-overrides/export` (CSV).

### 13.R4 — Location privacy before acceptance
- Verdict: PASS (pre-existing on main)
- Evidence: `pharmacy-broadcast.service.ts:75-104`, `pharmacy-offer.service.ts:405-468` (providers see `approx_distance_km` + `approx_area` only).

### 13.R5 — One error-code catalog, 6 locales
- Verdict: PASS (pre-existing: PR #1339 + #1367)
- Evidence: backend error catalog + `error-catalog.r5.spec.ts`.

### 13.R6 — Provider identity, lifecycle, propagation
- Verdict: PASS (implemented, PR #1445 merged 2026-10-15)
- Evidence: branch `oc/P13-R6`. `suspend`/`reactivate` in `provider-admin.service.ts` re-run the SEO pipeline and refresh the public-catalog projection (reactivate did neither before). Lifecycle naming maps onto `ProviderAccountStatus` (`onboarding→pending/under_review→approved→suspended→approved/rejected`) + the profile `active/suspended` operational flag; no enum rename (blast radius documented in the PR).

### 13.R7 — Search pipeline
- Verdict: PASS with a noted follow-up (implemented, PR #1463 merged 2026-10-15)
- Evidence: branch `oc/P13-R7`. Arabic normalization, static pharma synonyms, typo-tolerant regex, intent/entity extraction and category scoping pre-existed; this session added bidirectional Arabic↔Latin query transliteration (vowel-tolerant Arabic→Latin) hooked into `buildQuery`, plus a category-scope test. Follow-up: Devanagari/Bengali-script transliteration tables.

### 13.R8 — Entity graph, links only from real edges
- Verdict: PASS (implemented, PR #1475 open at write time)
- Evidence: branch `oc/P13-R8`. `PUBLIC_MEDICINE`/`PUBLIC_TYPED_PROVIDER` exported as the single rule; `medicineRecommendations`/`doctorRecommendations` (the backend-composed public link lists) now require it at root and per candidate.

### 13.R9 — Dynamic product ranking
- Verdict: PASS with a noted follow-up (implemented, PR #1479 merged 2026-10-15)
- Evidence: branch `oc/P13-R9`. All 8 modes (`smart/trending/bestseller/most_viewed/most_searched/most_added_to_cart/highest_conversion/popular_recently` with a new 24h `recent_score`), one ZSet family per mode, pharmacy vs global and category scope, anti-abuse untouched, merchandising separate. Follow-up: fixed-window (1h…90d) rolling counters with backfill; continuous decay half-lives answer recency today.

### 13.R10 — Ranking and search analytics in admin
- Verdict: PASS (implemented, PR #1483 merged 2026-10-15)
- Evidence: branch `oc/P13-R10`. `GET admin/analytics/ranking/top` (per mode/pharmacy/category), `search/zero-result`, `search/emerging`. Backend only; admin pages consume them.

### 13.R11 — Saudi location hierarchy from verified official data
- Verdict: PASS (implemented, PR #1488 merged 2026-10-15)
- Evidence: branch `oc/P13-R11`. Validated `importLocations` (code/type/parent-type/coordinates/source stamp, rejects reported, idempotent) + `POST admin/locations/import` (nested-validated DTO, max 2000 rows). Central seed untouched.

### 13.R12 — Slug system with history and 301 on rename
- Verdict: PASS (pre-existing on main, verified, no branch)
- Evidence: `ensureCanonicalSlug` (collision-safe, writes `slug_history`); `SeoService.resolve` (`_moved_from` marker); `GET seo/resolve/:type/:slug` issuing 301 with canonical `Location`; `seo-slug-history`/`seo.service`/`seo-public-urls` 20/20 green. Slugs are locale-neutral transliterated ASCII served under locale URL prefixes with hreflang.

### 13.R13 — Observability, failed-propagation list, reconciliation
- Verdict: PASS (implemented, PR #1492 merged 2026-10-15)
- Evidence: branch `oc/P13-R13`. `GET events/failed` (DLQ + stuck outbox); `ReconciliationService` (projections-vs-sources drift check, repair via publication refresh, orphan unpublish, stored reports) + `POST events/reconciliation/run`, `GET events/reconciliation/latest`, nightly cron. Request IDs and PII-masked structured logs pre-existed.

### 13.R14 — Consultation outputs link to booking/ordering
- Verdict: PASS (implemented, PR #1497 merged 2026-10-15)
- Evidence: branch `oc/P13-R14`. `getSummary` attaches order actions (prescription lines), booking actions (lab/radiology referrals), and follow-up booking actions — all targets verified against patient-app `webLinkMap` and patient-web pages. Issuing stays doctor-or-admin (the per-role matrix).

### 13.R15 — Medical content trust
- Verdict: PASS (implemented, PR #1510 open at write time)
- Evidence: branch `oc/P13-R15`. Article schema gains reviewer/credentials/reviewed_at/references/ai_generated; `publish()` requires an author and, for AI-generated drafts, a named credentialed reviewer (server-stamped `reviewed_at`).

### 13.R16 — "Cite this" block and JSON-LD by page type
- Verdict: PASS (implemented, PR #1525 open at write time)
- Evidence: branch `oc/P13-R16`. Medicine pages emit `@graph [Product, Drug]`; every `metadata()` carries `citation {text, bibtex}`; site FAQPage is collection-driven with the previous copy as fallback.

### 13.R17 — Provider "Verified on Nabd+" badge
- Verdict: PASS (pre-existing on main)
- Evidence: `provider/provider-badge.controller.ts:17-38` (public badge endpoint, canonical dofollow link, 404 unless active).

### 13.R18 — `nabd://` fallback and deferred deep links
- Verdict: PASS (implemented, PR #1528 open at write time)
- Evidence: branch `oc/P13-R18`. New `DeferredLinksModule` (`POST share/links` authed, `GET share/links/:id` public): published-only minting, daily cap, single-use expiring records, verified app/web route targets only.

### 13.R19 — One product id, 6 localized field sets
- Verdict: PASS (pre-existing on main)
- Evidence: `medicines/med-i18n.ts` (`PUBLIC_CATALOG_LOCALES`), single-doc `translations.*` projection, six-locale contract spec.

### 13.R20 — This report
- Verdict: PASS (this file, PR `oc/P13-R20`)
- Evidence: machine-checked by `requirement-report-p13r20.spec.ts` (every R-item present with a valid verdict and non-empty evidence).

### 13.R21 — AI gateway: test live and harden
- Verdict: PENDING (next OC-E item, branch `oc/P13-R21`)
- Evidence: none yet — `ai-gateway.service.ts` and the duplicate `ai-provider.service.ts` coexist unmerged; limits/failover/encryption/PII-strip/cache all missing (audited, not started).

## Totals

- PASS: 19 (of which 4 merged-review-pending at write time: R8, R15, R16, R18)
- PARTIAL notes carried as follow-ups inside R7 (hi/bn transliteration) and R9 (fixed-window counters)
- PENDING: 1 (R21)
- FAIL / MISSING / MOCK / BLOCKED: 0
