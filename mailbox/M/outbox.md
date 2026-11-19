## 2026-11-19 — MC.2 constants -> one source (market-defaults)
Status: done, PR #2765 (CI: pending). 81 'SAR' literals + Riyadh tz / VAT / 997 / +966 now read common/market-defaults (from the SA row). tsc, `npm run build` with live mongo (openapi 1726 paths), full jest 39/39, dtolint green; boot gate = same 3 failures as clean main. Also fixed a real bug in getConfig(at) (past `at` returned the cached now value) + 4 cache tests. Ratchet spec added (baseline 0). Next: step 3 (separate PR from main).

## 2026-11-19 — MC.1 fix for #2761 build
Status: fixed, pushed. Cause: union-typed `status` @Prop in Market and MarketConfigRow had no explicit type (openapi:generate error). Added `type: String`. Verified with `nest build` + `openapi:generate --strict` against a live mongo (1726 paths), tsc, markets jest. My earlier report missed it because openapi:generate skips silently without mongo; I now run it strict. Waiting for merge, then step 2.

## 2026-11-19 — MC.1 markets/operators/market_configs + one reader + SA row
Status: done, PR #2761 (CI: pending). tsc, build, full jest (39/39 chunks), dtolint, dtocheck green; golden spec compares SA row to live constants. Boot gate: 3 failures in provider-onboarding + p3-provider-credential e2e, identical on clean main (not from this PR). Step 2 needs #2761 merged first (no stacking); waiting.

## 2026-11-19 11:30 UTC — Multi-country Phase 1 (audit + blueprint)
Status: done (docs only, waiting for lead review)
PR: #2751 audit (six files), #2752 blueprint (CI: docs only, not checked)
What changed:
- `docs/platform/mc-audit/`: saudi-assumptions, data-classification (209 schemas), journeys, catalogues, apis-ui, dataflow, each row with file:line.
- `docs/platform/MULTI-COUNTRY-BLUEPRINT.md`: market/operator/jurisdiction, MarketContext, typed versioned config, plugins, money, catalogue concept+registration, licences, address templates, branding, data planes, SA byte-identical migration, tests, ~50 PRs in 13 steps.
Left / questions:
- No market key on any collection today; duplicate schema definitions (ProviderProfile, Appointment, FeatureFlag...) must be fixed first (step 0).
- Needs R11 P3 before the money object.
- Egypt facts are unverified (counsel/accountant). Data cell for EG depends on counsel.
- Decisions for lead/owner: operator legal entity per market; partner brand vs the AGENTS.md identity rule (no new logo variants); one currency per market; patient travelling across markets (assumed read-only).
- Data classification is name-rule assisted, not hand-checked per row.
- No code started; waiting for review.
