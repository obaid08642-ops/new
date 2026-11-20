## 2026-11-20 — MC.5 licences per jurisdiction (first slice)
Status: done, PR #2778 (CI: pending). Licence types as data (SA: SCFHS, MoH facility, CR, SFDA; admin document review), expiry rule A2 as a pure function (valid through end of expiry day in market tz; Cairo DST tested), legacy columns as a read-only licence list, SA onboarding field sets for all 8 provider types + GET /provider-onboarding/field-set. Golden tests tie field sets to doctorSubmitProblems / facilityLicenseProblems. tsc, build with live mongo (1727 paths), full jest 40/40, dtolint green; boot gate = same 3 failures as clean main. NOT in this PR: wiring the A2 boundary into the licence monitor/booking (changes today's ceil-days boundary, needs your review), admin expiry list per jurisdiction, provider-app forms from field-set. Waiting for merge.

## 2026-11-20 — MC.4 phone/identity/address-template plugins (first slice)
Status: done, PR #2769 (CI: pending). Phone plugin built from market phone config (+national_length), SA identity plugin, address template data, registry with no silent SA fallback; AuthService.normalizePhone and patient national-ID rules call the SA plugins. Oracle tests (old code verbatim) on 20k random phones + 5k IDs. tsc, build with live mongo, full jest 40/40, dtolint green; boot gate = same 3 failures as clean main. Left for next slice: other phone call sites (otp-abuse, emergency, checkout/libphonenumber, provider default), OTP channel policy (SMS off). Rollout note: SA v1 config row lacks phone.national_length; publish SA v2 before anything reads phone rules from the DB. Waiting on merges (#2766, #2769).

## 2026-11-19 — #2766 review change done
Status: pushed (cbcfd75). getMarket caches positive AND not-found for 60 s (test: 2 requests = 1 DB read, expiry after 60 s); /health/*, API root probe and /.well-known/* skip the middleware (no DB read, no context; tests). The backend serves no static files. Merged main in. tsc, build with live mongo, markets 63 tests, boot gate = same 3 pre-existing failures. Backfill NOT run. Starting step 4 (phone/identity/address/OTP plugins) from main.

## 2026-11-19 — MC.3 MarketContext + market-scope guard + market_id backfill
Status: done, PR #2766 (CI: pending), independent of #2765. Server-resolved MarketContext (X-Market validated hint, default SA, DB failure -> built-in SA), opt-in scope plugin (applied to no schema yet), idempotent batched backfill script (dry run default, NOT run; needs backup + your ops run). tsc, build with live mongo (openapi 1726), full jest 40/40, dtolint green; boot gate = same 3 failures as clean main. Note: after the backfill runs, lean-returning endpoints show additive market_id/operator_id. Next: wait for merges of #2765/#2766; then step 4 (phone/identity/address/OTP plugins).

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
