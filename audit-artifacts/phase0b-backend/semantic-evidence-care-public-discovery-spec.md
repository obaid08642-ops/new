# Phase 0B semantic evidence — Care public discovery spec

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/care/tests/public-discovery.spec.ts:1–102`

This Jest unit spec constructs `CareService` with mocked provider/facility/slot models (`5–23`) and contains five focused cases. It checks that doctor detail requires active/public-reviewed doctor state and omits selected KYC, bank, user, address, location and insurance-contract fields (`26–50`); that inactive/pending/unknown doctors do not expose slots (`52–57`); that facility detail requires active/public-reviewed facility state and returns an allowlisted doctor directory without selected private fields (`59–75`); that specialties aggregate only approved published doctors (`77–88`); and that regex search metacharacters are escaped and pagination/count metadata is returned (`90–100`).

The tests provide useful source-level regression evidence for eligibility filters and selected PII minimization. They do not exercise a real Mongo model, controller/guard/auth boundary, public HTTP response serialization, caching, rate limits, pagination edge cases, sorting, locale completeness, SEO/canonical/JSON-LD, stale/revoked catalog behavior, branch/facility ownership, slot race conditions, or live 401/404/403 outcomes. All dependencies are mocks and no integration or live external acceptance is represented (`13–23`).

The final search assertion assumes `countDocuments` returns an exact total and expects total `1` with an empty page (`90–100`), but the spec does not test count failure, count/query mismatch, very large limits, negative/NaN pages, Unicode normalization, regex denial-of-service, or stable ordering. It also does not assert every field of the public projection, so newly added sensitive fields could pass unnoticed. No test was run and no product code was changed during this semantic read.
