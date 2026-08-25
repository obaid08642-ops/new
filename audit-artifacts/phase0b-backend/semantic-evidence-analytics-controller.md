# Phase 0B semantic evidence — Analytics Controller

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:**
- `src/modules/admin-web-core/controllers/analytics.controller.ts:2–61`

`AnalyticsController:13–19` defines `nabd-extensions/admin/analytics` with no visible JWT, role, permission or network guard. `:21–34` converts arbitrary latitude/longitude values to a coarse 0.05-degree grid and increments intensity by source type. `:36–59` queries the last 30 days of SOS emergency locations and home-visit appointment locations, returns up to 200 cells with approximate coordinates/intensity, and labels the result `source: live`. Both database queries are wrapped in empty catches (`:40–47,49–56`), so dependency failures collapse to an empty dataset while the response remains successful/live. No rate limit, query parameter, aggregation privacy threshold, retention/access audit or suppression of sparse cells is visible.

## Findings candidates

The read supports: unguarded admin analytics exposure, location/health inference from SOS and home visits, insufficient aggregation privacy, swallowed database errors and misleading live success semantics.

No product code was changed and no tests/builds were executed during this semantic read.
